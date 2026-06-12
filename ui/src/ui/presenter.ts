import type { CronJob, GatewaySessionRow, PresenceEntry } from "./types.ts";
import { formatAgo, formatDurationMs, formatMs } from "./format.ts";

export function formatPresenceSummary(entry: PresenceEntry): string {
  const host = entry.host ?? "unknown";
  const ip = entry.ip ? `(${entry.ip})` : "";
  const mode = entry.mode ?? "";
  const version = entry.version ?? "";
  return `${host} ${ip} ${mode} ${version}`.trim();
}

export function formatPresenceAge(entry: PresenceEntry): string {
  const ts = entry.ts ?? null;
  return ts ? formatAgo(ts) : "n/a";
}

export function formatNextRun(ms?: number | null) {
  if (!ms) {
    return "n/a";
  }
  return `${formatMs(ms)} (${formatAgo(ms)})`;
}

export function formatSessionTokens(row: GatewaySessionRow) {
  const input = row.inputTokens ?? 0;
  const output = row.outputTokens ?? 0;
  const total = row.totalTokens ?? input + output;
  if (total <= 0 && input <= 0 && output <= 0) {
    return "—";
  }
  if (input > 0 || output > 0) {
    return `入 ${input} · 出 ${output} · 计 ${total}`;
  }
  return String(total);
}

const SESSION_SOURCE_LABELS: Record<string, string> = {
  web: "Web",
  weixin: "微信",
  wechat: "微信",
  dingtalk: "钉钉",
  feishu: "飞书",
  lark: "飞书",
  webhook: "Webhook",
  qq: "QQ",
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  nostr: "Nostr",
  wework: "企业微信",
};

function formatChannelLabel(channel: string): string {
  const normalized = channel.trim().toLowerCase();
  return SESSION_SOURCE_LABELS[normalized] ?? channel;
}

export function formatSessionSource(row: GatewaySessionRow): string {
  const channel = row.channel?.trim();
  if (channel) {
    return formatChannelLabel(channel);
  }
  const key = row.key.trim().toLowerCase();
  if (key === "main" || key === "agent:main:main" || key.endsWith(":main")) {
    return "Web";
  }
  const parts = key.split(":");
  const agentOffset = parts[0] === "agent" ? 2 : 0;
  if (parts.length > agentOffset) {
    const candidate = parts[agentOffset];
    if (candidate && SESSION_SOURCE_LABELS[candidate]) {
      return formatChannelLabel(candidate);
    }
  }
  if (parts.length > 0 && SESSION_SOURCE_LABELS[parts[0]]) {
    return formatChannelLabel(parts[0]);
  }
  if (row.kind === "global") {
    return "global";
  }
  return "Web";
}

export function formatEventPayload(payload: unknown): string {
  if (payload == null) {
    return "";
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    // oxlint-disable typescript/no-base-to-string
    return String(payload);
  }
}

export function formatCronState(job: CronJob) {
  const state = job.state ?? {};
  const next = state.nextRunAtMs ? formatMs(state.nextRunAtMs) : "n/a";
  const last = state.lastRunAtMs ? formatMs(state.lastRunAtMs) : "n/a";
  const status = state.lastStatus ?? "n/a";
  return `${status} · next ${next} · last ${last}`;
}

export function formatCronSchedule(job: CronJob) {
  const s = job.schedule;
  if (s.kind === "at") {
    const atMs = Date.parse(s.at);
    return Number.isFinite(atMs) ? `At ${formatMs(atMs)}` : `At ${s.at}`;
  }
  if (s.kind === "every") {
    return `Every ${formatDurationMs(s.everyMs)}`;
  }
  return `Cron ${s.expr}${s.tz ? ` (${s.tz})` : ""}`;
}

export function formatCronPayload(job: CronJob) {
  const p = job.payload;
  if (p.kind === "systemEvent") {
    return `System: ${p.text}`;
  }
  const base = `Agent: ${p.message}`;
  const delivery = job.delivery;
  if (delivery && delivery.mode !== "none") {
    const target =
      delivery.channel || delivery.to
        ? ` (${delivery.channel ?? "last"}${delivery.to ? ` -> ${delivery.to}` : ""})`
        : "";
    return `${base} · ${delivery.mode}${target}`;
  }
  return base;
}
