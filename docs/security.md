# 安全策略（Sandbox / Validator / Approval Queue）技术文档

本文档描述 OpenOcta 的安全策略能力（Sandbox / Validator / Approval Queue），包括配置结构、运行时行为、审批队列与 SDK 集成方式，适合需要做深度集成和排障的开发者。

---

## 1. 概述

安全策略用于在 Agent 执行时，根据用户配置约束：

- **文件系统**：只允许访问指定路径前缀
- **网络访问**：只允许访问白名单中的地址/域名
- **命令执行**：对命令做黑名单/长度校验
- **审批流程**：对敏感工具调用（如 Bash）启用人工审批

### 1.1 三层防护模型（对齐 agentsdk-go）

参考 [agentsdk-go Security Guide](https://github.com/stellarlinkco/agentsdk-go/blob/main/docs/security.md)，安全体系分为三层：

1. **Sandbox**：文件系统与网络访问控制  
2. **Validator**：命令与参数校验  
3. **Approval Queue**：人工审批队列（human-in-the-loop）

OpenOcta 的 `security.sandbox` / `security.validator` / `security.approvalQueue` 与这三层一一对应，并在 Runtime 中通过 middleware 和 `ApprovalQueue` 与 SDK 集成。

**特性：**

- **根级配置**：在 `openocta.json` 根下使用 `security` 字段，与 gateway/agents 等平级
- **文件与网络**：允许路径（allowedPaths）、网络白名单（networkAllow）
- **命令校验**：禁止命令/参数/关键词熔断/长度限制（validator）
- **审批队列**：默认存储于 `~/.openocta/agents/approvals/approvals.json`，可配置

---

## 2. 配置

### 2.1 配置项

在 `openocta.json` 根级增加 `security`：

```json
{
  "security": {
    "sandbox": {
      "enabled": true,
      "allowedPaths": ["/tmp", "./workspace", "/var/lib/agent/data"],
      "networkAllow": ["localhost", "127.0.0.1", "*.anthropic.com"],
      "root": "./workspace",
      "resourceLimit": {
        "maxCpuPercent": 60,
        "maxMemoryBytes": 1073741824,
        "maxDiskBytes": 1073741824
      },
      "approvalStore": "~/.openocta/agents/approvals"
    },
    "approvalQueue": {
      "enabled": true,
      "timeoutSeconds": 300,
      "allow": ["ls", "pwd", "echo"],
      "ask": ["rm", "mv", "cp"],
      "deny": ["sudo", "dd", "mkfs"]
    },
    "validator": {
      "enabled": true,
      "banCommands": ["dd", "mkfs", "sudo"],
      "banArguments": ["--no-preserve-root", "/dev/"],
      "banFragments": ["rm -rf", "rm -r"],
      "maxLength": 4096
    }
  }
}
```

字段说明：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sandbox.enabled` | boolean | `true` | 是否启用沙箱；为 false 时 Runtime 不应用沙箱 |
| `sandbox.allowedPaths` | string[] | 见下 | 允许访问的路径前缀 |
| `sandbox.networkAllow` | string[] | `["localhost","127.0.0.1"]` | 允许访问的网络地址/域名模式 |
| `sandbox.root` | string | ProjectRoot | 沙箱根目录 |
| `sandbox.resourceLimit.maxCpuPercent` | number | `60` | 最大 CPU 利用率（百分比）；留空时由前端保存时写入默认值 |
| `sandbox.resourceLimit.maxMemoryBytes` | number | `1073741824` | 最大内存（字节）；留空时默认 1GiB |
| `sandbox.resourceLimit.maxDiskBytes` | number | `1073741824` | 最大磁盘（字节）；留空时默认 1GiB |
| `sandbox.approvalStore` | string | stateDir/agents/approvals | 审批队列存储路径（目录或 `.json` 文件路径） |
| `approvalQueue.enabled` | boolean | `false` | 是否启用审批队列（启用后默认对 Bash 工具进入 ask/审批流程） |
| `approvalQueue.timeoutSeconds` | number | `300` | 待审批请求超时（超时后视为 expired；用于网关与 UI 展示/拦截） |
| `approvalQueue.allow` | string[] | - | 自动允许的命令列表（glob 模式，如 `ls`、`pwd`、`echo *`） |
| `approvalQueue.ask` | string[] | - | 需要审批的命令列表（glob 模式，如 `rm`、`mv *`、`cp *`） |
| `approvalQueue.deny` | string[] | - | 始终禁止的命令列表（glob 模式，如 `sudo`、`dd`、`mkfs *`） |
| `validator.enabled` | boolean | `true` | 是否启用命令校验；为 false 时不挂载校验中间件 |
| `validator.banCommands` | string[] | - | 禁止的命令（如 dd、mkfs、sudo） |
| `validator.banArguments` | string[] | - | 禁止的参数（如 `--no-preserve-root`、`/dev/`） |
| `validator.banFragments` | string[] | - | 关键词熔断：命令中只要包含这些片段就会被拒绝 |
| `validator.maxLength` | number | - | 命令字符串最大长度 |

默认允许路径（当未配置 `allowedPaths` 时）：`<ProjectRoot>/workspace`、`<ProjectRoot>/shared`。

### 2.2 与 agentsdk-go 安全 Hook 的关系

安全策略与 [agentsdk-go security.md](https://github.com/stellarlinkco/agentsdk-go/blob/main/docs/security.md) 中的 Hook Overview 对应：

| Hook | 用途 |
|------|------|
| BeforeAgent | 请求校验、限流、IP 黑名单 |
| BeforeModel | 注入检测、敏感词过滤 |
| AfterModel | 输出审查、危险命令检测 |
| BeforeTool | 工具权限、参数与路径校验 |
| AfterTool | 结果审查、敏感数据泄露检测 |
| AfterAgent | 审计日志、合规检查 |

当前实现中，沙箱的**文件/网络/资源**由 Runtime 的 `buildSandboxOptions` 从 `security.sandbox`（或旧版 `sandbox`）配置构建；命令校验和审批队列则通过 SDK 的 middleware / ApprovalQueue 实现。

### 2.3 Windows 路径

- 配置路径：默认 `%APPDATA%\openocta\openocta.json`
- 审批存储：默认 `%APPDATA%\openocta\agents\approvals\approvals.json`
- 使用 `paths.ResolveStateDir(env)` 解析状态目录，避免硬编码 `~`

---

## 3. 运行时行为（Runtime）

**文件**：`pkg/agent/runtime/runtime.go`

### 3.1 沙箱构建逻辑

- **EnableSandbox**：
  - 优先读取 `opts.Config.Security.Sandbox.Enabled`
  - 若为空，则回退到旧版 `opts.Config.Sandbox.Enabled`
  - 再为空，使用 `runtime.Options.EnableSandbox`

- **SandboxOpts**：
  - 优先由 `opts.Config.Security.Sandbox` 生成 `buildSandboxOptsFromConfig`
  - 与 `opts.Sandbox` 合并（config 优先，opts 覆盖）
  - 若 `security` 缺失则整体回退到 `opts.Config.Sandbox`

- **apiOpts.Sandbox**：
  - 调用 `buildSandboxOptions(projectRoot, sandboxOpts)` 得到 agentsdk-go 的 `api.SandboxOptions`

### 3.2 命令校验（Validator）

- 结构体：`pkg/config/schema.go` 中的 `SandboxValidatorConfig`
- 运行时：
  - 若 `security.validator.enabled == true` 或未显式设置：
    - 使用 `WrapToolWithCommandValidation` 包装 Bash 工具（tool 级防护）
    - 在 agentsdk-go middleware 链中注入 `openocta-command-validator`（BeforeTool 阶段）
  - 若 `enabled == false`，则不会挂载上述两层校验逻辑。

- 校验内容（`ValidateCommandWithConfig`）：
  - 长度：超过 `maxLength` 时拒绝
  - 控制字符 / 危险 shell 元字符
  - 禁止命令：`banCommands`
  - 禁止参数：`banArguments`
  - 关键词熔断：`banFragments`（使用 `strings.Contains` 判断，只要包含即拒绝）

### 3.3 审批队列（Approval Queue）

- 默认路径：`~/.openocta/agents/approvals/approvals.json`（Windows：`%APPDATA%\openocta\agents\approvals\approvals.json`）
- 文件格式：`{ "records": [...], "whitelist": {...} }`
  - `records`：审批记录（pending/approved/denied）
  - `whitelist`：会话 TTL 白名单（批准时可选 ttlSeconds，将该 session 在 TTL 内免审）

运行时逻辑：

- 当 `runtime.Options.EnableApprovalQueue` 为 true 且 `security.approvalQueue.enabled == true` 时：
  - 自动在 `SettingsOverrides.Permissions.Ask` 中添加 `bash`
  - 使用 `resolveApprovalQueueStorePath` 解析存储路径，构建 `security.NewApprovalQueue`
  - 将 `apiOpts.ApprovalQueue`、`apiOpts.ApprovalApprover`、`apiOpts.ApprovalWait` 等字段与 SDK 绑定

### 3.4 Middleware 安全拦截（Security Interception）

agentsdk-go 定义了 6 个安全检查点：

1. `BeforeAgent` – 请求校验、限流、IP 黑名单  
2. `BeforeModel` – Prompt 注入检测、敏感词过滤  
3. `AfterModel` – 输出审查、危险命令检测、秘密脱敏  
4. `BeforeTool` – 工具权限、参数与路径校验  
5. `AfterTool` – 工具结果审查、错误脱敏、输出截断  
6. `AfterAgent` – 审计日志、合规检查

当前 OpenOcta 的实现重点利用了：

- `BeforeTool`：通过 `openocta-command-validator` 对 Bash 命令做黑名单 + 长度校验（对应 Validator 层）
- 其他 Hook 点可按需在未来版本中扩展（例如统一的 Prompt 注入检测、输出审查等），实现方式参考 agentsdk-go 示例代码。

---

## 4. Gateway API

**文件**：

- 配置读取：`pkg/gateway/handlers/config.go`（间接）
- 审批流程：`pkg/gateway/handlers/approvals.go`

### 4.1 Security 配置读写

使用现有 `config.get` / `config.patch` 读写根级 `security`，其中：

- `security.sandbox`：文件/网络/资源限制等沙箱边界
- `security.validator`：命令校验（禁止命令/参数/关键词熔断/长度限制）
- `security.approvalQueue`：审批队列（启用、超时等）

无需额外接口即可完成前端控制台与配置文件的联动。

### 4.2 审批队列 API

| 方法 | 说明 |
|------|------|
| `approvals.list` | 列出审批列表（含过期）；返回 storePath、entries |
| `approvals.approve` | 批准：`requestId`、`approverId`（仅修改状态，不加入白名单） |
| `approvals.whitelist` | 批准并加入白名单：`requestId`、`approverId`、`ttlSeconds`（可选） |
| `approvals.deny` | 拒绝：`requestId`、`approverId`、`reason`（可选） |

**说明：**

- `approvals.approve`：仅批准当前请求，执行后该请求状态变为 approved，但会话不会加入白名单，后续相同命令仍需审批
- `approvals.whitelist`：批准当前请求，并将会话加入白名单（TTL 有效期内免审），适合信任该会话在一段时间内执行同类命令
- `ttlSeconds`：白名单有效期（秒），默认 3600（1小时），在有效期内该会话执行相同命令自动通过

`resolveApprovalStoreFile` 会优先从 `security` 读取 `approvalQueue.timeoutSeconds` 与 `sandbox.approvalStore`，如缺失则回退到旧版 `sandbox` 字段。

---

## 5. 前端实现

**文件**：

- 视图：`ui/src/ui/views/sandbox.ts`
- 状态与控制：`ui/src/ui/app-security.ts`、`ui/src/ui/controllers/security.ts`（旧版 `controllers/sandbox.ts` 仍可用于读取沙箱片段）

### 5.1 页面结构

- Agent 分组中，将原「沙箱」Tab 更名为「安全策略」
- 安全策略页包含三个折叠框：
  - **Sandbox**：允许路径 / 网络白名单 / 资源限制 + 总开关
  - **Validator**：命令黑名单 / 关键词熔断 + 开关
  - **Approval Queue**：审批队列开关、超时配置、命令规则配置 + 审批列表

**审批队列命令规则配置：**

- **自动允许命令**：无需审批直接执行的命令（如 `ls`、`pwd`、`echo`）
- **需要审批的命令**：需要人工审批的命令（如 `rm`、`mv`、`cp`）
- **禁止执行的命令**：始终禁止执行的命令（如 `sudo`、`dd`、`mkfs`）

支持 glob 模式匹配，每行一个命令。

### 5.2 表单与配置映射

- 前端表单类型：`SandboxConfigForm`
- 读取逻辑（`getSandboxFromConfig`）：
  - 优先从 `config.security` 读取：
    - `security.sandbox` → 表单中的 `sandbox.*`
    - `security.validator` → 表单中的 `validator`
    - `security.approvalQueue` → 表单中的 `approvalQueue`
  - 若 `security` 缺失，则回退到旧的 `config.sandbox`。

- 保存逻辑（`saveSandboxConfig`）：

  ```ts
  await saveConfigPatch(state, {
    security: {
      sandbox: { ... },
      validator: sandbox.validator,
      approvalQueue: sandbox.approvalQueue,
    },
  });
  ```

  旧的根级 `sandbox` 不再由控制台写入，仅保留向后兼容的读取。

### 5.3 默认值处理

在 `handleSandboxSave` 中，对资源限制做默认值填充：

- 若 `maxCpuPercent` 为空或 <= 0，则写入 `60`
- 若 `maxMemoryBytes` 为空或 <= 0，则写入 `1024 ** 3`（1 GiB）
- 若 `maxDiskBytes` 为空或 <= 0，则写入 `1024 ** 3`（1 GiB）

这样可以保证即使用户不填写资源限制，也会有一组安全的默认上限。

---

## 6. 最佳实践（对齐 agentsdk-go 建议）

### 6.1 Sandbox

- 提前在配置中声明所有允许路径；避免在运行时临时放行路径  
- 尽量使用绝对路径，减少相对路径与符号链接带来的歧义  
- 只开放业务真正需要的目录，定期审计并收紧白名单  
- 对涉及文件路径的工具调用，在业务代码中也显式做路径校验

### 6.2 Validator（命令校验）

- 将高危命令（如 `dd`、`mkfs`、`shutdown`、`reboot` 等）配置到 `banCommands`  
- 将高危参数（如 `--no-preserve-root`、`/dev/`、`../` 等）配置到 `banArguments`  
- 对常见危险组合使用 `banFragments` 做关键词熔断（如 `rm -rf`、`sudo rm`）  
- 在 `BeforeTool` middleware 中统一做校验，并记录被拦截的命令以便审计  
- 对 CI / 平台入口保持严格（默认禁止 shell 元字符），仅在可信 CLI 场景才考虑放宽

### 6.3 Approval Queue（审批队列）

- 为高风险操作（例如 Bash 写入生产目录、执行集群管理命令）启用审批流程
- 合理设置 `timeoutSeconds`，避免永远悬挂的请求；超时自动标记为 expired
- 使用 `allow`/`ask`/`deny` 配置命令规则，将常用只读命令（如 `ls`、`pwd`）加入 allow 列表免审
- 为免审白名单设置较短 TTL，避免长期绕过审批
- **批准 vs 全部放行**：
  - 「批准」仅允许当前请求执行，不加入白名单，后续相同命令仍需审批
  - 「全部放行」允许当前请求并将会话加入白名单，TTL 有效期内相同命令自动通过
- 对审批结果（approve / whitelist / deny）做审计记录，便于事后追踪

### 6.4 Middleware Hook

- 在 `BeforeAgent` / `BeforeModel` / `AfterModel` / `AfterTool` 等阶段引入安全中间件时：
  - 确保中间件超时时间小于整体请求超时  
  - 所有拒绝都要有明确错误消息与审计记录  
  - 针对 Prompt 注入、秘密泄露、命令注入等场景编写针对性检测逻辑

---

## 7. 参考资料

- [agentsdk-go Security Guide](https://github.com/stellarlinkco/agentsdk-go/blob/main/docs/security.md)
- 配置结构：`pkg/config/schema.go`（`SecurityConfig`、`SandboxConfig`、`SandboxValidatorConfig`）
- 审批逻辑：`pkg/gateway/handlers/approvals.go`
- Runtime 集成：`pkg/agent/runtime/runtime.go`
- 控制台 UI：`ui/src/ui/views/sandbox.ts`

