# 接口契约

Host 插件、Client 插件、iOS App 之间只通过本文档列出的接口交互。实现方不得单方面改变字段名或路径。

## 1. 录音记录模型

```ts
type RecordingSource = 'soundcore' | 'apple-watch' | 'upload'

interface Recording {
  id: string                 // 稳定 id，形如 20261109-183000-4f2a
  title: string              // 用户可改
  source: RecordingSource
  recordedAt: string         // ISO 8601
  importedAt: string         // ISO 8601
  durationMs: number | null
  sizeBytes: number
  format: 'ogg' | 'wav' | 'm4a' | 'mp3' | 'bin'
  audioPath: string          // 绝对路径
  transcriptPath: string | null
  transcriptStatus: 'none' | 'queued' | 'running' | 'done' | 'failed'
  transcriptError: string | null
  transcriptProvider: string | null
  deviceFileId: number | null // D3200 fileId，可选
  snippet: string            // 转录前 120 字，纯文本；无转录为 ''
  createdAt: number          // 排序用 Unix ms
}
```

## 2. 同源 Host HTTP API

前缀：`/api/recording`。请求/响应均为 JSON（音频流除外）。错误响应：`{ "error": "可读信息" }`，HTTP 4xx/5xx。

### `GET /api/recording/status`

```json
{
  "ok": true,
  "version": "0.1.0",
  "storageDir": "/Users/x/Documents/DSH-Recordings",
  "transcriptsDir": "/Users/x/Documents/DSH-Recordings/transcripts",
  "counts": { "recordings": 3, "transcribed": 2 },
  "asr": { "provider": "apple", "configured": true, "model": null, "baseUrl": null, "language": "zh-CN" },
  "watchImport": { "enabled": true, "port": 47831, "beaconPort": 47832, "urls": ["http://192.0.2.20:47831"], "token": "..." },
  "appleSpeech": { "available": true, "reason": null },
}
```

### `GET /api/recording/list`

```json
{ "recordings": Recording[] }
```

按 `createdAt` 降序。

### `POST /api/recording/import`

浏览器把解密后的音频以 base64 提交。

```json
{
  "source": "soundcore",
  "title": "录音豆录音 2026-11-09 18:30",
  "recordedAt": "2026-11-09T10:30:00.000Z",
  "durationMs": 93000,
  "format": "wav",
  "dataBase64": "UklGR...",
  "deviceFileId": 123456789,
  "autoTranscribe": true
}
```

响应 `{ "recording": Recording }`。`autoTranscribe` 为 `true` 时按当前 ASR 配置排入转录队列。

### `POST /api/recording/import-file`

供本地文件上传（测试/兜底），`multipart/form-data`，字段：`file`（必填）、`title`、`source`、`recordedAt`、`durationMs`、`format`。响应同上。

### `POST /api/recording/transcribe`

```json
{ "id": "20261109-183000-4f2a", "language": "zh-CN" }
```

立即返回 `{ "jobId": "..." }`。任务进度通过 SSE 推送，或轮询 `GET /api/recording/jobs?id=<jobId>`：

```json
{ "job": { "id": "...", "recordingId": "...", "status": "running", "progress": 0.4, "error": null } }
```

### `GET /api/recording/transcript?id=<id>`

```json
{ "id": "...", "text": "正文（不含 frontmatter）", "markdown": "完整 Markdown", "path": "/abs/x.md", "updatedAt": 1760000000000 }
```

未转录返回 404。

### `GET /api/recording/audio?id=<id>`

返回音频字节流，支持 `Range`（用于 `<audio>` 拖动）。`Content-Type` 按格式映射。

### `PATCH /api/recording/:id`

```json
{ "title": "新标题" }
```

重命名记录并同步更新对应 Markdown 的 `title`。响应 `{ "recording": Recording }`。

### `DELETE /api/recording/:id`

删除音频、Markdown 与索引项。响应 `{ "ok": true }`。

### `GET /api/recording/config` / `POST /api/recording/config`

```json
{
  "provider": "apple",
  "language": "zh-CN",
  "openai": { "baseUrl": "https://api.openai.com/v1", "model": "whisper-1", "hasApiKey": true },
  "storageDir": "/Users/x/Documents/DSH-Recordings",
  "watchImport": { "enabled": true, "port": 47831 }
}
```

`POST` 接受同一结构；`openai.apiKey` 可选，不传表示保留原值。响应 `{ "ok": true, "restart": true }`，Host 通过 config editor 持久化后重启插件，Client 轮询 `/status` 恢复。

### `GET /api/recording/events`

SSE，`Content-Type: text/event-stream`。事件：

```
event: recording
data: {"type":"imported","recording":{...}}

event: job
data: {"type":"progress","job":{...}}

event: recording
data: {"type":"updated","id":"...","recording":{...}}
```

心跳：每 25 秒发送 `: ping`。

### `POST /api/recording/watch/rotate-token`

重新生成手表导入 token，响应 `{ "token": "..." }`。旧 token 立即失效。

## 3. 原生蓝牙桥（D3200，macOS）

Host 按需编译 `native/d3200_helper.swift`，用 CoreBluetooth 直接连接录音豆。Client 面板通过这些端点使用 Host 的原生 CoreBluetooth 桥（当前仅 macOS）。所有端点返回 `{ok:true,...}` 或 `{error,code}`；错误码见 `plugin/host/README.md`。

### `GET /api/recording/device/status`

```json
{
  "ok": true,
  "platform": "darwin",
  "available": true,
  "reason": null,
  "helper": { "path": "/abs/DSH-Recordings/bin/d3200_helper", "compiled": true, "source": "/abs/native/d3200_helper.swift", "sourcePresent": true }
}
```

### `POST /api/recording/device/scan`

```json
{ "mode": "precise", "timeoutSeconds": 8 }
```

返回：

```json
{ "ok": true, "mode": "precise", "devices": [ { "id": "22222222-…", "name": "soundcore Work", "rssi": -50 } ] }
```

`id` 是 macOS CoreBluetooth identifier，可能因设备轮换 BLE 地址而变化；每次新会话应重新扫描。

### `POST /api/recording/device/list`

```json
{ "deviceId": "22222222-…" }
```

返回 `{ ok, deviceId, name, device:{battery,boxBattery,firmwareVersion,serialNumber,totalMemoryKb,freeMemoryKb,recordStatus,…}, recordStatus, files:[{fileId,endTime,sizeBytes,estimatedDurationMs,exported}] }`。

### `POST /api/recording/device/export`

```json
{ "deviceId": "…", "fileId": 1700000001, "title": "可选", "recordedAt": "ISO8601", "autoTranscribe": true, "language": "zh-CN" }
```

Host 完成导出、解密、Ogg 封装并存入库，直接返回 `{ ok, recording, durationMs, format }`。Client 不要再调用 `/import`。

### `POST /api/recording/device/record`

```json
{ "deviceId": "…", "action": "start" }
```

`action` 只能是 `start` / `pause`；返回设备当前 `recordStatus`。

### `POST /api/recording/device/delete`

```json
{ "deviceId": "…", "fileId": 1700000001 }
```

从录音豆删除文件；返回 `{ ok, ... }`。

## 4. 手表导入服务（局域网，非 DSH 同源）

监听 `0.0.0.0:47831`（可配置）。所有请求需 `Authorization: Bearer <token>`，健康检查除外。

### `GET /health`

```json
{ "ok": true, "service": "dsh-recording", "version": 1 }
```

### `GET /api/watch/ping`

```json
{ "ok": true, "name": "Mac 名称", "version": 1 }
```

### `POST /api/watch/upload?name=<urlencoded>&recordedAt=<ISO>&durationMs=<number>&format=m4a`

请求体：音频原始字节；`Content-Type` 按格式。响应 `{ "recording": Recording }`（同模型）。

### UDP 信标

Host 每 3 秒向 `255.255.255.255:47832` 发送 UTF-8 JSON：

```json
{ "service": "dsh-recording", "version": 1, "port": 47831, "token": "...", "name": "Mac 名称" }
```

iOS App 监听 47832，收到后自动填充上传地址；也允许手工输入地址与 token。

## 5. `@` 候选注入

Host 在 `ctx.fileReferences.list(agent, query, signal)` 返回前追加 `transcripts/*.md` 的绝对路径候选：

- 空 query：最多 8 个最近修改的转录文件，排在最前；录音库为空时改为返回转录目录本身（`kind: "directory"`，绝对路径），让用户始终能看到固定存储位置；
- 非空 query：文件名或录音标题包含 query（不区分大小写）时追加，最多 8 个；
- 已钻入转录目录（query 为 `transcripts/` 绝对路径前缀）时，直接列出该目录下的 Markdown；
- 候选 `kind: "file"`（或空库时的目录），`path` 为绝对路径；不改变本地工作区候选的顺序与数量上限。

选中后写进输入框的形式由 DSH 的 `formatFileMention` 决定（绝对路径含空格时自动加引号）。

## 6. 数据与并发约定

- 单进程写 `index.json`，写入用「临时文件 + rename」原子替换。
- 转录任务串行执行（最多 1 个并发），避免本机 Speech/网络被占满。
- 文件 id 不含空格或斜杠；标题只用于显示与 Markdown。
- 删除录音时若转录任务在跑，先取消任务。
- Client 不直接读写磁盘；所有持久化经 Host API。
