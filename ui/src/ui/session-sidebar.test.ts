import { describe, expect, it } from "vitest";
import {
  compareSessionSidebarRows,
  isAutoCustomSessionLabel,
  resolveSessionSidebarSubtitle,
  resolveSessionSidebarTitle,
} from "./session-sidebar.ts";

describe("session-sidebar", () => {
  it("detects auto custom session labels", () => {
    expect(isAutoCustomSessionLabel("自定义会话1")).toBe(true);
    expect(isAutoCustomSessionLabel("我的会话")).toBe(false);
  });

  it("uses derived title for custom sessions", () => {
    const title = resolveSessionSidebarTitle({
      key: "custom:abc",
      derivedTitle: "帮我写一份周报",
      label: "自定义会话3",
    });
    expect(title).toBe("帮我写一份周报");
  });

  it("falls back to new chat for empty custom sessions", () => {
    const title = resolveSessionSidebarTitle({
      key: "custom:abc",
      label: "自定义会话3",
    });
    expect(title).toBe("新对话");
  });

  it("sorts pinned sessions first", () => {
    const rows = [
      { pinnedAt: 0, updatedAt: 300 },
      { pinnedAt: 100, updatedAt: 100 },
      { pinnedAt: 0, updatedAt: 200 },
    ];
    rows.sort(compareSessionSidebarRows);
    expect(rows[0].pinnedAt).toBe(100);
    expect(rows[1].updatedAt).toBe(300);
  });

  it("hides duplicate subtitle", () => {
    expect(resolveSessionSidebarSubtitle("你好", "你好")).toBe("");
    expect(resolveSessionSidebarSubtitle("你好", "世界")).toBe("世界");
  });
});
