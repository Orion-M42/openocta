# LLM Trace 功能技术文档

本文档描述 OpenOcta 的 LLM Trace 功能，包括配置、后端 API、前端 UI 及 Trace 文件格式。

## 1. 概述

LLM Trace 用于记录 Agent 运行时对 LLM 的调用详情，包括模型请求/响应、工具调用、性能指标等。Trace 数据以 JSONL 和 HTML 两种格式写入工作区下的 `.trace` 目录，便于调试与问题排查。

**特性：**

- 按需开启：通过配置 `gateway.llmTrace.enabled` 控制，默认关闭
- 输出格式：JSONL（机器可读）+ HTML（可视化查看）
- 控制台集成：在 Agent 分组下提供 LLM Trace 页面，支持列表查看、搜索、新窗口打开 HTML

## 2. 配置

### 2.1 配置项

在 `openocta.json` 中增加 `gateway.llmTrace`：

```json
{
  "gateway": {
    "llmTrace": {
      "enabled": true
    }
  }
}
```

| 字段     | 类型  | 默认值 | 说明                                   |
|----------|-------|--------|----------------------------------------|
| `enabled`| boolean | `false` | 是否启用 LLM Trace。开启后新会话会记录 Trace，可能有性能影响。 |

### 2.2 配置结构（Go）

`pkg/config/schema.go` 中定义：

```go
type GatewayLlmTraceConfig struct {
    Enabled *bool `json:"enabled,omitempty"`
}

// GatewayConfig 中新增
LlmTrace *GatewayLlmTraceConfig `json:"llmTrace,omitempty"`
```

## 3. 运行时行为

### 3.1 Trace 中间件注入

**文件**：`pkg/agent/runtime/runtime.go`

仅当 `gateway.llmTrace.enabled == true` 时注入 Trace 中间件：

```go
if opts.Config != nil && opts.Config.Gateway != nil && opts.Config.Gateway.LlmTrace != nil &&
    opts.Config.Gateway.LlmTrace.Enabled != nil && *opts.Config.Gateway.LlmTrace.Enabled {
    traceMW := middleware.NewTraceMiddleware(filepath.Join(projectRoot, ".trace"))
    apiOpts.Middleware = []middleware.Middleware{
        traceMW,
    }
}
```

### 3.2 输出目录

- **路径**：`<ProjectRoot>/.trace`
- **ProjectRoot**：由 `agent.ResolveAgentWorkspaceDir()` 解析，默认 agent 为 `~/.openocta/workspace`
- **示例**：`~/.openocta/workspace/.trace`

### 3.3 文件命名

agentsdk-go Trace 中间件输出格式：

- **JSONL**：`log-<sessionId>.html` 对应同名的 `log-<sessionId>.jsonl`
- **HTML**：`log-<sessionId>.html` 或 `<sessionId>.html`（取决于 agentsdk-go 版本）

`sessionId` 会做文件名安全处理（非字母数字替换为 `-`）。

### 3.4 拦截点与捕获内容

- **拦截点**：before_agent → before_model → after_model → before_tool → after_tool → after_agent
- **捕获内容**：模型请求/响应、工具调用与结果、duration_ms、tokens、错误信息等

## 4. 后端 API

### 4.1 trace.list

**方法**：WebSocket `trace.list`

**参数**：

| 参数  | 类型  | 说明                                      |
|-------|-------|-------------------------------------------|
| `mode`| string| `"active"` \| `"all"`。active=活跃会话；all=目录下所有 HTML 文件 |

**响应**：

```json
{
  "traceDir": "/Users/xxx/.openocta/workspace/.trace",
  "entries": [
    {
      "sessionKey": "agent:main:main",
      "sessionId": "d349e3fe-66af-491f-939d-142ae58848b7",
      "updatedAt": 1772629605033,
      "file": "log-d349e3fe-66af-491f-939d-142ae58848b7.html"
    }
  ]
}
```

**逻辑**：

- **active**：从 session store 取活跃会话，扫描 `.trace` 目录，匹配 `log-<sessionId>.html` 或 `<sessionId>.html`
- **all**：扫描 `.trace` 下所有 `*.html`，按文件名匹配 sessionKey，无匹配则 sessionKey 为 `"-"`

### 4.2 trace.content

**方法**：WebSocket `trace.content`

**参数**：

| 参数       | 类型  | 说明                                      |
|------------|-------|-------------------------------------------|
| `sessionId`| string| sessionId 或文件 basename（不含 `.html`） |

**响应**：

```json
{
  "content": "<html>...</html>",
  "file": "log-xxx.html"
}
```

**查找逻辑**：依次尝试 `sessionId.html`、`log-<sessionId>.html`，返回第一个存在的文件内容。

## 5. 前端 UI

### 5.1 路由与入口

- **路径**：`/llm-trace`
- **导航**：Agent 分组 → LLM Trace

### 5.2 功能

- **模式切换**：活跃 / 全部
- **搜索**：按 sessionKey 模糊过滤
- **开启/关闭**：修改 `gateway.llmTrace.enabled`，通过 `config.patch` 保存
- **查看**：点击「查看」在新窗口打开 HTML 内容

### 5.3 状态与控制器

- **控制器**：`controllers/llm-trace.ts`（`loadTraceList`、`loadTraceContent`）
- **状态**：`llmTraceResult`、`llmTraceMode`、`llmTraceSearch`、`llmTraceEnabled` 等

## 6. 文件结构

```
~/.openocta/workspace/
└── .trace/
    ├── log-main.html
    ├── log-main.jsonl
    ├── log-channel-feishu-oc_xxx.html
    ├── log-channel-feishu-oc_xxx.jsonl
    └── ...
```

## 7. 性能与注意事项

- **性能**：开启 Trace 会增加 I/O 与序列化开销，建议在调试时使用
- **存储**：Trace 文件会持续增长，需定期清理或限制保留时间
- **安全**：Trace 可能包含 prompt、token 等敏感信息，注意访问权限与脱敏

## 8. 参考

- [请求追踪与 Trace 采集](./request-tracing.md)
- [agentsdk-go Trace 系统](https://github.com/stellarlinkco/agentsdk-go/blob/main/docs/trace-system.md)
- 本仓库：`pkg/agent/runtime/runtime.go`、`pkg/gateway/handlers/trace.go`、`ui/src/ui/views/llm-trace.ts`
