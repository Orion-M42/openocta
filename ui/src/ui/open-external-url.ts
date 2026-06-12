export const SHELL_MODE_QUERY_PARAM = "_shell";
export const DESKTOP_SHELL_QUERY_VALUE = "d";
export const SHELL_MODE_SESSION_KEY = "openocta.shell";

export type ShellMode = "browser" | "desktop";

function normalizeExternalHref(url: string): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

export function bootstrapShellModeFromUrl() {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(SHELL_MODE_QUERY_PARAM);
  if (!raw) {
    return;
  }
  if (raw === DESKTOP_SHELL_QUERY_VALUE) {
    try {
      window.sessionStorage.setItem(SHELL_MODE_SESSION_KEY, "desktop");
    } catch {
      /* ignore */
    }
  }
  url.searchParams.delete(SHELL_MODE_QUERY_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
}

export function getShellMode(): ShellMode {
  if (typeof window === "undefined") {
    return "browser";
  }
  try {
    return window.sessionStorage.getItem(SHELL_MODE_SESSION_KEY) === "desktop"
      ? "desktop"
      : "browser";
  } catch {
    return "browser";
  }
}

export function isDesktopShell(): boolean {
  return getShellMode() === "desktop";
}

export function getExternalUrlOpenMode(): "current-window" | "new-window" {
  return isDesktopShell() ? "current-window" : "new-window";
}

function findAnchorFromEvent(event: MouseEvent): HTMLAnchorElement | null {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  for (const node of path) {
    if (node instanceof HTMLAnchorElement && node.href) {
      return node;
    }
    if (node instanceof Element) {
      const anchor = node.closest("a[href]");
      if (anchor instanceof HTMLAnchorElement) {
        return anchor;
      }
    }
  }
  const target = event.target;
  if (target instanceof Element) {
    const anchor = target.closest("a[href]");
    if (anchor instanceof HTMLAnchorElement) {
      return anchor;
    }
  }
  return null;
}

function shouldInterceptExternalAnchorClick(
  event: MouseEvent,
  anchor: HTMLAnchorElement,
): boolean {
  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (anchor.hasAttribute("download")) {
    return false;
  }
  const target = (anchor.getAttribute("target") ?? "").trim().toLowerCase();
  if (target && target !== "_self" && target !== "_blank") {
    return false;
  }
  const href = normalizeExternalHref(anchor.href);
  if (!href) {
    return false;
  }
  return new URL(href).origin !== window.location.origin;
}

export function handleExternalAnchorClick(
  event: MouseEvent,
  opts?: {
    gatewayHost?: string;
    gatewayToken?: string;
    openUrl?: typeof openExternalUrl;
  },
): boolean {
  const anchor = findAnchorFromEvent(event);
  if (!anchor || !shouldInterceptExternalAnchorClick(event, anchor)) {
    return false;
  }
  event.preventDefault();
  void (opts?.openUrl ?? openExternalUrl)(anchor.href, {
    gatewayHost: opts?.gatewayHost,
    gatewayToken: opts?.gatewayToken,
  });
  return true;
}

/**
 * Open an http(s) URL using the current shell policy.
 * - Desktop shell: open in the system browser using wails runtime.
 * - Browser: prefer a new tab, then fall back to current-window navigation.
 */
export async function openExternalUrl(
  url: string,
  _opts?: { gatewayHost?: string; gatewayToken?: string },
): Promise<void> {
  const href = normalizeExternalHref(url);
  if (!href) return;

  if (isDesktopShell()) {
    // Desktop shell: 使用系统浏览器打开，避免在当前 webview 中打开导致无法返回
    if (typeof window !== "undefined" && (window as { runtime?: { BrowserOpenURL?: (url: string) => void } }).runtime?.BrowserOpenURL) {
      (window as unknown as { runtime: { BrowserOpenURL: (url: string) => void } }).runtime.BrowserOpenURL(href);
      return;
    }
    // 如果 runtime 不可用，使用新窗口打开
    const opened = window.open(href, "_blank");
    if (opened) {
      try {
        opened.opener = null;
      } catch {
        /* ignore */
      }
      return;
    }
  }

  // Browser: 使用新标签页打开
  const opened = window.open(href, "_blank");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      /* ignore */
    }
    return;
  }

  window.location.assign(href);
}
