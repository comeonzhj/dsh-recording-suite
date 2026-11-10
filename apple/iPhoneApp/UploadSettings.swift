import Foundation

/// 上传目标配置。UDP 信标可以自动填写，设置页也可手工改（手工改会覆盖自动发现的值）。
final class UploadSettings: ObservableObject {
    private enum Keys {
        static let host = "upload.host"
        static let port = "upload.port"
        static let token = "upload.token"
        static let autoDiscover = "upload.autoDiscover"
        static let computerName = "upload.computerName"
    }

    private let defaults: UserDefaults

    @Published var host: String {
        didSet { defaults.set(host, forKey: Keys.host) }
    }

    @Published var port: String {
        didSet { defaults.set(port, forKey: Keys.port) }
    }

    @Published var token: String {
        didSet { defaults.set(token, forKey: Keys.token) }
    }

    @Published var autoDiscover: Bool {
        didSet { defaults.set(autoDiscover, forKey: Keys.autoDiscover) }
    }

    @Published private(set) var computerName: String?
    @Published private(set) var lastDiscoveredAt: Date?

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        host = defaults.string(forKey: Keys.host) ?? ""
        port = defaults.string(forKey: Keys.port) ?? "47831"
        token = defaults.string(forKey: Keys.token) ?? ""
        autoDiscover = defaults.object(forKey: Keys.autoDiscover) as? Bool ?? true
        computerName = defaults.string(forKey: Keys.computerName)
    }

    /// `http://<host>:<port>`，配置不完整时为 nil。
    var baseURL: URL? {
        let trimmedHost = host.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedHost.isEmpty,
              let portNumber = Int(port.trimmingCharacters(in: .whitespacesAndNewlines)),
              (1...65_535).contains(portNumber) else {
            return nil
        }
        var components = URLComponents()
        components.scheme = "http"
        components.host = trimmedHost
        components.port = portNumber
        return components.url
    }

    var isConfigured: Bool {
        baseURL != nil && !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// 收到 UDP 信标后调用；senderHost 来自数据报来源地址（信标 JSON 本身不带 IP）。
    func applyBeacon(host senderHost: String, port beaconPort: Int, token beaconToken: String, name: String) {
        computerName = name
        lastDiscoveredAt = Date()
        defaults.set(name, forKey: Keys.computerName)
        guard autoDiscover else { return }
        host = senderHost
        port = String(beaconPort)
        token = beaconToken
    }
}
