import Combine
import Foundation

/// 手表上的录音条目（由磁盘上的 m4a 文件推导）。
struct WatchRecordingItem: Identifiable, Equatable {
    enum TransferState: Equatable {
        case pending
        case sending
        case sent
        case failed(String)

        var label: String {
            switch self {
            case .pending: return "等待 iPhone"
            case .sending: return "正在发送"
            case .sent: return "已发送到 iPhone"
            case .failed(let message): return "发送失败：\(message)"
            }
        }

        var systemImage: String {
            switch self {
            case .pending: return "iphone"
            case .sending: return "arrow.up.circle"
            case .sent: return "checkmark.circle.fill"
            case .failed: return "exclamationmark.triangle.fill"
            }
        }
    }

    let id: String
    let url: URL
    var name: String
    var recordedAt: Date
    var durationMs: Int
    var transferState: TransferState

    var durationText: String {
        durationMs.recordingDurationText
    }
}
