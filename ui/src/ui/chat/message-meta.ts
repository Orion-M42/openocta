export type MessageUsage = {
  input: number;
  output: number;
  totalTokens?: number;
  cacheRead?: number;
  cacheWrite?: number;
};

export type MessageMeta = {
  model?: string;
  provider?: string;
  durationMs?: number;
  endTime?: number;
  usage?: MessageUsage;
};

function readUsage(raw: unknown): MessageUsage | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const u = raw as Record<string, unknown>;
  const input = typeof u.input === "number" ? u.input : typeof u.input_tokens === "number" ? u.input_tokens : 0;
  const output =
    typeof u.output === "number" ? u.output : typeof u.output_tokens === "number" ? u.output_tokens : 0;
  const totalTokens =
    typeof u.totalTokens === "number"
      ? u.totalTokens
      : typeof u.total_tokens === "number"
        ? u.total_tokens
        : input + output > 0
          ? input + output
          : undefined;
  if (input === 0 && output === 0 && !totalTokens) {
    return undefined;
  }
  return {
    input,
    output,
    totalTokens,
    cacheRead: typeof u.cacheRead === "number" ? u.cacheRead : undefined,
    cacheWrite: typeof u.cacheWrite === "number" ? u.cacheWrite : undefined,
  };
}

export function extractMessageMeta(message: unknown): MessageMeta {
  const m = message as Record<string, unknown>;
  const durationMs =
    typeof m.durationMs === "number"
      ? m.durationMs
      : typeof m.elapsedMs === "number"
        ? m.elapsedMs
        : undefined;
  const endTime = typeof m.timestamp === "number" ? m.timestamp : undefined;
  const model =
    (typeof m.model === "string" && m.model) ||
    (typeof m.modelRef === "string" && m.modelRef) ||
    undefined;
  const provider = typeof m.provider === "string" ? m.provider : undefined;
  const usage = readUsage(m.usage);
  return { model, provider, durationMs, endTime, usage };
}

function isToolResultMessage(message: unknown): boolean {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
  return role === "toolresult" || role === "tool_result" || typeof m.toolCallId === "string";
}

export function extractGroupMeta(messages: Array<{ message: unknown }>): MessageMeta {
  const merged: MessageMeta = {};
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]?.message;
    if (isToolResultMessage(message)) {
      continue;
    }
    const meta = extractMessageMeta(message);
    if (meta.model && !merged.model) {
      merged.model = meta.model;
    }
    if (meta.provider && !merged.provider) {
      merged.provider = meta.provider;
    }
    if (meta.durationMs && (!merged.durationMs || meta.durationMs > merged.durationMs)) {
      merged.durationMs = meta.durationMs;
    }
    if (meta.endTime && (!merged.endTime || meta.endTime > merged.endTime)) {
      merged.endTime = meta.endTime;
    }
    if (meta.usage && !merged.usage) {
      merged.usage = meta.usage;
    }
  }
  if (merged.model || merged.durationMs || merged.usage || merged.endTime) {
    return merged;
  }
  const last = messages[messages.length - 1]?.message;
  return extractMessageMeta(last);
}

export function formatTokenSummary(usage?: MessageUsage): string | null {
  if (!usage) {
    return null;
  }
  const input = usage.input ?? 0;
  const output = usage.output ?? 0;
  const total =
    usage.totalTokens && usage.totalTokens > 0 ? usage.totalTokens : input + output;
  if (input <= 0 && output <= 0 && total <= 0) {
    return null;
  }
  const parts: string[] = [];
  if (input > 0) {
    parts.push(`入 ${input.toLocaleString()}`);
  }
  if (output > 0) {
    parts.push(`出 ${output.toLocaleString()}`);
  }
  if (total > 0 && (input > 0 || output > 0)) {
    parts.push(`计 ${total.toLocaleString()}`);
  } else if (total > 0) {
    parts.push(`${total.toLocaleString()} tokens`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
