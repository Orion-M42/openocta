# QQ 通道配置说明

本文说明如何在 `openocta.json` 中配置 QQ 官方开放平台 Bot 通道，并与 Runtime 对应起来。

## 配置位置

QQ 配置位于根配置的 `channels.qq` 段，例如：

```json5
{
  "channels": {
    "qq": {
      "enabled": true,
      "allowedIds": ["user-openid-1"],
      "credentials": {
        "appId": "your-app-id",
        "appSecret": "your-app-secret"
      }
    }
  }
}
```

## 字段说明

- `enabled`（boolean，可选，默认 `true`）  
  - 是否启用 QQ Bot 运行时与出站发送。

- `credentials`（object，必填）  
  - `appId`（string，必填）  
    - QQ 机器人应用的 App ID。
  - `appSecret`（string，必填）  
    - QQ 机器人应用的 App Secret。

- `allowedIds`（string[]，可选）  
  - 允许与机器人交互的用户 openid 或群组 ID 列表。为空表示不限制。

## 工作原理

QQ 通道使用 **WebSocket** 模式：

- 通过 QQ 官方 Bot SDK（botgo）连接 QQ 开放平台 WebSocket 网关。
- 接收 C2C 私聊、群 @ 消息、频道 @ 消息等事件。
- 出站发送通过 QQ 开放平台 API 完成。

## 对应代码位置

- Runtime：`pkg/channels/qq/runtime.go` + `config_runtime.go`  
  - `NewRuntimeFromConfig` 从 `channels.qq` 读取配置并创建 WebSocket 运行时。  
  - 运行时通过 `hooksAgentSink` 把 IM 消息送入 Agent。  
  - Gateway 的 `send` / `chat.send` 会通过 `ChannelManager` 调用 QQ Runtime 的 `Send` 进行出站发送。

## 启用步骤

1. 在[QQ 开放平台](https://q.qq.com/)创建机器人应用，获取 `appId` 与 `appSecret`。
2. 在应用配置中开通所需能力（私聊、群聊、频道等）。
3. 在 `openocta.json` 中填入 `channels.qq.credentials`，并设置 `enabled: true`。
4. 启动 Gateway：`make run` 或 `go run ./cmd/openocta gateway run`。
5. 在 Control UI 中确认 `channels.status` 返回的列表中包含 `qq`。
6. 在 QQ 中向机器人发送消息，检查 Agent 是否能够收到并回复。
