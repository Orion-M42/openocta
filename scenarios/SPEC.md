# OpenOcta 场景模板规范（第三方）

本文档说明 `scenarios/` 目录下**场景模板**的结构、字段语义与集成方式，供第三方开发者、集成商与离线部署团队参考。

场景模板用于一次性完成某类业务场景的初始化：安装所需 Skill / MCP / 数字员工，声明环境变量，并可选携带离线工具包。同一套清单可在 **OpenOcta 安装引导（图形界面）**、**命令行脚本** 或 **CI/CD 流水线** 中复用。

---

## 1. 术语

| 术语 | 说明 |
|------|------|
| 场景（Scenario） | 一组可重复执行的初始化任务，对应目录 `scenarios/<scenario-id>/` |
| 场景 ID | 目录名，全局唯一，仅允许小写字母、数字与连字符（建议 `kebab-case`） |
| 任务（Task） | 场景内单步操作：安装资源、配置环境变量或声明离线工具 |
| 资源 | 来自 OpenOcta 官网市场的 Skill、MCP 或数字员工 |
| Gateway | OpenOcta 网关服务，提供安装 API 并写入本地配置 |

---

## 2. 目录结构

每个场景必须是一个**自包含目录**，可复制到任意机器独立运行：

```
scenarios/<scenario-id>/
├── README.md           # 人类可读说明（用途、前置条件、示例对话）
├── scenario.json       # 机器可读清单（必选）
├── init.sh             # Linux / macOS 初始化脚本（推荐）
├── init.ps1            # Windows PowerShell 初始化脚本（推荐）
├── init.cmd            # Windows CMD 包装（可选）
├── init.bat            # Windows CMD 包装（可选）
└── bundled/            # 可选：离线安装包（rpm/deb/exe 等）
    └── ...
```

### 命名约束

- `<scenario-id>` 必须与 `scenario.json` 中的 `id` 字段一致。
- 脚本文件名固定为 `init.sh` / `init.ps1` / `init.cmd` / `init.bat`，便于自动化发现。
- `bundled/` 内文件路径使用相对路径，在 `scenario.json` 的 `bundledTools[].relativePath` 中引用。

---

## 3. `scenario.json` 规范

### 3.1 顶层结构

```json
{
  "id": "host-inspection",
  "name": "主机巡检场景",
  "summary": "定期巡检主机 CPU、内存、磁盘与服务状态。",
  "skills": [],
  "mcps": [],
  "employees": [],
  "env": [],
  "bundledTools": []
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 场景唯一标识，等于目录名 |
| `name` | string | 是 | 展示名称（中文或英文均可） |
| `summary` | string | 是 | 一句话摘要，用于引导页卡片 |
| `skills` | array | 是 | 需安装的 Skill 列表，无则 `[]` |
| `mcps` | array | 是 | 需安装的 MCP 列表，无则 `[]` |
| `employees` | array | 是 | 需安装的数字员工列表，无则 `[]` |
| `env` | array | 是 | 使用前需配置的环境变量声明，无则 `[]` |
| `bundledTools` | array | 是 | 离线工具包声明，无则 `[]` |

### 3.2 资源对象（`skills` / `mcps` / `employees`）

三类数组元素结构相同：

```json
{
  "id": "host-inspection",
  "name": "host-inspection",
  "description": "主机巡检与指标采集技能",
  "downloadUrl": "https://openocta.com/skills/host-inspection",
  "category": "运维"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 市场资源 ID。Skill 为 folder 名；MCP / 数字员工为市场 numeric id 或 slug（与官网 API 一致） |
| `name` | string | 是 | 展示名称 |
| `description` | string | 否 | 资源说明 |
| `downloadUrl` | string | 否 | 文档/溯源链接；实际安装由 Gateway 从官网拉取，非直接下载此 URL |
| `category` | string | 否 | 市场分类，安装请求中的 `type` / `category`；缺省时脚本默认 `"运维"` |

### 3.3 环境变量（`env`）

```json
{
  "name": "SSH_HOST",
  "description": "默认 SSH 巡检目标主机",
  "required": true,
  "example": "192.168.1.10"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 环境变量名，写入 `openocta.json` → `env.vars.<name>` |
| `description` | string | 是 | 配置说明 |
| `required` | boolean | 否 | 是否必填；引导页会标注 |
| `example` | string | 否 | 示例值，便于用户理解 |

**运行时行为：**

- 安装引导中用户填写的值会通过 Gateway 合并写入 `openocta.json` 的 `env.vars`。
- 初始化脚本**不会**自动写入配置文件，仅打印需配置的变量列表；请自行 export 或修改 `openocta.json`。

### 3.4 离线工具包（`bundledTools`）

```json
{
  "name": "openssh-clients",
  "description": "SSH 客户端离线 deb 包",
  "platform": "linux-deb",
  "relativePath": "bundled/openssh-clients_amd64.deb"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 工具名称 |
| `description` | string | 否 | 说明 |
| `platform` | string | 是 | 目标平台，见下表 |
| `relativePath` | string | 是 | 相对场景根目录的路径 |

**`platform` 枚举：**

| 值 | 含义 |
|----|------|
| `linux-rpm` | Linux RPM 包 |
| `linux-deb` | Linux DEB 包 |
| `windows-exe` | Windows 可执行安装包 |
| `macos` | macOS 安装包或脚本 |
| `any` | 跨平台或文档占位 |

当前 OpenOcta **不会**自动安装 `bundledTools` 中的文件；脚本与引导页仅作声明与提示，由运维在目标机手动安装或使用自有 CM 工具下发。

---

## 4. 任务类型与执行语义

OpenOcta 将 `scenario.json` 展开为有序任务列表（见 `ui/src/ui/scenario-templates.ts`）。任务种类与行为如下：

| 任务 kind | 来源 | 执行行为 |
|-----------|------|----------|
| `skill` | `skills[]` | 调用 Gateway 安装 API，从官网下载并解压 Skill |
| `mcp` | `mcps[]` | 同上，安装 MCP 服务配置 |
| `employee` | `employees[]` | 同上，安装数字员工 |
| `env` | `env[]` | 引导页收集值并写入 `env.vars`；CLI 脚本仅提示 |
| `tool` | `bundledTools[]` | 仅记录离线包路径，不自动安装 |

任务按数组顺序串行执行；任一步失败会标记为 `failed`，其余步骤仍会继续（引导页可停止初始化）。

---

## 5. 初始化脚本规范

### 5.1 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENOCTA_GATEWAY_URL` | `http://127.0.0.1:18900` | Gateway 根 URL |
| `OPENOCTA_GATEWAY_TOKEN` | 空 | 可选；配置后作为 `Authorization: Bearer <token>` |

### 5.2 脚本职责

1. 定位同目录下的 `scenario.json`。
2. 遍历 `skills`、`mcps`（建议同时支持 `employees`），调用安装 API。
3. 打印 `env` 与 `bundledTools` 清单。
4. 退出码：`0` 表示脚本本身执行完毕（单条安装失败可 warn 但不中断，与内置脚本一致）。

### 5.3 依赖

- **Bash 脚本**：需要 `curl`、`jq`。
- **PowerShell 脚本**：建议 5.1+，使用 `Invoke-RestMethod`。

### 5.4 安装 API（第三方集成重点）

**请求**

```http
POST {OPENOCTA_GATEWAY_URL}/api/v1/install
Content-Type: application/json
Authorization: Bearer {OPENOCTA_GATEWAY_TOKEN}   # 若 Gateway 启用了 Token 认证

{
  "kind": "skill",
  "id": "host-inspection",
  "type": "运维",
  "category": "运维"
}
```

| 字段 | 说明 |
|------|------|
| `kind` | `skill` \| `mcp` \| `employee` |
| `id` | 与 `scenario.json` 中对应资源的 `id` |
| `type` / `category` | 市场分类，可相同；缺省时 Gateway 使用 `"其它"` |

**响应（成功）**

```json
{
  "ok": true,
  "id": "host-inspection",
  "kind": "skill"
}
```

Gateway 会从 OpenOcta 官网下载资源包，写入本地目录，并更新 `openocta.json` / 安装元数据。

> **注意**：部分内置 `init.sh` 历史版本使用路径 `/api/v1/site/install`，请以 **`/api/v1/install`** 为准；新场景请直接使用正确路径。

### 5.5 示例（Bash 片段）

```bash
install_kind() {
  local kind="$1" id="$2" category="$3"
  curl -fsS -H "Content-Type: application/json" \
    ${TOKEN:+-H "Authorization: Bearer ${TOKEN}"} \
    -X POST "${GATEWAY_URL%/}/api/v1/install" \
    -d "{\"kind\":\"${kind}\",\"id\":\"${id}\",\"type\":\"${category}\",\"category\":\"${category}\"}"
}
```

---

## 6. 与 OpenOcta 控制端（安装引导）集成

图形界面**不会**自动扫描 `scenarios/` 目录。要在「场景初始化」步骤中展示新场景，需在 OpenOcta 源码中注册模板：

**文件**：`ui/src/ui/scenario-templates.ts`

```typescript
{
  id: "my-scenario",              // 与 scenario.json.id 一致
  name: "我的场景",
  summary: "...",
  readmePath: "scenarios/my-scenario/README.md",
  initScriptPaths: {
    sh: "scenarios/my-scenario/init.sh",
    ps1: "scenarios/my-scenario/init.ps1",
    cmd: "scenarios/my-scenario/init.cmd",
    bat: "scenarios/my-scenario/init.bat",
  },
  tasks: [ /* 与 scenario.json 等价的任务列表 */ ],
}
```

**同步要求**

- `scenario.json` 与 `scenario-templates.ts` 中的资源、环境变量、离线包声明应保持一致。
- 修改场景内容后，若仅更新 `scenario.json` 而不同步 TS，引导页执行结果可能与 CLI 脚本不一致。

**仅使用 CLI / 离线包、不修改 OpenOcta 源码的第三方**：只需交付 `scenarios/<id>/` 目录，用户配置 Gateway 后运行 `init.sh` 即可，无需注册 TS。

---

## 7. 配置持久化

| 内容 | 写入位置 |
|------|----------|
| Skill / MCP / 员工 | Gateway 安装逻辑写入对应配置段与本地目录 |
| 场景环境变量 | `openocta.json` → `env.vars` |
| 引导完成状态 | `openocta.json` → `wizard.setup`（版本、状态、时间） |

环境变量示例：

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

---

## 8. 创建新场景 Checklist

- [ ] 选定全局唯一的 `scenario-id`（`kebab-case`）
- [ ] 创建目录 `scenarios/<scenario-id>/`
- [ ] 编写 `scenario.json`，`id` 与目录名一致
- [ ] 编写 `README.md`（场景说明、前置条件、示例 Prompt）
- [ ] 实现 `init.sh` / `init.ps1`（及可选 cmd/bat），调用 `/api/v1/install`
- [ ] 如需离线部署，将安装包放入 `bundled/` 并在 `bundledTools` 中声明
- [ ] 在目标环境验证：Gateway 可访问、Token 正确、资源 ID 在官网存在
- [ ] （可选）向 OpenOcta 上游提交 `scenario-templates.ts` 注册，以支持安装引导

---

## 9. 内置场景参考

| ID | 名称 | 主要资源 |
|----|------|----------|
| `host-inspection` | 主机巡检 | Skill `host-inspection`、MCP `system-metrics`、SSH 环境变量 |
| `database-ops` | 数据库运维 | Skill `database-ops`、MCP `sql-toolkit`、`DB_DSN` |
| `k8s-incident` | K8s 处置 | Skill `k8s-incident`、MCP `kubernetes`、`KUBECONFIG` |
| `browser-office` | 浏览器办公 | Skill `browser-office`、MCP `browser`、可选 `HTTP_PROXY` |

完整示例见各子目录下的 `scenario.json` 与 `README.md`。

---

## 10. 版本与兼容性

- 场景清单格式当前为 **v1**（无独立 schema 版本字段）；新增字段应保持向后兼容（旧客户端忽略未知字段）。
- 安装 API 与官网市场绑定；资源 `id` 必须在 OpenOcta 市场存在，否则安装返回 4xx/5xx。
- 引导场景步骤版本由 OpenOcta 产品版本管理（`SETUP_WIZARD_VERSION`），与单个 `scenario.json` 无直接耦合。

---

## 11. 常见问题

**Q：只复制 `scenario.json` 能否运行？**  
A：可以调用 Gateway API 手动安装，但推荐连同 `init.*` 与 `bundled/` 一并分发。

**Q：`downloadUrl` 是否会被脚本直接下载？**  
A：不会。安装始终经 Gateway 从官网拉取；`downloadUrl` 仅作文档链接。

**Q：如何在不改 UI 的情况下让用户使用我的场景？**  
A：提供场景目录 + 文档，用户设置 `OPENOCTA_GATEWAY_*` 后执行 `init.sh` / `init.ps1`。

**Q：employees 在 init 脚本里未安装？**  
A：内置脚本当前仅遍历 `skills` 与 `mcps`；若场景含数字员工，请在自定义脚本中增加对 `employees` 数组的安装逻辑，或在引导页注册模板由 UI 执行。

---

## 12. 相关源码索引

| 路径 | 说明 |
|------|------|
| `scenarios/` | 场景目录与示例 |
| `ui/src/ui/scenario-templates.ts` | 控制端内置场景与任务定义 |
| `ui/src/ui/controllers/setup-wizard-scenarios.ts` | 引导页场景执行逻辑 |
| `ui/src/ui/controllers/remote-market.ts` | `installFromSite` → `/api/v1/install` |
| `src/pkg/gateway/http/site_install.go` | Gateway 安装实现 |

如有集成问题，请携带 `scenario.json`、Gateway 版本与安装 API 响应一并反馈。
