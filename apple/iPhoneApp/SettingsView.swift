import SwiftUI

struct SettingsView: View {
    @ObservedObject var settings: UploadSettings
    @EnvironmentObject private var model: PhoneAppModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("电脑 IP 或主机名", text: $settings.host)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    TextField("端口", text: $settings.port)
                        .keyboardType(.numberPad)
                    SecureField("导入 Token", text: $settings.token)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("电脑")
                } footer: {
                    Text("同一条 Wi-Fi 下，电脑端开启「手表导入」后会广播信标，App 会自动填好以上三项；也可以手工输入。Token 可在电脑端 DSH 录音面板的手表导入设置中复制。")
                }

                Section {
                    Toggle("通过 UDP 信标自动填写", isOn: $settings.autoDiscover)
                    if let name = settings.computerName {
                        LabeledContent("已发现电脑", value: name)
                    }
                    if let date = settings.lastDiscoveredAt {
                        LabeledContent("最近发现", value: date.formatted(date: .omitted, time: .standard))
                    }
                    if let error = model.discoveryError {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.orange)
                    }
                } header: {
                    Text("自动发现（UDP 47832）")
                }

                Section {
                    Button("测试连接") {
                        model.testConnection()
                    }
                    if let result = model.pingResult {
                        Text(result)
                            .font(.footnote)
                            .foregroundStyle(result.hasPrefix("已连接") ? .green : .secondary)
                    }
                } header: {
                    Text("连接测试")
                } footer: {
                    Text("访问局域网需要允许「本地网络」权限，首次连接时系统会询问。")
                }

                Section {
                    Button("立即上传全部待发送") {
                        model.retryPendingUploads()
                    }
                    .disabled(model.pendingCount == 0 || !settings.isConfigured)
                } footer: {
                    Text("上传失败会自动排队重试；保持 App 在前台并连接同一 Wi-Fi 成功率最高。")
                }
            }
            .navigationTitle("设置")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    SettingsView(settings: UploadSettings())
        .environmentObject(PhoneAppModel())
}
