import SwiftUI

@main
struct DSHRecordingPhoneApp: App {
    @StateObject private var model = PhoneAppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            PhoneContentView()
                .environmentObject(model)
                .task {
                    model.start()
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        model.reload()
                        model.retryPendingUploads()
                    }
                }
        }
    }
}
