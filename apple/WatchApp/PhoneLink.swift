import Foundation
import WatchConnectivity

/// 手表 → iPhone 的发送通道。只负责排队发送文件和回报结果，不直接改 UI。
final class PhoneLink: NSObject, ObservableObject {
    enum Status: Equatable {
        case unsupported
        case notActivated
        case waiting
        case ready

        var message: String {
            switch self {
            case .unsupported: return "此设备不支持与 iPhone 同步"
            case .notActivated: return "正在连接 iPhone…"
            case .waiting: return "等待 iPhone（录音已排队，稍后自动发送）"
            case .ready: return "已连接 iPhone"
            }
        }

        var isReady: Bool { self == .ready }
    }

    @Published private(set) var status: Status = .notActivated
    @Published private(set) var lastError: String?

    var onTransferSucceeded: ((String) -> Void)?
    var onTransferFailed: ((String, String) -> Void)?

    private let session: WCSession?
    private var recordingIDByTransfer: [ObjectIdentifier: String] = [:]

    override init() {
        session = WCSession.isSupported() ? WCSession.default : nil
        super.init()
    }

    var isActivated: Bool {
        guard let session else { return false }
        return session.activationState == .activated
    }

    func activate() {
        guard let session else {
            status = .unsupported
            return
        }
        session.delegate = self
        session.activate()
        refreshStatus()
    }

    /// 回到前台时调用：未激活或中断过就重新激活。
    func activateIfNeeded() {
        guard let session else {
            status = .unsupported
            return
        }
        if session.delegate == nil {
            session.delegate = self
        }
        switch session.activationState {
        case .notActivated, .inactive:
            session.activate()
        case .activated:
            break
        @unknown default:
            break
        }
        refreshStatus()
    }

    func refreshStatus() {
        guard let session else {
            status = .unsupported
            return
        }
        switch session.activationState {
        case .notActivated, .inactive:
            status = .notActivated
        case .activated:
            status = session.isReachable ? .ready : .waiting
        @unknown default:
            status = .notActivated
        }
    }

    /// 交给 WatchConnectivity 排队发送。未激活时返回 false，调用方保留「等待 iPhone」状态并稍后重试。
    @discardableResult
    func send(recordingID: String, fileURL: URL, metadata: [String: Any]) -> Bool {
        guard let session else {
            lastError = "此设备不支持与 iPhone 同步"
            return false
        }
        guard session.activationState == .activated else {
            lastError = "与 iPhone 的连接还在准备，稍后自动重试"
            refreshStatus()
            return false
        }
        let transfer = session.transferFile(fileURL, metadata: metadata)
        recordingIDByTransfer[ObjectIdentifier(transfer)] = recordingID
        lastError = nil
        refreshStatus()
        return true
    }
}

extension PhoneLink: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async {
            if let error {
                self.lastError = "连接 iPhone 失败：\(error.localizedDescription)"
            }
            self.refreshStatus()
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.refreshStatus()
        }
    }

    // 这些是 iOS 上 WCSessionDelegate 的必需方法。
    // 正常构建 watchOS App 时不会走到这里；只有用 -sdk iphonesimulator 构建 iPhone
    // scheme 时，嵌入的 watch target 会被 iOS SDK 编译，此时需要它们才能通过编译。
    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {
        DispatchQueue.main.async {
            self.refreshStatus()
        }
    }

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
        DispatchQueue.main.async {
            self.refreshStatus()
        }
    }
    #endif

    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        let recordingID = recordingIDByTransfer.removeValue(forKey: ObjectIdentifier(fileTransfer))
        DispatchQueue.main.async {
            guard let recordingID else { return }
            if let error {
                self.onTransferFailed?(recordingID, error.localizedDescription)
            } else {
                self.onTransferSucceeded?(recordingID)
            }
            self.refreshStatus()
        }
    }
}
