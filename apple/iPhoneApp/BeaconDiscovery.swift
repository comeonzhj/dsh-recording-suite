import Foundation

/// 监听电脑端每 3 秒广播的 UDP 信标（255.255.255.255:47832），自动发现导入服务地址。
///
/// 信标 JSON：`{"service":"dsh-recording","version":1,"port":47831,"token":"...","name":"Mac 名称"}`
/// 信标本身不含 IP，所以来源地址取自 recvfrom 的 sockaddr。
final class BeaconDiscovery: ObservableObject {
    struct Beacon: Equatable {
        let host: String
        let port: Int
        let token: String
        let name: String
    }

    static let port: UInt16 = 47832
    static let serviceName = "dsh-recording"

    @Published private(set) var isListening = false
    @Published private(set) var lastError: String?
    @Published private(set) var latestBeacon: Beacon?

    var onBeacon: ((Beacon) -> Void)?

    private var socketFD: Int32 = -1
    private let queue = DispatchQueue(label: "com.local.dshrecording.beacon", qos: .utility)
    private let stateLock = NSLock()
    private var running = false

    func start() {
        stateLock.lock()
        let alreadyRunning = running
        stateLock.unlock()
        guard !alreadyRunning else { return }

        let fd = openSocket()
        guard fd >= 0 else {
            DispatchQueue.main.async {
                self.lastError = "无法监听 47832 端口（可能被其他 App 占用），可在设置里手工填写地址与 Token。"
                self.isListening = false
            }
            return
        }
        socketFD = fd
        stateLock.lock()
        running = true
        stateLock.unlock()
        DispatchQueue.main.async {
            self.isListening = true
            self.lastError = nil
        }
        queue.async { [weak self] in
            self?.receiveLoop(fd: fd)
        }
    }

    func stop() {
        stateLock.lock()
        running = false
        stateLock.unlock()
        if socketFD >= 0 {
            close(socketFD)
            socketFD = -1
        }
        DispatchQueue.main.async {
            self.isListening = false
        }
    }

    deinit {
        stateLock.lock()
        running = false
        stateLock.unlock()
        if socketFD >= 0 {
            close(socketFD)
        }
    }

    // MARK: - Socket

    private func openSocket() -> Int32 {
        let fd = socket(AF_INET, SOCK_DGRAM, 0)
        guard fd >= 0 else { return -1 }

        var yes: Int32 = 1
        setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout<Int32>.size))
        setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, &yes, socklen_t(MemoryLayout<Int32>.size))
        setsockopt(fd, SOL_SOCKET, SO_BROADCAST, &yes, socklen_t(MemoryLayout<Int32>.size))

        // 1 秒超时，让 receiveLoop 能定期检查 running。
        var timeout = timeval(tv_sec: 1, tv_usec: 0)
        setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))

        var address = sockaddr_in()
        address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = Self.port.bigEndian
        address.sin_addr = in_addr(s_addr: INADDR_ANY)

        let bindResult = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                bind(fd, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        guard bindResult == 0 else {
            close(fd)
            return -1
        }
        return fd
    }

    private func receiveLoop(fd: Int32) {
        var buffer = [UInt8](repeating: 0, count: 4_096)
        while isRunning {
            var sender = sockaddr_storage()
            var senderLength = socklen_t(MemoryLayout<sockaddr_storage>.size)
            let received = withUnsafeMutablePointer(to: &sender) { senderPointer in
                senderPointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                    recvfrom(fd, &buffer, buffer.count, 0, sockaddrPointer, &senderLength)
                }
            }
            if received <= 0 {
                if !isRunning { break }
                continue
            }
            let data = Data(buffer[0..<Int(received)])
            handle(payload: data, sender: sender)
        }
    }

    private var isRunning: Bool {
        stateLock.lock()
        defer { stateLock.unlock() }
        return running
    }

    // MARK: - 解析

    private func handle(payload: Data, sender: sockaddr_storage) {
        guard
            let object = try? JSONSerialization.jsonObject(with: payload) as? [String: Any],
            let service = object["service"] as? String,
            service == Self.serviceName,
            let version = object["version"] as? Int,
            version >= 1,
            let port = object["port"] as? Int,
            let token = object["token"] as? String,
            let name = object["name"] as? String,
            let senderHost = numericHost(from: sender)
        else {
            return
        }

        let beacon = Beacon(host: senderHost, port: port, token: token, name: name)
        DispatchQueue.main.async {
            self.latestBeacon = beacon
            self.onBeacon?(beacon)
        }
    }

    private func numericHost(from storage: sockaddr_storage) -> String? {
        var storage = storage
        let storageLength = socklen_t(storage.ss_len)
        var hostBuffer = [CChar](repeating: 0, count: Int(NI_MAXHOST))
        let result = withUnsafePointer(to: &storage) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                getnameinfo(
                    sockaddrPointer,
                    storageLength,
                    &hostBuffer,
                    socklen_t(hostBuffer.count),
                    nil,
                    0,
                    NI_NUMERICHOST
                )
            }
        }
        guard result == 0 else { return nil }
        let host = String(cString: hostBuffer)
        return host.isEmpty ? nil : host
    }
}
