export type ScenarioResourceRef = {
  id: string;
  name: string;
  description?: string;
  downloadUrl?: string;
  category?: string;
};

export type ScenarioEnvVar = {
  name: string;
  description: string;
  required?: boolean;
  example?: string;
};

export type ScenarioBundledTool = {
  name: string;
  description?: string;
  platform: "linux-rpm" | "linux-deb" | "windows-exe" | "macos" | "any";
  relativePath: string;
};

export type ScenarioInitTask =
  | { kind: "skill"; ref: ScenarioResourceRef }
  | { kind: "mcp"; ref: ScenarioResourceRef }
  | { kind: "employee"; ref: ScenarioResourceRef }
  | { kind: "env"; ref: ScenarioEnvVar }
  | { kind: "tool"; ref: ScenarioBundledTool };

export type ScenarioTemplate = {
  id: string;
  name: string;
  summary: string;
  readmePath: string;
  initScriptPaths: {
    sh: string;
    ps1: string;
    cmd: string;
    bat: string;
  };
  /** 聊天页空会话快捷输入，最多 5 条 */
  quickPrompts?: string[];
  tasks: ScenarioInitTask[];
};

export const DEFAULT_CHAT_QUICK_PROMPTS = [
  "你能告诉我你有哪些技能吗？",
  "帮我生成一份最近 15 分钟 MySQL 告警分析报告",
  "帮我梳理一个排查思路，并给出优先级",
] as const;

const MAX_SCENARIO_QUICK_PROMPTS = 5;

export function normalizeScenarioQuickPrompts(prompts: unknown): string[] {
  if (!Array.isArray(prompts)) {
    return [];
  }
  const normalized: string[] = [];
  for (const item of prompts) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    normalized.push(trimmed);
    if (normalized.length >= MAX_SCENARIO_QUICK_PROMPTS) {
      break;
    }
  }
  return normalized;
}

export function readInitializedScenarioId(
  config: Record<string, unknown> | null | undefined,
): string | null {
  const wizard = config?.wizard as Record<string, unknown> | undefined;
  const setup = wizard?.setup as Record<string, unknown> | undefined;
  const scenarioId = setup?.scenarioId;
  return typeof scenarioId === "string" && scenarioId.trim() ? scenarioId.trim() : null;
}

/** Built-in scenario templates; scripts live under repo `scenarios/<id>/`. */
export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "host-inspection",
    name: "主机巡检场景",
    summary:
      "定期巡检主机 CPU、内存、磁盘与服务状态。自动安装 Ansible 运维 Skill 与 Prometheus MCP，并提示配置 SSH 凭据环境变量。",
    readmePath: "scenarios/host-inspection/README.md",
    initScriptPaths: {
      sh: "scenarios/host-inspection/init.sh",
      ps1: "scenarios/host-inspection/init.ps1",
      cmd: "scenarios/host-inspection/init.cmd",
      bat: "scenarios/host-inspection/init.bat",
    },
    quickPrompts: [
      "对 SSH_HOST 执行主机巡检并输出 Markdown 报告",
      "检查目标主机 CPU、内存、磁盘使用情况",
      "查询 Prometheus 最近 15 分钟的主机告警",
      "帮我梳理主机异常排查思路，并给出优先级",
      "你能告诉我你有哪些技能吗？",
    ],
    tasks: [
      {
        kind: "skill",
        ref: {
          id: "ansible-ops",
          name: "AnsibleOps",
          description: "Ansible 运维专家：自动化部署、配置管理与故障排查",
          downloadUrl: "https://openocta.com/api/v1/skills/ansible-ops/download",
          category: "运维",
        },
      },
      {
        kind: "mcp",
        ref: {
          id: "26",
          name: "Prometheus-MCP",
          description: "Prometheus 监控数据查询与告警管理 MCP",
          downloadUrl: "https://openocta.com/api/v1/mcps/26/download",
          category: "运维",
        },
      },
      {
        kind: "env",
        ref: {
          name: "SSH_HOST",
          description: "默认 SSH 巡检目标主机",
          required: true,
          example: "192.168.1.10",
        },
      },
      {
        kind: "env",
        ref: {
          name: "SSH_USER",
          description: "SSH 登录用户名",
          required: true,
          example: "ops",
        },
      },
      {
        kind: "tool",
        ref: {
          name: "openssh-clients",
          description: "SSH 客户端（离线包，可选）",
          platform: "linux-deb",
          relativePath: "scenarios/host-inspection/bundled/.gitkeep",
        },
      },
    ],
  },
  {
    id: "database-ops",
    name: "数据库运维场景",
    summary:
      "慢查询分析、备份校验与连接健康检查。安装数据库运维 Skill 与 SQL MCP，并配置数据库连接环境变量。",
    readmePath: "scenarios/database-ops/README.md",
    initScriptPaths: {
      sh: "scenarios/database-ops/init.sh",
      ps1: "scenarios/database-ops/init.ps1",
      cmd: "scenarios/database-ops/init.cmd",
      bat: "scenarios/database-ops/init.bat",
    },
    tasks: [
      {
        kind: "skill",
        ref: {
          id: "postgres-patterns",
          name: "postgres-patterns",
          description: "PostgreSQL 最佳实践与 SQL 分析参考",
          downloadUrl: "https://openocta.com/api/v1/skills/postgres-patterns/download",
          category: "数据库",
        },
      },
      {
        kind: "mcp",
        ref: {
          id: "25",
          name: "MySQL-MCP",
          description: "MySQL 数据库运维与查询 MCP",
          downloadUrl: "https://openocta.com/api/v1/mcps/25/download",
          category: "数据库",
        },
      },
      {
        kind: "env",
        ref: {
          name: "DB_DSN",
          description: "数据库连接串（不含密码时可拆分为 DB_HOST/DB_USER）",
          required: true,
          example: "postgres://user@localhost:5432/app",
        },
      },
    ],
  },
  {
    id: "k8s-incident",
    name: "K8s 处置场景",
    summary:
      "Pod 异常、事件与日志聚合排查。安装 Kubernetes 运维 Skill 与集群 MCP，并配置 kubeconfig 路径。",
    readmePath: "scenarios/k8s-incident/README.md",
    initScriptPaths: {
      sh: "scenarios/k8s-incident/init.sh",
      ps1: "scenarios/k8s-incident/init.ps1",
      cmd: "scenarios/k8s-incident/init.cmd",
      bat: "scenarios/k8s-incident/init.bat",
    },
    tasks: [
      {
        kind: "skill",
        ref: {
          id: "kubernetes-devops",
          name: "kubernetes-devops",
          description: "Kubernetes 清单生成与集群运维技能",
          downloadUrl: "https://openocta.com/api/v1/skills/kubernetes-devops/download",
          category: "云原生",
        },
      },
      {
        kind: "mcp",
        ref: {
          id: "23",
          name: "k8s-MCP",
          description: "Kubernetes 集群资源查询与管理 MCP",
          downloadUrl: "https://openocta.com/api/v1/mcps/23/download",
          category: "云原生",
        },
      },
      {
        kind: "env",
        ref: {
          name: "KUBECONFIG",
          description: "kubeconfig 文件路径",
          required: true,
          example: "~/.kube/config",
        },
      },
    ],
  },
  {
    id: "browser-office",
    name: "浏览器操作办公场景",
    summary:
      "网页填报、表单抓取与办公自动化。安装浏览器自动化 Skill 与 Browser MCP，可选配置代理环境变量。",
    readmePath: "scenarios/browser-office/README.md",
    initScriptPaths: {
      sh: "scenarios/browser-office/init.sh",
      ps1: "scenarios/browser-office/init.ps1",
      cmd: "scenarios/browser-office/init.cmd",
      bat: "scenarios/browser-office/init.bat",
    },
    tasks: [
      {
        kind: "skill",
        ref: {
          id: "browserless-agent",
          name: "browserless-agent",
          description: "Headless 浏览器网页自动化技能",
          downloadUrl: "https://openocta.com/api/v1/skills/browserless-agent/download",
          category: "自动化",
        },
      },
      {
        kind: "mcp",
        ref: {
          id: "27",
          name: "playwright-MCP",
          description: "Playwright 浏览器自动化 MCP",
          downloadUrl: "https://openocta.com/api/v1/mcps/27/download",
          category: "自动化",
        },
      },
      {
        kind: "env",
        ref: {
          name: "HTTP_PROXY",
          description: "可选 HTTP 代理",
          required: false,
          example: "http://127.0.0.1:7890",
        },
      },
    ],
  },
];

export function getScenarioTemplate(id: string): ScenarioTemplate | undefined {
  return SCENARIO_TEMPLATES.find((t) => t.id === id);
}

/** 根据已初始化场景返回聊天快捷输入；无场景或未配置时返回默认文案。 */
export function resolveChatQuickPrompts(
  config: Record<string, unknown> | null | undefined,
): string[] {
  const scenarioId = readInitializedScenarioId(config);
  if (!scenarioId) {
    return [...DEFAULT_CHAT_QUICK_PROMPTS];
  }
  const template = getScenarioTemplate(scenarioId);
  const prompts = normalizeScenarioQuickPrompts(template?.quickPrompts);
  return prompts.length > 0 ? prompts : [...DEFAULT_CHAT_QUICK_PROMPTS];
}

export function scenarioTaskLabel(task: ScenarioInitTask): string {
  switch (task.kind) {
    case "skill":
      return `安装 Skill：${task.ref.name}`;
    case "mcp":
      return `安装 MCP：${task.ref.name}`;
    case "employee":
      return `安装数字员工：${task.ref.name}`;
    case "env":
      return `环境变量：${task.ref.name}`;
    case "tool":
      return `工具包：${task.ref.name}`;
  }
}
