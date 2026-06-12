import { describe, expect, it, vi } from "vitest";
const nativeConfirmMock = vi.hoisted(() => vi.fn());
vi.mock("../native-dialog-bridge.ts", () => ({
  nativeConfirm: nativeConfirmMock,
}));
import { createSession, deleteSession, deleteSessions, type SessionsState } from "./sessions.ts";

function createState(requestImpl: (method: string, params?: unknown) => unknown): SessionsState {
  return {
    client: {
      request: vi.fn((method: string, params?: unknown) => Promise.resolve(requestImpl(method, params))),
    } as unknown as SessionsState["client"],
    connected: true,
    sessionsLoading: false,
    sessionsResult: null,
    sessionsError: null,
    sessionsFilterActive: "",
    sessionsFilterLimit: "",
    sessionsIncludeGlobal: false,
    sessionsIncludeUnknown: false,
  };
}

describe("sessions controller", () => {
  it("reloads sessions with last-message previews after creating a session", async () => {
    const requests: Array<{ method: string; params?: unknown }> = [];
    const state = createState((method, params) => {
      requests.push({ method, params });
      if (method === "sessions.create") {
        return {
          ok: true,
          key: "custom:test",
          path: "/sessions/custom:test",
          sessionId: "session-1",
          entry: {},
        };
      }
      if (method === "sessions.list") {
        return {
          ts: 0,
          path: "",
          count: 0,
          defaults: { model: null, contextTokens: null },
          sessions: [],
        };
      }
      return undefined;
    });

    await createSession(state);

    expect(requests).toEqual([
      { method: "sessions.create", params: {} },
      {
        method: "sessions.list",
        params: {
          includeGlobal: false,
          includeUnknown: false,
          includeLastMessage: true,
          includeDerivedTitles: true,
        },
      },
    ]);
  });

  it("reloads sessions with last-message previews after deleting a session", async () => {
    nativeConfirmMock.mockResolvedValueOnce(true);
    const requests: Array<{ method: string; params?: unknown }> = [];
    const state = createState((method, params) => {
      requests.push({ method, params });
      if (method === "sessions.delete") {
        return { ok: true };
      }
      if (method === "sessions.list") {
        return {
          ts: 0,
          path: "",
          count: 0,
          defaults: { model: null, contextTokens: null },
          sessions: [],
        };
      }
      return undefined;
    });

    await deleteSession(state, "custom:test");

    expect(requests).toEqual([
      { method: "sessions.delete", params: { key: "custom:test", deleteTranscript: true } },
      {
        method: "sessions.list",
        params: {
          includeGlobal: false,
          includeUnknown: false,
          includeLastMessage: true,
          includeDerivedTitles: true,
        },
      },
    ]);
  });

  it("reloads sessions with last-message previews after bulk deleting sessions", async () => {
    nativeConfirmMock.mockResolvedValueOnce(true);
    const requests: Array<{ method: string; params?: unknown }> = [];
    const state = createState((method, params) => {
      requests.push({ method, params });
      if (method === "sessions.delete") {
        return { ok: true };
      }
      if (method === "sessions.list") {
        return {
          ts: 0,
          path: "",
          count: 0,
          defaults: { model: null, contextTokens: null },
          sessions: [],
        };
      }
      return undefined;
    });

    await deleteSessions(state, ["custom:a", "custom:b"]);

    expect(requests).toEqual([
      { method: "sessions.delete", params: { key: "custom:a", deleteTranscript: true } },
      { method: "sessions.delete", params: { key: "custom:b", deleteTranscript: true } },
      {
        method: "sessions.list",
        params: {
          includeGlobal: false,
          includeUnknown: false,
          includeLastMessage: true,
          includeDerivedTitles: true,
        },
      },
    ]);
  });
});
