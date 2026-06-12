import type { AppViewState } from "./app-view-state.ts";
import { executeScenarioTemplate, type ScenarioEnvInputRequest } from "./controllers/setup-wizard-scenarios.ts";
import { saveConfig, saveConfigPatch, loadConfig, updateConfigFormValue } from "./controllers/config.ts";
import { cloneConfigObject } from "./controllers/config/form-utils.ts";
import {
  cancelBrowserInstall,
  fetchBrowserInstallStatus,
  startBrowserInstall,
  type BrowserInstallProgress,
} from "./controllers/browser-install.ts";
import {
  fetchEmployees,
  fetchMcps,
  fetchSkills,
  installFromSite,
} from "./controllers/remote-market.ts";
import { getScenarioTemplate, scenarioTaskLabel } from "./scenario-templates.ts";
import type { SetupWizardProps } from "./views/setup-wizard.ts";
import type { ModelsProps, ModelProvider } from "./views/models.ts";
import {
  SETUP_WIZARD_STEPS,
  buildSetupWizardConfigRecord,
  buildSetupWizardSkippedRecord,
  clearSetupWizardSkipPendingConfigSync,
  createEmptySetupWizardSession,
  markSetupWizardCompleted,
  markSetupWizardSkipPendingConfigSync,
  readSetupWizardConfigState,
  resolveDefaultModelRef,
  resolveSetupWizardVersion,
  syncSetupWizardCompletionCache,
  type SetupWizardResourceTab,
  type SetupWizardStepId,
} from "./setup-wizard.ts";
import {
  handleModelsAddModel,
  handleModelsAddModelFormChange,
  handleModelsAddModelModalClose,
  handleModelsAddModelSubmit,
  handleModelsAddProvider,
  handleModelsAddProviderFormChange,
  handleModelsAddProviderModalClose,
  handleModelsAddProviderSubmit,
  handleModelsCancel,
  handleModelsCancelUse,
  handleModelsDeleteProvider,
  handleModelsPatch,
  handleModelsPatchModel,
  handleModelsPatchModelEnv,
  handleModelsRemoveModel,
  handleModelsSave,
  handleModelsSelect,
  handleModelsUseModel,
  handleModelsUseModelClick,
  handleModelsUseModelModalClose,
} from "./app-models.ts";
import { BUILTIN_PROVIDERS, parseModelRef } from "./views/models-builtin.ts";
import type { ModelLibraryCategory } from "./views/model-library.ts";

let scenarioEnvPromptResolver: ((value: string | null) => void) | null = null;

function wizardGatewayOpts(state: AppViewState) {
  return {
    gatewayHost: state.settings?.gatewayUrl?.trim() ?? "",
    token: state.settings?.token?.trim() ?? "",
  };
}

function syncSetupWizardEnvironmentSession(state: AppViewState) {
  const installed = [...state.setupWizardSession.environmentInstalled];
  if (state.setupWizardBrowserReady && !installed.includes("chromium")) {
    installed.push("chromium");
  }
  state.setupWizardSession = {
    ...state.setupWizardSession,
    environmentInstalled: installed,
  };
}

function applyBrowserInstallStatus(
  state: AppViewState,
  data: {
    installed?: boolean;
    installing?: boolean;
    installError?: string;
    progress?: BrowserInstallProgress;
  },
) {
  state.setupWizardBrowserReady = Boolean(data.installed);
  state.setupWizardBrowserInstalling = Boolean(data.installing);
  state.setupWizardBrowserInstallError = data.installError?.trim() || null;
  state.setupWizardBrowserInstallProgress = data.progress ?? null;
  if (data.installed) {
    state.setupWizardBrowserInstalling = false;
  }
  syncSetupWizardEnvironmentSession(state);
}

export function stopSetupWizardBrowserPoll(state: AppViewState) {
  const host = state as AppViewState & { setupWizardBrowserPollTimer?: number | null };
  if (host.setupWizardBrowserPollTimer != null) {
    clearInterval(host.setupWizardBrowserPollTimer);
    host.setupWizardBrowserPollTimer = null;
  }
}

function startSetupWizardBrowserPoll(state: AppViewState) {
  const host = state as AppViewState & { setupWizardBrowserPollTimer?: number | null };
  stopSetupWizardBrowserPoll(state);
  host.setupWizardBrowserPollTimer = window.setInterval(() => {
    void loadSetupWizardBrowserStatus(state);
  }, 1200);
}

export async function loadSetupWizardBrowserStatus(state: AppViewState) {
  if (!state.connected) {
    return;
  }
  const result = await fetchBrowserInstallStatus(wizardGatewayOpts(state));
  if (!result.ok || !result.data) {
    state.setupWizardBrowserInstallError = result.error ?? "无法获取浏览器安装状态";
    return;
  }
  applyBrowserInstallStatus(state, result.data);
  if (!result.data.installing) {
    stopSetupWizardBrowserPoll(state);
  }
}

export async function setupWizardCancelBrowserInstall(state: AppViewState) {
  if (!state.setupWizardBrowserInstalling) {
    return;
  }
  state.setupWizardBrowserInstallError = null;
  const result = await cancelBrowserInstall(wizardGatewayOpts(state));
  if (!result.ok) {
    state.setupWizardBrowserInstallError = result.error ?? "取消安装失败";
    return;
  }
  if (result.data) {
    applyBrowserInstallStatus(state, result.data);
  }
  state.setupWizardBrowserInstalling = false;
  stopSetupWizardBrowserPoll(state);
  await loadSetupWizardBrowserStatus(state);
}

export async function setupWizardStartBrowserInstall(state: AppViewState) {
  if (!state.setupWizardBrowserChromiumSelected || state.setupWizardBrowserInstalling || state.setupWizardBrowserReady) {
    return;
  }
  state.setupWizardBrowserInstallError = null;
  const result = await startBrowserInstall(wizardGatewayOpts(state));
  if (!result.ok) {
    state.setupWizardBrowserInstallError = result.error ?? "启动安装失败";
    return;
  }
  if (result.data) {
    applyBrowserInstallStatus(state, result.data);
  }
  state.setupWizardBrowserInstalling = true;
  startSetupWizardBrowserPoll(state);
}

function rejectScenarioEnvPrompt(state: AppViewState) {
  if (scenarioEnvPromptResolver) {
    scenarioEnvPromptResolver(null);
    scenarioEnvPromptResolver = null;
  }
  state.setupWizardScenarioEnvPrompt = null;
}

function readConfigEnvVars(state: AppViewState): Record<string, string> {
  const vars =
    (state.configForm?.env as { vars?: Record<string, string> })?.vars ??
    (state.configSnapshot?.config as { env?: { vars?: Record<string, string> } })?.env?.vars;
  return vars ?? {};
}

function buildScenarioEnvVars(state: AppViewState, scenarioId: string): Record<string, string> {
  const template = getScenarioTemplate(scenarioId);
  if (!template) {
    return { ...state.setupWizardSession.scenarioEnvVars };
  }
  const configVars = readConfigEnvVars(state);
  const sessionVars = state.setupWizardSession.scenarioEnvVars;
  const out: Record<string, string> = {};
  for (const task of template.tasks) {
    if (task.kind !== "env") {
      continue;
    }
    const name = task.ref.name;
    const value = sessionVars[name]?.trim() || configVars[name]?.trim();
    if (value) {
      out[name] = value;
    }
  }
  return out;
}

async function waitForScenarioEnvInput(
  state: AppViewState,
  request: ScenarioEnvInputRequest,
): Promise<string | null> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  return new Promise((resolve) => {
    scenarioEnvPromptResolver = resolve;
    state.setupWizardScenarioEnvPrompt = {
      taskIndex: request.taskIndex,
      name: request.name,
      description: request.description,
      required: request.required,
      example: request.example,
    };
  });
}

export function setupWizardContinueScenarioEnv(state: AppViewState) {
  const prompt = state.setupWizardScenarioEnvPrompt;
  if (!prompt || !scenarioEnvPromptResolver) {
    return;
  }
  const value = state.setupWizardSession.scenarioEnvVars[prompt.name]?.trim() ?? "";
  const resolve = scenarioEnvPromptResolver;
  scenarioEnvPromptResolver = null;
  state.setupWizardScenarioEnvPrompt = null;
  resolve(value);
  if (value) {
    void persistScenarioEnvVars(state);
  }
}

const WIZARD_CHANNEL_IDS = ["feishu", "dingtalk", "wework", "weixin", "qq"] as const;

const WIZARD_CHANNEL_LABELS: Record<string, string> = {
  feishu: "飞书",
  dingtalk: "钉钉",
  wework: "企业微信",
  weixin: "微信",
  qq: "QQ",
};

function readChannelEnabled(config: Record<string, unknown> | null | undefined, channelId: string): boolean {
  const channels = config?.channels as Record<string, unknown> | undefined;
  const ch = channels?.[channelId] as Record<string, unknown> | undefined;
  return ch?.enabled === true;
}

function syncSetupWizardChannelsSession(state: AppViewState) {
  const config = (state.configForm ?? state.configSnapshot?.config) as Record<string, unknown> | null;
  const enabled: string[] = [];
  const configured: string[] = [];
  for (const id of WIZARD_CHANNEL_IDS) {
    if (readChannelEnabled(config, id)) {
      enabled.push(id);
    }
    const ch = (config?.channels as Record<string, unknown> | undefined)?.[id] as
      | Record<string, unknown>
      | undefined;
    if (ch && Object.keys(ch).length > 0) {
      configured.push(id);
    }
  }
  state.setupWizardSession = {
    ...state.setupWizardSession,
    channelsEnabled: enabled,
    channelsConfigured: configured,
  };
}

export function buildSetupWizardModelsProps(state: AppViewState): ModelsProps {
  const modelProviders =
    (state.configForm?.models as { providers?: ModelsProps["providers"] })?.providers ??
    (state.configSnapshot?.config as { models?: { providers?: ModelsProps["providers"] } })?.models
      ?.providers ??
    {};
  const modelEnv =
    (state.configForm?.env as { modelEnv?: Record<string, Record<string, string>> })?.modelEnv ?? {};
  const defaultModelRef = resolveDefaultModelRef(
    (state.configForm ?? state.configSnapshot?.config) as Record<string, unknown> | null | undefined,
  );

  return {
    providers: modelProviders,
    formProviders: modelProviders,
    modelEnv,
    defaultModelRef,
    loading: state.configLoading,
    saving: state.configSaving,
    selectedProvider: state.modelsSelectedProvider,
    providerSearchQuery: state.setupWizardModelSearchQuery,
    viewMode: "card",
    formDirty: state.modelsFormDirty,
    addProviderModalOpen: state.modelsAddProviderModalOpen,
    addProviderForm: state.modelsAddProviderForm,
    addModelModalOpen: state.modelsAddModelModalOpen,
    addModelForm: state.modelsAddModelForm,
    useModelModalOpen: state.modelsUseModelModalOpen,
    useModelModalProvider: state.modelsUseModelModalProvider,
    saveError: state.modelsSaveError,
    onRefresh: () => undefined,
    onAddProvider: () => handleModelsAddProvider(state),
    onAddProviderModalClose: () => handleModelsAddProviderModalClose(state),
    onAddProviderFormChange: (form) => handleModelsAddProviderFormChange(state, form),
    onAddProviderSubmit: () => {
      handleModelsAddProviderSubmit(state);
      const key = state.modelsSelectedProvider;
      if (key) {
        const next = new Set(state.setupWizardEnabledProviders);
        next.add(key);
        state.setupWizardEnabledProviders = next;
      }
      syncSetupWizardModelsSession(state);
    },
    onSelect: (key) => handleModelsSelect(state, key),
    onProviderSearchChange: (query) => {
      state.setupWizardModelSearchQuery = query;
    },
    onViewModeChange: () => undefined,
    onPatch: (key, patch) => {
      handleModelsPatch(state, key, patch);
      syncSetupWizardModelsSession(state);
    },
    onAddModel: (providerKey) => handleModelsAddModel(state, providerKey),
    onAddModelModalClose: () => handleModelsAddModelModalClose(state),
    onAddModelFormChange: (form) => handleModelsAddModelFormChange(state, form),
    onAddModelSubmit: (providerKey) => {
      handleModelsAddModelSubmit(state, providerKey);
      syncSetupWizardModelsSession(state);
    },
    onRemoveModel: (providerKey, modelId) => {
      handleModelsRemoveModel(state, providerKey, modelId);
      syncSetupWizardModelsSession(state);
    },
    onPatchModel: (providerKey, modelId, patch) => {
      handleModelsPatchModel(state, providerKey, modelId, patch);
      syncSetupWizardModelsSession(state);
    },
    onPatchModelEnv: (providerKey, modelId, envVars) => {
      handleModelsPatchModelEnv(state, providerKey, modelId, envVars);
      syncSetupWizardModelsSession(state);
    },
    onSave: () => {
      handleModelsSave(state);
      syncSetupWizardModelsSession(state);
    },
    onCancel: () => handleModelsCancel(state),
    onUseModelClick: (provider) => handleModelsUseModelClick(state, provider),
    onUseModelModalClose: () => handleModelsUseModelModalClose(state),
    onUseModel: (provider, modelId) => {
      handleModelsUseModel(state, provider, modelId);
      syncSetupWizardModelsSession(state);
    },
    onCancelUse: (provider) => {
      handleModelsCancelUse(state, provider);
      syncSetupWizardModelsSession(state);
    },
    onDeleteProvider: () => {
      void handleModelsDeleteProvider(state);
      syncSetupWizardModelsSession(state);
    },
  };
}

export function syncSetupWizardModelsSession(state: AppViewState) {
  const providers =
    (state.configForm?.models as { providers?: Record<string, unknown> })?.providers ??
    (state.configSnapshot?.config as { models?: { providers?: Record<string, unknown> } })?.models
      ?.providers ??
    {};
  state.setupWizardSession = {
    ...state.setupWizardSession,
    modelsConfigured: Object.keys(providers),
    defaultModelRef: resolveDefaultModelRef(
      (state.configForm ?? state.configSnapshot?.config) as Record<string, unknown> | null | undefined,
    ),
    enabledModelProviders: [...state.setupWizardEnabledProviders],
  };
}

function ensureWizardProviderConfig(state: AppViewState, key: string) {
  const existing =
    (state.configForm?.models as { providers?: ModelsProps["providers"] })?.providers?.[key] ??
    (state.configSnapshot?.config as { models?: { providers?: ModelsProps["providers"] } })?.models
      ?.providers?.[key];
  if (existing) {
    return;
  }
  const builtin = BUILTIN_PROVIDERS.find((p) => p.id === key);
  const patch: Partial<ModelProvider> = {
    api: builtin?.defaultApi ?? "openai-completions",
  };
  if (builtin?.baseUrl && builtin.baseUrl !== "(官方)") {
    patch.baseUrl = builtin.baseUrl;
  }
  if (builtin?.defaultModel) {
    patch.models = [{ id: builtin.defaultModel, name: builtin.defaultModel }];
  }
  handleModelsPatch(state, key, patch);
}

function seedSetupWizardEnabledProviders(state: AppViewState) {
  const providers =
    (state.configForm?.models as { providers?: ModelsProps["providers"] })?.providers ??
    (state.configSnapshot?.config as { models?: { providers?: ModelsProps["providers"] } })?.models
      ?.providers ??
    {};
  const defaultModelRef = resolveDefaultModelRef(
    (state.configForm ?? state.configSnapshot?.config) as Record<string, unknown> | null | undefined,
  );
  const enabled = new Set<string>();
  // 升级用户：本地 openocta.json 已有厂商配置则默认开启并回显
  for (const key of Object.keys(providers ?? {})) {
    enabled.add(key);
  }
  const parsedDefault = parseModelRef(defaultModelRef);
  if (parsedDefault?.provider) {
    enabled.add(parsedDefault.provider);
  }
  state.setupWizardEnabledProviders = enabled;
  state.setupWizardSession = {
    ...state.setupWizardSession,
    enabledModelProviders: [...enabled],
  };
}

/** 配置加载完成后刷新引导中的模型/通道回显 */
export function refreshSetupWizardFromConfig(state: AppViewState) {
  if (!state.setupWizardActive) {
    return;
  }
  seedSetupWizardEnabledProviders(state);
  syncSetupWizardModelsSession(state);
  syncSetupWizardChannelsSession(state);
}

export function handleSetupWizardModelToggle(state: AppViewState, key: string, enabled: boolean) {
  const next = new Set(state.setupWizardEnabledProviders);
  if (enabled) {
    next.add(key);
    ensureWizardProviderConfig(state, key);
  } else {
    next.delete(key);
  }
  state.setupWizardEnabledProviders = next;
  syncSetupWizardModelsSession(state);
}

export function handleSetupWizardModelBaseUrlChange(state: AppViewState, key: string, baseUrl: string) {
  handleModelsPatch(state, key, { baseUrl: baseUrl.trim() || undefined });
  if (baseUrl.trim()) {
    const next = new Set(state.setupWizardEnabledProviders);
    next.add(key);
    state.setupWizardEnabledProviders = next;
    ensureWizardProviderConfig(state, key);
  }
  syncSetupWizardModelsSession(state);
}

export function handleSetupWizardModelApiKeyChange(state: AppViewState, key: string, apiKey: string) {
  handleModelsPatch(state, key, { apiKey: apiKey.trim() || undefined });
  if (apiKey.trim()) {
    const next = new Set(state.setupWizardEnabledProviders);
    next.add(key);
    state.setupWizardEnabledProviders = next;
    ensureWizardProviderConfig(state, key);
  }
  syncSetupWizardModelsSession(state);
}

export function handleSetupWizardChannelToggle(state: AppViewState, channelId: string, enabled: boolean) {
  updateConfigFormValue(state, ["channels", channelId, "enabled"], enabled);
  syncSetupWizardChannelsSession(state);
}

export function handleSetupWizardChannelConfigure(state: AppViewState, channelId: string | null) {
  state.setupWizardSelectedChannelId = channelId;
}

export async function handleSetupWizardChannelSave(state: AppViewState) {
  const channels = state.configForm?.channels;
  if (channels != null && typeof channels === "object") {
    await saveConfigPatch(state, { channels });
  }
  syncSetupWizardChannelsSession(state);
  state.setupWizardSelectedChannelId = null;
}

export function handleSetupWizardChannelReload(state: AppViewState) {
  if (state.configFormOriginal) {
    state.configForm = cloneConfigObject(state.configFormOriginal);
    state.configFormDirty = false;
  }
  syncSetupWizardChannelsSession(state);
}

async function persistScenarioEnvVars(state: AppViewState) {
  const vars = state.setupWizardSession.scenarioEnvVars;
  const filtered = Object.fromEntries(Object.entries(vars).filter(([, v]) => v.trim()));
  if (Object.keys(filtered).length === 0) {
    return;
  }
  const existing =
    (state.configForm?.env as { vars?: Record<string, string> })?.vars ??
    (state.configSnapshot?.config as { env?: { vars?: Record<string, string> } })?.env?.vars ??
    {};
  const merged = { ...existing, ...filtered };
  updateConfigFormValue(state, ["env", "vars"], merged);
  await saveConfigPatch(state, { env: { vars: merged } });
}

export function handleSetupWizardSelectScenario(state: AppViewState, id: string) {
  const template = getScenarioTemplate(id);
  rejectScenarioEnvPrompt(state);
  state.setupWizardSelectedScenarioId = id;
  state.setupWizardScenarioMenuOpenId = null;
  state.setupWizardScenarioRunCompleted = false;
  state.setupWizardScenarioProgress = null;
  state.setupWizardScenarioCancelRequested = false;
  const scenarioEnvVars = buildScenarioEnvVars(state, id);
  state.setupWizardSession = {
    ...state.setupWizardSession,
    selectedScenarioId: id,
    selectedScenarioName: template?.name ?? id,
    scenarioEnvVars,
  };
}

export function handleSetupWizardScenarioEnvChange(
  state: AppViewState,
  name: string,
  value: string,
) {
  const next = { ...state.setupWizardSession.scenarioEnvVars, [name]: value };
  state.setupWizardSession = { ...state.setupWizardSession, scenarioEnvVars: next };
  const prompt = state.setupWizardScenarioEnvPrompt;
  if (prompt?.name === name && prompt.error) {
    state.setupWizardScenarioEnvPrompt = { ...prompt, error: undefined };
  }
}

export async function handleSetupWizardScenarioEnvSave(state: AppViewState) {
  await persistScenarioEnvVars(state);
  state.setupWizardScenarioEnvPanelOpen = false;
}

export async function loadSetupWizardResources(state: AppViewState, options?: { silent?: boolean }) {
  if (state.setupWizardResourcesLoading) {
    return;
  }
  const silent = options?.silent === true;
  const hasCachedItems =
    state.setupWizardSkillItems.length > 0 ||
    state.setupWizardEmployeeItems.length > 0 ||
    state.setupWizardMcpItems.length > 0;
  if (!silent || !hasCachedItems) {
    state.setupWizardResourcesLoading = true;
  }
  state.setupWizardResourcesError = null;
  const opts = {
    gatewayHost: state.settings?.gatewayUrl?.trim(),
    token: state.settings?.token?.trim(),
  };
  try {
    const [skills, employees, mcps] = await Promise.all([
      fetchSkills({ q: state.setupWizardSkillQuery }, opts),
      fetchEmployees({ q: state.setupWizardEmployeeQuery }, opts),
      fetchMcps({ q: state.setupWizardMcpQuery }, opts),
    ]);
    state.setupWizardSkillItems = skills;
    state.setupWizardEmployeeItems = employees;
    state.setupWizardMcpItems = mcps;
  } catch (err) {
    state.setupWizardResourcesError = err instanceof Error ? err.message : String(err);
  } finally {
    state.setupWizardResourcesLoading = false;
  }
}

function currentStepId(state: AppViewState): SetupWizardStepId {
  return SETUP_WIZARD_STEPS[
    Math.min(Math.max(0, state.setupWizardStepIndex), SETUP_WIZARD_STEPS.length - 1)
  ]!;
}

export function setupWizardSkipStep(state: AppViewState) {
  const step = currentStepId(state);
  if (step === "summary") {
    return;
  }
  if (!state.setupWizardSession.skippedSteps.includes(step)) {
    state.setupWizardSession = {
      ...state.setupWizardSession,
      skippedSteps: [...state.setupWizardSession.skippedSteps, step],
    };
  }
  setupWizardNext(state, true);
}

export function setupWizardNext(state: AppViewState, fromSkip = false) {
  const step = currentStepId(state);
  if (step === "environment") {
    syncSetupWizardEnvironmentSession(state);
    stopSetupWizardBrowserPoll(state);
  }
  if (step === "models") {
    syncSetupWizardModelsSession(state);
    if (state.modelsFormDirty || state.configFormDirty) {
      handleModelsSave(state);
    }
  }
  if (step === "resources" && !fromSkip) {
    syncSetupWizardChannelsSession(state);
    const channels = state.configForm?.channels;
    if (state.configFormDirty && channels != null && typeof channels === "object") {
      void saveConfigPatch(state, { channels });
    }
  }
  if (state.setupWizardStepIndex >= SETUP_WIZARD_STEPS.length - 1) {
    return;
  }
  state.setupWizardStepIndex += 1;
  const nextStep = currentStepId(state);
  if (nextStep === "environment") {
    void loadSetupWizardBrowserStatus(state);
  }
  if (nextStep === "resources") {
    void loadSetupWizardResources(state);
    syncSetupWizardChannelsSession(state);
  }
  if (nextStep === "summary") {
    syncSetupWizardModelsSession(state);
    syncSetupWizardChannelsSession(state);
  }
}

export function setupWizardBack(state: AppViewState) {
  if (state.setupWizardStepIndex <= 0) {
    return;
  }
  state.setupWizardStepIndex -= 1;
}

export async function setupWizardRunScenarios(state: AppViewState) {
  const scenarioId = state.setupWizardSelectedScenarioId;
  if (state.setupWizardScenarioRunning || !scenarioId || state.setupWizardScenarioRunCompleted) {
    return;
  }
  const template = getScenarioTemplate(scenarioId);
  if (!template) {
    return;
  }
  state.setupWizardScenarioCancelRequested = false;
  state.setupWizardScenarioRunning = true;
  const scenarioEnvVars = buildScenarioEnvVars(state, scenarioId);
  state.setupWizardSession = {
    ...state.setupWizardSession,
    scenarioEnvVars,
  };
  const envVars = { ...scenarioEnvVars };
  const opts = {
    gatewayHost: state.settings?.gatewayUrl?.trim(),
    token: state.settings?.token?.trim(),
    envVars,
  };
  try {
    state.setupWizardScenarioProgress = {
      id: template.id,
      name: template.name,
      tasks: template.tasks.map((task) => ({
        label: scenarioTaskLabel(task),
        kind: task.kind,
        status: "pending" as const,
      })),
    };
    const run = await executeScenarioTemplate(template, {
      ...opts,
      shouldAbort: () => state.setupWizardScenarioCancelRequested,
      onEnvInputRequired: (request) => waitForScenarioEnvInput(state, request),
      onEnvVarCollected: (name, value) => {
        envVars[name] = value;
        handleSetupWizardScenarioEnvChange(state, name, value);
      },
      onTaskUpdate: (_scenarioId, taskIndex, status, detail) => {
        const progress = state.setupWizardScenarioProgress;
        if (!progress) {
          return;
        }
        const tasks = [...progress.tasks];
        const existing = tasks[taskIndex];
        if (existing) {
          tasks[taskIndex] = { ...existing, status, detail };
        }
        state.setupWizardScenarioProgress = { ...progress, tasks };
      },
    });
    state.setupWizardSession = {
      ...state.setupWizardSession,
      scenariosRun: [run],
      selectedScenarioId: template.id,
      selectedScenarioName: template.name,
    };
    if (!state.setupWizardScenarioCancelRequested) {
      state.setupWizardScenarioRunCompleted = true;
    }
  } finally {
    rejectScenarioEnvPrompt(state);
    state.setupWizardScenarioRunning = false;
  }
}

export function setupWizardStopScenarios(state: AppViewState) {
  if (!state.setupWizardScenarioRunning) {
    return;
  }
  state.setupWizardScenarioCancelRequested = true;
  state.setupWizardScenarioRunCompleted = false;
  rejectScenarioEnvPrompt(state);
}

function requireSetupWizardVersion(state: AppViewState): string {
  const version = resolveSetupWizardVersion(state.configSchemaVersion, state.hello);
  if (!version) {
    throw new Error("OpenOcta version unavailable; wait for gateway connection.");
  }
  return version;
}

/** 引导完成：写入 openocta.json 的 wizard.setup（版本/状态/时间），并保存未提交的表单变更 */
export async function persistSetupWizardCompletion(state: AppViewState) {
  syncSetupWizardModelsSession(state);
  syncSetupWizardChannelsSession(state);

  const version = requireSetupWizardVersion(state);
  const setupRecord = buildSetupWizardConfigRecord(state.setupWizardSession, version);
  updateConfigFormValue(state, ["wizard", "setup"], setupRecord);

  if (state.configFormDirty || state.modelsFormDirty) {
    await saveConfig(state);
  } else if (state.connected && state.client) {
    await saveConfigPatch(state, {
      wizard: {
        setup: setupRecord,
      },
    });
  }

  markSetupWizardCompleted(version);
}

/** 将 wizard.setup（status=skipped）写入 openocta.json；网关未就绪时返回 false */
export async function flushSetupWizardSkipToConfig(state: AppViewState): Promise<boolean> {
  if (!state.connected || !state.client) {
    return false;
  }

  const version = resolveSetupWizardVersion(state.configSchemaVersion, state.hello);
  if (!version) {
    return false;
  }

  // 仅以已落盘的 configSnapshot 判断是否已写入，避免内存中的 configForm 误判为已持久化
  const persistedConfig = state.configSnapshot?.config as Record<string, unknown> | null | undefined;
  const fromPersisted = readSetupWizardConfigState(persistedConfig);
  if (
    fromPersisted &&
    (fromPersisted.status === "completed" || fromPersisted.status === "skipped") &&
    fromPersisted.version === version
  ) {
    clearSetupWizardSkipPendingConfigSync();
    return true;
  }

  const setupRecord = buildSetupWizardSkippedRecord(version);
  if (!state.configSnapshot?.hash) {
    await loadConfig(state);
  }
  if (!state.configSnapshot?.hash) {
    return false;
  }

  await saveConfigPatch(state, {
    wizard: {
      setup: setupRecord,
    },
  });

  if (state.lastError) {
    return false;
  }

  clearSetupWizardSkipPendingConfigSync();
  syncSetupWizardCompletionCache(
    (state.configForm ?? state.configSnapshot?.config) as Record<string, unknown> | null,
  );
  return true;
}

/** 全部跳过：写入 wizard.setup（status=skipped），不保存引导中的未提交配置 */
export async function persistSetupWizardSkipped(state: AppViewState) {
  state.setupWizardSession = {
    ...state.setupWizardSession,
    skippedSteps: [...SETUP_WIZARD_STEPS],
  };
  const version = requireSetupWizardVersion(state);
  const setupRecord = buildSetupWizardSkippedRecord(version);
  updateConfigFormValue(state, ["wizard", "setup"], setupRecord);
  markSetupWizardCompleted(version);

  const persisted = await flushSetupWizardSkipToConfig(state);
  if (!persisted) {
    markSetupWizardSkipPendingConfigSync(version);
  }
}

export function buildSetupWizardProps(state: AppViewState): SetupWizardProps {
  const modelProviders =
    (state.configForm?.models as { providers?: ModelsProps["providers"] })?.providers ??
    (state.configSnapshot?.config as { models?: { providers?: ModelsProps["providers"] } })?.models
      ?.providers ??
    {};
  const defaultModelRef = resolveDefaultModelRef(
    (state.configForm ?? state.configSnapshot?.config) as Record<string, unknown> | null | undefined,
  );
  const config = (state.configForm ?? state.configSnapshot?.config) as Record<string, unknown> | null;

  return {
    active: state.setupWizardActive,
    welcomeVisible: state.setupWizardWelcomeVisible,
    stepIndex: state.setupWizardStepIndex,
    session: state.setupWizardSession,
    basePath: state.basePath ?? "",
    appVersion: resolveSetupWizardVersion(state.configSchemaVersion, state.hello) ?? "---",
    resourceTab: state.setupWizardResourceTab,
    providers: modelProviders,
    modelSearchQuery: state.setupWizardModelSearchQuery,
    modelCategory: state.setupWizardModelCategory,
    enabledProviderKeys: state.setupWizardEnabledProviders,
    defaultModelRef,
    modelsLoading: state.configLoading,
    modelsProps: buildSetupWizardModelsProps(state),
    resourcesLoading: state.setupWizardResourcesLoading,
    resourcesError: state.setupWizardResourcesError,
    skillItems: state.setupWizardSkillItems,
    skillQuery: state.setupWizardSkillQuery,
    skillInstallingFolder: state.setupWizardSkillInstallingFolder,
    employeeItems: state.setupWizardEmployeeItems,
    employeeQuery: state.setupWizardEmployeeQuery,
    employeeInstallingId: state.setupWizardEmployeeInstallingId,
    mcpItems: state.setupWizardMcpItems,
    mcpQuery: state.setupWizardMcpQuery,
    mcpInstallingId: state.setupWizardMcpInstallingId,
    channelIds: [...WIZARD_CHANNEL_IDS],
    channelLabels: WIZARD_CHANNEL_LABELS,
    channelEnabled: (id) => readChannelEnabled(config, id),
    selectedChannelId: state.setupWizardSelectedChannelId,
    configForm: state.configForm,
    configSchema: state.configSchema,
    configUiHints: state.configUiHints,
    configSaving: state.configSaving,
    configFormDirty: state.configFormDirty,
    digitalEmployees: state.digitalEmployees,
    digitalEmployeesLoading: state.digitalEmployeesLoading,
    selectedScenarioId: state.setupWizardSelectedScenarioId,
    scenarioMenuOpenId: state.setupWizardScenarioMenuOpenId,
    scenarioDetailId: state.setupWizardScenarioDetailId,
    scenarioEnvPanelOpen: state.setupWizardScenarioEnvPanelOpen,
    scenarioRunning: state.setupWizardScenarioRunning,
    scenarioRunCompleted: state.setupWizardScenarioRunCompleted,
    scenarioProgress: state.setupWizardScenarioProgress,
    scenarioEnvPrompt: state.setupWizardScenarioEnvPrompt,
    weworkQrModalOpen: state.weworkQrModalOpen,
    weworkQrModalLoading: state.weworkQrModalLoading,
    weworkQrModalPolling: state.weworkQrModalPolling,
    weworkQrModalSuccess: state.weworkQrModalSuccess,
    weworkQrModalError: state.weworkQrModalError,
    weworkQrModalReplaceWarn: state.weworkQrModalReplaceWarn,
    weworkQrModalAuthUrl: state.weworkQrModalAuthUrl,
    weworkQrModalGenPageUrl: state.weworkQrModalGenPageUrl,
    weixinQrModalOpen: state.weixinQrModalOpen,
    weixinQrModalLoading: state.weixinQrModalLoading,
    weixinQrModalPolling: state.weixinQrModalPolling,
    weixinQrModalSuccess: state.weixinQrModalSuccess,
    weixinQrModalError: state.weixinQrModalError,
    weixinQrModalReplaceWarn: state.weixinQrModalReplaceWarn,
    weixinQrModalImageSrc: state.weixinQrModalImageSrc,
    weixinQrModalScanPageUrl: state.weixinQrModalScanPageUrl,
    weixinQrModalScanned: state.weixinQrModalScanned,
    onResourceTabChange: (tab: SetupWizardResourceTab) => {
      state.setupWizardResourceTab = tab;
    },
    onModelSearchChange: (query) => {
      state.setupWizardModelSearchQuery = query;
    },
    onModelCategoryChange: (category: ModelLibraryCategory) => {
      state.setupWizardModelCategory = category;
    },
    onModelProviderToggle: (key, enabled) => handleSetupWizardModelToggle(state, key, enabled),
    onModelBaseUrlChange: (key, baseUrl) => handleSetupWizardModelBaseUrlChange(state, key, baseUrl),
    onModelApiKeyChange: (key, apiKey) => handleSetupWizardModelApiKeyChange(state, key, apiKey),
    onModelConfigure: (key) => handleModelsSelect(state, key),
    onSkillQueryChange: (query) => {
      state.setupWizardSkillQuery = query;
    },
    onEmployeeQueryChange: (query) => {
      state.setupWizardEmployeeQuery = query;
    },
    onMcpQueryChange: (query) => {
      state.setupWizardMcpQuery = query;
    },
    onInstallSkill: (folder, category) => {
      void (async () => {
        state.setupWizardSkillInstallingFolder = folder;
        try {
          await installFromSite(
            { kind: "skill", id: folder, type: category, category },
            {
              gatewayHost: state.settings?.gatewayUrl?.trim(),
              token: state.settings?.token?.trim(),
            },
          );
          state.setupWizardSession = {
            ...state.setupWizardSession,
            skillsInstalled: [...new Set([...state.setupWizardSession.skillsInstalled, folder])],
          };
          await loadSetupWizardResources(state);
        } catch (err) {
          state.setupWizardResourcesError = err instanceof Error ? err.message : String(err);
        } finally {
          state.setupWizardSkillInstallingFolder = null;
        }
      })();
    },
    onInstallEmployee: (id, category) => {
      void (async () => {
        state.setupWizardEmployeeInstallingId = String(id);
        try {
          await installFromSite(
            { kind: "employee", id: String(id), type: category, category },
            {
              gatewayHost: state.settings?.gatewayUrl?.trim(),
              token: state.settings?.token?.trim(),
            },
          );
          state.setupWizardSession = {
            ...state.setupWizardSession,
            employeesInstalled: [...new Set([...state.setupWizardSession.employeesInstalled, String(id)])],
          };
          await loadSetupWizardResources(state);
        } catch (err) {
          state.setupWizardResourcesError = err instanceof Error ? err.message : String(err);
        } finally {
          state.setupWizardEmployeeInstallingId = null;
        }
      })();
    },
    onInstallMcp: (id, category) => {
      void (async () => {
        state.setupWizardMcpInstallingId = String(id);
        try {
          await installFromSite(
            { kind: "mcp", id: String(id), type: category, category },
            {
              gatewayHost: state.settings?.gatewayUrl?.trim(),
              token: state.settings?.token?.trim(),
            },
          );
          state.setupWizardSession = {
            ...state.setupWizardSession,
            mcpsInstalled: [...new Set([...state.setupWizardSession.mcpsInstalled, String(id)])],
          };
          await loadSetupWizardResources(state);
        } catch (err) {
          state.setupWizardResourcesError = err instanceof Error ? err.message : String(err);
        } finally {
          state.setupWizardMcpInstallingId = null;
        }
      })();
    },
    onChannelToggle: (channelId, enabled) => handleSetupWizardChannelToggle(state, channelId, enabled),
    onChannelConfigure: (channelId) => handleSetupWizardChannelConfigure(state, channelId),
    onChannelConfigClose: () => handleSetupWizardChannelConfigure(state, null),
    onChannelConfigPatch: (path, value) => updateConfigFormValue(state, path, value),
    onChannelConfigSave: () => {
      void handleSetupWizardChannelSave(state);
    },
    onChannelConfigReload: () => handleSetupWizardChannelReload(state),
    onWeWorkQrStart: () => {
      void state.handleWeWorkQrStart();
    },
    onWeWorkQrModalClose: () => state.handleWeWorkQrModalClose(),
    onWeixinQrStart: () => {
      void state.handleWeixinQrStart();
    },
    onWeixinQrModalClose: () => state.handleWeixinQrModalClose(),
    onSelectScenario: (id) => handleSetupWizardSelectScenario(state, id),
    onScenarioMenuToggle: (id) => {
      state.setupWizardScenarioMenuOpenId = state.setupWizardScenarioMenuOpenId === id ? null : id;
    },
    onScenarioMenuClose: () => {
      state.setupWizardScenarioMenuOpenId = null;
    },
    onScenarioShowDetail: (id) => {
      state.setupWizardScenarioDetailId = id;
      state.setupWizardScenarioMenuOpenId = null;
    },
    onScenarioDetailClose: () => {
      state.setupWizardScenarioDetailId = null;
    },
    onScenarioShowEnv: (id) => {
      handleSetupWizardSelectScenario(state, id);
      state.setupWizardScenarioEnvPanelOpen = true;
      state.setupWizardScenarioMenuOpenId = null;
    },
    onScenarioEnvClose: () => {
      state.setupWizardScenarioEnvPanelOpen = false;
    },
    onScenarioEnvChange: (name, value) => handleSetupWizardScenarioEnvChange(state, name, value),
    onScenarioEnvSave: () => {
      void handleSetupWizardScenarioEnvSave(state);
    },
    onRunScenarios: () => {
      void setupWizardRunScenarios(state);
    },
    onStopScenarios: () => setupWizardStopScenarios(state),
    onContinueScenarioEnv: () => {
      void setupWizardContinueScenarioEnv(state);
    },
    onSkipStep: () => setupWizardSkipStep(state),
    onSkipAll: () => {
      void state.skipAllSetupWizard();
    },
    onNext: () => setupWizardNext(state),
    onBack: () => setupWizardBack(state),
    onFinish: () => {
      void state.finishSetupWizard();
    },
    onDismissWelcome: () => state.dismissSetupWizardWelcome(),
    browserChromiumSelected: state.setupWizardBrowserChromiumSelected,
    browserReady: state.setupWizardBrowserReady,
    browserInstalling: state.setupWizardBrowserInstalling,
    browserInstallError: state.setupWizardBrowserInstallError,
    browserInstallProgress: state.setupWizardBrowserInstallProgress,
    onBrowserChromiumSelectedChange: (selected) => {
      state.setupWizardBrowserChromiumSelected = selected;
    },
    onBrowserInstallStart: () => {
      void setupWizardStartBrowserInstall(state);
    },
    onBrowserInstallCancel: () => {
      void setupWizardCancelBrowserInstall(state);
    },
    onBrowserInstallRefresh: () => {
      void loadSetupWizardBrowserStatus(state);
    },
  };
}

export function initSetupWizardSession(state: AppViewState) {
  state.setupWizardSession = createEmptySetupWizardSession();
  state.setupWizardStepIndex = 0;
  state.setupWizardResourceTab = "skills";
  state.setupWizardModelSearchQuery = "";
  state.setupWizardModelCategory = "__all__";
  state.setupWizardSkillQuery = "";
  state.setupWizardEmployeeQuery = "";
  state.setupWizardMcpQuery = "";
  state.setupWizardSelectedScenarioId = null;
  state.setupWizardScenarioMenuOpenId = null;
  state.setupWizardScenarioDetailId = null;
  state.setupWizardScenarioEnvPanelOpen = false;
  state.setupWizardSelectedChannelId = null;
  state.setupWizardScenarioProgress = null;
  state.setupWizardScenarioRunning = false;
  state.setupWizardScenarioCancelRequested = false;
  state.setupWizardScenarioRunCompleted = false;
  rejectScenarioEnvPrompt(state);
  seedSetupWizardEnabledProviders(state);
  syncSetupWizardChannelsSession(state);
  state.setupWizardBrowserChromiumSelected = true;
  state.setupWizardBrowserReady = false;
  state.setupWizardBrowserInstalling = false;
  state.setupWizardBrowserInstallError = null;
  state.setupWizardBrowserInstallProgress = null;
  stopSetupWizardBrowserPoll(state);
  void loadSetupWizardBrowserStatus(state);
}
