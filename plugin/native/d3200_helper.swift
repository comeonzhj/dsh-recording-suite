//
// d3200_helper.swift — Recording Suite native BLE bridge for soundcore Work (D3200).
//
// Why this exists: the DSH desktop window is Electron and has no
// browser device chooser, so the helper owns the CoreBluetooth link
// there. This command line helper owns the CoreBluetooth session instead, and
// the Host plugin spawns it for every device operation.
//
// Compiled on demand by the Host plugin (only macOS):
//   xcrun swiftc -O -parse-as-library -o <storage>/bin/d3200_helper \
//     plugin/native/d3200_helper.swift \
//     -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist \
//     -Xlinker plugin/native/d3200_helper_info.plist
//
// Usage:
//   d3200_helper scan   [--timeout 8] [--mode precise|all]
//   d3200_helper list   --device <cb-uuid>
//   d3200_helper export --device <cb-uuid> --file <u32> --out <path>
//   d3200_helper record --device <cb-uuid> --action start|pause
//   d3200_helper delete --device <cb-uuid> --file <u32>
//
// stdout is ALWAYS exactly one JSON line:
//   {"ok":true,...}
//   {"ok":false,"error":"...","code":"..."}
// stderr carries human progress only; it is never parsed.
//
// Protocol behavior based on public reverse-engineering notes (see README acknowledgements):
// 08EE frames, 09FF packet assembly, 01/01 device info, 1B/0E file list,
// 18/82 record control, 1A/07 export header, 1A/08/12 slices, 1A/0A done,
// 1A/10 delete, 2E/01 ECDH + HKDF-SHA256 session key, CommonCrypto AES-CTR.
//
// CoreBluetooth must run on a RunLoop. This helper never blocks the main
// thread on a semaphore: every wait below pumps `RunLoop.main` so the central
// delegate callbacks (state, discovery, connect, notifications) can fire.
//

import CommonCrypto
import CoreBluetooth
import CryptoKit
import Foundation

/* ------------------------------------------------------------------ UUIDs */

let serviceUUID = CBUUID(string: "020cf5da-0000-1000-8000-00805f9b34fb")
let writeUUID = CBUUID(string: "00007777-0000-1000-8000-00805f9b34fb")
let notifyUUID = CBUUID(string: "00008888-0000-1000-8000-00805f9b34fb")

/* ------------------------------------------------------------------ output */

func writeStderr(_ message: String) {
    if let data = ("d3200-helper: " + message + "\n").data(using: .utf8) {
        FileHandle.standardError.write(data)
    }
}

func emit(_ payload: [String: Any], exitCode: Int32? = nil) -> Never {
    if let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
       let line = String(data: data, encoding: .utf8) {
        print(line)
    } else {
        print("{\"ok\":false,\"error\":\"failed to encode helper output\",\"code\":\"OUTPUT_ENCODE\"}")
    }
    fflush(stdout)
    exit(exitCode ?? ((payload["ok"] as? Bool == true) ? 0 : 1))
}

func succeed(_ payload: [String: Any]) -> Never {
    var output = payload
    output["ok"] = true
    emit(output)
}

func fail(_ code: String, _ message: String, exitCode: Int32 = 1) -> Never {
    emit(["ok": false, "error": message, "code": code], exitCode: exitCode)
}

struct HelperError: Error {
    let code: String
    let message: String

    init(_ code: String, _ message: String) {
        self.code = code
        self.message = message
    }
}

/* ------------------------------------------------------------- byte helpers */

func checksum(_ bytes: [UInt8]) -> UInt8 {
    UInt8(bytes.reduce(0) { ($0 + Int($1)) & 0xff })
}

func encodeCommand(_ cmdType: UInt8, _ cmdId: UInt8, payload: [UInt8] = []) -> Data {
    let total = 10 + payload.count
    var bytes: [UInt8] = [0x08, 0xee, 0x00, 0x00, 0x00, cmdType, cmdId]
    bytes.append(UInt8(total & 0xff))
    bytes.append(UInt8((total >> 8) & 0xff))
    bytes.append(contentsOf: payload)
    bytes.append(checksum(bytes))
    return Data(bytes)
}

func u16le(_ value: UInt16) -> [UInt8] {
    [UInt8(value & 0xff), UInt8((value >> 8) & 0xff)]
}

func u32le(_ value: UInt32) -> [UInt8] {
    [UInt8(value & 0xff), UInt8((value >> 8) & 0xff), UInt8((value >> 16) & 0xff), UInt8((value >> 24) & 0xff)]
}

func u32be(_ value: UInt32) -> [UInt8] {
    [UInt8((value >> 24) & 0xff), UInt8((value >> 16) & 0xff), UInt8((value >> 8) & 0xff), UInt8(value & 0xff)]
}

func readU16le(_ bytes: [UInt8], _ offset: Int) -> UInt16 {
    guard offset + 1 < bytes.count else { return 0 }
    return UInt16(bytes[offset]) | (UInt16(bytes[offset + 1]) << 8)
}

func readU32le(_ bytes: [UInt8], _ offset: Int) -> UInt32 {
    guard offset + 3 < bytes.count else { return 0 }
    return UInt32(bytes[offset])
        | (UInt32(bytes[offset + 1]) << 8)
        | (UInt32(bytes[offset + 2]) << 16)
        | (UInt32(bytes[offset + 3]) << 24)
}

func readAscii(_ bytes: [UInt8]) -> String {
    let end = bytes.firstIndex(of: 0) ?? bytes.count
    return String(bytes: bytes[0..<end], encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
}

func batteryPercent(_ raw: UInt8) -> Int {
    let value = Int(raw & 0x7f)
    return value <= 9 ? (value + 1) * 10 : min(value, 100)
}

/* ----------------------------------------------------------------- packets */

struct Packet {
    let raw: Data
    let status: UInt8
    let cmdType: UInt8
    let cmdId: UInt8
    let payload: Data
}

/// Reassembles 09 FF frames out of arbitrary BLE notification fragments.
final class PacketBuffer {
    private var buffer = Data()

    func feed(_ data: Data) -> [Packet] {
        buffer.append(data)
        var packets: [Packet] = []
        while buffer.count >= 10 {
            guard let start = findHeader() else {
                buffer.removeAll(keepingCapacity: true)
                break
            }
            if start > 0 { buffer.removeFirst(start) }
            if buffer.count < 10 { break }
            let total = Int(buffer[buffer.startIndex + 7]) | (Int(buffer[buffer.startIndex + 8]) << 8)
            if total < 10 {
                buffer.removeFirst()
                continue
            }
            if buffer.count < total { break }
            let raw = Data(buffer.prefix(total))
            buffer.removeFirst(total)
            let bytes = [UInt8](raw)
            let sum = UInt8(bytes[0..<(bytes.count - 1)].reduce(0) { ($0 + Int($1)) & 0xff })
            if sum != bytes[bytes.count - 1] { continue }
            packets.append(
                Packet(
                    raw: raw,
                    status: bytes[4],
                    cmdType: bytes[5],
                    cmdId: bytes[6],
                    payload: Data(bytes[9..<(bytes.count - 1)])
                )
            )
        }
        return packets
    }

    private func findHeader() -> Int? {
        guard buffer.count >= 4 else { return nil }
        let bytes = [UInt8](buffer)
        var index = 0
        while index <= bytes.count - 4 {
            if bytes[index] == 0x09 && bytes[index + 1] == 0xff && bytes[index + 2] == 0x00 && bytes[index + 3] == 0x00 {
                return index
            }
            index += 1
        }
        return nil
    }
}

/* ------------------------------------------------------------------ crypto */

func aesCtr(_ data: Data, key: Data, counter: Data) throws -> Data {
    guard key.count == 32, counter.count == 16 else {
        throw HelperError("KEY_CHECK_FAILED", "AES-CTR 参数长度不正确（key=\(key.count), counter=\(counter.count)）")
    }
    var cryptor: CCCryptorRef?
    let createStatus: CCCryptorStatus = key.withUnsafeBytes { keyBytes in
        counter.withUnsafeBytes { counterBytes in
            CCCryptorCreateWithMode(
                CCOperation(kCCEncrypt),
                CCMode(kCCModeCTR),
                CCAlgorithm(kCCAlgorithmAES),
                CCPadding(ccNoPadding),
                counterBytes.baseAddress,
                keyBytes.baseAddress,
                key.count,
                nil,
                0,
                0,
                CCModeOptions(kCCModeOptionCTR_BE),
                &cryptor
            )
        }
    }
    guard createStatus == kCCSuccess, let cryptor else {
        throw HelperError("CRYPTO_FAILED", "无法创建 AES-CTR 解密器（状态 \(createStatus)）")
    }
    defer { CCCryptorRelease(cryptor) }

    var output = Data(count: data.count)
    var moved = 0
    let updateStatus: CCCryptorStatus = output.withUnsafeMutableBytes { outBytes in
        data.withUnsafeBytes { inBytes in
            CCCryptorUpdate(cryptor, inBytes.baseAddress, data.count, outBytes.baseAddress, data.count, &moved)
        }
    }
    guard updateStatus == kCCSuccess, moved == data.count else {
        throw HelperError("CRYPTO_FAILED", "AES-CTR 解密失败（状态 \(updateStatus), moved=\(moved)）")
    }
    return output
}

/* ------------------------------------------------------------------ parsing */

struct DeviceEntry {
    let id: String
    let name: String?
    let rssi: Int
    let peripheral: CBPeripheral
}

struct DeviceFile {
    let fileId: UInt32
    let endTime: UInt32?
    let sizeBytes: UInt32

    var estimatedDurationMs: Int {
        let sizeEstimate = sizeBytes > 0 ? Int(sizeBytes) : nil
        if let endTime, endTime >= fileId {
            let clockEstimate = Int(endTime - fileId) * 1000
            if sizeEstimate == nil { return clockEstimate }
            let ratio = Double(clockEstimate) / Double(sizeEstimate ?? 1)
            if ratio >= 0.5 && ratio <= 2 { return clockEstimate }
        }
        return sizeEstimate ?? 0
    }
}

func parseDeviceInfo(_ payload: Data, into result: inout [String: Any]) {
    let bytes = [UInt8](payload)
    guard bytes.count >= 3 else { return }
    result["connectStatus"] = Int(bytes[0])
    result["battery"] = batteryPercent(bytes[1])
    result["charging"] = bytes[2] == 1
    var offset = 3
    if bytes.count >= offset + 5 {
        result["firmwareVersion"] = readAscii(Array(bytes[offset..<(offset + 5)]))
        offset += 5
    }
    if bytes.count >= offset + 16 {
        result["serialNumber"] = readAscii(Array(bytes[offset..<(offset + 16)])).lowercased()
        offset += 16
    }
    if bytes.count >= offset + 8 {
        result["totalMemoryKb"] = Int(readU32le(bytes, offset))
        result["freeMemoryKb"] = Int(readU32le(bytes, offset + 4))
        offset += 8
    }
    if bytes.count > offset {
        result["boxCharging"] = bytes[offset] == 1
        offset += 1
    }
    if bytes.count >= offset + 5 {
        result["boxFirmware"] = readAscii(Array(bytes[offset..<(offset + 5)]))
        offset += 5
    }
    if bytes.count > offset {
        result["boxBattery"] = batteryPercent(bytes[offset])
        offset += 1
    }
    if bytes.count >= offset + 6 {
        result["boxMac"] = bytes[offset..<(offset + 6)]
            .map { String(format: "%02x", $0) }
            .joined(separator: ":")
        offset += 6
    }
    if bytes.count >= offset + 6 {
        offset += 5
        result["recordStatus"] = bytes[offset] == 1 ? 1 : 0
    }
}

func parseFileList(_ payload: Data) -> [DeviceFile] {
    let bytes = [UInt8](payload)
    guard bytes.count >= 2 else { return [] }
    let count = Int(readU16le(bytes, 0))
    var files: [DeviceFile] = []
    var offset = 2
    for _ in 0..<count {
        guard offset + 12 <= bytes.count else { break }
        let fileId = readU32le(bytes, offset)
        offset += 4
        let endTime = readU32le(bytes, offset)
        offset += 4
        let sizeBytes = readU32le(bytes, offset)
        offset += 4
        if sizeBytes == 0 { continue }
        files.append(DeviceFile(fileId: fileId, endTime: endTime, sizeBytes: sizeBytes))
    }
    return files
}

/* ---------------------------------------------------------------- controller */

final class Controller: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    var central: CBCentralManager!
    var state: CBManagerState = .unknown
    var discovered: [UUID: DeviceEntry] = [:]
    var peripheralsById: [UUID: CBPeripheral] = [:]
    var target: CBPeripheral?
    var connected = false
    var connectedAt: Date?
    var connectionError: String?
    var serviceDiscovered = false
    var characteristicsDiscovered = false
    var characteristicsError: String?
    var notificationsReady = false
    var notificationsError: String?
    var writeCharacteristic: CBCharacteristic?
    var notifyCharacteristic: CBCharacteristic?
    var writeType: CBCharacteristicWriteType = .withResponse
    var packets = PacketBuffer()
    var inbox: [Packet] = []
    var disconnected = false
    var disconnectError: String?
    var sessionKey: Data?

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)
    }

    /* ------------------------------------------------------------- RunLoop */

    @discardableResult
    func pump(until condition: () -> Bool, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() {
            let remaining = deadline.timeIntervalSinceNow
            if remaining <= 0 { break }
            RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(min(remaining, 0.02)))
        }
        return condition()
    }

    func pump(seconds: TimeInterval) {
        pump(until: { false }, timeout: seconds)
    }

    func waitForState(timeout: TimeInterval = 5) throws {
        _ = pump(until: { self.state != .unknown && self.state != .resetting }, timeout: timeout)
        switch state {
        case .poweredOn:
            return
        case .unauthorized:
            throw HelperError(
                "BLUETOOTH_UNAUTHORIZED",
                "系统拒绝了蓝牙访问。请打开 系统设置 > 隐私与安全性 > 蓝牙，允许 DeepSeek Harness（或运行 Host 的终端）访问蓝牙后重试。"
            )
        case .poweredOff:
            throw HelperError("BLUETOOTH_OFF", "蓝牙已关闭。请在 系统设置 > 蓝牙 中打开蓝牙后重试。")
        case .unsupported:
            throw HelperError("BLUETOOTH_UNSUPPORTED", "这台 Mac 不支持蓝牙低功耗。")
        default:
            throw HelperError("BLUETOOTH_STATE_UNKNOWN", "蓝牙状态未就绪（\(state.rawValue)），请稍后重试。")
        }
    }

    /* -------------------------------------------------------------- scan */

    func scan(timeout: TimeInterval, precise: Bool) throws -> [DeviceEntry] {
        try waitForState()
        discovered.removeAll()
        peripheralsById.removeAll()
        writeStderr("scanning (\(precise ? "service filter" : "all devices")) for \(timeout)s")
        central.scanForPeripherals(
            withServices: precise ? [serviceUUID] : nil,
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
        pump(seconds: timeout)
        central.stopScan()
        return discovered.values.sorted { left, right in
            if left.rssi != right.rssi { return left.rssi > right.rssi }
            return left.id < right.id
        }
    }

    /* ----------------------------------------------------------- connect */

    func findPeripheral(id: UUID, timeout: TimeInterval) -> CBPeripheral? {
        if let known = peripheralsById[id] { return known }
        if let cached = central.retrievePeripherals(withIdentifiers: [id]).first {
            peripheralsById[id] = cached
            return cached
        }
        writeStderr("peripheral \(id.uuidString) not cached, scanning")
        central.scanForPeripherals(withServices: nil, options: nil)
        _ = pump(until: { self.peripheralsById[id] != nil }, timeout: timeout)
        central.stopScan()
        return peripheralsById[id]
    }

    func connect(deviceId: String, timeout: TimeInterval = 20) throws {
        try waitForState()
        guard let uuid = UUID(uuidString: deviceId) else {
            throw HelperError("BAD_DEVICE_ID", "设备 id 不是合法的 CoreBluetooth UUID：\(deviceId)")
        }
        guard let peripheral = findPeripheral(id: uuid, timeout: min(timeout, 8)) else {
            throw HelperError(
                "DEVICE_NOT_FOUND",
                "附近没有找到录音豆（\(deviceId)）。请唤醒录音豆、确认它没有连在手机/飞书 App 上，然后重试。"
            )
        }
        target = peripheral
        peripheral.delegate = self
        connected = false
        connectionError = nil
        disconnected = false
        serviceDiscovered = false
        characteristicsDiscovered = false
        characteristicsError = nil
        notificationsReady = false
        notificationsError = nil
        writeCharacteristic = nil
        notifyCharacteristic = nil

        writeStderr("connecting \(deviceId)")
        central.connect(peripheral, options: nil)
        _ = pump(until: { self.connected || self.connectionError != nil }, timeout: timeout)
        if !connected {
            let detail = connectionError ?? "连接超时"
            throw HelperError("CONNECT_FAILED", "连接录音豆失败：\(detail)。请确认设备在附近且未被其他 App 占用。")
        }
        connectedAt = Date()

        writeStderr("discovering service")
        peripheral.discoverServices([serviceUUID])
        _ = pump(until: { self.serviceDiscovered }, timeout: 10)
        guard let service = peripheral.services?.first(where: { $0.uuid == serviceUUID }) else {
            throw HelperError("SERVICE_NOT_FOUND", "已连接，但没有找到录音豆的 GATT 服务（020cf5da-…）。")
        }

        writeStderr("discovering characteristics")
        peripheral.discoverCharacteristics([writeUUID, notifyUUID], for: service)
        _ = pump(until: { self.characteristicsDiscovered }, timeout: 10)
        if let characteristicsError {
            throw HelperError("CHARACTERISTIC_NOT_FOUND", "读取录音豆 GATT 特征失败：\(characteristicsError)")
        }
        guard let write = writeCharacteristic, let notify = notifyCharacteristic else {
            throw HelperError("CHARACTERISTIC_NOT_FOUND", "已连接，但缺少写入或通知特征。")
        }
        writeType = .withResponse
        if write.properties.contains(.writeWithoutResponse) && !write.properties.contains(.write) {
            writeType = .withoutResponse
        }

        writeStderr("enabling notifications")
        peripheral.setNotifyValue(true, for: notify)
        _ = pump(until: { self.notificationsReady || self.notificationsError != nil }, timeout: 5)
        if !notificationsReady {
            throw HelperError(
                "NOTIFY_FAILED",
                "无法开启录音豆通知通道：\(notificationsError ?? "超时")。"
            )
        }
        writeStderr("ready")
    }

    /* ---------------------------------------------------------- commands */

    func write(_ data: Data) throws {
        guard let peripheral = target, let characteristic = writeCharacteristic, connected else {
            throw HelperError("NOT_CONNECTED", "尚未连接录音豆。")
        }
        peripheral.writeValue(data, for: characteristic, type: writeType)
    }

    func nextPacket(
        matching predicate: (Packet) -> Bool,
        timeout: TimeInterval,
        timeoutCode: String,
        timeoutMessage: String
    ) throws -> Packet {
        let deadline = Date().addingTimeInterval(timeout)
        while true {
            if let index = inbox.firstIndex(where: predicate) {
                return inbox.remove(at: index)
            }
            if disconnected {
                throw HelperError("DISCONNECTED", "录音豆连接已断开：\(disconnectError ?? "未知原因")。")
            }
            let remaining = deadline.timeIntervalSinceNow
            if remaining <= 0 {
                throw HelperError(timeoutCode, timeoutMessage)
            }
            RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(min(remaining, 0.02)))
        }
    }

    func send(_ data: Data) throws {
        try write(data)
    }

    /* ------------------------------------------------------------- info */

    func readDeviceInfo(timeout: TimeInterval = 5) -> [String: Any] {
        var result: [String: Any] = [:]
        do {
            try send(encodeCommand(0x01, 0x01))
            let packet = try nextPacket(
                matching: { $0.cmdType == 0x01 && $0.cmdId == 0x01 },
                timeout: timeout,
                timeoutCode: "INFO_TIMEOUT",
                timeoutMessage: "读取设备信息超时。"
            )
            parseDeviceInfo(packet.payload, into: &result)
        } catch {
            writeStderr("device info unavailable: \(error)")
        }
        return result
    }

    func readFiles(timeout: TimeInterval = 8) throws -> [DeviceFile] {
        var collected: [UInt32: DeviceFile] = [:]
        for page in 0..<50 {
            try send(encodeCommand(0x1b, 0x0e, payload: u16le(UInt16(page))))
            let packet = try nextPacket(
                matching: { ($0.cmdType == 0x1b || $0.cmdType == 0x1a) && $0.cmdId == 0x0e },
                timeout: timeout,
                timeoutCode: "LIST_TIMEOUT",
                timeoutMessage: "读取录音列表第 \(page + 1) 页超时。"
            )
            let files = parseFileList(packet.payload)
            for file in files { collected[file.fileId] = file }
            if files.count < 10 { break }
        }
        return collected.values.sorted { $0.fileId > $1.fileId }
    }

    /* ---------------------------------------------------------- crypto */

    func ensureSession(timeout: TimeInterval = 12) throws {
        if sessionKey != nil { return }
        let privateKey = P256.KeyAgreement.PrivateKey()
        let publicData = privateKey.publicKey.x963Representation
        writeStderr("ECDH handshake")
        try send(encodeCommand(0x2e, 0x01, payload: [UInt8](publicData)))
        let response = try nextPacket(
            matching: { $0.cmdType == 0x2e && $0.cmdId == 0x01 },
            timeout: timeout,
            timeoutCode: "HANDSHAKE_TIMEOUT",
            timeoutMessage: "录音豆没有响应 ECDH 握手。"
        )
        let bytes = [UInt8](response.payload)
        guard bytes.count >= 97 else {
            throw HelperError("HANDSHAKE_FAILED", "握手响应长度不足（\(bytes.count) 字节）。")
        }
        let devicePublicData = Data(bytes[0..<65])
        let sharedCheck = Data(bytes[65..<97])
        let devicePublic: P256.KeyAgreement.PublicKey
        do {
            devicePublic = try P256.KeyAgreement.PublicKey(x963Representation: devicePublicData)
        } catch {
            writeStderr("P-256 parse failed (\(error)); pub=\(devicePublicData.map { String(format: "%02x", $0) }.joined())")
            throw HelperError("HANDSHAKE_FAILED", "录音豆公钥不是合法的 P-256 密钥。")
        }
        guard let shared = try? privateKey.sharedSecretFromKeyAgreement(with: devicePublic) else {
            throw HelperError("HANDSHAKE_FAILED", "ECDH 共享密钥计算失败。")
        }
        let sharedData = shared.withUnsafeBytes { Data($0) }
        guard sharedData == sharedCheck else {
            throw HelperError("HANDSHAKE_FAILED", "ECDH 共享密钥校验失败。")
        }
        let derived = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: sharedData),
            salt: Data([1, 2, 3]),
            info: Data([1, 2, 3]),
            outputByteCount: 32
        )
        sessionKey = derived.withUnsafeBytes { Data($0) }
        writeStderr("session key ready")
    }

    /* ----------------------------------------------------------- export */

    func export(fileId: UInt32, outPath: String) throws -> (size: Int, durationMs: Int, expectedSize: Int) {
        try ensureSession()
        writeStderr("start export file \(fileId)")
        try send(encodeCommand(0x1a, 0x07, payload: u32le(0) + u32le(fileId) + [0]))

        var fileKey: Data?
        var fileNonce: Data?
        var plaintext = Data()
        var expectedSize = 0
        var sawHeader = false
        let overallDeadline = Date().addingTimeInterval(300)

        while true {
            let packet = try nextPacket(
                matching: { packet in
                    guard packet.cmdType == 0x1a || packet.cmdType == 0x1b else { return false }
                    return packet.cmdId == 0x07 || packet.cmdId == 0x08 || packet.cmdId == 0x12 || packet.cmdId == 0x0a
                },
                timeout: 30,
                timeoutCode: "EXPORT_TIMEOUT",
                timeoutMessage: "导出录音超时：录音豆 30 秒没有返回数据。请让录音豆保持唤醒后重试。"
            )
            if Date() > overallDeadline {
                throw HelperError("EXPORT_TIMEOUT", "导出录音超过 300 秒仍未完成。")
            }

            if packet.cmdId == 0x07 {
                let bytes = [UInt8](packet.payload)
                guard bytes.count >= 87, let sessionKey else {
                    throw HelperError("KEY_CHECK_FAILED", "录音豆返回的文件头不完整。")
                }
                let deviceFileId = readU32le(bytes, 0)
                if deviceFileId != fileId {
                    writeStderr("header for file \(deviceFileId) (expected \(fileId)), ignoring")
                    continue
                }
                let size = Int(readU32le(bytes, 4))
                let nonce = Data(bytes[8..<24])
                let encryptedKey = Data(bytes[24..<70])
                let sessionNonce = Data(bytes[70..<86])
                let errorCode = bytes[86]
                if errorCode != 0 {
                    throw HelperError("DEVICE_REJECTED_EXPORT", "录音豆拒绝导出（错误码 \(errorCode)）。")
                }
                let plain = try aesCtr(encryptedKey, key: sessionKey, counter: sessionNonce)
                let magic = Data("soundcored3200".utf8)
                guard plain.count >= 46, plain.prefix(14) == magic else {
                    throw HelperError("KEY_CHECK_FAILED", "录音文件密钥校验失败（soundcored3200 标识不匹配）。")
                }
                fileKey = plain.subdata(in: 14..<46)
                fileNonce = nonce.prefix(12)
                expectedSize = size
                sawHeader = true
                writeStderr("file header ok, expected \(size) bytes")
                continue
            }

            if packet.cmdId == 0x08 || packet.cmdId == 0x12 {
                guard let key = fileKey, let nonce = fileNonce else { continue }
                let raw = [UInt8](packet.raw)
                var offset = 9
                while raw.count - offset >= 165 {
                    let sequence = readU32le(raw, offset)
                    offset += 5
                    let encrypted = Data(raw[offset..<(offset + 160)])
                    offset += 160
                    var counter = Data(nonce)
                    counter.append(contentsOf: u32be(sequence &* 10))
                    plaintext.append(try aesCtr(encrypted, key: key, counter: counter))
                    if offset < raw.count { offset += 1 }
                }
                continue
            }

            if packet.cmdId == 0x0a {
                writeStderr("export complete, \(plaintext.count) bytes")
                break
            }
        }

        guard sawHeader else {
            throw HelperError("EXPORT_INCOMPLETE", "录音豆没有返回可解密的文件头。")
        }
        guard !plaintext.isEmpty else {
            throw HelperError("EMPTY_AUDIO", "导出的录音数据为空。")
        }
        let url = URL(fileURLWithPath: outPath)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try plaintext.write(to: url, options: .atomic)
        let durationMs = Int(ceil(Double(plaintext.count) / 160.0) * 20.0)
        return (plaintext.count, durationMs, expectedSize)
    }

    /* ----------------------------------------------------- record/delete */

    func record(action: String) throws -> (acknowledged: Bool, recordStatus: Int) {
        let payload: UInt8 = action == "start" ? 0x01 : 0x02
        try send(encodeCommand(0x18, 0x82, payload: [payload]))
        do {
            let packet = try nextPacket(
                matching: { $0.cmdType == 0x18 && $0.cmdId == 0x82 && $0.payload.count > 0 },
                timeout: 3,
                timeoutCode: "RECORD_TIMEOUT",
                timeoutMessage: "等待录音状态响应超时。"
            )
            let status = Int([UInt8](packet.payload)[0])
            return (true, status)
        } catch {
            // The command was delivered over an established link; the device does
            // not always answer. Report that honestly instead of pretending.
            return (false, payload == 0x01 ? 1 : 2)
        }
    }

    func delete(fileId: UInt32) throws {
        try send(encodeCommand(0x1a, 0x10, payload: u32le(fileId)))
        let packet = try nextPacket(
            matching: { ($0.cmdType == 0x1a || $0.cmdType == 0x1b) && $0.cmdId == 0x10 },
            timeout: 10,
            timeoutCode: "DELETE_TIMEOUT",
            timeoutMessage: "等待录音豆删除结果超时。"
        )
        if packet.status != 0 {
            throw HelperError("DELETE_REJECTED", "录音豆拒绝删除（状态码 \(packet.status)）。")
        }
    }

    func shutdown() {
        if let peripheral = target, connected {
            central.cancelPeripheralConnection(peripheral)
        }
        central.stopScan()
    }

    /* --------------------------------------------------------- delegates */

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        state = central.state
        writeStderr("central state=\(central.state.rawValue) auth=\(CBManager.authorization.rawValue)")
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
        let entry = DeviceEntry(
            id: peripheral.identifier.uuidString,
            name: peripheral.name ?? localName,
            rssi: RSSI.intValue,
            peripheral: peripheral
        )
        discovered[peripheral.identifier] = entry
        peripheralsById[peripheral.identifier] = peripheral
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connected = true
        connectionError = nil
        writeStderr("connected \(peripheral.identifier.uuidString)")
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connected = false
        connectionError = error?.localizedDescription ?? "didFailToConnect"
        writeStderr("connect failed: \(connectionError ?? "unknown")")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        connected = false
        disconnected = true
        disconnectError = error?.localizedDescription
        writeStderr("disconnected: \(disconnectError ?? "no error")")
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        serviceDiscovered = true
        if let error { writeStderr("discoverServices error: \(error.localizedDescription)") }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        characteristicsDiscovered = true
        if let error { characteristicsError = error.localizedDescription }
        for characteristic in service.characteristics ?? [] {
            if characteristic.uuid == writeUUID { writeCharacteristic = characteristic }
            if characteristic.uuid == notifyUUID { notifyCharacteristic = characteristic }
        }
    }

    func peripheral(
        _ peripheral: CBPeripheral,
        didUpdateNotificationStateFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        if let error {
            notificationsError = error.localizedDescription
        } else {
            notificationsReady = characteristic.isNotifying
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error {
            writeStderr("notify error: \(error.localizedDescription)")
            return
        }
        guard characteristic.uuid == notifyUUID, let value = characteristic.value else { return }
        for packet in packets.feed(value) {
            inbox.append(packet)
        }
    }
}

/* ----------------------------------------------------------------- options */

struct Options {
    var command = ""
    var device: String?
    var file: UInt32?
    var out: String?
    var action: String?
    var timeout: TimeInterval?
    var mode = "precise"
}

func parseOptions() -> Options {
    var options = Options()
    var args = Array(CommandLine.arguments.dropFirst())
    guard !args.isEmpty else {
        fail("BAD_USAGE", "缺少子命令。用法：scan | list --device <uuid> | export --device <uuid> --file <id> --out <path> | record --device <uuid> --action start|pause | delete --device <uuid> --file <id>", exitCode: 2)
    }
    options.command = args.removeFirst()
    var index = 0
    while index < args.count {
        let arg = args[index]
        switch arg {
        case "--device":
            index += 1
            guard index < args.count else { fail("BAD_USAGE", "--device 缺少值", exitCode: 2) }
            options.device = args[index]
        case "--file":
            index += 1
            guard index < args.count, let value = UInt32(args[index]) else {
                fail("BAD_USAGE", "--file 需要 u32 数值", exitCode: 2)
            }
            options.file = value
        case "--out":
            index += 1
            guard index < args.count else { fail("BAD_USAGE", "--out 缺少值", exitCode: 2) }
            options.out = args[index]
        case "--action":
            index += 1
            guard index < args.count, ["start", "pause"].contains(args[index]) else {
                fail("BAD_USAGE", "--action 只能是 start 或 pause", exitCode: 2)
            }
            options.action = args[index]
        case "--timeout":
            index += 1
            guard index < args.count, let value = Double(args[index]), value > 0 else {
                fail("BAD_USAGE", "--timeout 需要正数秒", exitCode: 2)
            }
            options.timeout = value
        case "--mode":
            index += 1
            guard index < args.count, ["precise", "all"].contains(args[index]) else {
                fail("BAD_USAGE", "--mode 只能是 precise 或 all", exitCode: 2)
            }
            options.mode = args[index]
        default:
            if arg.hasPrefix("--") {
                fail("BAD_USAGE", "未知参数 \(arg)", exitCode: 2)
            }
            fail("BAD_USAGE", "多余参数 \(arg)", exitCode: 2)
        }
        index += 1
    }
    return options
}

/* -------------------------------------------------------------------- main */

@main
struct D3200Helper {
    static func main() {
        let options = parseOptions()
        let controller = Controller()
        defer { controller.shutdown() }

        do {
            switch options.command {
            case "scan":
                let devices = try controller.scan(
                    timeout: options.timeout ?? 8,
                    precise: options.mode != "all"
                )
                let list: [[String: Any]] = devices.map { device in
                    var entry: [String: Any] = ["id": device.id, "rssi": device.rssi]
                    if let name = device.name, !name.isEmpty { entry["name"] = name }
                    return entry
                }
                succeed(["devices": list, "mode": options.mode])
            case "list":
                guard let deviceId = options.device else { fail("BAD_USAGE", "list 需要 --device <uuid>", exitCode: 2) }
                try controller.connect(deviceId: deviceId)
                let info = controller.readDeviceInfo()
                let files = try controller.readFiles()
                var payload: [String: Any] = [
                    "device": info,
                    "files": files.map { file -> [String: Any] in
                        [
                            "fileId": Int(file.fileId),
                            "endTime": Int(file.endTime ?? 0),
                            "sizeBytes": Int(file.sizeBytes),
                            "estimatedDurationMs": file.estimatedDurationMs,
                        ]
                    },
                ]
                if let name = controller.target?.name, !name.isEmpty { payload["name"] = name }
                payload["deviceId"] = deviceId
                succeed(payload)
            case "export":
                guard let deviceId = options.device else { fail("BAD_USAGE", "export 需要 --device <uuid>", exitCode: 2) }
                guard let fileId = options.file else { fail("BAD_USAGE", "export 需要 --file <u32>", exitCode: 2) }
                guard let out = options.out, !out.isEmpty else { fail("BAD_USAGE", "export 需要 --out <path>", exitCode: 2) }
                try controller.connect(deviceId: deviceId)
                let result = try controller.export(fileId: fileId, outPath: out)
                succeed([
                    "fileId": Int(fileId),
                    "sizeBytes": result.size,
                    "durationMs": result.durationMs,
                    "expectedSizeBytes": result.expectedSize,
                ])
            case "record":
                guard let deviceId = options.device else { fail("BAD_USAGE", "record 需要 --device <uuid>", exitCode: 2) }
                guard let action = options.action else { fail("BAD_USAGE", "record 需要 --action start|pause", exitCode: 2) }
                try controller.connect(deviceId: deviceId)
                let result = try controller.record(action: action)
                succeed([
                    "recordStatus": result.recordStatus,
                    "acknowledged": result.acknowledged,
                ])
            case "delete":
                guard let deviceId = options.device else { fail("BAD_USAGE", "delete 需要 --device <uuid>", exitCode: 2) }
                guard let fileId = options.file else { fail("BAD_USAGE", "delete 需要 --file <u32>", exitCode: 2) }
                try controller.connect(deviceId: deviceId)
                try controller.delete(fileId: fileId)
                succeed(["fileId": Int(fileId), "deleted": true])
            default:
                fail("BAD_USAGE", "未知子命令 \(options.command)", exitCode: 2)
            }
        } catch let error as HelperError {
            fail(error.code, error.message)
        } catch {
            fail("INTERNAL", "录音豆助手执行失败：\(error.localizedDescription)")
        }
    }
}
