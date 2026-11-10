import Foundation

/// 录音文件与上传状态的本地存储。
///
/// 目录结构（Documents/Recordings）：
///   watch-20261109-183000-4f2a.m4a   音频
///   watch-20261109-183000-4f2a.json  元数据（标题/时间/时长/格式）
///
/// 上传状态存 UserDefaults（避免每次启动扫盘丢状态）。
final class PhoneRecordingStore {
    struct UploadStateRecord: Codable {
        var status: String // pending / failed / uploaded
        var attempts: Int
        var error: String?
    }

    let directory: URL

    private let fileManager: FileManager
    private let defaults: UserDefaults
    private let stateDefaultsKey = "phone.uploadStates"
    private var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    init(fileManager: FileManager = .default, defaults: UserDefaults = .standard) {
        self.fileManager = fileManager
        self.defaults = defaults
        self.directory = RecordingPaths.recordingsDirectory(fileManager: fileManager)
    }

    // MARK: - 列表

    func listRecordings() -> [PhoneRecording] {
        let urls = (try? fileManager.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.creationDateKey],
            options: [.skipsHiddenFiles]
        )) ?? []
        let states = loadStates()

        var items: [PhoneRecording] = []
        for url in urls where url.pathExtension.lowercased() == RecordingFormat.m4a {
            let identifier = url.deletingPathExtension().lastPathComponent
            let meta = loadMeta(identifier: identifier) ?? fallbackMeta(identifier: identifier, url: url)
            let stateRecord = states[identifier]
            items.append(PhoneRecording(
                id: identifier,
                url: url,
                name: meta.name,
                recordedAt: meta.recordedAt,
                durationMs: meta.durationMs,
                uploadState: uploadState(from: stateRecord),
                attempts: stateRecord?.attempts ?? 0,
                lastError: stateRecord?.error
            ))
        }
        return items.sorted { $0.recordedAt > $1.recordedAt }
    }

    // MARK: - 接收手表文件

    /// 把 WatchConnectivity 的临时文件复制进 Documents/Recordings，并写元数据。
    /// 注意：必须在 WCSession 代理回调返回前完成复制，临时文件随后会被系统删除。
    func saveIncoming(tempURL: URL, metadata: [String: Any]) throws -> PhoneRecording {
        let recordedAt = (metadata["recordedAt"] as? String)
            .flatMap(RecordingNaming.date(fromISO8601:))
            ?? Date()
        let durationMs = metadata["durationMs"] as? Int ?? 0
        let format = (metadata["format"] as? String) ?? RecordingFormat.m4a
        let requestedID = (metadata["recordingID"] as? String)
            ?? RecordingNaming.makeIdentifier(date: recordedAt)
        let baseName = RecordingNaming.sanitizedIdentifier(requestedID)
        let destination = RecordingNaming.uniqueURL(
            in: directory,
            preferredBaseName: baseName,
            pathExtension: format
        )
        try fileManager.copyItem(at: tempURL, to: destination)

        let identifier = destination.deletingPathExtension().lastPathComponent
        let rawName = (metadata["name"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let name = (rawName?.isEmpty == false ? rawName : nil) ?? RecordingNaming.displayTitle(date: recordedAt)
        let meta = RecordingMeta(
            id: identifier,
            name: name,
            recordedAt: recordedAt,
            durationMs: durationMs,
            format: format
        )
        writeMeta(meta)

        var states = loadStates()
        states[identifier] = UploadStateRecord(status: "pending", attempts: 0, error: nil)
        saveStates(states)

        return PhoneRecording(
            id: identifier,
            url: destination,
            name: name,
            recordedAt: recordedAt,
            durationMs: durationMs,
            uploadState: .pending,
            attempts: 0,
            lastError: nil
        )
    }

    // MARK: - 删除

    func delete(_ recording: PhoneRecording) {
        try? fileManager.removeItem(at: recording.url)
        try? fileManager.removeItem(at: metaURL(identifier: recording.id))
        var states = loadStates()
        states.removeValue(forKey: recording.id)
        saveStates(states)
    }

    // MARK: - 上传状态

    func markUploaded(identifier: String) {
        var states = loadStates()
        states[identifier] = UploadStateRecord(status: "uploaded", attempts: states[identifier]?.attempts ?? 0, error: nil)
        saveStates(states)
    }

    func recordFailure(identifier: String, message: String) {
        var states = loadStates()
        let attempts = (states[identifier]?.attempts ?? 0) + 1
        states[identifier] = UploadStateRecord(status: "failed", attempts: attempts, error: message)
        saveStates(states)
    }

    func resetState(identifier: String) {
        var states = loadStates()
        states[identifier] = UploadStateRecord(status: "pending", attempts: 0, error: nil)
        saveStates(states)
    }

    // MARK: - 私有

    private func uploadState(from record: UploadStateRecord?) -> PhoneRecording.UploadState {
        guard let record else { return .pending }
        switch record.status {
        case "uploaded": return .uploaded
        case "failed": return .failed(record.error ?? "未知原因")
        default: return .pending
        }
    }

    private func metaURL(identifier: String) -> URL {
        directory.appendingPathComponent("\(identifier).json")
    }

    private func loadMeta(identifier: String) -> RecordingMeta? {
        guard let data = try? Data(contentsOf: metaURL(identifier: identifier)) else { return nil }
        return try? decoder.decode(RecordingMeta.self, from: data)
    }

    private func writeMeta(_ meta: RecordingMeta) {
        guard let data = try? encoder.encode(meta) else { return }
        try? data.write(to: metaURL(identifier: meta.id), options: .atomic)
    }

    private func fallbackMeta(identifier: String, url: URL) -> RecordingMeta {
        let recordedAt = RecordingNaming.recordedAt(fromIdentifier: identifier)
            ?? (try? url.resourceValues(forKeys: [.creationDateKey]).creationDate)
            ?? Date()
        return RecordingMeta(
            id: identifier,
            name: RecordingNaming.displayTitle(date: recordedAt),
            recordedAt: recordedAt,
            durationMs: 0,
            format: RecordingFormat.m4a
        )
    }

    private func loadStates() -> [String: UploadStateRecord] {
        guard let data = defaults.data(forKey: stateDefaultsKey) else { return [:] }
        return (try? decoder.decode([String: UploadStateRecord].self, from: data)) ?? [:]
    }

    private func saveStates(_ states: [String: UploadStateRecord]) {
        guard let data = try? encoder.encode(states) else { return }
        defaults.set(data, forKey: stateDefaultsKey)
    }
}
