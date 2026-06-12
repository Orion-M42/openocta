import { gatewayHttpBase } from "../gateway-url.ts";

export type BrowserPreviewTab = {
  targetId?: string;
  url?: string;
  title?: string;
  label?: string;
};

export type BrowserPreviewState = {
  ok?: boolean;
  runMode?: string;
  previewEnabled?: boolean;
  running?: boolean;
  chromiumReady?: boolean;
  chromiumError?: string;
  tabCount?: number;
  targetId?: string;
  suggestedTargetId?: string;
  url?: string;
  title?: string;
  snapshot?: string;
  text?: string;
  refCount?: number;
  screenshotBase64?: string;
  screenshotFormat?: string;
  screenshotError?: string;
  tabs?: BrowserPreviewTab[];
  message?: string;
  detail?: string;
};

export async function fetchBrowserPreview(opts: {
  gatewayHost: string;
  token: string;
  targetId?: string;
  includeScreenshot?: boolean;
}): Promise<{ ok: boolean; data?: BrowserPreviewState; error?: string }> {
  const base = gatewayHttpBase(opts.gatewayHost.trim());
  if (!base) {
    return { ok: false, error: "未配置网关地址（Gateway URL）" };
  }
  const params = new URLSearchParams();
  if (opts.targetId?.trim()) {
    params.set("targetId", opts.targetId.trim());
  }
  if (opts.includeScreenshot === false) {
    params.set("screenshot", "0");
  }
  const qs = params.toString();
  const url = `${base.replace(/\/$/, "")}/api/browser/preview${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const tok = (opts.token ?? "").trim();
  if (tok) {
    headers.Authorization = `Bearer ${tok}`;
    headers["X-Gateway-Token"] = tok;
  }
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  let data: BrowserPreviewState = {};
  try {
    data = (await res.json()) as BrowserPreviewState;
  } catch {
    // ignore
  }
  if (!res.ok || data.ok === false) {
    return {
      ok: false,
      error: data.message ?? data.detail ?? `请求失败（HTTP ${res.status}）`,
      data,
    };
  }
  return { ok: true, data };
}
