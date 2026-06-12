# 上传文件格式规范

本文档描述 Skill、MCP、Employee 三类资源上传 zip 压缩包的格式要求和校验规则，供创建新内容时参考。

---

## 1. Skill（技能）

### 1.1 必需文件

| 文件 | 说明 |
|------|------|
| `SKILL.md` | 技能说明文档，支持 YAML frontmatter |

### 1.2 压缩包结构示例

```
my-skill.zip
├── SKILL.md          # 必需
├── ...               # 其他文件（可选）
```

### 1.3 校验规则

- 压缩包内必须包含 `SKILL.md` 文件（大小写不敏感）

---

## 2. MCP（Model Context Protocol 服务器）

### 2.1 必需文件

| 文件 | 说明 |
|------|------|
| `README.md` | MCP 说明文档 |
| `config.json` | MCP 服务器配置，格式见下文 |

### 2.2 config.json 格式

`config.json` 为 JSON 对象，key 为 MCP 服务器名称，value 为服务器配置项。每个服务器配置必须包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | boolean | 是 | 是否启用 |
| `command` | string | 是 | 启动命令，如 `npx`、`docker` |
| `args` | string[] | 是 | 命令参数，如 `["prometheus-mcp@1.1.3","stdio"]` |
| `env` | object | 是 | 环境变量，key-value 形式 |

### 2.3 config.json 示例

```json
{
  "prometheus-mcp": {
    "enabled": false,
    "command": "npx",
    "args": ["prometheus-mcp@1.1.3", "stdio"],
    "env": {
      "PROMETHEUS_URL": "http://192.168.50.68:9090"
    }
  }
}
```

### 2.4 压缩包结构示例

```
prometheus-mcp.zip
├── README.md         # 必需
├── config.json       # 必需
├── ...               # 其他文件（可选）
```

### 2.5 校验规则

- 必须包含 `README.md`
- 必须包含 `config.json`
- `config.json` 至少配置一个 MCP 服务器
- 每个服务器配置必须包含 `enabled`、`command`、`args`、`env` 四个字段

### 2.6 前端展示与下载

- 详情接口 `GET /api/v1/mcps/:id` 返回：基础信息、`readme`、`config`
- 下载接口 `GET /api/v1/mcps/:id/download` 返回 zip 压缩包

---

## 3. Employee（数字员工）

### 3.1 必需文件

| 文件 | 说明 |
|------|------|
| `README.md` | 数字员工说明文档 |
| `config.json` | Manifest 元数据，格式见下文 |

### 3.2 可选文件

| 文件 | 说明 |
|------|------|
| `skill.zip` | 技能包容器，内含一个或多个 skill 的 zip 压缩包；若有技能，必须放入 skill.zip 中（暂不校验内容） |

### 3.3 config.json 格式（Manifest）

`config.json` 为单个 Manifest 对象，描述数字员工模板的元数据。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 员工稳定标识符 |
| `name` | string | 是 | 展示名称 |
| `description` | string | 是 | 功能描述 |
| `prompt` | string | 否 | 系统提示/人设说明 |
| `enabled` | boolean | 否 | 是否可用 |
| `createdAt` | number | 否 | 创建时间（Unix 毫秒） |
| `builtin` | boolean | 否 | 是否为内置员工 |
| `skillIds` | string[] | 否 | 关联的 skill 名称列表 |
| `mcpServers` | object | 否 | 专属 MCP 服务器配置 |

### 3.4 McpServerEntry（mcpServers 中的每项）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | boolean | 是* | 是否启用（command 模式时必填） |
| `command` | string | 否 | 启动命令 |
| `args` | string[] | 是* | 命令参数（command 模式时必填） |
| `env` | object | 是* | 环境变量（command 模式时必填） |
| `url` | string | 否 | MCP 服务器 URL（SSE/HTTP） |
| `service` | string | 否 | 服务类型 |
| `serviceUrl` | string | 否 | 后端服务 URL |
| `toolPrefix` | string | 否 | 工具名前缀 |

\* 当使用 `command` 模式（stdio）时，`enabled`、`args`、`env` 为必填。

### 3.5 config.json 示例

```json
{
  "id": "prometheus-agent",
  "name": "Prometheus 运维助手",
  "description": "用于查询 Prometheus 监控数据的数字员工",
  "prompt": "你是一个 Prometheus 运维助手...",
  "enabled": true,
  "builtin": false,
  "skillIds": ["prometheus-query"],
  "mcpServers": {
    "prometheus-mcp": {
      "enabled": true,
      "command": "npx",
      "args": ["prometheus-mcp@1.1.3", "stdio"],
      "env": {
        "PROMETHEUS_URL": "http://192.168.50.68:9090"
      }
    }
  }
}
```

### 3.6 压缩包结构示例

```
prometheus-agent.zip
├── README.md         # 必需
├── config.json       # 必需
├── skill.zip         # 可选，技能包容器
│   ├── skill1.zip    # 单个技能的 zip
│   ├── skill2.zip    # 可包含多个 skill 的 zip
│   └── ...
├── ...               # 其他文件（可选）
```

**说明**：若有技能，必须放入 `skill.zip` 中，哪怕只有一个技能也需放入；`skill.zip` 内可包含多个 skill 的 zip 压缩包。`skill.zip` 及其内部内容暂不校验。

### 3.7 校验规则

- 必须包含 `README.md`
- 必须包含 `config.json`
- `config.json` 必须包含 `id`、`name`、`description` 字段
- 若 `mcpServers` 中存在使用 `command` 模式的配置，则该配置必须包含 `enabled`、`args`、`env`
- 技能需放入 `skill.zip` 中，`skill.zip` 内可包含多个 skill 的 zip；`skill.zip` 内容暂不校验

### 3.8 前端展示与下载

- 详情接口 `GET /api/v1/employees/:id` 返回：基础信息、`readme`、`config`
- 下载接口 `GET /api/v1/employees/:id/download` 返回 zip 压缩包

### 3.9 安装本地目录结构

通过 `POST /api/v1/install` 安装数字员工时，文件会按以下规则放置：

| 内容 | 目标路径 |
|------|----------|
| manifest.json、README.md、其他附属文件 | `~/.openocta/employees/<id>/` |
| skill.zip 内的各技能 | `~/.openocta/employee_skills/<id>/<技能名>/` |

`skill.zip` 中的每个 `xxx.zip` 会解压到 `~/.openocta/employee_skills/<员工ID>/xxx/`，技能名由 zip 文件名（去掉 `.zip`）决定。`config.json` 中的 `skillIds` 应与这些技能名对应，以便正确加载。

---

## 4. 上传接口

| 类型 | 接口 | 方法 |
|------|------|------|
| Skill | `/api/v1/admin/skills` | POST (multipart/form-data) |
| MCP | `/api/v1/admin/mcps` | POST (multipart/form-data) |
| Employee | `/api/v1/admin/employees` | POST (multipart/form-data) |

### 4.1 表单字段（通用）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 名称 |
| `description` | string | 否 | 描述 |
| `category` | string | 否 | 分类 |
| `tag` | string | 否 | 标签（逗号分隔） |
| `status` | string | 否 | 状态：open/paid/private，默认 open |
| `detail` | string | 否 | 详情（Skill 专用，写入 content） |
| `file` | file | 是 | zip 压缩包 |
| `logo` | file | 否 | logo 图片 |

---

## 5. 校验失败提示

上传时若 zip 不符合规范，将返回 400 错误，`error` 字段包含具体原因，例如：

- `"skill zip 必须包含 SKILL.md 文件"`
- `"mcp zip 必须包含 README.md 文件"`
- `"mcp zip 必须包含 config.json 文件"`
- `"config.json 中 \"xxx\" 必须包含 enabled 字段"`
- `"employee zip 必须包含 README.md 文件"`
- `"config.json 必须包含 id 字段"`
