import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { AssistantIdentity } from "../assistant-identity.ts";
import type { MessageGroup, ToolCard } from "../types/chat-types.ts";
import { icons } from "../icons.ts";
import { toSanitizedMarkdownHtml } from "../markdown.ts";
import { renderCopyAsMarkdownButton } from "./copy-as-markdown.ts";
import {
  extractTextCached,
  extractThinkingCached,
  formatReasoningMarkdown,
} from "./message-extract.ts";
import { isToolResultMessage, normalizeRoleForGrouping } from "./message-normalizer.ts";
import { extractToolCards } from "./tool-cards.ts";
import { resolveToolDisplay } from "../tool-display.ts";
import { extractA2UIBlocks, extractA2UITextMarkdown } from "./a2ui-bridge.ts";
import { isA2UIProtocolTool } from "./constants.ts";
import {
  extractFileBlocks,
  extractGroupFileBlocks,
  extractReferencedPathsFromGroup,
  renderFileAttachments,
  renderImageFileBlocks,
  type FileBlock,
  type FilePreviewRequest,
} from "./file-blocks.ts";
import {
  normalizeLocalImagePath,
  parseMarkdownLocalImageRefs,
  stripMarkdownLocalImageRefs,
} from "./attachment-images.ts";
import {
  parseOpenOctaAttachmentsFromText,
  stripOpenOctaAttachmentsMarker,
} from "./openocta-attachments.ts";
import { extractGroupMeta, formatTokenSummary } from "./message-meta.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import "../components/chat-a2ui-panel.ts";
import "../components/chat-deliverable-attachments.ts";
import "../components/chat-local-image.ts";

type ImageBlock = {
  url: string;
  alt?: string;
  filename?: string;
  localPath?: string;
};

function extractDurationMs(message: unknown): number | null {
  const m = message as Record<string, unknown>;
  const candidates = [
    m.durationMs,
    m.elapsedMs,
    m.latencyMs,
    m.thinkingMs,
    (m.metrics as Record<string, unknown> | undefined)?.durationMs,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) {
      return c;
    }
    if (typeof c === "string") {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) {
        return n;
      }
    }
  }
  return null;
}

function extractFirstTokenMs(message: unknown): number | null {
  const m = message as Record<string, unknown>;
  const c = m.firstTokenMs ?? m.first_token_ms;
  if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  if (typeof c === "string") {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function extractToolDurationMs(message: unknown): number | null {
  const m = message as Record<string, unknown>;
  const c = m.toolDurationMs ?? m.tool_duration_ms;
  if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  if (typeof c === "string") {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function extractOutputDurationMs(message: unknown): number | null {
  const m = message as Record<string, unknown>;
  const c = m.outputDurationMs ?? m.output_duration_ms;
  if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  if (typeof c === "string") {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function formatDurationShort(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m${secs.toString().padStart(2, "0")}s`;
}

function groupElapsedMs(group: MessageGroup): number | null {
  const timestamps = group.messages
    .map((item) => {
      const m = item.message as Record<string, unknown>;
      return typeof m.timestamp === "number" ? m.timestamp : null;
    })
    .filter((value): value is number => value !== null);
  if (timestamps.length < 2) {
    return null;
  }
  const elapsed = Math.max(...timestamps) - Math.min(...timestamps);
  return elapsed > 0 ? elapsed : null;
}

function pushUniqueImage(images: ImageBlock[], next: ImageBlock) {
  const key = next.localPath || next.url;
  if (!key) {
    return;
  }
  if (images.some((img) => (img.localPath || img.url) === key)) {
    return;
  }
  images.push(next);
}

function extractGroupImageKeys(messages: Array<{ message: unknown }>): Set<string> {
  const keys = new Set<string>();
  for (const item of messages) {
    for (const img of extractImages(item.message)) {
      if (img.localPath) {
        keys.add(normalizeLocalImagePath(img.localPath));
      }
      if (img.filename) {
        keys.add(img.filename);
      }
      if (img.url) {
        keys.add(img.url);
      }
    }
  }
  return keys;
}

function isPathCoveredByImageKeys(path: string, keys: Set<string>, groupFiles: FileBlock[]): boolean {
  const base = path.split("/").pop() ?? path;
  const normalized = normalizeLocalImagePath(path);
  if (keys.has(path) || keys.has(base) || keys.has(normalized)) {
    return true;
  }
  return groupFiles.some((file) => file.filename === base || file.filename === path);
}

function extractImages(message: unknown): ImageBlock[] {
  const m = message as Record<string, unknown>;
  const content = m.content;
  const images: ImageBlock[] = [];

  if (typeof content === "string") {
    for (const img of parseOpenOctaAttachmentsFromText(content)) {
      pushUniqueImage(images, img);
    }
    for (const ref of parseMarkdownLocalImageRefs(content)) {
      pushUniqueImage(images, {
        url: "",
        alt: ref.alt,
        filename: ref.path.split("/").pop(),
        localPath: ref.path,
      });
    }
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block !== "object" || block === null) {
        continue;
      }
      const b = block as Record<string, unknown>;

      if (b.type === "image") {
        // Handle source object format (from sendChatMessage)
        const source = b.source as Record<string, unknown> | undefined;
        if (source?.type === "base64" && typeof source.data === "string") {
          const data = source.data;
          const mediaType = (source.media_type as string) || "image/png";
          // If data is already a data URL, use it directly
          const url = data.startsWith("data:") ? data : `data:${mediaType};base64,${data}`;
          const filename = typeof b.filename === "string" ? b.filename : undefined;
          pushUniqueImage(images, { url, filename });
        } else if (typeof b.url === "string") {
          const filename = typeof b.filename === "string" ? b.filename : undefined;
          pushUniqueImage(images, { url: b.url, filename });
        } else if (typeof b.data === "string") {
          const data = b.data;
          const mediaType = (b.mimeType as string) || (b.media_type as string) || "image/png";
          const url = data.startsWith("data:") ? data : `data:${mediaType};base64,${data}`;
          const filename = typeof b.filename === "string" ? b.filename : undefined;
          pushUniqueImage(images, { url, filename });
        }
      } else if (b.type === "image_url") {
        // OpenAI format
        const imageUrl = b.image_url as Record<string, unknown> | undefined;
        if (typeof imageUrl?.url === "string") {
          pushUniqueImage(images, { url: imageUrl.url });
        }
      } else if (b.type === "text" && typeof b.text === "string") {
        for (const img of parseOpenOctaAttachmentsFromText(b.text)) {
          pushUniqueImage(images, img);
        }
        for (const ref of parseMarkdownLocalImageRefs(b.text)) {
          pushUniqueImage(images, {
            url: "",
            alt: ref.alt,
            filename: ref.path.split("/").pop(),
            localPath: ref.path,
          });
        }
      }
    }
  }

  return images;
}

function nonImageFileBlocks(files: FileBlock[]): FileBlock[] {
  return files.filter((file) => !file.mimeType.toLowerCase().startsWith("image/"));
}

function runPhaseLabel(phase?: "thinking" | "tool" | "streaming"): string {
  if (phase === "tool") {
    return "正在调用工具…";
  }
  if (phase === "streaming") {
    return "正在生成回复…";
  }
  return "思考中…";
}

function renderAssistantAvatar(
  assistant?: AssistantIdentity,
  opts?: { busy?: boolean },
) {
  return html`
    <div class="chat-avatar-wrap ${opts?.busy ? "chat-avatar-wrap--busy" : ""}">
      ${renderAvatar("assistant", assistant)}
      ${opts?.busy ? html`<span class="chat-avatar-spinner" aria-hidden="true">${icons.loader2}</span>` : nothing}
    </div>
  `;
}

export function renderReadingIndicatorGroup(
  assistant?: AssistantIdentity,
  startedAt?: number,
  phase?: "thinking" | "tool" | "streaming",
) {
  return html`
    <div class="chat-group assistant">
      ${renderAssistantAvatar(assistant, { busy: true })}
      <div class="chat-group-messages">
        <div class="chat-bubble chat-reading-indicator" aria-live="polite">
          <span class="chat-reading-indicator__label">${runPhaseLabel(phase)}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderA2UIGroup(
  messages: unknown[],
  assistant?: AssistantIdentity,
  client?: GatewayBrowserClient | null,
  sessionKey?: string,
  onA2UIAction?: (action: import("@a2ui/web_core/v0_9").A2uiClientAction) => Promise<void> | void,
) {
  return html`
    <div class="chat-group assistant">
      ${renderAvatar("assistant", assistant)}
      <div class="chat-group-messages">${renderA2UIContent(messages, {
        client,
        sessionKey,
        onA2UIAction,
      })}</div>
    </div>
  `;
}

export function renderStreamingGroup(
  text: string,
  startedAt: number,
  onOpenSidebar?: (content: string) => void,
  assistant?: AssistantIdentity,
) {
  const timestamp = new Date(startedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const name = assistant?.name ?? "Assistant";

  return html`
    <div class="chat-group assistant">
      ${renderAssistantAvatar(assistant, { busy: true })}
      <div class="chat-group-messages">
        ${renderGroupedMessage(
          {
            role: "assistant",
            content: [{ type: "text", text }],
            timestamp: startedAt,
          },
          { isStreaming: true, showReasoning: false, showToolTrace: false },
          onOpenSidebar,
        )}
        <div class="chat-group-footer">
          <span class="chat-sender-name">${name}</span>
          <span class="chat-group-timestamp">${timestamp}</span>
        </div>
      </div>
    </div>
  `;
}

function formatToolArgs(args: unknown): string {
  if (args == null) {
    return "";
  }
  if (typeof args === "string") {
    return args.trim();
  }
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function renderGroupMetaFooter(group: MessageGroup, role: string) {
  if (role !== "assistant") {
    return nothing;
  }
  const meta = extractGroupMeta(group.messages);
  const parts: string[] = [];
  if (meta.model) {
    parts.push(meta.model);
  }
  if (meta.durationMs && meta.durationMs > 0) {
    parts.push(formatDurationShort(meta.durationMs));
  }
  const tokens = formatTokenSummary(meta.usage);
  if (tokens) {
    parts.push(tokens);
  }
  if (meta.endTime) {
    parts.push(
      new Date(meta.endTime).toLocaleString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }
  if (parts.length === 0) {
    return nothing;
  }
  return html`<div class="chat-group-meta muted">${parts.join(" · ")}</div>`;
}

export function renderMessageGroup(
  group: MessageGroup,
  opts: {
    onOpenSidebar?: (content: string) => void;
    onFilePreview?: (req: FilePreviewRequest) => void;
    showReasoning: boolean;
    showToolTrace: boolean;
    assistantName?: string;
    assistantAvatar?: string | null;
    client?: GatewayBrowserClient | null;
    sessionKey?: string;
    onA2UIAction?: (action: import("@a2ui/web_core/v0_9").A2uiClientAction) => Promise<void> | void;
  },
) {
  const normalizedRole = normalizeRoleForGrouping(group.role);
  const assistantName = opts.assistantName ?? "Assistant";
  const who =
    normalizedRole === "user"
      ? "You"
      : normalizedRole === "assistant"
        ? assistantName
        : normalizedRole === "tool"
          ? "Tool"
          : normalizedRole;
  const roleClass =
    normalizedRole === "user" ? "user" : normalizedRole === "assistant" ? "assistant" : "other";
  const timestamp = new Date(group.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return html`
    <div class="chat-group ${roleClass}">
      ${
        normalizedRole === "assistant"
          ? renderAssistantAvatar(
              { name: assistantName, avatar: opts.assistantAvatar ?? null },
              { busy: group.isStreaming },
            )
          : renderAvatar(group.role, {
              name: assistantName,
              avatar: opts.assistantAvatar ?? null,
            })
      }
      <div class="chat-group-messages">
        ${
          normalizedRole === "assistant"
            ? renderAssistantTurnMessages(group, opts)
            : group.messages.map((item, index) =>
                renderGroupedMessage(
                  item.message,
                  {
                    isStreaming: group.isStreaming && index === group.messages.length - 1,
                    showReasoning: opts.showReasoning,
                    showToolTrace: opts.showToolTrace,
                    client: opts.client,
                    sessionKey: opts.sessionKey,
                    onFilePreview: opts.onFilePreview,
                    onA2UIAction: opts.onA2UIAction,
                  },
                  opts.onOpenSidebar,
                ),
              )
        }
        <div class="chat-group-footer">
          <span class="chat-sender-name">${who}</span>
          <span class="chat-group-timestamp">${timestamp}</span>
        </div>
        ${renderGroupMetaFooter(group, normalizedRole)}
      </div>
    </div>
  `;
}

function renderAvatar(role: string, assistant?: Pick<AssistantIdentity, "name" | "avatar">) {
  const normalized = normalizeRoleForGrouping(role);
  const assistantName = assistant?.name?.trim() || "Assistant";
  const assistantAvatar = assistant?.avatar?.trim() || "";
  const initial =
    normalized === "user"
      ? "U"
      : normalized === "assistant"
        ? assistantName.charAt(0).toUpperCase() || "A"
        : normalized === "tool"
          ? "⚙"
          : "?";
  const className =
    normalized === "user"
      ? "user"
      : normalized === "assistant"
        ? "assistant"
        : normalized === "tool"
          ? "tool"
          : "other";

  if (assistantAvatar && normalized === "assistant") {
    if (isAvatarUrl(assistantAvatar)) {
      return html`<img
        class="chat-avatar ${className}"
        src="${assistantAvatar}"
        alt="${assistantName}"
      />`;
    }
    return html`<div class="chat-avatar ${className}">${assistantAvatar}</div>`;
  }

  return html`<div class="chat-avatar ${className}">${initial}</div>`;
}

function isAvatarUrl(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) || /^data:image\//i.test(value) || value.startsWith("/") // Relative paths from avatar endpoint
  );
}

function renderMessageImages(
  images: ImageBlock[],
  opts?: { client?: GatewayBrowserClient | null; sessionKey?: string },
) {
  if (images.length === 0) {
    return nothing;
  }

  return html`
    <div class="chat-message-images">
      ${images.map((img) => {
        if (img.localPath) {
          return html`
            <chat-local-image
              .client=${opts?.client ?? null}
              .sessionKey=${opts?.sessionKey ?? "main"}
              path=${img.localPath}
              alt=${img.alt ?? img.filename ?? "image"}
            ></chat-local-image>
          `;
        }
        const label = img.filename ?? img.alt ?? "image";
        return html`
          <div class="chat-message-image-wrap">
            <img
              src=${img.url}
              alt=${img.alt ?? label}
              class="chat-message-image"
              @click=${() => window.open(img.url, "_blank")}
            />
            <div class="chat-message-image-actions">
              <a class="btn btn--ghost btn--sm" href=${img.url} download=${label} @click=${(e: Event) => e.stopPropagation()}
                >下载</a
              >
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

/** Plain tool output only (no ### headings). Names appear on cards above; avoids a lone "Tool Output" title in the fold panel. */
function aggregateToolResultMarkdown(cards: ToolCard[]): string | null {
  const parts: string[] = [];
  for (const c of cards) {
    if (c.kind !== "result" || !c.text?.trim()) {
      continue;
    }
    parts.push(c.text.trim());
  }
  return parts.length > 0 ? parts.join("\n\n---\n\n") : null;
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Plain text under ### tool headings (for deduping with extractText). */
function stripAggregatedToolHeadings(aggregated: string): string {
  return aggregated
    .split(/\n\n---\n\n/)
    .map((part) => part.replace(/^###[^\n]+\n+/, "").trim())
    .join("\n\n")
    .trim();
}

function combinedResultPlaintext(cards: ToolCard[]): string {
  return cards
    .filter((c) => c.kind === "result" && c.text?.trim())
    .map((c) => c.text!.trim())
    .join("\n\n");
}

/**
 * Prefer a single body: extractText often duplicates toolresult card text; avoid showing both.
 */
function mergeToolExpandableBody(markdown: string | null, cards: ToolCard[]): string | null {
  const md = (markdown ?? "").trim();
  const aggregated = aggregateToolResultMarkdown(cards)?.trim() ?? "";
  if (!md && !aggregated) {
    return null;
  }
  if (!aggregated) {
    return md || null;
  }
  if (!md) {
    return aggregated;
  }
  const combined = combinedResultPlaintext(cards);
  const strippedAgg = stripAggregatedToolHeadings(aggregated);
  const dupWithCards =
    combined &&
    (md === combined ||
      collapseWhitespace(md) === collapseWhitespace(combined) ||
      combined.includes(md) ||
      md.includes(combined));
  const dupWithAggShape =
    md === strippedAgg || collapseWhitespace(md) === collapseWhitespace(strippedAgg);
  if (dupWithCards || dupWithAggShape) {
    return aggregated;
  }
  return `${md}\n\n---\n\n${aggregated}`;
}

function toggleToolResultBody(e: Event) {
  const btn = e.currentTarget as HTMLButtonElement;
  if (btn.disabled) {
    return;
  }
  e.stopPropagation();
  const open = btn.getAttribute("aria-expanded") === "true";
  const next = !open;
  btn.setAttribute("aria-expanded", String(next));
  const block = btn.closest(".chat-tool-result-block");
  const body = block?.querySelector(".chat-tool-result-body") as HTMLElement | null;
  if (body) {
    body.hidden = !next;
  }
  block?.classList.toggle("chat-tool-result-block--open", next);
}


function toolCommandText(card: ToolCard): string {
  const args = card.args;
  if (args && typeof args === "object") {
    const rec = args as Record<string, unknown>;
    for (const key of ["command", "cmd", "script", "query", "path"]) {
      const value = rec[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  if (typeof args === "string" && args.trim()) {
    return args.trim();
  }
  if (card.text?.trim()) {
    return card.text.trim().split(/\r?\n/, 1)[0] ?? "";
  }
  return card.name;
}

function extractToolOutputText(doc: string): string {
  const trimmed = doc.trim();
  let output = doc;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed.output === "string" && parsed.output.trim()) {
        output = parsed.output;
      } else {
        const nested = parsed.data as Record<string, unknown> | undefined;
        if (typeof nested?.output === "string" && nested.output.trim()) {
          output = nested.output;
        }
      }
    } catch {
      output = doc;
    }
  }
  return stripOpenOctaAttachmentsMarker(output);
}

function formatToolRunLabel(cards: ToolCard[]): string {
  const count = cards.filter((c) => c.kind === "call").length || cards.length;
  return count <= 1 ? "已运行命令" : `已运行 ${count} 条命令`;
}

function renderInlineToolCall(card: ToolCard) {
  const command = toolCommandText(card);
  const label = command ? `已运行 ${command}` : "已运行命令";
  return html`
    <div class="chat-tool-run chat-tool-run--call">
      <div class="chat-tool-run__summary">
        <span class="chat-tool-run__icon">${icons.wrench}</span>
        <span class="chat-tool-run__title">${label}</span>
        <span class="chat-tool-run__status">${icons.check}</span>
      </div>
    </div>
  `;
}

type ToolRunEntry = {
  command: string;
  tool: string;
  input: string;
  output: string;
  success: boolean;
  durationMs?: number;
};

function isToolResultLikeMessage(message: unknown): boolean {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
  return (
    isToolResultMessage(message) ||
    role === "toolresult" ||
    role === "tool_result" ||
    typeof m.toolCallId === "string" ||
    typeof m.tool_call_id === "string"
  );
}

function inferToolSuccess(output: string): boolean {
  const normalized = output.toLowerCase();
  return !/(^|\n)\s*(error|failed|failure):|exit code:\s*[1-9]|exception|traceback/.test(
    normalized,
  );
}

interface ToolGroup {
  tool: string;
  title: string;
  icon: string;
  runs: ToolRunEntry[];
}

type Segment =
  | { type: "text"; message: unknown; isStreaming: boolean }
  | { type: "tools"; runs: ToolRunEntry[] };

function segmentAssistantTurn(
  messages: Array<{ message: unknown; key: string }>,
  groupIsStreaming: boolean
): Segment[] {
  const segments: Segment[] = [];
  let currentToolSegment: { type: "tools"; runs: ToolRunEntry[] } | null = null;
  let currentRun: ToolRunEntry | null = null;

  for (let idx = 0; idx < messages.length; idx++) {
    const item = messages[idx];
    const message = item.message;
    const isLast = idx === messages.length - 1;
    const isStreaming = groupIsStreaming && isLast;

    const cards = extractToolCards(message);
    const text = extractTextCached(message)?.trim() ?? "";
    const thinking = extractThinkingCached(message)?.trim() ?? "";
    const images = extractImages(message);
    const fileBlocks = extractFileBlocks(message);
    const a2uiBlocks = extractA2UIBlocks(message);
    const isToolResult = isToolResultLikeMessage(message);
    const callCards = cards.filter((card) => card.kind === "call");

    if (
      (text || thinking || images.length > 0 || fileBlocks.length > 0 || a2uiBlocks.length > 0) &&
      !isToolResult
    ) {
      segments.push({ type: "text", message, isStreaming });
      currentToolSegment = null;
      currentRun = null;
    }

    if (callCards.length > 0) {
      if (!currentToolSegment) {
        currentToolSegment = { type: "tools", runs: [] };
        segments.push(currentToolSegment);
      }
      for (const card of callCards) {
        if (isA2UIProtocolTool(card.name)) {
          continue;
        }
        currentRun = {
          command: toolCommandText(card),
          tool: card.name || "tool",
          input: formatToolArgs(card.args),
          output: "",
          success: true,
        };
        currentToolSegment.runs.push(currentRun);
      }
    }

    if (isToolResult) {
      const toolName =
        cards[0]?.name ||
        (typeof (message as Record<string, unknown>).toolName === "string"
          ? ((message as Record<string, unknown>).toolName as string)
          : "");
      if (isA2UIProtocolTool(toolName)) {
        continue;
      }
      const output = text ? extractToolOutputText(text) : "";
      const durationMs = extractDurationMs(message) ?? undefined;
      if (!currentToolSegment) {
        currentToolSegment = { type: "tools", runs: [] };
        segments.push(currentToolSegment);
      }
      const unmatchedRun = currentToolSegment.runs.find((r) => r.output === "");
      if (unmatchedRun) {
        unmatchedRun.output = output;
        unmatchedRun.success = inferToolSuccess(output);
        if (durationMs !== undefined) {
          unmatchedRun.durationMs = durationMs;
        }
        currentRun = unmatchedRun;
      } else {
        const newRun = {
          command: "command",
          tool: cards[0]?.name || "tool",
          input: "",
          output,
          success: inferToolSuccess(output),
          durationMs,
        };
        currentToolSegment.runs.push(newRun);
        currentRun = newRun;
      }
      const toolImages = extractImages(message);
      const toolFiles = extractFileBlocks(message);
      if (toolImages.length > 0 || toolFiles.length > 0) {
        segments.push({ type: "text", message, isStreaming: false });
        currentToolSegment = null;
        currentRun = null;
      }
    }
  }

  return segments;
}

function extractGroupMetrics(group: MessageGroup) {
  let totalThinkingMs = 0;
  let totalElapsedMs = 0;
  let totalFirstTokenMs = 0;
  let totalToolDurationMs = 0;
  let totalOutputDurationMs = 0;
  let hasDetailedMetrics = false;

  for (const item of group.messages) {
    const isTool = isToolResultLikeMessage(item.message);
    const m = item.message as Record<string, unknown>;

    const thinking = m.thinkingMs ?? (m.metrics as Record<string, unknown> | undefined)?.thinkingMs;
    if (typeof thinking === "number") {
      totalThinkingMs = Math.max(totalThinkingMs, thinking);
    }

    if (!isTool) {
      const duration = extractDurationMs(item.message);
      if (duration) {
        totalElapsedMs = Math.max(totalElapsedMs, duration);
      }
      const ft = extractFirstTokenMs(item.message);
      if (ft !== null) {
        totalFirstTokenMs = Math.max(totalFirstTokenMs, ft);
        hasDetailedMetrics = true;
      }
      const td = extractToolDurationMs(item.message);
      if (td !== null) {
        totalToolDurationMs = Math.max(totalToolDurationMs, td);
        hasDetailedMetrics = true;
      }
      const od = extractOutputDurationMs(item.message);
      if (od !== null) {
        totalOutputDurationMs = Math.max(totalOutputDurationMs, od);
        hasDetailedMetrics = true;
      }
    }
  }

  if (totalElapsedMs === 0) {
    const elapsed = groupElapsedMs(group);
    if (elapsed) {
      totalElapsedMs = elapsed;
    }
  }

  return {
    thinkingMs: totalThinkingMs > 0 ? totalThinkingMs : null,
    elapsedMs: totalElapsedMs > 0 ? totalElapsedMs : null,
    firstTokenMs: hasDetailedMetrics ? totalFirstTokenMs : null,
    toolDurationMs: hasDetailedMetrics ? totalToolDurationMs : null,
    outputDurationMs: hasDetailedMetrics ? totalOutputDurationMs : null,
  };
}

function renderToolSegment(
  runs: ToolRunEntry[],
  isStreaming: boolean,
) {
  const groupsMap = new Map<string, ToolGroup>();
  for (const run of runs) {
    const display = resolveToolDisplay({ name: run.tool });
    let group = groupsMap.get(run.tool);
    if (!group) {
      group = {
        tool: run.tool,
        title: display.title || display.label || run.tool,
        icon: display.icon || "puzzle",
        runs: [],
      };
      groupsMap.set(run.tool, group);
    }
    group.runs.push(run);
  }
  const toolGroups = Array.from(groupsMap.values());

  return html`
    <div class="chat-tool-segment">
      ${toolGroups.map((tg) => {
        const total = tg.runs.length;
        const successCount = tg.runs.filter((r) => r.success).length;
        const failedCount = total - successCount;

        let statsLabel = "";
        if (isStreaming) {
          statsLabel = "正在运行...";
        } else {
          statsLabel = failedCount > 0
            ? `运行 ${total} 次 · 成功 ${successCount} 失败 ${failedCount}`
            : `运行 ${total} 次 · 全部成功`;
        }

        const chevronIcon = isStreaming ? icons.loader : icons.chevronRight;
        const chevronClass = isStreaming
          ? "chat-tool-group-summary__chevron running"
          : "chat-tool-group-summary__chevron";

        return html`
          <details class="chat-tool-group-details" ?open=${isStreaming}>
            <summary class="chat-tool-group-summary">
              <span class="chat-tool-group-summary__icon">${icons[tg.icon as keyof typeof icons] || icons.wrench}</span>
              <span class="chat-tool-group-summary__title">${tg.title}</span>
              <span class="chat-tool-group-summary__stats">${statsLabel}</span>
              <span class="${chevronClass}">${chevronIcon}</span>
            </summary>
            <div class="chat-tool-group-runs">
              ${tg.runs.map((run, runIdx) => {
                if (isStreaming && runIdx < tg.runs.length - 1) {
                  return nothing;
                }
                return html`
                  <details class="chat-turn-command" ?open=${!run.success || isStreaming}>
                    <summary class="chat-turn-command__summary">
                      <span class="chat-turn-command__prompt">$</span>
                      <span class="chat-turn-command__text">
                        ${run.command || run.tool}
                      </span>
                      <span class="chat-turn-command__status-dot ${run.success ? "success" : "failed"}"></span>
                    </summary>
                    ${
                      run.input
                        ? html`
                            <div class="chat-tool-io">
                              <div class="chat-tool-io__label">输入</div>
                              <pre class="chat-tool-run__output">${run.input}</pre>
                            </div>
                          `
                        : nothing
                    }
                    <div class="chat-tool-io">
                      <div class="chat-tool-io__label">输出</div>
                      <pre class="chat-tool-run__output">${run.output || "(no output)"}</pre>
                    </div>
                  </details>
                `;
              })}
            </div>
          </details>
        `;
      })}
    </div>
  `;
}

function renderAssistantTurnMessages(
  group: MessageGroup,
  opts: {
    onOpenSidebar?: (content: string) => void;
    onFilePreview?: (req: FilePreviewRequest) => void;
    showReasoning: boolean;
    showToolTrace: boolean;
    client?: GatewayBrowserClient | null;
    sessionKey?: string;
    onA2UIAction?: (action: import("@a2ui/web_core/v0_9").A2uiClientAction) => Promise<void> | void;
  },
) {
  const segments = segmentAssistantTurn(group.messages, !!group.isStreaming);
  if (segments.length === 0) {
    return nothing;
  }

  const groupFiles = extractGroupFileBlocks(group.messages);
  const groupImageKeys = extractGroupImageKeys(group.messages);
  const referencedPaths = extractReferencedPathsFromGroup(group.messages);
  const unresolvedPaths = referencedPaths.filter(
    (path) => !isPathCoveredByImageKeys(path, groupImageKeys, groupFiles),
  );

  // Find the last segment that is a text segment and contains actual text (the final assistant response)
  let finalResponseIdx = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg.type === "text") {
      const text = extractTextCached(seg.message)?.trim() ?? "";
      const images = extractImages(seg.message);
      const files = extractFileBlocks(seg.message);
      const a2uiBlocks = extractA2UIBlocks(seg.message);
      if (text || images.length > 0 || files.length > 0 || a2uiBlocks.length > 0) {
        finalResponseIdx = i;
        break;
      }
    }
  }

  let processSegments: Segment[] = [];
  let finalResponseSegment: Segment | null = null;

  if (finalResponseIdx !== -1) {
    processSegments = segments.filter((_, idx) => idx !== finalResponseIdx);
    finalResponseSegment = segments[finalResponseIdx];
  } else {
    processSegments = segments;
  }

  return html`
    ${processSegments.length > 0
      ? html`
          <details class="chat-process-details" ?open=${!!group.isStreaming || processSegments.some((s) => s.type === "tools")}>
            <summary class="chat-process-summary">
              <span class="chat-process-summary__icon">
                ${group.isStreaming ? icons.loader2 : icons.wrench}
              </span>
              <span class="chat-process-summary__title">思考及工具运行过程</span>
              ${
                group.isStreaming
                  ? html`<span class="chat-process-summary__status">运行中</span>`
                  : nothing
              }
              <span class="chat-process-summary__chevron">${icons.chevronRight}</span>
            </summary>
            <div class="chat-process-content">
              ${processSegments.map((seg) => {
                if (seg.type === "text") {
                  const hasThinking = Boolean(extractThinkingCached(seg.message)?.trim());
                  return renderGroupedMessage(
                    seg.message,
                    {
                      isStreaming: seg.isStreaming,
                      showReasoning: opts.showReasoning || hasThinking,
                      showToolTrace: false,
                      hideFileAttachments: true,
                      client: opts.client,
                      sessionKey: opts.sessionKey,
                      onFilePreview: opts.onFilePreview,
                      onA2UIAction: opts.onA2UIAction,
                    },
                    opts.onOpenSidebar,
                  );
                } else {
                  return renderToolSegment(seg.runs, !!group.isStreaming);
                }
              })}
            </div>
          </details>
        `
      : nothing}

    ${finalResponseSegment?.type === "text"
      ? renderGroupedMessage(
          finalResponseSegment.message,
          {
            isStreaming: finalResponseSegment.isStreaming,
            showReasoning: false, // Reasoning has been rendered inside processSegments
            showToolTrace: false,
            hideFileAttachments: true,
            client: opts.client,
            sessionKey: opts.sessionKey,
            onFilePreview: opts.onFilePreview,
            onA2UIAction: opts.onA2UIAction,
          },
          opts.onOpenSidebar,
        )
      : nothing}
    ${renderImageFileBlocks(groupFiles, opts.onFilePreview)}
    ${renderFileAttachments(nonImageFileBlocks(groupFiles), opts.onFilePreview)}
    ${
      unresolvedPaths.length > 0
        ? html`<chat-deliverable-attachments
            .client=${opts.client ?? null}
            .sessionKey=${opts.sessionKey ?? "main"}
            .paths=${unresolvedPaths}
            .existing=${groupFiles as FileBlock[]}
            .onFilePreview=${opts.onFilePreview}
          ></chat-deliverable-attachments>`
        : nothing
    }
  `;
}


function renderCollapsedToolResult(
  toolCards: ToolCard[],
  images: ImageBlock[],
  markdown: string | null,
  reasoningMarkdown: string | null,
  opts: {
    isStreaming: boolean;
    showReasoning: boolean;
    client?: GatewayBrowserClient | null;
    sessionKey?: string;
  },
  _onOpenSidebar?: (content: string) => void,
) {
  const bodyDoc = mergeToolExpandableBody(markdown, toolCards);
  const primaryCommand =
    toolCards
      .filter((card) => card.kind === "call")
      .map(toolCommandText)
      .find(Boolean) ?? "";
  const runLabel = toolCards.length ? formatToolRunLabel(toolCards) : "已运行命令";
  const outputText = bodyDoc?.trim() ? extractToolOutputText(bodyDoc) : "";

  return html`
    <div class="chat-tool-result-block">
      <details class="chat-tool-run">
        <summary class="chat-tool-run__summary">
          <span class="chat-tool-run__icon">${icons.wrench}</span>
          <span class="chat-tool-run__title">${runLabel}</span>
          <span class="chat-tool-run__chevron">${icons.chevronRight}</span>
        </summary>
        ${
          primaryCommand
            ? html`<div class="chat-tool-run__command muted">已运行 ${primaryCommand}</div>`
            : nothing
        }
        ${
          opts.showReasoning && reasoningMarkdown
            ? html`
                <details class="chat-thinking" open>
                  <summary class="chat-thinking__summary">Reasoning</summary>
                  <div class="chat-thinking__content">
                    ${unsafeHTML(toSanitizedMarkdownHtml(reasoningMarkdown))}
                  </div>
                </details>
              `
            : nothing
        }
        ${renderMessageImages(images, { client: opts.client, sessionKey: opts.sessionKey })}
        ${
          outputText
            ? html`
                <div class="chat-tool-run__panel">
                  <div class="chat-tool-run__panel-title">Shell</div>
                  <pre class="chat-tool-run__output">${outputText}</pre>
                </div>
              `
            : nothing
        }
      </details>
    </div>
  `;
}

function renderA2UIContent(
  blocks: unknown[],
  opts: {
    client?: GatewayBrowserClient | null;
    sessionKey?: string;
    onA2UIAction?: (action: import("@a2ui/web_core/v0_9").A2uiClientAction) => Promise<void> | void;
    inline?: boolean;
  },
) {
  if (blocks.length === 0) {
    return nothing;
  }
  const textMarkdown = extractA2UITextMarkdown(blocks);
  if (textMarkdown) {
    return html`<div class="chat-text">${unsafeHTML(toSanitizedMarkdownHtml(textMarkdown))}</div>`;
  }
  return html`<chat-a2ui-panel
    ?inline=${opts.inline ?? false}
    .showTitle=${!(opts.inline ?? false)}
    .client=${opts.client ?? null}
    .sessionKey=${opts.sessionKey ?? "main"}
    .messages=${blocks}
    .onA2UIAction=${opts.onA2UIAction ?? null}
  ></chat-a2ui-panel>`;
}

function renderA2UIBlocks(
  message: unknown,
  opts: {
    client?: GatewayBrowserClient | null;
    sessionKey?: string;
    onA2UIAction?: (action: import("@a2ui/web_core/v0_9").A2uiClientAction) => Promise<void> | void;
  },
) {
  const blocks = extractA2UIBlocks(message);
  return renderA2UIContent(blocks, { ...opts, inline: true });
}

function renderGroupedMessage(
  message: unknown,
  opts: {
    isStreaming: boolean;
    showReasoning: boolean;
    showToolTrace: boolean;
    hideFileAttachments?: boolean;
    client?: GatewayBrowserClient | null;
    sessionKey?: string;
    onA2UIAction?: (action: import("@a2ui/web_core/v0_9").A2uiClientAction) => Promise<void> | void;
    onFilePreview?: (req: FilePreviewRequest) => void;
  },
  onOpenSidebar?: (content: string) => void,
) {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role : "unknown";
  const isToolResult =
    isToolResultMessage(message) ||
    role.toLowerCase() === "toolresult" ||
    role.toLowerCase() === "tool_result" ||
    typeof m.toolCallId === "string" ||
    typeof m.tool_call_id === "string";

  if (!opts.showToolTrace && isToolResult) {
    return nothing;
  }

  const toolCards = opts.showToolTrace ? extractToolCards(message) : [];
  const hasToolCards = toolCards.length > 0;
  const images = extractImages(message);
  const hasImages = images.length > 0;
  const a2uiBlocks = extractA2UIBlocks(message);
  const hasA2UI = a2uiBlocks.length > 0;
  const fileBlocks = extractFileBlocks(message);
  const hasFiles = fileBlocks.length > 0;

  const extractedText = extractTextCached(message);
  const extractedThinking =
    opts.showReasoning && role === "assistant" ? extractThinkingCached(message) : null;
  const markdownBase =
    hasA2UI ? null : extractedText?.trim() ? extractedText : null;
  const reasoningMarkdown = extractedThinking ? formatReasoningMarkdown(extractedThinking) : null;
  let markdown = markdownBase ? stripMarkdownLocalImageRefs(markdownBase) : null;
  if (markdown && !markdown.trim()) {
    markdown = null;
  }
  const canCopyMarkdown = role === "assistant" && Boolean(markdown?.trim());

  const bubbleClasses = [
    "chat-bubble",
    canCopyMarkdown ? "has-copy" : "",
    opts.isStreaming ? "streaming" : "",
    "fade-in",
  ]
    .filter(Boolean)
    .join(" ");

  if (isToolResult) {
    return renderCollapsedToolResult(
      toolCards,
      images,
      markdown,
      reasoningMarkdown,
      opts,
      onOpenSidebar,
    );
  }

  if (!markdown && !hasToolCards && !hasImages && !hasA2UI && !hasFiles && !reasoningMarkdown) {
    return nothing;
  }

  return html`
    <div class="${bubbleClasses}">
      ${canCopyMarkdown ? renderCopyAsMarkdownButton(markdown!) : nothing}
      ${renderMessageImages(images, { client: opts.client, sessionKey: opts.sessionKey })}
      ${opts.hideFileAttachments ? nothing : renderFileAttachments(nonImageFileBlocks(fileBlocks), opts.onFilePreview)}
      ${opts.hideFileAttachments ? nothing : renderImageFileBlocks(fileBlocks, opts.onFilePreview)}
      ${
        reasoningMarkdown
          ? html`
              <details class="chat-thinking">
                <summary class="chat-thinking__summary">
                  思考过程
                </summary>
                <div class="chat-thinking__content">
                  ${unsafeHTML(toSanitizedMarkdownHtml(reasoningMarkdown))}
                </div>
              </details>
            `
          : nothing
      }
      ${
        markdown
          ? html`<div class="chat-text">${unsafeHTML(toSanitizedMarkdownHtml(markdown))}</div>`
          : nothing
      }
      ${renderA2UIBlocks(message, opts)}
      ${opts.showToolTrace
        ? toolCards.filter((card) => card.kind === "call").map(renderInlineToolCall)
        : nothing}
    </div>
  `;
}
