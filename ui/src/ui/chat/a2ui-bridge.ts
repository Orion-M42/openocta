import * as v0_9 from "@a2ui/web_core/v0_9";
import { basicCatalog } from "@a2ui/lit/v0_9";
import type { LitComponentApi } from "@a2ui/lit/v0_9";
import type { GatewayBrowserClient } from "../gateway.ts";
import { canonicalGatewaySessionKey } from "../sessions/session-key-utils.js";
import {
  coalesceA2UIMessages,
  collectReferencedIdsFromProperties,
  componentsArrayFromRaw,
  normalizeComponentMap,
  placeholderComponents,
  repairComponentList,
  type A2uiMessageRecord,
  type ComponentRecord,
  updateComponentsHasRoot,
} from "./a2ui-repair.ts";
import { repairTextPresentation } from "./a2ui-text-repair.ts";

const A2UI_LAYOUT_ONLY = new Set([
  "Column",
  "Row",
  "Card",
  "List",
  "Modal",
  "Tabs",
  "Text",
  "Divider",
  "Icon",
]);

const A2UI_INTERACTIVE = new Set([
  "Button",
  "TextField",
  "CheckBox",
  "Switch",
  "Slider",
  "DateTimeInput",
  "ChoicePicker",
  "Video",
  "AudioPlayer",
  "Image",
]);

type Processor = v0_9.MessageProcessor<LitComponentApi>;

/** Canonical basic catalog id — must match @a2ui/lit basicCatalog.id */
export const BASIC_CATALOG_ID = basicCatalog.id;

function normalizeCatalogId(catalogId: unknown): string {
  if (typeof catalogId !== "string" || catalogId.trim() === "") {
    return BASIC_CATALOG_ID;
  }
  switch (catalogId.trim()) {
    case "basic":
    case "basic_catalog":
    case "basicCatalog":
    case "standard":
    case "default":
      return BASIC_CATALOG_ID;
    default:
      return catalogId;
  }
}

function repairUpdateComponents(uc: A2uiMessageRecord): void {
  uc.components = repairComponentList(uc.components);
}

function defaultRootUpdate(surfaceId: string): v0_9.A2uiMessage {
  return {
    version: "v0.9",
    updateComponents: {
      surfaceId,
      components: [{ id: "root", component: "Text", text: "" }],
    },
  } as v0_9.A2uiMessage;
}

function cloneMessage(raw: unknown): v0_9.A2uiMessage {
  if (raw == null || typeof raw !== "object") {
    return raw as v0_9.A2uiMessage;
  }
  const msg = structuredClone(raw) as A2uiMessageRecord;
  const createSurface = msg.createSurface;
  if (createSurface != null && typeof createSurface === "object") {
    (createSurface as A2uiMessageRecord).catalogId = normalizeCatalogId(
      (createSurface as A2uiMessageRecord).catalogId,
    );
  }
  const beginRendering = msg.beginRendering;
  if (beginRendering != null && typeof beginRendering === "object") {
    (beginRendering as A2uiMessageRecord).catalogId = normalizeCatalogId(
      (beginRendering as A2uiMessageRecord).catalogId,
    );
  }
  if (msg.updateComponents != null && typeof msg.updateComponents === "object") {
    repairUpdateComponents(msg.updateComponents as A2uiMessageRecord);
  }
  return msg as v0_9.A2uiMessage;
}

/** Normalize agent shorthand (e.g. catalogId "basic") before the processor runs. */
export function normalizeA2UIMessages(messages: unknown[]): v0_9.A2uiMessage[] {
  return messages.map(cloneMessage);
}

/** Normalize and repair a batch so surfaces can render (root component, flat component format). */
export function repairA2UIMessages(messages: unknown[]): v0_9.A2uiMessage[] {
  const normalized = normalizeA2UIMessages(messages);
  const coalesced = coalesceA2UIMessages(normalized);
  const withSurfaces = ensureCreateSurfaceMessages(coalesced);
  const created = new Set<string>();
  const hasRoot = new Set<string>();

  for (const msg of withSurfaces) {
    const sid = msg.createSurface?.surfaceId;
    if (sid) {
      created.add(sid);
    }
    if (msg.updateComponents) {
      const uc = msg.updateComponents as unknown as A2uiMessageRecord;
      repairUpdateComponents(uc);
      const updateSid = msg.updateComponents.surfaceId;
      if (updateSid && updateComponentsHasRoot(uc.components as ComponentRecord[])) {
        hasRoot.add(updateSid);
      }
    }
  }

  const out = [...withSurfaces];
  for (const sid of created) {
    if (!hasRoot.has(sid)) {
      out.push(defaultRootUpdate(sid));
    }
  }
  return out;
}

/** Inject createSurface when agent only sends updateComponents (common a2ui_push mistake). */
function ensureCreateSurfaceMessages(messages: v0_9.A2uiMessage[]): v0_9.A2uiMessage[] {
  const haveCreate = new Set<string>();
  const needSurface = new Set<string>();

  for (const msg of messages) {
    const cs = msg.createSurface?.surfaceId;
    if (cs) {
      haveCreate.add(cs);
    }
    const uc = msg.updateComponents?.surfaceId;
    if (uc) {
      needSurface.add(uc);
    }
    const dm = msg.updateDataModel?.surfaceId;
    if (dm) {
      needSurface.add(dm);
    }
  }

  const prefix: v0_9.A2uiMessage[] = [];
  for (const sid of needSurface) {
    if (haveCreate.has(sid)) {
      continue;
    }
    haveCreate.add(sid);
    prefix.push({
      version: "v0.9",
      createSurface: { surfaceId: sid, catalogId: BASIC_CATALOG_ID },
    } as v0_9.A2uiMessage);
  }
  return prefix.length > 0 ? [...prefix, ...messages] : messages;
}

/** Last-resort: inject any component ids still referenced on the surface but missing from the model. */
export function ensureProcessorSurfacesComplete(processor: Processor): void {
  for (const [surfaceId, surface] of processor.model.surfacesMap.entries()) {
    const defined = new Set<string>();
    for (const [id] of surface.componentsModel.entries) {
      defined.add(id);
    }

    const missing = new Set<string>();
    for (const [, comp] of surface.componentsModel.entries) {
      const props = comp.properties as ComponentRecord;
      for (const ref of collectReferencedIdsFromProperties(props)) {
        if (!defined.has(ref)) {
          missing.add(ref);
        }
      }
    }

    if (missing.size === 0) {
      continue;
    }

    const components: ComponentRecord[] = [];
    const seen = new Set<string>(defined);
    for (const id of missing) {
      for (const ph of placeholderComponents(id)) {
        const phId = ph.id;
        if (typeof phId !== "string" || !phId || seen.has(phId)) {
          continue;
        }
        seen.add(phId);
        components.push(normalizeComponentMap(ph));
      }
    }
    if (components.length === 0) {
      continue;
    }
    processor.processMessages([
      {
        version: "v0.9",
        updateComponents: { surfaceId, components },
      } as v0_9.A2uiMessage,
    ]);
  }
}

export function createChatA2UIProcessor(onAction: v0_9.ActionListener): Processor {
  return new v0_9.MessageProcessor([basicCatalog], onAction);
}

export function processA2UIMessages(processor: Processor, messages: unknown[]): void {
  if (messages.length === 0) {
    return;
  }
  const repaired = repairA2UIMessages(messages);
  const pending: v0_9.A2uiMessage[] = [];
  const scheduled = new Set<string>();

  for (const msg of repaired) {
    const createSid = msg.createSurface?.surfaceId;
    if (createSid) {
      if (processor.model.getSurface(createSid) || scheduled.has(createSid)) {
        continue;
      }
      scheduled.add(createSid);
      pending.push(msg);
      continue;
    }

    const updateSid = msg.updateComponents?.surfaceId;
    if (
      updateSid &&
      !processor.model.getSurface(updateSid) &&
      !scheduled.has(updateSid)
    ) {
      scheduled.add(updateSid);
      pending.push({
        version: "v0.9",
        createSurface: { surfaceId: updateSid, catalogId: BASIC_CATALOG_ID },
      } as v0_9.A2uiMessage);
    }
    pending.push(msg);
  }

  if (pending.length > 0) {
    processor.processMessages(pending);
  }
  ensureProcessorSurfacesComplete(processor);
}

/** Create a fresh processor (e.g. when a new chat run starts). */
export function createFreshChatA2UIProcessor(onAction: v0_9.ActionListener): Processor {
  return createChatA2UIProcessor(onAction);
}

/** @deprecated Streaming reset is handled by clearing panel messages. */
export function resetChatA2UISurfaces(): void {
  // No-op: each chat-a2ui-panel owns its processor instance.
}

export async function dispatchChatA2UIAction(
  client: GatewayBrowserClient | null,
  sessionKey: string,
  action: v0_9.A2uiClientAction,
): Promise<void> {
  if (!client) {
    return;
  }
  const userAction = {
    name: action.name,
    surfaceId: action.surfaceId,
    sourceComponentId: action.sourceComponentId,
    timestamp: new Date().toISOString(),
    context: { ...action.context },
  };
  await client.request("chat.a2ui.action", {
    sessionKey: canonicalGatewaySessionKey(sessionKey),
    userAction,
  });
}

/** Surface id referenced by a single A2UI server message block. */
export function a2uiMessageSurfaceId(block: unknown): string | null {
  if (block == null || typeof block !== "object") {
    return null;
  }
  const record = block as Record<string, unknown>;
  for (const key of ["createSurface", "updateComponents", "deleteSurface", "beginRendering"] as const) {
    const payload = record[key];
    if (payload == null || typeof payload !== "object") {
      continue;
    }
    const surfaceId = (payload as Record<string, unknown>).surfaceId;
    if (typeof surfaceId === "string" && surfaceId.trim() !== "") {
      return surfaceId.trim();
    }
  }
  return null;
}

/** Drop persisted A2UI blocks for a surface after the user submits a button action. */
export function removeA2UISurfaceFromMessages(messages: unknown[], surfaceId: string): unknown[] {
  const sid = surfaceId.trim();
  if (!sid) {
    return messages;
  }
  const out: unknown[] = [];
  for (const msg of messages) {
    if (msg == null || typeof msg !== "object") {
      out.push(msg);
      continue;
    }
    const record = msg as Record<string, unknown>;
    const content = record.content;
    if (!Array.isArray(content)) {
      out.push(msg);
      continue;
    }
    const nextContent = content.filter((part) => {
      if (part == null || typeof part !== "object") {
        return true;
      }
      const block = part as Record<string, unknown>;
      if (block.type !== "a2ui") {
        return true;
      }
      return a2uiMessageSurfaceId(block.a2ui) !== sid;
    });
    if (nextContent.length === 0) {
      continue;
    }
    if (nextContent.length === content.length) {
      out.push(msg);
      continue;
    }
    out.push({ ...record, content: nextContent });
  }
  return out;
}

export function filterA2UIMessagesForSurface(messages: unknown[], surfaceId: string): unknown[] {
  const sid = surfaceId.trim();
  if (!sid) {
    return messages;
  }
  return messages.filter((block) => a2uiMessageSurfaceId(block) !== sid);
}

export function extractA2UIBlocks(message: unknown): unknown[] {
  const m = message as Record<string, unknown>;
  const content = m.content;
  if (!Array.isArray(content)) {
    return [];
  }
  const blocks: unknown[] = [];
  for (const part of content) {
    const item = part as Record<string, unknown>;
    if (item.type === "a2ui" && item.a2ui != null) {
      blocks.push(item.a2ui);
    }
  }
  return blocks;
}

function isTextOnlyA2UIComponents(components: ComponentRecord[]): boolean {
  if (components.length === 0) {
    return false;
  }
  let hasText = false;
  for (const comp of components) {
    const type = typeof comp.component === "string" ? comp.component : "";
    if (A2UI_INTERACTIVE.has(type)) {
      return false;
    }
    if (!A2UI_LAYOUT_ONLY.has(type)) {
      return false;
    }
    if (type === "Text" && typeof comp.text === "string" && comp.text.trim()) {
      hasText = true;
    }
  }
  return hasText;
}

/**
 * When A2UI is text-only (no buttons/inputs), return markdown for chat-text rendering.
 * Returns null when interactive widgets are present.
 */
export function extractA2UITextMarkdown(blocks: unknown[]): string | null {
  if (blocks.length === 0) {
    return null;
  }
  const repaired = repairA2UIMessages(blocks);
  const texts: string[] = [];
  for (const msg of repaired) {
    const uc = msg.updateComponents;
    if (!uc?.components) {
      continue;
    }
    const components = repairComponentList(uc.components);
    if (!isTextOnlyA2UIComponents(components)) {
      return null;
    }
    for (const comp of components) {
      if (comp.component !== "Text" || typeof comp.text !== "string" || !comp.text.trim()) {
        continue;
      }
      const trimmed = comp.text.trim();
      if (texts[texts.length - 1] !== trimmed) {
        texts.push(trimmed);
      }
    }
  }
  if (texts.length === 0) {
    return null;
  }
  return repairTextPresentation(texts.join("\n\n"));
}
