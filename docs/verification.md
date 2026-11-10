# 验证记录

日期：2026-11-10。环境：macOS 27.0.1、Xcode 27.2、Swift 6.4、watchOS/iOS 26.2 模拟器、Node 24.8、DSH Desktop（profile `desktop`）。

## 自动化测试

| 命令 | 结果 |
|---|---|
| `node --test plugin/test/*.test.mjs` | 84 pass / 0 fail |
| `node --check plugin/index.js plugin/host/*.mjs plugin/scripts/build-client.mjs` | 通过 |
| `node --check plugin/client.js` | 通过 |
| `node plugin/scripts/build-client.mjs` | 通过，输出 221,152 B；可重复构建 |
| `cd apple && xcodegen generate` | 通过 |
| watchsimulator / iphonesimulator build | 均 `** BUILD SUCCEEDED **`（仅 AppIntents 元数据提示） |
| signed iOS device build（`-allowProvisioningUpdates`） | `** BUILD SUCCEEDED **`，含 watch app 嵌入与签名 |

## DSH 实机（Host）

插件通过 `plugin_manager install_bundle` 安装并启用，`application: applied`。

| 检查 | 结果 |
|---|---|
| `GET /api/recording/status` | 200，返回存储目录、ASR、手表 URL/token、Apple Speech 可用 |
| `GET /api/recording/list` / `GET /api/recording/config` | 200，字段符合契约 |
| `POST /api/recording/import-file`（`say` 生成的 m4a） | 200，音频落盘、index 更新 |
| `PATCH /api/recording/:id` / `DELETE /api/recording/:id` | 200，标题与文件同步更新/删除 |
| `GET /api/recording/audio?id=` + `Range: bytes=0-9` | 206，`content-range: bytes 0-9/34621` |
| `GET /api/recording/events` | SSE 收到 `event: recording` + `type: imported` |
| `recording_library` 工具 | 出现在 Host `listTools`，schema 为 `action` + 可选 `id/query/limit/language` |
| `POST /api/recording/config` | 200，`persisted: true`；清空 `openai.apiKey` 后 `hasApiKey:false` |

## D3200 真机蓝牙（原生桥）

使用本机附近的 soundcore Work（序列号 `TEST-SERIAL-0001`，manufacturer data `TEST-MANUFACTURER…`）实测：

| 检查 | 结果 |
|---|---|
| `GET /api/recording/device/status` | `available:true`，helper 未编译时 `compiled:false` |
| `POST /api/recording/device/scan` | 命中 `soundcore Work`，`rssi` ≈ -50，无 TCC 弹窗 |
| `POST /api/recording/device/list` | 电量/仓电量 100%、固件 04.92/1.2.1、序列号、存储、1 条录音 |
| `POST /api/recording/device/export` | 真机导出 → ECDH/HKDF/AES-CTR 解密 → Ogg/Opus 入库 → Apple Speech 转出「好今天就来了」并写 Markdown |
| `record start` / 真机 `delete` | 未执行（避免真的录音/删除用户数据） |

设备会轮换 BLE 地址，CoreBluetooth identifier 每次会话可能不同，因此 Client 每次重新精确扫描，`device_not_found` 时自动重扫一次。

## ASR 端到端

### Apple Speech（本机离线）

`say -v Tingting` 生成中文样例 → `afconvert` 转 16k mono WAV → Host 自动 `xcrun swiftc` 编译助手 → 转写：

- 用时约 0.55 s，无 TCC 弹窗（macOS 26+ `SpeechAnalyzer` 路径）；
- 识别结果：`你好，这是一段录音套件的测试录音，今天下午三点开会讨论产品方案。`
- Markdown 落盘，frontmatter `provider: "apple"`，正文为识别文本。

首次使用未安装的语言模型时，助手会调用 `AssetInventory.assetInstallationRequest(...).downloadAndInstall()`；下载期间/失败/超时会返回可操作错误。

### OpenAI 兼容 ASR

用本地 Node 桩服务模拟 `POST /v1/audio/transcriptions`：

- Host 发送 `multipart/form-data`，含 `file`、`model`、`language`、`response_format`；
- 返回文本后写入 Markdown，`provider: "openai"`；
- 验证了配置持久化、Key 读取、SSE 进度与错误分支。

## 手表导入

- `GET http://127.0.0.1:47831/health` 返回 `{ok:true, service:"dsh-recording", version:1}`；
- 带 Bearer token 的 `POST /api/watch/upload?...` 返回 `{recording:{source:"apple-watch",...}}`；
- 本机 UDP 监听 47832 收到信标 JSON，含 `port`、`token`、`name`；
- iPhone 模拟器 App 收到信标后自动填入地址/Token，桩服务实测上传请求格式正确。

## 未验证 / 限制

- **浏览器面板视觉与交互**：当前 DSH Web 页面需要登录令牌，自动化浏览器没有该会话；只验证了 Client bundle 的 loader 格式、四页渲染 smoke 和 slot 注册逻辑。请刷新 DSH Web 页面后人工查看面板。
- **`@` 弹窗**：注入逻辑由单元测试覆盖（包装原型、合并、还原、空库目录候选）；未能在已登录页面里实际打开菜单截图确认。
- **D3200 实机 BLE**：scan/list/export/解密/Ogg 封装/Apple Speech 已用真实设备跑通；`record start` 与真机 `delete` 未执行（避免影响用户设备数据）。其他平台的 BLE 实现尚未提供。
- **Xcode 真机安装**：工程已提交、签名构建通过；尚未在你的 iPhone/Apple Watch 上实际安装启动。打开 `apple/DSHRecording.xcodeproj` 后在 Xcode 登录账号即可 Run。
- **Apple Watch 真机**：模拟器无法验证真实麦克风录音、WatchConnectivity 文件传输、表盘深链、后台录音与本地网络权限。
- **插件热重载的端口**：连续多次 reload 而不重启 DSH 时，上一代 Host 可能仍占用手表导入端口，`status.watchImport.error` 会显示 `EADDRINUSE`；服务已做 closeIdle/closeAll 与 6 次重试，重启 DSH 后恢复。
- 测试产生的录音/转录/配置已清理；`~/Documents/DSH-Recordings/bin/apple_transcribe` 保留为已编译缓存。
