import Foundation

/// 手表与 iPhone 共用的录音格式约定。
enum RecordingFormat {
    static let m4a = "m4a"
}

/// 一条录音的元数据。Watch 通过 WatchConnectivity 传给 iPhone，iPhone 另存为同名 .json 旁车文件。
struct RecordingMeta: Codable, Hashable, Identifiable {
    /// 文件名去掉扩展名，例如 `watch-20261109-183000-4f2a`。
    var id: String
    /// 展示标题，例如 `手表录音 2026-11-09 18:30:00`。
    var name: String
    var recordedAt: Date
    var durationMs: Int
    var format: String
}

/// 录音文件存放位置：两个平台都是 `Documents/Recordings`。
enum RecordingPaths {
    static func recordingsDirectory(fileManager: FileManager = .default) -> URL {
        let documents = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let directory = documents.appendingPathComponent("Recordings", isDirectory: true)
        if !fileManager.fileExists(atPath: directory.path) {
            try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        return directory
    }
}

/// 文件名 / 标题 / 时间的统一生成规则。
enum RecordingNaming {
    /// 稳定且不含空格与斜杠的 id：`watch-yyyyMMdd-HHmmss-xxxx`。
    static func makeIdentifier(date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        let random = String(format: "%04x", Int.random(in: 0...0xFFFF))
        return "watch-\(formatter.string(from: date))-\(random)"
    }

    /// 录音展示标题（上传时作为 `name` 参数，电脑端会用作标题）。
    static func displayTitle(date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return "手表录音 \(formatter.string(from: date))"
    }

    /// 从文件名解析录制时间；解析失败返回 nil。
    static func recordedAt(fromIdentifier identifier: String) -> Date? {
        guard identifier.hasPrefix("watch-") else { return nil }
        let body = identifier.dropFirst("watch-".count)
        guard body.count >= 15 else { return nil }
        let timePart = String(body.prefix(15)) // yyyyMMdd-HHmmss
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        return formatter.date(from: timePart)
    }

    /// 不覆盖已有文件的落盘路径；同名时追加 `-1`、`-2`……
    static func uniqueURL(in directory: URL, preferredBaseName: String, pathExtension: String) -> URL {
        let fileManager = FileManager.default
        var candidate = directory.appendingPathComponent("\(preferredBaseName).\(pathExtension)")
        var index = 1
        while fileManager.fileExists(atPath: candidate.path) {
            candidate = directory.appendingPathComponent("\(preferredBaseName)-\(index).\(pathExtension)")
            index += 1
        }
        return candidate
    }

    /// 去掉文件名里不安全的字符。
    static func sanitizedIdentifier(_ raw: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_."))
        let filtered = raw.unicodeScalars.filter { allowed.contains($0) }
        let result = String(String.UnicodeScalarView(filtered))
        return result.isEmpty ? makeIdentifier() : result
    }

    static func iso8601String(from date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: date)
    }

    static func date(fromISO8601 string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: string)
    }
}

extension Int {
    /// `93000` -> `1:33`
    var recordingDurationText: String {
        let totalSeconds = Swift.max(0, self / 1000)
        return String(format: "%d:%02d", totalSeconds / 60, totalSeconds % 60)
    }
}
