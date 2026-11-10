# 架构

## 目标

把安克录音豆（soundcore Work / D3200）与 Apple Watch 录下的声音汇入电脑，在 DSH Web 面板中管理、转录成 Markdown，并可被 `@` 直接引用为任意会话的上下文。

## 组成

```
┌────────────────────────────────────────────────────────────┐
│ DSH Desktop（macOS）                                        │
│  plugin/client.js                                          │
│   ├─ 录音库 / 转录文本查看器 / 原生蓝牙连接                  │
│   ├─ 设置（ASR 提供方、存储目录、手表导入地址）              │
│   ├─ 原生 CoreBluetooth 桥 ⇄ 安克录音豆 D3200                │
│   └─ 手表导入信息（局域网 URL / token / UDP 发现）           │
└───────────────┬────────────────────────────────────────────┘
                │ 同源 HTTP /api/recording/*
┌───────────────▼────────────────────────────────────────────┐
│ DSH Host 插件（plugin/index.js）                            │
│   ├─ 录音库存储 ~/Documents/DSH-Recordings/                 │
│   ├─ 转录任务队列（Apple Speech / OpenAI 兼容 ASR）          │
│   ├─ @ 文件候选注入（包一层 ctx.fileReferences.list）        │
│   ├─ Agent 工具 recording_library + 系统提示                  │
│   └─ 手表导入服务 0.0.0.0:47831 + UDP 信标 :47832            │
└───────────────┬────────────────────────────────────────────┘
                │ 局域网 HTTP（token 鉴权）
┌───────────────▼────────────────────────────────────────────┐
│ iPhone 伴侣 App（apple/iPhoneApp）                          │
│   ├─ WatchConnectivity 接收手表录音                          │
│   ├─ UDP 监听 DSH 信标，自动发现电脑                         │
│   └─ 上传 m4a 到 DSH 导入服务                                │
└───────────────┬────────────────────────────────────────────┘
                │ WatchConnectivity transferFile
┌───────────────▼────────────────────────────────────────────┐
│ Apple Watch App（apple/WatchApp）                           │
│   ├─ 一键录音（表盘 complication / App Intent）              │
│   ├─ 本地暂存 m4a，列表与播放                                │
│   └─ 回连 iPhone 后自动排队发送                              │
└────────────────────────────────────────────────────────────┘
```

## 数据根目录

默认 `~/Documents/DSH-Recordings`，可在插件配置 `storageDir` 修改：

```
DSH-Recordings/
  audio/          # 音频原件，文件名 `<id>.<ext>`
  transcripts/    # 转录 Markdown，文件名 `<id>.md`
  index.json      # 录音元数据、手表 token
  bin/            # 按需编译的 Apple Speech 助手
```

`transcripts/` 下的每个 Markdown 都是自包含的：头部 frontmatter 记录标题、时间、来源、音频绝对路径、ASR 提供方与语言，正文是转录文本。DSH `read` 工具可直接读取。

## 关键取舍

- **BLE 默认原生**：macOS 上 Host 按需编译并调用 `native/d3200_helper.swift`（CoreBluetooth），完成扫描/连接/ECDH/AES-CTR/导出；Client 面板通过 `/api/recording/device/*` 调用它，所以在 DSH 桌面（Electron）里也能直接连录音豆。音频由 Host 封装 Ogg 并入库，不需要浏览器、扩展或外部程序。当前版本的原生桥仅支持 macOS。
- **手表不直连电脑**：watchOS 没有稳定的电脑直连文件通道，因此手表 → iPhone（WatchConnectivity）→ 电脑局域网 HTTP 是唯一可靠链路。电脑端同时接受手工地址。
- **ASR 可替换**：`apple` 使用 macOS 自带 Speech 框架（本机离线、不联网）；`openai` 兼容 OpenAI/SiliconFlow 等 `/audio/transcriptions` 接口；`none` 只保存录音。
- **`@` 注入不改 DSH**：不修改 DSH 源码，只扩展已安装的 `ctx.fileReferences` 服务，把录音转录文件追加到候选列表最前面；选择后插入绝对路径，`read` 工具可读。

## 模块

| 目录 | 职责 |
|---|---|
| `plugin/` | DSH 插件：Host 半、Client 半、Apple Speech 助手、测试 |
| `apple/` | Xcode 工程：watchOS App、表盘 complication、iPhone 伴侣 App |
| `docs/` | 架构、接口契约、D3200 协议摘要、[验证记录](verification.md) |
| `references/` | 两个参考开源项目（仅本地研究用，不随仓库分发） |
