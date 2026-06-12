const SETUP_WIZARD_STORAGE_KEY = "openocta.setup-wizard.completed.v1";
const SETUP_WIZARD_SKIP_PENDING_KEY = "openocta.setup-wizard.skip-pending.v1";

type SetupWizardHelloSource = {
  server?: { version?: string };
} | null | undefined;

/** 与后端 version.Version 一致：优先 config.schema.version，其次 hello-ok.server.version */
export function resolveSetupWizardVersion(
  configSchemaVersion?: string | null,
  hello?: SetupWizardHelloSource,
): string | null {
  const fromSchema = configSchemaVersion?.trim();
  if (fromSchema) {
    return fromSchema;
  }
  const fromHello = hello?.server?.version?.trim();
  if (fromHello) {
    return fromHello;
  }
  return null;
}

export type SetupWizardConfigStatus = "completed" | "skipped" | "in_progress";

export type SetupWizardConfigState = {
  version: string;
  status: SetupWizardConfigStatus;
  completedAt: string;
  skippedSteps?: SetupWizardStepId[];
  /** 安装引导中已成功执行初始化的场景 ID */
  scenarioId?: string;
};

export type SetupWizardStepId = "environment" | "models" | "resources" | "scenarios" | "summary";

export const SETUP_WIZARD_STEPS: SetupWizardStepId[] = [
  "models",
  "resources",
  "environment",
  "scenarios",
  "summary",
];

export type SetupWizardEnvironmentComponentId = "chromium";

export type SetupWizardResourceTab = "skills" | "employees" | "mcp" | "channels";

export type SetupWizardTaskStatus = "pending" | "running" | "waiting" | "done" | "failed" | "skipped";

export type SetupWizardScenarioEnvPrompt = {
  taskIndex: number;
  name: string;
  description: string;
  required?: boolean;
  example?: string;
  error?: string;
};

export type SetupWizardScenarioTaskRecord = {
  label: string;
  kind: "skill" | "mcp" | "employee" | "env" | "tool" | "script";
  status: SetupWizardTaskStatus;
  detail?: string;
};

export type SetupWizardScenarioRunRecord = {
  id: string;
  name: string;
  tasks: SetupWizardScenarioTaskRecord[];
};

export type SetupWizardSession = {
  modelsConfigured: string[];
  defaultModelRef: string | null;
  enabledModelProviders: string[];
  skillsInstalled: string[];
  employeesInstalled: string[];
  mcpsInstalled: string[];
  channelsEnabled: string[];
  channelsConfigured: string[];
  selectedScenarioId: string | null;
  selectedScenarioName: string | null;
  scenarioEnvVars: Record<string, string>;
  scenariosRun: SetupWizardScenarioRunRecord[];
  skippedSteps: SetupWizardStepId[];
  environmentInstalled: SetupWizardEnvironmentComponentId[];
};

export function createEmptySetupWizardSession(): SetupWizardSession {
  return {
    modelsConfigured: [],
    defaultModelRef: null,
    enabledModelProviders: [],
    skillsInstalled: [],
    employeesInstalled: [],
    mcpsInstalled: [],
    channelsEnabled: [],
    channelsConfigured: [],
    selectedScenarioId: null,
    selectedScenarioName: null,
    scenarioEnvVars: {},
    scenariosRun: [],
    skippedSteps: [],
    environmentInstalled: [],
  };
}

export function setupWizardStepLabel(step: SetupWizardStepId): string {
  switch (step) {
    case "environment":
      return "环境初始化";
    case "models":
      return "配置模型";
    case "resources":
      return "安装资源";
    case "scenarios":
      return "场景初始化";
    case "summary":
      return "完成";
  }
}

export function setupWizardStepSubtitle(step: SetupWizardStepId): string {
  switch (step) {
    case "environment":
      return "下载运行依赖";
    case "models":
      return "配置大模型";
    case "resources":
      return "安装数字员工、技能、工具等";
    case "scenarios":
      return "选择场景并自动安装依赖";
    case "summary":
      return "查看配置与安装摘要";
  }
}

export function setupWizardStepDescription(step: SetupWizardStepId): string {
  switch (step) {
    case "environment":
      return "选择需要初始化的运行组件，本步骤可跳过。";
    case "models":
      return "请至少配置一个 AI 模型来为您的 OpenOcta 提供智能能力，您稍后可以在设置里添加更多模型。";
    case "resources":
      return "按需安装技能、数字员工、MCP 工具，或配置 IM 通道；本步骤可跳过。";
    case "scenarios":
      return "请选择一个场景模板，系统将自动安装相关 Skill、MCP，并写入环境变量到 openocta.json。";
    case "summary":
      return "以下是本次引导中的配置与安装摘要，确认后即可开始使用。";
  }
}

export function readSetupWizardConfigState(
  config: Record<string, unknown> | null | undefined,
): SetupWizardConfigState | null {
  const wizard = config?.wizard as Record<string, unknown> | undefined;
  const setup = wizard?.setup as Record<string, unknown> | undefined;
  if (!setup || typeof setup !== "object") {
    return null;
  }
  const version = typeof setup.version === "string" ? setup.version.trim() : "";
  const status =
    setup.status === "completed" || setup.status === "skipped" || setup.status === "in_progress"
      ? setup.status
      : null;
  const completedAt = typeof setup.completedAt === "string" ? setup.completedAt.trim() : "";
  if (!version && !status && !completedAt) {
    return null;
  }
  const skippedRaw = setup.skippedSteps;
  const skippedSteps = Array.isArray(skippedRaw)
    ? skippedRaw.filter((step): step is SetupWizardStepId =>
        typeof step === "string" && SETUP_WIZARD_STEPS.includes(step as SetupWizardStepId),
      )
    : undefined;
  const scenarioId =
    typeof setup.scenarioId === "string" && setup.scenarioId.trim() ? setup.scenarioId.trim() : undefined;
  return {
    version,
    status: status ?? "in_progress",
    completedAt,
    skippedSteps: skippedSteps && skippedSteps.length > 0 ? skippedSteps : undefined,
    scenarioId,
  };
}

function isSetupWizardFinishedStatus(status: SetupWizardConfigStatus): boolean {
  return status === "completed" || status === "skipped";
}

export function shouldShowSetupWizard(
  version: string,
  config?: Record<string, unknown> | null,
): boolean {
  const normalizedVersion = version.trim();
  if (!normalizedVersion) {
    return false;
  }
  const fromConfig = readSetupWizardConfigState(config);
  if (
    fromConfig &&
    isSetupWizardFinishedStatus(fromConfig.status) &&
    fromConfig.version === normalizedVersion
  ) {
    return false;
  }
  if (fromConfig?.version && fromConfig.version !== normalizedVersion) {
    return true;
  }
  if (fromConfig && !isSetupWizardFinishedStatus(fromConfig.status)) {
    return true;
  }
  if (fromConfig === null && config != null) {
    // 全部跳过后若尚未写入 openocta.json，仍视为已完成，等待 flush 同步
    if (hasSetupWizardSkipPendingConfigSync(normalizedVersion)) {
      return false;
    }
    // 配置已加载但无 wizard.setup（如删除/重建 openocta.json）— 以配置文件为准，应再次引导
    return true;
  }
  if (config === undefined) {
    // Config not consulted yet — use localStorage only
    if (typeof localStorage === "undefined") {
      return false;
    }
    try {
      const raw = localStorage.getItem(SETUP_WIZARD_STORAGE_KEY);
      if (!raw) {
        return true;
      }
      const parsed = JSON.parse(raw) as { version?: string };
      return parsed.version !== normalizedVersion;
    } catch {
      return true;
    }
  }
  return true;
}

export function buildSetupWizardSkippedRecord(version: string): SetupWizardConfigState {
  return {
    version,
    status: "skipped",
    completedAt: new Date().toISOString(),
    skippedSteps: [...SETUP_WIZARD_STEPS],
  };
}

export function buildSetupWizardConfigRecord(
  session: SetupWizardSession,
  version: string,
): SetupWizardConfigState {
  const scenarioId = session.scenariosRun[0]?.id;
  return {
    version,
    status: "completed",
    completedAt: new Date().toISOString(),
    skippedSteps: session.skippedSteps.length > 0 ? session.skippedSteps : undefined,
    ...(scenarioId ? { scenarioId } : {}),
  };
}

export function clearSetupWizardLocalCompletion(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(SETUP_WIZARD_STORAGE_KEY);
}

export function markSetupWizardSkipPendingConfigSync(version: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(SETUP_WIZARD_SKIP_PENDING_KEY, JSON.stringify({ version }));
}

export function clearSetupWizardSkipPendingConfigSync(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(SETUP_WIZARD_SKIP_PENDING_KEY);
}

export function hasSetupWizardSkipPendingConfigSync(version?: string): boolean {
  if (typeof localStorage === "undefined") {
    return false;
  }
  try {
    const raw = localStorage.getItem(SETUP_WIZARD_SKIP_PENDING_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw) as { version?: string };
    if (!parsed.version) {
      return false;
    }
    if (version == null) {
      return true;
    }
    return parsed.version === version;
  } catch {
    return false;
  }
}

export function markSetupWizardCompleted(version: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(
    SETUP_WIZARD_STORAGE_KEY,
    JSON.stringify({ version, completedAt: Date.now() }),
  );
}

/** 用 openocta.json 中的 wizard.setup 同步 localStorage，避免配置删除后仍被缓存拦截 */
export function syncSetupWizardCompletionCache(
  config: Record<string, unknown> | null | undefined,
): void {
  const fromConfig = readSetupWizardConfigState(config);
  if (fromConfig?.status && isSetupWizardFinishedStatus(fromConfig.status) && fromConfig.version) {
    markSetupWizardCompleted(fromConfig.version);
    clearSetupWizardSkipPendingConfigSync();
    return;
  }
  if (config != null && fromConfig === null && !hasSetupWizardSkipPendingConfigSync()) {
    clearSetupWizardLocalCompletion();
  }
}

export function resolveDefaultModelRef(config: Record<string, unknown> | null | undefined): string | null {
  if (!config?.agents) return null;
  const agents = config.agents as Record<string, unknown>;
  const defaults = agents.defaults as Record<string, unknown> | undefined;
  if (!defaults?.model) return null;
  const model = defaults.model;
  if (typeof model === "string" && model) return model;
  if (model && typeof model === "object" && !Array.isArray(model)) {
    const primary = (model as Record<string, unknown>).primary;
    return typeof primary === "string" && primary ? primary : null;
  }
  return null;
}
