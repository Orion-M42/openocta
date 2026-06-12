import { html, nothing } from "lit";
import { icons } from "../icons.ts";
import { parseOpenOctaFileAttachmentsFromText } from "./openocta-attachments.ts";
import { extractReferencedImagePaths } from "./attachment-images.ts";

export type FileBlock = {
  filename: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
  isPreviewable: boolean;
};

const PREVIEWABLE_MIME_PREFIXES = ["text/", "application/json", "application/yaml", "application/x-yaml"];
const PREVIEWABLE_EXTENSIONS = new Set([
  "md",
  "markdown",
  "txt",
  "json",
  "yaml",
  "yml",
  "xml",
  "csv",
  "log",
  "pdf",
  "html",
  "htm",
]);

function extFromName(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

function isPreviewableMime(mimeType: string, filename: string): boolean {
  const mime = mimeType.toLowerCase();
  if (mime === "application/pdf") {
    return true;
  }
  if (PREVIEWABLE_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    return true;
  }
  return PREVIEWABLE_EXTENSIONS.has(extFromName(filename));
}

function resolveBlockUrl(
  data: string | undefined,
  mimeType: string,
  url?: string,
): string | null {
  if (url?.trim()) {
    return url.trim();
  }
  if (!data?.trim()) {
    return null;
  }
  if (data.startsWith("data:")) {
    return data;
  }
  const media = mimeType || "application/octet-stream";
  return `data:${media};base64,${data}`;
}

function readSource(block: Record<string, unknown>): { data?: string; mimeType?: string } {
  const source = block.source as Record<string, unknown> | undefined;
  if (!source) {
    return {};
  }
  const data = typeof source.data === "string" ? source.data : undefined;
  const mimeType =
    (typeof source.media_type === "string" && source.media_type) ||
    (typeof source.mimeType === "string" && source.mimeType) ||
    undefined;
  return { data, mimeType };
}

function estimateSizeFromUrl(url: string): number | undefined {
  if (!url.startsWith("data:")) {
    return undefined;
  }
  const comma = url.indexOf(",");
  if (comma < 0) {
    return undefined;
  }
  const meta = url.slice(5, comma);
  const payload = url.slice(comma + 1);
  if (meta.includes(";base64")) {
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }
  try {
    return decodeURIComponent(payload).length;
  } catch {
    return payload.length;
  }
}

function pushFileBlock(files: FileBlock[], next: FileBlock) {
  const key = `${next.filename}::${next.url}`;
  if (files.some((f) => `${f.filename}::${f.url}` === key)) {
    return;
  }
  files.push(next);
}

export function dedupeFileBlocks(files: FileBlock[]): FileBlock[] {
  const out: FileBlock[] = [];
  for (const file of files) {
    pushFileBlock(out, file);
  }
  return out;
}

export function extractFileBlocks(message: unknown): FileBlock[] {
  const m = message as Record<string, unknown>;
  const content = m.content;
  const files: FileBlock[] = [];

  if (typeof content === "string") {
    for (const parsed of parseOpenOctaFileAttachmentsFromText(content)) {
      pushFileBlock(files, {
        filename: parsed.filename,
        mimeType: parsed.mimeType,
        url: parsed.url,
        sizeBytes: parsed.sizeBytes ?? estimateSizeFromUrl(parsed.url),
        isPreviewable: isPreviewableMime(parsed.mimeType, parsed.filename),
      });
    }
  }

  if (!Array.isArray(content)) {
    return files;
  }

  for (const part of content) {
    if (typeof part !== "object" || part === null) {
      continue;
    }
    const b = part as Record<string, unknown>;
    const kind = (typeof b.type === "string" ? b.type : "").toLowerCase();

    if (kind === "text" && typeof b.text === "string") {
      for (const parsed of parseOpenOctaFileAttachmentsFromText(b.text)) {
        pushFileBlock(files, {
          filename: parsed.filename,
          mimeType: parsed.mimeType,
          url: parsed.url,
          sizeBytes: parsed.sizeBytes ?? estimateSizeFromUrl(parsed.url),
          isPreviewable: isPreviewableMime(parsed.mimeType, parsed.filename),
        });
      }
      continue;
    }

    if (kind !== "file" && kind !== "document" && kind !== "attachment") {
      continue;
    }
    const mimeType =
      (typeof b.mimeType === "string" && b.mimeType) ||
      (typeof b.media_type === "string" && b.media_type) ||
      "application/octet-stream";
    if (mimeType.toLowerCase().startsWith("image/")) {
      continue;
    }
    const filename =
      (typeof b.filename === "string" && b.filename) ||
      (typeof b.name === "string" && b.name) ||
      "download";
    const { data: sourceData, mimeType: sourceMime } = readSource(b);
    const data =
      sourceData ||
      (typeof b.data === "string" ? b.data : undefined);
    const url = resolveBlockUrl(data, sourceMime || mimeType, typeof b.url === "string" ? b.url : undefined);
    if (!url) {
      continue;
    }
    pushFileBlock(files, {
      filename,
      mimeType: sourceMime || mimeType,
      url,
      sizeBytes:
        (typeof b.sizeBytes === "number" ? b.sizeBytes : undefined) ?? estimateSizeFromUrl(url),
      isPreviewable: isPreviewableMime(sourceMime || mimeType, filename),
    });
  }
  return files;
}

const referencedAttachmentPathPattern = /attachments\/[\w./-]+\.html?/gi;

export function extractReferencedAttachmentPaths(text: string): string[] {
  const matches = text.match(referencedAttachmentPathPattern) ?? [];
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const raw of matches) {
    const path = raw.trim();
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    paths.push(path);
  }
  for (const path of extractReferencedImagePaths(text)) {
    if (seen.has(path)) {
      continue;
    }
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

export function renderImageFileBlocks(
  files: FileBlock[],
  onPreview?: (req: FilePreviewRequest) => void,
) {
  const images = files.filter((file) => file.mimeType.toLowerCase().startsWith("image/"));
  if (images.length === 0) {
    return nothing;
  }
  return html`
    <div class="chat-message-images">
      ${images.map((file) => {
        const label = file.filename;
        return html`
          <div class="chat-message-image-wrap">
            <img
              src=${file.url}
              alt=${label}
              class="chat-message-image"
              @click=${() => {
                if (onPreview) {
                  onPreview({
                    filename: file.filename,
                    mimeType: file.mimeType,
                    url: file.url,
                  });
                  return;
                }
                window.open(file.url, "_blank");
              }}
            />
            <div class="chat-message-image-actions">
              <a
                class="btn btn--ghost btn--sm"
                href=${file.url}
                download=${label}
                @click=${(e: Event) => e.stopPropagation()}
              >
                下载
              </a>
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

export function fileBlockFromGatewayPayload(payload: Record<string, unknown>): FileBlock | null {
  const filename =
    (typeof payload.filename === "string" && payload.filename) ||
    (typeof payload.name === "string" && payload.name) ||
    "download";
  const mimeType =
    (typeof payload.mimeType === "string" && payload.mimeType) ||
    (typeof payload.media_type === "string" && payload.media_type) ||
    "application/octet-stream";
  const source = payload.source as Record<string, unknown> | undefined;
  const data =
    (typeof source?.data === "string" && source.data) ||
    (typeof payload.data === "string" && payload.data) ||
    undefined;
  const url = resolveBlockUrl(data, mimeType, typeof payload.url === "string" ? payload.url : undefined);
  if (!url) {
    return null;
  }
  return {
    filename,
    mimeType,
    url,
    sizeBytes:
      (typeof payload.sizeBytes === "number" ? payload.sizeBytes : undefined) ?? estimateSizeFromUrl(url),
    isPreviewable: isPreviewableMime(mimeType, filename),
  };
}

export function extractReferencedPathsFromGroup(messages: Array<{ message: unknown }>): string[] {
  const paths: string[] = [];
  for (const item of messages) {
    const m = item.message as Record<string, unknown>;
    const content = m.content;
    if (typeof content === "string") {
      paths.push(...extractReferencedAttachmentPaths(content));
      continue;
    }
    if (!Array.isArray(content)) {
      const text = typeof m.text === "string" ? m.text : "";
      if (text) {
        paths.push(...extractReferencedAttachmentPaths(text));
      }
      continue;
    }
    for (const part of content) {
      if (typeof part !== "object" || part === null) {
        continue;
      }
      const block = part as Record<string, unknown>;
      if (block.type === "text" && typeof block.text === "string") {
        paths.push(...extractReferencedAttachmentPaths(block.text));
      }
    }
  }
  const seen = new Set<string>();
  return paths.filter((path) => {
    if (seen.has(path)) {
      return false;
    }
    seen.add(path);
    return true;
  });
}

export function extractGroupFileBlocks(messages: Array<{ message: unknown }>): FileBlock[] {
  const files: FileBlock[] = [];
  for (const item of messages) {
    for (const block of extractFileBlocks(item.message)) {
      pushFileBlock(files, block);
    }
  }
  return files;
}

export type FilePreviewRequest = {
  filename: string;
  mimeType: string;
  url: string;
};

export function decodeFileText(url: string): string | null {
  if (!url.startsWith("data:")) {
    return null;
  }
  const comma = url.indexOf(",");
  if (comma < 0) {
    return null;
  }
  const meta = url.slice(5, comma);
  const payload = url.slice(comma + 1);
  try {
    if (meta.includes(";base64")) {
      return atob(payload);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

function formatFileSize(sizeBytes?: number): string {
  if (sizeBytes == null || !Number.isFinite(sizeBytes)) {
    return "";
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes < 10240 ? 1 : 0)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(filename: string, mimeType: string): string {
  const ext = extFromName(filename);
  if (ext === "html" || ext === "htm" || mimeType.includes("html")) {
    return "HTML";
  }
  if (ext) {
    return ext.toUpperCase();
  }
  return "File";
}

function renderFileIcon(filename: string, mimeType: string) {
  const label = fileTypeLabel(filename, mimeType);
  const isHtml = label === "HTML";
  return html`
    <div class="chat-file-card__icon ${isHtml ? "chat-file-card__icon--html" : ""}">
      ${isHtml ? html`<span class="chat-file-card__badge">${label}</span>` : icons.fileText}
    </div>
  `;
}

export function renderFileAttachments(
  files: FileBlock[],
  onPreview?: (req: FilePreviewRequest) => void,
) {
  if (files.length === 0) {
    return nothing;
  }
  return html`
    <div class="chat-file-list">
      ${files.map(
        (file) => html`
          <div class="chat-file-card">
            ${renderFileIcon(file.filename, file.mimeType)}
            <div class="chat-file-card__meta">
              <div class="chat-file-card__name">${file.filename}</div>
              <div class="chat-file-card__sub muted">
                File${file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ""} · ${file.mimeType}
              </div>
            </div>
            <div class="chat-file-card__actions">
              ${
                file.isPreviewable && onPreview
                  ? html`<button
                      type="button"
                      class="btn btn--sm chat-file-card__btn"
                      @click=${() =>
                        onPreview({
                          filename: file.filename,
                          mimeType: file.mimeType,
                          url: file.url,
                        })}
                    >
                      预览
                    </button>`
                  : nothing
              }
              <a
                class="btn btn--sm chat-file-card__btn"
                href=${file.url}
                download=${file.filename}
                target="_blank"
                rel="noopener"
              >
                下载
              </a>
            </div>
          </div>
        `,
      )}
    </div>
  `;
}
