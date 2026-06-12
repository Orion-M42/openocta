import { SignalWatcher } from "@lit-labs/signals";
import { provide } from "@lit/context";
import { customElement, property } from "lit/decorators.js";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type * as v0_9 from "@a2ui/web_core/v0_9";
import { A2uiSurface, Context } from "@a2ui/lit/v0_9";
import type { GatewayBrowserClient } from "../gateway.ts";
import {
  createFreshChatA2UIProcessor,
  dispatchChatA2UIAction,
  processA2UIMessages,
} from "../chat/a2ui-bridge.ts";
import { createA2UIMarkdownRenderer } from "../chat/a2ui-markdown.ts";

@customElement("chat-a2ui-panel")
export class ChatA2UIPanel extends SignalWatcher(LitElement) {
  @property({ attribute: false }) client: GatewayBrowserClient | null = null;
  @property() sessionKey = "main";
  @property({ attribute: false }) messages: unknown[] = [];
  @property({ attribute: false })
  onA2UIAction?: (action: v0_9.A2uiClientAction) => Promise<void> | void;

  @provide({ context: Context.markdown })
  accessor markdownRenderer = createA2UIMarkdownRenderer();

  #dispatchAction = async (action: v0_9.A2uiClientAction) => {
    if (this.onA2UIAction) {
      await this.onA2UIAction(action);
      return;
    }
    await dispatchChatA2UIAction(this.client, this.sessionKey, action);
  };

  #processor = createFreshChatA2UIProcessor(async (action) => {
    await this.#dispatchAction(action);
  });

  #lastMessagesKey = "";

  #resetProcessor(): void {
    this.#processor = createFreshChatA2UIProcessor(async (action) => {
      await this.#dispatchAction(action);
    });
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    .chat-a2ui-panel {
      border: 1px solid var(--border, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 12px;
      margin: 4px 0 8px;
      background: var(--card, rgba(127, 127, 127, 0.06));
    }
    .chat-a2ui-panel--inline {
      margin: 8px 0 0;
      border: none;
      padding: 0;
      background: transparent;
    }
    .chat-a2ui-panel__title {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted, #888);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .chat-a2ui-panel__status {
      font-size: 13px;
      color: var(--muted, #888);
    }
    .chat-a2ui-panel__status--error {
      color: var(--danger, #c62828);
    }
    a2ui-surface {
      display: block;
    }
    a2ui-basic-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--a2ui-row-gap, 8px);
      justify-content: flex-end;
    }
    a2ui-basic-button {
      margin: 0;
    }
    a2ui-basic-text {
      display: block;
      width: 100%;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
      color: var(--text-regular, inherit);
    }
    a2ui-basic-text :where(p, ul, ol, pre, blockquote, table) {
      margin: 0;
    }
    a2ui-basic-text :where(p + p, p + ul, p + ol, p + pre, p + blockquote, p + table) {
      margin-top: 0.75em;
    }
    a2ui-basic-text :where(ul, ol) {
      padding-left: 1.2em;
    }
    a2ui-basic-text :where(li + li) {
      margin-top: 0.25em;
    }
    a2ui-basic-text :where(a) {
      color: var(--accent, inherit);
      text-decoration: none;
    }
    a2ui-basic-text :where(a:hover) {
      text-decoration: underline;
    }
    a2ui-basic-text :where(:not(pre) > code) {
      font-family: var(--mono, monospace);
      font-size: 0.9em;
      padding: 0.15em 0.35em;
      border-radius: var(--radius-sm, 4px);
      border: 1px solid var(--border, rgba(127, 127, 127, 0.25));
      background: var(--bg-content, rgba(127, 127, 127, 0.08));
    }
    a2ui-basic-text :where(pre) {
      margin-top: 0.75em;
      padding: 10px 12px;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border, rgba(127, 127, 127, 0.25));
      background: var(--bg-content, rgba(127, 127, 127, 0.08));
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    a2ui-basic-text :where(pre code) {
      white-space: pre-wrap;
      word-break: break-word;
    }
    a2ui-basic-text :where(.no-markdown-renderer) {
      display: block;
      white-space: pre-wrap;
      word-break: break-word;
    }
  `;

  @property({ type: Boolean }) inline = false;
  @property({ type: Boolean }) showTitle = true;

  #processError: string | null = null;

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has("messages")) {
      return;
    }
    this.#processError = null;
    const messagesKey = JSON.stringify(this.messages);
    if (messagesKey === this.#lastMessagesKey) {
      return;
    }
    this.#lastMessagesKey = messagesKey;

    if (this.messages.length === 0) {
      this.#resetProcessor();
      return;
    }
    try {
      this.#resetProcessor();
      processA2UIMessages(this.#processor, this.messages);
    } catch (err) {
      this.#processError = err instanceof Error ? err.message : String(err);
      console.error("[chat-a2ui-panel] failed to process A2UI messages", err);
    }
  }

  render() {
    const surfaces = Array.from(this.#processor.model.surfacesMap.entries());
    const panelClass = this.inline
      ? "chat-a2ui-panel chat-a2ui-panel--inline"
      : "chat-a2ui-panel";

    if (this.#processError) {
      return html`
        <div class="${panelClass}">
          <div class="chat-a2ui-panel__status chat-a2ui-panel__status--error">
            Interactive UI failed to render: ${this.#processError}
          </div>
        </div>
      `;
    }

    if (surfaces.length === 0) {
      return nothing;
    }

    return html`
      <div class="${panelClass}">
        ${this.showTitle
          ? html`<div class="chat-a2ui-panel__title">Interactive UI</div>`
          : nothing}
        ${repeat(
          surfaces,
          ([surfaceId]) => surfaceId,
          ([_, surface]) => html`<a2ui-surface .surface=${surface}></a2ui-surface>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-a2ui-panel": ChatA2UIPanel;
  }
}
