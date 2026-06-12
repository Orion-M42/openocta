# OpenOcta 场景配置模板

本目录包含可在 **安装引导** 或 **离线初始化** 中使用的场景模板。

**第三方开发者**请参阅完整规范：[SPEC.md](./SPEC.md)（目录结构、`scenario.json` 字段、Gateway API、集成 Checklist）。

每个场景目录结构如下：

```
scenarios/<scenario-id>/
  README.md          # 场景说明、环境变量、使用方式
  scenario.json      # 机器可读清单（Skill/MCP/环境变量/离线包）
  init.sh            # Linux/macOS 初始化
  init.ps1           # Windows PowerShell
  init.cmd / init.bat # Windows CMD
  bundled/           # 可选离线安装包（rpm/deb/exe 等）
```

## 使用方式

### 1. 图形界面（推荐）

首次启动 OpenOcta 控制端时，若当前版本尚未完成引导，会弹出 **安装引导**  wizard。在「场景初始化」步骤中选择场景并执行即可。

### 2. 命令行 / CI

进入场景目录后执行对应平台脚本。脚本会读取 `scenario.json`，通过 Gateway HTTP API 安装 Skill、MCP，并输出需配置的环境变量。

```bash
cd scenarios/host-inspection
export OPENOCTA_GATEWAY_URL="http://127.0.0.1:18900"
export OPENOCTA_GATEWAY_TOKEN="your-token"
./init.sh
```

Windows PowerShell:

```powershell
cd scenarios\host-inspection
$env:OPENOCTA_GATEWAY_URL = "http://127.0.0.1:18900"
$env:OPENOCTA_GATEWAY_TOKEN = "your-token"
.\init.ps1
```

### 3. 复制到其他环境

将整个 `scenarios/<id>/` 目录复制到目标机器，配置 `OPENOCTA_GATEWAY_URL` 与 `OPENOCTA_GATEWAY_TOKEN` 后运行脚本即可完成同等初始化。

## 内置场景

| ID | 名称 | 说明 |
|----|------|------|
| `host-inspection` | 主机巡检 | SSH 巡检、系统指标 MCP |
| `database-ops` | 数据库运维 | 慢 SQL、备份校验 |
| `k8s-incident` | K8s 处置 | Pod/事件/日志排查 |
| `browser-office` | 浏览器办公 | 网页自动化与表单操作 |

## scenario.json 字段

- `skills` / `mcps` / `employees`：远程市场资源 ID、名称、分类与下载链接
- `env`：使用前需配置的环境变量
- `bundledTools`：相对 `bundled/` 的离线包路径（可选，避免外网下载）

前端内置定义见 `ui/src/ui/scenario-templates.ts`，需与 `scenario.json` 保持同步。
