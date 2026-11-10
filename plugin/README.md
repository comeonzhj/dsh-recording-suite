# DSH 录音套件插件（`@local/dsh-recording-suite`）

一个 DSH bundle：Host 半负责持久化、转录、HTTP API、Agent 工具与 `@` 候选注入；浏览器半负责在 DSH Web 面板里连接安克录音豆、管理录音、查看转录与改设置。

## 负责什么

- 把录音豆（soundcore Work / D3200）与 Apple Watch 的录音导入到本地库；Apple Watch 的录音经 iPhone 伴侣上传（见 [`../apple/`](../apple/README.md)）。
- 用 macOS 自带 Speech 或 OpenAI 兼容 ASR 把录音转录成自包含 Markdown。
- 提供 `recording_library` Agent 工具（list / read / transcribe）。
- 在 `@` 文件候选菜单中固定加入最近转录文件（绝对路径），使任意工作区都能直接选择录音文本作为上下文。
- 在录音套件面板中播放、重命名、删除、重转录。

不负责：D3200 的 OTA / 解绑 / Wi-Fi 快速导出；手表端的录音与 iOS 上传实现；修改 DSH 源码。

## 公开接口

### Host HTTP API

同源，前缀 `/api/recording`；完整字段见 [`../docs/api-contract.md`](../docs/api-contract.md)。

| 方法与路径 | 用途 |
|---|---|
| `GET /status` | 版本、存储目录、ASR 状态、手表导入地址/token、Apple Speech 可用性 |
| `GET /list` | 录音列表 |
| `POST /import` | base64 音频导入（浏览器导出后） |
| `POST /import-file` | multipart 本地文件导入（兜底） |
| `POST /transcribe` | 排队转录，返回 `jobId` |
| `GET /jobs?id=` | 查询任务 |
| `GET /transcript?id=` | 读取 Markdown 与正文 |
| `GET /audio?id=` | 音频字节流（支持 Range） |
| `PATCH /:id` / `DELETE /:id` | 重命名 / 删除 |
| `GET`/`POST /config` | 读取 / 保存 ASR、语言、存储目录、手表端口 |
| `GET /events` | SSE：录音变化与任务进度 |
| `POST /watch/rotate-token` | 轮换手表上传 token |

局域网手表导入服务（独立端口 47831，token 鉴权）与 UDP 47832 信标见契约第 3 节。

### Client 注册

- `main`（key `recording-suite`）：侧边栏面板。
- `sidebar.panellist`（id `recording-suite`，order 30）：面板图标与入口。
- `@` 注入：不新增 UI 注册，只包装现有 `ctx.fileReferences.list`，退出时还原。

### Agent 工具

`recording_library({ action: 'list' | 'read' | 'transcribe', id?, query?, limit?, language? })`，返回 JSON；同时向系统提示加入「录音库」说明段。

## 依赖

- DSH 服务：`webServer`、`tools`、`systemPrompt`、`fileReferences`、`workingDirectory`、`configEditor`（可选）。
- 系统：macOS；Apple Speech 需要 Xcode Command Line Tools 与「语音识别」权限；`afconvert` 用于转 16k WAV。
- macOS 原生蓝牙（CoreBluetooth，经 `native/d3200_helper.swift`）。当前版本仅 macOS 支持录音豆连接。

## 关键约定

- Host 代码只能 `import 'node:...'`。DSH 服务通过 `ctx.get`/`ctx.inject` 获取，不能 import `@deepseek-ai/*`（profile 中从本包路径不可解析）。
- 数据根目录默认 `~/Documents/DSH-Recordings/{audio,transcripts,index.json,bin}`，可用 `storageDir` 改。
- 转录文件命名 `<id>.md`，frontmatter 记录标题、时间、来源、音频绝对路径、ASR 提供方与语言；正文为转录文本。
- 删除录音时先取消该录音正在跑的任务；转录队列串行。
- 插件不读写 profile 的 `cordis.patch.yml`；配置保存走 `configEditor`。
- `@` 候选选择后是绝对路径，由 DSH 的 `read` 工具读取；不在选择时读取文件内容。

## 安装 / 开发

```bash
# 在 DSH 会话里安装（target 指向本目录绝对路径）
# plugin_manager install_bundle

# Client bundle 构建
node scripts/build-client.mjs
node --check client.js

# Host + Client 测试
node --test test/*.test.mjs
```

安装或替换本 bundle 后，如浏览器面板仍是旧版本，刷新 DSH Web 页面。

## 已知限制

- 同一录音豆不能同时被飞书 App 占用。DSH 桌面使用原生蓝牙桥，不依赖浏览器设备选择器。
- Apple Speech 的 TCC 授权无法在 Host 内静默探测；第一次转录会触发系统提示，拒绝后需在系统设置里恢复。
- OpenAI 兼容 ASR 需要用户自备 API Key；Key 保存在 DSH 插件配置中（不是钥匙串）。
- `@` 注入是宿主服务原型包装，若 DSH 大版本改变 `fileReferences` 服务实现，需要重新验证。
- 手表上传服务监听 `0.0.0.0`，仅用 Bearer token 保护；请只在可信局域网使用，并在不需要时关闭「手表导入」。
- 多次热重载插件而 DSH 未重启时，上一代 Host 可能短暂占用手表端口；服务会重试绑定并显示 `watchImport.error`，重启 DSH 后恢复。
