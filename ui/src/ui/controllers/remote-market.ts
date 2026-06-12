import { gatewayHttpBase } from "../gateway-url.ts";

const OPENOCTA_SITE_ORIGIN = "https://openocta.com";

function getBaseUrl(gatewayHost?: string): string {
  if (typeof window === "undefined") return "";
  if (gatewayHost?.trim()) {
    return gatewayHttpBase(gatewayHost);
  }
  if (window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

async function directSiteGet<T>(path: string): Promise<T> {
  const url = `${OPENOCTA_SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`OpenOcta 官网 API ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

async function localGet<T>(path: string, gatewayHost?: string, token?: string): Promise<T> {
  const base = getBaseUrl(gatewayHost);
  const url = base ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : path;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token?.trim()) headers["Authorization"] = `Bearer ${token.trim()}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("认证失败：网关令牌无效或未提供，请在 Overview 中配置正确的 Gateway Token");
      }
      const ct = (res.headers.get("Content-Type") ?? "").toLowerCase();
      if (ct.includes("application/json")) {
        const data = (await res.json()) as { error?: string; detail?: string };
        const msg = (data?.error ?? "").trim();
        const detail = (data?.detail ?? "").trim();
        throw new Error(msg ? (detail ? `${msg}（${detail}）` : msg) : `Gateway API ${res.status} for ${path}`);
      }
      const text = await res.text();
      throw new Error(`Gateway API ${res.status} for ${path}: ${text}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message === "Failed to fetch" ? "网络请求失败，请检查网络连接" : err.message;
      throw new Error(msg);
    }
    throw err;
  }
}

/** 优先走 Gateway 代理（同源），失败时回退 openocta.com 官网 API */
async function siteGet<T>(path: string, opts?: RemoteMarketOptions): Promise<T> {
  try {
    return await localGet<T>(path, opts?.gatewayHost, opts?.token);
  } catch (gatewayErr) {
    try {
      return await directSiteGet<T>(path);
    } catch {
      throw gatewayErr instanceof Error ? gatewayErr : new Error(String(gatewayErr));
    }
  }
}

export type EmployeeListItem = {
  id: number | string; // 远程为 number，本地为 "local:xxx"
  name: string;
  description?: string;
  logo_url?: string;
  category?: string;
  categories?: CategoryItem[];
  status?: string;
  tags?: string;
  enabled?: boolean; // 本地员工启用状态
  installed?: boolean; // 从 .install-metadata.json 合并，刷新后仍可识别
  localId?: string; // 安装后的本地 id
};

export type EmployeeDetail = EmployeeListItem & {
  readme?: string;
  config?: unknown;
  download_count?: number;
  created_at?: string;
  updated_at?: string;
  enabled?: boolean;
};

export type McpListItem = {
  /** 官网为 number；仅本地配置项为 `local:<serverKey>` */
  id: number | string;
  name: string;
  description?: string;
  logo_url?: string;
  category?: string;
  categories?: CategoryItem[];
  status?: string;
  tags?: string;
  installed?: boolean; // 从 .install-metadata.json 合并
  serverKey?: string; // 安装后的 mcp.servers key
};

export type McpDetail = McpListItem & {
  readme?: string;
  config?: unknown;
  download_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type CategoryItem = {
  id?: number;
  name: string;
  parent_id?: number;
  level?: number;
};

export type SkillListItem = {
  folder: string;
  name: string;
  description?: string;
  /** 官网/代理返回的封面图（相对路径经 resolveLogoUrl 后加载） */
  logo_url?: string;
  emoji?: string;
  categoryCn?: string;
  categories?: CategoryItem[];
  tags?: string;
  os?: string;
  status?: string;
  path?: string;
  installed?: boolean; // 从 .install-metadata.json 合并
};

export type SkillDetail = {
  content?: string;
  frontmatter?: Record<string, unknown>;
  logo_url?: string;
};

export type EduLesson = {
  id: number;
  title: string;
  duration?: string;
  link?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type EduCourse = {
  id: number;
  title: string;
  course_type?: string;
  duration?: string;
  link?: string;
  sort_order?: number;
  lessons?: EduLesson[];
  created_at?: string;
  updated_at?: string;
};

export type CategoryTreeNode = {
  id: number | string;
  name: string;
  scope?: string;
  parent_id?: number | string | null;
  level?: number;
  path?: string;
  is_top?: boolean;
  sort?: number;
  children?: CategoryTreeNode[];
};

export type EduCategory = {
  id: number;
  name: string;
  icon_class?: string;
  accent?: string;
  sort_order?: number;
  courses?: EduCourse[];
  created_at?: string;
  updated_at?: string;
};


/**
 * 将后端返回的 logo 路径解析为可用的 URL。
 * 若为相对路径（如 /uploads/logos/xxx.png），则通过 gateway 代理获取。
 * 开发环境（Vite 5173）下使用完整 gateway 地址，避免 img 请求发到前端 dev server。
 */
export function resolveLogoUrl(url: string | undefined, gatewayHost?: string): string | undefined {
  const v = (url ?? "").trim();
  if (!v) return undefined;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const path = v.startsWith("/uploads/") || v.startsWith("/") ? `/api/v1/site${v}` : v;
  const base = getBaseUrl(gatewayHost);
  return base ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : path;
}

function toQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    qs.set(k, trimmed);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export type RemoteMarketOptions = { gatewayHost?: string; token?: string };

export async function fetchEmployees(
  params: { q?: string; category?: string; status?: string },
  opts?: RemoteMarketOptions,
) {
  return await siteGet<EmployeeListItem[]>(`/api/v1/employees${toQuery(params)}`, opts);
}

export async function fetchEmployeeDetail(id: number | string, opts?: RemoteMarketOptions) {
  return await localGet<EmployeeDetail>(
    `/api/v1/employees/${encodeURIComponent(String(id))}`,
    opts?.gatewayHost,
    opts?.token,
  );
}

export async function fetchMcps(
  params: { q?: string; category?: string; status?: string },
  opts?: RemoteMarketOptions,
) {
  return await siteGet<McpListItem[]>(`/api/v1/mcps${toQuery(params)}`, opts);
}

export async function fetchMcpDetail(id: number | string, opts?: RemoteMarketOptions) {
  return await localGet<McpDetail>(`/api/v1/mcps/${encodeURIComponent(String(id))}`, opts?.gatewayHost, opts?.token);
}

export async function fetchSkills(
  params: { q?: string; category?: string; status?: string },
  opts?: RemoteMarketOptions,
) {
  return await siteGet<SkillListItem[]>(`/api/v1/skills${toQuery(params)}`, opts);
}

export async function fetchSkillDetail(folder: string, opts?: RemoteMarketOptions) {
  return await localGet<SkillDetail>(
    `/api/v1/skills/${encodeURIComponent(folder)}`,
    opts?.gatewayHost,
    opts?.token,
  );
}

export async function fetchCategories(
  scope: "skill" | "employee" | "tool" | "mcp",
  opts?: RemoteMarketOptions,
) {
  return await localGet<CategoryTreeNode[]>(
    `/api/v1/categories?scope=${encodeURIComponent(scope)}`,
    opts?.gatewayHost,
    opts?.token,
  );
}

export async function fetchEduCategories(opts?: RemoteMarketOptions) {
  return await localGet<EduCategory[]>(`/api/v1/edu/categories`, opts?.gatewayHost, opts?.token);
}

export async function fetchEduLessonDetail(id: number, opts?: RemoteMarketOptions) {
  return await localGet<EduLesson>(`/api/v1/edu/lessons/${id}`, opts?.gatewayHost, opts?.token);
}

export type InstallKind = "employee" | "skill" | "mcp";

export type InstallRequest = {
  kind: InstallKind;
  id: string;
  type?: string;
  category?: string;
};

export type InstallResponse = {
  ok?: boolean;
  id?: string;
  kind?: InstallKind;
  type?: string;
  category?: string;
  error?: string;
};

/**
 * 从官网安装插件（数字员工/技能/MCP）
 * 后端会调用 OPENOCTA_SITE_API_BASE_URL 下载 zip，解压并保存到本地，写入 type 和 from 标识
 */
export async function installFromSite(req: InstallRequest, opts?: RemoteMarketOptions): Promise<InstallResponse> {
  const base = getBaseUrl(opts?.gatewayHost);
  const url = base ? `${base}/api/v1/install` : "/api/v1/install";
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (opts?.token?.trim()) headers["Authorization"] = `Bearer ${opts.token.trim()}`;
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(req) });
    const data = (await res.json()) as InstallResponse;
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("认证失败：网关令牌无效或未提供，请在 Overview 中配置正确的 Gateway Token");
      }
      throw new Error(data?.error ?? `安装失败: ${res.status}`);
    }
    return data;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const msg = raw === "Failed to fetch" ? "网络请求失败，请检查网络连接" : raw;
    throw new Error(msg);
  }
}

