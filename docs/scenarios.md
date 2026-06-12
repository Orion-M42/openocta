# 场景初始化说明

OpenOcta **场景（Scenario）** 是一组可重复执行的初始化任务：一次性安装某类业务所需的 Skill、MCP、数字员工，声明环境变量，并可选携带离线工具包。同一套清单可在 **安装引导（图形界面）**、**命令行脚本** 或 **CI/CD 流水线** 中复用。

场景模板源码位于仓库 `scenarios/` 目录；完整字段规范见 [`scenarios/SPEC.md`](../scenarios/SPEC.md)。

---

## 一、场景能做什么

| 能力 | 说明 |
|------|------|
| 安装 Skill | 从 OpenOcta 官网市场拉取并解压到本地，注册到 Agent 运行时 |
| 安装 MCP | 写入 MCP 服务配置，供 Agent 调用外部工具 |
| 安装数字员工 | 安装预置 Agent 角色与工作流 |
| 声明环境变量 | 引导用户配置连接凭据、集群路径等运行时参数 |
| 离线工具包 | 在 `bundled/` 中携带 rpm/deb/exe 等，供内网环境手动安装 |

场景**不会**替代 Gateway 的基础配置（工作区、模型、渠道等）。使用前需先完成 Gateway 启动与基本配置，详见 [配置说明](./configuration.md)。

---

## 二、内置场景

| ID | 名称 | 主要资源 | 关键环境变量 |
|----|------|----------|--------------|
| `host-inspection` | 主机巡检 | Skill `ansible-ops`、MCP `Prometheus-MCP` | `SSH_HOST`、`SSH_USER` |
| `database-ops` | 数据库运维 | Skill `postgres-patterns`、MCP `MySQL-MCP` | `DB_DSN` |
| `k8s-incident` | K8s 处置 | Skill `kubernetes-devops`、MCP `k8s-MCP` | `KUBECONFIG` |
| `browser-office` | 浏览器办公 | Skill `browserless-agent`、MCP `playwright-MCP` | `HTTP_PROXY`（可选） |

各场景的人类可读说明见 `scenarios/<id>/README.md`，机器可读清单见 `scenarios/<id>/scenario.json`。

---

## 三、前置条件

在初始化任意场景前，请确认：

1. **Gateway 已运行**，默认监听 `http://127.0.0.1:18900`（端口可在 `openocta.json` → `gateway.port` 修改）。
2. **网络可达**（或已准备离线包）：Skill / MCP 安装经 Gateway 从官网市场拉取；资源 `id` 必须在市场中存在。
3. **（可选）Token 认证**：若 Gateway 启用了 `gateway.auth.token`，初始化脚本需携带 Bearer Token。

相关环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENOCTA_GATEWAY_URL` | `http://127.0.0.1:18900` | Gateway 根 URL，供 `init.sh` / `init.ps1` 调用安装 API |
| `OPENOCTA_GATEWAY_TOKEN` | 空 | 可选；配置后作为 `Authorization: Bearer <token>` 发送 |

更多 Gateway 与配置路径说明见 [环境变量说明](./environment-variables.md)。

---

## 四、如何初始化场景

### 4.1 图形界面（推荐）

首次启动 OpenOcta 控制端时，若当前版本尚未完成安装引导，会弹出 **安装引导** wizard。在 **「场景初始化」** 步骤中：

1. 选择内置场景（如「主机巡检场景」）。
2. 按提示填写 `scenario.json` 中声明的环境变量（必填项会标注）。
3. 执行初始化；Gateway 依次安装 Skill / MCP / 数字员工，并将环境变量写入 `openocta.json` → `env.vars`。

引导完成后，状态记录在 `openocta.json` → `wizard.setup`。

### 4.2 命令行 / CI

进入场景目录，设置 Gateway 地址与 Token 后执行对应平台脚本。脚本读取 `scenario.json`，调用 Gateway HTTP API 安装资源，并打印需手动配置的环境变量。

**Linux / macOS：**

```bash
cd scenarios/host-inspection
export OPENOCTA_GATEWAY_URL="http://127.0.0.1:18900"
export OPENOCTA_GATEWAY_TOKEN="your-token"   # 若 Gateway 启用了 Token
./init.sh
```

**Windows PowerShell：**

```powershell
cd scenarios\host-inspection
$env:OPENOCTA_GATEWAY_URL = "http://127.0.0.1:18900"
$env:OPENOCTA_GATEWAY_TOKEN = "your-token"
.\init.ps1
```

**Windows CMD：**

```cmd
cd scenarios\host-inspection
set OPENOCTA_GATEWAY_URL=http://127.0.0.1:18900
set OPENOCTA_GATEWAY_TOKEN=your-token
init.cmd
```

脚本依赖：

- Bash：`curl`、`jq`
- PowerShell：5.1+，使用 `Invoke-RestMethod`

### 4.3 配置环境变量

CLI 脚本**不会**自动写入配置文件，仅打印 `env` 清单。请任选一种方式配置：

**方式 A：写入 `openocta.json`（推荐）**

配置文件默认路径：`~/.openocta/openocta.json`（可用 `OPENOCTA_CONFIG_PATH` 覆盖）。

```json
{
  "env": {
    "vars": {
      "SSH_HOST": "192.168.1.10",
      "SSH_USER": "ops"
    }
  }
}
```

Gateway 启动后会将 `env.vars` 中尚未在进程中存在的键注入为环境变量（已被 OS 环境变量设置的同名键优先生效）。详见 [环境变量说明](./environment-variables.md)。

**方式 B：导出 OS 环境变量**

```bash
export SSH_HOST="192.168.1.10"
export SSH_USER="ops"
```

**方式 C：图形引导**

在安装引导「场景初始化」步骤中填写，由 Gateway 合并写入 `env.vars`。

### 4.4 离线 / 跨环境部署

将整个 `scenarios/<id>/` 目录复制到目标机器（含 `bundled/` 离线包），配置 `OPENOCTA_GATEWAY_*` 后运行 `init.sh` 或 `init.ps1`，效果与开发机一致。

`bundledTools` 中声明的离线包**不会**被 OpenOcta 自动安装，需运维手动安装或使用 CM 工具下发。

---

## 五、安装 API 说明

初始化脚本通过 Gateway 安装资源：

```http
POST {OPENOCTA_GATEWAY_URL}/api/v1/install
Content-Type: application/json
Authorization: Bearer {OPENOCTA_GATEWAY_TOKEN}   # 可选

{
  "kind": "skill",
  "id": "ansible-ops",
  "type": "运维",
  "category": "运维"
}
```

| 字段 | 说明 |
|------|------|
| `kind` | `skill` \| `mcp` \| `employee` |
| `id` | 与 `scenario.json` 中对应资源的 `id`（Skill 为 folder 名；MCP / 数字员工为市场 numeric id 或 slug） |
| `type` / `category` | 市场分类；缺省时 Gateway 使用 `"其它"` |

成功响应示例：

```json
{
  "ok": true,
  "id": "ansible-ops",
  "kind": "skill"
}
```

Gateway 从官网下载资源包，写入本地目录，并更新 `openocta.json` 与安装元数据。`scenario.json` 中的 `downloadUrl` 仅作文档链接，**不会**被脚本直接下载。

---

## 六、如何创建新场景

以下步骤面向第三方开发者、集成商与离线部署团队。

### 6.1 选定场景 ID

- 全局唯一，仅允许小写字母、数字与连字符（建议 `kebab-case`）。
- 目录名必须与 `scenario.json` 中的 `id` 字段一致。

示例：`my-custom-ops`

### 6.2 创建目录结构

```
scenarios/my-custom-ops/
├── README.md           # 人类可读说明（用途、前置条件、示例对话）
├── scenario.json       # 机器可读清单（必选）
├── init.sh             # Linux / macOS 初始化脚本（推荐）
├── init.ps1            # Windows PowerShell（推荐）
├── init.cmd            # Windows CMD 包装（可选）
├── init.bat            # Windows CMD 包装（可选）
└── bundled/            # 可选：离线安装包
    └── ...
```

可复制现有场景（如 `host-inspection`）作为起点，再修改 `scenario.json` 与 README。

### 6.3 编写 `scenario.json`

```json
{
  "id": "my-custom-ops",
  "name": "我的运维场景",
  "summary": "一句话摘要，用于引导页卡片。",
  "skills": [
    {
      "id": "my-skill-id",
      "name": "My Skill",
      "description": "技能说明",
      "downloadUrl": "https://openocta.com/skills/my-skill-id",
      "category": "运维"
    }
  ],
  "mcps": [
    {
      "id": "42",
      "name": "My-MCP",
      "description": "MCP 说明",
      "category": "运维"
    }
  ],
  "employees": [],
  "env": [
    {
      "name": "MY_API_KEY",
      "description": "第三方 API 密钥",
      "required": true,
      "example": "sk-xxx"
    }
  ],
  "bundledTools": []
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` / `name` / `summary` | 是 | 场景标识与展示信息 |
| `skills` / `mcps` / `employees` | 是 | 资源列表，无则 `[]` |
| `env` | 是 | 环境变量声明，无则 `[]` |
| `bundledTools` | 是 | 离线包声明，无则 `[]` |

`bundledTools` 示例：

```json
{
  "name": "openssh-clients",
  "description": "SSH 客户端离线 deb 包",
  "platform": "linux-deb",
  "relativePath": "bundled/openssh-clients_amd64.deb"
}
```

`platform` 枚举：`linux-rpm`、`linux-deb`、`windows-exe`、`macos`、`any`。

完整字段语义见 [`scenarios/SPEC.md`](../scenarios/SPEC.md) 第 3 节。

### 6.4 实现初始化脚本

脚本职责：

1. 定位同目录下的 `scenario.json`。
2. 遍历 `skills`、`mcps`（若含数字员工，还需遍历 `employees`），调用 `POST /api/v1/install`。
3. 打印 `env` 与 `bundledTools` 清单。
4. 退出码 `0` 表示脚本执行完毕（单条安装失败可 warn 但不中断，与内置脚本一致）。

Bash 核心片段（可参考 `scenarios/host-inspection/init.sh`）：

```bash
GATEWAY_URL="${OPENOCTA_GATEWAY_URL:-http://127.0.0.1:18900}"
TOKEN="${OPENOCTA_GATEWAY_TOKEN:-}"

install_kind() {
  local kind="$1" id="$2" category="$3"
  curl -fsS -H "Content-Type: application/json" \
    ${TOKEN:+-H "Authorization: Bearer ${TOKEN}"} \
    -X POST "${GATEWAY_URL%/}/api/v1/install" \
    -d "{\"kind\":\"${kind}\",\"id\":\"${id}\",\"type\":\"${category}\",\"category\":\"${category}\"}"
}

while IFS= read -r line; do
  id=$(echo "$line" | jq -r '.id')
  cat=$(echo "$line" | jq -r '.category // empty')
  install_kind skill "$id" "${cat:-运维}"
done < <(jq -c '.skills[]?' scenario.json)
```

> **注意**：内置 `init.sh` / `init.ps1` 当前仅遍历 `skills` 与 `mcps`。若场景包含 `employees`，请在自定义脚本中增加对 `employees` 数组的安装逻辑。

### 6.5 编写 README.md

建议包含：

- 场景用途与适用对象
- 自动安装的资源列表（Skill / MCP / 员工）
- 前置条件（网络、凭据、CLI 工具等）
- 初始化命令示例
- 安装完成后的示例 Prompt（如：「对 SSH_HOST 执行主机巡检并输出 Markdown 报告」）

### 6.6 验证

- [ ] Gateway 可访问，`OPENOCTA_GATEWAY_TOKEN` 正确（若启用认证）
- [ ] `scenario.json` 中所有资源 `id` 在官网市场存在
- [ ] `./init.sh` 或 `.\init.ps1` 安装成功
- [ ] 环境变量已写入 `openocta.json` 或已 export
- [ ] 在消息页用示例 Prompt 验证 Agent 行为

### 6.7（可选）注册到安装引导

图形界面**不会**自动扫描 `scenarios/` 目录。若希望新场景出现在安装引导的「场景初始化」步骤，需在源码中注册：

**文件**：`ui/src/ui/scenario-templates.ts`

```typescript
{
  id: "my-custom-ops",
  name: "我的运维场景",
  summary: "...",
  readmePath: "scenarios/my-custom-ops/README.md",
  initScriptPaths: {
    sh: "scenarios/my-custom-ops/init.sh",
    ps1: "scenarios/my-custom-ops/init.ps1",
    cmd: "scenarios/my-custom-ops/init.cmd",
    bat: "scenarios/my-custom-ops/init.bat",
  },
  tasks: [ /* 与 scenario.json 等价的任务列表 */ ],
}
```

**同步要求**：`scenario.json` 与 `scenario-templates.ts` 中的资源、环境变量、离线包声明应保持一致；仅改 JSON 而不同步 TS 会导致引导页与 CLI 行为不一致。

**不改 OpenOcta 源码的第三方**：只需交付 `scenarios/<id>/` 目录，用户配置 Gateway 后运行 `init.sh` 即可，无需注册 TS。

---

## 七、配置持久化

| 内容 | 写入位置 |
|------|----------|
| Skill / MCP / 数字员工 | Gateway 安装逻辑写入对应配置段与本地目录 |
| 场景环境变量 | `openocta.json` → `env.vars` |
| 引导完成状态 | `openocta.json` → `wizard.setup` |

Skill 加载优先级与工作区关系见 [Skills 使用说明](./skills.md)；MCP 配置见 [MCP 配置使用说明](./mcp-configuration.md)。

---

## 八、任务执行语义

OpenOcta 将 `scenario.json` 展开为有序任务列表：

| 任务 kind | 来源 | 执行行为 |
|-----------|------|----------|
| `skill` | `skills[]` | 调用 Gateway 安装 API，从官网下载 Skill |
| `mcp` | `mcps[]` | 同上，安装 MCP 服务配置 |
| `employee` | `employees[]` | 同上，安装数字员工 |
| `env` | `env[]` | 引导页收集值并写入 `env.vars`；CLI 脚本仅提示 |
| `tool` | `bundledTools[]` | 仅记录离线包路径，不自动安装 |

任务按数组顺序串行执行；任一步失败会标记为 `failed`，其余步骤仍会继续。

---

## 九、常见问题

**只复制 `scenario.json` 能否运行？**  
可以手动调用 Gateway `/api/v1/install`，但推荐连同 `init.*` 与 `bundled/` 一并分发。

**如何在不改 UI 的情况下让用户使用我的场景？**  
提供场景目录与本文档，用户设置 `OPENOCTA_GATEWAY_*` 后执行 `init.sh` / `init.ps1`。

**场景中的 `employees` 在 init 脚本里未安装？**  
内置脚本当前仅遍历 `skills` 与 `mcps`；含数字员工的场景请在自定义脚本中增加 `employees` 安装逻辑，或在引导页注册模板由 UI 执行。

**安装返回 4xx/5xx？**  
确认资源 `id` 在 OpenOcta 市场存在、Gateway 可访问官网（或检查 `OPENOCTA_SITE_API_BASE_URL`）、Token 与网络策略正确。

---

## 十、相关文档与源码

| 路径 | 说明 |
|------|------|
| [`scenarios/`](../scenarios/) | 场景目录与内置示例 |
| [`scenarios/SPEC.md`](../scenarios/SPEC.md) | 完整规范（第三方集成 Checklist） |
| [`scenarios/README.md`](../scenarios/README.md) | 场景目录快速入门 |
| `ui/src/ui/scenario-templates.ts` | 控制端内置场景与任务定义 |
| `ui/src/ui/controllers/setup-wizard-scenarios.ts` | 引导页场景执行逻辑 |
| `src/pkg/gateway/http/site_install.go` | Gateway 安装实现 |
| [配置说明](./configuration.md) | Gateway 与 `openocta.json` |
| [环境变量说明](./environment-variables.md) | `OPENOCTA_GATEWAY_*` 等变量 |

如有集成问题，请携带 `scenario.json`、Gateway 版本与安装 API 响应一并反馈。
