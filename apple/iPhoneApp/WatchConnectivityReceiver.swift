import Foundation
import WatchConnectivity

/// iPhone 端接收手表发来的文件（transferFile + metadata）。
/// 注意：文件必须在代理回调返回前复制走，系统随后会删除临时文件，所以 onFileReceived 是同步回调。
final class WatchConnectivityReceiver: NSObject, ObservableObject {
    @Published private(set) var statusText = "正在连接手表…"
    @Published private(set) var watchReachable = false
    @Published private(set) var lastError: String?

    var onFileReceived: ((URL, [String: Any]) -> Void)?

    private let session: WCSession?

    override init() {
        session = WCSession.isSupported() ? WCSession.default : nil
        super.init()
    }

    func activate() {
        guard let session else {
            statusText = "此设备不支持手表连接"
            return
        }
        session.delegate = self
        session.activate()
    }

    private func updateStatus() {
        guard let session else {
            statusText = "此设备不支持手表连接"
            return
        }
        let text: String
        switch session.activationState {
        case .notActivated:
            text = "手表连接尚未激活"
        case .inactive:
            text = "手表连接已中断，正在恢复…"
        case .activated:
            if session.isPaired {
                text = session.isWatchAppInstalled
                    ? (session.isReachable ? "手表已连接，随时会同步" : "手表已配对（App 未在前台时稍后同步）")
                    : "已配对，但手表上还没安装 DSH 录音"
            } else {
                text = "尚未与手表配对"
            }
        @unknown default:
            text = "手表连接状态未知"
        }
        DispatchQueue.main.async {
            self.statusText = text
            self.watchReachable = session.isReachable
        }
    }
}

extension WatchConnectivityReceiver: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async {
            if let error {
                self.lastError = "手表连接失败：\(error.localizedDescription)"
            }
            self.updateStatus()
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {
        updateStatus()
    }

    func sessionDidDeactivate(_ session: WCSession) {
        // 切换配对手表后需要重新激活。
        session.activate()
        updateStatus()
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        updateStatus()
    }

    func session(_ session: WCSession, didReceive file: WCSessionFile) {
        onFileReceived?(file.fileURL, file.metadata ?? [:])
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        updateStatus()
    }
}
