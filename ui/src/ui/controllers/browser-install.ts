import { gatewayHttpBase } from "../gateway-url.ts";

export type BrowserInstallProgress = {
  phase?: string;
  percent?: number;
  message?: string;
};

export type BrowserInstallStatus = {
  ok?: boolean;
  installed?: boolean;
  installing?: boolean;
  installDone?: boolean;
  installError?: string;
  installDir?: string;
  executablePath?: string;
  chromiumError?: string;
  progress?: BrowserInstallProgress;
  message?: string;
};

function authHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const tok = (token ?? "").trim();
  if (tok) {
    headers.Authorization = `Bearer ${tok}`;
    headers["X-Gateway-Token"] = tok;
  }
  return headers;
}

export async function fetchBrowserInstallStatus(opts: {
  gatewayHost: string;
  token: string;
}): Promise<{ ok: boolean; data?: BrowserInstallStatus; error?: string }> {
  const base = gatewayHttpBase(opts.gatewayHost.trim());
  if (!base) {
    return { ok: false, error: "未配置网关地址（Gateway URL）" };
  }
  const url = `${base.replace(/\/$/, "")}/api/browser/install/status`;
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: authHeaders(opts.token) });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  let data: BrowserInstallStatus = {};
  try {
    data = (await res.json()) as BrowserInstallStatus;
  } catch {
    // ignore
  }
  if (!res.ok) {
    return { ok: false, error: data.message ?? `请求失败（HTTP ${res.status}）`, data };
  }
  return { ok: true, data };
}

export async function startBrowserInstall(opts: {
  gatewayHost: string;
  token: string;
}): Promise<{ ok: boolean; data?: BrowserInstallStatus; error?: string }> {
  const base = gatewayHttpBase(opts.gatewayHost.trim());
  if (!base) {
    return { ok: false, error: "未配置网关地址（Gateway URL）" };
  }
  const url = `${base.replace(/\/$/, "")}/api/browser/install`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders(opts.token), "Content-Type": "application/json" },
      body: "{}",
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  let data: BrowserInstallStatus & { started?: boolean } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    // ignore
  }
  if (!res.ok || data.ok === false) {
    return { ok: false, error: data.message ?? `请求失败（HTTP ${res.status}）`, data };
  }
  return { ok: true, data };
}

export async function cancelBrowserInstall(opts: {
  gatewayHost: string;
  token: string;
}): Promise<{ ok: boolean; data?: BrowserInstallStatus; error?: string }> {
  const base = gatewayHttpBase(opts.gatewayHost.trim());
  if (!base) {
    return { ok: false, error: "未配置网关地址（Gateway URL）" };
  }
  const url = `${base.replace(/\/$/, "")}/api/browser/install/cancel`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders(opts.token), "Content-Type": "application/json" },
      body: "{}",
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  let payload: { ok?: boolean; cancelled?: boolean; status?: BrowserInstallStatus; message?: string } = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    // ignore
  }
  const status = payload.status;
  if (!res.ok || payload.ok === false) {
    return { ok: false, error: payload.message ?? status?.message ?? `请求失败（HTTP ${res.status}）`, data: status };
  }
  return { ok: true, data: status };
}
