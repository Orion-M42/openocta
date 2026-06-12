# 主机巡检场景

通过 Agent 定期连接目标主机，采集 CPU、内存、磁盘、关键服务状态，并生成巡检报告。

## 自动安装内容

| 类型 | 名称 | 说明 |
|------|------|------|
| Skill | `host-inspection` | 巡检流程与报告模板 |
| MCP | `system-metrics` | 系统指标采集 |
| 环境变量 | `SSH_HOST`, `SSH_USER` | SSH 连接凭据（密钥建议写入 Gateway 配置） |

## 使用前配置

1. 在 Gateway 或 `.env` 中设置 `SSH_HOST`、`SSH_USER`。
2. 确保目标主机允许 SSH，并将密钥配置到 OpenOcta 运行环境。
3. （可选）使用 `bundled/` 下的离线 deb/rpm 安装 `openssh-clients`，无需外网。

## 初始化

```bash
export OPENOCTA_GATEWAY_URL="http://127.0.0.1:18900"
export OPENOCTA_GATEWAY_TOKEN="your-token"
./init.sh
```

## 使用示例

安装完成后，在消息页向 Agent 发送：「对 SSH_HOST 执行主机巡检并输出 Markdown 报告」。
