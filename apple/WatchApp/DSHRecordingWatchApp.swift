import SwiftUI

@main
struct DSHRecordingWatchApp: App {
    @StateObject private var model = WatchRecorderModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ContentView()
            }
            .environmentObject(model)
            .onOpenURL { url in
                // 表盘 complication 的 widgetURL(dshrec://record)。
                model.handleIncomingURL(url)
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active {
                    model.handleSceneActive()
                }
            }
        }
    }
}
