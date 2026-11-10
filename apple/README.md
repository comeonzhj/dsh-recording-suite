# Apple 伴侣（watchOS / iOS）

手表一键录音、表盘入口、经 iPhone 上传到电脑的 DSH 录音库。

- **负责**：watchOS App（录音、播放、本地列表、WatchConnectivity 发送）、watchOS Widget Extension（表盘 complication / Smart Stack 入口）、iPhone App（接收手表文件、UDP 发现电脑、HTTP 上传与重试、设置页）。
- **不负责**：电脑端导入服务与 UDP 信标本身（在 `plugin/`，接口见 [接口契约第 3 节](../docs/api-contract.md)）、转录、D3200 蓝牙协议、DSH 面板界面。
- **依赖**：只用系统框架（SwiftUI、AVFAudio、WatchConnectivity、WidgetKit、Network/BSD socket 走 Darwin），没有第三方包。

## 目录与 target

Xcode 工程已随仓库提交：[`DSHRecording.xcodeproj`](DSHRecording.xcodeproj)。**用 Xcode 直接打开这个 `.xcodeproj`**（不是打开 `apple/` 文件夹、也不是打开单个 `.swift`/`Info.plist`）；工程里包含 3 个 target 和 2 个共享 scheme。修改 `project.yml` 后可执行 `xcodegen generate` 重新生成。

| Target | 平台 | Bundle id | 说明 |
|---|---|---|---|
| `DSHRecordingWatch` | watchOS 11.0+ | `com.local.dshrecording.watchkitapp` | 录音 App；Info.plist 里 `WKCompanionAppBundleIdentifier = com.local.dshrecording`，并注册 `dshrec://` scheme |
| `DSHRecordingWatchWidgets` | watchOS 11.0+ | `com.local.dshrecording.watchkitapp.widgets` | WidgetKit 扩展，`accessoryCircular / accessoryRectangular / accessoryInline`，`widgetURL(dshrec://record)`；嵌在 watch App 的 `PlugIns/` |
| `DSHRecordingPhone` | iOS 17.0+ | `com.local.dshrecording` | iPhone 伴侣 App；watch App 嵌在 `DSHRecordingPhone.app/Watch/`（Embed Watch Content） |

源码布局：

```
apple/
  project.yml                       xcodegen 配置（3 个 target + 2 个 scheme）
  Shared/RecordingSupport.swift     两端共用：文件名/id/标题/ISO8601/时长格式
  WatchApp/                         录音 App
    DSHRecordingWatchApp.swift      @main，处理 onOpenURL / scenePhase
    ContentView.swift               录音按钮、状态、列表、播放、删除、重发
    WatchRecorderModel.swift        AVAudioRecorder / AVAudioPlayer / 发送队列
    PhoneLink.swift                 WatchConnectivity transferFile + 状态
    WatchRecordingItem.swift        列表模型
  WatchWidgets/                     表盘 complication
  iPhoneApp/                        伴侣 App
    DSHRecordingPhoneApp.swift
    PhoneContentView.swift          连接状态、录音列表、上传状态
    SettingsView.swift              手填地址/Token、自动发现、测试连接
    PhoneAppModel.swift             总控：接收、发现、上传队列/重试
    WatchConnectivityReceiver.swift WCSession 接收文件
    BeaconDiscovery.swift           UDP 47832 监听 + 来源 IP
    UploadService.swift             POST /api/watch/upload、GET /api/watch/ping
    UploadSettings.swift            地址/端口/Token 持久化
    PhoneRecordingStore.swift       Documents/Recordings + .json 旁车 + 上传状态
```

## 用 Xcode 打开、装到真机

1. 双击/打开 `apple/DSHRecording.xcodeproj`，左侧 Project navigator 能看到 `DSHRecordingWatch`、`DSHRecordingWatchWidgets`、`DSHRecordingPhone` 三个 target。
2. 首次打开时，在 Xcode → Settings → Accounts 登录你的 Apple ID，并逐个 target 在 Signing & Capabilities 选择你自己的 Team；`DEVELOPMENT_TEAM` 留空，由 Xcode 自动填写。Bundle Identifier 可保持默认，或换成你自己的唯一前缀；换前缀时同步修改 watch 的 `WKCompanionAppBundleIdentifier` 与 widget bundle id 对应关系。
3. 选 `DSHRecordingPhone` scheme + iPhone 真机 Run，可通过 iPhone 的「Watch」App 安装嵌入的手表 App。开发签名需要覆盖实际手表的 UDID；直接调试手表需要先在 Device Hub 完成配对。安装失败时按[安装诊断与测试路径](#安装诊断与测试路径)检查。
4. 若要构建归档：Product → Archive；证书/描述文件由 Xcode 自动管理。本机已实测以下真机签名构建成功（包括 watch app 嵌入与签名）：

```bash
xcodebuild -project DSHRecording.xcodeproj -scheme DSHRecordingPhone \
  -destination 'generic/platform=iOS' -configuration Debug \
  -allowProvisioningUpdates build
# => ** BUILD SUCCEEDED **
```

## 构建（已实际执行）

环境：macOS 27.0.1、Xcode 27.2、Swift 6.4、xcodegen 2.44.1、watchOS 26.2 / iOS 26.2 simulator runtime。工程用 `SWIFT_VERSION = 5.0`。

```bash
cd apple
# 可选：只有改了 project.yml 才需要重新生成；仓库已带 xcodeproj
xcodegen generate

# watchOS App（会连带构建并嵌入 widget extension）
xcodebuild -project DSHRecording.xcodeproj -scheme DSHRecordingWatch \
  -sdk watchsimulator -configuration Debug -derivedDataPath .build \
  CODE_SIGNING_ALLOWED=NO build
# => ** BUILD SUCCEEDED **（exit 0；仅有 Xcode 的 "no AppIntents.framework dependency" 元数据提示）

# iPhone App（会连带构建并嵌入 watch App）
xcodebuild -project DSHRecording.xcodeproj -scheme DSHRecordingPhone \
  -sdk iphonesimulator -configuration Debug -derivedDataPath .build \
  CODE_SIGNING_ALLOWED=NO build
# => ** BUILD SUCCEEDED **（exit 0；同样的 AppIntents 元数据提示）
```

**关于 `-sdk iphonesimulator`**：命令行 `-sdk` 会作用于整个构建图，因此上面第二条命令里被嵌入的 watch target 也会用 iOS SDK 编译，产物只适合当作编译验收；直接把它装进 iPhone 模拟器会被拒绝（`WatchKit 2.0 app's UIDeviceFamily ...`）。要在模拟器运行或做真机/归档构建，用 destination 让每个 target 各自选择 SDK：

```bash
# 模拟器运行用（watch App 会按 watchsimulator SDK 正确构建）
xcodebuild -project DSHRecording.xcodeproj -scheme DSHRecordingPhone \
  -destination 'generic/platform=iOS Simulator' -configuration Debug \
  -derivedDataPath .build-dest CODE_SIGNING_ALLOWED=NO build

# 真机（需先配置签名）
xcodebuild -project DSHRecording.xcodeproj -scheme DSHRecordingPhone \
  -destination 'generic/platform=iOS' -configuration Release build
```

第二条 `-destination` 命令也已实际执行通过，产物中 `DSHRecordingWatch.app` 的 LC_BUILD_VERSION 为 `WATCHOSSIMULATOR`、`DSHRecordingPhone.app/Watch/` 下包含 watch App 及其 `PlugIns/DSHRecordingWatchWidgets.appex`。

## 模拟器验证结果

已做（2026-11-09）：

- **watchOS**：`DSHRecordingWatch.app` 安装并启动于 Apple Watch Series 11 (46mm) / watchOS 26.2，界面正常渲染：标题「DSH 录音」、橙点「正在连接 iPhone…」、大麦克风按钮、「点按开始录音」、空列表中文提示。
- **iPhone**：`DSHRecordingPhone.app` 安装并启动于 iPhone 17 Pro / iOS 26.2。
- **UDP 发现**：在本机用 Node 向 `255.255.255.255:47832` 广播
  `{"service":"dsh-recording","version":1,"port":47831,"token":"EXAMPLE_TOKEN","name":"Mac 测试机"}`，
  App 自动填入 `192.0.2.10:47831`、token 与电脑名，界面从「未配置」变为「Mac 测试机 (192.0.2.10:47831)」。
- **上传**：用本机 Node 桩服务模拟 `POST /api/watch/upload`，App 发出的请求为
  `POST /api/watch/upload?name=%E6%89%8B%E8%A1%A8%E5%BD%95%E9%9F%B3%202026-11-09%2019:15:00&recordedAt=2026-11-09T11:15:00Z&durationMs=4200&format=m4a`，
  头 `Authorization: Bearer EXAMPLE_TOKEN`、`Content-Type: audio/mp4`，body 为音频原始字节；收到 `{recording:{...}}` 后列表状态变为绿色「已上传到电脑」并提示「已上传 1 条录音到电脑。」。
- **表盘深链**：watchOS 模拟器不支持 `xcrun simctl openurl`（`Operation not supported`），未能验证 `dshrec://record` 唤起；该调用链在真机/表盘上待验证。

## App 图标

iPhone 与 Apple Watch 使用统一的蓝底白鲸图标：鲸鱼呼应 DeepSeek，身体内的三段声波表达录音，青色无线符号表达手表、手机与客户端插件之间的连接同步。系统分别应用 iOS 圆角和 watchOS 圆形遮罩。

- iPhone：[`iPhoneApp/Assets.xcassets/AppIcon.appiconset`](iPhoneApp/Assets.xcassets/AppIcon.appiconset)。
- Apple Watch：[`WatchApp/Assets.xcassets/AppIcon.appiconset`](WatchApp/Assets.xcassets/AppIcon.appiconset)。
- 两端均使用不透明的 1024 × 1024 PNG，资源目录按各自平台的单尺寸 AppIcon 配置，target 显式设置 `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`。
- 图形由内置 imagegen 生成，完整提示词保存在 [`AppIcon.prompt.txt`](AppIcon.prompt.txt)。修改图形时同步更新两端 PNG。
- 已通过 iPhone scheme 的 iOS Simulator 构建验证，包含 watchOS App 与 Widget 扩展的嵌入及两端资源目录编译；设备主屏幕上的显示效果待真机确认。

## 安装诊断与测试路径

现象：iPhone App 安装成功，iPhone 的「Watch」App 里点安装后转圈，随后回到「安装」。这只能说明手表安装失败，需要结合产物与设备日志定位。

### 当前检查结果（2026-11-10）

- 本机 Xcode 27.2 能识别 USB 连接的 iPhone，未识别到实体 Apple Watch。用户手表为 Series 12 / watchOS 27.2，配对时输入密码并确认后没有完成连接。
- 检查到工作区工程的 Watch App Debug/Release 覆盖了最低版本为 27.0。现已恢复到项目约定的 11.0，并在两个 watch target 的 `project.yml` 中显式指定。用户手表 27.2 满足之前的 27.0 要求，因此这项配置差异无法解释本次失败。
- 已重新完成 iPhone scheme 的真机签名构建；嵌入的 App 与 Widget 均为 watchOS 平台、设备族 `[4]`，伴侣 Bundle ID 匹配，签名完整性、profile 有效期、application-identifier 和团队匹配检查通过。安装仍未在手表上验证。
- 修正音频后台模式配置为 `UIBackgroundModes = audio`，与 [Apple 后台音频文档](https://developer.apple.com/documentation/watchkit/playing-background-audio)保持一致；此前使用 `WKBackgroundModes`。这项修正的录音运行效果仍需真机验证，尚无设备日志证明它与安装失败相关。
- 当前两个 profile 均列出 5 个设备；缺少实际 Watch UDID，尚未核对是否包含这块手表。开发签名必须覆盖实际安装设备。
- **更正此前签名诊断**：Apple 的 [development profile 文档](https://developer.apple.com/help/account/provisioning-profiles/create-a-development-provisioning-profile/)明确将 “iOS App Development” 用于 iOS 与 watchOS。profile 名称含 `iOS` 或 Platform 缺少 `watchOS`，均不足以单独断定包无法安装。此前“必须先 Run Watch scheme 生成 watchOS profile”的结论缺少依据。

### 检查实际安装包

```bash
# 使用 -destination 构建，避免全局 -sdk 把嵌入的 watch target 编到错误平台。
xcodebuild -project DSHRecording.xcodeproj -scheme DSHRecordingPhone \
  -destination 'generic/platform=iOS' -configuration Debug \
  -derivedDataPath .build/device -allowProvisioningUpdates build

# 后两个参数可选；不知道 Watch UDID 时可传空字符串以单独检查系统版本。
./scripts/check-watch-profile.sh \
  .build/device/Build/Products/Debug-iphoneos/DSHRecordingPhone.app \
  '<Watch UDID>' '27.2'
```

脚本检查嵌入关系、平台、设备族、Mach-O 平台、最低系统版本、签名完整性、profile 有效期、应用标识与团队，以及可选的 Watch UDID。静态检查通过后仍需要设备实际安装验证。失败时使用 macOS「控制台」查看已连接 iPhone 的实时日志，在手机 Watch App 再次点安装，搜索 `com.local.dshrecording`、`installd`、`appconduit`，保留具体错误；手机侧可能只能提供部分转发信息。

### 不依赖 Mac 与手表开发配对的测试

**推荐：TestFlight 内部测试（付费 Apple Developer 账号）。**

1. 在 App Store Connect 建立 App 记录，填写名称、语言、明确的 Bundle ID 和 SKU 等必要字段；确认三个 target 的标识与签名资源匹配，Watch 伴侣 Bundle ID 同步配置。
2. Xcode 选择 `DSHRecordingPhone` + 通用 iOS 真机目标，Product → Archive；Organizer → Distribute App → TestFlight Internal Only。上传仍需通过包校验，并处理账号协议和加密合规问题。
3. 等待处理完成，在 TestFlight 中建立内部测试组，把自己的 App Store Connect 账号与 build 加入组。
4. 在配对 iPhone 上用 TestFlight 安装 iOS App，然后打开该 App 的详情，在 Information 区域安装兼容的 Apple Watch App。

内部测试无需提交正式上架审核，也无需为手表登记开发 UDID或建立 Mac 调试配对。需要保留 App 记录及上传流程，每个 build 可测试 90 天。详见 [Apple TestFlight 概览](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)、[内部测试上传教程](https://developer.apple.com/tutorials/develop-in-swift/test-your-beta-app)和 [Watch 安装说明](https://testflight.apple.com/)。

**另一条路径：注册设备分发（Ad Hoc）。** 适合已有手表 UDID 的付费账号：在 Developer 网站登记 iPhone 和 Watch，生成覆盖对应设备的分发签名，通过 Archive 导出用于注册设备的 iOS 安装包，再按 [Apple 注册设备分发文档](https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices)安装到配对 iPhone。需要同时覆盖 Watch App 和 Widget 的签名；这条路径仍需核对手表 UDID。

模拟器可以继续验证界面、录音逻辑和表盘入口；真实 WatchConnectivity 文件传输与手表后台录音需要真机完成验收。

### 继续排查 Device Hub 配对

按 [Apple 当前 Device Hub 文档](https://developer.apple.com/documentation/xcode/managing-your-simulated-and-physical-devices-in-device-hub)，打开 Xcode → Open Developer Tool → Device Hub，点击 + → Pair Nearby Device，选择 Apple Watch，再在手表端选择 Mac、输入验证码。手机和手表均需开启开发者模式，并处理两端的信任提示。

若确认后没有出现设备，先重启手表与 iPhone，再在同一普通 Wi-Fi 下重新尝试。排查 VPN、TUN 或网络过滤软件以及访客网络隔离；Apple 的 [TN3158](https://developer.apple.com/documentation/technotes/tn3158-resolving-xcode-15-device-connection-issues)记录了网络管理软件干扰设备连接的情况。配对失败本身发生在 App 启动之前，当前录音/同步业务代码没有参与此过程。

## 真机安装

1. **签名**：在 Xcode 或用命令行为三个 target 设置开发团队（`DEVELOPMENT_TEAM`）。三个 Bundle id 必须保持上面的值，否则 `WKCompanionAppBundleIdentifier` 与配对关系失效。watch App 的 `WKApplication = true`、iPhone App 的 `WKCompanion...` 关系已在 Info.plist 中配好。
2. **图标**：iPhone 与 Apple Watch 已接入统一 AppIcon，资源与设计说明见[App 图标](#app-图标)。
3. **配对**：iPhone 与 Apple Watch 正常配对；开发调试通过 Device Hub 完成 Mac 与手表配对。安装与其他测试方式见[安装诊断与测试路径](#安装诊断与测试路径)。
4. **权限**：
   - 手表首次录音时允许 **麦克风**（`NSMicrophoneUsageDescription`，中文提示“需要麦克风权限，用来把手表录下的声音保存成语音备忘录。”）。若误拒，到手表「设置 › 隐私与安全性 › 麦克风」重新允许。
   - iPhone 首次访问局域网时允许 **本地网络**（`NSLocalNetworkUsageDescription`）。拒绝后 UDP 发现和上传都会失败，只能在系统设置里重开。
5. **电脑端**：在电脑的 DSH 录音面板开启「手表导入」，确认导入端口（默认 47831）与 UDP 信标端口（47832），复制 Token；手机与电脑需在同一 Wi-Fi。

## 表盘与 Smart Stack

- 表盘：长按表盘 → 编辑 → 选择「DSH 录音」的圆形/矩形 complication → 添加。点按后 Widget 的 `widgetURL(dshrec://record)` 打开 App；App 的 `onOpenURL` 收到后自动开始录音（若麦克风权限未给则提示到设置中开启）。
- Smart Stack：在表盘上向上滑/旋转表冠打开 Smart Stack，编辑并添加「一键录音」Widget，点按同样走 `dshrec://record`。

## 上传流程

```
Watch: 停止录音 → 写入 Documents/Recordings/watch-<时间>-<随机>.m4a
      → WatchConnectivity transferFile(file, metadata {recordingID,name,recordedAt,durationMs,format})
iPhone: WCSession 收到文件（回调内立即复制）→ Documents/Recordings/<id>.m4a + <id>.json
      → UDP 47832 信标自动填入地址/Token（或设置页手填）
      → POST http://<ip>:<port>/api/watch/upload?name=&recordedAt=&durationMs=&format=m4a
        Authorization: Bearer <token>，body 为 m4a 原始字节
      → 2xx 标记「已上传」；网络/5xx 失败按 15s→30s→…（上限 5 分钟）自动重试；4xx 也会保留失败状态并继续排队
```

- 落盘不覆盖：接收端按 `recordingID` 命名，已存在时追加 `-1`、`-2`。
- 手表端「已发送」状态持久化在 UserDefaults（`watch.sentRecordingIDs`），重启不会重复发送；未发送的录音在 iPhone 可达后自动补发。
- iPhone 端上传状态持久化在 UserDefaults（`phone.uploadStates`），重启后继续重试。
- 手表的 WatchConnectivity 状态会显示为「正在连接 iPhone… / 等待 iPhone（录音已排队）/ 已连接 iPhone」；`not activated` 时不会丢文件，回到前台会重新激活并重发。

## 故障排查

| 现象 | 排查 |
|---|---|
| 手表一直「等待 iPhone」 | 确认 iPhone 已配对、iPhone App 已安装过一次、蓝牙/Wi-Fi 正常；手表和 iPhone 都打开 App 后会自动补发。 |
| 手机「未配置」且无自动发现 | 确认同一 Wi-Fi、电脑端手表导入已开启、防火墙放行 UDP 47832；也可在设置页手填地址/端口/Token。 |
| 上传 401 | Token 过期：电脑端「轮换 Token」后重新复制，或在手机上等下一次信标自动刷新；改完点「全部上传」。 |
| 上传网络错误 | 检查电脑端口 47831 是否可达、iPhone 本地网络权限、`NSAppTransportSecurity` 是否被改动（见下）。 |
| 录音无声/无法开始 | 检查手表麦克风权限；确认没有其他 App 占用麦克风。 |

## 安全与配置注意

- iPhone `Info.plist` 为局域网明文 HTTP 加了临时 ATS 例外：`NSAllowsArbitraryLoads` + `NSAllowsLocalNetworking`。IP 地址无法写进 `NSExceptionDomains`，所以只能这样放行；**正式分发前应改为 HTTPS 或移除该例外**。
- Token 存在 iPhone 的 UserDefaults（非 Keychain），仅用于局域网内上传鉴权；轮换 Token 后信标会自动带来新值。
- 手表录音只在本地；只有你点击/自动上传到电脑时才离开设备。

## 未在真机验证的项

1. 真机麦克风权限弹窗与实际录音（AVAudioRecorder / AAC m4a）。
2. 真机 WatchConnectivity `transferFile`（模拟器无法完成真实配对传输）。
3. 表盘 complication 添加、Smart Stack 添加、点按后 `dshrec://record` 唤起并自动开录（模拟器无法用 `simctl openurl` 验证深链）。
4. 真机后台录音/后台传输（手表熄屏后继续录音依赖系统调度；`UIBackgroundModes = audio` 已声明，但未实测）。
5. 真机本地网络权限弹窗与 ATS 明文放行的实际放行效果。
6. 与真实 Host 导入服务联调（Token 轮换、响应 `{recording:{...}}` 解析、重复上传时的去重策略在电脑端）。
