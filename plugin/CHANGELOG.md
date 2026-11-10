# Changelog

## 2026-11-10

- 新增：macOS 原生蓝牙桥（Swift CoreBluetooth 助手 + `/api/recording/device/*`），DSH 桌面窗口内可直接扫描、读取录音列表、导出/解密录音，不再依赖外部浏览器。
- 变更：录音豆面板使用原生蓝牙桥；移除浏览器 Web Bluetooth 回退。
- 新增：原生蓝牙 helper 按需编译/缓存、错误码映射、导出后 Ogg/Opus 封装并自动入库。
- 新增：真实 D3200 上验证 scan/list/export/解密/Ogg 入库与 Apple Speech 转写。


## 2026-11-09

- 新增：Host 半录音库（`~/Documents/DSH-Recordings`），支持导入、列表、重命名、删除与自包含 Markdown 转录。
- 新增：macOS Speech 本地转录与 OpenAI 兼容 ASR；转录任务串行并支持 SSE 进度。
- 新增：同源 `/api/recording/*` HTTP API、局域网手表导入服务与 UDP 发现信标。
- 新增：`recording_library` Agent 工具与系统提示说明。
- 新增：`@` 候选菜单固定注入最近转录文件，任意工作区可直接选择录音文本作为上下文。
- 新增：浏览器面板，含录音库、原生蓝牙导入、手表导入信息与设置页。
- 新增：watchOS 录音 App、表盘 complication 与 iPhone 上传伴侣（见 `../apple/`）。
