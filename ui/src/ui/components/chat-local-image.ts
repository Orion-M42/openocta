import { customElement, property, state } from "lit/decorators.js";
import { LitElement, css, html, nothing } from "lit";
import type { GatewayBrowserClient } from "../gateway.ts";
import { loadAttachmentBlock } from "../chat/attachment-cache.ts";
import { normalizeLocalImagePath } from "../chat/attachment-images.ts";

@customElement("chat-local-image")
export class ChatLocalImage extends LitElement {
  @property({ attribute: false }) client: GatewayBrowserClient | null = null;
  @property({ attribute: false }) sessionKey = "main";
  @property() path = "";
  @property() alt = "";

  @state() private url: string | null = null;
  @state() private error: string | null = null;

  #loadGeneration = 0;
  #loadedPath = "";

  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      display: grid;
      gap: 8px;
      justify-items: start;
    }
    img {
      max-width: min(100%, 420px);
      max-height: 360px;
      object-fit: contain;
      border-radius: 10px;
      border: 1px solid var(--border, rgba(127, 127, 127, 0.25));
      background: var(--bg, #f5f5f5);
      cursor: pointer;
    }
    .muted {
      color: var(--text-secondary, #666);
      font-size: 12px;
    }
  `;

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("path") || changed.has("client") || changed.has("sessionKey")) {
      void this.load();
    }
  }

  private async load() {
    const path = normalizeLocalImagePath(this.path);
    const generation = ++this.#loadGeneration;

    if (!path || !this.client) {
      this.url = null;
      this.error = path ? "未连接 Gateway，无法加载图片" : null;
      this.#loadedPath = "";
      return;
    }

    if (path === this.#loadedPath && this.url) {
      return;
    }

    this.error = null;
    const block = await loadAttachmentBlock(this.client, this.sessionKey, path);
    if (generation !== this.#loadGeneration) {
      return;
    }
    if (!block?.url) {
      this.url = null;
      this.error = `无法加载图片：${path}`;
      this.#loadedPath = "";
      return;
    }
    this.url = block.url;
    this.#loadedPath = path;
  }

  render() {
    const label = this.alt || this.path.split("/").pop() || "image";
    if (this.url) {
      return html`
        <div class="wrap">
          <img
            src=${this.url}
            alt=${label}
            @click=${() => window.open(this.url!, "_blank")}
          />
        </div>
      `;
    }
    if (this.error) {
      return html`<div class="muted">${this.error}</div>`;
    }
    return html`<div class="muted">正在加载图片…</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-local-image": ChatLocalImage;
  }
}
