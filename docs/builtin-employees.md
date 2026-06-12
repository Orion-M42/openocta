# 内置数字员工配置说明

本文档说明如何通过 `src/embed/employees/` 目录下的 YAML 文件配置**内置数字员工**。项目启动时会读取该目录下所有 `.yaml`/`.yml` 文件，解析并初始化数字员工，无需在 `~/.openocta/employees` 下单独创建 manifest。

## 配置文件位置与格式

- **位置**：`src/embed/employees/*.yaml`（或 `*.yml`）
- **格式**：每个文件对应一个数字员工，使用 YAML 语法，字段与下文「字段说明」一致。
- **构建**：这些文件会随项目一起被打包进二进制（embed），因此修改后需重新编译才能生效。

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 否 | 员工唯一标识。不填时使用文件名（去掉扩展名）作为 id。 |
| `name` | string | 是 | 展示名称。 |
| `description` | string | 否 | 功能描述，用于列表和说明。 |
| `prompt` | string | 否 | 系统提示/人设；会话时会作为 SystemPromptOverrides 传入 Agent。 |
| `enabled` | boolean | 否 | 是否启用，默认 `true`。 |
| `skillIds` | string[] | 否 | 该员工可用的技能 ID 列表。可引用 embed/skills、~/.openocta/employee_skills 等处的技能。 |
| `mcpServers` | object | 否 | 该员工专属 MCP 配置，key 为服务器名，value 为 MCP 连接配置（与全局 mcp.servers 结构一致）。会话时与全局配置合并，同 key 时以员工配置为准。 |

### MCP 配置结构（mcpServers 每个 entry）

与 `openocta.json` 中 `mcp.servers` 的单项结构相同，例如：

- `command`、`args`、`env`：stdio 方式启动的命令。
- `url`：已有 MCP 服务的 URL（SSE/HTTP）。
- `service`、`serviceUrl`：通过本地 MCP 服务连接后端服务。
- `enabled`、`toolPrefix` 等可选字段。

## 示例

```yaml
id: skill-creator
name: Skill Creator
description: 根据用户描述的场景生成 OpenOcta/Codex Skill，并支持安装到 ~/.openocta/skills。
prompt: |
  你是 Skill Creator 数字员工，专门帮助用户创建和安装 OpenOcta/Codex 技能。
  你的能力来自 skill-creator 技能……
enabled: true
skillIds:
  - skill-creator
```

## 内置数字员工可用的技能来源

内置数字员工可使用以下技能（会话构建 skills 快照时会合并）：

1. **embed/employee_skills/\<employeeID\>**  
   该员工在嵌入目录下的专属技能（若构建时包含）。

2. **embed/skills/**  
   内置技能目录；通过 `skillIds` 引用技能名（如 `skill-creator`）即可。

3. **~/.openocta/employee_skills/\<employeeID\>**  
   用户为该员工上传的专属技能目录。

4. **manifest.skillIds 与 workspace skills**  
   通过 `skillIds` 显式引用的技能会从 workspace 加载结果（含 embed/skills、~/.openocta/skills、\<workspace\>/skills 等）中按名称过滤得到。

因此，在 YAML 中配置 `skillIds: [skill-creator]` 即可让该员工使用 `src/embed/skills/skill-creator/` 中的技能。

## 与用户自建员工的关系

- **列表**：`employees.list` 会返回「内置 + 用户自建」员工，内置员工排在前面（Builtin=true）。
- **加载**：`employees.get` 或会话解析员工时，先查 `~/.openocta/employees/<id>/manifest.json`；若不存在，再使用 embed/employees 中解析出的内置 manifest。
- **写操作**：内置员工不可覆盖保存、不可删除；用户可在 `~/.openocta/employees` 下创建同 id 的自建员工覆盖展示与行为。

## 当前内置员工

- **skill-creator**：Skill Creator，使用 `embed/skills/skill-creator/` 技能，用于根据用户描述生成各类 Skill 并支持安装到 `~/.openocta/skills`。
- **mcp-builder**：MCP Builder，使用 `embed/skills/mcp-builder/` 技能，用于指导创建高质量 MCP Server（工具设计、分页/错误处理、评测等）。
- **sandbox-guard**：Sandbox Guard，使用 `embed/skills/sandbox-guard/` 技能，用于审计与加固沙箱策略（命令校验、风险评估、最小权限建议）。
- **prompt-doctor**：Prompt Doctor，使用 `embed/skills/prompt-doctor/` 技能，用于诊断与改写 Prompt（结构化、可评测、减少幻觉与越权）。
- **skill-finder**：Skill Finder，使用 `embed/skills/skill-finder/` 技能，用于根据需求推荐/检索合适的技能组合（内置 + 社区参考）。
- **data-analyst**：数据分析师，使用 `embed/skills/data-analyst/` 技能，用于对 CSV/JSON/表格数据做分析、总结洞察与生成可复现分析步骤。
- **k8s-ops-expert**：K8s 运维专家，使用 `embed/skills/k8s-ops-expert/`（并复用 `embed/skills/k8s/`）技能；通过 `kubernetes-mcp-server` 访问集群，支持部署/启动/扩缩容与排障（需要配置 MCP 与 kubeconfig/凭证）。
