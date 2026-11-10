import Foundation

/// 上传到电脑导入服务的结果。
enum UploadOutcome {
    case success
    /// 配置/文件类问题，重试也没用（如 401 Token 失效、404、格式不支持）。
    case permanentFailure(String)
    /// 网络、电脑端 5xx 等，可稍后重试。
    case transientFailure(String)
}

/// 调用电脑端手表导入服务（docs/api-contract.md 第 3 节）。
final class UploadService {
    struct Request {
        let fileURL: URL
        let name: String
        let recordedAt: Date
        let durationMs: Int
        let format: String
    }

    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func upload(_ request: Request, baseURL: URL, token: String) async -> UploadOutcome {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("api/watch/upload"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "name", value: request.name),
            URLQueryItem(name: "recordedAt", value: RecordingNaming.iso8601String(from: request.recordedAt)),
            URLQueryItem(name: "durationMs", value: String(request.durationMs)),
            URLQueryItem(name: "format", value: request.format)
        ]
        guard let url = components?.url else {
            return .permanentFailure("电脑地址无效，请检查设置。")
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.timeoutInterval = 30
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("audio/mp4", forHTTPHeaderField: "Content-Type")

        do {
            let (data, response) = try await session.upload(for: urlRequest, fromFile: request.fileURL)
            guard let http = response as? HTTPURLResponse else {
                return .transientFailure("电脑返回了无法识别的响应。")
            }
            switch http.statusCode {
            case 200..<300:
                return .success
            case 401, 403:
                return .permanentFailure("Token 无效或已过期，请在电脑端重新复制导入 Token。")
            case 400, 404, 413, 415, 422:
                return .permanentFailure(errorMessage(from: data) ?? "电脑拒绝了上传（HTTP \(http.statusCode)）。")
            case 500..<600:
                return .transientFailure("电脑端处理失败（HTTP \(http.statusCode)），稍后重试。")
            default:
                return .transientFailure("上传失败（HTTP \(http.statusCode)）。")
            }
        } catch {
            return .transientFailure("网络错误：\(error.localizedDescription)")
        }
    }

    /// GET /api/watch/ping，用于设置页的连接测试。
    func ping(baseURL: URL, token: String) async -> String {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/watch/ping"))
        request.timeoutInterval = 8
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { return "连接失败：响应无法识别。" }
            if http.statusCode == 401 {
                return "连接失败：Token 无效（HTTP 401）。"
            }
            guard (200..<300).contains(http.statusCode) else {
                return "连接失败：HTTP \(http.statusCode)。"
            }
            if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let name = object["name"] as? String {
                return "已连接电脑：\(name)"
            }
            return "已连接电脑。"
        } catch {
            return "连接失败：\(error.localizedDescription)"
        }
    }

    private func errorMessage(from data: Data) -> String? {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let error = object["error"] as? String
        else {
            return nil
        }
        return error
    }
}
