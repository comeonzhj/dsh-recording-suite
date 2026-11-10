/**
 * DSH Recording Suite — browser (Client) half.
 *
 * GENERATED FILE — do not edit directly.
 * Source: plugin/src-client/**
 * Rebuild: node plugin/scripts/build-client.mjs
 *
 * React is provided by window.__ModuleLoader__ (never bundled here).
 * Device access is delegated to the Host's native CoreBluetooth bridge.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-recording-suite',
  factory(require) {
    const React = require('react')
    void React
    const module = { exports: {} }
    const exports = module.exports
    ;(function (module, exports, require) {
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __export = (target, all) => {
        for (var name in all)
          __defProp(target, name, { get: all[name], enumerable: true });
      };
      var __copyProps = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
          for (let key of __getOwnPropNames(from))
            if (!__hasOwnProp.call(to, key) && key !== except)
              __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
        }
        return to;
      };
      var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

      // plugin/src-client/index.js
      var index_exports = {};
      __export(index_exports, {
        apply: () => apply,
        default: () => index_default,
        inject: () => inject
      });
      module.exports = __toCommonJS(index_exports);
      var import_react8 = require("react");

      // plugin/src-client/i18n.js
      var NS = "recording-suite";
      var DICT = {
        zh: {
          "app.title": "录音套件",
          "app.subtitle": "录音豆与 Apple Watch 录音，转录成 Markdown，用 @ 直接引用",
          "app.tabs.library": "录音库",
          "app.tabs.bean": "录音豆",
          "app.tabs.watch": "手表导入",
          "app.tabs.settings": "设置",
          "app.retry": "重试",
          "app.loading": "加载中…",
          "app.cancel": "取消",
          "app.close": "关闭",
          "app.save": "保存",
          "app.saving": "保存中…",
          "app.copy": "复制",
          "app.copied": "已复制",
          "app.refresh": "刷新",
          "app.delete": "删除",
          "app.rename": "重命名",
          "app.confirm": "确认",
          "app.unknown": "未知",
          "app.none": "无",
          "app.yes": "是",
          "app.no": "否",
          "app.error": "出错了",
          "app.copyFailed": "复制失败，请手动选择文本复制",
          "app.count": "共 {count} 条",
          "app.seconds": "{value} 秒",
          "source.soundcore": "录音豆",
          "source.apple-watch": "Apple Watch",
          "source.upload": "上传",
          "status.none": "未转录",
          "status.queued": "排队中",
          "status.running": "转录中",
          "status.done": "已转录",
          "status.failed": "转录失败",
          "library.title": "录音库",
          "library.hint": "录音文件保存在本机，转录文本以 Markdown 存储，可被任意会话用 @ 引用。",
          "library.search": "搜索标题、转录内容或来源",
          "library.empty.title": "还没有录音",
          "library.empty.hint": "连接录音豆导出录音，或在「手表导入」页把 iPhone 收到的录音传进来。",
          "library.list.empty": "没有匹配的录音",
          "library.detail.emptyTitle": "选择一条录音",
          "library.detail.emptyHint": "左侧选择录音后，可播放、查看转录、重命名或复制 @ 路径。",
          "library.recordedAt": "录制时间",
          "library.importedAt": "导入时间",
          "library.duration": "时长",
          "library.size": "大小",
          "library.format": "格式",
          "library.source": "来源",
          "library.provider": "转录引擎",
          "library.transcript": "转录",
          "library.audio": "播放",
          "library.audioUnsupported": "当前浏览器不支持播放该音频格式，可复制路径用本地播放器打开。",
          "library.transcribe": "转录",
          "library.retranscribe": "重新转录",
          "library.transcribeLanguage": "转录语言",
          "library.transcriptTitle": "转录文本",
          "library.transcriptEmpty": "暂无转录文本。",
          "library.transcriptShowRaw": "查看原始 Markdown",
          "library.transcriptShowText": "查看纯文本",
          "library.transcriptLoading": "正在读取转录…",
          "library.transcriptError": "读取转录失败：{error}",
          "library.transcriptRunning": "转录进行中（{progress}%）…",
          "library.copyAtPath": "复制 @ 绝对路径",
          "library.copyAtHint": "在任意会话输入框用 @ 选择该转录文件，或直接粘贴此绝对路径。",
          "library.copyAudioPath": "复制音频路径",
          "library.renameTitle": "重命名录音",
          "library.renamePlaceholder": "输入新标题",
          "library.deleteConfirm": "删除「{title}」？音频与转录文本会一并删除，且不可恢复。",
          "library.snippetEmpty": "（无转录摘要）",
          "library.toast.renamed": "已重命名",
          "library.toast.deleted": "已删除",
          "library.toast.transcribeQueued": "已加入转录队列",
          "library.toast.copiedPath": "已复制 @ 路径",
          "library.toast.copiedAudio": "已复制音频路径",
          "library.error.loadFailed": "读取录音库失败：{error}",
          "library.error.transcribeFailed": "发起转录失败：{error}",
          "library.error.renameFailed": "重命名失败：{error}",
          "library.error.deleteFailed": "删除失败：{error}",
          "library.error.transcriptFailed": "读取转录失败：{error}",
          "bean.title": "录音豆",
          "bean.transport.native": "本机蓝牙（推荐）",
          "bean.transport.web": "浏览器蓝牙",
          "bean.native.hint": "Host 通过 CoreBluetooth 直接连接 soundcore Work（D3200），在本机解密并入库，无需打开外部浏览器。",
          "bean.native.ready": "本机蓝牙桥",
          "bean.native.managedByHost": "由 Host 管理",
          "bean.native.permissionHint": "改用外部蓝牙时请确认录音豆未被手机或飞书 App 占用；本机蓝牙模式下由 Host 负责连接与解密。",
          "bean.native.unavailable.title": "本机蓝牙桥不可用",
          "bean.native.unavailable.hint": "当前环境无法使用原生蓝牙桥：该能力目前仅 macOS Host 提供。",
          "bean.native.reason": "原因：{reason}",
          "bean.files.viaNative": "通过本机蓝牙读取",
          "bean.connect": "连接录音豆",
          "bean.connectPrecise": "精确搜索录音豆",
          "bean.connectAll": "显示全部设备",
          "bean.connecting": "连接中…",
          "bean.disconnect": "断开连接",
          "bean.connected": "已连接",
          "bean.disconnected": "未连接",
          "bean.device": "设备",
          "bean.battery": "录音豆电量",
          "bean.boxBattery": "充电仓电量",
          "bean.charging": "充电中",
          "bean.firmware": "固件",
          "bean.serial": "序列号",
          "bean.storage": "存储",
          "bean.storageValue": "剩余 {free} / 共 {total}",
          "bean.recordStatus": "录音状态",
          "bean.record.stopped": "已停止",
          "bean.record.recording": "录音中",
          "bean.record.paused": "已暂停",
          "bean.startRecording": "开始录音",
          "bean.pauseRecording": "暂停录音",
          "bean.resumeRecording": "继续录音",
          "bean.refresh": "刷新设备与列表",
          "bean.files.title": "设备上的录音",
          "bean.files.count": "{count} 条",
          "bean.files.empty": "设备上还没有录音。",
          "bean.files.viaBluetooth": "通过蓝牙读取",
          "bean.files.selectAll": "全选",
          "bean.files.clearSelection": "清空选择",
          "bean.files.selected": "已选 {count} 条",
          "bean.files.durationEstimate": "估算 {duration}",
          "bean.files.recordedAt": "录制于 {time}",
          "bean.export.start": "导出并导入（{count}）",
          "bean.export.exporting": "正在导出第 {current}/{total} 条…",
          "bean.export.importing": "正在导入第 {current}/{total} 条…",
          "bean.export.done": "完成 {done} 条，失败 {failed} 条",
          "bean.export.progress": "导出进度",
          "bean.export.single": "导入",
          "bean.importing": "导入中…",
          "bean.imported": "已导入",
          "bean.delete": "从设备删除",
          "bean.deleteConfirm": "确认从录音豆永久删除记录 {id}？",
          "bean.deleteBusy": "删除中…",
          "bean.selectedFile": "文件",
          "bean.log.title": "设备日志",
          "bean.log.empty": "暂无日志",
          "bean.autoTranscribe": "导入后自动转录",
          "bean.importTitle": "录音豆录音 {time}",
          "bean.toast.deleted": "已从设备删除录音 {fileId}",
          "bean.permission.hint": "连接时浏览器会弹出蓝牙设备选择框并记住本次会话授权；段落刷新或断开后需重新选择设备。",
          "bean.error.not_secure": "浏览器直连需要 HTTPS 或 localhost 安全上下文。",
          "bean.error.cancelled": "未选择或未发现兼容录音豆。请把设备靠近电脑后重试，或改用「显示全部设备」。",
          "bean.error.cancelled_all": "未选择设备。Mac 上录音豆可能显示为“未知或不支持的设备”。",
          "bean.error.security": "浏览器拒绝蓝牙权限，请确认页面使用 HTTPS 并允许蓝牙访问。",
          "bean.error.network": "无法建立蓝牙连接。请关闭飞书 App 或其他正在连接录音豆的程序后重试。",
          "bean.error.connect_failed": "连接录音豆失败：{error}",
          "bean.error.chooser_timeout": "蓝牙扫描超时。请唤醒录音豆后重试，或检查系统蓝牙权限。",
          "bean.error.native_unavailable": "本机蓝牙桥不可用：{error}",
          "bean.error.helper_compile_failed": "原生蓝牙助手编译失败：{error}",
          "bean.error.bluetooth_unauthorized": "蓝牙权限被拒绝。请到 系统设置 → 隐私与安全性 → 蓝牙，允许 DSH 访问后重试。",
          "bean.error.bluetooth_off": "系统蓝牙未打开，请打开蓝牙后重试。",
          "bean.error.device_not_found": "没有找到录音豆。请唤醒设备、让它靠近电脑，并确认它没有连在手机或飞书 App 上，然后重试。",
          "bean.error.bad_request": "请求参数不正确：{error}",
          "bean.error.native_failed": "本机蓝牙操作失败：{error}",
          "bean.error.timeout": "{label}超时，请唤醒录音豆后重试。",
          "bean.error.not_connected": "浏览器尚未连接录音豆。",
          "bean.error.file_missing": "当前录音列表里没有这个文件，请先刷新。",
          "bean.error.device_rejected_export": "设备拒绝导出录音（错误码 {code}）。",
          "bean.error.key_check_failed": "录音文件密钥校验失败。",
          "bean.error.session_failed": "无法建立录音解密会话。",
          "bean.error.handshake_failed": "ECDH 握手校验失败。",
          "bean.error.export_incomplete": "设备没有返回完整的可解密录音。",
          "bean.error.delete_rejected": "录音豆拒绝删除（状态码 {status}）。",
          "bean.error.empty_audio": "录音数据为空。",
          "bean.error.export_failed": "导出录音 {id} 失败：{error}",
          "bean.error.import_failed": "导入录音 {id} 失败：{error}",
          "bean.error.refresh_failed": "刷新设备失败：{error}",
          "bean.error.device_action_failed": "设备操作失败：{error}",
          "bean.timeout.readDevice": "读取设备信息",
          "bean.timeout.listPage": "读取录音列表第 {page} 页",
          "bean.timeout.export": "导出录音",
          "bean.timeout.delete": "删除录音",
          "bean.timeout.handshake": "建立本地解密会话",
          "bean.log.connected": "已由浏览器直接连接 {name}",
          "bean.log.connectionFailed": "连接失败：{errorKey}",
          "bean.log.disconnected": "录音豆连接已断开",
          "bean.log.recordRecording": "录音豆正在录音",
          "bean.log.recordPaused": "录音已暂停",
          "bean.log.recordStopped": "录音已停止",
          "bean.log.filesRead": "已读取 {count} 条录音",
          "bean.log.resumeSent": "已继续录音",
          "bean.log.startSent": "已发送开始录音指令",
          "bean.log.pauseSent": "已发送暂停录音指令",
          "bean.log.sessionReady": "浏览器已建立本地解密会话",
          "bean.log.packetFailed": "设备数据处理失败：{message}",
          "bean.log.exportStart": "开始导出录音 {fileId}",
          "bean.log.exported": "录音 {fileId} 已在浏览器内解密",
          "bean.log.deleted": "录音 {fileId} 已从录音豆永久删除",
          "bean.log.exportFailed": "导出录音 {fileId} 失败：{message}",
          "bean.log.wavFallback": "当前浏览器未能转换 WAV，将使用 OGG：{message}",
          "watch.title": "手表导入",
          "watch.hint": "Apple Watch 录音先经 WatchConnectivity 到 iPhone，再由 iPhone App 通过局域网 HTTP 上传到这台电脑。",
          "watch.status.title": "接收服务",
          "watch.status.unavailable": "手表导入服务未启用或尚未启动。请在设置中开启后重试。",
          "watch.urls": "本机地址",
          "watch.urls.empty": "没有可用的局域网地址（可能未联网）。",
          "watch.token": "导入 token",
          "watch.rotate": "重新生成 token",
          "watch.rotateConfirm": "重新生成后旧 token 立即失效，已配置的 iPhone 需要重新填写。确认继续？",
          "watch.rotated": "token 已重新生成",
          "watch.udp.title": "自动发现",
          "watch.udp.hint": "Host 每 3 秒在 UDP 47832 端口发送信标；iPhone App 监听后会自动填入上方地址与 token。也可以手工输入。",
          "watch.list.title": "来自 Apple Watch 的录音",
          "watch.list.empty": "还没有来自手表的录音。",
          "watch.error.loadFailed": "读取手表导入信息失败：{error}",
          "watch.error.rotateFailed": "重新生成 token 失败：{error}",
          "watch.tokenCopied": "已复制 token",
          "watch.urlCopied": "已复制地址",
          "watch.tokenHidden": "出于安全考虑默认隐藏，点击复制获取完整值。",
          "settings.title": "设置",
          "settings.hint": "转录引擎、语言、存储位置与手表导入服务。保存后插件会重启，页面会自动恢复。",
          "settings.provider": "转录引擎",
          "settings.provider.apple": "macOS 本机语音（Apple Speech）",
          "settings.provider.appleDesc": "本机离线转录，不联网；首次使用会按需编译助手。",
          "settings.provider.openai": "OpenAI 兼容接口",
          "settings.provider.openaiDesc": "调用 /audio/transcriptions，支持 OpenAI、SiliconFlow 等服务。",
          "settings.provider.none": "只保存录音，不转录",
          "settings.provider.noneDesc": "保留音频文件，稍后可手动发起转录。",
          "settings.language": "转录语言",
          "settings.languageHint": "BCP 47 语言标签，如 zh-CN、en-US；留空使用引擎默认值。",
          "settings.openai.baseUrl": "Base URL",
          "settings.openai.model": "模型",
          "settings.openai.apiKey": "API Key",
          "settings.openai.apiKeyPlaceholder": "已配置时留空表示保留原值",
          "settings.openai.apiKeySaved": "已保存 Key",
          "settings.storageDir": "存储目录",
          "settings.storageDirHint": "录音与转录 Markdown 的根目录，由 Host 管理。",
          "settings.watch.enabled": "启用手表导入服务",
          "settings.watch.port": "监听端口",
          "settings.watch.portHint": "局域网 HTTP 服务，供 iPhone App 上传录音。",
          "settings.appleSpeech": "Apple Speech 可用性",
          "settings.appleSpeechAvailable": "可用",
          "settings.appleSpeechUnavailable": "不可用",
          "settings.appleSpeechReason": "原因",
          "settings.save": "保存设置",
          "settings.savedRestarting": "设置已保存，插件正在重启，稍候自动恢复…",
          "settings.restartDone": "插件已恢复，设置生效。",
          "settings.error.load": "读取设置失败：{error}",
          "settings.error.save": "保存设置失败：{error}",
          "settings.error.port": "端口需为 1–65535 之间的整数。",
          "settings.counts": "录音 {recordings} 条 · 已转录 {transcribed} 条"
        },
        en: {
          "app.title": "Recording suite",
          "app.subtitle": "soundcore Work and Apple Watch recordings, transcribed to Markdown and reusable with @",
          "app.tabs.library": "Library",
          "app.tabs.bean": "Recorder",
          "app.tabs.watch": "Watch import",
          "app.tabs.settings": "Settings",
          "app.retry": "Retry",
          "app.loading": "Loading…",
          "app.cancel": "Cancel",
          "app.close": "Close",
          "app.save": "Save",
          "app.saving": "Saving…",
          "app.copy": "Copy",
          "app.copied": "Copied",
          "app.refresh": "Refresh",
          "app.delete": "Delete",
          "app.rename": "Rename",
          "app.confirm": "Confirm",
          "app.unknown": "Unknown",
          "app.none": "None",
          "app.yes": "Yes",
          "app.no": "No",
          "app.error": "Something went wrong",
          "app.copyFailed": "Copy failed. Select the text and copy it manually.",
          "app.count": "{count} items",
          "app.seconds": "{value} s",
          "source.soundcore": "Recorder",
          "source.apple-watch": "Apple Watch",
          "source.upload": "Upload",
          "status.none": "Not transcribed",
          "status.queued": "Queued",
          "status.running": "Transcribing",
          "status.done": "Transcribed",
          "status.failed": "Failed",
          "library.title": "Recording library",
          "library.hint": "Audio stays on this Mac, transcripts are stored as Markdown, and any conversation can @-reference them.",
          "library.search": "Search title, transcript, or source",
          "library.empty.title": "No recordings yet",
          "library.empty.hint": "Export from the recorder, or use Watch import to send iPhone recordings here.",
          "library.list.empty": "No matching recordings",
          "library.detail.emptyTitle": "Select a recording",
          "library.detail.emptyHint": "Pick a recording on the left to play it, read its transcript, rename it, or copy its @ path.",
          "library.recordedAt": "Recorded",
          "library.importedAt": "Imported",
          "library.duration": "Duration",
          "library.size": "Size",
          "library.format": "Format",
          "library.source": "Source",
          "library.provider": "Transcriber",
          "library.transcript": "Transcript",
          "library.audio": "Playback",
          "library.audioUnsupported": "This browser cannot play the audio format. Copy the path and open it in a local player.",
          "library.transcribe": "Transcribe",
          "library.retranscribe": "Transcribe again",
          "library.transcribeLanguage": "Transcription language",
          "library.transcriptTitle": "Transcript",
          "library.transcriptEmpty": "No transcript yet.",
          "library.transcriptShowRaw": "Show raw Markdown",
          "library.transcriptShowText": "Show plain text",
          "library.transcriptLoading": "Loading transcript…",
          "library.transcriptError": "Could not load transcript: {error}",
          "library.transcriptRunning": "Transcribing ({progress}%)…",
          "library.copyAtPath": "Copy @ absolute path",
          "library.copyAtHint": "Type @ in any conversation and pick this transcript, or paste the absolute path.",
          "library.copyAudioPath": "Copy audio path",
          "library.renameTitle": "Rename recording",
          "library.renamePlaceholder": "New title",
          "library.deleteConfirm": 'Delete "{title}"? Its audio and transcript are removed permanently.',
          "library.snippetEmpty": "(no transcript snippet)",
          "library.toast.renamed": "Renamed",
          "library.toast.deleted": "Deleted",
          "library.toast.transcribeQueued": "Added to the transcription queue",
          "library.toast.copiedPath": "Copied @ path",
          "library.toast.copiedAudio": "Copied audio path",
          "library.error.loadFailed": "Could not load the library: {error}",
          "library.error.transcribeFailed": "Could not start transcription: {error}",
          "library.error.renameFailed": "Could not rename: {error}",
          "library.error.deleteFailed": "Could not delete: {error}",
          "library.error.transcriptFailed": "Could not load the transcript: {error}",
          "bean.title": "soundcore Work",
          "bean.transport.native": "Native Bluetooth (recommended)",
          "bean.transport.web": "Browser Bluetooth",
          "bean.native.hint": "The Host connects to soundcore Work (D3200) over CoreBluetooth, decrypts and imports recordings locally — no external browser needed.",
          "bean.native.ready": "Native Bluetooth bridge",
          "bean.native.managedByHost": "Managed by Host",
          "bean.native.permissionHint": "With the native bridge the Host owns the connection and decryption; make sure the recorder is not held by the phone or the soundcore app.",
          "bean.native.unavailable.title": "Native Bluetooth bridge unavailable",
          "bean.native.unavailable.hint": "This environment cannot use the native bridge; it is currently available only on a macOS Host.",
          "bean.native.reason": "Reason: {reason}",
          "bean.files.viaNative": "Read over native Bluetooth",
          "bean.connect": "Connect recorder",
          "bean.connectPrecise": "Find my recorder",
          "bean.connectAll": "Show all devices",
          "bean.connecting": "Connecting…",
          "bean.disconnect": "Disconnect",
          "bean.connected": "Connected",
          "bean.disconnected": "Disconnected",
          "bean.device": "Device",
          "bean.battery": "Recorder battery",
          "bean.boxBattery": "Case battery",
          "bean.charging": "Charging",
          "bean.firmware": "Firmware",
          "bean.serial": "Serial",
          "bean.storage": "Storage",
          "bean.storageValue": "{free} free / {total} total",
          "bean.recordStatus": "Recording status",
          "bean.record.stopped": "Stopped",
          "bean.record.recording": "Recording",
          "bean.record.paused": "Paused",
          "bean.startRecording": "Start recording",
          "bean.pauseRecording": "Pause recording",
          "bean.resumeRecording": "Resume recording",
          "bean.refresh": "Refresh device",
          "bean.files.title": "Recordings on device",
          "bean.files.count": "{count} files",
          "bean.files.empty": "No recordings on the device yet.",
          "bean.files.viaBluetooth": "Read over Bluetooth",
          "bean.files.selectAll": "Select all",
          "bean.files.clearSelection": "Clear selection",
          "bean.files.selected": "{count} selected",
          "bean.files.durationEstimate": "~{duration}",
          "bean.files.recordedAt": "Recorded {time}",
          "bean.export.start": "Export and import ({count})",
          "bean.export.exporting": "Exporting {current}/{total}…",
          "bean.export.importing": "Importing {current}/{total}…",
          "bean.export.done": "{done} imported, {failed} failed",
          "bean.export.progress": "Export progress",
          "bean.export.single": "Import",
          "bean.importing": "Importing…",
          "bean.imported": "Imported",
          "bean.delete": "Delete from device",
          "bean.deleteConfirm": "Permanently delete recording {id} from the recorder?",
          "bean.deleteBusy": "Deleting…",
          "bean.selectedFile": "File",
          "bean.log.title": "Device log",
          "bean.log.empty": "No log entries",
          "bean.autoTranscribe": "Transcribe after import",
          "bean.importTitle": "Recorder recording {time}",
          "bean.toast.deleted": "Recording {fileId} deleted from the device",
          "bean.permission.hint": "The browser shows a Bluetooth chooser and remembers the permission for this page session; after a page reload or disconnect, pick the device again.",
          "bean.error.not_secure": "Direct Bluetooth needs an HTTPS or localhost secure context.",
          "bean.error.cancelled": 'No compatible recorder selected or found. Move the device closer and retry, or use "Show all devices".',
          "bean.error.cancelled_all": 'No device selected. On macOS the recorder may appear as "Unknown or unsupported device".',
          "bean.error.security": "The browser denied Bluetooth permission. Make sure the page is HTTPS and Bluetooth access is allowed.",
          "bean.error.network": "Could not establish the Bluetooth connection. Quit Feishu or other apps holding the recorder, then retry.",
          "bean.error.connect_failed": "Could not connect to the recorder: {error}",
          "bean.error.chooser_timeout": "Bluetooth scanning timed out. Wake the recorder, retry, and check the system Bluetooth permission.",
          "bean.error.native_unavailable": "Native Bluetooth bridge unavailable: {error}",
          "bean.error.helper_compile_failed": "Could not compile the native Bluetooth helper: {error}",
          "bean.error.bluetooth_unauthorized": "Bluetooth permission was denied. Allow DSH under System Settings → Privacy & Security → Bluetooth, then retry.",
          "bean.error.bluetooth_off": "Bluetooth is off. Turn it on and retry.",
          "bean.error.device_not_found": "No recorder found. Wake the device, move it closer, make sure it is not connected to the phone or the soundcore app, then retry.",
          "bean.error.bad_request": "Invalid request: {error}",
          "bean.error.native_failed": "Native Bluetooth operation failed: {error}",
          "bean.error.timeout": "Timed out while {label}. Wake the recorder and retry.",
          "bean.error.not_connected": "The browser is not connected to the recorder.",
          "bean.error.file_missing": "That file is not in the current list. Refresh first.",
          "bean.error.device_rejected_export": "The device refused the export (error {code}).",
          "bean.error.key_check_failed": "The recording key check failed.",
          "bean.error.session_failed": "Could not establish a decryption session.",
          "bean.error.handshake_failed": "ECDH handshake verification failed.",
          "bean.error.export_incomplete": "The device did not return a complete, decryptable recording.",
          "bean.error.delete_rejected": "The recorder refused the delete (status {status}).",
          "bean.error.empty_audio": "The recording is empty.",
          "bean.error.export_failed": "Exporting recording {id} failed: {error}",
          "bean.error.import_failed": "Importing recording {id} failed: {error}",
          "bean.error.refresh_failed": "Could not refresh the device: {error}",
          "bean.error.device_action_failed": "Device action failed: {error}",
          "bean.timeout.readDevice": "reading device info",
          "bean.timeout.listPage": "reading file list page {page}",
          "bean.timeout.export": "exporting the recording",
          "bean.timeout.delete": "deleting the recording",
          "bean.timeout.handshake": "establishing the decryption session",
          "bean.log.connected": "Browser connected directly to {name}",
          "bean.log.connectionFailed": "Connection failed: {errorKey}",
          "bean.log.disconnected": "Recorder disconnected",
          "bean.log.recordRecording": "Recorder is recording",
          "bean.log.recordPaused": "Recording paused",
          "bean.log.recordStopped": "Recording stopped",
          "bean.log.filesRead": "Read {count} recordings",
          "bean.log.resumeSent": "Recording resumed",
          "bean.log.startSent": "Start-recording command sent",
          "bean.log.pauseSent": "Pause-recording command sent",
          "bean.log.sessionReady": "Browser established the local decryption session",
          "bean.log.packetFailed": "Device packet handling failed: {message}",
          "bean.log.exportStart": "Exporting recording {fileId}",
          "bean.log.exported": "Recording {fileId} decrypted in the browser",
          "bean.log.deleted": "Recording {fileId} permanently deleted from the recorder",
          "bean.log.exportFailed": "Exporting recording {fileId} failed: {message}",
          "bean.log.wavFallback": "This browser could not convert to WAV; using OGG: {message}",
          "watch.title": "Watch import",
          "watch.hint": "Apple Watch recordings travel over WatchConnectivity to the iPhone app, which uploads them to this Mac over the local network.",
          "watch.status.title": "Receiver",
          "watch.status.unavailable": "Watch import is disabled or not running yet. Enable it in Settings and retry.",
          "watch.urls": "Local addresses",
          "watch.urls.empty": "No LAN address available (the Mac may be offline).",
          "watch.token": "Import token",
          "watch.rotate": "Rotate token",
          "watch.rotateConfirm": "Rotating invalidates the old token immediately; a configured iPhone must be updated. Continue?",
          "watch.rotated": "Token rotated",
          "watch.udp.title": "Automatic discovery",
          "watch.udp.hint": "The Host broadcasts a UDP beacon on port 47832 every 3 seconds; the iPhone app auto-fills the address and token above. Manual entry also works.",
          "watch.list.title": "Recordings from Apple Watch",
          "watch.list.empty": "No Apple Watch recordings yet.",
          "watch.error.loadFailed": "Could not load watch import info: {error}",
          "watch.error.rotateFailed": "Could not rotate the token: {error}",
          "watch.tokenCopied": "Token copied",
          "watch.urlCopied": "Address copied",
          "watch.tokenHidden": "Hidden by default for safety; copy it to reveal the full value.",
          "settings.title": "Settings",
          "settings.hint": "Transcriber, language, storage, and the watch import receiver. Saving restarts the plugin; the page recovers automatically.",
          "settings.provider": "Transcriber",
          "settings.provider.apple": "macOS on-device speech (Apple Speech)",
          "settings.provider.appleDesc": "Offline local transcription; the helper is compiled on demand.",
          "settings.provider.openai": "OpenAI-compatible endpoint",
          "settings.provider.openaiDesc": "Calls /audio/transcriptions; works with OpenAI, SiliconFlow, and similar services.",
          "settings.provider.none": "Save audio only",
          "settings.provider.noneDesc": "Keep the audio and transcribe later on demand.",
          "settings.language": "Transcription language",
          "settings.languageHint": "BCP 47 tag such as zh-CN or en-US; leave empty to use the engine default.",
          "settings.openai.baseUrl": "Base URL",
          "settings.openai.model": "Model",
          "settings.openai.apiKey": "API key",
          "settings.openai.apiKeyPlaceholder": "Leave empty to keep the stored key",
          "settings.openai.apiKeySaved": "Key stored",
          "settings.storageDir": "Storage directory",
          "settings.storageDirHint": "Root of audio files and transcript Markdown, managed by the Host.",
          "settings.watch.enabled": "Enable watch import receiver",
          "settings.watch.port": "Listening port",
          "settings.watch.portHint": "LAN HTTP service used by the iPhone app to upload recordings.",
          "settings.appleSpeech": "Apple Speech availability",
          "settings.appleSpeechAvailable": "Available",
          "settings.appleSpeechUnavailable": "Unavailable",
          "settings.appleSpeechReason": "Reason",
          "settings.save": "Save settings",
          "settings.savedRestarting": "Settings saved. The plugin is restarting; this page will recover shortly…",
          "settings.restartDone": "Plugin recovered and settings are active.",
          "settings.error.load": "Could not load settings: {error}",
          "settings.error.save": "Could not save settings: {error}",
          "settings.error.port": "The port must be an integer between 1 and 65535.",
          "settings.counts": "{recordings} recordings · {transcribed} transcribed"
        }
      };
      function fallbackTranslate(key, params) {
        const dict = DICT.zh;
        const template = dict[key] ?? DICT.en[key] ?? key;
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
      }

      // plugin/src-client/styles.js
      var PANEL_STYLE_ID = "dsh-recording-suite";
      var PANEL_CSS = `
      .dsh-rec { display:flex; flex-direction:column; gap:0; height:100%; min-height:0; box-sizing:border-box; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); font-size:13px; line-height:1.5; }
      .dsh-rec *, .dsh-rec *::before, .dsh-rec *::after { box-sizing:border-box; }
      .dsh-rec button, .dsh-rec input, .dsh-rec select, .dsh-rec textarea { font:inherit; color:inherit; }
      .dsh-rec h1, .dsh-rec h2, .dsh-rec h3, .dsh-rec p { margin:0; }
      .dsh-rec svg { flex:none; display:block; }

      .dsh-rec-head { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:12px 16px; padding:20px 28px 14px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); }
      .dsh-rec-mark { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, var(--dsw-alias-bg-layer-2)); color:var(--dsw-alias-brand-primary); border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, var(--dsw-alias-border-l2)); }
      .dsh-rec-head-copy { min-width:0; flex:1 1 260px; }
      .dsh-rec-title { font-size:18px; font-weight:650; letter-spacing:-0.01em; }
      .dsh-rec-sub { margin-top:3px; font-size:12px; color:var(--dsw-alias-label-secondary); overflow-wrap:anywhere; }
      .dsh-rec-head-meta { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
      .dsh-rec-chip { display:inline-flex; align-items:center; gap:5px; max-width:min(340px,100%); padding:2px 9px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .dsh-rec-chip.is-ok { color:var(--dsw-alias-state-success-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 34%, var(--dsw-alias-border-l2)); }
      .dsh-rec-chip.is-warn { color:var(--dsw-alias-state-warn-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 34%, var(--dsw-alias-border-l2)); }
      .dsh-rec-chip.is-error { color:var(--dsw-alias-state-error-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 34%, var(--dsw-alias-border-l2)); }

      .dsh-rec-tabs { flex:none; display:flex; gap:4px; padding:10px 28px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); overflow-x:auto; }
      .dsh-rec-tab { flex:none; display:inline-flex; align-items:center; gap:6px; padding:6px 13px; border-radius:8px; border:1px solid transparent; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; font-size:12.5px; font-weight:550; white-space:nowrap; }
      .dsh-rec-tab:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
      .dsh-rec-tab:focus-visible { outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent); outline-offset:1px; }
      .dsh-rec-tab[aria-selected="true"] { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, var(--dsw-alias-bg-layer-2)); border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, var(--dsw-alias-border-l2)); color:var(--dsw-alias-label-primary); }

      .dsh-rec-body { flex:1; min-height:0; overflow:auto; padding:20px 28px 28px; }
      .dsh-rec-stack { display:flex; flex-direction:column; gap:14px; min-width:0; }
      .dsh-rec-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
      .dsh-rec-row-end { margin-left:auto; }
      .dsh-rec-grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:10px; }

      .dsh-rec-card { border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); padding:16px; min-width:0; }
      .dsh-rec-card-head { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; margin-bottom:12px; }
      .dsh-rec-card-title { display:flex; align-items:center; gap:7px; font-size:13.5px; font-weight:650; }
      .dsh-rec-card-title svg { color:var(--dsw-alias-brand-primary); }
      .dsh-rec-subtle { color:var(--dsw-alias-label-secondary); font-size:12px; }
      .dsh-rec-mono { font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace); font-size:11.5px; overflow-wrap:anywhere; }
      .dsh-rec-empty { display:flex; flex-direction:column; align-items:center; gap:6px; padding:36px 20px; text-align:center; color:var(--dsw-alias-label-secondary); }
      .dsh-rec-empty-title { font-size:14px; font-weight:600; color:var(--dsw-alias-label-primary); }
      .dsh-rec-empty-hint { font-size:12px; max-width:520px; }
      .dsh-rec-alert { display:flex; align-items:flex-start; gap:8px; padding:10px 12px; border-radius:9px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font-size:12px; }
      .dsh-rec-alert svg { margin-top:1px; }
      .dsh-rec-alert.is-error { border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 42%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, var(--dsw-alias-bg-layer-1)); }
      .dsh-rec-alert.is-warn { border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 42%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, var(--dsw-alias-bg-layer-1)); }
      .dsh-rec-alert.is-success { border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 42%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, var(--dsw-alias-bg-layer-1)); }
      .dsh-rec-alert-body { min-width:0; flex:1; }
      .dsh-rec-alert-title { font-weight:600; }
      .dsh-rec-alert-hint { color:var(--dsw-alias-label-secondary); margin-top:2px; }

      .dsh-rec-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:6px 12px; border-radius:8px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font-size:12.5px; font-weight:550; white-space:nowrap; }
      .dsh-rec-btn:hover:enabled { background:var(--dsw-alias-interactive-bg-hover); border-color:var(--dsw-alias-border-l3); }
      .dsh-rec-btn:active:enabled { background:var(--dsw-alias-interactive-bg-active); }
      .dsh-rec-btn:focus-visible { outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent); outline-offset:1px; }
      .dsh-rec-btn:disabled { opacity:.5; cursor:not-allowed; }
      .dsh-rec-btn.is-primary { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); border-color:transparent; }
      .dsh-rec-btn.is-primary:hover:enabled { background:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 86%, var(--dsw-alias-label-primary)); border-color:transparent; }
      .dsh-rec-btn.is-danger { color:var(--dsw-alias-state-error-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 6%, var(--dsw-alias-bg-layer-2)); }
      .dsh-rec-btn.is-danger:hover:enabled { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, var(--dsw-alias-bg-layer-2)); }
      .dsh-rec-btn.is-ghost { background:transparent; border-color:transparent; color:var(--dsw-alias-label-secondary); }
      .dsh-rec-btn.is-ghost:hover:enabled { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
      .dsh-rec-btn.is-sm { padding:3px 8px; font-size:11.5px; border-radius:7px; }

      .dsh-rec-input, .dsh-rec-select, .dsh-rec-textarea { width:100%; min-width:0; padding:6px 10px; border-radius:8px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font-size:12.5px; }
      .dsh-rec-input:focus, .dsh-rec-select:focus, .dsh-rec-textarea:focus { outline:none; border-color:var(--dsw-alias-brand-primary); box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, transparent); }
      .dsh-rec-input::placeholder, .dsh-rec-textarea::placeholder { color:var(--dsw-alias-label-tertiary); }
      .dsh-rec-textarea { resize:vertical; min-height:64px; }
      .dsh-rec-field { display:flex; flex-direction:column; gap:5px; min-width:0; }
      .dsh-rec-field-label { font-size:12px; font-weight:550; color:var(--dsw-alias-label-primary); }
      .dsh-rec-field-hint { font-size:11px; color:var(--dsw-alias-label-secondary); }
      .dsh-rec-check { display:inline-flex; align-items:center; gap:7px; cursor:pointer; font-size:12.5px; }
      .dsh-rec-check input { width:15px; height:15px; accent-color:var(--dsw-alias-brand-primary); }

      .dsh-rec-badge { display:inline-flex; align-items:center; gap:4px; padding:1px 7px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10.5px; white-space:nowrap; }
      .dsh-rec-badge.is-done { color:var(--dsw-alias-state-success-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 32%, var(--dsw-alias-border-l2)); }
      .dsh-rec-badge.is-running { color:var(--dsw-alias-state-business-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 32%, var(--dsw-alias-border-l2)); }
      .dsh-rec-badge.is-failed { color:var(--dsw-alias-state-error-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, var(--dsw-alias-border-l2)); }
      .dsh-rec-badge.is-queued { color:var(--dsw-alias-state-warn-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, var(--dsw-alias-border-l2)); }

      .dsh-rec-lib { display:grid; grid-template-columns:minmax(280px,0.9fr) minmax(360px,1.4fr); gap:14px; align-items:stretch; min-height:0; }
      .dsh-rec-lib-list { display:flex; flex-direction:column; min-height:0; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); overflow:hidden; }
      .dsh-rec-lib-toolbar { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); }
      .dsh-rec-lib-scroll { flex:1; min-height:220px; overflow:auto; padding:6px; display:flex; flex-direction:column; gap:4px; }
      .dsh-rec-item { display:flex; flex-direction:column; gap:3px; width:100%; text-align:left; padding:9px 10px; border-radius:8px; border:1px solid transparent; background:transparent; color:inherit; cursor:pointer; }
      .dsh-rec-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
      .dsh-rec-item[aria-current="true"] { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, var(--dsw-alias-bg-layer-2)); border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, var(--dsw-alias-border-l2)); }
      .dsh-rec-item-top { display:flex; align-items:center; gap:7px; min-width:0; }
      .dsh-rec-item-title { flex:1; min-width:0; font-weight:600; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .dsh-rec-item-meta { display:flex; flex-wrap:wrap; gap:4px 9px; color:var(--dsw-alias-label-secondary); font-size:11px; }
      .dsh-rec-item-snippet { color:var(--dsw-alias-label-secondary); font-size:11.5px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }

      .dsh-rec-detail { display:flex; flex-direction:column; min-width:0; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); overflow:hidden; }
      .dsh-rec-detail-head { flex:none; padding:14px 16px; border-bottom:1px solid var(--dsw-alias-border-l2); display:flex; flex-direction:column; gap:9px; }
      .dsh-rec-detail-title-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
      .dsh-rec-detail-title { flex:1 1 220px; min-width:0; font-size:15px; font-weight:650; overflow-wrap:anywhere; }
      .dsh-rec-detail-scroll { flex:1; min-height:0; overflow:auto; padding:14px 16px; display:flex; flex-direction:column; gap:14px; }
      .dsh-rec-meta-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px 14px; }
      .dsh-rec-meta-item { min-width:0; }
      .dsh-rec-meta-label { font-size:10.5px; color:var(--dsw-alias-label-secondary); letter-spacing:.02em; }
      .dsh-rec-meta-value { font-size:12px; overflow-wrap:anywhere; }
      .dsh-rec-audio { width:100%; height:38px; }

      .dsh-rec-transcript { border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-base); overflow:hidden; }
      .dsh-rec-transcript-head { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); }
      .dsh-rec-transcript-title { flex:1; min-width:120px; font-size:12px; font-weight:600; }
      .dsh-rec-transcript-body { margin:0; padding:12px; max-height:420px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace); font-size:12.5px; line-height:1.65; color:var(--dsw-alias-label-primary); }
      .dsh-rec-hintbox { display:flex; gap:8px; align-items:flex-start; padding:9px 11px; border-radius:9px; background:var(--dsw-alias-bg-layer-2); border:1px dashed var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); font-size:11.5px; }
      .dsh-rec-hintbox svg { color:var(--dsw-alias-brand-primary); margin-top:1px; }

      .dsh-rec-progress { height:7px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); overflow:hidden; border:1px solid var(--dsw-alias-border-l2); }
      .dsh-rec-progress > i { display:block; height:100%; border-radius:999px; background:var(--dsw-alias-brand-primary); transition:width .25s ease; }
      .dsh-rec-progress-row { display:flex; align-items:center; gap:10px; }
      .dsh-rec-progress-row .dsh-rec-progress { flex:1; min-width:80px; }
      .dsh-rec-progress-text { flex:none; font-size:11.5px; color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }

      .dsh-rec-table { width:100%; border-collapse:collapse; font-size:12px; }
      .dsh-rec-table th, .dsh-rec-table td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--dsw-alias-border-l2); vertical-align:middle; }
      .dsh-rec-table th { font-size:10.5px; font-weight:600; color:var(--dsw-alias-label-secondary); text-transform:uppercase; letter-spacing:.03em; white-space:nowrap; }
      .dsh-rec-table tr:last-child td { border-bottom:0; }
      .dsh-rec-table tbody tr:hover { background:var(--dsw-alias-interactive-bg-hover); }
      .dsh-rec-table .is-num { font-variant-numeric:tabular-nums; white-space:nowrap; }
      .dsh-rec-table .is-actions { text-align:right; white-space:nowrap; }
      .dsh-rec-file-row.is-busy { opacity:.6; }

      .dsh-rec-log { max-height:200px; overflow:auto; padding:10px 12px; border-radius:9px; background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l2); font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace); font-size:11px; line-height:1.6; }
      .dsh-rec-log-line { display:flex; gap:8px; }
      .dsh-rec-log-time { flex:none; color:var(--dsw-alias-label-tertiary); }
      .dsh-rec-log-line.is-error { color:var(--dsw-alias-state-error-primary); }

      .dsh-rec-settings { display:flex; flex-direction:column; gap:14px; max-width:860px; }
      .dsh-rec-form-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
      .dsh-rec-kv { display:grid; grid-template-columns:auto minmax(0,1fr); gap:6px 12px; font-size:12px; align-items:baseline; }
      .dsh-rec-kv dt { color:var(--dsw-alias-label-secondary); white-space:nowrap; }
      .dsh-rec-kv dd { margin:0; overflow-wrap:anywhere; }
      .dsh-rec-copy-line { display:flex; align-items:center; gap:8px; min-width:0; }
      .dsh-rec-copy-line .dsh-rec-input { flex:1; }

      .dsh-rec-toast { position:sticky; bottom:0; z-index:2; align-self:center; margin-top:auto; padding:7px 14px; border-radius:999px; border:1px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); font-size:12px; box-shadow:0 4px 14px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent); }

      .dsh-rec-spinner { width:14px; height:14px; border-radius:50%; border:2px solid color-mix(in srgb, var(--dsw-alias-label-secondary) 35%, transparent); border-top-color:var(--dsw-alias-brand-primary); animation:dsh-rec-spin .8s linear infinite; }
      @keyframes dsh-rec-spin { to { transform:rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .dsh-rec-spinner { animation:none; } .dsh-rec-progress > i { transition:none; } }

      @media (max-width: 900px) {
        .dsh-rec-head, .dsh-rec-tabs { padding-left:16px; padding-right:16px; }
        .dsh-rec-body { padding:14px 16px 20px; }
        .dsh-rec-lib { grid-template-columns:minmax(0,1fr); }
      }
      `;

      // plugin/src-client/components/Panel.js
      var import_react7 = require("react");

      // plugin/src-client/api.js
      var API_PREFIX = "/api/recording";
      var ApiError = class extends Error {
        constructor(message, status, body) {
          super(message);
          this.name = "ApiError";
          this.status = status;
          this.body = body;
        }
      };
      async function request(path, options = {}) {
        const { method = "GET", body, signal, headers, rawBody = false } = options;
        const init = { method, signal, headers: { ...headers || {} } };
        if (body !== void 0) {
          if (!rawBody) init.headers["Content-Type"] = "application/json";
          init.body = rawBody ? body : JSON.stringify(body);
        }
        let response;
        try {
          response = await fetch(`${API_PREFIX}${path}`, init);
        } catch (error) {
          if (error && error.name === "AbortError") throw error;
          throw new ApiError(error && error.message ? error.message : "Network request failed", 0, null);
        }
        const contentType = response.headers.get("content-type") || "";
        let payload = null;
        if (contentType.includes("application/json")) {
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
        }
        if (!response.ok) {
          const message = payload && typeof payload.error === "string" && payload.error || `HTTP ${response.status} ${response.statusText}`.trim();
          throw new ApiError(message, response.status, payload);
        }
        return payload;
      }
      var api = {
        status: () => request("/status"),
        list: () => request("/list"),
        transcript: (id) => request(`/transcript?id=${encodeURIComponent(id)}`),
        jobs: (jobId) => request(`/jobs?id=${encodeURIComponent(jobId)}`),
        transcribe: (id, language) => request("/transcribe", { method: "POST", body: { id, language } }),
        rename: (id, title) => request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: { title } }),
        remove: (id) => request(`/${encodeURIComponent(id)}`, { method: "DELETE" }),
        importAudio: (payload) => request("/import", { method: "POST", body: payload }),
        importFile: (formData) => request("/import-file", { method: "POST", body: formData, rawBody: true }),
        getConfig: () => request("/config"),
        saveConfig: (config) => request("/config", { method: "POST", body: config }),
        rotateToken: () => request("/watch/rotate-token", { method: "POST", body: {} }),
        // Native CoreBluetooth bridge (macOS Host).
        deviceStatus: () => request("/device/status"),
        deviceScan: (payload) => request("/device/scan", { method: "POST", body: payload }),
        deviceList: (payload) => request("/device/list", { method: "POST", body: payload }),
        deviceExport: (payload) => request("/device/export", { method: "POST", body: payload }),
        deviceRecord: (payload) => request("/device/record", { method: "POST", body: payload }),
        deviceDelete: (payload) => request("/device/delete", { method: "POST", body: payload })
      };
      async function copyText(text) {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        if (typeof document === "undefined") throw new Error("Clipboard is unavailable");
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
          ok = document.execCommand("copy");
        } finally {
          document.body.removeChild(area);
        }
        if (!ok) throw new Error("Clipboard is unavailable");
        return true;
      }
      var RecordingEventStream = class {
        #source = null;
        #disposed = false;
        #retryTimer = null;
        /**
         * @param {{
         *   onEvent: (eventName: string, data: any) => void,
         *   onStatus?: (status: 'open'|'closed'|'error') => void,
         * }} handlers
         */
        constructor({ onEvent, onStatus }) {
          this.onEvent = onEvent;
          this.onStatus = onStatus || (() => {
          });
        }
        connect() {
          if (this.#disposed) return;
          if (typeof EventSource === "undefined") {
            this.onStatus("error");
            return;
          }
          this.closeSource();
          let source;
          try {
            source = new EventSource(`${API_PREFIX}/events`);
          } catch {
            this.onStatus("error");
            this.scheduleRetry();
            return;
          }
          this.#source = source;
          source.addEventListener("open", () => {
            if (!this.#disposed) this.onStatus("open");
          });
          const relay = (eventName) => (event) => {
            if (this.#disposed) return;
            let data = null;
            try {
              data = JSON.parse(event.data);
            } catch {
              data = null;
            }
            this.onEvent(eventName, data);
          };
          source.addEventListener("recording", relay("recording"));
          source.addEventListener("job", relay("job"));
          source.onerror = () => {
            if (this.#disposed) return;
            this.onStatus("error");
            if (source.readyState === 2) this.scheduleRetry();
          };
        }
        scheduleRetry() {
          if (this.#disposed || this.#retryTimer) return;
          this.#retryTimer = setTimeout(() => {
            this.#retryTimer = null;
            if (!this.#disposed) {
              this.onStatus("closed");
              this.connect();
            }
          }, 3e3);
        }
        closeSource() {
          if (this.#source) {
            try {
              this.#source.close();
            } catch {
            }
            this.#source = null;
            this.onStatus("closed");
          }
          if (this.#retryTimer) {
            clearTimeout(this.#retryTimer);
            this.#retryTimer = null;
          }
        }
        dispose() {
          this.#disposed = true;
          this.closeSource();
        }
      };

      // plugin/src-client/components/ui.js
      var import_react2 = require("react");

      // plugin/src-client/components/icons.js
      var import_react = require("react");
      var STROKE = {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      };
      var ICONS = {
        library: [
          (0, import_react.createElement)("path", { key: "a", d: "M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v13A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5z", ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M13 6.5A1.5 1.5 0 0 1 14.5 5h4A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-4a1.5 1.5 0 0 1-1.5-1.5z", ...STROKE }),
          (0, import_react.createElement)("path", { key: "c", d: "M7.5 8.5v3M16.5 8.5v3", ...STROKE })
        ],
        bean: [
          (0, import_react.createElement)("rect", { key: "a", x: 4, y: 7, width: 16, height: 11, rx: 5, ...STROKE }),
          (0, import_react.createElement)("circle", { key: "b", cx: 9.5, cy: 12.5, r: 1.6, ...STROKE }),
          (0, import_react.createElement)("circle", { key: "c", cx: 14.5, cy: 12.5, r: 1.6, ...STROKE }),
          (0, import_react.createElement)("path", { key: "d", d: "M12 7V4.5M9.5 4.5h5", ...STROKE })
        ],
        watch: [
          (0, import_react.createElement)("rect", { key: "a", x: 7, y: 6, width: 10, height: 12, rx: 2.5, ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M9.5 6V3.5h5V6M9.5 18v2.5h5V18M12 10v2.4l1.6 1", ...STROKE })
        ],
        settings: [
          (0, import_react.createElement)("circle", { key: "a", cx: 12, cy: 12, r: 3, ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18", ...STROKE })
        ],
        refresh: [
          (0, import_react.createElement)("path", { key: "a", d: "M20 11a8 8 0 1 0-2.3 5.7", ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M20 4.5V11h-6.3", ...STROKE })
        ],
        play: [(0, import_react.createElement)("path", { key: "a", d: "M8 5.5v13l11-6.5z", ...STROKE })],
        pause: [(0, import_react.createElement)("path", { key: "a", d: "M9 5.5v13M15 5.5v13", ...STROKE })],
        mic: [
          (0, import_react.createElement)("rect", { key: "a", x: 9, y: 3.5, width: 6, height: 11, rx: 3, ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6", ...STROKE })
        ],
        copy: [
          (0, import_react.createElement)("rect", { key: "a", x: 8.5, y: 8.5, width: 11.5, height: 11.5, rx: 2, ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M15.5 8.5V6A2 2 0 0 0 13.5 4h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2H8.5", ...STROKE })
        ],
        trash: [
          (0, import_react.createElement)("path", { key: "a", d: "M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5 7.5 20h9l1-13.5M10.5 10v6M13.5 10v6", ...STROKE })
        ],
        edit: [
          (0, import_react.createElement)("path", { key: "a", d: "m14.5 5.5 4 4L9 19H5v-4z", ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "m12.5 7.5 4 4", ...STROKE })
        ],
        check: [(0, import_react.createElement)("path", { key: "a", d: "m5 12.5 4.5 4.5L19 7", ...STROKE })],
        alert: [
          (0, import_react.createElement)("path", { key: "a", d: "M12 4 2.8 20h18.4z", ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M12 9.5v4.5M12 17.3v.2", ...STROKE })
        ],
        info: [
          (0, import_react.createElement)("circle", { key: "a", cx: 12, cy: 12, r: 8.5, ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M12 11v5.5M12 7.8v.2", ...STROKE })
        ],
        search: [
          (0, import_react.createElement)("circle", { key: "a", cx: 11, cy: 11, r: 6.5, ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "m16 16 4 4", ...STROKE })
        ],
        download: [
          (0, import_react.createElement)("path", { key: "a", d: "M12 4v10.5M7.5 10.5 12 15l4.5-4.5M5 19.5h14", ...STROKE })
        ],
        upload: [
          (0, import_react.createElement)("path", { key: "a", d: "M12 15V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14", ...STROKE })
        ],
        bluetooth: [
          (0, import_react.createElement)("path", { key: "a", d: "M8 7.5 16 16.5 12 20V4l4 3.5L8 16.5", ...STROKE })
        ],
        x: [(0, import_react.createElement)("path", { key: "a", d: "M6 6l12 12M18 6 6 18", ...STROKE })],
        file: [
          (0, import_react.createElement)("path", { key: "a", d: "M6 4h7l5 5v11H6z", ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M13 4v5h5", ...STROKE })
        ],
        link: [
          (0, import_react.createElement)("path", { key: "a", d: "M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3", ...STROKE }),
          (0, import_react.createElement)("path", { key: "b", d: "M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.3-1.3", ...STROKE })
        ],
        plug: [
          (0, import_react.createElement)("path", { key: "a", d: "M9 3.5v5M15 3.5v5M6 8.5h12v2a6 6 0 0 1-12 0zM12 16.5V21", ...STROKE })
        ],
        wave: [
          (0, import_react.createElement)("path", { key: "a", d: "M3 12h2M7 8.5v7M11 5.5v13M15 8.5v7M19 11h2", ...STROKE })
        ]
      };
      function Icon(props) {
        const { name, size = 18 } = props || {};
        const shapes = ICONS[name] || ICONS.info;
        return (0, import_react.createElement)(
          "svg",
          {
            width: size,
            height: size,
            viewBox: "0 0 24 24",
            "aria-hidden": true,
            focusable: "false",
            style: { display: "block" }
          },
          shapes
        );
      }

      // plugin/src-client/components/ui.js
      var EMPTY_SNAPSHOT = Object.freeze({ active: "zh", locales: [], revision: 0 });
      var PanelContext = (0, import_react2.createContext)(null);
      function usePanel() {
        const value = (0, import_react2.useContext)(PanelContext);
        if (!value) throw new Error("Recording panel context is missing");
        return value;
      }
      function useLocale(ctx) {
        const subscribe = (0, import_react2.useCallback)(
          (onChange) => {
            try {
              const dispose = ctx.locale.subscribe(onChange);
              return typeof dispose === "function" ? dispose : () => {
              };
            } catch {
              return () => {
              };
            }
          },
          [ctx]
        );
        const getSnapshot = (0, import_react2.useCallback)(() => {
          try {
            return ctx.locale.getSnapshot() || EMPTY_SNAPSHOT;
          } catch {
            return EMPTY_SNAPSHOT;
          }
        }, [ctx]);
        const snapshot = (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot) || EMPTY_SNAPSHOT;
        const lang = typeof snapshot.active === "string" && snapshot.active.startsWith("zh") ? "zh" : "en";
        const t = (0, import_react2.useCallback)(
          (key, params) => {
            try {
              const bound = ctx.locale.bind(NS);
              const value = bound(key, params);
              if (typeof value === "string" && value.length > 0) return value;
            } catch {
            }
            return fallbackTranslate(key, params);
          },
          [ctx]
        );
        return { t, lang, snapshot };
      }
      function useCopy(t) {
        const [copied, setCopied] = (0, import_react2.useState)(false);
        const [error, setError] = (0, import_react2.useState)(null);
        const timer = (0, import_react2.useRef)(null);
        (0, import_react2.useEffect)(
          () => () => {
            if (timer.current) clearTimeout(timer.current);
          },
          []
        );
        const copy = (0, import_react2.useCallback)(
          async (text, message) => {
            try {
              await copyText(text);
              setCopied(true);
              setError(null);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => setCopied(false), 1600);
              return message || t("app.copied");
            } catch {
              setCopied(false);
              setError(t("app.copyFailed"));
              return null;
            }
          },
          [t]
        );
        return { copied, error, copy };
      }
      function useToast() {
        const [toast, setToast] = (0, import_react2.useState)(null);
        const timer = (0, import_react2.useRef)(null);
        (0, import_react2.useEffect)(
          () => () => {
            if (timer.current) clearTimeout(timer.current);
          },
          []
        );
        const notify = (0, import_react2.useCallback)((message) => {
          if (!message) return;
          setToast(message);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setToast(null), 2600);
        }, []);
        return { toast, notify };
      }
      function Btn(props) {
        const { variant = "default", size = "md", icon, children, className = "", type = "button", ...rest } = props;
        const classes = [
          "dsh-rec-btn",
          variant === "primary" ? "is-primary" : "",
          variant === "danger" ? "is-danger" : "",
          variant === "ghost" ? "is-ghost" : "",
          size === "sm" ? "is-sm" : "",
          className
        ].filter(Boolean).join(" ");
        return (0, import_react2.createElement)(
          "button",
          { ...rest, type, className: classes },
          icon ? (0, import_react2.createElement)(Icon, { name: icon, size: size === "sm" ? 14 : 16 }) : null,
          children
        );
      }
      function Alert(props) {
        const { kind = "info", title, children, action } = props;
        const classes = ["dsh-rec-alert", kind === "error" ? "is-error" : kind === "warn" ? "is-warn" : kind === "success" ? "is-success" : ""].filter(Boolean).join(" ");
        const iconName = kind === "error" ? "alert" : kind === "success" ? "check" : kind === "warn" ? "alert" : "info";
        return (0, import_react2.createElement)(
          "div",
          { className: classes, role: kind === "error" ? "alert" : void 0 },
          (0, import_react2.createElement)(Icon, { name: iconName, size: 16 }),
          (0, import_react2.createElement)("div", { className: "dsh-rec-alert-body" }, title ? (0, import_react2.createElement)("div", { className: "dsh-rec-alert-title" }, title) : null, children ? (0, import_react2.createElement)("div", { className: "dsh-rec-alert-hint" }, children) : null),
          action || null
        );
      }
      function Empty(props) {
        const { title, hint, icon = "info", children } = props;
        return (0, import_react2.createElement)(
          "div",
          { className: "dsh-rec-empty" },
          (0, import_react2.createElement)(Icon, { name: icon, size: 28 }),
          title ? (0, import_react2.createElement)("div", { className: "dsh-rec-empty-title" }, title) : null,
          hint ? (0, import_react2.createElement)("div", { className: "dsh-rec-empty-hint" }, hint) : null,
          children || null
        );
      }
      function Badge(props) {
        const { kind = "", children } = props;
        return (0, import_react2.createElement)("span", { className: `dsh-rec-badge${kind ? ` is-${kind}` : ""}` }, children);
      }
      function Spinner() {
        return (0, import_react2.createElement)("span", { className: "dsh-rec-spinner", "aria-hidden": true });
      }
      function Progress(props) {
        const value = Math.max(0, Math.min(100, Number(props.value) || 0));
        const label = props.label ? (0, import_react2.createElement)("span", { className: "dsh-rec-progress-text" }, props.label) : null;
        return (0, import_react2.createElement)(
          "div",
          { className: "dsh-rec-progress-row" },
          (0, import_react2.createElement)("div", { className: "dsh-rec-progress", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(value) }, (0, import_react2.createElement)("i", { style: { width: `${value}%` } })),
          label
        );
      }
      function Input(props) {
        const { className = "", ...rest } = props;
        return (0, import_react2.createElement)("input", { ...rest, className: `dsh-rec-input ${className}`.trim() });
      }
      function Select(props) {
        const { className = "", children, ...rest } = props;
        return (0, import_react2.createElement)("select", { ...rest, className: `dsh-rec-select ${className}`.trim() }, children);
      }

      // plugin/src-client/components/LibraryPage.js
      var import_react3 = require("react");

      // plugin/src-client/format.js
      function formatDuration(ms) {
        if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "—";
        const totalSeconds = Math.round(ms / 1e3);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor(totalSeconds % 3600 / 60);
        const seconds = totalSeconds % 60;
        const pad = (value) => String(value).padStart(2, "0");
        return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
      }
      function formatBytes(bytes) {
        if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "—";
        if (bytes < 1024) return `${Math.round(bytes)} B`;
        const units = ["KB", "MB", "GB", "TB"];
        let value = bytes / 1024;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
          value /= 1024;
          unit += 1;
        }
        const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
        return `${value.toFixed(digits)} ${units[unit]}`;
      }
      function intlLocale(lang) {
        return lang === "zh" ? "zh-CN" : "en-US";
      }
      function formatDateTime(value, lang = "zh") {
        if (value == null) return "—";
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        try {
          return new Intl.DateTimeFormat(intlLocale(lang), {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }).format(date);
        } catch {
          return date.toISOString().replace("T", " ").slice(0, 16);
        }
      }
      function maskToken(token) {
        if (typeof token !== "string" || token.length === 0) return "";
        if (token.length <= 10) return "••••••";
        return `${token.slice(0, 4)}…${token.slice(-4)}`;
      }
      function fileNameFromPath(path) {
        if (typeof path !== "string" || path.length === 0) return "";
        const parts = path.split(/[\\/]/);
        return parts[parts.length - 1] || path;
      }
      function recordedAtFromFileId(fileId, now = Date.now()) {
        const value = Number(fileId);
        if (!Number.isFinite(value) || value <= 0) return null;
        const ms = value * 1e3;
        const earliest = Date.UTC(2e3, 0, 1);
        const latest = now + 24 * 60 * 60 * 1e3;
        if (ms < earliest || ms > latest) return null;
        return new Date(ms).toISOString();
      }
      function describeDeviceError(error) {
        const code = error && typeof error === "object" ? error.code : null;
        const params = error && typeof error === "object" && error.params || {};
        const known = /* @__PURE__ */ new Set([
          "unsupported",
          "not_secure",
          "cancelled",
          "cancelled_all",
          "security",
          "network",
          "connect_failed",
          "timeout",
          "not_connected",
          "file_missing",
          "device_rejected_export",
          "key_check_failed",
          "session_failed",
          "handshake_failed",
          "export_incomplete",
          "delete_rejected",
          "empty_audio"
        ]);
        if (typeof code === "string" && known.has(code)) {
          const key = `bean.error.${code}`;
          if (code === "connect_failed" || code === "timeout") {
            const errorMessage = params.error || error && error.message || "";
            return { key, params: errorMessage ? { ...params, error: errorMessage } : { ...params } };
          }
          return { key, params };
        }
        const message = error && typeof error === "object" && error.message ? error.message : String(error);
        return { key: null, message };
      }
      function deviceErrorText(t, error) {
        const described = describeDeviceError(error);
        if (!described.key) return described.message || t("app.error");
        const params = { ...described.params };
        if (params.labelKey) {
          params.label = t(params.labelKey, params.labelParams || {});
        }
        if (params.errorKey) {
          params.error = t(params.errorKey);
          delete params.errorKey;
        }
        if (params.error == null && error && typeof error === "object" && error.message) {
          params.error = error.message;
        }
        return t(described.key, params);
      }

      // plugin/src-client/components/LibraryPage.js
      var AUDIO_URL = (id) => `/api/recording/audio?id=${encodeURIComponent(id)}`;
      function statusKind(status) {
        if (status === "done") return "done";
        if (status === "running") return "running";
        if (status === "queued") return "queued";
        if (status === "failed") return "failed";
        return "";
      }
      function LibraryPage() {
        const { t, lang, notify } = usePanel();
        const [recordings, setRecordings] = (0, import_react3.useState)([]);
        const [loading, setLoading] = (0, import_react3.useState)(true);
        const [error, setError] = (0, import_react3.useState)(null);
        const [query, setQuery] = (0, import_react3.useState)("");
        const [selectedId, setSelectedId] = (0, import_react3.useState)(null);
        const [streamStatus, setStreamStatus] = (0, import_react3.useState)("closed");
        const [jobs, setJobs] = (0, import_react3.useState)({});
        const [asrLanguage, setAsrLanguage] = (0, import_react3.useState)(null);
        const [busy, setBusy] = (0, import_react3.useState)({});
        const [transcript, setTranscript] = (0, import_react3.useState)({ loading: false, data: null, error: null, showRaw: false });
        const [rename, setRename] = (0, import_react3.useState)(null);
        const [deleteTarget, setDeleteTarget] = (0, import_react3.useState)(null);
        const { copy, copied } = useCopy(t);
        const alive = (0, import_react3.useRef)(true);
        const refreshTimer = (0, import_react3.useRef)(null);
        const selectedRef = (0, import_react3.useRef)(null);
        selectedRef.current = selectedId;
        const transcriptRef = (0, import_react3.useRef)(transcript);
        transcriptRef.current = transcript;
        (0, import_react3.useEffect)(() => {
          alive.current = true;
          return () => {
            alive.current = false;
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
          };
        }, []);
        const loadList = (0, import_react3.useCallback)(
          async ({ silent = false } = {}) => {
            if (!silent) setLoading(true);
            try {
              const data = await api.list();
              if (!alive.current) return;
              setRecordings(Array.isArray(data?.recordings) ? data.recordings : []);
              setError(null);
            } catch (loadError) {
              if (!alive.current) return;
              setError(loadError.message || String(loadError));
            } finally {
              if (alive.current && !silent) setLoading(false);
            }
          },
          []
        );
        const loadTranscript = (0, import_react3.useCallback)(async (id) => {
          if (!id) return;
          setTranscript((previous) => ({ ...previous, loading: true, error: null }));
          try {
            const data = await api.transcript(id);
            if (!alive.current) return;
            setTranscript((previous) => ({ ...previous, loading: false, data, error: null }));
          } catch (transcriptError) {
            if (!alive.current) return;
            setTranscript((previous) => ({
              ...previous,
              loading: false,
              data: null,
              error: transcriptError.message || String(transcriptError)
            }));
          }
        }, []);
        const scheduleRefresh = (0, import_react3.useCallback)(() => {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => {
            refreshTimer.current = null;
            loadList({ silent: true });
          }, 260);
        }, [loadList]);
        (0, import_react3.useEffect)(() => {
          loadList();
          api.status().then((status) => {
            if (alive.current) setAsrLanguage(status?.asr?.language || null);
          }).catch(() => {
          });
        }, [loadList]);
        (0, import_react3.useEffect)(() => {
          const stream = new RecordingEventStream({
            onEvent: (eventName, data) => {
              if (!alive.current) return;
              if (eventName === "recording") {
                if (data?.type === "updated" && data.recording && data.recording.id === selectedRef.current) {
                  setRecordings((previous) => previous.map((item) => item.id === data.recording.id ? data.recording : item));
                }
                scheduleRefresh();
              } else if (eventName === "job" && data?.job) {
                const job = data.job;
                setJobs((previous) => ({ ...previous, [job.recordingId]: job }));
                if (job.status === "done" || job.status === "failed") {
                  scheduleRefresh();
                  if (job.recordingId === selectedRef.current) {
                    if (job.status === "done") loadTranscript(job.recordingId);
                    else setTranscript((previous) => ({ ...previous, loading: false, data: null, error: job.error || null }));
                  }
                }
              }
            },
            onStatus: (status) => {
              if (alive.current) setStreamStatus(status);
            }
          });
          stream.connect();
          return () => stream.dispose();
        }, [scheduleRefresh, loadTranscript]);
        const selected = (0, import_react3.useMemo)(
          () => recordings.find((item) => item.id === selectedId) || null,
          [recordings, selectedId]
        );
        (0, import_react3.useEffect)(() => {
          if (!selected) {
            setTranscript({ loading: false, data: null, error: null, showRaw: false });
            return;
          }
          if (selected.transcriptStatus === "done") {
            loadTranscript(selected.id);
          } else {
            setTranscript({ loading: false, data: null, error: null, showRaw: false });
          }
        }, [selected?.id, selected?.transcriptStatus, loadTranscript]);
        (0, import_react3.useEffect)(() => {
          if (selectedId && !recordings.some((item) => item.id === selectedId)) setSelectedId(null);
        }, [recordings, selectedId]);
        const filtered = (0, import_react3.useMemo)(() => {
          const needle = query.trim().toLowerCase();
          if (!needle) return recordings;
          return recordings.filter((item) => {
            const haystack = [item.title, item.snippet, item.source, item.transcriptPath || ""].join(" ").toLowerCase();
            return haystack.includes(needle);
          });
        }, [recordings, query]);
        const markBusy = (id, value) => setBusy((previous) => ({ ...previous, [id]: value }));
        const handleTranscribe = async (recording) => {
          markBusy(recording.id, true);
          try {
            await api.transcribe(recording.id, asrLanguage || void 0);
            notify(t("library.toast.transcribeQueued"));
            setRecordings(
              (previous) => previous.map((item) => item.id === recording.id ? { ...item, transcriptStatus: "queued", transcriptError: null } : item)
            );
          } catch (transcribeError) {
            notify(t("library.error.transcribeFailed", { error: transcribeError.message }));
          } finally {
            markBusy(recording.id, false);
          }
        };
        const handleRename = async () => {
          if (!rename) return;
          const title = rename.value.trim();
          if (!title) return;
          markBusy(rename.id, true);
          try {
            const data = await api.rename(rename.id, title);
            if (data?.recording) {
              setRecordings((previous) => previous.map((item) => item.id === data.recording.id ? data.recording : item));
            } else {
              scheduleRefresh();
            }
            setRename(null);
            notify(t("library.toast.renamed"));
          } catch (renameError) {
            notify(t("library.error.renameFailed", { error: renameError.message }));
          } finally {
            markBusy(rename.id, false);
          }
        };
        const handleDelete = async (recording) => {
          markBusy(recording.id, true);
          try {
            await api.remove(recording.id);
            setRecordings((previous) => previous.filter((item) => item.id !== recording.id));
            if (selectedId === recording.id) setSelectedId(null);
            setDeleteTarget(null);
            notify(t("library.toast.deleted"));
          } catch (deleteError) {
            notify(t("library.error.deleteFailed", { error: deleteError.message }));
          } finally {
            markBusy(recording.id, false);
          }
        };
        const handleCopyPath = async (recording, audio = false) => {
          const useAudio = audio || !recording.transcriptPath;
          const path = useAudio ? recording.audioPath : recording.transcriptPath;
          if (!path) return;
          const message = await copy(path, t(useAudio ? "library.toast.copiedAudio" : "library.toast.copiedPath"));
          if (message) notify(message);
        };
        const formatAudio = (recording) => (recording.format || "").toUpperCase();
        return (0, import_react3.createElement)(
          "div",
          { className: "dsh-rec-stack" },
          (0, import_react3.createElement)(
            "div",
            { className: "dsh-rec-row" },
            (0, import_react3.createElement)("div", null, (0, import_react3.createElement)("h2", { className: "dsh-rec-card-title" }, (0, import_react3.createElement)(Icon, { name: "library", size: 17 }), t("library.title")), (0, import_react3.createElement)("p", { className: "dsh-rec-subtle" }, t("library.hint"))),
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-row dsh-rec-row-end" },
              (0, import_react3.createElement)(Badge, { kind: streamStatus === "open" ? "done" : "failed" }, streamStatus === "open" ? "SSE" : "SSE…"),
              (0, import_react3.createElement)(Btn, { icon: "refresh", onClick: () => loadList(), disabled: loading, size: "sm" }, t("app.refresh"))
            )
          ),
          error ? (0, import_react3.createElement)(
            Alert,
            { kind: "error", title: t("library.error.loadFailed", { error }), action: (0, import_react3.createElement)(Btn, { size: "sm", onClick: () => loadList() }, t("app.retry")) },
            null
          ) : null,
          (0, import_react3.createElement)(
            "div",
            { className: "dsh-rec-lib" },
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-lib-list" },
              (0, import_react3.createElement)(
                "div",
                { className: "dsh-rec-lib-toolbar" },
                (0, import_react3.createElement)(Icon, { name: "search", size: 15 }),
                (0, import_react3.createElement)(Input, {
                  value: query,
                  placeholder: t("library.search"),
                  "aria-label": t("library.search"),
                  onChange: (event) => setQuery(event.target.value)
                }),
                (0, import_react3.createElement)("span", { className: "dsh-rec-subtle" }, t("app.count", { count: filtered.length }))
              ),
              (0, import_react3.createElement)(
                "div",
                { className: "dsh-rec-lib-scroll" },
                loading ? (0, import_react3.createElement)(Empty, { icon: "wave", title: t("app.loading") }) : filtered.length === 0 ? (0, import_react3.createElement)(Empty, {
                  icon: "library",
                  title: recordings.length === 0 ? t("library.empty.title") : t("library.list.empty"),
                  hint: recordings.length === 0 ? t("library.empty.hint") : null
                }) : filtered.map(
                  (recording) => (0, import_react3.createElement)(
                    "button",
                    {
                      key: recording.id,
                      type: "button",
                      className: "dsh-rec-item",
                      "aria-current": selectedId === recording.id ? "true" : "false",
                      onClick: () => setSelectedId(recording.id)
                    },
                    (0, import_react3.createElement)(
                      "div",
                      { className: "dsh-rec-item-top" },
                      (0, import_react3.createElement)("span", { className: "dsh-rec-item-title" }, recording.title || recording.id),
                      (0, import_react3.createElement)(Badge, { kind: statusKind(recording.transcriptStatus) }, t(`status.${recording.transcriptStatus}`))
                    ),
                    (0, import_react3.createElement)(
                      "div",
                      { className: "dsh-rec-item-meta" },
                      (0, import_react3.createElement)("span", null, formatDateTime(recording.recordedAt, lang)),
                      (0, import_react3.createElement)("span", null, formatDuration(recording.durationMs)),
                      (0, import_react3.createElement)("span", null, t(`source.${recording.source}`))
                    ),
                    (0, import_react3.createElement)("div", { className: "dsh-rec-item-snippet" }, recording.snippet || t("library.snippetEmpty"))
                  )
                )
              )
            ),
            (0, import_react3.createElement)(DetailPane, {
              t,
              lang,
              recording: selected,
              transcript,
              jobs,
              busy,
              copied,
              formatAudio,
              onTranscribe: handleTranscribe,
              onRename: (recording) => setRename({ id: recording.id, value: recording.title || "" }),
              onDelete: (recording) => setDeleteTarget(recording),
              onCopyPath: handleCopyPath,
              onToggleRaw: () => setTranscript((previous) => ({ ...previous, showRaw: !previous.showRaw })),
              onReloadTranscript: () => selected && loadTranscript(selected.id),
              onSelect: setSelectedId,
              rename,
              setRename,
              deleteTarget,
              onConfirmRename: handleRename,
              onCancelRename: () => setRename(null),
              onConfirmDelete: handleDelete,
              onCancelDelete: () => setDeleteTarget(null)
            })
          )
        );
      }
      function DetailPane(props) {
        const {
          t,
          lang,
          recording,
          transcript,
          jobs,
          busy,
          copied,
          formatAudio,
          onTranscribe,
          onRename,
          onDelete,
          onCopyPath,
          onToggleRaw,
          onReloadTranscript,
          rename,
          setRename,
          deleteTarget,
          onConfirmRename,
          onCancelRename,
          onConfirmDelete,
          onCancelDelete
        } = props;
        if (!recording) {
          return (0, import_react3.createElement)(
            "div",
            { className: "dsh-rec-detail" },
            (0, import_react3.createElement)(Empty, { icon: "file", title: t("library.detail.emptyTitle"), hint: t("library.detail.emptyHint") })
          );
        }
        const job = jobs[recording.id];
        const isBusy = Boolean(busy[recording.id]);
        const running = recording.transcriptStatus === "running" || recording.transcriptStatus === "queued";
        const progress = job && typeof job.progress === "number" ? Math.round(job.progress * 100) : null;
        const transcriptText = transcript.data?.text || "";
        const transcriptMarkdown = transcript.data?.markdown || "";
        const atPath = recording.transcriptPath || recording.audioPath;
        return (0, import_react3.createElement)(
          "div",
          { className: "dsh-rec-detail" },
          (0, import_react3.createElement)(
            "div",
            { className: "dsh-rec-detail-head" },
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-detail-title-row" },
              (0, import_react3.createElement)("div", { className: "dsh-rec-detail-title" }, recording.title || recording.id),
              (0, import_react3.createElement)(Badge, { kind: statusKind(recording.transcriptStatus) }, t(`status.${recording.transcriptStatus}`))
            ),
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-row" },
              (0, import_react3.createElement)(Btn, { size: "sm", icon: "copy", onClick: () => onCopyPath(recording, false), disabled: !atPath }, copied ? t("app.copied") : t("library.copyAtPath")),
              (0, import_react3.createElement)(Btn, { size: "sm", icon: "edit", onClick: () => onRename(recording) }, t("app.rename")),
              (0, import_react3.createElement)(Btn, { size: "sm", icon: "refresh", variant: "primary", disabled: isBusy || running, onClick: () => onTranscribe(recording) }, recording.transcriptStatus === "done" ? t("library.retranscribe") : t("library.transcribe")),
              (0, import_react3.createElement)(
                "div",
                { className: "dsh-rec-row-end" },
                deleteTarget && deleteTarget.id === recording.id ? [(0, import_react3.createElement)(Btn, { key: "no", size: "sm", onClick: onCancelDelete }, t("app.cancel")), (0, import_react3.createElement)(Btn, { key: "yes", size: "sm", variant: "danger", disabled: isBusy, onClick: () => onConfirmDelete(recording) }, t("app.confirm"))] : (0, import_react3.createElement)(Btn, { size: "sm", variant: "danger", icon: "trash", onClick: () => onDelete(recording) }, t("app.delete"))
              )
            ),
            deleteTarget && deleteTarget.id === recording.id ? (0, import_react3.createElement)(Alert, { kind: "warn", title: t("library.deleteConfirm", { title: recording.title || recording.id }) }) : null,
            rename && rename.id === recording.id ? (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-row" },
              (0, import_react3.createElement)(Input, {
                value: rename.value,
                autoFocus: true,
                placeholder: t("library.renamePlaceholder"),
                onChange: (event) => setRename({ ...rename, value: event.target.value }),
                onKeyDown: (event) => {
                  if (event.key === "Enter") onConfirmRename();
                  if (event.key === "Escape") onCancelRename();
                }
              }),
              (0, import_react3.createElement)(Btn, { size: "sm", variant: "primary", disabled: isBusy || !rename.value.trim(), onClick: onConfirmRename }, t("app.save")),
              (0, import_react3.createElement)(Btn, { size: "sm", onClick: onCancelRename }, t("app.cancel"))
            ) : null
          ),
          (0, import_react3.createElement)(
            "div",
            { className: "dsh-rec-detail-scroll" },
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-field" },
              (0, import_react3.createElement)("span", { className: "dsh-rec-field-label" }, `${t("library.audio")} · ${formatAudio(recording)}`),
              (0, import_react3.createElement)("audio", { className: "dsh-rec-audio", controls: true, preload: "metadata", src: AUDIO_URL(recording.id) }),
              (0, import_react3.createElement)("span", { className: "dsh-rec-field-hint" }, t("library.audioUnsupported"))
            ),
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-meta-grid" },
              metaItem(t("library.recordedAt"), formatDateTime(recording.recordedAt, lang)),
              metaItem(t("library.importedAt"), formatDateTime(recording.importedAt, lang)),
              metaItem(t("library.duration"), formatDuration(recording.durationMs)),
              metaItem(t("library.size"), formatBytes(recording.sizeBytes)),
              metaItem(t("library.format"), formatAudio(recording)),
              metaItem(t("library.source"), t(`source.${recording.source}`)),
              metaItem(t("library.provider"), recording.transcriptProvider || t("app.none")),
              metaItem("ID", recording.id),
              recording.deviceFileId != null ? metaItem("deviceFileId", String(recording.deviceFileId)) : null
            ),
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-hintbox" },
              (0, import_react3.createElement)(Icon, { name: "info", size: 15 }),
              (0, import_react3.createElement)(
                "div",
                null,
                (0, import_react3.createElement)("div", null, t("library.copyAtHint")),
                atPath ? (0, import_react3.createElement)("div", { className: "dsh-rec-mono" }, atPath) : null,
                recording.transcriptPath ? (0, import_react3.createElement)("div", null, (0, import_react3.createElement)(Btn, { size: "sm", variant: "ghost", icon: "copy", onClick: () => onCopyPath(recording, true) }, t("library.copyAudioPath"))) : null
              )
            ),
            (0, import_react3.createElement)(
              "div",
              { className: "dsh-rec-transcript" },
              (0, import_react3.createElement)(
                "div",
                { className: "dsh-rec-transcript-head" },
                (0, import_react3.createElement)(Icon, { name: "file", size: 15 }),
                (0, import_react3.createElement)("span", { className: "dsh-rec-transcript-title" }, transcript.data?.path ? fileNameFromPath(transcript.data.path) : t("library.transcriptTitle")),
                transcript.data ? (0, import_react3.createElement)(Btn, { size: "sm", variant: "ghost", onClick: onToggleRaw }, transcript.showRaw ? t("library.transcriptShowText") : t("library.transcriptShowRaw")) : null,
                transcript.data?.path ? (0, import_react3.createElement)(Btn, { size: "sm", variant: "ghost", icon: "copy", onClick: () => onCopyPath(recording, false) }, t("app.copy")) : null
              ),
              (0, import_react3.createElement)(
                "div",
                { style: { padding: "10px 12px" } },
                running ? (0, import_react3.createElement)(
                  "div",
                  { className: "dsh-rec-stack", style: { gap: "8px" } },
                  (0, import_react3.createElement)(
                    "div",
                    { className: "dsh-rec-row" },
                    (0, import_react3.createElement)(Spinner),
                    (0, import_react3.createElement)("span", { className: "dsh-rec-subtle" }, job && progress != null ? t("library.transcriptRunning", { progress }) : t("app.loading"))
                  ),
                  (0, import_react3.createElement)(Progress, { value: progress == null ? 8 : progress })
                ) : recording.transcriptStatus === "failed" ? (0, import_react3.createElement)(Alert, { kind: "error", title: recording.transcriptError || t("status.failed") }) : transcript.loading ? (0, import_react3.createElement)(Empty, { icon: "file", title: t("library.transcriptLoading") }) : transcript.error ? (0, import_react3.createElement)(Alert, {
                  kind: "error",
                  title: t("library.transcriptError", { error: transcript.error }),
                  action: (0, import_react3.createElement)(Btn, { size: "sm", onClick: onReloadTranscript }, t("app.retry"))
                }) : transcript.data && (transcriptText || transcriptMarkdown) ? (0, import_react3.createElement)("pre", { className: "dsh-rec-transcript-body", style: { border: "none", padding: 0, background: "transparent" } }, transcript.showRaw ? transcriptMarkdown : transcriptText) : (0, import_react3.createElement)("span", { className: "dsh-rec-subtle" }, t("library.transcriptEmpty"))
              )
            )
          )
        );
      }
      function metaItem(label, value) {
        return (0, import_react3.createElement)(
          "div",
          { className: "dsh-rec-meta-item", key: label },
          (0, import_react3.createElement)("div", { className: "dsh-rec-meta-label" }, label),
          (0, import_react3.createElement)("div", { className: "dsh-rec-meta-value" }, value)
        );
      }

      // plugin/src-client/components/BeanPage.js
      var import_react4 = require("react");

      // plugin/src-client/nativeD3200Client.js
      /*!
       * soundcore Work / D3200 native Bluetooth client.
       *
       * Every device operation goes through the Host's `/api/recording/device/*`
       * endpoints, where a compiled Swift CoreBluetooth helper talks to the recorder.
       *
       * - the Host reconnects for every command, so `connect()` really means
       *   "scan + read the device once"; `connected` is reset on errors;
       * - `exportRecording` makes the Host decrypt, mux and import the recording, so
       *   callers must not POST `/import` again (check `result.imported`);
       * - errors keep a stable `code` plus the Host's readable detail in `params.detail`.
       */
      var DISCOVERY_MODE = Object.freeze({ precise: "precise", all: "all" });
      function deviceError(code, params = {}, cause) {
        const error = new Error(code);
        error.code = code;
        error.params = params;
        if (cause) error.cause = cause;
        return error;
      }
      function cloneSnapshot(state) {
        if (typeof structuredClone === "function") {
          try {
            return structuredClone(state);
          } catch {
          }
        }
        return {
          ...state,
          files: state.files.map((file) => ({ ...file })),
          logs: state.logs.map((log) => ({ ...log, params: log.params ? { ...log.params } : void 0 })),
          device: state.device ? { ...state.device } : null,
          export: state.export ? { ...state.export } : null
        };
      }
      function initialState() {
        return {
          transport: "native",
          supported: true,
          connected: false,
          connecting: false,
          deviceName: null,
          device: null,
          files: [],
          logs: [],
          error: null,
          export: null,
          recordStatus: 0
        };
      }
      var DEVICE_NAME_PATTERN = /soundcore|d3200|work/i;
      function pickPreferredDevice(devices) {
        const list = Array.isArray(devices) ? devices.filter((entry) => entry && typeof entry.id === "string" && entry.id) : [];
        const named = list.find((entry) => typeof entry.name === "string" && DEVICE_NAME_PATTERN.test(entry.name));
        if (named) return named;
        if (list.length === 1) return list[0];
        return null;
      }
      function normalizeApiError(error) {
        if (error && typeof error === "object" && typeof error.code === "string") return error;
        const body = error && typeof error === "object" ? error.body : null;
        const code = body && typeof body.code === "string" ? body.code : null;
        const message = body && typeof body.error === "string" && body.error || error && typeof error.message === "string" && error.message || String(error);
        if (code) return deviceError(code, { detail: message }, error);
        if (error && error.status === 0) {
          return deviceError("native_unavailable", { detail: "无法连接 Host API，请确认插件正在运行。" }, error);
        }
        return deviceError("device_failed", { detail: message }, error);
      }
      var NATIVE_ERROR_KEYS = {
        native_unavailable: "bean.error.native_unavailable",
        helper_compile_failed: "bean.error.helper_compile_failed",
        helper_missing: "bean.error.native_unavailable",
        bluetooth_unauthorized: "bean.error.bluetooth_unauthorized",
        bluetooth_off: "bean.error.bluetooth_off",
        device_not_found: "bean.error.device_not_found",
        bad_request: "bean.error.bad_request",
        device_failed: "bean.error.native_failed",
        export_failed: "bean.error.native_failed",
        cancelled: "bean.error.cancelled"
      };
      function nativeErrorText(t, error) {
        const code = error && typeof error === "object" ? error.code : null;
        const key = typeof code === "string" ? NATIVE_ERROR_KEYS[code] : null;
        if (!key) return deviceErrorText(t, error);
        const params = { ...error && error.params || {} };
        const detail = params.detail || params.error || error && error.message || "";
        delete params.detail;
        if (detail) params.error = detail;
        if (code === "bluetooth_unauthorized" || code === "bluetooth_off") return t(key);
        return t(key, params);
      }
      var NativeD3200Client = class {
        #state = initialState();
        #listeners = /* @__PURE__ */ new Set();
        #api;
        #deviceId = null;
        #cache = /* @__PURE__ */ new Map();
        #view = null;
        #disposed = false;
        #busy = false;
        /** @param {{ api?: typeof api }} [options] */
        constructor(options = {}) {
          this.#api = options.api ?? api;
          this.#view = cloneSnapshot(this.#state);
        }
        snapshot() {
          return this.#view;
        }
        subscribe(listener) {
          this.#listeners.add(listener);
          listener(this.snapshot());
          return () => this.#listeners.delete(listener);
        }
        get transport() {
          return "native";
        }
        #update(changes) {
          Object.assign(this.#state, changes);
          this.#view = cloneSnapshot(this.#state);
          for (const listener of this.#listeners) {
            try {
              listener(this.snapshot());
            } catch (error) {
              console.error("recording-suite: native device listener crashed", error);
            }
          }
        }
        /** @param {string} key dictionary key @param {Record<string, unknown>} [params] */
        #log(key, params, level = "info") {
          this.#state.logs = [
            ...this.#state.logs,
            { time: (/* @__PURE__ */ new Date()).toISOString(), key, params: params || null, level }
          ].slice(-100);
          this.#update({ logs: this.#state.logs });
        }
        async #scanAndPick(discoveryMode) {
          const mode = discoveryMode === DISCOVERY_MODE.all ? "all" : "precise";
          const result = await this.#api.deviceScan({ mode, timeoutSeconds: 8 });
          const devices = Array.isArray(result?.devices) ? result.devices : [];
          const candidate = pickPreferredDevice(devices);
          if (!candidate) {
            const named = devices.map((entry) => entry.name).filter(Boolean).slice(0, 5);
            throw deviceError("device_not_found", { count: devices.length, candidates: named });
          }
          return candidate;
        }
        async connect({ discoveryMode = DISCOVERY_MODE.precise, deviceId = null } = {}) {
          if (this.#disposed) throw deviceError("not_connected");
          if (this.#busy) return this.snapshot();
          this.#busy = true;
          this.#update({ connecting: true, error: null });
          try {
            let resolvedId = deviceId;
            let name = null;
            if (!resolvedId) {
              const candidate = await this.#scanAndPick(discoveryMode);
              resolvedId = candidate.id;
              name = candidate.name || null;
            }
            const info = await this.#listWithRetry(resolvedId, Boolean(deviceId), discoveryMode);
            this.#deviceId = info?.deviceId || resolvedId;
            const deviceName = info?.name || name || "soundcore Work";
            this.#update({
              connected: true,
              connecting: false,
              deviceName,
              device: info?.device || null,
              files: Array.isArray(info?.files) ? info.files : [],
              recordStatus: Number.isFinite(info?.recordStatus) ? info.recordStatus : 0,
              error: null
            });
            this.#log("bean.log.connected", { name: deviceName, transport: "native" });
            this.#log("bean.log.filesRead", { count: this.#state.files.length });
            return this.snapshot();
          } catch (error) {
            const mapped = normalizeApiError(error);
            this.#deviceId = null;
            this.#update({ connected: false, connecting: false, error: mapped.code });
            this.#log("bean.log.connectionFailed", { errorKey: mapped.code }, "error");
            throw mapped;
          } finally {
            this.#busy = false;
          }
        }
        disconnect() {
          if (this.#disposed) return;
          this.#deviceId = null;
          this.#update({ connected: false, connecting: false, recordStatus: 0, export: null });
          this.#log("bean.log.disconnected");
        }
        /**
         * `list` for a device id. macOS can expose the recorder under a new
         * CoreBluetooth UUID after it rotates its BLE address, so when the id came
         * from our own scan a single rescan + retry keeps the connection honest.
         *
         * @param {string} deviceId
         * @param {boolean} pinned true when the caller passed an explicit deviceId
         * @param {number|string} [discoveryMode]
         */
        async #listWithRetry(deviceId, pinned, discoveryMode) {
          try {
            return await this.#api.deviceList({ deviceId });
          } catch (error) {
            const mapped = normalizeApiError(error);
            if (pinned || mapped.code !== "device_not_found") throw mapped;
            const candidate = await this.#scanAndPick(discoveryMode);
            deviceId = candidate.id;
            return await this.#api.deviceList({ deviceId });
          }
        }
        async refresh({ silent = false } = {}) {
          if (!this.#deviceId) throw deviceError("not_connected");
          let info;
          try {
            info = await this.#listWithRetry(this.#deviceId, false, DISCOVERY_MODE.precise);
          } catch (error) {
            throw normalizeApiError(error);
          }
          if (info?.deviceId && info.deviceId !== this.#deviceId) this.#deviceId = info.deviceId;
          this.#update({
            connected: true,
            deviceName: info?.name || this.#state.deviceName,
            device: info?.device || this.#state.device,
            files: Array.isArray(info?.files) ? info.files : [],
            recordStatus: Number.isFinite(info?.recordStatus) ? info.recordStatus : this.#state.recordStatus,
            error: null
          });
          if (!silent) this.#log("bean.log.filesRead", { count: this.#state.files.length });
          return this.#state.files;
        }
        async listFiles(options = {}) {
          return this.refresh(options);
        }
        async #recordAction(action) {
          if (!this.#deviceId) throw deviceError("not_connected");
          try {
            const result = await this.#api.deviceRecord({ deviceId: this.#deviceId, action });
            const status = Number.isFinite(result?.recordStatus) ? result.recordStatus : action === "start" ? 1 : 2;
            this.#update({ recordStatus: status, error: null });
            const wasPaused = status === 1 && action === "start";
            this.#log(
              action === "start" ? wasPaused ? "bean.log.resumeSent" : "bean.log.startSent" : "bean.log.pauseSent"
            );
            return this.snapshot();
          } catch (error) {
            throw normalizeApiError(error);
          }
        }
        async startRecording() {
          return this.#recordAction("start");
        }
        async pauseRecording() {
          return this.#recordAction("pause");
        }
        /**
         * Ask the Host to export + decrypt the recording and import it into the
         * library. The resumed value is compatible with the device snapshot shape
         * export result, plus `imported: true`.
         *
         * @param {number} fileId
         * @param {{ autoTranscribe?: boolean, title?: string | null, recordedAt?: string | null }} [options]
         */
        async exportRecording(fileId, options = {}) {
          if (this.#cache.has(fileId)) return this.#cache.get(fileId);
          if (!this.#deviceId) throw deviceError("not_connected");
          const file = this.#state.files.find((item) => item.fileId === fileId);
          if (!file) throw deviceError("file_missing");
          this.#update({
            export: { fileId, status: "downloading", progress: null, receivedBytes: 0, expectedBytes: file.sizeBytes || 0 }
          });
          this.#log("bean.log.exportStart", { fileId });
          try {
            const payload = await this.#api.deviceExport({
              deviceId: this.#deviceId,
              fileId,
              title: options.title || null,
              recordedAt: options.recordedAt || null,
              autoTranscribe: options.autoTranscribe !== false
            });
            const durationMs = Number.isFinite(payload?.durationMs) ? payload.durationMs : file.estimatedDurationMs || null;
            const result = {
              fileId,
              durationMs,
              format: "ogg",
              imported: true,
              recording: payload?.recording ?? null,
              sizeBytes: payload?.sizeBytes ?? null
            };
            this.#cache.set(fileId, result);
            this.#update({
              export: {
                fileId,
                status: "complete",
                progress: 100,
                receivedBytes: payload?.sizeBytes ?? 0,
                expectedBytes: file.sizeBytes || 0
              },
              files: this.#state.files.map(
                (item) => item.fileId === fileId ? { ...item, exported: true, estimatedDurationMs: durationMs ?? item.estimatedDurationMs } : item
              )
            });
            this.#log("bean.log.exported", { fileId });
            return result;
          } catch (error) {
            const mapped = normalizeApiError(error);
            this.#update({ export: null, error: mapped.code });
            this.#log("bean.log.exportFailed", { fileId, message: mapped.message }, "error");
            throw mapped;
          }
        }
        async deleteRecording(fileId) {
          if (!this.#deviceId) throw deviceError("not_connected");
          try {
            await this.#api.deviceDelete({ deviceId: this.#deviceId, fileId });
          } catch (error) {
            throw normalizeApiError(error);
          }
          this.#cache.delete(fileId);
          this.#update({
            files: this.#state.files.filter((item) => item.fileId !== fileId),
            export: this.#state.export && this.#state.export.fileId === fileId ? null : this.#state.export
          });
          this.#log("bean.log.deleted", { fileId });
          await this.listFiles({ silent: true }).catch(() => {
          });
          return this.snapshot();
        }
        dispose() {
          this.#disposed = true;
          this.#listeners.clear();
          this.#cache.clear();
        }
      };

      // plugin/src-client/components/BeanPage.js
      function BeanPage() {
        const { t, lang, notify } = usePanel();
        const [autoTranscribe, setAutoTranscribe] = (0, import_react4.useState)(true);
        const [selected, setSelected] = (0, import_react4.useState)(() => /* @__PURE__ */ new Set());
        const [actionError, setActionError] = (0, import_react4.useState)(null);
        const [batch, setBatch] = (0, import_react4.useState)(null);
        const [deleteTarget, setDeleteTarget] = (0, import_react4.useState)(null);
        const [deleting, setDeleting] = (0, import_react4.useState)(null);
        const [connectingMode, setConnectingMode] = (0, import_react4.useState)(null);
        const [ownBusy, setOwnBusy] = (0, import_react4.useState)(null);
        const [nativeInfo, setNativeInfo] = (0, import_react4.useState)(null);
        const batchRef = (0, import_react4.useRef)(null);
        const nativeRef = (0, import_react4.useRef)(null);
        const client = (0, import_react4.useMemo)(() => {
          if (!nativeRef.current) nativeRef.current = new NativeD3200Client();
          return nativeRef.current;
        }, []);
        (0, import_react4.useEffect)(() => {
          let cancelled = false;
          (async () => {
            let status = null;
            try {
              status = await api.deviceStatus();
            } catch {
              status = null;
            }
            if (cancelled || !status || typeof status.available !== "boolean") return;
            setNativeInfo({
              available: status.available,
              reason: typeof status.reason === "string" ? status.reason : null,
              platform: typeof status.platform === "string" ? status.platform : null
            });
          })();
          return () => {
            cancelled = true;
          };
        }, []);
        const subscribe = (0, import_react4.useCallback)((onChange) => client.subscribe(onChange), [client]);
        const getSnapshot = (0, import_react4.useCallback)(() => client.snapshot(), [client]);
        const device = (0, import_react4.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
        (0, import_react4.useEffect)(() => () => nativeRef.current?.dispose(), []);
        const localizeError = (0, import_react4.useCallback)((error) => nativeErrorText(t, error), [t]);
        const connected = Boolean(device.connected);
        const supported = Boolean(device.supported);
        const nativeBlocked = nativeInfo != null && nativeInfo.available === false;
        const canConnect = supported && !nativeBlocked;
        const files = device.files || [];
        const fileList = (0, import_react4.useMemo)(() => files.slice().sort((a, b) => b.fileId - a.fileId), [files]);
        const selectedIds = (0, import_react4.useMemo)(() => fileList.filter((file) => selected.has(file.fileId)).map((file) => file.fileId), [fileList, selected]);
        const removeSelection = (0, import_react4.useCallback)((fileId) => {
          setSelected((previous) => {
            if (!previous.has(fileId)) return previous;
            const next = new Set(previous);
            next.delete(fileId);
            return next;
          });
        }, []);
        const toggleSelect = (fileId) => {
          setSelected((previous) => {
            const next = new Set(previous);
            if (next.has(fileId)) next.delete(fileId);
            else next.add(fileId);
            return next;
          });
        };
        const toggleSelectAll = () => {
          setSelected((previous) => {
            if (fileList.length > 0 && fileList.every((file) => previous.has(file.fileId))) return /* @__PURE__ */ new Set();
            return new Set(fileList.map((file) => file.fileId));
          });
        };
        const connect = async (mode) => {
          setConnectingMode(mode);
          setActionError(null);
          try {
            await client.connect({ discoveryMode: mode });
          } catch (error) {
            setActionError(localizeError(error));
          } finally {
            setConnectingMode(null);
          }
        };
        const disconnect = () => {
          client.disconnect();
          setActionError(null);
        };
        const refresh = async () => {
          setOwnBusy("refresh");
          setActionError(null);
          try {
            await client.refresh();
          } catch (error) {
            setActionError(t("bean.error.refresh_failed", { error: localizeError(error) }));
          } finally {
            setOwnBusy(null);
          }
        };
        const recordAction = async (kind) => {
          setOwnBusy(kind);
          setActionError(null);
          try {
            if (kind === "start") await client.startRecording();
            else await client.pauseRecording();
          } catch (error) {
            setActionError(t("bean.error.device_action_failed", { error: localizeError(error) }));
          } finally {
            setOwnBusy(null);
          }
        };
        const importOne = async (file) => {
          const recordedAt = recordedAtFromFileId(file.fileId);
          const title = t("bean.importTitle", { time: formatDateTime(recordedAt || Date.now(), lang) });
          return client.exportRecording(file.fileId, { autoTranscribe, title, recordedAt });
        };
        const runBatch = async (ids) => {
          if (batchRef.current || ids.length === 0) return;
          const job = { active: true, total: ids.length, current: 0, phase: "exporting", done: 0, failed: 0, errors: [] };
          batchRef.current = job;
          setBatch({ ...job });
          setActionError(null);
          for (let index = 0; index < ids.length; index += 1) {
            const fileId = ids[index];
            job.current = index + 1;
            job.phase = "exporting";
            setBatch({ ...job });
            try {
              await importOne(fileList.find((entry) => entry.fileId === fileId) || { fileId });
              job.done += 1;
              removeSelection(fileId);
            } catch (error) {
              job.failed += 1;
              job.errors.push(
                t("bean.error.import_failed", {
                  id: fileId,
                  error: error && error.code ? localizeError(error) : error.message || String(error)
                })
              );
            }
            setBatch({ ...job });
          }
          job.active = false;
          batchRef.current = null;
          setBatch({ ...job });
          notify(t("bean.export.done", { done: job.done, failed: job.failed }));
        };
        const importSingle = async (file) => {
          if (batchRef.current) return;
          setOwnBusy(`import-${file.fileId}`);
          setActionError(null);
          try {
            batchRef.current = { active: true };
            await importOne(file);
            notify(t("bean.imported"));
            removeSelection(file.fileId);
          } catch (error) {
            setActionError(
              t("bean.error.import_failed", {
                id: file.fileId,
                error: error && error.code ? nativeErrorText(t, error) : error.message || String(error)
              })
            );
          } finally {
            batchRef.current = null;
            setOwnBusy(null);
          }
        };
        const deleteFile = async (fileId) => {
          setDeleting(fileId);
          setActionError(null);
          try {
            await client.deleteRecording(fileId);
            removeSelection(fileId);
            setDeleteTarget(null);
            notify(t("bean.toast.deleted", { fileId }));
          } catch (error) {
            setActionError(localizeError(error));
          } finally {
            setDeleting(null);
          }
        };
        const recordStatusKey = device.recordStatus === 1 ? "bean.record.recording" : device.recordStatus === 2 ? "bean.record.paused" : "bean.record.stopped";
        const recording = device.recordStatus === 1;
        const exportProgress = device.export && device.export.status === "downloading" ? device.export.progress : null;
        return (0, import_react4.createElement)(
          "div",
          { className: "dsh-rec-stack" },
          (0, import_react4.createElement)(
            "div",
            { className: "dsh-rec-row" },
            (0, import_react4.createElement)(
              "div",
              null,
              (0, import_react4.createElement)("h2", { className: "dsh-rec-card-title" }, (0, import_react4.createElement)(Icon, { name: "bean", size: 17 }), t("bean.title")),
              (0, import_react4.createElement)("p", { className: "dsh-rec-subtle" }, t("bean.native.hint"))
            ),
            (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-row dsh-rec-row-end" },
              (0, import_react4.createElement)(Badge, { kind: canConnect ? "done" : "failed" }, t("bean.transport.native")),
              (0, import_react4.createElement)(Badge, { kind: connected ? "done" : "" }, connected ? t("bean.connected") : t("bean.disconnected"))
            )
          ),
          nativeBlocked ? (0, import_react4.createElement)(
            Alert,
            { kind: "warn", title: t("bean.native.unavailable.title") },
            (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-stack", style: { gap: "8px" } },
              t("bean.native.unavailable.hint"),
              nativeInfo.reason ? (0, import_react4.createElement)("span", { className: "dsh-rec-subtle" }, t("bean.native.reason", { reason: nativeInfo.reason })) : null
            )
          ) : null,
          actionError ? (0, import_react4.createElement)(Alert, { kind: "error", title: actionError, action: (0, import_react4.createElement)(Btn, { size: "sm", variant: "ghost", icon: "x", onClick: () => setActionError(null) }, t("app.close")) }) : null,
          (0, import_react4.createElement)(
            "div",
            { className: "dsh-rec-card" },
            (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-card-head" },
              (0, import_react4.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react4.createElement)(Icon, { name: "plug", size: 16 }), connected ? device.deviceName || t("bean.device") : t("bean.connect")),
              connected ? (0, import_react4.createElement)(
                "div",
                { className: "dsh-rec-row dsh-rec-row-end" },
                (0, import_react4.createElement)(Btn, { size: "sm", icon: "refresh", onClick: refresh, disabled: ownBusy === "refresh" }, t("bean.refresh")),
                (0, import_react4.createElement)(Btn, { size: "sm", variant: "danger", icon: "x", onClick: disconnect }, t("bean.disconnect"))
              ) : (0, import_react4.createElement)(
                "div",
                { className: "dsh-rec-row dsh-rec-row-end" },
                (0, import_react4.createElement)(
                  Btn,
                  { size: "sm", variant: "primary", icon: "bluetooth", disabled: !canConnect || Boolean(connectingMode), onClick: () => connect(DISCOVERY_MODE.precise) },
                  connectingMode === DISCOVERY_MODE.precise ? [(0, import_react4.createElement)(Spinner, { key: "s" }), t("bean.connecting")] : t("bean.connectPrecise")
                ),
                (0, import_react4.createElement)(Btn, { size: "sm", disabled: !canConnect || Boolean(connectingMode), onClick: () => connect(DISCOVERY_MODE.all) }, t("bean.connectAll"))
              )
            ),
            (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-meta-grid" },
              meta(
                t("bean.native.ready"),
                (0, import_react4.createElement)(Badge, { kind: "done" }, t("bean.native.managedByHost"))
              ),
              meta(t("bean.battery"), device.device?.battery != null ? `${device.device.battery}%` : "—"),
              meta(t("bean.boxBattery"), device.device?.boxBattery != null ? `${device.device.boxBattery}%` : "—"),
              meta(t("bean.charging"), device.device?.charging ? t("app.yes") : device.device?.charging === false ? t("app.no") : "—"),
              meta(t("bean.firmware"), device.device?.firmwareVersion || "—"),
              meta(t("bean.serial"), device.device?.serialNumber || "—"),
              meta(
                t("bean.storage"),
                device.device?.totalMemoryKb ? t("bean.storageValue", {
                  free: formatBytes(Number(device.device.freeMemoryKb || 0) * 1024),
                  total: formatBytes(Number(device.device.totalMemoryKb) * 1024)
                }) : "—"
              ),
              meta(t("bean.recordStatus"), (0, import_react4.createElement)(Badge, { kind: recording ? "done" : device.recordStatus === 2 ? "queued" : "" }, t(recordStatusKey)))
            ),
            connected ? (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-row", style: { marginTop: "12px" } },
              (0, import_react4.createElement)(Btn, { size: "sm", variant: "primary", icon: "mic", disabled: Boolean(ownBusy) || recording, onClick: () => recordAction("start") }, device.recordStatus === 2 ? t("bean.resumeRecording") : t("bean.startRecording")),
              (0, import_react4.createElement)(Btn, { size: "sm", icon: "pause", disabled: Boolean(ownBusy) || !recording, onClick: () => recordAction("pause") }, t("bean.pauseRecording")),
              (0, import_react4.createElement)("span", { className: "dsh-rec-subtle" }, t("bean.native.permissionHint"))
            ) : null
          ),
          connected ? (0, import_react4.createElement)(
            "div",
            { className: "dsh-rec-card" },
            (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-card-head" },
              (0, import_react4.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react4.createElement)(Icon, { name: "library", size: 16 }), t("bean.files.title")),
              (0, import_react4.createElement)(Badge, null, t("bean.files.count", { count: fileList.length })),
              (0, import_react4.createElement)(Badge, null, t("bean.files.viaNative")),
              (0, import_react4.createElement)(
                "div",
                { className: "dsh-rec-row dsh-rec-row-end" },
                (0, import_react4.createElement)("label", { className: "dsh-rec-check" }, (0, import_react4.createElement)("input", { type: "checkbox", checked: autoTranscribe, onChange: (event) => setAutoTranscribe(event.target.checked) }), t("bean.autoTranscribe")),
                (0, import_react4.createElement)(Btn, { size: "sm", onClick: toggleSelectAll, disabled: fileList.length === 0 }, selectedIds.length > 0 ? t("bean.files.clearSelection") : t("bean.files.selectAll")),
                (0, import_react4.createElement)(Btn, { size: "sm", variant: "primary", icon: "download", disabled: fileList.length === 0 || selectedIds.length === 0 || Boolean(batch && batch.active), onClick: () => runBatch(selectedIds) }, t("bean.export.start", { count: selectedIds.length }))
              )
            ),
            fileList.length === 0 ? (0, import_react4.createElement)(Empty, { icon: "mic", title: t("bean.files.empty") }) : (0, import_react4.createElement)(
              "div",
              { style: { overflowX: "auto" } },
              (0, import_react4.createElement)(
                "table",
                { className: "dsh-rec-table" },
                (0, import_react4.createElement)(
                  "thead",
                  null,
                  (0, import_react4.createElement)(
                    "tr",
                    null,
                    (0, import_react4.createElement)("th", { style: { width: "28px" } }),
                    (0, import_react4.createElement)("th", null, t("library.recordedAt")),
                    (0, import_react4.createElement)("th", null, t("library.duration")),
                    (0, import_react4.createElement)("th", null, t("library.size")),
                    (0, import_react4.createElement)("th", null, t("bean.selectedFile")),
                    (0, import_react4.createElement)("th", { className: "is-actions" }, "")
                  )
                ),
                (0, import_react4.createElement)(
                  "tbody",
                  null,
                  fileList.map((file) => {
                    const recordedAt = recordedAtFromFileId(file.fileId);
                    const busyRow = ownBusy === `import-${file.fileId}` || deleting === file.fileId;
                    return (0, import_react4.createElement)(
                      "tr",
                      { key: file.fileId, className: busyRow ? "dsh-rec-file-row is-busy" : "dsh-rec-file-row" },
                      (0, import_react4.createElement)("td", null, (0, import_react4.createElement)("input", { type: "checkbox", checked: selected.has(file.fileId), onChange: () => toggleSelect(file.fileId), "aria-label": String(file.fileId) })),
                      (0, import_react4.createElement)("td", null, recordedAt ? formatDateTime(recordedAt, lang) : String(file.fileId)),
                      (0, import_react4.createElement)("td", { className: "is-num" }, formatDuration(file.estimatedDurationMs)),
                      (0, import_react4.createElement)("td", { className: "is-num" }, formatBytes(file.sizeBytes)),
                      (0, import_react4.createElement)("td", { className: "dsh-rec-mono" }, String(file.fileId)),
                      (0, import_react4.createElement)(
                        "td",
                        { className: "is-actions" },
                        (0, import_react4.createElement)(
                          "div",
                          { className: "dsh-rec-row", style: { justifyContent: "flex-end", gap: "5px" } },
                          (0, import_react4.createElement)(Btn, { size: "sm", icon: "download", disabled: Boolean(batch && batch.active) || busyRow, onClick: () => importSingle(file) }, t("bean.export.single")),
                          deleteTarget === file.fileId ? [
                            (0, import_react4.createElement)(Btn, { key: "cancel", size: "sm", disabled: deleting === file.fileId, onClick: () => setDeleteTarget(null) }, t("app.cancel")),
                            (0, import_react4.createElement)(Btn, { key: "confirm", size: "sm", variant: "danger", disabled: deleting === file.fileId, onClick: () => deleteFile(file.fileId) }, deleting === file.fileId ? t("bean.deleteBusy") : t("app.confirm"))
                          ] : (0, import_react4.createElement)(Btn, { size: "sm", variant: "danger", icon: "trash", disabled: busyRow, onClick: () => setDeleteTarget(file.fileId) }, "")
                        )
                      )
                    );
                  })
                )
              )
            ),
            batch ? (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-stack", style: { marginTop: "12px", gap: "8px" } },
              (0, import_react4.createElement)(
                "div",
                { className: "dsh-rec-row" },
                batch.active ? (0, import_react4.createElement)(Spinner) : null,
                (0, import_react4.createElement)(
                  "span",
                  { className: "dsh-rec-subtle" },
                  batch.active ? batch.phase === "importing" ? t("bean.export.importing", { current: batch.current, total: batch.total }) : t("bean.export.exporting", { current: batch.current, total: batch.total }) : t("bean.export.done", { done: batch.done, failed: batch.failed })
                )
              ),
              (0, import_react4.createElement)(Progress, {
                value: exportProgress != null ? exportProgress : batch.active ? Math.round((batch.current - 1) / Math.max(batch.total, 1) * 100) : 100,
                label: exportProgress != null ? `${exportProgress}%` : null
              }),
              batch.errors && batch.errors.length ? (0, import_react4.createElement)(Alert, { kind: "warn", title: batch.errors[0] }, batch.errors.length > 1 ? `${batch.errors.length} errors` : null) : null
            ) : null
          ) : supported ? (0, import_react4.createElement)(
            "div",
            { className: "dsh-rec-card" },
            (0, import_react4.createElement)(Empty, {
              icon: "bluetooth",
              title: t("bean.disconnected"),
              hint: t("bean.permission.hint")
            })
          ) : null,
          (0, import_react4.createElement)(
            "div",
            { className: "dsh-rec-card" },
            (0, import_react4.createElement)("div", { className: "dsh-rec-card-head" }, (0, import_react4.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react4.createElement)(Icon, { name: "info", size: 16 }), t("bean.log.title"))),
            device.logs.length === 0 ? (0, import_react4.createElement)("span", { className: "dsh-rec-subtle" }, t("bean.log.empty")) : (0, import_react4.createElement)(
              "div",
              { className: "dsh-rec-log" },
              device.logs.slice().reverse().slice(0, 24).map(
                (log, index) => (0, import_react4.createElement)(
                  "div",
                  { key: `${log.time}-${index}`, className: `dsh-rec-log-line${log.level === "error" ? " is-error" : ""}` },
                  (0, import_react4.createElement)("span", { className: "dsh-rec-log-time" }, String(log.time || "").slice(11, 19)),
                  (0, import_react4.createElement)("span", null, renderLog(t, log))
                )
              )
            )
          )
        );
      }
      function renderLog(t, log) {
        const params = { ...log.params || {} };
        if (params.errorKey) params.error = t(`bean.error.${params.errorKey}`);
        if (params.labelKey) params.label = t(params.labelKey, params.labelParams || {});
        try {
          return t(log.key, params);
        } catch {
          return log.key;
        }
      }
      function meta(label, value) {
        return (0, import_react4.createElement)(
          "div",
          { className: "dsh-rec-meta-item", key: label },
          (0, import_react4.createElement)("div", { className: "dsh-rec-meta-label" }, label),
          (0, import_react4.createElement)("div", { className: "dsh-rec-meta-value" }, value)
        );
      }

      // plugin/src-client/components/WatchPage.js
      var import_react5 = require("react");
      function WatchPage() {
        const { t, lang, notify } = usePanel();
        const [status, setStatus] = (0, import_react5.useState)(null);
        const [recordings, setRecordings] = (0, import_react5.useState)([]);
        const [loading, setLoading] = (0, import_react5.useState)(true);
        const [error, setError] = (0, import_react5.useState)(null);
        const [rotating, setRotating] = (0, import_react5.useState)(false);
        const [confirmRotate, setConfirmRotate] = (0, import_react5.useState)(false);
        const [copiedField, setCopiedField] = (0, import_react5.useState)(null);
        const { copy } = useCopy(t);
        const alive = (0, import_react5.useRef)(true);
        (0, import_react5.useEffect)(() => {
          alive.current = true;
          return () => {
            alive.current = false;
          };
        }, []);
        const load = (0, import_react5.useCallback)(async () => {
          setLoading(true);
          setError(null);
          try {
            const [statusData, listData] = await Promise.all([api.status(), api.list()]);
            if (!alive.current) return;
            setStatus(statusData);
            const all = Array.isArray(listData?.recordings) ? listData.recordings : [];
            setRecordings(all.filter((item) => item.source === "apple-watch"));
          } catch (loadError) {
            if (alive.current) setError(loadError.message || String(loadError));
          } finally {
            if (alive.current) setLoading(false);
          }
        }, []);
        (0, import_react5.useEffect)(() => {
          load();
        }, [load]);
        const handleCopy = async (field, text, messageKey) => {
          const message = await copy(text, messageKey);
          if (message) {
            setCopiedField(field);
            notify(message);
            setTimeout(() => {
              if (alive.current) setCopiedField(null);
            }, 1800);
          }
        };
        const rotate = async () => {
          setRotating(true);
          setError(null);
          try {
            const data = await api.rotateToken();
            if (!alive.current) return;
            setStatus(
              (previous) => previous ? { ...previous, watchImport: { ...previous.watchImport || {}, token: data?.token || previous.watchImport?.token } } : previous
            );
            setConfirmRotate(false);
            notify(t("watch.rotated"));
          } catch (rotateError) {
            setError(t("watch.error.rotateFailed", { error: rotateError.message || String(rotateError) }));
          } finally {
            if (alive.current) setRotating(false);
          }
        };
        const watchImport = status?.watchImport || null;
        const urls = Array.isArray(watchImport?.urls) ? watchImport.urls : [];
        const token = watchImport?.token || "";
        const enabled = Boolean(watchImport?.enabled);
        return (0, import_react5.createElement)(
          "div",
          { className: "dsh-rec-stack" },
          (0, import_react5.createElement)(
            "div",
            { className: "dsh-rec-row" },
            (0, import_react5.createElement)(
              "div",
              null,
              (0, import_react5.createElement)("h2", { className: "dsh-rec-card-title" }, (0, import_react5.createElement)(Icon, { name: "watch", size: 17 }), t("watch.title")),
              (0, import_react5.createElement)("p", { className: "dsh-rec-subtle" }, t("watch.hint"))
            ),
            (0, import_react5.createElement)(
              "div",
              { className: "dsh-rec-row dsh-rec-row-end" },
              (0, import_react5.createElement)(Badge, { kind: enabled ? "done" : "failed" }, enabled ? t("app.yes") : t("app.no")),
              (0, import_react5.createElement)(Btn, { size: "sm", icon: "refresh", onClick: load, disabled: loading }, t("app.refresh"))
            )
          ),
          error ? (0, import_react5.createElement)(Alert, { kind: "error", title: error }) : null,
          loading && !status ? (0, import_react5.createElement)("div", { className: "dsh-rec-card" }, (0, import_react5.createElement)(Empty, { icon: "wave", title: t("app.loading") })) : !enabled ? (0, import_react5.createElement)(Alert, { kind: "warn", title: t("watch.status.unavailable") }) : (0, import_react5.createElement)(
            "div",
            { className: "dsh-rec-card" },
            (0, import_react5.createElement)(
              "div",
              { className: "dsh-rec-card-head" },
              (0, import_react5.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react5.createElement)(Icon, { name: "plug", size: 16 }), t("watch.status.title")),
              (0, import_react5.createElement)(Badge, null, `:${watchImport?.port ?? "—"}`),
              (0, import_react5.createElement)(Badge, null, `UDP :${watchImport?.beaconPort ?? "—"}`)
            ),
            (0, import_react5.createElement)(
              "div",
              { className: "dsh-rec-stack", style: { gap: "12px" } },
              (0, import_react5.createElement)(
                "div",
                { className: "dsh-rec-field" },
                (0, import_react5.createElement)("span", { className: "dsh-rec-field-label" }, t("watch.urls")),
                urls.length === 0 ? (0, import_react5.createElement)("span", { className: "dsh-rec-field-hint" }, t("watch.urls.empty")) : urls.map(
                  (url) => (0, import_react5.createElement)(
                    "div",
                    { className: "dsh-rec-copy-line", key: url },
                    (0, import_react5.createElement)("input", { className: "dsh-rec-input dsh-rec-mono", readOnly: true, value: url, "aria-label": t("watch.urls") }),
                    (0, import_react5.createElement)(
                      Btn,
                      { size: "sm", icon: "copy", onClick: () => handleCopy(url, url, t("watch.urlCopied")) },
                      copiedField === url ? t("app.copied") : t("app.copy")
                    )
                  )
                )
              ),
              (0, import_react5.createElement)(
                "div",
                { className: "dsh-rec-field" },
                (0, import_react5.createElement)("span", { className: "dsh-rec-field-label" }, t("watch.token")),
                (0, import_react5.createElement)(
                  "div",
                  { className: "dsh-rec-copy-line" },
                  (0, import_react5.createElement)("input", { className: "dsh-rec-input dsh-rec-mono", readOnly: true, value: maskToken(token), "aria-label": t("watch.token") }),
                  (0, import_react5.createElement)(Btn, { size: "sm", icon: "copy", disabled: !token, onClick: () => handleCopy("token", token, t("watch.tokenCopied")) }, copiedField === "token" ? t("app.copied") : t("app.copy"))
                ),
                (0, import_react5.createElement)("span", { className: "dsh-rec-field-hint" }, t("watch.tokenHidden"))
              ),
              (0, import_react5.createElement)(
                "div",
                { className: "dsh-rec-row" },
                confirmRotate ? [
                  (0, import_react5.createElement)("span", { key: "q", className: "dsh-rec-subtle" }, t("watch.rotateConfirm")),
                  (0, import_react5.createElement)(Btn, { key: "cancel", size: "sm", disabled: rotating, onClick: () => setConfirmRotate(false) }, t("app.cancel")),
                  (0, import_react5.createElement)(Btn, { key: "confirm", size: "sm", variant: "danger", disabled: rotating, onClick: rotate }, rotating ? [(0, import_react5.createElement)(Spinner, { key: "s" }), t("app.loading")] : t("app.confirm"))
                ] : (0, import_react5.createElement)(Btn, { size: "sm", icon: "refresh", variant: "danger", onClick: () => setConfirmRotate(true) }, t("watch.rotate"))
              )
            )
          ),
          (0, import_react5.createElement)(
            "div",
            { className: "dsh-rec-card" },
            (0, import_react5.createElement)("div", { className: "dsh-rec-card-head" }, (0, import_react5.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react5.createElement)(Icon, { name: "info", size: 16 }), t("watch.udp.title"))),
            (0, import_react5.createElement)("p", { className: "dsh-rec-subtle" }, t("watch.udp.hint"))
          ),
          (0, import_react5.createElement)(
            "div",
            { className: "dsh-rec-card" },
            (0, import_react5.createElement)(
              "div",
              { className: "dsh-rec-card-head" },
              (0, import_react5.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react5.createElement)(Icon, { name: "watch", size: 16 }), t("watch.list.title")),
              (0, import_react5.createElement)(Badge, null, t("app.count", { count: recordings.length }))
            ),
            recordings.length === 0 ? (0, import_react5.createElement)(Empty, { icon: "watch", title: t("watch.list.empty") }) : (0, import_react5.createElement)(
              "div",
              { className: "dsh-rec-stack", style: { gap: "6px" } },
              recordings.map(
                (recording) => (0, import_react5.createElement)(
                  "div",
                  { key: recording.id, className: "dsh-rec-row", style: { padding: "7px 9px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "9px" } },
                  (0, import_react5.createElement)(Icon, { name: "watch", size: 15 }),
                  (0, import_react5.createElement)("span", { style: { flex: "1 1 200px", minWidth: 0, overflowWrap: "anywhere" } }, recording.title || recording.id),
                  (0, import_react5.createElement)(Badge, { kind: recording.transcriptStatus === "done" ? "done" : recording.transcriptStatus === "failed" ? "failed" : recording.transcriptStatus === "running" ? "running" : "" }, t(`status.${recording.transcriptStatus}`)),
                  (0, import_react5.createElement)("span", { className: "dsh-rec-subtle" }, formatDateTime(recording.recordedAt, lang)),
                  (0, import_react5.createElement)("span", { className: "dsh-rec-subtle" }, formatDuration(recording.durationMs))
                )
              )
            )
          )
        );
      }

      // plugin/src-client/components/SettingsPage.js
      var import_react6 = require("react");
      var PROVIDERS = [
        { value: "apple", labelKey: "settings.provider.apple", descKey: "settings.provider.appleDesc" },
        { value: "openai", labelKey: "settings.provider.openai", descKey: "settings.provider.openaiDesc" },
        { value: "none", labelKey: "settings.provider.none", descKey: "settings.provider.noneDesc" }
      ];
      function emptyForm() {
        return {
          provider: "apple",
          language: "",
          baseUrl: "",
          model: "",
          apiKey: "",
          hasApiKey: false,
          storageDir: "",
          watchEnabled: true,
          watchPort: 47831
        };
      }
      function formFromConfig(config, status) {
        return {
          provider: config?.provider || "apple",
          language: config?.language || "",
          baseUrl: config?.openai?.baseUrl || "",
          model: config?.openai?.model || "",
          apiKey: "",
          hasApiKey: Boolean(config?.openai?.hasApiKey),
          storageDir: config?.storageDir || status?.storageDir || "",
          watchEnabled: config?.watchImport?.enabled !== false,
          watchPort: Number(config?.watchImport?.port || 47831)
        };
      }
      function SettingsPage() {
        const { t, notify } = usePanel();
        const [form, setForm] = (0, import_react6.useState)(emptyForm);
        const [status, setStatus] = (0, import_react6.useState)(null);
        const [loading, setLoading] = (0, import_react6.useState)(true);
        const [error, setError] = (0, import_react6.useState)(null);
        const [saving, setSaving] = (0, import_react6.useState)(false);
        const [restartPhase, setRestartPhase] = (0, import_react6.useState)(null);
        const alive = (0, import_react6.useRef)(true);
        const pollTimer = (0, import_react6.useRef)(null);
        (0, import_react6.useEffect)(() => {
          alive.current = true;
          return () => {
            alive.current = false;
            if (pollTimer.current) clearTimeout(pollTimer.current);
          };
        }, []);
        const load = (0, import_react6.useCallback)(async () => {
          setLoading(true);
          setError(null);
          try {
            const [config, statusData] = await Promise.all([api.getConfig(), api.status()]);
            if (!alive.current) return;
            setForm(formFromConfig(config, statusData));
            setStatus(statusData);
          } catch (loadError) {
            if (alive.current) setError(t("settings.error.load", { error: loadError.message || String(loadError) }));
          } finally {
            if (alive.current) setLoading(false);
          }
        }, [t]);
        (0, import_react6.useEffect)(() => {
          load();
        }, [load]);
        const update = (patch) => setForm((previous) => ({ ...previous, ...patch }));
        const waitForRestart = (0, import_react6.useCallback)(() => {
          setRestartPhase("restarting");
          const deadline = Date.now() + 3e4;
          const poll = async () => {
            if (!alive.current) return;
            try {
              const statusData = await api.status();
              if (!alive.current) return;
              setStatus(statusData);
              setRestartPhase("done");
              notify(t("settings.restartDone"));
            } catch {
              if (!alive.current) return;
              if (Date.now() > deadline) {
                setRestartPhase(null);
                setError(t("settings.error.load", { error: "timeout" }));
                return;
              }
              pollTimer.current = setTimeout(poll, 900);
            }
          };
          pollTimer.current = setTimeout(poll, 900);
        }, [notify, t]);
        const save = async () => {
          const port = Number(form.watchPort);
          if (!Number.isInteger(port) || port < 1 || port > 65535) {
            setError(t("settings.error.port"));
            return;
          }
          setSaving(true);
          setError(null);
          setRestartPhase(null);
          try {
            const payload = {
              provider: form.provider,
              language: form.language.trim(),
              openai: {
                baseUrl: form.baseUrl.trim(),
                model: form.model.trim(),
                ...form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}
              },
              storageDir: form.storageDir,
              watchImport: { enabled: Boolean(form.watchEnabled), port }
            };
            await api.saveConfig(payload);
            if (!alive.current) return;
            setSaving(false);
            setForm((previous) => ({ ...previous, apiKey: "", hasApiKey: previous.hasApiKey || Boolean(payload.openai.apiKey) }));
            waitForRestart();
          } catch (saveError) {
            if (!alive.current) return;
            setError(t("settings.error.save", { error: saveError.message || String(saveError) }));
            setSaving(false);
          }
        };
        const appleSpeech = status?.appleSpeech || null;
        const provider = PROVIDERS.find((item) => item.value === form.provider) || PROVIDERS[0];
        return (0, import_react6.createElement)(
          "div",
          { className: "dsh-rec-stack" },
          (0, import_react6.createElement)(
            "div",
            { className: "dsh-rec-row" },
            (0, import_react6.createElement)(
              "div",
              null,
              (0, import_react6.createElement)("h2", { className: "dsh-rec-card-title" }, (0, import_react6.createElement)(Icon, { name: "settings", size: 17 }), t("settings.title")),
              (0, import_react6.createElement)("p", { className: "dsh-rec-subtle" }, t("settings.hint"))
            ),
            (0, import_react6.createElement)(
              "div",
              { className: "dsh-rec-row dsh-rec-row-end" },
              status?.counts ? (0, import_react6.createElement)(Badge, null, t("settings.counts", { recordings: status.counts.recordings ?? 0, transcribed: status.counts.transcribed ?? 0 })) : null,
              (0, import_react6.createElement)(Btn, { size: "sm", icon: "refresh", onClick: load, disabled: loading }, t("app.refresh"))
            )
          ),
          error ? (0, import_react6.createElement)(Alert, { kind: "error", title: error }) : null,
          restartPhase === "restarting" ? (0, import_react6.createElement)(Alert, { kind: "info", title: t("settings.savedRestarting"), action: (0, import_react6.createElement)(Spinner) }) : null,
          restartPhase === "done" ? (0, import_react6.createElement)(Alert, { kind: "success", title: t("settings.restartDone") }) : null,
          loading && !status ? (0, import_react6.createElement)("div", { className: "dsh-rec-card" }, (0, import_react6.createElement)("div", { className: "dsh-rec-row" }, (0, import_react6.createElement)(Spinner), t("app.loading"))) : (0, import_react6.createElement)(
            "div",
            { className: "dsh-rec-settings" },
            (0, import_react6.createElement)(
              "div",
              { className: "dsh-rec-card" },
              (0, import_react6.createElement)("div", { className: "dsh-rec-card-head" }, (0, import_react6.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react6.createElement)(Icon, { name: "wave", size: 16 }), t("settings.provider"))),
              (0, import_react6.createElement)(
                "div",
                { className: "dsh-rec-stack", style: { gap: "12px" } },
                (0, import_react6.createElement)(
                  "div",
                  { className: "dsh-rec-field" },
                  (0, import_react6.createElement)(
                    Select,
                    { value: form.provider, onChange: (event) => update({ provider: event.target.value }), "aria-label": t("settings.provider") },
                    PROVIDERS.map((item) => (0, import_react6.createElement)("option", { key: item.value, value: item.value }, t(item.labelKey)))
                  ),
                  (0, import_react6.createElement)("span", { className: "dsh-rec-field-hint" }, t(provider.descKey))
                ),
                (0, import_react6.createElement)(
                  "div",
                  { className: "dsh-rec-form-row" },
                  (0, import_react6.createElement)(
                    "label",
                    { className: "dsh-rec-field" },
                    (0, import_react6.createElement)("span", { className: "dsh-rec-field-label" }, t("settings.language")),
                    (0, import_react6.createElement)(Input, { value: form.language, placeholder: "zh-CN", onChange: (event) => update({ language: event.target.value }) }),
                    (0, import_react6.createElement)("span", { className: "dsh-rec-field-hint" }, t("settings.languageHint"))
                  ),
                  (0, import_react6.createElement)(
                    "div",
                    { className: "dsh-rec-field" },
                    (0, import_react6.createElement)("span", { className: "dsh-rec-field-label" }, t("settings.appleSpeech")),
                    (0, import_react6.createElement)(
                      "div",
                      { className: "dsh-rec-row" },
                      (0, import_react6.createElement)(Badge, { kind: appleSpeech?.available ? "done" : appleSpeech ? "failed" : "" }, appleSpeech ? appleSpeech.available ? t("settings.appleSpeechAvailable") : t("settings.appleSpeechUnavailable") : "—"),
                      appleSpeech?.reason ? (0, import_react6.createElement)("span", { className: "dsh-rec-subtle", style: { overflowWrap: "anywhere" } }, `${t("settings.appleSpeechReason")}: ${appleSpeech.reason}`) : null
                    )
                  )
                )
              )
            ),
            form.provider === "openai" ? (0, import_react6.createElement)(
              "div",
              { className: "dsh-rec-card" },
              (0, import_react6.createElement)("div", { className: "dsh-rec-card-head" }, (0, import_react6.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react6.createElement)(Icon, { name: "plug", size: 16 }), t("settings.provider.openai"))),
              (0, import_react6.createElement)(
                "div",
                { className: "dsh-rec-stack", style: { gap: "12px" } },
                (0, import_react6.createElement)(
                  "div",
                  { className: "dsh-rec-form-row" },
                  (0, import_react6.createElement)(
                    "label",
                    { className: "dsh-rec-field" },
                    (0, import_react6.createElement)("span", { className: "dsh-rec-field-label" }, t("settings.openai.baseUrl")),
                    (0, import_react6.createElement)(Input, { value: form.baseUrl, placeholder: "https://api.openai.com/v1", onChange: (event) => update({ baseUrl: event.target.value }) })
                  ),
                  (0, import_react6.createElement)(
                    "label",
                    { className: "dsh-rec-field" },
                    (0, import_react6.createElement)("span", { className: "dsh-rec-field-label" }, t("settings.openai.model")),
                    (0, import_react6.createElement)(Input, { value: form.model, placeholder: "whisper-1", onChange: (event) => update({ model: event.target.value }) })
                  )
                ),
                (0, import_react6.createElement)(
                  "label",
                  { className: "dsh-rec-field" },
                  (0, import_react6.createElement)(
                    "span",
                    { className: "dsh-rec-field-label" },
                    t("settings.openai.apiKey"),
                    form.hasApiKey ? (0, import_react6.createElement)(Badge, { kind: "done" }, t("settings.openai.apiKeySaved")) : null
                  ),
                  (0, import_react6.createElement)(Input, {
                    type: "password",
                    autoComplete: "off",
                    value: form.apiKey,
                    placeholder: t("settings.openai.apiKeyPlaceholder"),
                    onChange: (event) => update({ apiKey: event.target.value })
                  })
                )
              )
            ) : null,
            (0, import_react6.createElement)(
              "div",
              { className: "dsh-rec-card" },
              (0, import_react6.createElement)("div", { className: "dsh-rec-card-head" }, (0, import_react6.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react6.createElement)(Icon, { name: "file", size: 16 }), t("settings.storageDir"))),
              (0, import_react6.createElement)(
                "div",
                { className: "dsh-rec-stack", style: { gap: "8px" } },
                (0, import_react6.createElement)("input", { className: "dsh-rec-input dsh-rec-mono", readOnly: true, value: form.storageDir || "—" }),
                (0, import_react6.createElement)("span", { className: "dsh-rec-field-hint" }, t("settings.storageDirHint"))
              )
            ),
            (0, import_react6.createElement)(
              "div",
              { className: "dsh-rec-card" },
              (0, import_react6.createElement)("div", { className: "dsh-rec-card-head" }, (0, import_react6.createElement)("span", { className: "dsh-rec-card-title" }, (0, import_react6.createElement)(Icon, { name: "watch", size: 16 }), t("watch.status.title"))),
              (0, import_react6.createElement)(
                "div",
                { className: "dsh-rec-form-row" },
                (0, import_react6.createElement)(
                  "label",
                  { className: "dsh-rec-check", style: { alignSelf: "center" } },
                  (0, import_react6.createElement)("input", { type: "checkbox", checked: form.watchEnabled, onChange: (event) => update({ watchEnabled: event.target.checked }) }),
                  t("settings.watch.enabled")
                ),
                (0, import_react6.createElement)(
                  "label",
                  { className: "dsh-rec-field" },
                  (0, import_react6.createElement)("span", { className: "dsh-rec-field-label" }, t("settings.watch.port")),
                  (0, import_react6.createElement)(Input, {
                    type: "number",
                    min: 1,
                    max: 65535,
                    value: form.watchPort,
                    onChange: (event) => update({ watchPort: event.target.value })
                  }),
                  (0, import_react6.createElement)("span", { className: "dsh-rec-field-hint" }, t("settings.watch.portHint"))
                )
              )
            ),
            (0, import_react6.createElement)(
              "div",
              { className: "dsh-rec-row" },
              (0, import_react6.createElement)(Btn, { variant: "primary", icon: "check", onClick: save, disabled: saving || Boolean(restartPhase) }, saving ? [(0, import_react6.createElement)(Spinner, { key: "s" }), t("app.saving")] : t("settings.save")),
              (0, import_react6.createElement)("span", { className: "dsh-rec-subtle" }, t("settings.hint"))
            )
          )
        );
      }

      // plugin/src-client/components/Panel.js
      var TAB_KEY = "dsh.recording-suite.tab";
      var TABS = [
        { id: "library", labelKey: "app.tabs.library", icon: "library", component: LibraryPage },
        { id: "bean", labelKey: "app.tabs.bean", icon: "bean", component: BeanPage },
        { id: "watch", labelKey: "app.tabs.watch", icon: "watch", component: WatchPage },
        { id: "settings", labelKey: "app.tabs.settings", icon: "settings", component: SettingsPage }
      ];
      function initialTab() {
        try {
          const saved = localStorage.getItem(TAB_KEY);
          if (TABS.some((tab) => tab.id === saved)) return saved;
        } catch {
        }
        return "library";
      }
      function createPanel(ctx) {
        function RecordingPanelSlot() {
          return (0, import_react7.createElement)(Panel, { ctx });
        }
        return RecordingPanelSlot;
      }
      function Panel({ ctx }) {
        const { t, lang } = useLocale(ctx);
        const { toast, notify } = useToast();
        const [tab, setTab] = (0, import_react7.useState)(initialTab);
        const [status, setStatus] = (0, import_react7.useState)(null);
        const alive = (0, import_react7.useRef)(true);
        (0, import_react7.useEffect)(() => {
          alive.current = true;
          api.status().then((data) => {
            if (alive.current) setStatus(data);
          }).catch(() => {
          });
          return () => {
            alive.current = false;
          };
        }, [tab]);
        const selectTab = (0, import_react7.useCallback)((nextTab) => {
          setTab(nextTab);
          try {
            localStorage.setItem(TAB_KEY, nextTab);
          } catch {
          }
        }, []);
        const active = TABS.find((item) => item.id === tab) || TABS[0];
        const Page = active.component;
        const counts = status?.counts || null;
        return (0, import_react7.createElement)(
          PanelContext.Provider,
          { value: { ctx, t, lang, notify, status } },
          (0, import_react7.createElement)(
            "div",
            { className: "dsh-rec", "data-plugin": "dsh-recording-suite" },
            (0, import_react7.createElement)(
              "header",
              { className: "dsh-rec-head" },
              (0, import_react7.createElement)("div", { className: "dsh-rec-mark" }, (0, import_react7.createElement)(Icon, { name: "bean", size: 22 })),
              (0, import_react7.createElement)(
                "div",
                { className: "dsh-rec-head-copy" },
                (0, import_react7.createElement)("h1", { className: "dsh-rec-title" }, t("app.title")),
                (0, import_react7.createElement)("p", { className: "dsh-rec-sub" }, t("app.subtitle"))
              ),
              (0, import_react7.createElement)(
                "div",
                { className: "dsh-rec-head-meta" },
                counts ? (0, import_react7.createElement)("span", { className: "dsh-rec-chip" }, t("settings.counts", { recordings: counts.recordings ?? 0, transcribed: counts.transcribed ?? 0 })) : null,
                status?.storageDir ? (0, import_react7.createElement)("span", { className: "dsh-rec-chip", title: status.storageDir }, `${status.storageDir}`) : null,
                status?.appleSpeech ? (0, import_react7.createElement)(
                  "span",
                  { className: `dsh-rec-chip ${status.appleSpeech.available ? "is-ok" : "is-warn"}` },
                  `${t("settings.appleSpeech")}: ${status.appleSpeech.available ? t("settings.appleSpeechAvailable") : t("settings.appleSpeechUnavailable")}`
                ) : null
              )
            ),
            (0, import_react7.createElement)(
              "nav",
              { className: "dsh-rec-tabs", role: "tablist", "aria-label": t("app.title") },
              TABS.map(
                (item) => (0, import_react7.createElement)(
                  "button",
                  {
                    key: item.id,
                    type: "button",
                    role: "tab",
                    className: "dsh-rec-tab",
                    "aria-selected": item.id === tab ? "true" : "false",
                    onClick: () => selectTab(item.id)
                  },
                  (0, import_react7.createElement)(Icon, { name: item.icon, size: 16 }),
                  t(item.labelKey)
                )
              )
            ),
            (0, import_react7.createElement)(
              "div",
              { className: "dsh-rec-body" },
              (0, import_react7.createElement)(ErrorBoundary, { key: tab, t }, (0, import_react7.createElement)(Page, { key: tab })),
              toast ? (0, import_react7.createElement)("div", { className: "dsh-rec-toast", role: "status" }, toast) : null
            )
          )
        );
      }
      var ErrorBoundary = class extends import_react7.Component {
        constructor(props) {
          super(props);
          this.state = { error: null };
        }
        static getDerivedStateFromError(error) {
          return { error };
        }
        componentDidCatch(error, info) {
          console.error("recording-suite: page crashed", error, info);
        }
        render() {
          const t = this.props.t;
          if (this.state.error) {
            return (0, import_react7.createElement)(
              "div",
              { className: "dsh-rec-card" },
              (0, import_react7.createElement)(
                "div",
                { className: "dsh-rec-alert is-error" },
                (0, import_react7.createElement)(Icon, { name: "alert", size: 16 }),
                (0, import_react7.createElement)(
                  "div",
                  null,
                  (0, import_react7.createElement)("div", { className: "dsh-rec-alert-title" }, t("app.error")),
                  (0, import_react7.createElement)("div", { className: "dsh-rec-alert-hint" }, String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error))
                )
              )
            );
          }
          return this.props.children;
        }
      };

      // plugin/src-client/index.js
      var inject = ["slots", "locale"];
      function installStyles() {
        if (typeof document === "undefined") return () => {
        };
        const selector = `style[data-plugin-css="${PANEL_STYLE_ID}"]`;
        if (document.querySelector(selector)) return () => {
        };
        const style = document.createElement("style");
        style.dataset.plugin = "dsh-recording-suite";
        style.dataset.pluginCss = PANEL_STYLE_ID;
        style.textContent = PANEL_CSS;
        document.head.appendChild(style);
        return () => {
          try {
            style.remove();
          } catch {
          }
        };
      }
      function apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), "recording-suite: dictionaries");
        ctx.effect(() => installStyles(), "recording-suite: styles");
        const t = (key, params) => {
          try {
            const bound = ctx.locale.bind(NS);
            const value = bound(key, params);
            if (typeof value === "string" && value.length > 0) return value;
          } catch {
          }
          return fallbackTranslate(key, params);
        };
        ctx.slots.inject(
          "main",
          () => ctx.slots.register(
            { name: "main", key: "recording-suite", locale: NS },
            createPanel(ctx)
          )
        );
        ctx.slots.inject(
          "sidebar.panellist",
          () => ctx.slots.register(
            { name: "sidebar.panellist", id: "recording-suite", order: 30, label: () => t("app.title"), locale: NS },
            (props) => (0, import_react8.createElement)(Icon, { name: "bean", size: typeof props?.size === "number" ? props.size : 20 })
          )
        );
      }
      var index_default = { inject, apply };
    })(module, exports, require)
    return module.exports.default ?? module.exports
  },
})
