# Host 半（录音套件）

`plugin/host/` 是 DSH 录音套件的 Host 实现：存储、ASR 转录队列、同源 HTTP API、手表局域网上传、`@` 候选注入与 `recording_library` Agent 工具。浏览器半在 `plugin/client.js`，两者只通过 [`docs/api-contract.md`](../../docs/api-contract.md) 交互。

## 职责

负责：

- 录音库磁盘存储：`~/Documents/DSH-Recordings/{audio,transcripts,index.json,bin}`，`index.json` 原子写。
- 录音导入、列表、转录 Markdown 读写、重命名、删除。
- ASR 提供方 `apple` / `openai` / `none`，任务串行、可取消、SSE 进度。
- 同源 HTTP API `/api/recording/*`（含 SSE、Range 音频、config 保存）。
- 手表导入服务：`0.0.0.0:47831` Bearer token 上传 + UDP 47832 广播信标。
- 原生蓝牙桥（仅 macOS）：编译/调用 CoreBluetooth Swift 助手，扫描、连接、导出并解密 D3200 录音，封装成 Ogg/Opus 后直接入库。
- 包装已存在的 `ctx.fileReferences.list`，把 `transcripts/*.md` 候选排在最前，卸载时还原。
- 通过 `ctx.tools.register` 注册 Agent 工具 `recording_library`，并注入系统提示段。

不负责：

- 当前版本的录音豆连接由本 Host 的原生 CoreBluetooth 桥负责（macOS）。
- 面板 UI、设置界面（`plugin/client.js`）。
- watchOS / iOS App（`apple/`）。
- 修改 profile 的 `cordis.patch.yml`（由 DSH config editor 落盘）。

## 目录

| 文件 | 作用 |
|---|---|
| `plugin/index.js` | 插件入口，只做转接；导出 `name` 与 `apply(ctx, config)`。 |
| `host/plugin.mjs` | 组装 store / queue / events / watch / routes / tool / `@` 注入；config 持久化；启动清理。 |
| `host/config.mjs` | 配置归一化、公开投影、POST config 合并。 |
| `host/store.mjs` | 录音库存储、id、Markdown frontmatter、参考候选、原子写。 |
| `host/asr.mjs` | Apple / OpenAI 兼容 / none 提供方、串行转录队列、取消、进度。 |
| `host/http.mjs` | `/api/recording/*` 处理器（Node `IncomingMessage`/`ServerResponse`）。 |
| `host/events.mjs` | SSE 客户端集合与 25 秒心跳。 |
| `host/watch.mjs` | 局域网 HTTP 上传服务 + UDP 信标。 |
| `host/ble.mjs` | 原生蓝牙桥：编译/缓存 Swift 助手、子进程超时/取消、错误映射、导出+解密+Ogg 封装+入库。 |
| `host/ogg.mjs` | 独立实现的 Ogg/Opus 容器封装。 |
| `host/references.mjs` | `ctx.fileReferences.list` 原型包装与还原。 |
| `host/tools.mjs` | `recording_library` 工具定义与系统提示段。 |
| `native/apple_transcribe.swift` | macOS Speech 助手源码（首次转录时编译）。 |
| `native/apple_transcribe_info.plist` | 助手内嵌 Info.plist（legacy `SFSpeechRecognizer` 的权限说明）。 |
| `native/d3200_helper.swift` | CoreBluetooth D3200 助手源码（首次设备操作时编译）。 |
| `native/d3200_helper_info.plist` | 蓝牙助手内嵌 Info.plist（`NSBluetoothAlwaysUsageDescription`）。 |

## 关键约定

### 只 import `node:` 内置模块

插件包被 link 到 profile，但 Node 从本包解析不到 `@deepseek-ai/*`（实测 `ERR_MODULE_NOT_FOUND`）。因此 Host 代码：

- 不静态 import 任何 `@deepseek-ai/*`；
- DSH 能力全部通过 `ctx.inject([...])` / `ctx.get('name')` 获取；
- 工具用普通对象注册（`parameters` 直接是 JSON Schema，`output.schema` + `output.render`，`execute` 自己校验参数），不 import `dsh-tools`。

### 服务装配

`applyRecordingHost()` 内 `ctx.inject(['fileReferences','workingDirectory','webServer','tools','systemPrompt'], …)` 后：

- `ctx.webServer.register({ kind: 'prefix', path: '/api/recording', handler })`；
- `ctx.tools.register(recordingTool)`；
- `ctx.systemPrompt.section({ name: 'recording-suite:library', order: 2950, … })`；
- `ctx.get('fileReferences')` 装载 `@` 注入（原型包装，用 `ctx.effect` 在卸载时还原）；
- 所有资源（路由、工具、提示段、SSE、队列、手表服务、`@` 包装）都由同一个 effect 释放。

### 配置

`config` 是普通对象，字段：`provider`、`language`、`openai.{baseUrl,model,apiKey}`、`storageDir`、`watchImport.{enabled,port}`。

`POST /api/recording/config` 通过 `ctx.get('configEditor').edit(ctx.fiber.entry, current => ({...current, ...next}))` 持久化，随后返回 `{ok:true,restart:true}`（DSH 重载插件）。config editor 不可用时退化为「仅本进程生效」，响应里带 `persisted:false` 与 `warning`，绝不静默假装已落盘。

`openai.apiKey` 可省略表示保留原值，传空字符串表示清除；环境变量 `OPENAI_API_KEY` 作为兜底；API 永远不返回明文 key，只返回 `hasApiKey`。

### 数据与并发

- `index.json` 结构：`{ version: 1, watchToken, recordings: [...] }`；写入「临时文件 + rename」。损坏的 index 会备份为 `index.json.corrupt-<ts>` 后重建。
- 转录最多 1 个并发；任务 id 形如 `job-<ms>-<hex>`，只存在内存；Host 重启后遗留的 `queued/running` 会被标记为 `failed`（"Host 重启，转录任务已中断"）。
- 删除录音先取消其排队/运行中的任务，再删音频、Markdown 与索引项。
- 文件 id 不含空格或斜杠；`audio/` 与 `transcripts/` 文件名固定为 `<id>.<format>` / `<id>.md`。

### 转录 Markdown

`transcripts/<id>.md` 自包含，frontmatter 字段：`id/title/source/recordedAt/importedAt/durationMs/provider/language/audioPath`，正文为纯转录文本。`read` 工具可直接读；重命名会同步改 frontmatter 的 `title`，正文不动。

### Apple Speech 助手

首次 `provider=apple` 转录时：

1. `afconvert -f WAVE -d LEI16@16000 -c 1` 把音频转成 16k mono WAV（`<storage>/bin/<id>.16k.wav`，任务结束删除）。
2. `xcrun swiftc -O -parse-as-library` 编译 `native/apple_transcribe.swift` 到 `<storage>/bin/apple_transcribe`（内嵌 `apple_transcribe_info.plist`），按源码 mtime 缓存，失败返回可操作错误（提示 `xcode-select --install`）。
3. 助手输出单行 JSON：`{"ok":true,"text":…}` 或 `{"ok":false,"error":…,"code":…}`。

运行时两条引擎：

- **macOS 26+**：`SpeechAnalyzer` + `SpeechTranscriber`，端侧文件转写，不经过 `SFSpeechRecognizer` 的 TCC 弹窗。语言模型状态来自 `AssetInventory.status`：
  - `installed`：直接转写；
  - `supported`（模型在目录里但未安装）：先 `AssetInventory.assetInstallationRequest → downloadAndInstall()` 安装再转写，下载耗时受助手整体超时约束；安装不可用或失败时返回 `MODEL_NOT_INSTALLED` / `MODEL_DOWNLOAD_FAILED` 与可操作提示；
  - `downloading`：返回 `MODEL_DOWNLOADING`，提示稍后重试；
  - `unsupported` / 语言不在支持列表：返回 `MODEL_UNSUPPORTED` / `LOCALE_UNSUPPORTED`。
- **更旧 macOS**：`SFSpeechURLRecognitionRequest`。该路径需要「语音识别」TCC 授权；命令行进程在缺少用途说明时可能被系统直接 abort（实测 macOS 27 上 SIGABRT），Host 会把错误映射成「请到 系统设置 > 隐私与安全性 > 语音识别 授权 DeepSeek Harness/终端」。macOS 26+ 上不会走到这条路径。

> 2026-11-09 实机验证（macOS 27 / Xcode 27.2 工具链）：
> - `xcrun swiftc -O -parse-as-library` 编译助手成功（Xcode 27.2，约 4–5 秒）。
> - `say` 生成中文样例 → `afconvert` 转 16k mono WAV → 助手输出：
>   `{"ok":true,"text":"你好，这是一段苹果语音识别的测试录音，今天是 11月 9日天气不错。"}`
> - 通过 `host/asr.mjs#transcribeApple` 端到端跑通（编译 → 转码 → 转写 → 写 Markdown），无 TCC 提示。
> - 早期版本助手在 `finalizeAndFinishThroughEndOfInput()`/超时 Task 上会阻塞（`Task.sleep` 在 unstructured Task 中不可取消，组退出会等满超时；`SpeechAnalyzer.start` 在模型未安装时也会无限等待），已修复：文件读完即结束、超时改为组内可取消的 `Task.sleep`、`.supported` 先安装模型。

### 原生蓝牙桥（D3200）

DSH 桌面窗口是 Electron，没有浏览器设备选择器。因此由 Host 直接驱动 CoreBluetooth：

1. 首次设备操作时 `xcrun swiftc -O -parse-as-library` 编译 `native/d3200_helper.swift` 到 `<storage>/bin/d3200_helper`（内嵌 `native/d3200_helper_info.plist`，按源码 mtime 缓存，失败提示 `xcode-select --install`）。
2. 每个操作 spawn 一次助手（无长连接进程），参数：`scan [--timeout 8] [--mode precise|all]`、`list --device <CB UUID>`、`export --device <uuid> --file <u32> --out <path>`、`record --device <uuid> --action start|pause`、`delete --device <uuid> --file <u32>`。助手只在 stdout 输出一行 JSON，stderr 是进度。
3. 助手用 CoreBluetooth（服务 `020cf5da-…`、写 `…7777`、通知 `…8888`）移植协议：08EE 帧 / 09FF 拼帧、`01/01` 设备信息、`1B/0E` 文件列表、`18/82` 录音、`2E/01` ECDH、`1A/07` 文件头、`1A/08|12` 分片、`1A/0A` 结束、`1A/10` 删除；CryptoKit P-256 + HKDF-SHA256(salt/info=[1,2,3])，CommonCrypto AES-CTR 解密。CB 回调必须靠 `RunLoop.main` 泵送，不能用信号量阻塞主线程。
4. `export` 把解密后的裸 Opus 写到临时文件；Host 用 `host/ogg.mjs` 封装 Ogg/Opus（20 ms/160 字节一帧），`store.importRecording({source:'soundcore', format:'ogg', deviceFileId, durationMs=ceil(raw/160)*20})` 入库，可选按当前 ASR 配置自动排队；临时文件用后即删。Client 不应再 POST `/import`（响应里的 `recording` 已入库）。
5. 插件卸载时 `device.dispose()` abort 所有运行中的助手进程。

端点（同源，前缀 `/api/recording`）：

| 方法 | 路径 | 请求 | 响应 |
|---|---|---|---|
| GET | `/device/status` | — | `{ok,platform,available,reason,helper:{path,compiled,sourcePresent}}` |
| POST | `/device/scan` | `{mode?'precise'\|'all',timeoutSeconds?}` | `{ok,devices:[{id,name,rssi}],mode}` |
| POST | `/device/list` | `{deviceId}` | `{ok,deviceId,name,device:{battery,firmwareVersion,…},recordStatus,files:[{fileId,endTime,sizeBytes,estimatedDurationMs}]}` |
| POST | `/device/export` | `{deviceId,fileId,title?,recordedAt?,autoTranscribe?,language?}` | `{ok,fileId,durationMs,rawSizeBytes,sizeBytes,recording}` |
| POST | `/device/record` | `{deviceId,action:'start'\|'pause'}` | `{ok,action,recordStatus,acknowledged}` |
| POST | `/device/delete` | `{deviceId,fileId}` | `{ok,fileId,deleted}` |

失败响应 `{error,code}`，`code` 是稳定的语义码：`native_unavailable` / `helper_compile_failed` / `bluetooth_unauthorized` / `bluetooth_off` / `device_not_found` / `connect_failed` / `handshake_failed` / `key_check_failed` / `device_rejected_export` / `export_incomplete` / `delete_rejected` / `timeout` / `bad_request`。Client 的 `nativeD3200Client.js#nativeErrorText` 负责翻译。

非 macOS 上 `available:false`；`available:true` 但尚未编译时仍可用（首次操作会编译）。

注意：CoreBluetooth 暴露的 `CBPeripheral.identifier` 可能随录音豆轮换 BLE 地址而变化（实测同一台设备的 UUID 在两次连接之间从 `11111111-…` 变成 `22222222-…`，序列号不变）。因此 **deviceId 只用于单次 scan → list/export 会话，不要持久化**；Client 每次连接都重新精确扫描，list 遇到 `device_not_found` 会重扫一次再重试。

> 2026-11-10 实机验证（macOS 27.0.1 / Swift 6.4.2 / 真机 soundcore Work，CB UUID `11111111-2222-3333-4444-555555555555`）：
> - 服务过滤 `scan --timeout 5` 能发现设备；`list` 读到电量 100%、固件 `04.92`、序列号 `TEST-SERIAL-0001`、仓电量 100%、剩余/总存储 7532704/7551136 KB、1 条录音（fileId `1700000001`，1560 B）。
> - `export` 经 ECDH + AES-CTR 解密出 12480 B 裸 Opus（设备声明 12948 B），Ogg 封装后 `afinfo` 识别为 1.56 s、48 kHz 单声道 Opus。
> - 上述 `scan/list/export` 全部通过 `host/ble.mjs#createBleService` 与 `/api/recording/device/*` 端到端跑通。
> - 未做实机验证：`record start`（按要求未触发真实录音）、`delete`（会删除用户设备数据，未对真机执行）、其他平台的 BLE 实现、固件缺失服务 UUID 时的 `--mode all` 自动选择。
> - 导出后经 `host/asr.mjs#transcribeApple` 端到端跑通：真机 1.56 s 录音 → Ogg → 入库 → macOS 端侧 Speech 转出「好今天就来了」并写入 Markdown。

### 手表导入

- 监听 `0.0.0.0:<watchImport.port>`（默认 47831），`/health` 免鉴权，其余要求 `Authorization: Bearer <index.watchToken>`。
- `POST /api/watch/upload?name&recordedAt&durationMs&format` 读取原始字节，按 `source: "apple-watch"` 入库，响应 `{recording}`。
- 每 3 秒向 `255.255.255.255:<beaconPort>` 广播 `{service,version,port,token,name}`；token 轮换立即生效（HTTP 与信标都实时读 `index.json`）。
- 端口被占用等启动错误记录在 `status.watchImport.error`，不影响同源 API。

### `@` 注入

`ctx.get('fileReferences')` 返回的服务可能是 Cordis 的 traceable Proxy，但原型上仍是 `LocalFileReferenceService` 的 `list`。包装逻辑：

- 在自身上找 `list`，否则沿原型链找 descriptor，整体替换 `value`；
- 调用原 `list` 失败时返回空基础列表，不阻断输入框；
- 注入候选永远排在最前（空 query：最多 8 个最近修改的转录文件；空库时返回转录目录本身；非空 query：标题/文件名不区分大小写包含，最多 8 个；query 为转录目录绝对路径时直接列目录内 Markdown）；
- 去重、保留基础候选顺序与数量；卸载时按保存的 descriptor 原样还原。

### Agent 工具

`recording_library` 参数：

```
action: "list" | "read" | "transcribe"   （必填）
id: string            read / transcribe 必填
query: string         list 过滤
limit: integer        1–50，默认 20
language: string      transcribe 语言
```

`output.schema` 为对象根 schema，`output.render` 输出 pretty JSON 文本。`execute` 自己校验参数与录音存在性；`transcribe` 只入队并立即返回 `{jobId,status}`（不阻塞模型步骤）。

## 测试

```
node --test plugin/test/host-*.test.mjs
node --check plugin/index.js
```

当前覆盖：

- `host-store`：配置归一化/公开投影、id、Markdown frontmatter 往返、导入/列表排序/改名/删除、token 轮换、参考候选排序与过滤、index 损坏恢复。
- `host-queue`：串行执行、失败落盘、`none` 报错、取消、OpenAI multipart 请求构造。
- `host-http`：契约字段、import/import-file、SSE、Range/HEAD、config GET/POST、token 轮换、404/405。
- `host-references`：合并顺序/去重、原型包装与还原、基础发现失败降级。
- `host-tools`：JSON Schema 子集、参数校验、list/read/transcribe、提示段与 disposer。
- `host-watch`：health 免鉴权、Bearer 鉴权、上传入库、token 轮换、禁用不监听。
- `host-plugin`：入口导出、服务注入列表、路由/工具/提示段注册与释放、Apple Speech 探测。
- `host-ble`：助手 JSON 解析、错误码映射、Ogg/Opus 封装、配置/编译缓存、scan/list/record/delete、导出入库与临时文件清理、卸载取消子进程、HTTP 端点接线与 503/404/405。

Apple Speech 与原生蓝牙助手的真实编译/设备操作是人工冒烟（见上），不放进 `node --test`：它依赖本机 `xcrun`、蓝牙硬件与真实录音豆，属于环境验证而非逻辑测试。

Client 测试：`client-native.test.mjs` 覆盖 `NativeD3200Client` 的设备选择、scan/list/record/export/delete 调用、导入去重与错误本地化。

## 已知限制

- 打包发布时需确认 `plugin/package.json` 的 `files` 包含 `host/**`、`native/**` 与 `client.js`（当前已包含）。
- 原生蓝牙桥只在 macOS Host 上 `available:true`；其他平台暂不支持录音豆连接。
- 真机上录音豆同一时间只能被一个中心占用：若手机/飞书 App 正连着，助手会返回 `connect_failed` / `handshake_failed`，需先释放。
- `scan --mode all` 在嘈杂环境会看到大量 BLE 设备；Client 只在「显示全部设备」时使用，并优先选择名字含 soundcore/D3200 的设备或唯一命中；多设备且无名字匹配时返回 `device_not_found` 而不是乱连。
- 一个助手进程一次只做一个操作，导出大文件时依赖助手自身 300 s 上限与 Host 330 s 超时；期间录音豆必须保持唤醒并在范围内。
- Apple Speech 的 legacy 路径在 macOS < 26 上依赖 TCC 授权；无 GUI 用途说明的 CLI 可能被系统直接终止，只能给出授权指引，无法在代码里绕过。
- `POST config` 改变 `storageDir` 需要 DSH 重载后才真正切换；未持久化时保持旧目录并给出 warning。
- 手表局域网服务不做 TLS；请只在可信局域网使用，token 可随时轮换。
