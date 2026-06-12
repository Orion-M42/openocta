import { customElement, property, state } from "lit/decorators.js";
import { LitElement, html, nothing } from "lit";
import type { GatewayBrowserClient } from "../gateway.ts";
import {
  renderFileAttachments,
  renderImageFileBlocks,
  type FileBlock,
  type FilePreviewRequest,
} from "../chat/file-blocks.ts";
import { loadAttachmentBlock } from "../chat/attachment-cache.ts";
import { normalizeLocalImagePath } from "../chat/attachment-images.ts";

@customElement("chat-deliverable-attachments")
export class ChatDeliverableAttachments extends LitElement {
  @property({ attribute: false }) client: GatewayBrowserClient | null = null;
  @property({ attribute: false }) sessionKey = "main";
  @property({ attribute: false }) paths: string[] = [];
  @property({ attribute: false }) existing: FileBlock[] = [];
  @property({ attribute: false }) onFilePreview?: (req: FilePreviewRequest) => void;

  @state() private resolved: FileBlock[] = [];
  @state() private loading = false;

  #loadGeneration = 0;

  protected willUpdate(changed: Map<string, unknown>): void {
    if (
      changed.has("paths") ||
      changed.has("existing") ||
      changed.has("client") ||
      changed.has("sessionKey")
    ) {
      void this.loadMissing();
    }
  }

  private existingKeys(): Set<string> {
    const keys = new Set<string>();
    for (const file of [...this.existing, ...this.resolved]) {
      keys.add(`${file.filename}::${file.url}`);
      keys.add(file.filename);
    }
    return keys;
  }

  private pathAlreadyCovered(path: string, keys: Set<string>): boolean {
    const base = path.split("/").pop() ?? path;
    const normalized = normalizeLocalImagePath(path);
    for (const key of keys) {
      if (key === base || key === path || key === normalized || key.startsWith(`${base}::`)) {
        return true;
      }
    }
    return false;
  }

  private pruneResolved(): void {
    const wanted = new Set(
      this.paths.flatMap((path) => {
        const base = path.split("/").pop() ?? path;
        return [path, base, normalizeLocalImagePath(path)];
      }),
    );
    this.resolved = this.resolved.filter((file) => wanted.has(file.filename) || wanted.has(file.url));
  }

  private async loadMissing() {
    const generation = ++this.#loadGeneration;
    if (!this.client || this.paths.length === 0) {
      this.resolved = [];
      this.loading = false;
      return;
    }

    const keys = this.existingKeys();
    const pending = this.paths.filter((path) => !this.pathAlreadyCovered(path, keys));
    if (pending.length === 0) {
      this.pruneResolved();
      this.loading = false;
      return;
    }

    this.loading = true;
    const loaded: FileBlock[] = [];
    for (const path of pending) {
      const block = await loadAttachmentBlock(this.client, this.sessionKey, path);
      if (generation !== this.#loadGeneration) {
        return;
      }
      if (block) {
        loaded.push(block);
      }
    }
    if (generation !== this.#loadGeneration) {
      return;
    }
    if (loaded.length > 0) {
      const merged: FileBlock[] = [...this.resolved];
      for (const block of loaded) {
        const key = `${block.filename}::${block.url}`;
        if (!merged.some((f) => `${f.filename}::${f.url}` === key)) {
          merged.push(block);
        }
      }
      this.resolved = merged;
    }
    this.loading = false;
  }

  render() {
    if (this.resolved.length === 0) {
      return this.loading
        ? html`<div class="chat-file-list"><div class="muted" style="font-size:12px;">正在加载附件…</div></div>`
        : nothing;
    }
    const nonImages = this.resolved.filter(
      (file) => !file.mimeType.toLowerCase().startsWith("image/"),
    );
    return html`
      ${renderImageFileBlocks(this.resolved, this.onFilePreview)}
      ${renderFileAttachments(nonImages, this.onFilePreview)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-deliverable-attachments": ChatDeliverableAttachments;
  }
}
