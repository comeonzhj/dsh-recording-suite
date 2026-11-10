# 2026-11-10

- 修复：Watch App 的音频后台模式改用系统规定的 `UIBackgroundModes = audio`。

- 修复：Watch App 工程最低系统版本恢复到 11.0，两个 watch target 在 XcodeGen 中显式锁定最低版本。
- 修复：安装诊断脚本移除对 iOS profile 的误判，增加签名完整性、有效期、应用标识、团队及可选 Watch UDID/系统版本检查。
- 变更：更正手表安装失败的既有签名结论，记录真机签名构建的检查范围，并补充 Device Hub 配对、TestFlight 内部测试与 Ad Hoc 分发路径。

- 新增：iPhone 与 Apple Watch 统一的“鲸鱼 + 连接 + 录音”App 图标，提供两端 1024 × 1024 不透明 PNG 与 AppIcon 资源目录。
- 变更：XcodeGen 配置与已提交工程接入 AppIcon；README 补充设计含义、资源位置及验证记录。

# 2026-11-09

## 修复（2026-11-10）

- 修复：watch App 嵌入 iPhone 时改为 `codeSign: true`；明确 watch target 使用 `application`（单 target watchOS App）而不是 `watchapp2`（后者需要 WatchKit extension，会在 Xcode 27 触发重复输出）。
- 新增：`scripts/check-watch-profile.sh` 检查嵌入的 watch App/Widget 是否携带 watchOS provisioning profile；README 增加「安装转圈后回退」的签名根因与修复步骤。

- 修复：仓库现在提交可直接打开的 `DSHRecording.xcodeproj`；之前只提交 `project.yml`，Xcode 打开 `apple/` 文件夹或单个 Swift 文件不会得到可运行工程。
- 变更：配置自动签名；首次打开工程时选择你自己的 Team。实机签名构建已在开发机验证通过（含 watch app 嵌入与签名）。
- 变更：README 明确「打开 `.xcodeproj`，不是打开文件夹/单个文件」，并补充真机安装步骤与 `-allowProvisioningUpdates` 命令。


## 新增

- watchOS App `DSHRecordingWatch`：AVAudioRecorder 录制 m4a 到 `Documents/Recordings`，开始/停止、录音列表、播放、删除、重发；`Documents` 内文件按 `watch-yyyyMMdd-HHmmss-xxxx` 命名。
- 一键录音入口：注册 `dshrec://` scheme，App 的 `onOpenURL` 处理 `dshrec://record` 并自动开始录音；麦克风权限未开时给出可操作的中文提示。
- watchOS Widget Extension `DSHRecordingWatchWidgets`：`accessoryCircular` / `accessoryRectangular` / `accessoryInline` complication，`widgetURL(dshrec://record)`，支持表盘与 Smart Stack。
- WatchConnectivity 发送：录音完成后 `transferFile` + metadata（recordingID/name/recordedAt/durationMs/format），处理 not activated / unreachable 状态，回到前台自动重新激活并补发；已发送 id 持久化避免重复发送。
- iOS App `DSHRecordingPhone`：接收手表文件（回调内同步落盘避免临时文件被清理）、本地录音列表与上传状态、失败自动重试队列（指数退避上限 5 分钟）、设置页手填地址/端口/Token 与连接测试。
- UDP 信标发现：监听 `47832`，解析 `{service:"dsh-recording",version:1,port,token,name}`，并用数据报来源地址自动填入电脑 IP/端口/Token。
- HTTP 上传：`POST /api/watch/upload?name=&recordedAt=&durationMs=&format=m4a`，`Authorization: Bearer <token>`，body 为 m4a 原始字节；解析 `{recording:{...}}` 响应。
- xcodegen `project.yml` 生成含 3 个 target 的工程；iPhone App 嵌入 watch App（`Watch/`），watch App 嵌入 widget extension（`PlugIns/`）；Bundle id 与 `WKCompanionAppBundleIdentifier` 按约定配置。
- Info.plist：iPhone 增加 `NSLocalNetworkUsageDescription` 与本地 HTTP 的 ATS 例外（`NSAllowsArbitraryLoads` / `NSAllowsLocalNetworking`）；watch 增加 `NSMicrophoneUsageDescription`、`WKApplication`、`CFBundleURLTypes`。
- README：签名/配对/真机安装、表盘与 Smart Stack、上传流程、构建命令与结果、模拟器验证记录、未验证项。
- `.gitignore`：忽略 `apple/.build/`、`.build-dest/`、`DerivedData/` 等构建产物。
