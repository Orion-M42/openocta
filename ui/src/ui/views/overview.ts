import { html, nothing } from "lit";
import type { GatewayHelloOk } from "../gateway.ts";
import type { CostUsageSummary, SessionsUsageResult, SkillStatusReport } from "../types.ts";
import { formatAgo, formatDurationMs } from "../format.ts";
import { formatNextRun } from "../presenter.ts";
import { getScenarioTemplate, readInitializedScenarioId, scenarioTaskLabel } from "../scenario-templates.ts";
import { t } from "../strings.js";
import {
  buildAggregatesFromSessions,
  buildPeakErrorHours,
  buildUsageInsightStats,
  formatIsoDate,
  renderOverviewCostBreakdown,
  renderOverviewDailyChart,
  renderOverviewUsageInsights,
  renderOverviewUsageMosaic,
  type CostDailyEntry,
  type UsageSessionEntry,
} from "./overview-usage-widgets.ts";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  skillsReport: SkillStatusReport | null;
  skillsLoading: boolean;
  configSnapshot: Record<string, unknown> | null;
  configLoading: boolean;
  usageLoading: boolean;
  usageError: string | null;
  usageStartDate: string;
  usageEndDate: string;
  usageResult: SessionsUsageResult | null;
  usageCostSummary: CostUsageSummary | null;
  usageChartMode: "tokens" | "cost";
  usageDailyChartMode: "total" | "by-type";
  usageTimeZone: "local" | "utc";
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onRefresh: () => void;
  onChartModeChange: (mode: "tokens" | "cost") => void;
  onDailyChartModeChange: (mode: "total" | "by-type") => void;
  onTimeZoneChange: (zone: "local" | "utc") => void;
};

function applyDatePreset(days: number, props: OverviewProps) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  props.onStartDateChange(formatIsoDate(start));
  props.onEndDateChange(formatIsoDate(end));
}

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as { uptimeMs?: number } | undefined;
  const uptime = formatDurationMs(snapshot?.uptimeMs);
  const tickMs = props.hello?.policy?.tickIntervalMs;
  const tick =
    typeof tickMs === "number" && Number.isFinite(tickMs) && tickMs > 0
      ? formatDurationMs(tickMs)
      : "n/a";

  const sessions = (props.usageResult?.sessions ?? []) as UsageSessionEntry[];
  const totals = props.usageResult?.totals ?? null;
  const aggregates = buildAggregatesFromSessions(sessions, props.usageResult?.aggregates ?? null);
  const costDaily = (props.usageCostSummary?.daily ?? []) as CostDailyEntry[];
  const sessionCount = sessions.length;
  const insightStats = buildUsageInsightStats(sessions, totals, aggregates);
  const errorHours = buildPeakErrorHours(sessions, props.usageTimeZone);
  const hasMissingCost =
    (totals?.missingCostEntries ?? 0) > 0 ||
    (totals
      ? totals.totalTokens > 0 &&
        totals.totalCost === 0 &&
        totals.input + totals.output + totals.cacheRead + totals.cacheWrite > 0
      : false);

  const datePresets = [
    { label: t("usageToday"), days: 1 },
    { label: t("usage7d"), days: 7 },
    { label: t("usage30d"), days: 30 },
  ];

  const skills = props.skillsReport?.skills ?? [];
  const enabledSkillCount = skills.filter((entry) => !entry.disabled && entry.eligible).length;
  const skillCountLabel =
    props.skillsLoading && !props.skillsReport
      ? "…"
      : props.skillsReport
        ? `${enabledSkillCount} / ${skills.length}`
        : "n/a";

  const mcpServers =
    (props.configSnapshot?.mcp as { servers?: Record<string, { enabled?: boolean }> } | undefined)
      ?.servers ?? {};
  const mcpCount = Object.keys(mcpServers).filter((key) => mcpServers[key]?.enabled !== false).length;
  const mcpCountLabel =
    props.configLoading && !props.configSnapshot ? "…" : props.configSnapshot ? String(mcpCount) : "n/a";

  const scenarioId = readInitializedScenarioId(props.configSnapshot);
  const scenario = scenarioId ? getScenarioTemplate(scenarioId) : undefined;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div>
          <div class="card-title" style="margin: 0;">${t("overviewPlatformStatus")}</div>
          <div class="card-sub">${t("overviewPlatformStatusSub")}</div>
        </div>
        <button class="btn" ?disabled=${props.usageLoading} @click=${() => props.onRefresh()}>
          ${props.usageLoading ? t("commonRefreshing") : t("commonRefresh")}
        </button>
      </div>
      <div class="stat-grid" style="margin-top: 14px;">
        <div class="stat">
          <div class="stat-label">${t("overviewStatus")}</div>
          <div class="stat-value ${props.connected ? "ok" : "warn"}">
            ${props.connected ? t("overviewConnected") : t("overviewDisconnected")}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewUptime")}</div>
          <div class="stat-value">${uptime}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewTickInterval")}</div>
          <div class="stat-value">${tick}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewInstances")}</div>
          <div class="stat-value">${props.presenceCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewSessions")}</div>
          <div class="stat-value">${props.sessionsCount ?? "n/a"}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewCron")}</div>
          <div class="stat-value">
            ${props.cronEnabled == null ? "n/a" : props.cronEnabled ? t("overviewCronEnabled") : t("overviewCronDisabled")}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewLastChannelsRefresh")}</div>
          <div class="stat-value">
            ${props.lastChannelsRefresh ? formatAgo(props.lastChannelsRefresh) : "n/a"}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewCronNext")}</div>
          <div class="stat-value">${formatNextRun(props.cronNext)}</div>
        </div>
      </div>
      ${
        props.lastError
          ? html`<div class="callout danger" style="margin-top: 14px;"><div>${props.lastError}</div></div>`
          : nothing
      }
    </section>

    <section class="card" style="margin-top: 16px;">
      <div class="card-title">${t("overviewResources")}</div>
      <div class="card-sub">${t("overviewResourcesSub")}</div>
      <div class="stat-grid" style="margin-top: 14px;">
        <div class="stat">
          <div class="stat-label">${t("overviewSkillsInstalled")}</div>
          <div class="stat-value">${skillCountLabel}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewMcpServers")}</div>
          <div class="stat-value">${mcpCountLabel}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("overviewScenario")}</div>
          <div class="stat-value">${scenario?.name ?? t("overviewScenarioNone")}</div>
        </div>
      </div>
      ${
        scenario
          ? html`
              <div class="note-grid" style="margin-top: 14px;">
                <div>
                  <div class="note-title">${scenario.name}</div>
                  <div class="muted">${scenario.summary}</div>
                </div>
                <div>
                  <div class="note-title">${t("overviewScenarioTasks")}</div>
                  <ul class="muted" style="margin: 6px 0 0; padding-left: 18px;">
                    ${scenario.tasks.map(
                      (task) => html`<li>${scenarioTaskLabel(task)}</li>`,
                    )}
                  </ul>
                </div>
              </div>
            `
          : html`
              <div class="callout" style="margin-top: 14px;">
                ${t("overviewScenarioNone")}
              </div>
            `
      }
    </section>

    <section class="card" style="margin-top: 16px;">
      <div class="row" style="justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div>
          <div class="card-title" style="margin: 0;">${t("overviewLlmUsage")}</div>
          <div class="card-sub">${t("overviewLlmUsageSub")}</div>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          <div class="usage-presets">
            ${datePresets.map(
              (preset) => html`
                <button class="btn small" @click=${() => applyDatePreset(preset.days, props)}>
                  ${preset.label}
                </button>
              `,
            )}
          </div>
          <span class="date"><input
            type="date"
            .value=${props.usageStartDate}
            @change=${(e: Event) =>
              props.onStartDateChange((e.target as HTMLInputElement).value)}
          /></span>
          <span class="muted">—</span>
          <span class="date"><input
            type="date"
            .value=${props.usageEndDate}
            @change=${(e: Event) => props.onEndDateChange((e.target as HTMLInputElement).value)}
          /></span>
          <div class="chart-toggle small sessions-toggle">
            <button
              class="toggle-btn ${props.usageChartMode === "tokens" ? "active" : ""}"
              @click=${() => props.onChartModeChange("tokens")}
            >
              ${t("usageTokensUnit")}
            </button>
            <button
              class="toggle-btn ${props.usageChartMode === "cost" ? "active" : ""}"
              @click=${() => props.onChartModeChange("cost")}
            >
              ${t("usageCost")}
            </button>
          </div>
          <select
            class="usage-select"
            .value=${props.usageTimeZone}
            @change=${(e: Event) =>
              props.onTimeZoneChange((e.target as HTMLSelectElement).value as "local" | "utc")}
          >
            <option value="local">${t("usageTimeZoneLocal")}</option>
            <option value="utc">${t("usageTimeZoneUtc")}</option>
          </select>
        </div>
      </div>
      ${
        props.usageLoading && !totals
          ? html`<div class="muted" style="margin-top: 14px; padding: 12px;">${t("usageLoading")}</div>`
          : nothing
      }
      ${
        props.usageError
          ? html`<div class="callout danger" style="margin-top: 14px;">${props.usageError}</div>`
          : nothing
      }
      ${
        sessionCount >= 1000
          ? html`
              <div class="callout warning" style="margin-top: 14px">
                ${t("overviewUsageLimitHint")}
              </div>
            `
          : nothing
      }
    </section>

    ${renderOverviewUsageInsights(
      totals,
      aggregates,
      insightStats,
      hasMissingCost,
      errorHours,
      sessionCount,
      sessionCount,
    )}

    <div class="usage-grid" style="margin-top: 16px;">
      <div class="usage-grid-left">
        <div class="card usage-left-card">
          ${renderOverviewDailyChart(
            costDaily,
            props.usageChartMode,
            props.usageDailyChartMode,
            props.onDailyChartModeChange,
          )}
          ${totals ? renderOverviewCostBreakdown(totals, props.usageChartMode) : nothing}
        </div>
      </div>
      <div class="usage-grid-right">
        ${renderOverviewUsageMosaic(sessions, props.usageTimeZone)}
      </div>
    </div>
  `;
}
