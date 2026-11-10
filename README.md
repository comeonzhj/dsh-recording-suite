# DSH Recording Suite

将 **soundcore Work（安克录音豆 D3200）** 和 **Apple Watch** 的录音导入 DeepSeek Harness（DSH），在 DSH 面板里管理、播放、转录为本地 Markdown，并能用 `@` 直接引用转录文本作为任意会话的上下文。

当前状态：录音豆原生蓝牙支持 **macOS**；iOS / watchOS 伴侣 App 提供 Watch 录音与局域网上传。非 macOS 的录音豆连接尚需平台适配。

## 功能

- **录音豆 D3200**：在 DSH 桌面内直接扫描、连接、读取设备信息/电量/文件列表，导出并本地解密录音，无需浏览器蓝牙选择器或外部程序。
- **Apple Watch**：表盘 complication / Smart Stack 一键录音，手表本地暂存，经 iPhone 伴侣 App 通过局域网自动发现电脑并上传。
- **本地录音库**：默认 `~/Documents/DSH-Recordings`，音频与转录 Markdown 都保存在本机。
- **转录**：macOS 自带 Speech（离线）或任意 OpenAI 兼容 ASR；转录任务串行执行，支持进度。
- **Agent 上下文**：`@` 菜单固定列出转录文件；空库时显示固定转录目录。选中后为绝对路径，模型可直接用 `read` 读取。
- **DSH 原生集成**：侧边栏面板、`recording_library` Agent 工具、系统提示段，不修改 DSH 源码。

## 架构

```
DSH 面板 (plugin/client.js)
  │ 同源 HTTP /api/recording/*
  ▼
DSH Host 插件 (plugin/index.js + plugin/host/)
  ├─ 录音库 + 转录队列 + SSE
  ├─ 原生蓝牙桥 ⇄ Swift CoreBluetooth 助手 ⇄ D3200
  ├─ 局域网导入服务 47831 + UDP 信标 47832
  └─ @ 文件候选注入 + recording_library 工具
        ▲
        │ 局域网 HTTP（Bearer token）
  iPhone 伴侣 App ──WatchConnectivity── Apple Watch App
```

详细设计见 [docs/architecture.md](docs/architecture.md)，HTTP / 蓝牙 / 上传接口见 [docs/api-contract.md](docs/api-contract.md)，D3200 协议摘要见 [docs/d3200.md](docs/d3200.md)。

## 环境要求

- **DSH Desktop**（macOS；本仓库的录音豆原生桥依赖 macOS CoreBluetooth）。
- **Xcode / Command Line Tools**：首次连接录音豆时，Host 会用 `xcrun swiftc` 编译 `plugin/native/d3200_helper.swift` 到 `~/Documents/DSH-Recordings/bin/`。只装 Command Line Tools 即可；没有 Xcode 完整 App 也可以。
- 运行测试 / 重新构建 Client 需要 Node.js 20+。
- 构建 Apple 伴侣 App 需要 Xcode 和对应的 Apple 开发者签名。

## 安装 DSH 插件

```bash
git clone https://github.com/comeonzhj/dsh-recording-suite.git
cd dsh-recording-suite
```

在 DSH 会话中安装本地 bundle（target 必须是 `plugin/` 的**绝对路径**）：

```text
plugin_manager install_bundle target=/absolute/path/to/dsh-recording-suite/plugin
```

安装后刷新 DSH Web 页面；左侧栏应出现「录音套件」入口。插件包名为 `@local/dsh-recording-suite`，详情见 [plugin/README.md](plugin/README.md)。

> DSH 本地开发安装使用 `plugin_manager`；该工具会读写当前 DSH profile，不会修改本仓库。

## 快速使用

### 录音豆（macOS）

1. 打开「录音套件」→「录音豆」；
2. 点击「连接设备」。首次会触发一次 Swift 助手编译（几秒）和 macOS 蓝牙权限提示；
3. 读取到录音列表后，选中文件点「导入」；导入会完成设备导出、ECDH/AES-CTR 解密、Ogg/Opus 封装和入库；
4. 可在同一页开始/暂停录音、删除设备上的文件；
5. 打开「设置」选择 ASR（`apple` / `openai` / `none`）并在录音详情点「转录」。

如果蓝牙权限被拒绝：系统设置 → 隐私与安全性 → 蓝牙 → 允许 DSH（或启动 DSH 的终端）。录音豆不要同时被飞书 App 或手机占用。

### Apple Watch + iPhone

1. 用 Xcode 打开 [`apple/DSHRecording.xcodeproj`](apple/DSHRecording.xcodeproj)；
2. 在三个 target 的 **Signing & Capabilities** 选择你自己的开发团队，设置唯一 Bundle ID（如果保持默认 `com.local.dshrecording`，需要同步修改 watch 的 `WKCompanionAppBundleIdentifier` 与 widget 的 bundle id）；
3. **先把 `DSHRecordingWatch` scheme 跑到 Apple Watch 真机**，让 Xcode 生成 watchOS provisioning profile 并完成一次 Watch 安装；
4. 再把 `DSHRecordingPhone` scheme 跑到 iPhone；之后在 iPhone 的「Watch」App 里安装/更新手表 App 也能正常工作。

详细步骤、表盘添加与故障排查见 [apple/README.md](apple/README.md)。

### 把转录作为上下文

在任意会话输入 `@`，候选顶部会出现最近转录文件；空库时显示固定目录 `~/Documents/DSH-Recordings/transcripts/`。选中后即插入绝对路径，DSH 的 `read` 工具可直接读取。

## 开发

```bash
# Host + Client 单元测试
node --test plugin/test/*.test.mjs

# 修改 client/src-client 后重新生成 plugin/client.js
# 任选一种安装 esbuild 的方式：
npm install --no-save esbuild
# 或：pnpm add -D esbuild
# 或：ESBUILD_BIN=/path/to/esbuild node plugin/scripts/build-client.mjs
node plugin/scripts/build-client.mjs

# Swift 助手可单独编译/扫描（需要录音豆附近）
xcrun swiftc -O -parse-as-library -o /tmp/d3200_helper \
  plugin/native/d3200_helper.swift \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist \
  -Xlinker plugin/native/d3200_helper_info.plist
/tmp/d3200_helper scan --timeout 5
```

Apple 工程：修改 [`apple/project.yml`](apple/project.yml) 后跑 `cd apple && xcodegen generate`；只构建/运行则直接打开已提交的 `.xcodeproj`。完整的 Apple 构建命令见 [apple/README.md](apple/README.md)。

测试日期与真机验证记录见 [docs/verification.md](docs/verification.md)。注意：验证记录中的设备标识与测试数据均已脱敏。

## 目录

| 路径 | 内容 |
|---|---|
| [`plugin/`](plugin/README.md) | DSH bundle：Host（存储/ASR/HTTP/原生蓝牙/`@`/工具）+ Client（面板） |
| [`apple/`](apple/README.md) | watchOS App、表盘 widget、iPhone 伴侣 App |
| [`docs/`](docs/architecture.md) | 架构、接口契约、D3200 协议摘要、验证记录 |

## 隐私与密钥

- 录音、转录文本、设备 token 都在本机 `~/Documents/DSH-Recordings`；插件不上传遥测。
- Apple Speech 在本机离线执行；OpenAI 兼容 ASR 只会在你主动转录时把音频发送到你配置的服务商。
- ASR API Key 保存在本机 DSH 插件配置中，不写入源码；不要提交包含真实 Key 的 profile 配置。
- iPhone 与电脑只在同一局域网内通信；手表导入服务使用 Bearer token，可在面板轮换。

## 致谢

本项目的协议研究和早期思路得益于以下公开项目。**本仓库不包含它们的源代码**；Ogg/Opus 封装与 CoreBluetooth 助手均为本仓库独立实现，仅参考了公开协议事实：

- [Shawn-TKD/recording-bean-web](https://github.com/Shawn-TKD/recording-bean-web)（MIT）——D3200 浏览器端协议、解密与交互参考。
- [tacshi/Soundcore](https://github.com/tacshi/Soundcore)——D3200 协议逆向资料（社区项目未附许可证，因此本项目只参考公开互操作信息，不复制其代码）。

也感谢 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供插件运行时与 Web UI。

## License

MIT，见 [LICENSE](LICENSE)。
