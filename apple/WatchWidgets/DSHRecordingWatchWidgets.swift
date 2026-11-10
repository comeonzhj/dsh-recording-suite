import SwiftUI
import WidgetKit

/// 表盘 complication：点按后打开 App 并自动开始录音。
/// widgetURL 使用 dshrec://record，由 Watch App 的 onOpenURL 处理。

private let recordURL = URL(string: "dshrec://record")!

struct RecordEntry: TimelineEntry {
    let date: Date
}

struct RecordTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecordEntry {
        RecordEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (RecordEntry) -> Void) {
        completion(RecordEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecordEntry>) -> Void) {
        let now = Date()
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
        completion(Timeline(entries: [RecordEntry(date: now)], policy: .after(next)))
    }
}

struct RecordWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: RecordEntry

    var body: some View {
        content
            .widgetURL(recordURL)
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                #if os(watchOS)
                AccessoryWidgetBackground()
                #else
                Color.clear
                #endif
                VStack(spacing: 0) {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 19, weight: .semibold))
                    Text("录音")
                        .font(.system(size: 8, weight: .semibold))
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 6) {
                Image(systemName: "mic.circle.fill")
                    .font(.system(size: 24))
                VStack(alignment: .leading, spacing: 1) {
                    Text("DSH 录音")
                        .font(.system(size: 13, weight: .semibold))
                    Text("点按直接开始录音")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
        case .accessoryInline:
            Label("点按开始录音", systemImage: "mic.fill")
        default:
            VStack(spacing: 6) {
                Image(systemName: "mic.circle.fill")
                    .font(.system(size: 30))
                Text("点按开始录音")
                    .font(.system(size: 12, weight: .medium))
            }
        }
    }
}

struct DSHRecordWidget: Widget {
    private let kind = "DSHRecordWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecordTimelineProvider()) { entry in
            RecordWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color.clear
                }
        }
        .configurationDisplayName("一键录音")
        .description("点按表盘上的麦克风，直接打开 DSH 录音并开始录。")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

@main
struct DSHRecordingWidgetsBundle: WidgetBundle {
    var body: some Widget {
        DSHRecordWidget()
    }
}
