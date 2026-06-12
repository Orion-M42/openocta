# WeWork 通道配置说明

本文说明如何在 `openocta.json` 中配置 WeWork（企业微信）通道，并与 Runtime 对应起来。

## 配置位置

企业微信配置位于根配置的 `channels.wework` 段，例如：

```json5
{
  "channels": {
    "wework": {
      "enabled": true,
      "allowedIds": ["user-or-chat-id"],
      "webhookPort": 8766,
      "credentials": {
        "corpId": "your-corp-id",
        "agentId": "your-agent-id",
        "secret": "your-secret",
        "token": "your-token",
        "encodingAESKey": "your-encoding-aes-key"
      }
    }
  }
}
```

## 字段说明

- `enabled`（boolean，可选，默认 `true`）  
  - 是否启用企业微信运行时与出站发送。

- `credentials`（object，必填）  
  - `corpId`（string，必填）  
    - 企业 ID。
  - `agentId`（string，必填）  
    - 应用 AgentId。
  - `secret`（string，必填）  
    - 应用 Secret，用于获取 access_token。
  - `token`（string，必填）  
    - 应用接收消息的 Token（企业微信后台配置）。
  - `encodingAESKey`（string，必填）  
    - 应用接收消息的 EncodingAESKey（企业微信后台配置），用于消息加解密。

- `webhookPort`（integer，可选，默认 `8766`）  
  - Webhook HTTP 服务监听端口，用于接收企业微信推送的消息。需确保端口未被占用，且可被企业微信服务器访问（公网或内网穿透）。

- `allowedIds`（string[]，可选）  
  - 允许与机器人交互的用户 ID 或会话 ID 列表。为空表示不限制。

## 工作原理

企业微信通道使用 **Webhook HTTP** 模式：

- Gateway 启动时在指定端口（默认 8766）开启 HTTP 服务。
- 企业微信服务器将用户消息推送到该 Webhook URL。
- 若配置了 `encodingAESKey`，则使用加密模式接收消息。
- 出站发送通过企业微信 API（access_token + 消息接口）完成。

## 对应代码位置

- Runtime：`pkg/channels/wework/runtime.go` + `config_runtime.go`  
  - `NewRuntimeFromConfig` 从 `channels.wework` 读取配置并创建 Webhook 运行时。  
  - 运行时通过 `hooksAgentSink` 把 IM 消息送入 Agent。  
  - Gateway 的 `send` / `chat.send` 会通过 `ChannelManager` 调用企业微信 Runtime 的 `Send` 进行出站发送。

## 启用步骤

1. 在[企业微信管理后台](https://work.weixin.qq.com/)创建自建应用，获取 `corpId`、`agentId`、`secret`。
2. 在应用配置中设置「接收消息」：填写 Token、EncodingAESKey，以及 Webhook URL（如 `http://your-server:8766/wework/webhook`）。
3. 确保 Gateway 所在机器端口 `webhookPort` 可被企业微信服务器访问（公网需备案域名，或使用内网穿透）。
4. 在 `openocta.json` 中填入 `channels.wework.credentials` 及 `webhookPort`，并设置 `enabled: true`。
5. 启动 Gateway：`make run` 或 `go run ./cmd/openocta gateway run`。
6. 在 Control UI 中确认 `channels.status` 返回的列表中包含 `wework`。
7. 在企业微信中向应用发送消息，检查 Agent 是否能够收到并回复。

参考：[企业微信官方文档](https://developer.work.weixin.qq.com/document/path/101039)