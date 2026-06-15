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

/** 场景列表底部提示：更多场景尚未开放 */
export const SCENARIO_COMING_SOON_HINT = "更多场景即将推出，敬请期待。";

/** Built-in scenario templates; scripts live under repo `scenarios/<id>/`. */
export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "host-inspection",
    name: "主机巡检场景",
    summary:
      "定期巡检主机 CPU、内存、磁盘与服务状态。自动安装 Server Patrol 巡检 Skill，并准备 SSH 客户端离线包。",
    readmePath: "scenarios/host-inspection/README.md",
    initScriptPaths: {
      sh: "scenarios/host-inspection/init.sh",
      ps1: "scenarios/host-inspection/init.ps1",
      cmd: "scenarios/host-inspection/init.cmd",
      bat: "scenarios/host-inspection/init.bat",
    },
    quickPrompts: [
      "对目标主机执行服务器巡检并输出 Markdown 报告",
      "检查目标主机 CPU、内存、磁盘使用情况",
      "帮我梳理主机异常排查思路，并给出优先级",
      "你能告诉我你有哪些技能吗？",
    ],
    tasks: [
      {
        kind: "skill",
        ref: {
          id: "server-patrol",
          name: "Server Patrol",
          description: "服务器巡检：主机健康检查与巡检报告生成",
          downloadUrl: "https://openocta.com/api/v1/skills/server-patrol/download",
          category: "运维",
        },
      },
      {
        kind: "tool",
        ref: {
          name: "openssh-clients",
          description: "SSH 客户端（离线包）",
          platform: "linux-deb",
          relativePath: "scenarios/host-inspection/bundled/.gitkeep",
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
