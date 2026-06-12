# 内置 Chromium 打包说明

OpenOcta 使用 **Rod + 内置 Chromium** 提供浏览器能力，**不会**从外网自动下载浏览器（适配无外网环境）。

## 目录布局

将对应平台的 Chromium 解压到下列任一目录（按优先级）：

| 场景 | 路径 |
|------|------|
| 环境变量 | `OPENOCTA_BUNDLED_CHROMIUM_DIR` 指向目录或 chrome 可执行文件 |
| 配置文件 | `browser.executablePath` |
| 可执行文件旁 | `<OpenOcta.exe 同目录>/chromium/` |
| macOS .app | `OpenOcta.app/Contents/Resources/chromium/` |
| 开发目录 | `./chromium/` 或 `./resources/chromium/` |

## 各平台可执行文件相对路径

- **Windows**: `chromium/chrome.exe`
- **macOS**: `chromium/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`（CfT 推荐）或 `Chromium.app/Contents/MacOS/Chromium`
- **Linux**: `chromium/chrome`

**切勿**将 `./chromium` 软链接到系统里的「Google Chrome」——OpenOcta 会拒绝启动 `/Applications/Google Chrome.app`，且 Rod 控制日常浏览器容易崩溃（SIGSEGV）。

## 获取 Chromium 二进制

### 方式一：安装引导（推荐，有网）

首次打开 **Setup Wizard → 环境初始化**，勾选 Chromium 并点击「开始初始化」。Gateway 通过 **Rod** 在 Google / NPM（npmmirror）等镜像间竞速下载，安装到：

`~/.openocta/browser/rod`（Windows: `%APPDATA%\openocta\browser\rod`）

旧版 CfT 目录 `~/.openocta/browser/chromium` 仍会被识别。

API：`GET /api/browser/install/status`、`POST /api/browser/install`

### 方式二：构建机预打包（离线分发）

在**有网络的构建机**上下载 CfT 或 Playwright chromium build，按上文目录布局打入安装包。

## 用户数据目录

浏览器 Profile 默认位于 `~/.openocta/browser/profile`（Windows: `%APPDATA%\openocta\browser\profile`）。可通过 `OPENOCTA_BROWSER_PROFILE_DIR` 覆盖。

## Agent 使用

聊天中 Agent 可直接调用内置工具 `browser`（无需 MCP）：

```json
{ "action": "open", "url": "https://www.zhipin.com", "label": "jobs" }
{ "action": "snapshot", "targetId": "jobs" }
{ "action": "act", "targetId": "jobs", "request": { "kind": "click", "ref": "3" } }
```

Gateway WebSocket 方法 `browser.request` 使用相同参数。桌面 HTTP：`POST /api/desktop/browser`。
