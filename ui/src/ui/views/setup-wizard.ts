import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../icons.js";
import { SCENARIO_TEMPLATES, getScenarioTemplate, scenarioTaskLabel } from "../scenario-templates.ts";
import {
  SETUP_WIZARD_STEPS,
  setupWizardStepDescription,
  setupWizardStepLabel,
  setupWizardStepSubtitle,
  type SetupWizardResourceTab,
  type SetupWizardScenarioRunRecord,
  type SetupWizardScenarioEnvPrompt,
  type SetupWizardSession,
  type SetupWizardStepId,
} from "../setup-wizard.ts";
import type { EmployeeListItem } from "../controllers/remote-market.ts";
import type { McpListItem } from "../controllers/remote-market.ts";
import type { SkillListItem } from "../controllers/remote-market.ts";
import type { ConfigUiHints } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { renderWeWorkQrModal } from "./channels.wework.ts";
import { renderWeixinQrModal } from "./channels.weixin.ts";
import {
  getWizardModelLibraryEntries,
  type ModelLibraryCategory,
  type ModelLibraryProviderEntry,
} from "./model-library.ts";
import { getModelsForProvider, renderModelsOverlays, type ModelsProps, type ModelProvider } from "./models.ts";
import { resolveModelProviderLogo } from "./model-provider-logos.js";

export type SetupWizardProps = {
  active: boolean;
  welcomeVisible: boolean;
  stepIndex: number;
  session: SetupWizardSession;
  basePath: string;
  appVersion: string;
  resourceTab: SetupWizardResourceTab;
  providers: Record<string, ModelProvider>;
  modelSearchQuery: string;
  modelCategory: ModelLibraryCategory;
  enabledProviderKeys: Set<string>;
  defaultModelRef: string | null;
  modelsLoading: boolean;
  modelsProps: ModelsProps;
  resourcesLoading: boolean;
  resourcesError: string | null;
  skillItems: SkillListItem[];
  skillQuery: string;
  skillInstallingFolder: string | null;
  employeeItems: EmployeeListItem[];
  employeeQuery: string;
  employeeInstallingId: string | null;
  mcpItems: McpListItem[];
  mcpQuery: string;
  mcpInstallingId: string | null;
  channelIds: string[];
  channelLabels: Record<string, string>;
  channelEnabled: (id: string) => boolean;
  selectedChannelId: string | null;
  configForm: Record<string, unknown> | null;
  configSchema: unknown;
  configUiHints: ConfigUiHints;
  configSaving: boolean;
  configFormDirty: boolean;
  digitalEmployees: Array<{
    id: string;
    name?: string;
    enabled?: boolean;
    builtin?: boolean;
    from?: string;
    type?: string;
  }>;
  digitalEmployeesLoading: boolean;
  selectedScenarioId: string | null;
  scenarioMenuOpenId: string | null;
  scenarioDetailId: string | null;
  scenarioEnvPanelOpen: boolean;
  scenarioRunning: boolean;
  scenarioRunCompleted: boolean;
  scenarioProgress: SetupWizardScenarioRunRecord | null;
  scenarioEnvPrompt: SetupWizardScenarioEnvPrompt | null;
  weworkQrModalOpen: boolean;
  weworkQrModalLoading: boolean;
  weworkQrModalPolling: boolean;
  weworkQrModalSuccess: boolean;
  weworkQrModalError: string | null;
  weworkQrModalReplaceWarn: boolean;
  weworkQrModalAuthUrl: string | null;
  weworkQrModalGenPageUrl: string | null;
  weixinQrModalOpen: boolean;
  weixinQrModalLoading: boolean;
  weixinQrModalPolling: boolean;
  weixinQrModalSuccess: boolean;
  weixinQrModalError: string | null;
  weixinQrModalReplaceWarn: boolean;
  weixinQrModalImageSrc: string | null;
  weixinQrModalScanPageUrl: string | null;
  weixinQrModalScanned: boolean;
  onResourceTabChange: (tab: SetupWizardResourceTab) => void;
  onModelSearchChange: (query: string) => void;
  onModelCategoryChange: (category: ModelLibraryCategory) => void;
  onModelProviderToggle: (key: string, enabled: boolean) => void;
  onModelBaseUrlChange: (key: string, baseUrl: string) => void;
  onModelApiKeyChange: (key: string, apiKey: string) => void;
  onModelConfigure: (key: string) => void;
  onSkillQueryChange: (query: string) => void;
  onEmployeeQueryChange: (query: string) => void;
  onMcpQueryChange: (query: string) => void;
  onInstallSkill: (folder: string, category?: string) => void;
  onInstallEmployee: (id: number | string, category?: string) => void;
  onInstallMcp: (id: number | string, category?: string) => void;
  onChannelToggle: (channelId: string, enabled: boolean) => void;
  onChannelConfigure: (channelId: string) => void;
  onChannelConfigClose: () => void;
  onChannelConfigPatch: (path: Array<string | number>, value: unknown) => void;
  onChannelConfigSave: () => void;
  onChannelConfigReload: () => void;
  onSelectScenario: (id: string) => void;
  onScenarioMenuToggle: (id: string) => void;
  onScenarioMenuClose: () => void;
  onScenarioShowDetail: (id: string) => void;
  onScenarioDetailClose: () => void;
  onScenarioShowEnv: (id: string) => void;
  onScenarioEnvClose: () => void;
  onScenarioEnvChange: (name: string, value: string) => void;
  onScenarioEnvSave: () => void;
  onRunScenarios: () => void;
  onStopScenarios: () => void;
  onContinueScenarioEnv: () => void;
  onWeWorkQrStart: () => void;
  onWeWorkQrModalClose: () => void;
  onWeixinQrStart: () => void;
  onWeixinQrModalClose: () => void;
  onSkipStep: () => void;
  onSkipAll: () => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
  onDismissWelcome: () => void;
  browserChromiumSelected: boolean;
  browserReady: boolean;
  browserInstalling: boolean;
  browserInstallError: string | null;
  browserInstallProgress: { phase?: string; percent?: number; message?: string } | null;
  onBrowserChromiumSelectedChange: (selected: boolean) => void;
  onBrowserInstallStart: () => void;
  onBrowserInstallCancel: () => void;
  onBrowserInstallRefresh: () => void;
};

function stepAt(index: number): SetupWizardStepId {
  return SETUP_WIZARD_STEPS[Math.min(Math.max(0, index), SETUP_WIZARD_STEPS.length - 1)]!;
}

function filterByQuery(text: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

function renderWizardSearch(
  placeholder: string,
  value: string,
  onChange: (query: string) => void,
  disabled = false,
) {
  return html`
    <div class="emp-search setup-wizard__search">
      <span class="input"
        ><input
          class="emp-search__input setup-wizard__search-input"
          type="text"
          placeholder=${placeholder}
          .value=${value}
          ?disabled=${disabled}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
      /></span>
      <span class="emp-search__icon setup-wizard__search-icon" aria-hidden="true">${icons.search}</span>
    </div>
  `;
}

function buildWizardChannelProps(props: SetupWizardProps, channelId: string): ChannelsProps {
  return {
    connected: true,
    loading: false,
    snapshot: null,
    lastError: null,
    lastSuccessAt: null,
    digitalEmployees: props.digitalEmployees,
    digitalEmployeesLoading: props.digitalEmployeesLoading,
    whatsappMessage: null,
    whatsappQrDataUrl: null,
    whatsappConnected: null,
    whatsappBusy: false,
    weworkQrModalOpen: props.weworkQrModalOpen,
    weworkQrModalLoading: props.weworkQrModalLoading,
    weworkQrModalPolling: props.weworkQrModalPolling,
    weworkQrModalSuccess: props.weworkQrModalSuccess,
    weworkQrModalError: props.weworkQrModalError,
    weworkQrModalReplaceWarn: props.weworkQrModalReplaceWarn,
    weworkQrModalAuthUrl: props.weworkQrModalAuthUrl,
    weworkQrModalGenPageUrl: props.weworkQrModalGenPageUrl,
    weixinQrModalOpen: props.weixinQrModalOpen,
    weixinQrModalLoading: props.weixinQrModalLoading,
    weixinQrModalPolling: props.weixinQrModalPolling,
    weixinQrModalSuccess: props.weixinQrModalSuccess,
    weixinQrModalError: props.weixinQrModalError,
    weixinQrModalReplaceWarn: props.weixinQrModalReplaceWarn,
    weixinQrModalImageSrc: props.weixinQrModalImageSrc,
    weixinQrModalScanPageUrl: props.weixinQrModalScanPageUrl,
    weixinQrModalScanned: props.weixinQrModalScanned,
    configSchema: props.configSchema,
    configSchemaLoading: false,
    configForm: props.configForm,
    configUiHints: props.configUiHints,
    configSaving: props.configSaving,
    configFormDirty: props.configFormDirty,
    selectedChannelId: channelId,
    nostrProfileFormState: null,
    nostrProfileAccountId: null,
    onRefresh: () => undefined,
    onChannelSelect: () => props.onChannelConfigClose(),
    onWhatsAppStart: () => undefined,
    onWhatsAppWait: () => undefined,
    onWhatsAppLogout: () => undefined,
    onWeWorkQrStart: props.onWeWorkQrStart,
    onWeWorkQrModalClose: props.onWeWorkQrModalClose,
    onWeixinQrStart: props.onWeixinQrStart,
    onWeixinQrModalClose: props.onWeixinQrModalClose,
    onConfigPatch: props.onChannelConfigPatch,
    onConfigSave: props.onChannelConfigSave,
    onConfigReload: props.onChannelConfigReload,
    onNostrProfileEdit: () => undefined,
    onNostrProfileCancel: () => undefined,
    onNostrProfileFieldChange: () => undefined,
    onNostrProfileSave: () => undefined,
    onNostrProfileImport: () => undefined,
    onNostrProfileToggleAdvanced: () => undefined,
  };
}

function renderWizardBrand(props: SetupWizardProps) {
  const logoSrc = props.basePath ? `${props.basePath}/logo_h.png` : "/logo_h.png";
  return html`
    <div class="setup-wizard__brand-row">
      <div class="setup-wizard__brand">
        <img class="setup-wizard__brand-logo" src=${logoSrc} alt="OpenOcta" />
        <span class="setup-wizard__brand-version">OpenOcta ${props.appVersion}</span>
      </div>
      <button
        type="button"
        class="setup-wizard__skip-all"
        ?disabled=${props.scenarioRunning}
        @click=${props.onSkipAll}
      >
        全部跳过
      </button>
    </div>
  `;
}

function renderStepper(stepIndex: number) {
  return html`
    <nav class="setup-wizard__stepper" aria-label="引导步骤">
      <ol class="setup-wizard__steps">
        ${SETUP_WIZARD_STEPS.map((step, i) => {
          const active = i === stepIndex;
          const done = i < stepIndex;
          return html`
            <li class="setup-wizard__step-item ${active ? "active" : ""} ${done ? "done" : ""}">
              <div class="setup-wizard__step-node">
                <span class="setup-wizard__step-badge" aria-hidden="true">${i + 1}</span>
                <div class="setup-wizard__step-copy">
                  <span class="setup-wizard__step-title">${setupWizardStepLabel(step)}</span>
                  <span class="setup-wizard__step-sub">${setupWizardStepSubtitle(step)}</span>
                </div>
              </div>
            </li>
          `;
        })}
      </ol>
    </nav>
  `;
}

function renderWizardHeader(props: SetupWizardProps, step: SetupWizardStepId, stepIndex: number) {
  return html`
    ${renderWizardBrand(props)}
    ${renderStepper(stepIndex)}
    <div class="setup-wizard__section-head">
      <h2 id="setup-wizard-title" class="setup-wizard__section-title">${setupWizardStepLabel(step)}</h2>
      <p class="setup-wizard__desc">${setupWizardStepDescription(step)}</p>
    </div>
  `;
}

function renderSwitch(checked: boolean, onChange: (next: boolean) => void, label: string) {
  return html`
    <label class="switch ${checked ? "is-checked" : ""}" @click=${(e: Event) => e.stopPropagation()}>
      <span class="sr-only">${label}</span>
      <input
        class="switch__input"
        type="checkbox"
        .checked=${checked}
        @change=${(e: Event) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span class="switch__core" aria-hidden="true"></span>
    </label>
  `;
}

function renderEnvironmentStep(props: SetupWizardProps) {
  const progress = props.browserInstallProgress;
  const percent = Math.min(100, Math.max(0, progress?.percent ?? 0));
  const statusLabel = props.browserReady
    ? "已安装"
    : props.browserInstalling
      ? "安装中"
      : "未安装";

  return html`
    <div class="setup-wizard__section setup-wizard__environment">
      <div class="setup-wizard__env-list">
        <label class="setup-wizard__env-card ${props.browserChromiumSelected ? "is-selected" : ""}">
          <input
            type="checkbox"
            class="setup-wizard__env-check"
            .checked=${props.browserChromiumSelected}
            ?disabled=${props.browserInstalling}
            @change=${(e: Event) =>
              props.onBrowserChromiumSelectedChange((e.target as HTMLInputElement).checked)}
          />
          <div class="setup-wizard__env-card-body">
            <div class="setup-wizard__env-card-title">
              <span class="setup-wizard__env-icon" aria-hidden="true">${icons.globe}</span>
              <span>Chromium 浏览器</span>
              <span class="setup-wizard__env-badge setup-wizard__env-badge--${props.browserReady ? "ok" : "pending"}">${statusLabel}</span>
            </div>
            <p class="setup-wizard__env-card-desc">
              Agent 内置 <code>browser</code> 工具依赖 Chromium，将下载到本机状态目录（约 150MB）。本地部署使用有头窗口，远程服务使用无头模式并在页面预览。
              通过 Rod 从 Google / NPM 镜像竞速下载 Chromium；无外网环境请手动放置 Chromium 或跳过此步骤。
            </p>
            ${props.browserInstallError
              ? html`<p class="setup-wizard__env-error">${props.browserInstallError}</p>`
              : nothing}
            ${props.browserInstalling || (progress?.message && !props.browserReady)
              ? html`
                  <div class="setup-wizard__env-progress" role="progressbar" aria-valuenow=${percent} aria-valuemin="0" aria-valuemax="100">
                    <div class="setup-wizard__env-progress-bar" style="width: ${percent}%"></div>
                  </div>
                  <p class="setup-wizard__hint">${progress?.message ?? "正在安装…"}</p>
                `
              : nothing}
          </div>
        </label>
      </div>
      <div class="setup-wizard__env-actions">
        <button
          type="button"
          class="btn setup-wizard__btn-primary"
          ?disabled=${!props.browserChromiumSelected || props.browserInstalling || props.browserReady}
          @click=${props.onBrowserInstallStart}
        >
          ${props.browserReady ? "已就绪" : props.browserInstalling ? "安装中…" : "开始初始化"}
        </button>
        ${props.browserInstalling
          ? html`
              <button
                type="button"
                class="btn setup-wizard__btn-stop"
                @click=${props.onBrowserInstallCancel}
              >
                取消安装
              </button>
            `
          : nothing}
        <button
          type="button"
          class="btn"
          ?disabled=${props.browserInstalling}
          @click=${props.onBrowserInstallRefresh}
        >
          刷新状态
        </button>
      </div>
    </div>
  `;
}

function renderModelStep(props: SetupWizardProps) {
  const entries = getWizardModelLibraryEntries(
    props.providers,
    props.modelSearchQuery,
    props.defaultModelRef,
  ).filter(
    (entry) => props.modelCategory === "__all__" || entry.category === props.modelCategory,
  );

  return html`
    <div class="setup-wizard__section">
      <div class="setup-wizard__toolbar setup-wizard__toolbar--models">
        <select
          class="setup-wizard__select"
          .value=${props.modelCategory}
          ?disabled=${props.modelsLoading}
          @change=${(e: Event) =>
            props.onModelCategoryChange((e.target as HTMLSelectElement).value as ModelLibraryCategory)}
        >
          <option value="__all__">全部模型</option>
          <option value="public">公有模型</option>
          <option value="local">本地模型</option>
        </select>
        ${renderWizardSearch("搜索", props.modelSearchQuery, props.onModelSearchChange, props.modelsLoading)}
        <button
          type="button"
          class="btn setup-wizard__btn-primary"
          ?disabled=${props.modelsLoading}
          @click=${props.modelsProps.onAddProvider}
        >
          添加厂商
        </button>
      </div>
      ${props.modelsLoading
        ? html`<p class="setup-wizard__hint">加载模型配置中…</p>`
        : entries.length === 0
          ? html`<p class="setup-wizard__empty">暂无匹配的模型，请添加或调整搜索。</p>`
          : html`
              <div class="setup-wizard__model-grid">
                ${entries.map((entry: ModelLibraryProviderEntry) => {
                  const logoUrl = resolveModelProviderLogo(
                    entry.key,
                    entry.displayName,
                    entry.baseUrl,
                    entry.builtin,
                  );
                  const enabled = props.enabledProviderKeys.has(entry.key);
                  const displayUrl =
                    entry.baseUrl && entry.baseUrl !== "(官方)" ? entry.baseUrl : "";
                  const apiKey = props.providers[entry.key]?.apiKey ?? "";
                  const models = getModelsForProvider(entry.key, props.providers[entry.key]);
                  return html`
                    <div class="setup-wizard__model-card ${enabled ? "is-enabled" : ""}">
                      <div class="setup-wizard__model-card-top">
                        <div class="setup-wizard__model-card-brand">
                          ${logoUrl
                            ? html`<img src="${logoUrl}" alt="" class="provider-logo" />`
                            : icons.modelCube}
                          <strong>${entry.displayName}</strong>
                        </div>
                        ${renderSwitch(
                          enabled,
                          (next) => props.onModelProviderToggle(entry.key, next),
                          `启用 ${entry.displayName}`,
                        )}
                      </div>
                      <div class="setup-wizard__model-field">
                        <div class="setup-wizard__model-field-label"><span>Base URL</span></div>
                        <input
                          class="setup-wizard__input"
                          type="text"
                          placeholder="Base URL"
                          .value=${displayUrl}
                          ?disabled=${!enabled}
                          @input=${(e: Event) =>
                            props.onModelBaseUrlChange(
                              entry.key,
                              (e.target as HTMLInputElement).value,
                            )}
                        />
                      </div>
                      <div class="setup-wizard__model-field">
                        <div class="setup-wizard__model-field-label"><span>API Key</span></div>
                        <input
                          class="setup-wizard__input"
                          type="password"
                          placeholder="sk-... 或 $ENV_VAR"
                          .value=${apiKey}
                          ?disabled=${!enabled}
                          @input=${(e: Event) =>
                            props.onModelApiKeyChange(entry.key, (e.target as HTMLInputElement).value)}
                        />
                      </div>
                      <div class="setup-wizard__model-card-actions">
                        <button
                          type="button"
                          class="setup-wizard__link-btn"
                          ?disabled=${!enabled}
                          @click=${() => props.onModelConfigure(entry.key)}
                        >
                          配置模型
                        </button>
                        ${entry.isDefault
                          ? html`<span class="setup-wizard__model-tag">默认模型</span>`
                          : enabled && models.length > 0
                            ? html`
                                <button
                                  type="button"
                                  class="setup-wizard__link-btn"
                                  @click=${() => props.modelsProps.onUseModelClick(entry.key)}
                                >
                                  设为默认
                                </button>
                              `
                            : nothing}
                        ${enabled
                          ? html`
                              <span class="setup-wizard__model-count">${models.length} 个模型</span>
                            `
                          : nothing}
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}
    </div>
    ${renderModelsOverlays(props.modelsProps)}
  `;
}

const RESOURCE_TABS: { id: SetupWizardResourceTab; label: string }[] = [
  { id: "skills", label: "技能" },
  { id: "employees", label: "数字员工" },
  { id: "mcp", label: "MCP" },
  { id: "channels", label: "IM 通道" },
];

function renderResourceList(
  items: { title: string; sub: string; actionLabel: string; loading: boolean; onInstall: () => void }[],
  empty: string,
) {
  return html`
    <div class="setup-wizard__resource-list">
      ${items.length === 0
        ? html`<p class="setup-wizard__empty">${empty}</p>`
        : items.map(
            (it) => html`
              <div class="setup-wizard__resource-row">
                <div>
                  <strong>${it.title}</strong>
                  <p>${it.sub}</p>
                </div>
                <button
                  type="button"
                  class="btn btn--sm setup-wizard__btn-primary"
                  ?disabled=${it.loading}
                  @click=${it.onInstall}
                >
                  ${it.loading ? "安装中…" : it.actionLabel}
                </button>
              </div>
            `,
          )}
    </div>
  `;
}

function renderResourcesStep(props: SetupWizardProps) {
  const tab = props.resourceTab;
  const hasCachedItems =
    props.skillItems.length > 0 || props.employeeItems.length > 0 || props.mcpItems.length > 0;
  const showInitialLoading = props.resourcesLoading && !hasCachedItems;

  let tabBody: TemplateResult | typeof nothing = nothing;
  if (tab === "skills") {
    tabBody = renderSkillTab(props);
  } else if (tab === "employees") {
    tabBody = renderEmployeeTab(props);
  } else if (tab === "mcp") {
    tabBody = renderMcpTab(props);
  } else {
    tabBody = renderChannelsTab(props);
  }

  return html`
    <div class="setup-wizard__section">
      <p class="setup-wizard__hint setup-wizard__hint--inline">
        资源列表来自 openocta.com 官网，安装后将写入 openocta.json。
      </p>
      <div class="setup-wizard__tabs" role="tablist">
        ${RESOURCE_TABS.map((t) => html`
          <button
            type="button"
            role="tab"
            class="setup-wizard__tab ${tab === t.id ? "active" : ""}"
            aria-selected=${tab === t.id ? "true" : "false"}
            @click=${() => props.onResourceTabChange(t.id)}
          >
            ${t.label}
          </button>
        `)}
      </div>
      ${props.resourcesError
        ? html`<p class="setup-wizard__error">${props.resourcesError}</p>`
        : nothing}
      ${showInitialLoading
        ? html`<p class="setup-wizard__hint">从 openocta.com 加载资源列表…</p>`
        : tabBody}
      ${props.resourcesLoading && hasCachedItems
        ? html`<p class="setup-wizard__hint setup-wizard__hint--inline">正在刷新资源列表…</p>`
        : nothing}
    </div>
    ${renderWizardChannelPanel(props)}
    ${renderWeWorkQrModal(buildWizardChannelProps(props, "wework"))}
    ${renderWeixinQrModal(buildWizardChannelProps(props, "weixin"))}
  `;
}

function renderSkillTab(props: SetupWizardProps) {
  const items = props.skillItems
    .filter((it) => filterByQuery(`${it.name} ${it.description ?? ""} ${it.folder}`, props.skillQuery))
    .slice(0, 20)
    .map((it) => ({
      title: it.name,
      sub: it.description ?? it.folder,
      actionLabel: it.installed ? "已安装" : "安装",
      loading: props.skillInstallingFolder === it.folder,
      onInstall: () => props.onInstallSkill(it.folder, it.categoryCn),
    }));
  return html`
    <div class="setup-wizard__toolbar">
      ${renderWizardSearch("搜索技能", props.skillQuery, props.onSkillQueryChange)}
    </div>
    ${renderResourceList(items, "暂无匹配技能")}
  `;
}

function renderEmployeeTab(props: SetupWizardProps) {
  const items = props.employeeItems
    .filter((it) => filterByQuery(`${it.name} ${it.description ?? ""}`, props.employeeQuery))
    .slice(0, 20)
    .map((it) => ({
      title: it.name,
      sub: it.description ?? "",
      actionLabel: it.installed ? "已安装" : "安装",
      loading: String(props.employeeInstallingId) === String(it.id),
      onInstall: () => props.onInstallEmployee(it.id, it.category),
    }));
  return html`
    <div class="setup-wizard__toolbar">
      ${renderWizardSearch("搜索数字员工", props.employeeQuery, props.onEmployeeQueryChange)}
    </div>
    ${renderResourceList(items, "暂无匹配数字员工")}
  `;
}

function renderMcpTab(props: SetupWizardProps) {
  const items = props.mcpItems
    .filter((it) => filterByQuery(`${it.name} ${it.description ?? ""}`, props.mcpQuery))
    .slice(0, 20)
    .map((it) => ({
      title: it.name,
      sub: it.description ?? "",
      actionLabel: it.installed ? "已安装" : "安装",
      loading: String(props.mcpInstallingId) === String(it.id),
      onInstall: () => props.onInstallMcp(it.id, it.category),
    }));
  return html`
    <div class="setup-wizard__toolbar">
      ${renderWizardSearch("搜索 MCP 工具", props.mcpQuery, props.onMcpQueryChange)}
    </div>
    ${renderResourceList(items, "暂无匹配 MCP")}
  `;
}

function renderWizardChannelPanel(props: SetupWizardProps) {
  const channelId = props.selectedChannelId;
  if (!channelId) {
    return nothing;
  }
  const label = props.channelLabels[channelId] ?? channelId;
  const channelProps = buildWizardChannelProps(props, channelId);

  return html`
    <div
      class="channel-panel-overlay setup-wizard__overlay"
      @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains("channel-panel-overlay")) {
          props.onChannelConfigClose();
        }
      }}
    >
      <div class="channel-panel card" @click=${(e: Event) => e.stopPropagation()}>
        <div class="channel-panel-header row" style="justify-content: space-between; align-items: center;">
          <div class="card-title">${label} 配置</div>
          <button class="btn btn--icon" type="button" aria-label="关闭" @click=${props.onChannelConfigClose}>
            ${icons.x}
          </button>
        </div>
        <div class="channel-panel-content">
          ${renderChannelConfigSection({ channelId, props: channelProps })}
        </div>
      </div>
    </div>
  `;
}

function renderChannelsTab(props: SetupWizardProps) {
  return html`
    <p class="setup-wizard__hint">开启 IM 通道并配置参数，保存后写入 openocta.json。</p>
    <div class="setup-wizard__channel-grid">
      ${props.channelIds.map((id) => {
        const enabled = props.channelEnabled(id);
        const configured = props.session.channelsConfigured.includes(id);
        const supportsQr = id === "wework" || id === "weixin";
        return html`
          <div class="setup-wizard__channel-card ${enabled ? "is-enabled" : ""}">
            <div class="setup-wizard__channel-card-head">
              <strong>${props.channelLabels[id] ?? id}</strong>
              ${renderSwitch(
                enabled,
                (next) => props.onChannelToggle(id, next),
                `启用 ${props.channelLabels[id] ?? id}`,
              )}
            </div>
            <p class="setup-wizard__channel-status">
              ${enabled ? (configured ? "已配置" : "已启用，待配置") : "未启用"}
            </p>
            <div class="setup-wizard__channel-actions">
              <button
                type="button"
                class="btn btn--sm setup-wizard__btn-primary"
                ?disabled=${!enabled}
                @click=${() => props.onChannelConfigure(id)}
              >
                配置
              </button>
              ${supportsQr
                ? html`
                    <button
                      type="button"
                      class="btn btn--sm setup-wizard__btn-outline"
                      @click=${() => {
                        if (!props.channelEnabled(id)) {
                          props.onChannelToggle(id, true);
                        }
                        if (id === "wework") {
                          props.onWeWorkQrStart();
                        } else {
                          props.onWeixinQrStart();
                        }
                      }}
                    >
                      扫码配置
                    </button>
                  `
                : nothing}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function scenarioTasksFinished(tasks: SetupWizardScenarioRunRecord["tasks"]) {
  return tasks.filter(
    (t) =>
      t.status === "done" ||
      t.status === "skipped" ||
      t.status === "failed",
  ).length;
}

function scenarioTasksFailed(tasks: SetupWizardScenarioRunRecord["tasks"]) {
  return tasks.filter((t) => t.status === "failed");
}

function scenarioEnvTasks(scenarioId: string) {
  const template = getScenarioTemplate(scenarioId);
  if (!template) return [];
  return template.tasks.filter((t) => t.kind === "env");
}

function renderScenarioEnvPrompt(props: SetupWizardProps) {
  const prompt = props.scenarioEnvPrompt;
  if (!prompt) {
    return nothing;
  }
  const value = props.session.scenarioEnvVars[prompt.name] ?? "";
  return html`
    <div class="setup-wizard__env-prompt card">
      <div class="setup-wizard__env-prompt-head">
        <strong>需要配置环境变量</strong>
        <span class="muted">Value 可留空，留空项请稍后在「环境变量」页面补充</span>
      </div>
      ${prompt.description
        ? html`<p class="setup-wizard__hint">${prompt.description}</p>`
        : nothing}
      <p class="setup-wizard__hint setup-wizard__hint--inline">
        点击「继续」后将继续执行初始化；未填写的变量不会写入 openocta.json，可在控制台的「环境变量」中后续配置。
      </p>
      <div class="setup-wizard__env-kv">
        <div class="setup-wizard__env-kv-row">
          <span class="setup-wizard__env-kv-label">Key</span>
          <code class="setup-wizard__env-kv-key">${prompt.name}${prompt.required ? " *" : ""}</code>
        </div>
        <label class="setup-wizard__env-kv-row setup-wizard__env-kv-row--value">
          <span class="setup-wizard__env-kv-label">Value</span>
          <span class="input setup-wizard__env-kv-input">
            <input
              type="text"
              placeholder=${prompt.example ?? "请输入值"}
              .value=${value}
              @input=${(e: Event) =>
                props.onScenarioEnvChange(prompt.name, (e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  props.onContinueScenarioEnv();
                }
              }}
            />
          </span>
        </label>
      </div>
      ${prompt.error ? html`<p class="setup-wizard__env-prompt-error">${prompt.error}</p>` : nothing}
      <button
        type="button"
        class="btn setup-wizard__btn-primary setup-wizard__env-prompt-continue"
        @click=${props.onContinueScenarioEnv}
      >
        继续
      </button>
    </div>
  `;
}

function renderScenarioEnvPanel(props: SetupWizardProps) {
  if (!props.scenarioEnvPanelOpen || !props.selectedScenarioId) {
    return nothing;
  }
  const template = getScenarioTemplate(props.selectedScenarioId);
  if (!template) return nothing;
  const envTasks = scenarioEnvTasks(props.selectedScenarioId);
  return html`
    <div
      class="channel-panel-overlay setup-wizard__overlay setup-wizard__overlay--centered"
      @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains("channel-panel-overlay")) {
          props.onScenarioEnvClose();
        }
      }}
    >
      <div class="channel-panel card setup-wizard__env-panel" @click=${(e: Event) => e.stopPropagation()}>
        <div class="channel-panel-header row" style="justify-content: space-between; align-items: center;">
          <div class="card-title">${template.name} — 环境变量</div>
          <button class="btn btn--icon" type="button" aria-label="关闭" @click=${props.onScenarioEnvClose}>
            ${icons.x}
          </button>
        </div>
        <div class="channel-panel-content">
          <p class="setup-wizard__hint">
            配置后将写入 openocta.json 的 env.vars。Value 可留空，留空项请稍后在「环境变量」页面补充。
          </p>
          ${envTasks.length === 0
            ? html`<p class="setup-wizard__empty">该场景无需环境变量。</p>`
            : html`
                <div class="config-form">
                  ${envTasks.map((task) => {
                    if (task.kind !== "env") return nothing;
                    const name = task.ref.name;
                    return html`
                      <div class="field">
                        <span>${name}${task.ref.required ? " *" : ""}</span>
                        <span class="input"
                          ><input
                            type="text"
                            placeholder=${task.ref.example ?? task.ref.description}
                            .value=${props.session.scenarioEnvVars[name] ?? ""}
                            @input=${(e: Event) =>
                              props.onScenarioEnvChange(name, (e.target as HTMLInputElement).value)}
                        /></span>
                        <div class="muted" style="font-size: 12px; margin-top: 4px;">${task.ref.description}</div>
                      </div>
                    `;
                  })}
                </div>
                <div class="row" style="margin-top: 16px; gap: 8px;">
                  <button class="btn" @click=${props.onScenarioEnvClose}>取消</button>
                  <button class="btn setup-wizard__btn-primary" @click=${props.onScenarioEnvSave}>保存到配置</button>
                </div>
              `}
        </div>
      </div>
    </div>
  `;
}

function renderScenarioDetailModal(props: SetupWizardProps) {
  const id = props.scenarioDetailId;
  if (!id) return nothing;
  const template = getScenarioTemplate(id);
  if (!template) return nothing;
  return html`
    <div
      class="channel-panel-overlay setup-wizard__overlay setup-wizard__overlay--centered"
      @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains("channel-panel-overlay")) {
          props.onScenarioDetailClose();
        }
      }}
    >
      <div class="channel-panel card setup-wizard__detail-panel" @click=${(e: Event) => e.stopPropagation()}>
        <div class="channel-panel-header row" style="justify-content: space-between; align-items: center;">
          <div class="card-title">${template.name}</div>
          <button class="btn btn--icon" type="button" aria-label="关闭" @click=${props.onScenarioDetailClose}>
            ${icons.x}
          </button>
        </div>
        <div class="channel-panel-content">
          <p>${template.summary}</p>
          <h4 style="margin: 16px 0 8px;">初始化内容</h4>
          <ul class="setup-wizard__scenario-meta">
            ${template.tasks.map((task) => html`<li>${scenarioTaskLabel(task)}</li>`)}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function renderScenariosStep(props: SetupWizardProps) {
  const progress = props.scenarioProgress;
  const selected = props.selectedScenarioId;
  return html`
    <div class="setup-wizard__section">
      <p class="setup-wizard__hint">请选择一个场景进行初始化（单选）。</p>
      <div class="setup-wizard__scenario-grid">
        ${SCENARIO_TEMPLATES.map((sc) => {
          const isSelected = selected === sc.id;
          const menuOpen = props.scenarioMenuOpenId === sc.id;
          return html`
            <div
              class="setup-wizard__scenario-card ${isSelected ? "selected" : ""}"
              role="button"
              tabindex="0"
              @click=${() => props.onSelectScenario(sc.id)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onSelectScenario(sc.id);
                }
              }}
            >
              <div class="setup-wizard__scenario-card-head">
                <span class="setup-wizard__scenario-radio ${isSelected ? "checked" : ""}" aria-hidden="true"></span>
                <button
                  type="button"
                  class="setup-wizard__menu-btn"
                  aria-label="更多操作"
                  ?disabled=${props.scenarioRunning}
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    props.onScenarioMenuToggle(sc.id);
                  }}
                >
                  ⋮
                </button>
                ${menuOpen
                  ? html`
                      <div class="setup-wizard__menu" @click=${(e: Event) => e.stopPropagation()}>
                        <button type="button" @click=${() => props.onScenarioShowDetail(sc.id)}>查看详情</button>
                        <button type="button" @click=${() => props.onScenarioShowEnv(sc.id)}>配置环境变量</button>
                        <button
                          type="button"
                          @click=${() => {
                            props.onSelectScenario(sc.id);
                            props.onScenarioMenuClose();
                          }}
                        >
                          选择此场景
                        </button>
                      </div>
                    `
                  : nothing}
              </div>
              <h4>${sc.name}</h4>
              <p>${sc.summary}</p>
              <ul class="setup-wizard__scenario-meta">
                ${sc.tasks.slice(0, 4).map((task) => html`<li>${scenarioTaskLabel(task)}</li>`)}
              </ul>
            </div>
          `;
        })}
      </div>
      ${progress
        ? html`
            <div class="setup-wizard__progress">
              <div class="setup-wizard__progress-head">
                <strong>${progress.name}</strong>
                <span>${scenarioTasksFinished(progress.tasks)} / ${progress.tasks.length}</span>
              </div>
              <div class="setup-wizard__progress-bar" role="progressbar">
                <div
                  class="setup-wizard__progress-fill"
                  style="width: ${(scenarioTasksFinished(progress.tasks) /
                    Math.max(progress.tasks.length, 1)) *
                  100}%"
                ></div>
              </div>
              <ul class="setup-wizard__task-log">
                ${progress.tasks.map(
                  (task) => html`
                    <li class="setup-wizard__task setup-wizard__task--${task.status}">
                      <span>${task.label}</span>
                      ${task.detail ? html`<em>${task.detail}</em>` : nothing}
                    </li>
                  `,
                )}
              </ul>
            </div>
          `
        : nothing}
      ${renderScenarioEnvPrompt(props)}
      ${selected
        ? html`
            <div class="setup-wizard__scenario-actions">
              ${props.scenarioRunning
                ? html`
                    <button type="button" class="btn" disabled>开始初始化</button>
                    <button
                      type="button"
                      class="btn setup-wizard__btn-stop"
                      @click=${props.onStopScenarios}
                    >
                      停止初始化
                    </button>
                  `
                : html`
                    <button
                      type="button"
                      class="btn setup-wizard__btn-primary setup-wizard__run-btn"
                      ?disabled=${props.scenarioRunCompleted}
                      @click=${props.onRunScenarios}
                    >
                      ${props.scenarioRunCompleted ? "已完成初始化" : "开始初始化"}
                    </button>
                  `}
            </div>
          `
        : nothing}
      ${props.scenarioEnvPrompt
        ? html`<p class="setup-wizard__hint setup-wizard__hint--warn">
            初始化已暂停：请配置环境变量 <code>${props.scenarioEnvPrompt.name}</code>，可直接留空并点击继续。
          </p>`
        : props.scenarioRunning
          ? html`<p class="setup-wizard__hint">场景初始化执行中，可随时停止。</p>`
          : nothing}
      ${props.scenarioRunCompleted && progress && scenarioTasksFailed(progress.tasks).length > 0
        ? html`<p class="setup-wizard__hint setup-wizard__hint--warn">
            部分步骤安装失败（${scenarioTasksFailed(progress.tasks).length}
            项），可稍后在「安装资源」页重试；请确认 Gateway 已连接且官网资源可下载。
          </p>`
        : nothing}
    </div>
    ${renderScenarioDetailModal(props)}
    ${renderScenarioEnvPanel(props)}
  `;
}

function renderSummaryValue(items: string[], empty: string) {
  if (items.length === 0) {
    return html`<span class="setup-wizard__summary-empty">${empty}</span>`;
  }
  return html`<span>${items.join("、")}</span>`;
}

function renderSummaryStep(session: SetupWizardSession) {
  const envEntries = Object.entries(session.scenarioEnvVars).filter(([, v]) => v.trim());
  const scenarioRun = session.scenariosRun[0];
  const cards = [
    {
      title: "运行环境",
      value: renderSummaryValue(session.environmentInstalled, "未安装"),
    },
    {
      title: "模型厂商",
      value: renderSummaryValue(session.modelsConfigured, "未配置"),
    },
    {
      title: "默认模型",
      value: session.defaultModelRef
        ? html`<code>${session.defaultModelRef}</code>`
        : html`<span class="setup-wizard__summary-empty">未设置</span>`,
    },
    {
      title: "技能",
      value: renderSummaryValue(session.skillsInstalled, "未安装"),
    },
    {
      title: "数字员工",
      value: renderSummaryValue(session.employeesInstalled, "未安装"),
    },
    {
      title: "MCP",
      value: renderSummaryValue(session.mcpsInstalled, "未安装"),
    },
    {
      title: "IM 通道",
      value: renderSummaryValue(
        session.channelsEnabled.map((id) => id),
        "未启用",
      ),
    },
    {
      title: "场景初始化",
      value: session.selectedScenarioName
        ? html`<span>${session.selectedScenarioName}</span>`
        : html`<span class="setup-wizard__summary-empty">未选择</span>`,
    },
  ];

  return html`
    <div class="setup-wizard__section setup-wizard__summary">
      ${session.skippedSteps.length > 0
        ? html`<p class="setup-wizard__hint">已跳过：${session.skippedSteps.map(setupWizardStepLabel).join("、")}</p>`
        : nothing}
      <div class="setup-wizard__summary-grid">
        ${cards.map(
          (card) => html`
            <div class="setup-wizard__summary-card">
              <div class="setup-wizard__summary-card-title">${card.title}</div>
              <div class="setup-wizard__summary-card-value">${card.value}</div>
            </div>
          `,
        )}
      </div>
      ${envEntries.length > 0
        ? html`
            <div class="setup-wizard__summary-block">
              <h4>场景环境变量</h4>
              <ul class="setup-wizard__summary-kv">
                ${envEntries.map(([k, v]) => html`<li><code>${k}</code> = ${v}</li>`)}
              </ul>
            </div>
          `
        : nothing}
      ${scenarioRun
        ? html`
            <div class="setup-wizard__summary-block">
              <h4>初始化执行结果 — ${scenarioRun.name}</h4>
              <ul class="setup-wizard__task-log">
                ${scenarioRun.tasks.map(
                  (t) => html`
                    <li class="setup-wizard__task setup-wizard__task--${t.status}">
                      <span>${t.label}</span>
                      ${t.detail ? html`<em>${t.detail}</em>` : nothing}
                    </li>
                  `,
                )}
              </ul>
            </div>
          `
        : session.selectedScenarioName
          ? html`
              <div class="setup-wizard__summary-block">
                <h4>场景初始化</h4>
                <p class="setup-wizard__hint">已选择「${session.selectedScenarioName}」，尚未执行初始化。</p>
              </div>
            `
          : nothing}
      <p class="setup-wizard__hint setup-wizard__hint--footer">
        以上配置将保存到 openocta.json，点击「开始使用」进入系统。
      </p>
    </div>
  `;
}

function renderSetupWizardWelcome(props: SetupWizardProps) {
  const logoSrc = props.basePath ? `${props.basePath}/logo_h.png` : "/logo_h.png";
  return html`
    <div
      class="setup-wizard setup-wizard--welcome"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-wizard-welcome-title"
    >
      <div class="setup-wizard__backdrop"></div>
      <div class="setup-wizard__welcome card" @click=${(e: Event) => e.stopPropagation()}>
        <img class="setup-wizard__welcome-logo" src=${logoSrc} alt="OpenOcta" />
        <p class="setup-wizard__welcome-desc">
          引导配置已完成，模型、资源与场景已写入 openocta.json。你现在可以开始使用 OpenOcta
          构建智能体、连接 IM 通道，并在控制台中继续调整配置。
        </p>
        <button
          type="button"
          class="btn setup-wizard__btn-primary setup-wizard__welcome-btn"
          @click=${props.onDismissWelcome}
        >
          进入控制台
        </button>
      </div>
    </div>
  `;
}

export function renderSetupWizard(props: SetupWizardProps) {
  if (props.welcomeVisible && !props.active) {
    return renderSetupWizardWelcome(props);
  }

  if (!props.active) {
    return nothing;
  }

  const stepIndex = Math.min(Math.max(0, props.stepIndex), SETUP_WIZARD_STEPS.length - 1);
  const step = stepAt(stepIndex);
  const isFirst = stepIndex === 0;
  const isLast = step === "summary";

  let body: TemplateResult | typeof nothing = nothing;
  if (step === "environment") {
    body = renderEnvironmentStep(props);
  } else if (step === "models") {
    body = renderModelStep(props);
  } else if (step === "resources") {
    body = renderResourcesStep(props);
  } else if (step === "scenarios") {
    body = renderScenariosStep(props);
  } else {
    body = renderSummaryStep(props.session);
  }

  return html`
    <div
      class="setup-wizard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-wizard-title"
      @click=${() => props.onScenarioMenuClose()}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          props.onSkipStep();
        }
      }}
    >
      <div class="setup-wizard__backdrop"></div>
      <div class="setup-wizard__dialog card" @click=${(e: Event) => e.stopPropagation()}>
        <header class="setup-wizard__header">${renderWizardHeader(props, step, stepIndex)}</header>
        <div class="setup-wizard__body">${body}</div>
        <footer class="setup-wizard__footer">
          ${!isFirst
            ? html`<button type="button" class="btn" ?disabled=${props.scenarioRunning} @click=${props.onBack}>上一步</button>`
            : html`<span></span>`}
          <div class="setup-wizard__footer-right">
            ${!isLast
              ? html`<button type="button" class="btn" ?disabled=${props.scenarioRunning} @click=${props.onSkipStep}>跳过</button>`
              : nothing}
            <button
              type="button"
              class="btn setup-wizard__btn-primary"
              ?disabled=${props.scenarioRunning}
              @click=${isLast ? props.onFinish : props.onNext}
            >
              ${isLast ? "开始使用" : "下一步"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  `;
}
