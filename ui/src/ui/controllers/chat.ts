import type { GatewayBrowserClient } from "../gateway.ts";
import type * as v0_9 from "@a2ui/web_core/v0_9";
import type { ChatSessionResources } from "../chat/chat-resources.ts";
import { chatResourcesPayload } from "../chat/chat-resources.ts";
import type { ChatAttachment } from "../ui-types.ts";
import { extractText } from "../chat/message-extract.ts";
import {
  filterA2UIMessagesForSurface,
  removeA2UISurfaceFromMessages,
  resetChatA2UISurfaces,
} from "../chat/a2ui-bridge.ts";
import { canonicalGatewaySessionKey, gatewaySessionKeysEqual } from "../sessions/session-key-utils.js";
import { generateUUID } from "../uuid.ts";

export type ChatState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  sessionKey: string;
  chatLoading: boolean;
  chatMessages: unknown[];
  chatThinkingLevel: string | null;
  chatSending: boolean;
  chatMessage: string;
  chatAttachments: ChatAttachment[];
  chatRunId: string | null;
  chatRunPhase: "idle" | "thinking" | "tool" | "streaming";
  chatStream: string | null;
  chatStreamStartedAt: number | null;
  chatA2UIMessages: unknown[];
  /** Runs that ended (error/aborted/final); late delta/turn events are ignored. */
  chatTerminalRunIds?: string[];
  /** Last run that ended with error; used to dedupe history reload on complete. */
  chatErrorRunId?: string | null;
  lastError: string | null;
};

const CHAT_TERMINAL_RUN_LIMIT = 24;

function markChatRunTerminal(state: ChatState, runId: string) {
  const id = runId.trim();
  if (!id) {
    return;
  }
  const prev = state.chatTerminalRunIds ?? [];
  if (prev.includes(id)) {
    return;
  }
  state.chatTerminalRunIds = [...prev, id].slice(-CHAT_TERMINAL_RUN_LIMIT);
}

function isChatRunTerminal(state: ChatState, runId: string): boolean {
  const id = runId.trim();
  if (!id) {
    return false;
  }
  return (state.chatTerminalRunIds ?? []).includes(id);
}

function isA2UIOnlyAssistantContent(content: unknown): boolean {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every(
      (part) =>
        part != null &&
        typeof part === "object" &&
        (part as Record<string, unknown>).type === "a2ui",
    )
  );
}

function a2uiContentBlock(a2ui: unknown): { type: "a2ui"; a2ui: unknown } {
  return { type: "a2ui", a2ui };
}

/** Merge streamed A2UI blocks into chat history so they survive final/complete + history reload. */
function persistA2UIBlocksToChatMessages(state: ChatState, blocks: unknown[]) {
  if (blocks.length === 0) {
    return;
  }
  const messages = state.chatMessages;
  const last = messages[messages.length - 1] as Record<string, unknown> | undefined;
  const timestamp =
    typeof last?.timestamp === "number" ? last.timestamp : Date.now();

  if (last?.role === "assistant" && isA2UIOnlyAssistantContent(last.content)) {
    const existing = Array.isArray(last.content) ? [...last.content] : [];
    for (const block of blocks) {
      existing.push(a2uiContentBlock(block));
    }
    state.chatMessages = [...messages.slice(0, -1), { ...last, content: existing, timestamp }];
    return;
  }

  state.chatMessages = [
    ...messages,
    {
      role: "assistant",
      content: blocks.map((block) => a2uiContentBlock(block)),
      timestamp,
    },
  ];
}

function applyA2UIChatEvent(state: ChatState, payload: ChatEventPayload) {
  if (payload.a2ui == null) {
    return;
  }
  state.chatA2UIMessages = [...state.chatA2UIMessages, payload.a2ui];
  state.chatRunPhase = "streaming";
  persistA2UIBlocksToChatMessages(state, [payload.a2ui]);
}

function mergeLiveA2UIIntoFinalMessage(state: ChatState, finalMessage: Record<string, unknown>) {
  const pending = state.chatA2UIMessages;
  if (pending.length === 0) {
    return finalMessage;
  }
  const content = Array.isArray(finalMessage.content) ? [...finalMessage.content] : [];
  const existingA2UI = content.filter(
    (part) =>
      part != null &&
      typeof part === "object" &&
      (part as Record<string, unknown>).type === "a2ui",
  ).length;
  if (existingA2UI >= pending.length) {
    return finalMessage;
  }
  for (let i = existingA2UI; i < pending.length; i++) {
    content.push(a2uiContentBlock(pending[i]));
  }
  return { ...finalMessage, content };
}

function trimTrailingA2UIOnlyMessages(messages: unknown[]): unknown[] {
  let trimmed = messages;
  while (trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1] as Record<string, unknown> | undefined;
    if (last?.role === "assistant" && isA2UIOnlyAssistantContent(last.content)) {
      trimmed = trimmed.slice(0, -1);
    } else {
      break;
    }
  }
  return trimmed;
}

/** Submit an A2UI button/action and start a new agent run on the gateway. */
export async function dispatchA2UIActionFromChat(
  state: ChatState,
  action: v0_9.A2uiClientAction,
): Promise<boolean> {
  if (!state.client || !state.connected) {
    state.lastError = "未连接网关，无法提交操作";
    return false;
  }
  const idempotencyKey = generateUUID();
  const userAction = {
    name: action.name,
    surfaceId: action.surfaceId,
    sourceComponentId: action.sourceComponentId,
    timestamp: new Date().toISOString(),
    context: { ...action.context },
  };
  const surfaceId = action.surfaceId.trim();
  if (surfaceId) {
    state.chatMessages = removeA2UISurfaceFromMessages(state.chatMessages, surfaceId);
    state.chatA2UIMessages = filterA2UIMessagesForSurface(state.chatA2UIMessages, surfaceId);
  }

  state.chatSending = true;
  state.lastError = null;
  try {
    const res = await state.client.request<{ runId?: string }>("chat.a2ui.action", {
      sessionKey: canonicalGatewaySessionKey(state.sessionKey),
      userAction,
      idempotencyKey,
    });
    const runId =
      typeof res?.runId === "string" && res.runId.trim() !== "" ? res.runId.trim() : idempotencyKey;
    state.chatRunId = runId;
    state.chatErrorRunId = null;
    state.chatRunPhase = "thinking";
    state.chatStream = "";
    state.chatStreamStartedAt = Date.now();
    state.chatA2UIMessages = [];
    resetChatA2UISurfaces();
    return true;
  } catch (err) {
    state.lastError = String(err);
    return false;
  } finally {
    state.chatSending = false;
  }
}

export type ChatEventPayload = {
  runId: string;
  sessionKey: string;
  state: "delta" | "turn" | "final" | "complete" | "aborted" | "error" | "a2ui";
  message?: unknown;
  a2ui?: unknown;
  errorMessage?: string;
};

/** Last N messages for chat.history and thread rendering (gateway hard-caps above this). */
export const CHAT_HISTORY_LIMIT = 500;

export async function readSessionAttachment(state: ChatState, path: string) {
  if (!state.client || !state.connected) {
    return null;
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return await state.client.request<Record<string, unknown>>("chat.attachment.read", {
      sessionKey: canonicalGatewaySessionKey(state.sessionKey),
      path: trimmed,
    });
  } catch {
    return null;
  }
}

export async function loadChatHistory(state: ChatState) {
  if (!state.client || !state.connected) {
    return;
  }
  state.chatLoading = true;
  state.lastError = null;
  try {
    const res = await state.client.request<{ messages?: Array<unknown>; thinkingLevel?: string }>(
      "chat.history",
      {
        sessionKey: canonicalGatewaySessionKey(state.sessionKey),
        limit: CHAT_HISTORY_LIMIT,
      },
    );
    state.chatMessages = Array.isArray(res.messages) ? res.messages : [];
    state.chatThinkingLevel = res.thinkingLevel ?? null;
  } catch (err) {
    state.lastError = String(err);
  } finally {
    state.chatLoading = false;
  }
}

function dataUrlToBase64(dataUrl: string): { content: string; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return null;
  }
  return { mimeType: match[1], content: match[2] };
}

export async function sendChatMessage(
  state: ChatState,
  message: string,
  attachments?: ChatAttachment[],
  modelRef?: string | null,
  resources?: ChatSessionResources,
): Promise<string | null> {
  if (!state.client || !state.connected) {
    return null;
  }
  const msg = message.trim();
  const hasAttachments = attachments && attachments.length > 0;
  if (!msg && !hasAttachments) {
    return null;
  }

  const now = Date.now();

  // Build user message content blocks
  const contentBlocks: Array<{ type: string; text?: string; source?: unknown }> = [];
  if (msg) {
    contentBlocks.push({ type: "text", text: msg });
  }
  // Add image previews to the message for display
  if (hasAttachments) {
    for (const att of attachments) {
      const kind = att.kind ?? (att.mimeType?.startsWith("image/") ? "image" : "file");
      if (kind === "image") {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: att.mimeType, data: att.dataUrl },
        });
      } else {
        contentBlocks.push({
          type: "text",
          text: `[附件] ${att.filename || "file"} (${att.mimeType || "application/octet-stream"})`,
        });
      }
    }
  }

  state.chatMessages = [
    ...state.chatMessages,
    {
      role: "user",
      content: contentBlocks,
      timestamp: now,
    },
  ];

  state.chatSending = true;
  state.lastError = null;
  const runId = generateUUID();
  state.chatRunId = runId;
  state.chatErrorRunId = null;
  state.chatRunPhase = "thinking";
  state.chatStream = "";
  state.chatStreamStartedAt = now;
  state.chatA2UIMessages = [];
  resetChatA2UISurfaces();

  // Convert attachments to API format
  const apiAttachments = hasAttachments
    ? attachments
        .map((att) => {
          const parsed = dataUrlToBase64(att.dataUrl);
          if (!parsed) {
            return null;
          }
          const kind = att.kind ?? (att.mimeType?.startsWith("image/") ? "image" : "file");
          return {
            type: kind,
            mimeType: parsed.mimeType,
            content: parsed.content,
            filename: att.filename,
            sizeBytes: att.sizeBytes,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null)
    : undefined;

  const trimmedModel = typeof modelRef === "string" ? modelRef.trim() : "";

  try {
    await state.client.request("chat.send", {
      sessionKey: canonicalGatewaySessionKey(state.sessionKey),
      message: msg,
      deliver: false,
      idempotencyKey: runId,
      attachments: apiAttachments,
      modelRef: trimmedModel || undefined,
      resources: chatResourcesPayload(
        resources ?? { configured: false, skillKeys: [], mcpServers: [], webSearch: false },
      ),
    });
    return runId;
  } catch (err) {
    const error = String(err);
    state.chatRunId = null;
    state.chatRunPhase = "idle";
    state.chatStream = null;
    state.chatStreamStartedAt = null;
    state.lastError = error;
    state.chatMessages = [
      ...state.chatMessages,
      {
        role: "assistant",
        content: [{ type: "text", text: "Error: " + error }],
        timestamp: Date.now(),
      },
    ];
    return null;
  } finally {
    state.chatSending = false;
  }
}

export async function abortChatRun(state: ChatState): Promise<boolean> {
  if (!state.client || !state.connected) {
    return false;
  }
  const runId = state.chatRunId;
  try {
    const sk = canonicalGatewaySessionKey(state.sessionKey);
    await state.client.request("chat.abort", runId ? { sessionKey: sk, runId } : { sessionKey: sk });
    // 网关会推送 chat/aborted，但若事件稍晚到达，先清本地状态以免「停止」后仍显示进行中且无法再次发送
    if (runId && state.chatRunId === runId) {
      state.chatRunId = null;
      state.chatRunPhase = "idle";
      state.chatStream = null;
      state.chatStreamStartedAt = null;
    }
    return true;
  } catch (err) {
    state.lastError = String(err);
    return false;
  }
}

export function handleChatEvent(state: ChatState, payload?: ChatEventPayload) {
  if (!payload) {
    return null;
  }
  if (!gatewaySessionKeysEqual(payload.sessionKey, state.sessionKey)) {
    return null;
  }

  const runId = typeof payload.runId === "string" ? payload.runId.trim() : "";

  // Final from another run (e.g. sub-agent announce): refresh history to show new message.
  // See https://github.com/openocta/openocta/issues/1909
  if (runId && state.chatRunId && runId !== state.chatRunId) {
    if (payload.state === "final" || payload.state === "complete") {
      return payload.state;
    }
    return null;
  }

  // Late A2UI after final/complete: still merge into history (common when final wins the race).
  if (payload.state === "a2ui" && payload.a2ui != null) {
    if (
      !runId ||
      !state.chatRunId ||
      state.chatRunId === runId ||
      isChatRunTerminal(state, runId)
    ) {
      applyA2UIChatEvent(state, payload);
      return "a2ui";
    }
    return null;
  }

  // Ignore stale streaming events after a run already ended (timeout/error/abort/final).
  if (runId && isChatRunTerminal(state, runId)) {
    if (payload.state === "complete") {
      return "complete";
    }
    return null;
  }

  // After run ends locally, drop orphan delta/turn from the same run (keep a2ui — handled above).
  if (runId && !state.chatRunId && (payload.state === "delta" || payload.state === "turn")) {
    return null;
  }

  if (payload.state === "delta") {
    const next = extractText(payload.message);
    if (typeof next === "string") {
      const current = state.chatStream ?? "";
      if (!current || next.length >= current.length) {
        state.chatStream = next;
        state.chatRunPhase = "streaming";
      }
    }
  } else if (payload.state === "turn") {
    if (payload.message && typeof payload.message === "object") {
      state.chatMessages = [...state.chatMessages, payload.message];
    }
    state.chatStream = null;
    state.chatRunPhase = "tool";
  } else if (payload.state === "final") {
    if (payload.message && typeof payload.message === "object") {
      const merged = mergeLiveA2UIIntoFinalMessage(
        state,
        payload.message as Record<string, unknown>,
      );
      state.chatMessages = [...trimTrailingA2UIOnlyMessages(state.chatMessages), merged];
    } else if (state.chatA2UIMessages.length > 0) {
      persistA2UIBlocksToChatMessages(state, state.chatA2UIMessages);
    }
    state.chatStream = null;
    if (runId) {
      markChatRunTerminal(state, runId);
    }
    state.chatRunId = null;
    state.chatRunPhase = "idle";
    state.chatStreamStartedAt = null;
    state.chatA2UIMessages = [];
    resetChatA2UISurfaces();
  } else if (payload.state === "aborted") {
    state.chatStream = null;
    if (runId) {
      markChatRunTerminal(state, runId);
    }
    state.chatRunId = null;
    state.chatRunPhase = "idle";
    state.chatStreamStartedAt = null;
    state.chatA2UIMessages = [];
    resetChatA2UISurfaces();
  } else if (payload.state === "complete") {
    state.chatStream = null;
    if (runId) {
      markChatRunTerminal(state, runId);
    }
    state.chatRunId = null;
    state.chatRunPhase = "idle";
    state.chatStreamStartedAt = null;
    state.chatA2UIMessages = [];
    resetChatA2UISurfaces();
  } else if (payload.state === "error") {
    state.chatStream = null;
    if (runId) {
      markChatRunTerminal(state, runId);
      state.chatErrorRunId = runId;
    }
    state.chatRunId = null;
    state.chatRunPhase = "idle";
    state.chatStreamStartedAt = null;
    state.chatA2UIMessages = [];
    resetChatA2UISurfaces();
    // Error text is appended to transcript; reload history instead of duplicating in callout.
    state.lastError = null;
  }
  return payload.state;
}
