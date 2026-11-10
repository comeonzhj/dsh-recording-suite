import AVFoundation
import Combine
import Foundation

/// 手表端状态机：录音、播放、列表、以及把完成的录音交给 PhoneLink 发送。
/// 所有 @Published 的修改都在主线程上完成。
final class WatchRecorderModel: NSObject, ObservableObject {
    // MARK: - 对外状态

    @Published private(set) var isRecording = false
    @Published private(set) var elapsedText = "0:00"
    @Published private(set) var recordings: [WatchRecordingItem] = []
    @Published private(set) var companionStatusText = "正在连接 iPhone…"
    @Published private(set) var companionReady = false
    @Published private(set) var playingID: String?
    @Published var banner: String?

    // MARK: - 内部依赖

    private let link = PhoneLink()
    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?
    private var currentRecording: WatchRecordingItem?
    private var timer: Timer?
    private var recordingStartedAt: Date?
    private var autoStartRequested = false
    private var cancellables = Set<AnyCancellable>()

    private let sentIDsDefaultsKey = "watch.sentRecordingIDs"
    private var sentIDs: Set<String>

    // MARK: - 生命周期

    override init() {
        sentIDs = Set(UserDefaults.standard.stringArray(forKey: sentIDsDefaultsKey) ?? [])
        super.init()
        link.onTransferSucceeded = { [weak self] recordingID in
            self?.markSent(recordingID)
        }
        link.onTransferFailed = { [weak self] recordingID, message in
            self?.markFailed(recordingID, message: message)
        }
        link.$status
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                guard let self else { return }
                self.companionStatusText = status.message
                self.companionReady = status.isReady
                if status.isReady {
                    self.retryPendingTransfers()
                }
            }
            .store(in: &cancellables)
        link.activate()
        reloadRecordings()
    }

    // MARK: - 表盘 / URL 入口

    /// 处理 widgetURL：`dshrec://record` 表示直接开始录音。
    func handleIncomingURL(_ url: URL) {
        guard url.scheme?.lowercased() == "dshrec" else { return }
        let route = (url.host ?? url.path).lowercased()
        guard route == "record" else { return }
        autoStartRequested = true
        startIfAutoStartRequested()
    }

    /// App 回到前台时刷新连接状态并补发排队中的录音。
    func handleSceneActive() {
        link.refreshStatus()
        link.activateIfNeeded()
        retryPendingTransfers()
        startIfAutoStartRequested()
    }

    private func startIfAutoStartRequested() {
        guard autoStartRequested, !isRecording else { return }
        autoStartRequested = false
        requestPermissionAndStart()
    }

    // MARK: - 录音

    func toggleRecording() {
        if isRecording {
            stopRecording()
        } else {
            requestPermissionAndStart()
        }
    }

    private func requestPermissionAndStart() {
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            DispatchQueue.main.async {
                guard let self else { return }
                if granted {
                    self.startRecording()
                } else {
                    self.banner = "麦克风权限未开启：请在手表「设置 › 隐私与安全性 › 麦克风」中允许 DSH 录音。"
                }
            }
        }
    }

    private func startRecording() {
        guard !isRecording else { return }
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.record, mode: .default)
        try? session.setActive(true)

        let startedAt = Date()
        let identifier = RecordingNaming.makeIdentifier(date: startedAt)
        let directory = RecordingPaths.recordingsDirectory()
        let url = directory.appendingPathComponent("\(identifier).\(RecordingFormat.m4a)")

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 22_050.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
            AVEncoderBitRateKey: 32_000
        ]

        do {
            let recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder.delegate = self
            guard recorder.record() else {
                banner = "无法开始录音：麦克风可能正被其他 App 使用。"
                return
            }
            self.recorder = recorder
            recordingStartedAt = startedAt
            currentRecording = WatchRecordingItem(
                id: identifier,
                url: url,
                name: RecordingNaming.displayTitle(date: startedAt),
                recordedAt: startedAt,
                durationMs: 0,
                transferState: .pending
            )
            isRecording = true
            elapsedText = "0:00"
            banner = nil
            startTimer()
        } catch {
            banner = "无法开始录音：\(error.localizedDescription)"
        }
    }

    private func stopRecording() {
        guard let recorder, isRecording else { return }
        let duration = recorder.currentTime
        recorder.stop()
        self.recorder = nil
        stopTimer()
        isRecording = false
        elapsedText = "0:00"
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        guard let item = currentRecording else { return }
        currentRecording = nil

        if duration < 0.5 {
            try? FileManager.default.removeItem(at: item.url)
            banner = "录音太短，已丢弃。"
            return
        }

        var finished = item
        finished.durationMs = Int((duration * 1000).rounded())
        recordings.insert(finished, at: 0)
        send(finished)
    }

    private func startTimer() {
        stopTimer()
        let timer = Timer(timeInterval: 0.2, repeats: true) { [weak self] _ in
            self?.updateElapsed()
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func updateElapsed() {
        guard isRecording, let recordingStartedAt else { return }
        let seconds = Int(Date().timeIntervalSince(recordingStartedAt))
        elapsedText = String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    // MARK: - 发送

    /// 手动重发（列表里「重发」或连接恢复后自动调用）。
    func send(_ item: WatchRecordingItem) {
        guard FileManager.default.fileExists(atPath: item.url.path) else {
            banner = "录音文件不存在，无法发送。"
            return
        }
        guard item.transferState != .sent else { return }
        let durationMs = item.durationMs > 0 ? item.durationMs : durationFromFile(item.url)
        let metadata: [String: Any] = [
            "recordingID": item.id,
            "name": item.name,
            "recordedAt": RecordingNaming.iso8601String(from: item.recordedAt),
            "durationMs": durationMs,
            "format": RecordingFormat.m4a
        ]
        updateState(item.id, to: .sending)
        if link.send(recordingID: item.id, fileURL: item.url, metadata: metadata) {
            // WatchConnectivity 会排队，真正送达后由 didFinish 回调改成「已发送」。
        } else {
            updateState(item.id, to: .pending)
            if let message = link.lastError {
                banner = message
            }
        }
    }

    private func retryPendingTransfers() {
        guard link.isActivated else { return }
        for item in recordings {
            switch item.transferState {
            case .pending, .failed:
                send(item)
            case .sending, .sent:
                continue
            }
        }
    }

    private func markSent(_ recordingID: String) {
        sentIDs.insert(recordingID)
        UserDefaults.standard.set(Array(sentIDs), forKey: sentIDsDefaultsKey)
        updateState(recordingID, to: .sent)
        banner = "已发送到 iPhone。"
    }

    private func markFailed(_ recordingID: String, message: String) {
        updateState(recordingID, to: .failed(message))
        banner = "发送失败：\(message)"
    }

    private func updateState(_ recordingID: String, to state: WatchRecordingItem.TransferState) {
        guard let index = recordings.firstIndex(where: { $0.id == recordingID }) else { return }
        recordings[index].transferState = state
    }

    // MARK: - 播放

    func togglePlayback(_ item: WatchRecordingItem) {
        if playingID == item.id {
            stopPlayback()
            return
        }
        stopPlayback()
        do {
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.playback, mode: .default)
            try? session.setActive(true)
            let player = try AVAudioPlayer(contentsOf: item.url)
            player.delegate = self
            player.prepareToPlay()
            player.play()
            self.player = player
            playingID = item.id
        } catch {
            banner = "无法播放：\(error.localizedDescription)"
        }
    }

    private func stopPlayback() {
        player?.stop()
        player = nil
        playingID = nil
    }

    // MARK: - 删除 / 列表

    func delete(_ item: WatchRecordingItem) {
        if playingID == item.id {
            stopPlayback()
        }
        try? FileManager.default.removeItem(at: item.url)
        recordings.removeAll { $0.id == item.id }
    }

    func reloadRecordings() {
        let fileManager = FileManager.default
        let directory = RecordingPaths.recordingsDirectory()
        let urls = (try? fileManager.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.creationDateKey],
            options: [.skipsHiddenFiles]
        )) ?? []

        var items: [WatchRecordingItem] = []
        for url in urls where url.pathExtension.lowercased() == RecordingFormat.m4a {
            let identifier = url.deletingPathExtension().lastPathComponent
            let recordedAt = RecordingNaming.recordedAt(fromIdentifier: identifier)
                ?? (try? url.resourceValues(forKeys: [.creationDateKey]).creationDate)
                ?? Date()
            let durationMs = durationFromFile(url)
            let state: WatchRecordingItem.TransferState = sentIDs.contains(identifier) ? .sent : .pending
            items.append(WatchRecordingItem(
                id: identifier,
                url: url,
                name: RecordingNaming.displayTitle(date: recordedAt),
                recordedAt: recordedAt,
                durationMs: durationMs,
                transferState: state
            ))
        }
        recordings = items.sorted { $0.recordedAt > $1.recordedAt }
    }

    private func durationFromFile(_ url: URL) -> Int {
        guard let player = try? AVAudioPlayer(contentsOf: url) else { return 0 }
        return Int((player.duration * 1000).rounded())
    }
}

// MARK: - AVFoundation 回调

extension WatchRecorderModel: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        guard !flag else { return }
        DispatchQueue.main.async {
            guard self.isRecording else { return }
            self.banner = "录音意外中断，已保存到目前为止的内容。"
            self.stopRecording()
        }
    }

    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        DispatchQueue.main.async {
            self.banner = "录音编码出错：\(error?.localizedDescription ?? "未知错误")"
        }
    }
}

extension WatchRecorderModel: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async {
            self.playingID = nil
            self.player = nil
        }
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        DispatchQueue.main.async {
            self.banner = "播放出错：\(error?.localizedDescription ?? "未知错误")"
            self.playingID = nil
            self.player = nil
        }
    }
}
