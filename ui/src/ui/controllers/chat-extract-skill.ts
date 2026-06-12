import type { GatewayBrowserClient } from "../gateway.ts";
import { canonicalGatewaySessionKey } from "../sessions/session-key-utils.js";

export type ChatExtractSkillState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  sessionKey: string;
  chatExtractSkillLoading: boolean;
  chatExtractSkillError: string | null;
  chatExtractSkillMarkdown: string | null;
  chatExtractSkillFilename: string | null;
  chatExtractSkillOpen: boolean;
};

export async function extractChatSkill(state: ChatExtractSkillState): Promise<boolean> {
  if (!state.client || !state.connected) {
    state.chatExtractSkillError = "未连接网关";
    return false;
  }
  state.chatExtractSkillLoading = true;
  state.chatExtractSkillError = null;
  try {
    const res = await state.client.request<{ markdown?: string; filename?: string }>("chat.extractSkill", {
      sessionKey: canonicalGatewaySessionKey(state.sessionKey),
    });
    const markdown = typeof res.markdown === "string" ? res.markdown.trim() : "";
    if (!markdown) {
      state.chatExtractSkillError = "提炼结果为空";
      return false;
    }
    state.chatExtractSkillMarkdown = markdown;
    state.chatExtractSkillFilename =
      typeof res.filename === "string" && res.filename.trim() ? res.filename.trim() : "extracted-skill.md";
    state.chatExtractSkillOpen = true;
    return true;
  } catch (err) {
    state.chatExtractSkillError = String(err);
    return false;
  } finally {
    state.chatExtractSkillLoading = false;
  }
}

export function downloadExtractedSkill(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "extracted-skill.md";
  a.click();
  URL.revokeObjectURL(url);
}
