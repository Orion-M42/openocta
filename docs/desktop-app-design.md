# OpenOcta PC 端桌面应用设计方案

本文档描述将 OpenOcta 构建为跨平台 PC 端应用的完整设计方案与改动计划。

**打包策略确认**：

| 平台 | 打包方式 | 运行形态 | 界面呈现 |
|------|----------|----------|----------|
| **Windows** | Wails 封装 → .msi / .exe | 桌面应用（APP） | 应用窗口内嵌 UI，不使用浏览器 |
| **macOS** | Wails 封装 → .dmg / .app | 桌面应用（APP） | 同上 |
| **Linux** | deb / rpm 安装包（沿用现有流程） | 系统服务（systemd） | 用户通过浏览器访问 `http://<IP>:18900` |

---

## 一、需求概述

### 1.1 目标

| 平台 | 安装方式 | 启动方式 | 监听地址 | 典型场景 |
|------|----------|----------|----------|----------|
| **Linux** | .deb / .rpm / tar.gz | systemd 服务 | `0.0.0.0:18900` | 服务器部署、远程运维、团队共享 |
| **Windows** | .msi / .exe | 桌面应用图标 | `127.0.0.1:18900` | 个人办公、本地使用 |
| **macOS** | .dmg / .app | 应用图标 | `127.0.0.1:18900` | 个人办公、本地使用 |

### 1.2 与现有架构的关系

- **复用**：Gateway 层、Agent Runtime 层、embed/frontend 与 Gateway API；
- **改动**：Gateway 地址绑定逻辑、新增 Wails 桌面壳（仅 Windows/macOS）；
- **Linux**：不引入 Wails，仅 deb/rpm 安装包 + systemd 服务。

---

## 二、技术方案

### 2.1 整体架构

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Windows / macOS：Wails 桌面应用壳                                         │
│  - 启动时以 goroutine 启动 Gateway（desktop 模式，127.0.0.1:18900）        │
│  - 主窗口 WebView 加载 http://127.0.0.1:18900                              │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Gateway 层 (HTTP)                                                         │
│  - 根据 run_mode 决定 bind: 127.0.0.1 或 0.0.0.0                           │
│  - /health /config /chat /ws /hooks/* 等 API + embed/frontend              │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Agent Runtime 层（保持不变）                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Linux：无桌面壳，直接 systemd 服务                                        │
│  - openocta gateway run（service 模式，0.0.0.0:18900）                     │
│  - 用户通过浏览器访问 http://<IP>:18900                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心改造点

#### 2.2.1 Gateway 地址绑定

- **新增**：`pkg/paths` 中 `ResolveGatewayAddr(port int, mode string) string`；
- **新增**：`ResolveRunMode(env, cfg) string`，优先级：`OPENOCTA_RUN_MODE` > `gateway.mode` > 平台默认；
- **平台默认**：`darwin` / `windows` → `desktop`，`linux` → `service`；
- **修改**：`gateway.go` 中 `addr` 使用 `ResolveGatewayAddr`。

#### 2.2.2 Wails 桌面壳（仅 Windows / macOS）

- **目录**：新建 `app/`（或 `desktop/` 下）Wails 项目；
- **前端**：复用现有 `ui/` 构建产物（`embed/frontend`），或 Wails 开发时直接加载 `http://127.0.0.1:18900`；
- **后端**：Wails 主进程启动时以 goroutine 或子进程启动 Gateway（desktop 模式）；
- **打包**：`wails build` 生成 .exe/.app，可选 NSIS 生成 .msi。

#### 2.2.3 Linux 系统服务

- **沿用**：`deploy/openocta.service`、`deploy/scripts/postinstall.sh`、`postremove.sh`；
- **修改**：`openocta.service` 中增加 `Environment=OPENOCTA_RUN_MODE=service`，确保绑定 `0.0.0.0:18900`；
- **打包**：沿用 GoReleaser nfpms，不引入 Wails。

---

## 三、整体改动计划

### 3.1 阶段一：Gateway 地址绑定与 run_mode（约 1 周）

**目标**：支持根据运行模式决定监听地址，为 Wails 与 Linux 服务端提供统一入口。

| 序号 | 任务 | 涉及文件 | 说明 |
|------|------|----------|------|
| 1.1 | 新增 `ResolveRunMode` | `src/pkg/paths/paths.go` | 解析 env、config，返回 `desktop` / `service` |
| 1.2 | 新增 `ResolveGatewayAddr` | `src/pkg/paths/paths.go` | `desktop` → `127.0.0.1:port`，`service` → `:port` |
| 1.3 | 配置 schema 扩展 | `src/pkg/config/schema.go` | `GatewayConfig.Mode` 增加 `desktop` / `service` 语义 |
| 1.4 | 修改 gateway run | `src/cmd/openocta/commands/gateway.go` | 使用 `ResolveRunMode` + `ResolveGatewayAddr` 构建 addr |
| 1.5 | 修改 systemd 服务 | `deploy/openocta.service` | 增加 `Environment=OPENOCTA_RUN_MODE=service` |
| 1.6 | 单元测试 | `src/pkg/paths/paths_test.go` | 覆盖不同 mode 下的地址解析 |

**验收**：`OPENOCTA_RUN_MODE=desktop openocta gateway run` 仅监听 `127.0.0.1`；`OPENOCTA_RUN_MODE=service` 或 Linux 下监听 `0.0.0.0`。

---

### 3.2 阶段二：Wails 项目初始化（约 1–2 周）

**目标**：搭建 Wails 项目骨架，接入现有 UI 与 Gateway。

| 序号 | 任务 | 涉及文件/目录 | 说明 |
|------|------|---------------|------|
| 2.1 | 创建 Wails 项目 | `app/` 或 `desktop/` | `wails init -t lit` 或基于 Lit 模板 |
| 2.2 | 配置前端引用 | `app/frontend/` 或 `app/wails.json` | 指向 `../ui` 或 build 后 `../src/embed/frontend` |
| 2.3 | 配置 build 输出 | `app/wails.json` | `assets` 使用 embed/frontend 或构建产物 |
| 2.4 | 主入口启动 Gateway | `app/main.go` | 以 goroutine 调用 `gatewayhttp.NewServer` 并 `ListenAndServe` |
| 2.5 | 窗口加载 URL | `app/wails.json` 或 `app/app.go` | `URL: "http://127.0.0.1:18900"` |
| 2.6 | 依赖管理 | `app/go.mod` | 引用 `github.com/openocta/openocta` 作为 module，或通过 replace 指向 `../src` |

**目录结构建议**：

```
OctopusClaw/
├── app/                    # Wails 桌面应用（仅 Windows/macOS 构建）
│   ├── main.go
│   ├── app.go
│   ├── wails.json
│   ├── go.mod              # replace => ../src
│   └── frontend/           # 可选：开发时用 vite 或直接引用 ui
├── src/
│   ├── cmd/openocta/       # 现有 CLI 入口
│   ├── pkg/
│   └── embed/frontend/     # 现有 UI 构建产物
├── ui/                     # 现有前端
└── deploy/
```

**验收**：`cd app && wails dev` 可打开窗口并加载 Control UI；`wails build` 可生成可执行文件。

---

### 3.3 阶段三：Wails 与 Gateway 集成（约 1 周）

**目标**：Wails 主进程内嵌启动 Gateway，确保启动顺序与端口可用。

| 序号 | 任务 | 涉及文件 | 说明 |
|------|------|----------|------|
| 3.1 | Gateway 启动前等待 | `app/main.go` | 先启动 Gateway goroutine，等待 `http://127.0.0.1:18900/health` 就绪后再创建窗口 |
| 3.2 | 环境变量 | `app/main.go` | 启动前设置 `OPENOCTA_RUN_MODE=desktop` |
| 3.3 | 退出时关闭 Gateway | `app/main.go` | 监听 Wails 退出事件，调用 `srv.Shutdown` |
| 3.4 | 端口冲突处理 | `app/main.go` 或 `pkg/infra` | 若 18900 被占用，可尝试动态端口或提示用户 |

**验收**：双击 Wails 应用后，窗口内直接显示 Control UI，无需手动启动 Gateway。

---

### 3.4 阶段四：打包与发布流程（约 1 周）

**目标**：统一构建脚本，产出各平台安装包。

| 序号 | 任务 | 涉及文件 | 说明 |
|------|------|----------|------|
| 4.1 | Makefile 扩展 | `Makefile` | 新增 `build-desktop`、`build-linux` 等 target |
| 4.2 | Windows 打包 | `app/` | `wails build -platform windows/amd64`，可选 NSIS 生成 .msi |
| 4.3 | macOS 打包 | `app/` | `wails build -platform darwin/arm64,darwin/amd64`，可选 .dmg 脚本 |
| 4.4 | Linux 打包 | 现有 | 沿用 `make build` + `goreleaser release`，产出 deb/rpm |
| 4.5 | CI 集成 | `.gitlab-ci.yml` 或 CI 配置 | 分支：Windows/macOS 走 Wails 构建，Linux 走 GoReleaser |

**构建命令示例**：

```bash
# Linux 构建（现有）
make build
goreleaser release --snapshot --clean --skip=publish

# Windows/macOS 桌面应用构建
make ui
cd app && wails build -platform windows/amd64
cd app && wails build -platform darwin/arm64
```

---

### 3.5 阶段五：文档与配置（约 0.5 周）

| 序号 | 任务 | 涉及文件 | 说明 |
|------|------|----------|------|
| 5.1 | 更新 dist-README | `deploy/dist-README.md` | 补充桌面应用安装说明、Windows/macOS 与 Linux 差异 |
| 5.2 | 更新 configuration | `src/docs/configuration.md` | 补充 `gateway.mode` 说明 |
| 5.3 | 证书与签名说明 | `src/docs/desktop-app-design.md` 或新文档 | 可选：Windows 代码签名、macOS 公证 |

---

## 四、文件改动清单

### 4.1 阶段一

| 文件 | 改动类型 |
|------|----------|
| `src/pkg/paths/paths.go` | 新增 `ResolveRunMode`、`ResolveGatewayAddr` |
| `src/pkg/paths/paths_test.go` | 新增测试 |
| `src/pkg/config/schema.go` | `GatewayConfig.Mode` 文档/扩展（若已有可忽略） |
| `src/cmd/openocta/commands/gateway.go` | 使用 `ResolveRunMode`、`ResolveGatewayAddr` |
| `deploy/openocta.service` | 增加 `Environment=OPENOCTA_RUN_MODE=service` |

### 4.2 阶段二、三

| 文件/目录 | 改动类型 |
|-----------|----------|
| `app/` | 新建（Wails 项目） |
| `Makefile` | 新增 `build-desktop` 等 target |

### 4.3 阶段四、五

| 文件 | 改动类型 |
|------|----------|
| `Makefile` | 扩展 |
| `deploy/dist-README.md` | 更新 |
| `src/docs/configuration.md` | 更新 |

---

## 五、安全与合规

### 5.1 桌面模式（Windows / macOS）

- 仅监听 `127.0.0.1`，不对外暴露端口；
- 适用于个人办公场景。

### 5.2 服务模式（Linux）

- 监听 `0.0.0.0:18900`，需配置 `gateway.auth`、防火墙；
- 生产环境建议 HTTPS 反向代理。

### 5.3 证书与签名（可选）

- **Windows**：可选购买代码签名证书，消除 SmartScreen 警告；
- **macOS**：建议加入 Apple Developer Program 并完成公证（Notarization）。

---

## 六、参考文档

- [architecture.md](./architecture.md) - OpenOcta 整体架构
- [configuration.md](./configuration.md) - 配置说明
- [deploy/dist-README.md](../../deploy/dist-README.md) - 安装与快速访问指南
- [Wails 官方文档](https://wails.io/docs/introduction) - 桌面应用框架

---

## 七、附录：配置示例

### 7.1 桌面模式（Windows / macOS）

```json
{
  "gateway": {
    "port": 18900,
    "mode": "desktop",
    "bind": "loopback",
    "auth": { "mode": "token", "token": "your-token" }
  }
}
```

### 7.2 服务模式（Linux）

```json
{
  "gateway": {
    "port": 18900,
    "mode": "service",
    "bind": "lan",
    "auth": { "mode": "token", "token": "your-secure-token" }
  }
}
```

### 7.3 环境变量覆盖

```bash
OPENOCTA_RUN_MODE=desktop openocta gateway run   # 仅本机
OPENOCTA_RUN_MODE=service openocta gateway run  # 可远程
```
