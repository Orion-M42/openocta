# CONFIG.md - OpenOcta 配置指南

本文说明 OpenOcta 主配置文件 `openocta.json` 的位置、结构与修改方式。同目录下的 `openocta.json.example` 是**完整参考模板**，可按需裁剪。

## 配置文件位置

| 平台 | 默认路径 |
|------|----------|
| Linux / macOS | `~/.openocta/openocta.json` |
| Windows | `%APPDATA%\openocta\openocta.json` |

覆盖方式：

- 环境变量 `OPENOCTA_CONFIG_PATH`：指定配置文件绝对路径
- 环境变量 `OPENOCTA_STATE_DIR`：状态目录（配置默认在其下的 `openocta.json`）

配置文件为 JSON（也支持 JSON5：注释、尾随逗号）。权限建议 `600`。

## 对话中修改配置（Agent 必读）

当用户在聊天中要求**改配置、加模型、开通道、写环境变量**等，你**可以直接修改** `openocta.json`，无需让用户手动编辑。

### 推荐方式：使用 `gateway_config` 工具

1. **`action: "get"`** — 读取当前配置，响应中的 `hash` 用于下一步。
2. **`action: "patch"`** — 传入 `baseHash`（上一步的 hash）和 `patch`（仅包含要改的字段的对象）。Gateway 会校验、合并并写入磁盘。
3. **`action: "schema"`** — 需要字段类型或合法枚举时查阅 schema。
4. **`action: "env"`** — 只读查看 `env.vars` / `env.modelEnv` / `env.shellEnv`。

**Patch 示例**（设置默认模型并写入 API Key）：

```json
{
  "action": "patch",
  "baseHash": "<config.get 返回的 hash>",
  "patch": {
    "env": {
      "vars": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    },
    "agents": {
      "defaults": {
        "model": {
          "primary": "anthropic/claude-sonnet-4-5-20250929"
        }
      }
    }
  }
}
```

**删除 MCP 服务器**：在 `patch.mcp.servers` 中将对应键设为 `null`。

**注意事项：**

- 必须先 `get` 再 `patch`；若 hash 不匹配，重新 `get` 后重试。
- 只 patch 用户要求的字段，不要重写整个文件。
- 敏感信息（API Key、Token）写入 `env.vars` 或 provider 的 `apiKey`，改完后向用户确认已保存，**不要**在回复中重复完整密钥。
- 修改 `channels` 后 Gateway 会热重载 IM 运行时；多数其他项通过 `gateway.reload.mode: hybrid` 热生效。
- 若 patch 失败，把错误信息告诉用户，并建议控制台「配置」页检查。

### 禁止方式

- **不要**用 `write`/`edit` 直接改 `~/.openocta/openocta.json`（绕过校验与 hash 锁）。
- **不要**在未获用户同意时修改 gateway 认证 token、安全策略的 deny 规则。

## 配置顶层结构速查

| 字段 | 用途 |
|------|------|
| `meta` | 最后修改版本与时间（自动维护） |
| `env` | 环境变量：`vars`（全局）、`modelEnv`（按模型）、`shellEnv`（导入 shell） |
| `gateway` | 端口、绑定、认证、热重载、Control UI、LLM Trace |
| `agents` | 智能体默认项与 `list`（id、model、workspace、skills） |
| `models` | 自定义模型厂商：`mode`（merge/replace）、`providers` |
| `mcp` | MCP 服务器：`servers` 下每个 key 一种连接方式 |
| `skills` | Skill 加载目录、安装偏好、按 skill 的 entries |
| `tools` | 工具策略：web 搜索/抓取、exec、media 等 |
| `security` | 沙箱、命令策略、审批队列 |
| `session` | 会话范围、历史加载、重置策略 |
| `memory` | 记忆后端（builtin / qmd） |
| `browser` | 内置浏览器自动化 |
| `channels` | IM 通道（飞书、钉钉、QQ、企微、Telegram 等） |
| `hooks` | Webhook 映射 |
| `cron` | 定时任务存储与并发 |
| `commands` | 聊天内斜杠命令开关 |
| `logging` | 日志级别与脱敏 |
| `ui` | 控制台外观 |
| `wizard` | 引导向导完成状态 |
| `bindings` | 通道/会话到 agent 的路由规则 |
| `plugins` | 插件加载（可选） |

更细的字段说明见项目文档：`docs/configuration.md`、`docs/model-providers.md`、`docs/mcp-configuration.md`、`docs/security-quickstart.md`、`docs/channels-config-*.md`。

## 常用配置片段

### 最小可运行

```json
{
  "agents": {
    "defaults": { "workspace": "~/.openocta/workspace" }
  },
  "gateway": { "port": 18900, "bind": "loopback" }
}
```

### 模型引用格式

模型 ID 为 **`provider/modelId`**，例如：

- `anthropic/claude-sonnet-4-5-20250929`
- `openai/gpt-4o`
- `openrouter/anthropic/claude-sonnet-4-5`
- `moonshot/kimi-k2.5`

API Key 优先放在 `env.vars`（如 `ANTHROPIC_API_KEY`）。自定义 Base URL 时使用 `models.providers`。

### 自定义模型厂商

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "lmstudio": {
        "baseUrl": "http://127.0.0.1:1234/v1",
        "apiKey": "lmstudio",
        "models": [
          { "id": "my-model", "name": "Local Model", "reasoning": false, "input": ["text"] }
        ]
      }
    }
  }
}
```

### MCP（stdio）

```json
{
  "mcp": {
    "servers": {
      "my-mcp": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "my-mcp-server"],
        "env": { "API_KEY": "$MCP_API_KEY" }
      }
    }
  }
}
```

### 飞书通道

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "domain": "feishu",
      "allowedIds": ["ou_xxx"]
    }
  }
}
```

### 安全沙箱（生产建议）

```json
{
  "security": {
    "sandbox": {
      "enabled": true,
      "allowedPaths": ["/tmp", "./workspace"],
      "networkAllow": ["localhost", "127.0.0.1", "*.anthropic.com"]
    },
    "commandPolicy": {
      "enabled": true,
      "defaultPolicy": "ask",
      "deny": ["rm -rf /", "mkfs"]
    }
  }
}
```

## 环境变量与配置的优先级

1. 进程已设置的 `os.Getenv`（非空）优先于 `config.env.vars`
2. Gateway 启动后会把 `env.vars` 中**尚未设置**的键注入进程环境
3. 模型专用变量可用 `env.modelEnv["provider/modelId"]` 覆盖全局 `vars`

常用覆盖：

| 变量 | 作用 |
|------|------|
| `OPENOCTA_CONFIG_PATH` | 配置文件路径 |
| `OPENOCTA_STATE_DIR` | 状态目录 |
| `OPENOCTA_GATEWAY_PORT` | 网关端口 |
| `OPENOCTA_RUN_MODE` | `desktop` / `service` |

## 场景环境变量

安装场景或引导向导写入的变量在 `env.vars` 中（如 `PROMETHEUS_URL`）。用户说「配置监控地址」时，patch 对应键即可。

## 完整模板

见同目录 **`openocta.json.example`**。首次安装时，若配置文件不存在，Gateway 也会从嵌入的示例初始化一份到用户目录。

## 故障排查

- **配置无效**：`gateway_config` → `get`，查看 `issues` 数组
- **Patch 冲突**：重新 `get` 获取新 `hash`
- **通道不生效**：确认 `channels.<name>.enabled` 与凭证完整，必要时重启 Gateway
- **模型报错**：检查 `env.vars` 中对应 `*_API_KEY` 与 `agents.*.model` 的 provider 是否一致

---

用户提出配置需求时：**先确认意图 → get → 构造最小 patch → patch → 简要说明改了什么**。完整字段以 `openocta.json.example` 与官方文档为准。
