import Foundation

/// iPhone 端的一条手表录音（磁盘文件 + 上传状态）。
struct PhoneRecording: Identifiable, Equatable {
    enum UploadState: Equatable {
        case pending
        case uploading
        case uploaded
        case failed(String)

        var label: String {
            switch self {
            case .pending: return "等待上传"
            case .uploading: return "正在上传…"
            case .uploaded: return "已上传到电脑"
            case .failed(let message): return "上传失败：\(message)"
            }
        }

        var systemImage: String {
            switch self {
            case .pending: return "clock"
            case .uploading: return "arrow.up.circle"
            case .uploaded: return "checkmark.circle.fill"
            case .failed: return "exclamationmark.triangle.fill"
            }
        }

        var isUploaded: Bool {
            if case .uploaded = self { return true }
            return false
        }

        var isUploading: Bool {
            if case .uploading = self { return true }
            return false
        }
    }

    let id: String
    let url: URL
    var name: String
    var recordedAt: Date
    var durationMs: Int
    var uploadState: UploadState
    var attempts: Int
    var lastError: String?

    var durationText: String {
        durationMs.recordingDurationText
    }
}
