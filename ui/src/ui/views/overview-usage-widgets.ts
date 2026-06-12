import { html, nothing } from "lit";
import { t } from "../strings.js";

export type UsageSessionEntry = {
  key: string;
  label?: string;
  sessionId?: string;
  updatedAt?: number;
  agentId?: string;
  channel?: string;
  chatType?: string;
  origin?: {
    label?: string;
    provider?: string;
    surface?: string;
    chatType?: string;
    from?: string;
    to?: string;
    accountId?: string;
    threadId?: string | number;
  };
  modelOverride?: string;
  providerOverride?: string;
  modelProvider?: string;
  model?: string;
  usage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    totalCost: number;
    inputCost?: number;
    outputCost?: number;
    cacheReadCost?: number;
    cacheWriteCost?: number;
    missingCostEntries: number;
    firstActivity?: number;
    lastActivity?: number;
    durationMs?: number;
    activityDates?: string[]; // YYYY-MM-DD dates when session had activity
    dailyBreakdown?: Array<{ date: string; tokens: number; cost: number }>; // Per-day breakdown
    dailyMessageCounts?: Array<{
      date: string;
      total: number;
      user: number;
      assistant: number;
      toolCalls: number;
      toolResults: number;
      errors: number;
    }>;
    dailyLatency?: Array<{
      date: string;
      count: number;
      avgMs: number;
      p95Ms: number;
      minMs: number;
      maxMs: number;
    }>;
    dailyModelUsage?: Array<{
      date: string;
      provider?: string;
      model?: string;
      tokens: number;
      cost: number;
      count: number;
    }>;
    messageCounts?: {
      total: number;
      user: number;
      assistant: number;
      toolCalls: number;
      toolResults: number;
      errors: number;
    };
    toolUsage?: {
      totalCalls: number;
      uniqueTools: number;
      tools: Array<{ name: string; count: number }>;
    };
    modelUsage?: Array<{
      provider?: string;
      model?: string;
      count: number;
      totals: UsageTotals;
    }>;
    latency?: {
      count: number;
      avgMs: number;
      p95Ms: number;
      minMs: number;
      maxMs: number;
    };
  } | null;
  contextWeight?: {
    systemPrompt: { chars: number; projectContextChars: number; nonProjectContextChars: number };
    skills: { promptChars: number; entries: Array<{ name: string; blockChars: number }> };
    tools: {
      listChars: number;
      schemaChars: number;
      entries: Array<{ name: string; summaryChars: number; schemaChars: number }>;
    };
    injectedWorkspaceFiles: Array<{
      name: string;
      path: string;
      rawChars: number;
      injectedChars: number;
      truncated: boolean;
    }>;
  } | null;
};

export type UsageTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  missingCostEntries: number;
};

export type CostDailyEntry = UsageTotals & { date: string };

export type UsageAggregates = {
  messages: {
    total: number;
    user: number;
    assistant: number;
    toolCalls: number;
    toolResults: number;
    errors: number;
  };
  tools: {
    totalCalls: number;
    uniqueTools: number;
    tools: Array<{ name: string; count: number }>;
  };
  byModel: Array<{
    provider?: string;
    model?: string;
    count: number;
    totals: UsageTotals;
  }>;
  byProvider: Array<{
    provider?: string;
    model?: string;
    count: number;
    totals: UsageTotals;
  }>;
  byAgent: Array<{ agentId: string; totals: UsageTotals }>;
  byChannel: Array<{ channel: string; totals: UsageTotals }>;
  latency?: {
    count: number;
    avgMs: number;
    p95Ms: number;
    minMs: number;
    maxMs: number;
  };
  dailyLatency?: Array<{
    date: string;
    count: number;
    avgMs: number;
    p95Ms: number;
    minMs: number;
    maxMs: number;
  }>;
  modelDaily?: Array<{
    date: string;
    provider?: string;
    model?: string;
    tokens: number;
    cost: number;
    count: number;
  }>;
  daily: Array<{
    date: string;
    tokens: number;
    cost: number;
    messages: number;
    toolCalls: number;
    errors: number;
  }>;
};

// ~4 chars per token is a rough approximation
const CHARS_PER_TOKEN = 4;

function charsToTokens(chars: number): number {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(n);
}

function formatCost(n: number, decimals = 2): string {
  return `$${n.toFixed(decimals)}`;
}

export function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDurationShort(ms?: number): string {
  if (!ms || ms <= 0) {
    return "0s";
  }
  if (ms >= 60_000) {
    return `${Math.round(ms / 60000)}m`;
  }
  if (ms >= 1000) {
    return `${Math.round(ms / 1000)}s`;
  }
  return `${Math.round(ms)}ms`;
}

function parseYmdDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    return null;
  }
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDayLabel(dateStr: string): string {
  const date = parseYmdDate(dateStr);
  if (!date) {
    return dateStr;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  const date = parseYmdDate(dateStr);
  if (!date) {
    return dateStr;
  }
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

function formatMoreSessionsLabel(count: number): string {
  return getLocale() === "zh" ? `还有 ${count} 项` : `${count} ${t("usageMoreSessions")}`;
}

export function buildPeakErrorHours(sessions: UsageSessionEntry[], timeZone: "local" | "utc") {
  const hourErrors = Array.from({ length: 24 }, () => 0);
  const hourMsgs = Array.from({ length: 24 }, () => 0);

  for (const session of sessions) {
    const usage = session.usage;
    if (!usage?.messageCounts || usage.messageCounts.total === 0) {
      continue;
    }
    const start = usage.firstActivity ?? session.updatedAt;
    const end = usage.lastActivity ?? session.updatedAt;
    if (!start || !end) {
      continue;
    }
    const startMs = Math.min(start, end);
    const endMs = Math.max(start, end);
    const durationMs = Math.max(endMs - startMs, 1);
    const totalMinutes = durationMs / 60000;

    let cursor = startMs;
    while (cursor < endMs) {
      const date = new Date(cursor);
      const hour = getZonedHour(date, timeZone);
      const nextHour = setToHourEnd(date, timeZone);
      const nextMs = Math.min(nextHour.getTime(), endMs);
      const minutes = Math.max((nextMs - cursor) / 60000, 0);
      const share = minutes / totalMinutes;
      hourErrors[hour] += usage.messageCounts.errors * share;
      hourMsgs[hour] += usage.messageCounts.total * share;
      cursor = nextMs + 1;
    }
  }

  return hourMsgs
    .map((msgs, hour) => {
      const errors = hourErrors[hour];
      const rate = msgs > 0 ? errors / msgs : 0;
      return {
        hour,
        rate,
        errors,
        msgs,
      };
    })
    .filter((entry) => entry.msgs > 0 && entry.errors > 0)
    .toSorted((a, b) => b.rate - a.rate)
    .slice(0, 5)
    .map((entry) => ({
      label: formatHourLabel(entry.hour),
      value: `${(entry.rate * 100).toFixed(2)}%`,
      sub: `${Math.round(entry.errors)} ${t("usageErrors").toLowerCase()} · ${Math.round(entry.msgs)} ${t("usageMessagesCount")}`,
    }));
}

type UsageMosaicStats = {
  hasData: boolean;
  totalTokens: number;
  hourTotals: number[];
  weekdayTotals: Array<{ label: string; tokens: number }>;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getZonedHour(date: Date, zone: "local" | "utc"): number {
  return zone === "utc" ? date.getUTCHours() : date.getHours();
}

function getZonedWeekday(date: Date, zone: "local" | "utc"): number {
  return zone === "utc" ? date.getUTCDay() : date.getDay();
}

function setToHourEnd(date: Date, zone: "local" | "utc"): Date {
  const next = new Date(date);
  if (zone === "utc") {
    next.setUTCMinutes(59, 59, 999);
  } else {
    next.setMinutes(59, 59, 999);
  }
  return next;
}

function buildUsageMosaicStats(
  sessions: UsageSessionEntry[],
  timeZone: "local" | "utc",
): UsageMosaicStats {
  const hourTotals = Array.from({ length: 24 }, () => 0);
  const weekdayTotals = Array.from({ length: 7 }, () => 0);
  let totalTokens = 0;
  let hasData = false;

  for (const session of sessions) {
    const usage = session.usage;
    if (!usage || !usage.totalTokens || usage.totalTokens <= 0) {
      continue;
    }
    totalTokens += usage.totalTokens;

    const start = usage.firstActivity ?? session.updatedAt;
    const end = usage.lastActivity ?? session.updatedAt;
    if (!start || !end) {
      continue;
    }
    hasData = true;

    const startMs = Math.min(start, end);
    const endMs = Math.max(start, end);
    const durationMs = Math.max(endMs - startMs, 1);
    const totalMinutes = durationMs / 60000;

    let cursor = startMs;
    while (cursor < endMs) {
      const date = new Date(cursor);
      const hour = getZonedHour(date, timeZone);
      const weekday = getZonedWeekday(date, timeZone);
      const nextHour = setToHourEnd(date, timeZone);
      const nextMs = Math.min(nextHour.getTime(), endMs);
      const minutes = Math.max((nextMs - cursor) / 60000, 0);
      const share = minutes / totalMinutes;
      hourTotals[hour] += usage.totalTokens * share;
      weekdayTotals[weekday] += usage.totalTokens * share;
      cursor = nextMs + 1;
    }
  }

  const weekdayLabels = WEEKDAYS.map((label, index) => ({
    label,
    tokens: weekdayTotals[index],
  }));

  return {
    hasData,
    totalTokens,
    hourTotals,
    weekdayTotals: weekdayLabels,
  };
}

export function renderOverviewUsageMosaic(
  sessions: UsageSessionEntry[],
  timeZone: "local" | "utc",
) {
  const stats = buildUsageMosaicStats(sessions, timeZone);
  if (!stats.hasData) {
    return html`
      <div class="card usage-mosaic">
        <div class="usage-mosaic-header">
          <div>
            <div class="usage-mosaic-title">${t("usageActivityByTime")}</div>
            <div class="usage-mosaic-sub">${t("usageMosaicSubNoData")}</div>
          </div>
          <div class="usage-mosaic-total">${formatTokens(0)} ${t("usageTokensUnit")}</div>
        </div>
        <div class="muted" style="padding: 12px; text-align: center;">${t("usageNoTimeline")}</div>
      </div>
    `;
  }

  const maxHour = Math.max(...stats.hourTotals, 1);
  const maxWeekday = Math.max(...stats.weekdayTotals.map((d) => d.tokens), 1);

  return html`
    <div class="card usage-mosaic">
      <div class="usage-mosaic-header">
        <div>
          <div class="usage-mosaic-title">${t("usageActivityByTime")}</div>
          <div class="usage-mosaic-sub">
            Estimated from session spans (first/last activity). Time zone: ${timeZone === "utc" ? t("usageTimeZoneUtc") : t("usageTimeZoneLocal")}.
          </div>
        </div>
        <div class="usage-mosaic-total">${formatTokens(stats.totalTokens)} ${t("usageTokensUnit")}</div>
      </div>
      <div class="usage-mosaic-grid">
        <div class="usage-mosaic-section">
          <div class="usage-mosaic-section-title">${t("usageDayOfWeek")}</div>
          <div class="usage-daypart-grid">
            ${stats.weekdayTotals.map((part) => {
              const intensity = Math.min(part.tokens / maxWeekday, 1);
              const bg =
                part.tokens > 0 ? `rgba(36, 186, 81, ${0.12 + intensity * 0.6})` : "transparent";
              return html`
                <div class="usage-daypart-cell" style="background: ${bg};">
                  <div class="usage-daypart-label">${part.label}</div>
                  <div class="usage-daypart-value">${formatTokens(part.tokens)}</div>
                </div>
              `;
            })}
          </div>
        </div>
        <div class="usage-mosaic-section">
          <div class="usage-mosaic-section-title">
            <span>${t("usageHours")}</span>
            <span class="usage-mosaic-sub">0 → 23</span>
          </div>
          <div class="usage-hour-grid">
            ${stats.hourTotals.map((value, hour) => {
              const intensity = Math.min(value / maxHour, 1);
              const bg = value > 0 ? `rgba(36, 186, 81, ${0.08 + intensity * 0.7})` : "transparent";
              const title = `${hour}:00 · ${formatTokens(value)} ${t("usageTokensUnit")}`;
              const border = intensity > 0.7 ? "rgba(36, 186, 81, 0.6)" : "rgba(36, 186, 81, 0.2)";
              return html`
                <div
                  class="usage-hour-cell"
                  style="background: ${bg}; border-color: ${border};"
                  title="${title}"
                ></div>
              `;
            })}
          </div>
          <div class="usage-hour-labels">
            <span>${t("usageMidnight")}</span>
            <span>${t("usage4am")}</span>
            <span>${t("usage8am")}</span>
            <span>${t("usageNoon")}</span>
            <span>${t("usage4pm")}</span>
            <span>${t("usage8pm")}</span>
          </div>
          <div class="usage-hour-legend">
            <span></span>
            Low → High token density
          </div>
        </div>
      </div>
    </div>
  `;
}

const emptyUsageTotals = (): UsageTotals => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  totalCost: 0,
  inputCost: 0,
  outputCost: 0,
  cacheReadCost: 0,
  cacheWriteCost: 0,
  missingCostEntries: 0,
});

const mergeUsageTotals = (target: UsageTotals, source: Partial<UsageTotals>) => {
  target.input += source.input ?? 0;
  target.output += source.output ?? 0;
  target.cacheRead += source.cacheRead ?? 0;
  target.cacheWrite += source.cacheWrite ?? 0;
  target.totalTokens += source.totalTokens ?? 0;
  target.totalCost += source.totalCost ?? 0;
  target.inputCost += source.inputCost ?? 0;
  target.outputCost += source.outputCost ?? 0;
  target.cacheReadCost += source.cacheReadCost ?? 0;
  target.cacheWriteCost += source.cacheWriteCost ?? 0;
  target.missingCostEntries += source.missingCostEntries ?? 0;
};

export const buildAggregatesFromSessions = (
  sessions: UsageSessionEntry[],
  fallback?: UsageAggregates | null,
): UsageAggregates => {
  if (sessions.length === 0) {
    return (
      fallback ?? {
        messages: { total: 0, user: 0, assistant: 0, toolCalls: 0, toolResults: 0, errors: 0 },
        tools: { totalCalls: 0, uniqueTools: 0, tools: [] },
        byModel: [],
        byProvider: [],
        byAgent: [],
        byChannel: [],
        daily: [],
      }
    );
  }

  const messages = { total: 0, user: 0, assistant: 0, toolCalls: 0, toolResults: 0, errors: 0 };
  const toolMap = new Map<string, number>();
  const modelMap = new Map<
    string,
    { provider?: string; model?: string; count: number; totals: UsageTotals }
  >();
  const providerMap = new Map<
    string,
    { provider?: string; model?: string; count: number; totals: UsageTotals }
  >();
  const agentMap = new Map<string, UsageTotals>();
  const channelMap = new Map<string, UsageTotals>();
  const dailyMap = new Map<
    string,
    {
      date: string;
      tokens: number;
      cost: number;
      messages: number;
      toolCalls: number;
      errors: number;
    }
  >();
  const dailyLatencyMap = new Map<
    string,
    { date: string; count: number; sum: number; min: number; max: number; p95Max: number }
  >();
  const modelDailyMap = new Map<
    string,
    { date: string; provider?: string; model?: string; tokens: number; cost: number; count: number }
  >();
  const latencyTotals = { count: 0, sum: 0, min: Number.POSITIVE_INFINITY, max: 0, p95Max: 0 };

  for (const session of sessions) {
    const usage = session.usage;
    if (!usage) {
      continue;
    }
    if (usage.messageCounts) {
      messages.total += usage.messageCounts.total;
      messages.user += usage.messageCounts.user;
      messages.assistant += usage.messageCounts.assistant;
      messages.toolCalls += usage.messageCounts.toolCalls;
      messages.toolResults += usage.messageCounts.toolResults;
      messages.errors += usage.messageCounts.errors;
    }

    if (usage.toolUsage) {
      for (const tool of usage.toolUsage.tools) {
        toolMap.set(tool.name, (toolMap.get(tool.name) ?? 0) + tool.count);
      }
    }

    if (usage.modelUsage && usage.modelUsage.length > 0) {
      let sessionUsageAddedForModel = false;
      for (const entry of usage.modelUsage) {
        // Use session-level model/provider when transcript has "unknown" (message.usage often 0, token_usage may lack model)
        const effProvider =
          entry.provider && entry.provider !== "unknown"
            ? entry.provider
            : session.modelProvider ?? session.providerOverride ?? "unknown";
        const effModel =
          entry.model && entry.model !== "unknown"
            ? entry.model
            : session.model ?? session.modelOverride ?? "unknown";
        // When entry totals are 0 (from message.usage), use session usage totals (from token_usage)
        const useTotals =
          entry.totals.totalTokens === 0 && usage.totalTokens > 0 && !sessionUsageAddedForModel
            ? {
                input: usage.input,
                output: usage.output,
                cacheRead: usage.cacheRead,
                cacheWrite: usage.cacheWrite,
                totalTokens: usage.totalTokens,
                totalCost: usage.totalCost,
                inputCost: usage.inputCost ?? 0,
                outputCost: usage.outputCost ?? 0,
                cacheReadCost: usage.cacheReadCost ?? 0,
                cacheWriteCost: usage.cacheWriteCost ?? 0,
                missingCostEntries: usage.missingCostEntries ?? 0,
              }
            : entry.totals;
        if (entry.totals.totalTokens === 0 && usage.totalTokens > 0) {
          sessionUsageAddedForModel = true;
        }
        const modelKey = `${effProvider}::${effModel}`;
        const modelExisting = modelMap.get(modelKey) ?? {
          provider: effProvider,
          model: effModel,
          count: 0,
          totals: emptyUsageTotals(),
        };
        modelExisting.count += entry.count;
        mergeUsageTotals(modelExisting.totals, useTotals);
        modelMap.set(modelKey, modelExisting);

        const providerExisting = providerMap.get(effProvider) ?? {
          provider: effProvider,
          model: undefined,
          count: 0,
          totals: emptyUsageTotals(),
        };
        providerExisting.count += entry.count;
        mergeUsageTotals(providerExisting.totals, useTotals);
        providerMap.set(effProvider, providerExisting);
      }
    } else if (usage.totalTokens > 0) {
      // Session has usage but no modelUsage: use session-level model/provider
      const effProvider = session.modelProvider ?? session.providerOverride ?? "unknown";
      const effModel = session.model ?? session.modelOverride ?? "unknown";
      const modelKey = `${effProvider}::${effModel}`;
      const modelExisting = modelMap.get(modelKey) ?? {
        provider: effProvider,
        model: effModel,
        count: 0,
        totals: emptyUsageTotals(),
      };
      modelExisting.count += 1;
      mergeUsageTotals(modelExisting.totals, usage);
      modelMap.set(modelKey, modelExisting);

      const providerExisting = providerMap.get(effProvider) ?? {
        provider: effProvider,
        model: undefined,
        count: 0,
        totals: emptyUsageTotals(),
      };
      providerExisting.count += 1;
      mergeUsageTotals(providerExisting.totals, usage);
      providerMap.set(effProvider, providerExisting);
    }

    if (usage.latency) {
      const { count, avgMs, minMs, maxMs, p95Ms } = usage.latency;
      if (count > 0) {
        latencyTotals.count += count;
        latencyTotals.sum += avgMs * count;
        latencyTotals.min = Math.min(latencyTotals.min, minMs);
        latencyTotals.max = Math.max(latencyTotals.max, maxMs);
        latencyTotals.p95Max = Math.max(latencyTotals.p95Max, p95Ms);
      }
    }

    if (session.agentId) {
      const totals = agentMap.get(session.agentId) ?? emptyUsageTotals();
      mergeUsageTotals(totals, usage);
      agentMap.set(session.agentId, totals);
    }
    if (session.channel) {
      const totals = channelMap.get(session.channel) ?? emptyUsageTotals();
      mergeUsageTotals(totals, usage);
      channelMap.set(session.channel, totals);
    }

    for (const day of usage.dailyBreakdown ?? []) {
      const daily = dailyMap.get(day.date) ?? {
        date: day.date,
        tokens: 0,
        cost: 0,
        messages: 0,
        toolCalls: 0,
        errors: 0,
      };
      daily.tokens += day.tokens;
      daily.cost += day.cost;
      dailyMap.set(day.date, daily);
    }
    for (const day of usage.dailyMessageCounts ?? []) {
      const daily = dailyMap.get(day.date) ?? {
        date: day.date,
        tokens: 0,
        cost: 0,
        messages: 0,
        toolCalls: 0,
        errors: 0,
      };
      daily.messages += day.total;
      daily.toolCalls += day.toolCalls;
      daily.errors += day.errors;
      dailyMap.set(day.date, daily);
    }
    for (const day of usage.dailyLatency ?? []) {
      const existing = dailyLatencyMap.get(day.date) ?? {
        date: day.date,
        count: 0,
        sum: 0,
        min: Number.POSITIVE_INFINITY,
        max: 0,
        p95Max: 0,
      };
      existing.count += day.count;
      existing.sum += day.avgMs * day.count;
      existing.min = Math.min(existing.min, day.minMs);
      existing.max = Math.max(existing.max, day.maxMs);
      existing.p95Max = Math.max(existing.p95Max, day.p95Ms);
      dailyLatencyMap.set(day.date, existing);
    }
    for (const day of usage.dailyModelUsage ?? []) {
      const effProvider =
        day.provider && day.provider !== "unknown"
          ? day.provider
          : session.modelProvider ?? session.providerOverride ?? "unknown";
      const effModel =
        day.model && day.model !== "unknown"
          ? day.model
          : session.model ?? session.modelOverride ?? "unknown";
      const key = `${day.date}::${effProvider}::${effModel}`;
      const existing = modelDailyMap.get(key) ?? {
        date: day.date,
        provider: effProvider,
        model: effModel,
        tokens: 0,
        cost: 0,
        count: 0,
      };
      existing.tokens += day.tokens;
      existing.cost += day.cost;
      existing.count += day.count;
      modelDailyMap.set(key, existing);
    }
  }

  return {
    messages,
    tools: {
      totalCalls: Array.from(toolMap.values()).reduce((sum, count) => sum + count, 0),
      uniqueTools: toolMap.size,
      tools: Array.from(toolMap.entries())
        .map(([name, count]) => ({ name, count }))
        .toSorted((a, b) => b.count - a.count),
    },
    byModel: Array.from(modelMap.values()).toSorted(
      (a, b) => b.totals.totalCost - a.totals.totalCost,
    ),
    byProvider: Array.from(providerMap.values()).toSorted(
      (a, b) => b.totals.totalCost - a.totals.totalCost,
    ),
    byAgent: Array.from(agentMap.entries())
      .map(([agentId, totals]) => ({ agentId, totals }))
      .toSorted((a, b) => b.totals.totalCost - a.totals.totalCost),
    byChannel: Array.from(channelMap.entries())
      .map(([channel, totals]) => ({ channel, totals }))
      .toSorted((a, b) => b.totals.totalCost - a.totals.totalCost),
    latency:
      latencyTotals.count > 0
        ? {
            count: latencyTotals.count,
            avgMs: latencyTotals.sum / latencyTotals.count,
            minMs: latencyTotals.min === Number.POSITIVE_INFINITY ? 0 : latencyTotals.min,
            maxMs: latencyTotals.max,
            p95Ms: latencyTotals.p95Max,
          }
        : undefined,
    dailyLatency: Array.from(dailyLatencyMap.values())
      .map((entry) => ({
        date: entry.date,
        count: entry.count,
        avgMs: entry.count ? entry.sum / entry.count : 0,
        minMs: entry.min === Number.POSITIVE_INFINITY ? 0 : entry.min,
        maxMs: entry.max,
        p95Ms: entry.p95Max,
      }))
      .toSorted((a, b) => a.date.localeCompare(b.date)),
    modelDaily: Array.from(modelDailyMap.values()).toSorted(
      (a, b) => a.date.localeCompare(b.date) || b.cost - a.cost,
    ),
    daily: Array.from(dailyMap.values()).toSorted((a, b) => a.date.localeCompare(b.date)),
  };
};

type UsageInsightStats = {
  durationSumMs: number;
  durationCount: number;
  avgDurationMs: number;
  throughputTokensPerMin?: number;
  throughputCostPerMin?: number;
  errorRate: number;
  peakErrorDay?: { date: string; errors: number; messages: number; rate: number };
};

export const buildUsageInsightStats = (
  sessions: UsageSessionEntry[],
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
): UsageInsightStats => {
  let durationSumMs = 0;
  let durationCount = 0;
  for (const session of sessions) {
    const duration = session.usage?.durationMs ?? 0;
    if (duration > 0) {
      durationSumMs += duration;
      durationCount += 1;
    }
  }

  const avgDurationMs = durationCount ? durationSumMs / durationCount : 0;
  const throughputTokensPerMin =
    totals && durationSumMs > 0 ? totals.totalTokens / (durationSumMs / 60000) : undefined;
  const throughputCostPerMin =
    totals && durationSumMs > 0 ? totals.totalCost / (durationSumMs / 60000) : undefined;

  const errorRate = aggregates.messages.total
    ? aggregates.messages.errors / aggregates.messages.total
    : 0;
  const peakErrorDay = aggregates.daily
    .filter((day) => day.messages > 0 && day.errors > 0)
    .map((day) => ({
      date: day.date,
      errors: day.errors,
      messages: day.messages,
      rate: day.errors / day.messages,
    }))
    .toSorted((a, b) => b.rate - a.rate || b.errors - a.errors)[0];

  return {
    durationSumMs,
    durationCount,
    avgDurationMs,
    throughputTokensPerMin,
    throughputCostPerMin,
    errorRate,
    peakErrorDay,
  };
};

function pct(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return (part / total) * 100;
}

function getCostBreakdown(totals: UsageTotals) {
  // Use actual costs from API data (already aggregated in backend)
  const totalCost = totals.totalCost || 0;

  return {
    input: {
      tokens: totals.input,
      cost: totals.inputCost || 0,
      pct: pct(totals.inputCost || 0, totalCost),
    },
    output: {
      tokens: totals.output,
      cost: totals.outputCost || 0,
      pct: pct(totals.outputCost || 0, totalCost),
    },
    cacheRead: {
      tokens: totals.cacheRead,
      cost: totals.cacheReadCost || 0,
      pct: pct(totals.cacheReadCost || 0, totalCost),
    },
    cacheWrite: {
      tokens: totals.cacheWrite,
      cost: totals.cacheWriteCost || 0,
      pct: pct(totals.cacheWriteCost || 0, totalCost),
    },
    totalCost,
  };
}

function renderDailyChartCompact(
  daily: CostDailyEntry[],
  selectedDays: string[],
  chartMode: "tokens" | "cost",
  dailyChartMode: "total" | "by-type",
  onDailyChartModeChange: (mode: "total" | "by-type") => void,
  onSelectDay: (day: string, shiftKey: boolean) => void,
) {
  if (!daily.length) {
    return html`
      <div class="daily-chart-compact">
        <div class="sessions-panel-title">${t("usageDailyUsage")}</div>
        <div class="muted" style="padding: 20px; text-align: center">${t("usageNoData")}</div>
      </div>
    `;
  }

  const isTokenMode = chartMode === "tokens";
  const values = daily.map((d) => (isTokenMode ? d.totalTokens : d.totalCost));
  const maxValue = Math.max(...values, isTokenMode ? 1 : 0.0001);

  // Calculate bar width based on number of days
  const barMaxWidth = daily.length > 30 ? 12 : daily.length > 20 ? 18 : daily.length > 14 ? 24 : 32;
  const showTotals = daily.length <= 14;

  return html`
    <div class="daily-chart-compact">
      <div class="daily-chart-header">
        <div class="chart-toggle small sessions-toggle">
          <button
            class="toggle-btn ${dailyChartMode === "total" ? "active" : ""}"
            @click=${() => onDailyChartModeChange("total")}
          >
            ${t("usageTotal")}
          </button>
          <button
            class="toggle-btn ${dailyChartMode === "by-type" ? "active" : ""}"
            @click=${() => onDailyChartModeChange("by-type")}
          >
            ${t("usageByType")}
          </button>
        </div>
        <div class="card-title">${isTokenMode ? t("usageDailyToken") : t("usageDailyCost")}</div>
      </div>
      <div class="daily-chart">
        <div class="daily-chart-bars" style="--bar-max-width: ${barMaxWidth}px">
          ${daily.map((d, idx) => {
            const value = values[idx];
            const heightPct = (value / maxValue) * 100;
            const isSelected = selectedDays.includes(d.date);
            const label = formatDayLabel(d.date);
            // Shorter label for many days (just day number)
            const shortLabel = daily.length > 20 ? String(parseInt(d.date.slice(8), 10)) : label;
            const labelStyle = daily.length > 20 ? "font-size: 8px" : "";
            const segments =
              dailyChartMode === "by-type"
                ? isTokenMode
                  ? [
                      { value: d.output, class: "output" },
                      { value: d.input, class: "input" },
                      { value: d.cacheWrite, class: "cache-write" },
                      { value: d.cacheRead, class: "cache-read" },
                    ]
                  : [
                      { value: d.outputCost ?? 0, class: "output" },
                      { value: d.inputCost ?? 0, class: "input" },
                      { value: d.cacheWriteCost ?? 0, class: "cache-write" },
                      { value: d.cacheReadCost ?? 0, class: "cache-read" },
                    ]
                : [];
            const breakdownLines =
              dailyChartMode === "by-type"
                ? isTokenMode
                  ? [
                      `Output ${formatTokens(d.output)}`,
                      `Input ${formatTokens(d.input)}`,
                      `Cache write ${formatTokens(d.cacheWrite)}`,
                      `Cache read ${formatTokens(d.cacheRead)}`,
                    ]
                  : [
                      `Output ${formatCost(d.outputCost ?? 0)}`,
                      `Input ${formatCost(d.inputCost ?? 0)}`,
                      `Cache write ${formatCost(d.cacheWriteCost ?? 0)}`,
                      `Cache read ${formatCost(d.cacheReadCost ?? 0)}`,
                    ]
                : [];
            const totalLabel = isTokenMode ? formatTokens(d.totalTokens) : formatCost(d.totalCost);
            return html`
              <div
                class="daily-bar-wrapper ${isSelected ? "selected" : ""}"
                @click=${(e: MouseEvent) => onSelectDay(d.date, e.shiftKey)}
              >
                ${
                  dailyChartMode === "by-type"
                    ? html`
                        <div
                          class="daily-bar"
                          style="height: ${heightPct.toFixed(1)}%; display: flex; flex-direction: column;"
                        >
                          ${(() => {
                            const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
                            return segments.map(
                              (seg) => html`
                                <div
                                  class="cost-segment ${seg.class}"
                                  style="height: ${(seg.value / total) * 100}%"
                                ></div>
                              `,
                            );
                          })()}
                        </div>
                      `
                    : html`
                        <div class="daily-bar" style="height: ${heightPct.toFixed(1)}%"></div>
                      `
                }
                ${showTotals ? html`<div class="daily-bar-total">${totalLabel}</div>` : nothing}
                <div class="daily-bar-label" style="${labelStyle}">${shortLabel}</div>
                <div class="daily-bar-tooltip">
                  <strong>${formatFullDate(d.date)}</strong><br />
                  ${formatTokens(d.totalTokens)} ${t("usageTokensUnit")}<br />
                  ${formatCost(d.totalCost)}
                  ${
                    breakdownLines.length
                      ? html`${breakdownLines.map((line) => html`<div>${line}</div>`)}`
                      : nothing
                  }
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}

function renderCostBreakdownCompact(totals: UsageTotals, mode: "tokens" | "cost") {
  const breakdown = getCostBreakdown(totals);
  const isTokenMode = mode === "tokens";
  const totalTokens = totals.totalTokens || 1;
  const tokenPcts = {
    output: pct(totals.output, totalTokens),
    input: pct(totals.input, totalTokens),
    cacheWrite: pct(totals.cacheWrite, totalTokens),
    cacheRead: pct(totals.cacheRead, totalTokens),
  };

  return html`
    <div class="cost-breakdown cost-breakdown-compact">
      <div class="cost-breakdown-header">${isTokenMode ? t("usageTokensByType") : t("usageCostByType")}</div>
      <div class="cost-breakdown-bar">
        <div class="cost-segment output" style="width: ${(isTokenMode ? tokenPcts.output : breakdown.output.pct).toFixed(1)}%"
          title="Output: ${isTokenMode ? formatTokens(totals.output) : formatCost(breakdown.output.cost)}"></div>
        <div class="cost-segment input" style="width: ${(isTokenMode ? tokenPcts.input : breakdown.input.pct).toFixed(1)}%"
          title="Input: ${isTokenMode ? formatTokens(totals.input) : formatCost(breakdown.input.cost)}"></div>
        <div class="cost-segment cache-write" style="width: ${(isTokenMode ? tokenPcts.cacheWrite : breakdown.cacheWrite.pct).toFixed(1)}%"
          title="Cache Write: ${isTokenMode ? formatTokens(totals.cacheWrite) : formatCost(breakdown.cacheWrite.cost)}"></div>
        <div class="cost-segment cache-read" style="width: ${(isTokenMode ? tokenPcts.cacheRead : breakdown.cacheRead.pct).toFixed(1)}%"
          title="Cache Read: ${isTokenMode ? formatTokens(totals.cacheRead) : formatCost(breakdown.cacheRead.cost)}"></div>
      </div>
      <div class="cost-breakdown-legend">
        <span class="legend-item"><span class="legend-dot output"></span>${t("usageOutput")} ${isTokenMode ? formatTokens(totals.output) : formatCost(breakdown.output.cost)}</span>
        <span class="legend-item"><span class="legend-dot input"></span>${t("usageInput")} ${isTokenMode ? formatTokens(totals.input) : formatCost(breakdown.input.cost)}</span>
        <span class="legend-item"><span class="legend-dot cache-write"></span>${t("usageCacheWrite")} ${isTokenMode ? formatTokens(totals.cacheWrite) : formatCost(breakdown.cacheWrite.cost)}</span>
        <span class="legend-item"><span class="legend-dot cache-read"></span>${t("usageCacheRead")} ${isTokenMode ? formatTokens(totals.cacheRead) : formatCost(breakdown.cacheRead.cost)}</span>
      </div>
      <div class="cost-breakdown-total">
        ${t("usageTotalLabel")}: ${isTokenMode ? formatTokens(totals.totalTokens) : formatCost(totals.totalCost)}
      </div>
    </div>
  `;
}

function renderInsightList(
  title: string,
  items: Array<{ label: string; value: string; sub?: string }>,
  emptyLabel: string,
) {
  return html`
    <div class="usage-insight-card">
      <div class="usage-insight-title">${title}</div>
      ${
        items.length === 0
          ? html`<div class="muted">${emptyLabel}</div>`
          : html`
              <div class="usage-list">
                ${items.map(
                  (item) => html`
                    <div class="usage-list-item">
                      <span>${item.label}</span>
                      <span class="usage-list-value">
                        <span>${item.value}</span>
                        ${item.sub ? html`<span class="usage-list-sub">${item.sub}</span>` : nothing}
                      </span>
                    </div>
                  `,
                )}
              </div>
            `
      }
    </div>
  `;
}

function renderPeakErrorList(
  title: string,
  items: Array<{ label: string; value: string; sub?: string }>,
  emptyLabel: string,
) {
  return html`
    <div class="usage-insight-card">
      <div class="usage-insight-title">${title}</div>
      ${
        items.length === 0
          ? html`<div class="muted">${emptyLabel}</div>`
          : html`
              <div class="usage-error-list">
                ${items.map(
                  (item) => html`
                    <div class="usage-error-row">
                      <div class="usage-error-date">${item.label}</div>
                      <div class="usage-error-rate">${item.value}</div>
                      ${item.sub ? html`<div class="usage-error-sub">${item.sub}</div>` : nothing}
                    </div>
                  `,
                )}
              </div>
            `
      }
    </div>
  `;
}

export function renderOverviewUsageInsights(
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
  stats: UsageInsightStats,
  showCostHint: boolean,
  errorHours: Array<{ label: string; value: string; sub?: string }>,
  sessionCount: number,
  totalSessions: number,
) {
  if (!totals) {
    return nothing;
  }

  const avgTokens = aggregates.messages.total
    ? Math.round(totals.totalTokens / aggregates.messages.total)
    : 0;
  const avgCost = aggregates.messages.total ? totals.totalCost / aggregates.messages.total : 0;
  const cacheBase = totals.input + totals.cacheRead;
  const cacheHitRate = cacheBase > 0 ? totals.cacheRead / cacheBase : 0;
  const cacheHitLabel = cacheBase > 0 ? `${(cacheHitRate * 100).toFixed(1)}%` : "—";
  const errorRatePct = stats.errorRate * 100;
  const throughputLabel =
    stats.throughputTokensPerMin !== undefined
      ? `${formatTokens(Math.round(stats.throughputTokensPerMin))} tok/min`
      : "—";
  const throughputCostLabel =
    stats.throughputCostPerMin !== undefined
      ? `${formatCost(stats.throughputCostPerMin, 4)} / min`
      : "—";
  const avgDurationLabel = stats.durationCount > 0 ? formatDurationShort(stats.avgDurationMs) : "—";
  const cacheHint = t("usageCacheHitRateHint");
  const errorHint = t("usageErrorRateHint");
  const throughputHint = t("usageThroughputHint");
  const tokensHint = t("usageTokensHint");
  const costHint = showCostHint ? t("usageCostHintMissing") : t("usageCostHint");

  const errorDays = aggregates.daily
    .filter((day) => day.messages > 0 && day.errors > 0)
    .map((day) => {
      const rate = day.errors / day.messages;
      return {
        label: formatDayLabel(day.date),
        value: `${(rate * 100).toFixed(2)}%`,
        sub: `${day.errors} ${t("usageErrors").toLowerCase()} · ${day.messages} ${t("usageMessagesCount")} · ${formatTokens(day.tokens)}`,
        rate,
      };
    })
    .toSorted((a, b) => b.rate - a.rate)
    .slice(0, 5)
    .map(({ rate: _rate, ...rest }) => rest);

  const topModels = aggregates.byModel
    .filter((e) => (e.count ?? 0) > 0 || (e.totals?.totalTokens ?? 0) > 0)
    .slice(0, 5)
    .map((entry) => ({
      label: entry.model ?? "unknown",
      value: formatCost(entry.totals.totalCost),
      sub: `${formatTokens(entry.totals.totalTokens)} · ${entry.count} ${t("usageMessagesCount")}`,
    }));
  const topProviders = aggregates.byProvider
    .filter((e) => (e.count ?? 0) > 0 || (e.totals?.totalTokens ?? 0) > 0)
    .slice(0, 5)
    .map((entry) => ({
      label: entry.provider ?? "unknown",
      value: formatCost(entry.totals.totalCost),
      sub: `${formatTokens(entry.totals.totalTokens)} · ${entry.count} ${t("usageMessagesCount")}`,
    }));
  const topTools = aggregates.tools.tools.slice(0, 6).map((tool) => ({
    label: tool.name,
    value: `${tool.count}`,
    sub: t("usageCalls"),
  }));
  const topAgents = aggregates.byAgent.slice(0, 5).map((entry) => ({
    label: entry.agentId,
    value: formatCost(entry.totals.totalCost),
    sub: formatTokens(entry.totals.totalTokens),
  }));
  const topChannels = aggregates.byChannel.slice(0, 5).map((entry) => ({
    label: entry.channel,
    value: formatCost(entry.totals.totalCost),
    sub: formatTokens(entry.totals.totalTokens),
  }));

  return html`
    <section class="card">
      <div class="card-title">${t("usageOverview")}</div>
      <div class="usage-summary-grid">
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageMessages")}
            <span class="usage-summary-hint" title=${t("usageMessagesHint")}>?</span>
          </div>
          <div class="usage-summary-value">${aggregates.messages.total}</div>
          <div class="usage-summary-sub">
            ${aggregates.messages.user} ${t("usageUser").toLowerCase()} · ${aggregates.messages.assistant} ${t("usageAssistant").toLowerCase()}
          </div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageToolCalls")}
            <span class="usage-summary-hint" title=${t("usageToolCallsHint")}>?</span>
          </div>
          <div class="usage-summary-value">${aggregates.tools.totalCalls}</div>
          <div class="usage-summary-sub">${aggregates.tools.uniqueTools} ${t("usageToolsUsed")}</div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageErrors")}
            <span class="usage-summary-hint" title=${t("usageErrorsHint")}>?</span>
          </div>
          <div class="usage-summary-value">${aggregates.messages.errors}</div>
          <div class="usage-summary-sub">${aggregates.messages.toolResults} ${t("usageToolResults")}</div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageAvgTokensMsg")}
            <span class="usage-summary-hint" title=${tokensHint}>?</span>
          </div>
          <div class="usage-summary-value">${formatTokens(avgTokens)}</div>
          <div class="usage-summary-sub">${t("usageAcrossMessages")} ${aggregates.messages.total || 0} ${t("usageMessagesCount")}</div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageAvgCostMsg")}
            <span class="usage-summary-hint" title=${costHint}>?</span>
          </div>
          <div class="usage-summary-value">${formatCost(avgCost, 4)}</div>
          <div class="usage-summary-sub">${formatCost(totals.totalCost)} ${t("usageTotalLabel").toLowerCase()}</div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageSessionsCard")}
            <span class="usage-summary-hint" title=${t("usageSessionsHint")}>?</span>
          </div>
          <div class="usage-summary-value">${sessionCount}</div>
          <div class="usage-summary-sub">${t("usageInRange")} ${totalSessions}</div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageThroughput")}
            <span class="usage-summary-hint" title=${throughputHint}>?</span>
          </div>
          <div class="usage-summary-value">${throughputLabel}</div>
          <div class="usage-summary-sub">${throughputCostLabel}</div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageErrorRate")}
            <span class="usage-summary-hint" title=${errorHint}>?</span>
          </div>
          <div class="usage-summary-value ${errorRatePct > 5 ? "bad" : errorRatePct > 1 ? "warn" : "good"}">${errorRatePct.toFixed(2)}%</div>
          <div class="usage-summary-sub">
            ${aggregates.messages.errors} ${t("usageErrors").toLowerCase()} · ${avgDurationLabel} ${t("usageAvg")} ${t("usageSession").toLowerCase()}
          </div>
        </div>
        <div class="usage-summary-card">
          <div class="usage-summary-title">
            ${t("usageCacheHitRate")}
            <span class="usage-summary-hint" title=${cacheHint}>?</span>
          </div>
          <div class="usage-summary-value ${cacheHitRate > 0.6 ? "good" : cacheHitRate > 0.3 ? "warn" : "bad"}">${cacheHitLabel}</div>
          <div class="usage-summary-sub">
            ${formatTokens(totals.cacheRead)} ${t("usageCached")} · ${formatTokens(cacheBase)} ${t("usagePrompt")}
          </div>
        </div>
      </div>
      <div class="usage-insights-grid">
        ${renderInsightList(t("usageTopModels"), topModels, t("usageNoModelData"))}
        ${renderInsightList(t("usageTopProviders"), topProviders, t("usageNoProviderData"))}
        ${renderInsightList(t("usageTopTools"), topTools, t("usageNoToolCalls"))}
        ${renderInsightList(t("usageTopAgents"), topAgents, t("usageNoAgentData"))}
        ${renderInsightList(t("usageTopChannels"), topChannels, t("usageNoChannelData"))}
        ${renderPeakErrorList(t("usagePeakErrorDays"), errorDays, t("usageNoErrorData"))}
        ${renderPeakErrorList(t("usagePeakErrorHours"), errorHours, t("usageNoErrorData"))}
      </div>
    </section>
  `;
}

export function renderOverviewDailyChart(
  daily: CostDailyEntry[],
  chartMode: "tokens" | "cost",
  dailyChartMode: "total" | "by-type",
  onDailyChartModeChange: (mode: "total" | "by-type") => void,
) {
  return renderDailyChartCompact(daily, [], chartMode, dailyChartMode, onDailyChartModeChange, () => {});
}

export function renderOverviewCostBreakdown(totals: UsageTotals, mode: "tokens" | "cost") {
  return renderCostBreakdownCompact(totals, mode);
}
