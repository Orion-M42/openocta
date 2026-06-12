import { customElement, property, state } from "lit/decorators.js";
import { LitElement, css, html, nothing } from "lit";
import { icons } from "../icons.ts";
import {
  fetchBrowserPreview,
  type BrowserPreviewState,
} from "../controllers/browser-preview.ts";
import { t } from "../strings.js";

@customElement("chat-browser-preview")
export class ChatBrowserPreview extends LitElement {
  @property({ type: Boolean }) open = false;
  /** sidebar: right panel in chat split view; inline: legacy compact embed */
  @property({ reflect: true }) mode: "sidebar" | "inline" = "sidebar";
  @property() gatewayHost = "";
  @property() gatewayToken = "";
  @property({ type: Number }) pollIntervalMs = 2000;
  @property({ attribute: false }) onClose?: () => void;

  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private preview: BrowserPreviewState | null = null;
  @state() private snapshotExpanded = false;

  private pollTimer: number | null = null;

  static styles = css`
    :host {
      display: block;
      min-height: 0;
    }
    :host([mode="sidebar"]) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .panel {
      border: 1px solid var(--border, rgba(127, 127, 127, 0.25));
      border-radius: 10px;
      background: var(--bg-content, #fff);
      overflow: hidden;
      margin-bottom: 10px;
    }
    :host([mode="sidebar"]) .panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      margin-bottom: 0;
      border: none;
      border-radius: 0;
      background: transparent;
    }
    .header,
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border, rgba(127, 127, 127, 0.18));
      background: var(--bg, rgba(127, 127, 127, 0.06));
      flex-shrink: 0;
    }
    :host([mode="sidebar"]) .sidebar-header {
      min-height: 52px;
      padding: 0 16px;
      background: var(--bg);
    }
    .title,
    .sidebar-title {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    :host([mode="sidebar"]) .sidebar-title {
      font-size: 14px;
    }
    .status {
      font-size: 11px;
      color: var(--text-muted, #666);
      font-weight: 400;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 26px;
      padding: 0 8px;
      border: 1px solid var(--border, rgba(127, 127, 127, 0.35));
      border-radius: 6px;
      background: var(--bg, #f5f5f5);
      color: var(--text-primary, #111);
      font-size: 12px;
      cursor: pointer;
    }
    .btn--icon {
      width: 26px;
      padding: 0;
    }
    :host([mode="sidebar"]) .sidebar-header .btn--icon {
      width: 32px;
      min-width: 32px;
      height: 32px;
      border-radius: 8px;
    }
    .body,
    .sidebar-content {
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    }
    :host([mode="sidebar"]) .sidebar-content {
      flex: 1;
      overflow: auto;
      padding: 12px 16px 16px;
    }
    .meta {
      font-size: 12px;
      color: var(--text-muted, #666);
      word-break: break-all;
      flex-shrink: 0;
    }
    .meta strong {
      color: var(--text-primary, #111);
      font-weight: 600;
    }
    .shot-wrap {
      border: 1px solid var(--border, rgba(127, 127, 127, 0.2));
      border-radius: 8px;
      overflow: auto;
      background: #111;
      max-height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    :host([mode="sidebar"]) .shot-wrap {
      flex: 1 1 auto;
      min-height: 280px;
      max-height: none;
      align-items: flex-start;
    }
    .shot-wrap img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 320px;
      object-fit: contain;
    }
    :host([mode="sidebar"]) .shot-wrap img {
      width: auto;
      max-width: 100%;
      max-height: none;
      height: auto;
    }
    .placeholder {
      padding: 32px 16px;
      color: #aaa;
      font-size: 12px;
      text-align: center;
    }
    .snapshot-toggle {
      font-size: 12px;
      color: var(--accent, #2563eb);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-align: left;
      flex-shrink: 0;
    }
    .snapshot {
      margin: 0;
      padding: 8px;
      border-radius: 6px;
      background: var(--bg, rgba(127, 127, 127, 0.08));
      font-size: 11px;
      line-height: 1.45;
      max-height: 220px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      flex-shrink: 0;
    }
    :host([mode="sidebar"]) .snapshot {
      max-height: 320px;
    }
    .error {
      font-size: 12px;
      color: var(--danger, #b91c1c);
      flex-shrink: 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.syncPolling();
  }

  disconnectedCallback() {
    this.stopPolling();
    super.disconnectedCallback();
  }

  updated(changed: Map<string, unknown>) {
    if (
      changed.has("open") ||
      changed.has("gatewayHost") ||
      changed.has("gatewayToken") ||
      changed.has("pollIntervalMs")
    ) {
      this.syncPolling();
    }
  }

  private syncPolling() {
    this.stopPolling();
    if (!this.open) {
      return;
    }
    void this.refresh();
    const interval = Math.max(800, this.pollIntervalMs || 2000);
    this.pollTimer = window.setInterval(() => void this.refresh(), interval);
  }

  private stopPolling() {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async refresh() {
    if (!this.open) {
      return;
    }
    this.loading = true;
    const result = await fetchBrowserPreview({
      gatewayHost: this.gatewayHost,
      token: this.gatewayToken,
      includeScreenshot: true,
    });
    this.loading = false;
    if (!result.ok) {
      this.error = result.error ?? "加载预览失败";
      if (result.data) {
        this.preview = result.data;
      }
      return;
    }
    this.error = null;
    this.preview = result.data ?? null;
  }

  private screenshotSrc(): string | null {
    const b64 = this.preview?.screenshotBase64?.trim();
    if (!b64) {
      return null;
    }
    const fmt = (this.preview?.screenshotFormat ?? "png").toLowerCase();
    const mime = fmt === "jpeg" || fmt === "jpg" ? "image/jpeg" : `image/${fmt}`;
    return `data:${mime};base64,${b64}`;
  }

  private renderHeader() {
    const running = Boolean(this.preview?.running);
    const statusLabel = running
      ? t("chatBrowserPreviewRunning")
      : t("chatBrowserPreviewStopped");
    const isSidebar = this.mode === "sidebar";

    return html`
      <div class=${isSidebar ? "sidebar-header" : "header"}>
        <div class=${isSidebar ? "sidebar-title" : "title"}>
          ${icons.globe}
          ${t("chatBrowserPreviewTitle")}
          <span class="status">${statusLabel}${this.loading ? " · …" : ""}</span>
        </div>
        <div class="actions">
          <button class="btn" type="button" @click=${() => void this.refresh()}>
            ${t("chatBrowserPreviewRefresh")}
          </button>
          ${
            isSidebar && this.onClose
              ? html`
                  <button
                    class="btn btn--icon"
                    type="button"
                    title=${t("chatBrowserPreviewClose")}
                    aria-label=${t("chatBrowserPreviewClose")}
                    @click=${() => this.onClose?.()}
                  >
                    ${icons.x}
                  </button>
                `
              : nothing
          }
        </div>
      </div>
    `;
  }

  private renderBody() {
    const src = this.screenshotSrc();
    const snapshot = this.preview?.snapshot?.trim() ?? this.preview?.text?.trim() ?? "";
    const isSidebar = this.mode === "sidebar";

    return html`
      <div class=${isSidebar ? "sidebar-content" : "body"}>
        ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
        ${
          this.preview?.url
            ? html`<div class="meta"><strong>${this.preview.title || "—"}</strong><br />${this.preview.url}</div>`
            : nothing
        }
        ${
          this.preview?.chromiumError
            ? html`<div class="error">${this.preview.chromiumError}</div>`
            : nothing
        }
        ${
          this.preview?.screenshotError
            ? html`<div class="error">${this.preview.screenshotError}</div>`
            : nothing
        }
        <div class="shot-wrap">
          ${
            src
              ? html`<img src=${src} alt=${t("chatBrowserPreviewScreenshot")} />`
              : html`<div class="placeholder">${t("chatBrowserPreviewNoScreenshot")}</div>`
          }
        </div>
        ${
          snapshot
            ? html`
                <button
                  class="snapshot-toggle"
                  type="button"
                  @click=${() => {
                    this.snapshotExpanded = !this.snapshotExpanded;
                  }}
                >
                  ${this.snapshotExpanded ? t("chatBrowserPreviewHideSnapshot") : t("chatBrowserPreviewShowSnapshot")}
                </button>
                ${this.snapshotExpanded ? html`<pre class="snapshot">${snapshot}</pre>` : nothing}
              `
            : nothing
        }
      </div>
    `;
  }

  render() {
    if (!this.open) {
      return nothing;
    }
    const isSidebar = this.mode === "sidebar";

    if (isSidebar) {
      return html`
        <div class="panel sidebar-panel">
          ${this.renderHeader()}
          ${this.renderBody()}
        </div>
      `;
    }

    return html`
      <div class="panel">
        ${this.renderHeader()}
        ${this.renderBody()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-browser-preview": ChatBrowserPreview;
  }
}
