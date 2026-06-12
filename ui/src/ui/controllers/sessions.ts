import type { GatewayBrowserClient } from "../gateway.ts";
import { nativeConfirm } from "../native-dialog-bridge.ts";
import type { SessionsListResult } from "../types.ts";
import { toNumber } from "../format.ts";

export type SessionsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  sessionsLoading: boolean;
  sessionsResult: SessionsListResult | null;
  sessionsError: string | null;
  sessionsFilterActive: string;
  sessionsFilterLimit: string;
  sessionsIncludeGlobal: boolean;
  sessionsIncludeUnknown: boolean;
};

export type SessionsCreateResult = {
  ok: boolean;
  key: string;
  path: string;
  sessionId: string;
  entry: Record<string, unknown>;
};

export type SessionsEnsureResult = {
  ok: boolean;
  key: string;
  created: boolean;
  sessionId: string;
  entry: Record<string, unknown>;
};

/** 幂等：为指定 session key 写入 sessions 存储并保证转录文件存在（如数字员工 Web 会话在开聊前就出现在侧栏）。 */
export async function ensureSessionForKey(
  state: SessionsState,
  opts: { key: string; label?: string },
): Promise<SessionsEnsureResult | null> {
  if (!state.client || !state.connected) {
    return null;
  }
  const key = (opts.key ?? "").trim().toLowerCase();
  if (!key) {
    return null;
  }
  try {
    const params: Record<string, unknown> = { key };
    if (opts.label?.trim()) {
      params.label = opts.label.trim();
    }
    const res = await state.client.request<SessionsEnsureResult>("sessions.ensure", params);
    if (res?.ok && res.key) {
      await loadSessions(state, {
        activeMinutes: 10080,
        limit: 5000,
        includeLastMessage: true,
      });
      return res;
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSession(
  state: SessionsState,
  opts?: { label?: string },
): Promise<SessionsCreateResult | null> {
  if (!state.client || !state.connected) {
    return null;
  }
  try {
    const params: Record<string, unknown> = {};
    if (opts?.label?.trim()) {
      params.label = opts.label.trim();
    }
    const res = await state.client.request<SessionsCreateResult>("sessions.create", params);
    if (res?.ok && res.key) {
      await loadSessions(state, { includeLastMessage: true });
      return res;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadSessions(
  state: SessionsState,
  overrides?: {
    activeMinutes?: number;
    limit?: number;
    includeGlobal?: boolean;
    includeUnknown?: boolean;
    includeLastMessage?: boolean;
    includeDerivedTitles?: boolean;
  },
) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.sessionsLoading) {
    return;
  }
  state.sessionsLoading = true;
  state.sessionsError = null;
  try {
    const includeGlobal = overrides?.includeGlobal ?? state.sessionsIncludeGlobal;
    const includeUnknown = overrides?.includeUnknown ?? state.sessionsIncludeUnknown;
    const activeMinutes = overrides?.activeMinutes ?? toNumber(state.sessionsFilterActive, 0);
    const limit = overrides?.limit ?? toNumber(state.sessionsFilterLimit, 0);
    const params: Record<string, unknown> = {
      includeGlobal,
      includeUnknown,
    };
    if (activeMinutes > 0) {
      params.activeMinutes = activeMinutes;
    }
    if (limit > 0) {
      params.limit = limit;
    }
    if (overrides?.includeLastMessage) {
      params.includeLastMessage = true;
    }
    if (overrides?.includeDerivedTitles ?? overrides?.includeLastMessage) {
      params.includeDerivedTitles = true;
    }
    const res = await state.client.request<SessionsListResult | undefined>("sessions.list", params);
    if (res) {
      state.sessionsResult = res;
    }
  } catch (err) {
    state.sessionsError = String(err);
  } finally {
    state.sessionsLoading = false;
  }
}

export async function patchSession(
  state: SessionsState,
  key: string,
  patch: {
    label?: string | null;
    thinkingLevel?: string | null;
    verboseLevel?: string | null;
    reasoningLevel?: string | null;
    pinned?: boolean | null;
  },
) {
  if (!state.client || !state.connected) {
    return;
  }
  const params: Record<string, unknown> = { key };
  if ("label" in patch) {
    params.label = patch.label;
  }
  if ("thinkingLevel" in patch) {
    params.thinkingLevel = patch.thinkingLevel;
  }
  if ("verboseLevel" in patch) {
    params.verboseLevel = patch.verboseLevel;
  }
  if ("reasoningLevel" in patch) {
    params.reasoningLevel = patch.reasoningLevel;
  }
  if ("pinned" in patch) {
    params.pinned = patch.pinned;
  }
  try {
    await state.client.request("sessions.patch", params);
    await loadSessions(state, { includeLastMessage: true });
  } catch (err) {
    state.sessionsError = String(err);
  }
}

export async function deleteSession(state: SessionsState, key: string) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.sessionsLoading) {
    return;
  }
  const confirmed = await nativeConfirm(
    '确定删除此会话？',
  );
  if (!confirmed) {
    return;
  }
  state.sessionsLoading = true;
  state.sessionsError = null;
  try {
    await state.client.request("sessions.delete", { key, deleteTranscript: true });
    state.sessionsLoading = false;
    await loadSessions(state, { includeLastMessage: true });
  } catch (err) {
    state.sessionsError = String(err);
  } finally {
    state.sessionsLoading = false;
  }
}

export async function deleteSessions(state: SessionsState, keys: string[]) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.sessionsLoading) {
    return;
  }
  const safeKeys = Array.from(
    new Set(keys.filter((key) => key && key !== "agent.main.main")),
  );
  if (safeKeys.length === 0) {
    return;
  }
  const label =
    safeKeys.length === 1
      ? '确定删除此会话？'
      : `确定删除 ${safeKeys.length} 个会话？`;
  const confirmed = await nativeConfirm(
    `${label}`,
  );
  if (!confirmed) {
    return;
  }
  state.sessionsLoading = true;
  state.sessionsError = null;
  try {
    for (const key of safeKeys) {
      await state.client.request("sessions.delete", { key, deleteTranscript: true });
    }
    state.sessionsLoading = false;
    await loadSessions(state, { includeLastMessage: true });
  } catch (err) {
    state.sessionsError = String(err);
  } finally {
    state.sessionsLoading = false;
  }
}
