import { render } from "lit";
import { describe, expect, it } from "vitest";
import type { SessionsListResult } from "../types.ts";
import { renderSessions, type SessionsProps } from "./sessions.ts";

function buildResult(session: SessionsListResult["sessions"][number]): SessionsListResult {
  return {
    ts: Date.now(),
    path: "(multiple)",
    count: 1,
    defaults: { model: null, contextTokens: null },
    sessions: [session],
  };
}

function buildProps(result: SessionsListResult): SessionsProps {
  return {
    loading: false,
    result,
    error: null,
    activeMinutes: "",
    limit: "120",
    includeGlobal: false,
    includeUnknown: false,
    basePath: "",
    bulkMode: false,
    selectedKeys: [],
    onFiltersChange: () => undefined,
    onRefresh: () => undefined,
    onPatch: () => undefined,
    onDelete: () => undefined,
    onBulkModeToggle: () => undefined,
    onSelectionChange: () => undefined,
    onSelectAll: () => undefined,
    onClearSelection: () => undefined,
    onBulkDelete: () => undefined,
  };
}

describe("sessions view", () => {
  it("renders session source from channel field", async () => {
    const container = document.createElement("div");
    render(
      renderSessions(
        buildProps(
          buildResult({
            key: "feishu:group:oc_abc",
            kind: "group",
            channel: "feishu",
            updatedAt: Date.now(),
          }),
        ),
      ),
      container,
    );
    await Promise.resolve();

    expect(container.textContent).toContain("飞书");
  });

  it("renders token usage summary when totals are present", async () => {
    const container = document.createElement("div");
    render(
      renderSessions(
        buildProps(
          buildResult({
            key: "agent:main:main",
            kind: "direct",
            updatedAt: Date.now(),
            inputTokens: 120,
            outputTokens: 45,
            totalTokens: 165,
          }),
        ),
      ),
      container,
    );
    await Promise.resolve();

    expect(container.textContent).toContain("入 120 · 出 45 · 计 165");
  });
});
