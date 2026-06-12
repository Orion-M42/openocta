import { describe, expect, it } from "vitest";
import {
  a2uiMessageSurfaceId,
  filterA2UIMessagesForSurface,
  removeA2UISurfaceFromMessages,
} from "../chat/a2ui-bridge.ts";
import { handleChatEvent, type ChatEventPayload, type ChatState } from "./chat.ts";

function createState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    chatAttachments: [],
    chatLoading: false,
    chatMessage: "",
    chatMessages: [],
    chatRunId: null,
    chatRunPhase: "idle",
    chatSending: false,
    chatStream: null,
    chatStreamStartedAt: null,
    chatA2UIMessages: [],
    chatThinkingLevel: null,
    client: null,
    connected: true,
    lastError: null,
    sessionKey: "main",
    ...overrides,
  };
}

describe("handleChatEvent", () => {
  it("returns null when payload is missing", () => {
    const state = createState();
    expect(handleChatEvent(state, undefined)).toBe(null);
  });

  it("returns null when sessionKey does not match", () => {
    const state = createState({ sessionKey: "main" });
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "other",
      state: "final",
    };
    expect(handleChatEvent(state, payload)).toBe(null);
  });

  it("returns null for delta from another run", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-user",
      chatStream: "Hello",
    });
    const payload: ChatEventPayload = {
      runId: "run-announce",
      sessionKey: "main",
      state: "delta",
      message: { role: "assistant", content: [{ type: "text", text: "Done" }] },
    };
    expect(handleChatEvent(state, payload)).toBe(null);
    expect(state.chatRunId).toBe("run-user");
    expect(state.chatStream).toBe("Hello");
  });

  it("returns 'final' for final from another run (e.g. sub-agent announce) without clearing state", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-user",
      chatStream: "Working...",
      chatStreamStartedAt: 123,
    });
    const payload: ChatEventPayload = {
      runId: "run-announce",
      sessionKey: "main",
      state: "final",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Sub-agent findings" }],
      },
    };
    expect(handleChatEvent(state, payload)).toBe("final");
    expect(state.chatRunId).toBe("run-user");
    expect(state.chatStream).toBe("Working...");
    expect(state.chatStreamStartedAt).toBe(123);
  });

  it("accumulates a2ui events during an active run", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-1",
      chatStream: "",
      chatStreamStartedAt: 100,
    });
    const msg = { createSurface: { surfaceId: "main", catalogId: "basic" } };
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "a2ui",
      a2ui: msg,
    };
    expect(handleChatEvent(state, payload)).toBe("a2ui");
    expect(state.chatA2UIMessages).toEqual([msg]);
    expect(state.chatMessages).toHaveLength(1);
  });

  it("merges multiple a2ui events into one assistant history message", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-1",
    });
    const msg1 = { createSurface: { surfaceId: "main", catalogId: "basic" } };
    const msg2 = {
      updateComponents: { surfaceId: "main", components: [{ id: "root", component: "Text", text: "Hi" }] },
    };
    handleChatEvent(state, {
      runId: "run-1",
      sessionKey: "main",
      state: "a2ui",
      a2ui: msg1,
    });
    handleChatEvent(state, {
      runId: "run-1",
      sessionKey: "main",
      state: "a2ui",
      a2ui: msg2,
    });
    expect(state.chatA2UIMessages).toEqual([msg1, msg2]);
    expect(state.chatMessages).toHaveLength(1);
    const content = (state.chatMessages[0] as { content: unknown[] }).content;
    expect(content).toHaveLength(2);
  });

  it("accepts late a2ui after final and keeps blocks in history", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: null,
      chatTerminalRunIds: ["run-1"],
    });
    const msg = { createSurface: { surfaceId: "main", catalogId: "basic" } };
    expect(
      handleChatEvent(state, {
        runId: "run-1",
        sessionKey: "main",
        state: "a2ui",
        a2ui: msg,
      }),
    ).toBe("a2ui");
    expect(state.chatMessages).toHaveLength(1);
    expect(state.chatA2UIMessages).toEqual([msg]);
  });

  it("merges live a2ui into final message when final lacks blocks", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-1",
      chatA2UIMessages: [
        { createSurface: { surfaceId: "main", catalogId: "basic" } },
        { updateComponents: { surfaceId: "main", components: [] } },
      ],
    });
    handleChatEvent(state, {
      runId: "run-1",
      sessionKey: "main",
      state: "final",
      message: { role: "assistant", content: [{ type: "text", text: "done" }], timestamp: 1 },
    });
    const finalMsg = state.chatMessages[state.chatMessages.length - 1] as {
      content: Array<{ type: string }>;
    };
    expect(finalMsg.content.filter((part) => part.type === "a2ui")).toHaveLength(2);
    expect(state.chatA2UIMessages).toEqual([]);
  });

  it("processes final from own run and clears state", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-1",
      chatStream: "Reply",
      chatStreamStartedAt: 100,
    });
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "final",
    };
    expect(handleChatEvent(state, payload)).toBe("final");
    expect(state.chatRunId).toBe(null);
    expect(state.chatStream).toBe(null);
    expect(state.chatStreamStartedAt).toBe(null);
  });

  it("accepts chat events when gateway sessionKey is lowercase but UI keeps original casing", () => {
    const state = createState({
      sessionKey: "agent:main:employee:ClickHouse:run:abc",
      chatRunId: "run-1",
      chatStream: "",
      chatStreamStartedAt: 100,
    });
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "agent:main:employee:clickhouse:run:abc",
      state: "final",
    };
    expect(handleChatEvent(state, payload)).toBe("final");
    expect(state.chatRunId).toBe(null);
    expect(state.chatStream).toBe(null);
  });

  it("ignores late turn events after run ended with error", () => {
    const fileMessage = {
      role: "assistant",
      content: [{ type: "file", path: "attachments/report.html" }],
      timestamp: Date.now(),
    };
    const state = createState({
      sessionKey: "main",
      chatRunId: null,
      chatMessages: [{ role: "assistant", content: [{ type: "text", text: "[错误] 对话已超时" }] }],
      chatTerminalRunIds: ["run-timeout"],
      chatErrorRunId: "run-timeout",
    });
    const payload: ChatEventPayload = {
      runId: "run-timeout",
      sessionKey: "main",
      state: "turn",
      message: fileMessage,
    };
    expect(handleChatEvent(state, payload)).toBe(null);
    expect(state.chatMessages).toHaveLength(1);
  });

  it("marks run terminal on error and clears lastError for transcript reload", () => {
    const state = createState({
      sessionKey: "main",
      chatRunId: "run-1",
      chatStream: "partial",
      chatStreamStartedAt: 100,
    });
    const payload: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "error",
      errorMessage: "已超时",
    };
    expect(handleChatEvent(state, payload)).toBe("error");
    expect(state.chatRunId).toBe(null);
    expect(state.chatTerminalRunIds).toContain("run-1");
    expect(state.chatErrorRunId).toBe("run-1");
    expect(state.lastError).toBe(null);
  });
});

describe("removeA2UISurfaceFromMessages", () => {
  it("removes a2ui blocks for the acted surface but keeps other content", () => {
    const create = { createSurface: { surfaceId: "confirm", catalogId: "basic" } };
    const update = {
      updateComponents: {
        surfaceId: "confirm",
        components: [{ id: "btn", component: "Button", label: "确认执行" }],
      },
    };
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "请确认" },
          { type: "a2ui", a2ui: create },
          { type: "a2ui", a2ui: update },
        ],
      },
    ];
    const next = removeA2UISurfaceFromMessages(messages, "confirm");
    expect(next).toHaveLength(1);
    const content = (next[0] as { content: Array<{ type: string }> }).content;
    expect(content).toEqual([{ type: "text", text: "请确认" }]);
  });

  it("filters live a2ui message buffers by surface id", () => {
    const blocks = [
      { createSurface: { surfaceId: "confirm", catalogId: "basic" } },
      { createSurface: { surfaceId: "other", catalogId: "basic" } },
    ];
    const filtered = filterA2UIMessagesForSurface(blocks, "confirm");
    expect(filtered).toHaveLength(1);
    expect(a2uiMessageSurfaceId(filtered[0])).toBe("other");
  });
});
