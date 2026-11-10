import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: WatchRecorderModel
    @State private var pendingDelete: WatchRecordingItem?

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                statusHeader
                recordButton
                if let banner = model.banner {
                    Text(banner)
                        .font(.system(size: 11))
                        .foregroundStyle(.orange)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 2)
                }
                recordingList
            }
            .padding(.horizontal, 2)
            .padding(.bottom, 8)
        }
        .navigationTitle("DSH 录音")
        .confirmationDialog(
            "删除这条录音？",
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            ),
            presenting: pendingDelete
        ) { item in
            Button("删除", role: .destructive) {
                model.delete(item)
                pendingDelete = nil
            }
            Button("取消", role: .cancel) { pendingDelete = nil }
        } message: { item in
            Text(item.name)
        }
    }

    private var statusHeader: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Circle()
                    .fill(model.companionReady ? Color.green : Color.orange)
                    .frame(width: 6, height: 6)
                Text(model.companionStatusText)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var recordButton: some View {
        VStack(spacing: 6) {
            Button {
                model.toggleRecording()
            } label: {
                ZStack {
                    Circle()
                        .fill(model.isRecording ? Color.red : Color.accentColor)
                        .frame(width: 92, height: 92)
                    Image(systemName: model.isRecording ? "stop.fill" : "mic.fill")
                        .font(.system(size: 34, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(model.isRecording ? "停止录音" : "开始录音")

            Text(model.isRecording ? "录音中 \(model.elapsedText)" : "点按开始录音")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(model.isRecording ? .red : .secondary)
        }
        .padding(.top, 2)
    }

    private var recordingList: some View {
        VStack(alignment: .leading, spacing: 4) {
            if model.recordings.isEmpty {
                Text("还没有录音。录完点停止，手表会自动尝试发送到 iPhone。")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 4)
            } else {
                Text("录音 \(model.recordings.count) 条")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                ForEach(model.recordings) { item in
                    recordingRow(item)
                }
            }
        }
    }

    private func recordingRow(_ item: WatchRecordingItem) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 6) {
                Button {
                    model.togglePlayback(item)
                } label: {
                    Image(systemName: model.playingID == item.id ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 20))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(model.playingID == item.id ? "暂停播放" : "播放")

                VStack(alignment: .leading, spacing: 1) {
                    Text(item.name)
                        .font(.system(size: 11, weight: .medium))
                        .lineLimit(1)
                    Text(item.durationText)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
            HStack(spacing: 3) {
                Image(systemName: item.transferState.systemImage)
                Text(item.transferState.label)
                    .lineLimit(1)
            }
            .font(.system(size: 9))
            .foregroundStyle(item.transferState == .sent ? Color.green : Color.secondary)
        }
        .padding(6)
        .background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
        .swipeActions {
            Button(role: .destructive) {
                pendingDelete = item
            } label: {
                Label("删除", systemImage: "trash")
            }
            if item.transferState != .sent {
                Button {
                    model.send(item)
                } label: {
                    Label("重发", systemImage: "arrow.up.circle")
                }
                .tint(.blue)
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchRecorderModel())
}
