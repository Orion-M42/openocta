# Skill 上传与创意中心

本文档说明 OpenOcta 控制台中 **Skill 上传向导** 与 **Skill 创意中心** 的功能、交互流程、后端接口及实现结构。

相关文档：

- [Skills 使用说明](./skills.md) — Skill 加载优先级与会话匹配
- [上传文件格式规范](./UPLOAD_FORMAT.md) — ZIP 包通用校验规则

---

## 一、功能概览

在 **技能库** 页面点击 **新增**，会先弹出创建方式选择框，支持两种路径：

| 方式 | 说明 |
|------|------|
| **上传 ZIP** | 上传已有 Skill 压缩包，经 AI 分析后填写元信息并发布到本地托管目录 |
| **创意中心** | 与 AI 多轮对话，从零生成或迭代 `SKILL.md` 草稿，右侧实时预览，支持测试安装与发布 |

两种方式的 **发布目标** 均为 Gateway 所在环境的 **托管 Skills 目录**（默认 `~/.openocta/skills/<name>/`），与 [skills.md](./skills.md) 中的 managed 来源一致。  
**不是** 向 openocta.com 市场后台（`/api/v1/admin/skills`）提交。

---

## 二、前置条件

1. **Gateway 已连接**：控制台需配置 Gateway URL，且 WebSocket 连接正常（创意中心依赖 `skills.compose` RPC）。
2. **默认大模型可用**：AI 分析与创意对话使用当前会话 Agent 的默认 LLM（`runSkillLLMPrompt`），未配置模型时分析与创作会失败。
3. **Gateway Token**（若启用）：HTTP 接口需携带 `Authorization: Bearer <token>`。

---

## 三、Skill 上传向导

### 3.1 交互流程

```
新增 → 选择「上传 ZIP」
  → 步骤 1：上传文件（拖拽 / 选择，最大 50MB）
  → 步骤 2：AI 分析（自动调用，展示摘要与元数据）
  → 步骤 3：填写信息（name / 描述 / 分类 / 标签 / 状态）
  → 发布
```

步骤条固定为三步：**上传文件 → AI 分析 → 填写信息**。

### 3.2 ZIP 包要求

上传区域底部会展示格式说明，核心要求如下：

| 项 | 要求 |
|----|------|
| 必需文件 | `SKILL.md`（**大小写敏感**） |
| Frontmatter | 至少包含 `name`、`description`、`allowed-tools` |
| `name` 格式 | 小写字母、数字、连字符 |
| 可选目录 | `prompts/`、`examples/`、`references/` |
| 可选元数据 | `references/asset-metadata.json` 或 `.yaml`（API 资产依赖声明） |

推荐目录结构：

```text
my-skill.zip/
├── SKILL.md          # 必须
├── prompts/          # 可选
├── examples/         # 可选
└── references/       # 可选
    └── asset-metadata.json
```

### 3.3 步骤 2：AI 分析结果

分析成功后展示：

- 中文摘要（`summary`）
- 推断或读取的 `name`、`category`、标签、允许工具列表
- 压缩包内文件列表（最多展示前 12 个）

分析失败时返回错误信息；若 ZIP 内 `SKILL.md` 不符合规范，可能附带 **模板** 字段供前端提示。

### 3.4 步骤 3：元信息字段

| 字段 | 说明 |
|------|------|
| `name` | Skill 标识，写入托管目录名与 frontmatter |
| `description` | 描述 |
| `category` | 分类（中文） |
| `tags` | 逗号分隔标签 |
| `status` | `open` / `paid` / `private`，默认 `open` |

点击 **发布** 后，Gateway 解压 ZIP 到 `~/.openocta/skills/<name>/`，并将上述元数据写入 `SKILL.md` frontmatter。

---

## 四、Skill 创意中心

### 4.1 交互流程

```
新增 → 选择「创意中心」
  → 选择创作场景（自由创作 / 升级已有 Skill）
  → 左侧与 AI 对话（支持快捷提示）
  → 右侧预览 SKILL.md 草稿
  → 测试安装 或 发布
```

### 4.2 创作方式

创意中心仅支持 **从零开始** 的自由创作：描述需求后，AI 会追问并生成 `SKILL.md` 草稿。

### 4.3 对话与预览

- 首轮展示欢迎语与 4 条 **快捷提示**（如「AI 搜索 Skill」「DeepL 翻译助手」等），点击即可发送。
- 每轮用户消息通过 WebSocket 调用 `skills.compose`，助手回复显示在左侧；若模型在回复末尾附上 markdown 围栏内的 `SKILL.md`，则更新 **右侧预览**。
- `ready: true` 表示草稿 frontmatter 中已有有效的 `name` 与 `description`（可用于判断可否发布）。

### 4.4 测试安装 vs 发布

| 操作 | 行为 |
|------|------|
| **测试安装** | 将当前草稿以 `preview-<timestamp>` 或草稿中的 `name` 写入托管目录，**不关闭弹框**，便于继续修改 |
| **发布** | 校验草稿 `name` 后写入托管目录并关闭弹框，刷新技能列表 |

二者均调用 `POST /api/skills/publish-markdown`，由后端将 markdown 打包为仅含 `SKILL.md` 的 ZIP 再解压发布。

---

## 五、后端接口

所有 HTTP 接口挂载在 Gateway 上，需通过 `requireGatewayToken` 鉴权（与现有 `/api/skills/upload` 一致）。

### 5.1 `POST /api/skills/analyze`

分析上传的 Skill ZIP（multipart）。

**请求**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | file | 是 | `.zip` 文件，最大 50MB |

**成功响应（JSON）**

| 字段 | 说明 |
|------|------|
| `ok` | `true` |
| `name` | 技能标识 |
| `description` | 描述 |
| `category` | 分类 |
| `tags` | 标签数组 |
| `summary` | AI 摘要 |
| `allowedTools` | 工具列表 |
| `files` | ZIP 内文件路径列表 |
| `skillMarkdown` | 原始 `SKILL.md` 内容 |
| `zipFilename` | 上传文件名 |

**失败响应**：`error` 字段；可选 `template`（格式错误时的示例模板）。

**实现位置**：`pkg/gateway/http/skills_analyze.go` → `handlers.AnalyzeSkillContent`

---

### 5.2 `POST /api/skills/publish`

发布 Skill ZIP 并写入元数据（multipart）。

**请求**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | file | 是 | Skill ZIP |
| `name` | string | 是* | 标识；为空时从文件名推断 |
| `description` | string | 否 | |
| `category` | string | 否 | |
| `tags` | string | 否 | 逗号分隔 |
| `status` | string | 否 | 默认 `open` |

**成功响应**：`{ "ok": true, "name": "<name>" }`

**发布逻辑**：`publishSkillZipToManaged` — 解压到 `ResolveManagedSkillsDir()` 下 `<name>/`，并更新 `SKILL.md` frontmatter（`name`、`displayName`、`description`、`category`、`tags`、`status`）。

---

### 5.3 `POST /api/skills/publish-markdown`

从 `SKILL.md` 文本发布（`application/x-www-form-urlencoded`）。

**请求**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `markdown` | string | 是 | 完整 SKILL.md（含 frontmatter） |
| `name` | string | 是 | 托管目录名 |
| `description` | string | 否 | |
| `category` | string | 否 | |
| `tags` | string | 否 | |
| `status` | string | 否 | |

后端先校验 markdown，再 `buildSkillZipFromMarkdown` 后走与 ZIP 发布相同的路径。

---

### 5.4 `POST /api/skills/compose`（推荐）

创意中心多轮对话，与上传分析一样走 **HTTP**，不依赖 WebSocket 连接。

**请求（JSON）**

| 字段 | 类型 | 说明 |
|------|------|------|
| `messages` | `{ role, content }[]` | 对话历史（`user` / `assistant`），至少一条 |
| `draft` | string | 当前 SKILL.md 草稿 |
| `scenario` | `"free"` \| `"upgrade"` | 创作场景，默认 `free` |
| `upgradeSkillKey` | string | 升级场景下的已有 Skill 标识（可选） |
| `timeoutMs` | number | 超时，默认 120000 |

**响应**

| 字段 | 说明 |
|------|------|
| `ok` | `true` |
| `reply` | 助手对话文本 |
| `draft` | 更新后的 SKILL.md |
| `files` | `[{ path, content }]` |
| `ready` | 草稿是否具备可发布的 name + description |

后端会加载 `~/.openocta/skills/skill-create/SKILL.md`（若存在）或内置创作参考，注入 LLM 提示词。

**实现位置**：`pkg/gateway/http/skills_compose_http.go` → `handlers.ComposeSkill`

---

### 5.5 WebSocket RPC：`skills.compose`

与 HTTP 接口等价，供仍使用 WebSocket 的客户端调用（需 Gateway WebSocket 连接）。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `messages` | `{ role, content }[]` | 对话历史（`user` / `assistant`） |
| `draft` | string | 当前 SKILL.md 草稿 |
| `scenario` | `"free"` \| `"upgrade"` | 创作场景 |
| `upgradeSkillKey` | string | 升级场景下的已有 Skill 标识（可选） |
| `sessionKey` | string | 会话键，默认 `main` |
| `timeoutMs` | number | 超时，默认 120000 |

**响应**

| 字段 | 说明 |
|------|------|
| `reply` | 助手对话文本 |
| `draft` | 更新后的 SKILL.md |
| `files` | `[{ path, content }]`，通常为 `SKILL.md` |
| `ready` | 草稿是否具备可发布的 name + description |

**实现位置**：`pkg/gateway/handlers/skill_compose.go`  
**白名单**：`pkg/gateway/ws/hub.go`（`skills.compose`）

---

### 5.6 与旧接口的关系

| 接口 | 用途 |
|------|------|
| `POST /api/skills/upload` | 早期简单上传（仅 name + file），仍保留 |
| `POST /api/v1/admin/skills` | 市场后台管理上传，见 [UPLOAD_FORMAT.md](./UPLOAD_FORMAT.md) |

新向导使用的是 **`/api/skills/analyze`** + **`/api/skills/publish`** 组合。

---

## 六、前端实现结构

| 路径 | 职责 |
|------|------|
| `ui/src/ui/views/skill-create-modals.ts` | 选择弹框、上传三步向导、创意中心双栏 UI |
| `ui/src/ui/skill-create-handlers.ts` | 状态机与回调（`buildSkillCreateModalProps`） |
| `ui/src/ui/controllers/skill-create.ts` | HTTP / WebSocket API 封装 |
| `ui/src/styles/skill-create.css` | 步骤条、拖拽区、对话与预览布局 |
| `ui/src/ui/views/skill-library.ts` | 技能库页集成 `renderSkillCreateModals` |
| `ui/src/ui/views/skills.ts` | Skills 管理页同样集成（组件级复用） |
| `ui/src/ui/app-render.ts` | 技能库「新增」→ `openSkillCreateChoice` |

### 6.1 应用状态字段（`app-view-state.ts`）

| 字段 | 说明 |
|------|------|
| `skillsAddPanel` | `closed` \| `choice` \| `upload` \| `creative` |
| `skillsUploadStep` | 上传步骤 0–2 |
| `skillsUploadFile` | 选中的 ZIP |
| `skillsUploadAnalyze` | 分析结果 |
| `skillsUploadMeta` | 发布元信息表单 |
| `skillsCreativeMessages` | 创意中心对话 |
| `skillsCreativeDraft` | 当前 SKILL.md 草稿 |
| `skillsCreativeFiles` | 预览文件列表 |
| `skillsCreativeReady` | 是否可发布 |
| `skillsUploadBusy` / `skillsUploadError` | 加载与错误 |

---

## 七、LLM 提示词要点

### 7.1 分析（`AnalyzeSkillContent`）

读取 `SKILL.md` 与 ZIP 文件列表，要求模型输出 JSON：`name`、`description`、`category`、`tags`、`summary`、`allowedTools`。

### 7.2 创作（`skills.compose`）

系统提示要求助手：

- 用中文对话，必要时追问场景与工具；
- 信息足够时在回复末尾用 markdown 围栏输出完整 `SKILL.md`；
- frontmatter 至少包含 `name`（小写连字符）、`description`、`allowed-tools`。

---

## 八、常见问题

### 8.1 「Gateway URL 未配置」

在控制台设置中填写 Gateway 地址。

### 8.2 「无法连接网关」/ 创作无反应

创意中心已改为调用 **`POST /api/skills/compose`（HTTP）**，与 ZIP 分析相同，只需配置 Gateway URL，**不要求** WebSocket 已连接。

若仍无响应，请检查：

1. Gateway URL 是否已配置  
2. Network 面板是否有 `/api/skills/compose` 请求  
3. 默认大模型是否已在配置中启用（`agents.defaults.model`）

### 8.3 分析或创作超时

默认 LLM 超时 120 秒；检查模型 provider 配置与网络。可在 RPC 参数中调整 `timeoutMs`。

### 8.4 「skill zip 必须包含 SKILL.md」

确认 ZIP 根目录或子目录中存在 **`SKILL.md`**（大小写敏感），且 frontmatter 字段完整。

### 8.5 发布后在哪里看到 Skill？

发布到 **托管目录** `~/.openocta/skills/<name>/`。Runtime 重启或刷新 Skills 列表后即可在本地 Skills 报告中看到；优先级见 [skills.md](./skills.md)。

### 8.6 浏览器报 CORS / Referrer Policy（strict-origin-when-cross-origin）

控制台 UI 与 Gateway 可能 **不同源**（例如 UI 在 `http://localhost:5173`，Gateway 在 `http://127.0.0.1:18900`）。  
DevTools 里 **Referrer Policy** 列显示的 `strict-origin-when-cross-origin` 只是浏览器策略，**不是**接口返回的错误。

若 Network 面板出现 **CORS error** 或请求被 blocked，说明预检 `OPTIONS` 或响应缺少 `Access-Control-Allow-Origin`。  
Gateway 已为以下接口配置 CORS 与 OPTIONS 预检：

- `POST /api/skills/analyze`
- `POST /api/skills/publish`
- `POST /api/skills/publish-markdown`
- `POST /api/skills/upload`

修改后需 **重启 Gateway** 再试。开发时也可将 UI 与 Gateway 设为同源（例如直接访问 `http://127.0.0.1:18900` 托管的前端）。

---

## 九、后续规划（未实现）

- **市场同步**：将发布结果同步至 openocta.com 市场（当前仅本地 managed）
- **`/skills` 独立 Tab**：`renderSkills` 已支持新弹框，若需在非技能库路由使用，需在 `app-render.ts` 中额外接线

---

## 十、相关源码索引

```
openocta/src/pkg/gateway/
├── http/skills_analyze.go      # analyze / publish / publish-markdown
├── handlers/skill_analyze.go   # AnalyzeSkillContent, skills.analyze RPC
├── handlers/skill_compose.go   # skills.compose RPC
├── handlers/skill_llm.go       # 共享 LLM 调用
└── http/server.go              # 路由注册

openocta/ui/src/ui/
├── controllers/skill-create.ts
├── skill-create-handlers.ts
├── views/skill-create-modals.ts
└── styles/skill-create.css
```
