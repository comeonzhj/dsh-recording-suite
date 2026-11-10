import SwiftUI

struct PhoneContentView: View {
    @EnvironmentObject private var model: PhoneAppModel
    @Environment(\.scenePhase) private var scenePhase
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    statusHeader
                }

                Section {
                    if model.recordings.isEmpty {
                        Text("还没有收到手表录音。在手表上打开 DSH 录音或点按表盘上的麦克风录制，保持手表与 iPhone 配对即可自动同步。")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(model.recordings) { recording in
                            recordingRow(recording)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        model.delete(recording)
                                    } label: {
                                        Label("删除", systemImage: "trash")
                                    }
                                    if !recording.uploadState.isUploaded {
                                        Button {
                                            model.retry(recording)
                                        } label: {
                                            Label("重试", systemImage: "arrow.clockwise")
                                        }
                                        .tint(.blue)
                                    }
                                }
                        }
                    }
                } header: {
                    Text("手表录音（\(model.recordings.count)）")
                }
            }
            .navigationTitle("手表录音")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("设置")
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(settings: model.settings)
                    .environmentObject(model)
            }
            .alert("提示", isPresented: bannerBinding) {
                Button("好", role: .cancel) {}
            } message: {
                Text(model.banner ?? "")
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active {
                    model.reload()
                    model.retryPendingUploads()
                }
            }
        }
    }

    private var bannerBinding: Binding<Bool> {
        Binding(
            get: { model.banner != nil },
            set: { newValue in
                if !newValue { model.banner = nil }
            }
        )
    }

    // MARK: - 顶部状态

    private var statusHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Circle()
                    .fill(model.watchReachable ? Color.green : Color.orange)
                    .frame(width: 8, height: 8)
                Text("手表")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(model.watchStatusText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
            }

            HStack(spacing: 6) {
                Circle()
                    .fill(model.settings.baseURL == nil ? Color.gray : (model.isDiscovering ? Color.green : Color.orange))
                    .frame(width: 8, height: 8)
                Text("电脑")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(computerDescription)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
            }

            if let discoveryError = model.discoveryError {
                Text(discoveryError)
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }

            HStack {
                Text(model.pendingCount > 0 ? "\(model.pendingCount) 条待上传" : "全部已上传")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                if model.pendingCount > 0 {
                    Button(model.isUploading ? "上传中…" : "全部上传") {
                        model.retryPendingUploads()
                    }
                    .font(.caption.weight(.semibold))
                    .disabled(model.isUploading)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var computerDescription: String {
        if let name = model.settings.computerName, model.settings.isConfigured {
            return "\(name)（\(model.settings.host):\(model.settings.port)）"
        }
        if model.settings.isConfigured {
            return "\(model.settings.host):\(model.settings.port)"
        }
        return model.isDiscovering ? "正在自动发现…" : "未配置"
    }

    // MARK: - 录音行

    private func recordingRow(_ recording: PhoneRecording) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(recording.name)
                .font(.headline)
            HStack(spacing: 10) {
                Text(recording.recordedAt, format: .dateTime.month().day().hour().minute().second())
                Text(recording.durationText)
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            HStack(spacing: 5) {
                Image(systemName: recording.uploadState.systemImage)
                Text(recording.uploadState.label)
                    .lineLimit(2)
                if case .failed = recording.uploadState, recording.attempts > 1 {
                    Text("（已重试 \(recording.attempts) 次）")
                }
            }
            .font(.caption)
            .foregroundStyle(uploadColor(recording.uploadState))
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
        .contextMenu {
            Button {
                model.retry(recording)
            } label: {
                Label("重新上传", systemImage: "arrow.clockwise")
            }
            Button(role: .destructive) {
                model.delete(recording)
            } label: {
                Label("删除", systemImage: "trash")
            }
        }
    }

    private func uploadColor(_ state: PhoneRecording.UploadState) -> Color {
        switch state {
        case .uploaded: return .green
        case .uploading: return .blue
        case .failed: return .red
        case .pending: return .secondary
        }
    }
}

#Preview {
    PhoneContentView()
        .environmentObject(PhoneAppModel())
}
