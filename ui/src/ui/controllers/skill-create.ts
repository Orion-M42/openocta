import { gatewayHttpBase } from "../gateway-url.ts";
import type { GatewayBrowserClient } from "../gateway.ts";

export type SkillAnalyzeResult = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  summary: string;
  allowedTools: string[];
  files: string[];
  skillMarkdown: string;
  zipFilename?: string;
};

export type SkillComposeMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SkillComposeFile = {
  path: string;
  content: string;
};

export type SkillCreateGatewayState = {
  gatewayUrl?: string;
  token?: string;
  client: GatewayBrowserClient | null;
  connected: boolean;
};

export type SkillUploadMeta = {
  name: string;
  description: string;
  category: string;
  tags: string;
  status: string;
};

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token?.trim()) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }
  return headers;
}

function gatewayBase(state: SkillCreateGatewayState): string {
  return state.gatewayUrl ? gatewayHttpBase(state.gatewayUrl) : "";
}

export async function analyzeSkillZip(
  state: SkillCreateGatewayState,
  file: File,
): Promise<{ ok: true; result: SkillAnalyzeResult } | { ok: false; error: string; template?: string }> {
  const url = gatewayBase(state);
  if (!url) {
    return { ok: false, error: "Gateway URL 未配置" };
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/skills/analyze`, {
      method: "POST",
      headers: authHeaders(state.token),
      body: form,
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      template?: string;
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      summary?: string;
      allowedTools?: string[];
      files?: string[];
      skillMarkdown?: string;
      zipFilename?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? `分析失败 (${res.status})`,
        template: data.template,
      };
    }
    return {
      ok: true,
      result: {
        name: data.name ?? "",
        description: data.description ?? "",
        category: data.category ?? "",
        tags: data.tags ?? [],
        summary: data.summary ?? "",
        allowedTools: data.allowedTools ?? [],
        files: data.files ?? [],
        skillMarkdown: data.skillMarkdown ?? "",
        zipFilename: data.zipFilename,
      },
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { ok: false, error: raw === "Failed to fetch" ? "网络请求失败" : raw };
  }
}

export async function publishSkillZip(
  state: SkillCreateGatewayState,
  file: File,
  meta: SkillUploadMeta,
): Promise<{ ok: boolean; error?: string }> {
  const url = gatewayBase(state);
  if (!url) {
    return { ok: false, error: "Gateway URL 未配置" };
  }
  const form = new FormData();
  form.append("file", file);
  form.append("name", meta.name.trim());
  form.append("description", meta.description.trim());
  form.append("category", meta.category.trim());
  form.append("tags", meta.tags.trim());
  form.append("status", meta.status.trim() || "open");
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/skills/publish`, {
      method: "POST",
      headers: authHeaders(state.token),
      body: form,
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `发布失败 (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { ok: false, error: raw === "Failed to fetch" ? "网络请求失败" : raw };
  }
}

export async function publishSkillMarkdown(
  state: SkillCreateGatewayState,
  markdown: string,
  meta: SkillUploadMeta,
): Promise<{ ok: boolean; error?: string }> {
  const url = gatewayBase(state);
  if (!url) {
    return { ok: false, error: "Gateway URL 未配置" };
  }
  const body = new URLSearchParams();
  body.set("name", meta.name.trim());
  body.set("description", meta.description.trim());
  body.set("category", meta.category.trim());
  body.set("tags", meta.tags.trim());
  body.set("status", meta.status.trim() || "open");
  body.set("markdown", markdown);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/skills/publish-markdown`, {
      method: "POST",
      headers: {
        ...authHeaders(state.token),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `发布失败 (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { ok: false, error: raw === "Failed to fetch" ? "网络请求失败" : raw };
  }
}

export type SkillComposeResult = {
  reply: string;
  draft: string;
  files: SkillComposeFile[];
  ready: boolean;
};

type SkillComposePayload = {
  reply?: string;
  draft?: string;
  files?: SkillComposeFile[];
  ready?: boolean;
  error?: string;
};

function parseComposeResult(
  data: SkillComposePayload,
): { ok: true; result: SkillComposeResult } | { ok: false; error: string } {
  const reply = data.reply ?? "";
  const draft = data.draft ?? "";
  if (!reply.trim() && !draft.trim()) {
    return { ok: false, error: data.error ?? "AI 未返回有效内容，请检查模型配置后重试" };
  }
  return {
    ok: true,
    result: {
      reply,
      draft,
      files: data.files ?? [],
      ready: Boolean(data.ready),
    },
  };
}

async function composeSkillViaHttp(
  state: SkillCreateGatewayState,
  body: Record<string, unknown>,
): Promise<{ ok: true; result: SkillComposeResult } | { ok: false; error: string }> {
  const url = gatewayBase(state);
  if (!url) {
    return { ok: false, error: "Gateway URL 未配置" };
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/skills/compose`, {
      method: "POST",
      headers: {
        ...authHeaders(state.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as SkillComposePayload & { ok?: boolean };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? `创作失败 (${res.status})` };
    }
    return parseComposeResult(data);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw === "Failed to fetch") {
      return { ok: false, error: "网络请求失败，请确认 Gateway 已启动且 CORS 已配置" };
    }
    return { ok: false, error: raw };
  }
}

export async function composeSkill(
  state: SkillCreateGatewayState,
  params: {
    messages: SkillComposeMessage[];
    draft?: string;
    scenario?: "free" | "upgrade";
    upgradeSkillKey?: string;
  },
): Promise<{ ok: true; result: SkillComposeResult } | { ok: false; error: string }> {
  const body = {
    messages: params.messages,
    draft: params.draft ?? "",
    scenario: params.scenario ?? "free",
    upgradeSkillKey: params.upgradeSkillKey ?? "",
    timeoutMs: 120000,
  };

  if (state.client && state.connected) {
    try {
      const res = await state.client.request<SkillComposePayload>("skills.compose", body);
      const parsed = parseComposeResult(res ?? {});
      if (parsed.ok) {
        return parsed;
      }
    } catch {
      // fall back to HTTP when WebSocket is unavailable or returns empty payload
    }
  }

  return composeSkillViaHttp(state, body);
}

export function defaultUploadMeta(analyze?: SkillAnalyzeResult | null): SkillUploadMeta {
  return {
    name: analyze?.name ?? "",
    description: analyze?.description ?? "",
    category: analyze?.category ?? "",
    tags: (analyze?.tags ?? []).join(", "),
    status: "open",
  };
}

export function skillNameFromDraft(draft: string): string {
  const m = draft.match(/^---[\s\S]*?\nname:\s*([^\n]+)\n[\s\S]*?---/);
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "");
}
