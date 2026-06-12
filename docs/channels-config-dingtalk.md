# DingTalk 通道配置说明

本文说明如何在 `openocta.json` 中配置 DingTalk（钉钉）通道，并与 Runtime 对应起来。

## 配置位置

钉钉配置位于根配置的 `channels.dingtalk` 段，例如：

```json5
{
  "channels": {
    "dingtalk": {
      "enabled": true,
      "allowedIds": ["user-id-1", "user-id-2"],
      "credentials": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret"
      }
    }
  }
}
```

## 字段说明

- `enabled`（boolean，可选，默认 `true`）  
  - 是否启用钉钉运行时与出站发送。

- `credentials`（object，必填）  
  - `clientId`（string，必填）  
    - 钉钉应用的 Client ID（应用凭证），对应钉钉机器人 AppKey。
  - `clientSecret`（string，必填）  
    - 钉钉应用的 Client Secret（应用凭证），对应钉钉机器人 AppSecret。

- `allowedIds`（string[]，可选）  
  - 允许与机器人交互的用户 ID 或会话 ID 列表。为空表示不限制。

## 工作原理

钉钉通道使用官方 **Stream 模式** 接入：

- 通过钉钉 Stream SDK（`open-dingtalk/dingtalk-stream-sdk-go`）建立长连接，接收机器人回调消息。
- 每条消息会携带 `sessionWebhook`，用于后续回复。
- 支持私聊与群聊，ChatID 在私聊时为用户 ID，群聊时为会话 ID。
- 收到消息后立即发送「🖐️ 正在处理...」占位消息（钉钉无消息表情 API，以占位消息代替 Typing 反馈）。
- 通过 `hooksAgentSink` 将消息桥接到 Agent。sessionKey 格式为 `agent:main:channel:dingtalk:chatId`。
- 出站发送通过 `sessionWebhook` 调用钉钉回复接口，支持 Markdown 文本。

## 对应代码位置

- Runtime：`pkg/channels/dingtalk/runtime.go`、`config_runtime.go`  
  - `NewRuntimeFromConfig` 从 `channels.dingtalk` 读取配置并创建 Stream 运行时。  
  - 运行时通过 `hooksAgentSink` 把 IM 消息送入 Agent。  
  - Gateway 的 `send` / `chat.send` 会通过 `ChannelManager` 调用钉钉 Runtime 的 `Send` 进行出站发送。

## 启用步骤

1. 在[钉钉开放平台](https://open.dingtalk.com/)创建应用，获取 `clientId` 与 `clientSecret`。
2. 开通机器人能力，配置消息接收方式为 **Stream 模式**。
3. 在 `openocta.json` 中填入 `channels.dingtalk.credentials`，并设置 `enabled: true`。
4. 启动 Gateway：`make run` 或 `go run ./cmd/openocta gateway run`。
5. 在 Control UI 中确认 `channels.status` 返回的列表中包含 `dingtalk`。
6. 在钉钉中向机器人发送消息，检查 Agent 是否能够收到并回复。
