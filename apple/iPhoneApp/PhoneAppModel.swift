import Combine
import Foundation

/// iPhone 端的总控：接收手表录音、UDP 发现电脑、上传队列与重试。
/// 所有 @Published 的修改都通过 onMain 落到主线程。
final class PhoneAppModel: ObservableObject {
    // MARK: - 对外状态

    @Published private(set) var recordings: [PhoneRecording] = []
    @Published private(set) var watchStatusText = "正在连接手表…"
    @Published private(set) var watchReachable = false
    @Published private(set) var isUploading = false
    @Published private(set) var isDiscovering = false
    @Published private(set) var discoveryError: String?
    @Published private(set) var pingResult: String?
    @Published var banner: String?

    let settings: UploadSettings

    // MARK: - 依赖

    private let store: PhoneRecordingStore
    private let uploader: UploadService
    private let receiver: WatchConnectivityReceiver
    private let discovery: BeaconDiscovery
    private var cancellables = Set<AnyCancellable>()
    private var retryTask: Task<Void, Never>?
    private var hasStarted = false

    var pendingCount: Int {
        recordings.filter { !$0.uploadState.isUploaded }.count
    }

    // MARK: - 初始化 / 生命周期

    init(
        settings: UploadSettings = UploadSettings(),
        store: PhoneRecordingStore = PhoneRecordingStore(),
        uploader: UploadService = UploadService()
    ) {
        self.settings = settings
        self.store = store
        self.uploader = uploader
        self.receiver = WatchConnectivityReceiver()
        self.discovery = BeaconDiscovery()
        bind()
        reload()
    }

    deinit {
        retryTask?.cancel()
    }

    func start() {
        guard !hasStarted else {
            reload()
            retryPendingUploads()
            return
        }
        hasStarted = true
        receiver.activate()
        discovery.start()
        reload()
        retryPendingUploads()
    }

    private func bind() {
        receiver.onFileReceived = { [weak self] tempURL, metadata in
            self?.handleIncomingFile(tempURL: tempURL, metadata: metadata)
        }
        receiver.$statusText
            .receive(on: DispatchQueue.main)
            .sink { [weak self] text in self?.watchStatusText = text }
            .store(in: &cancellables)
        receiver.$watchReachable
            .receive(on: DispatchQueue.main)
            .sink { [weak self] reachable in self?.watchReachable = reachable }
            .store(in: &cancellables)
        receiver.$lastError
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                if let error { self?.banner = error }
            }
            .store(in: &cancellables)

        discovery.$isListening
            .receive(on: DispatchQueue.main)
            .sink { [weak self] listening in self?.isDiscovering = listening }
            .store(in: &cancellables)
        discovery.$lastError
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                if let error { self?.discoveryError = error }
            }
            .store(in: &cancellables)
        discovery.onBeacon = { [weak self] beacon in
            self?.handleBeacon(beacon)
        }
    }

    // MARK: - 列表

    func reload() {
        onMain {
            self.recordings = self.store.listRecordings()
        }
    }

    func delete(_ recording: PhoneRecording) {
        store.delete(recording)
        reload()
    }

    func retry(_ recording: PhoneRecording) {
        store.resetState(identifier: recording.id)
        reload()
        retryPendingUploads()
    }

    // MARK: - 手表文件

    /// 在 WCSession 代理线程同步落盘，然后回主线程刷新列表并排队上传。
    private func handleIncomingFile(tempURL: URL, metadata: [String: Any]) {
        do {
            let recording = try store.saveIncoming(tempURL: tempURL, metadata: metadata)
            onMain {
                self.reload()
                self.banner = "已收到手表录音「\(recording.name)」，正在加入上传队列。"
                self.retryPendingUploads()
            }
        } catch {
            onMain {
                self.banner = "保存手表录音失败：\(error.localizedDescription)"
            }
        }
    }

    // MARK: - UDP 信标

    private func handleBeacon(_ beacon: BeaconDiscovery.Beacon) {
        onMain {
            self.settings.applyBeacon(
                host: beacon.host,
                port: beacon.port,
                token: beacon.token,
                name: beacon.name
            )
            self.discoveryError = nil
            // 发现电脑后，如果设置已自动填好，就立刻补传排队录音。
            if self.settings.isConfigured && !self.isUploading {
                self.retryPendingUploads()
            }
        }
    }

    // MARK: - 上传

    func retryPendingUploads() {
        onMain {
            guard !self.isUploading else { return }
            let pending = self.recordings.filter { !$0.uploadState.isUploaded }
            guard !pending.isEmpty else { return }
            guard self.settings.isConfigured else {
                self.banner = "请先在设置里填写电脑地址与导入 Token（同一 Wi-Fi 下会自动发现）。"
                return
            }
            self.isUploading = true
            self.retryTask?.cancel()
            self.retryTask = Task { @MainActor in
                await self.runUploadQueue()
            }
        }
    }

    private func runUploadQueue() async {
        guard let baseURL = settings.baseURL else {
            isUploading = false
            banner = "电脑地址无效，请检查设置。"
            return
        }
        let token = settings.token
        let pending = recordings.filter { !$0.uploadState.isUploaded }
        var stopBatch = false
        var successCount = 0

        for item in pending {
            if stopBatch { break }
            guard let current = recordings.first(where: { $0.id == item.id }) else { continue }
            updateState(identifier: current.id) { $0.uploadState = .uploading }

            let request = UploadService.Request(
                fileURL: current.url,
                name: current.name,
                recordedAt: current.recordedAt,
                durationMs: current.durationMs,
                format: RecordingFormat.m4a
            )
            let outcome = await uploader.upload(request, baseURL: baseURL, token: token)

            switch outcome {
            case .success:
                successCount += 1
                store.markUploaded(identifier: current.id)
                updateState(identifier: current.id) {
                    $0.uploadState = .uploaded
                    $0.attempts = 0
                    $0.lastError = nil
                }
            case .permanentFailure(let message):
                store.recordFailure(identifier: current.id, message: message)
                markFailed(identifier: current.id, message: message)
                stopBatch = true
            case .transientFailure(let message):
                store.recordFailure(identifier: current.id, message: message)
                markFailed(identifier: current.id, message: message)
                stopBatch = true
            }
        }

        isUploading = false
        if successCount > 0 && !stopBatch {
            banner = "已上传 \(successCount) 条录音到电脑。"
        }
        scheduleRetry()
    }

    private func markFailed(identifier: String, message: String) {
        // 只在第一次失败时弹提示，避免后台自动重试时反复打扰。
        let wasFirstFailure = (recordings.first(where: { $0.id == identifier })?.attempts ?? 0) == 0
        updateState(identifier: identifier) { recording in
            recording.uploadState = .failed(message)
            recording.attempts += 1
            recording.lastError = message
        }
        if wasFirstFailure {
            banner = "上传失败：\(message)（稍后会自动重试）"
        }
    }

    private func updateState(identifier: String, mutate: (inout PhoneRecording) -> Void) {
        guard let index = recordings.firstIndex(where: { $0.id == identifier }) else { return }
        mutate(&recordings[index])
    }

    private func scheduleRetry() {
        retryTask?.cancel()
        let pending = recordings.filter { !$0.uploadState.isUploaded }
        guard !pending.isEmpty else { return }
        guard settings.isConfigured else { return }
        let attempts = pending.map(\.attempts).max() ?? 1
        let delay = min(pow(2.0, Double(min(attempts, 5))) * 15, 300)
        retryTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            guard !Task.isCancelled else { return }
            self?.retryPendingUploads()
        }
    }

    // MARK: - 连接测试

    func testConnection() {
        guard let baseURL = settings.baseURL else {
            pingResult = "请先填写电脑地址与端口。"
            return
        }
        let token = settings.token
        pingResult = "正在测试…"
        Task { @MainActor [weak self] in
            guard let self else { return }
            self.pingResult = await self.uploader.ping(baseURL: baseURL, token: token)
        }
    }

    // MARK: - 主线程辅助

    private func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }
}
