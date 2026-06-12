import type * as v0_9 from "@a2ui/web_core/v0_9";
import { repairTextComponents } from "./a2ui-text-repair.ts";

export type ComponentRecord = Record<string, unknown>;
export type A2uiMessageRecord = Record<string, unknown>;

const layoutComponentTypes = new Set(["Column", "Row", "Modal", "Tabs", "Card", "List"]);

/** Accept array, id-keyed map, or single component object. */
export function componentsArrayFromRaw(raw: unknown): ComponentRecord[] {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => (item ?? {}) as ComponentRecord);
  }
  if (typeof raw !== "object") {
    return [];
  }
  const obj = raw as ComponentRecord;
  if ("id" in obj || "component" in obj) {
    return [obj];
  }
  const out: ComponentRecord[] = [];
  for (const [id, value] of Object.entries(obj)) {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const comp = { ...(value as ComponentRecord) };
    if (comp.id == null) {
      comp.id = id;
    }
    out.push(comp);
  }
  return out;
}

export function normalizeComponentMap(comp: ComponentRecord): ComponentRecord {
  const out: ComponentRecord = { ...comp };
  const rawComponent = comp.component;
  if (rawComponent != null && typeof rawComponent === "object" && !Array.isArray(rawComponent)) {
    const nested = rawComponent as ComponentRecord;
    const typeName = Object.keys(nested)[0];
    if (typeName) {
      out.component = typeName;
      const props = nested[typeName];
      if (props != null && typeof props === "object" && !Array.isArray(props)) {
        for (const [key, value] of Object.entries(props as ComponentRecord)) {
          if (!(key in out)) {
            out[key] = value;
          }
        }
      }
    }
  }
  if (typeof out.component !== "string") {
    out.component = "Text";
  }
  return out;
}

function addReferencedIds(referenced: Set<string>, raw: unknown): void {
  if (typeof raw === "string" && raw) {
    referenced.add(raw);
    return;
  }
  if (!Array.isArray(raw)) {
    return;
  }
  for (const item of raw) {
    if (typeof item === "string" && item) {
      referenced.add(item);
    }
  }
}

function addTabsChildRefs(referenced: Set<string>, raw: unknown): void {
  if (!Array.isArray(raw)) {
    return;
  }
  for (const item of raw) {
    if (item == null || typeof item !== "object") {
      continue;
    }
    const child = (item as ComponentRecord).child;
    if (typeof child === "string" && child) {
      referenced.add(child);
    }
  }
}

export function collectReferencedComponentIds(components: ComponentRecord[]): Set<string> {
  const referenced = new Set<string>();
  for (const comp of components) {
    addReferencedIds(referenced, comp.children);
    if (typeof comp.child === "string" && comp.child) {
      referenced.add(comp.child);
    }
    for (const field of ["trigger", "content"] as const) {
      const id = comp[field];
      if (typeof id === "string" && id) {
        referenced.add(id);
      }
    }
    addTabsChildRefs(referenced, comp.tabs);
    const childList = comp.children;
    if (childList != null && typeof childList === "object" && !Array.isArray(childList)) {
      const templateId = (childList as ComponentRecord).componentId;
      if (typeof templateId === "string" && templateId) {
        referenced.add(templateId);
      }
    }
  }
  return referenced;
}

export function collectReferencedIdsFromProperties(props: ComponentRecord): Set<string> {
  return collectReferencedComponentIds([props]);
}

export function placeholderComponents(id: string): ComponentRecord[] {
  const lower = id.toLowerCase();
  if (lower.includes("btn") || lower.includes("button")) {
    const labelID = `${id}_label`;
    return [
      { id: labelID, component: "Text", text: id },
      { id, component: "Button", child: labelID, action: { event: { name: "noop" } } },
    ];
  }
  return [{ id, component: "Text", text: "" }];
}

/** Hoist inline component objects from children arrays into top-level components. */
export function flattenInlineComponents(components: ComponentRecord[]): ComponentRecord[] {
  const out: ComponentRecord[] = [];
  const byId = new Map<string, ComponentRecord>();

  const ingest = (comp: ComponentRecord): void => {
    const normalized = normalizeComponentMap(comp);
    const id = normalized.id;
    if (typeof id !== "string" || !id) {
      out.push(normalized);
      return;
    }

    const rawChildren = normalized.children;
    if (Array.isArray(rawChildren)) {
      const childIds: string[] = [];
      for (const item of rawChildren) {
        if (typeof item === "string" && item) {
          childIds.push(item);
          continue;
        }
        if (item == null || typeof item !== "object") {
          continue;
        }
        const inline = normalizeComponentMap(item as ComponentRecord);
        let inlineId = inline.id;
        if (typeof inlineId !== "string" || !inlineId) {
          inlineId = `_inline_${id}_${childIds.length}`;
          inline.id = inlineId;
        }
        ingest(inline);
        childIds.push(inlineId);
      }
      normalized.children = childIds;
    }

    const existing = byId.get(id);
    if (existing) {
      Object.assign(existing, normalized);
      return;
    }
    byId.set(id, normalized);
    out.push(normalized);
  };

  for (const comp of components) {
    ingest(comp);
  }
  return out;
}

export function updateComponentsHasRoot(components: ComponentRecord[]): boolean {
  return components.some((comp) => comp.id === "root");
}

function topLevelComponentIds(components: ComponentRecord[], referenced: Set<string>): string[] {
  const topLevel: string[] = [];
  const seen = new Set<string>();
  for (const comp of components) {
    const id = comp.id;
    if (typeof id !== "string" || !id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    if (!referenced.has(id)) {
      topLevel.push(id);
    }
  }
  return topLevel;
}

function allComponentIds(components: ComponentRecord[]): string[] {
  return components
    .map((comp) => comp.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function ensureRootComponent(components: ComponentRecord[]): ComponentRecord[] {
  if (updateComponentsHasRoot(components) || components.length === 0) {
    return components;
  }

  const referenced = collectReferencedComponentIds(components);
  const topLevel = topLevelComponentIds(components, referenced);

  if (topLevel.length === 1) {
    const targetId = topLevel[0];
    const idx = components.findIndex((comp) => comp.id === targetId);
    if (idx >= 0) {
      const typeName = components[idx].component;
      if (typeof typeName === "string" && layoutComponentTypes.has(typeName)) {
        const updated = { ...components[idx], id: "root" };
        return components.map((comp, i) => (i === idx ? updated : comp));
      }
    }
  }

  const children = topLevel.length > 0 ? topLevel : allComponentIds(components);
  const root: ComponentRecord = {
    id: "root",
    component: "Column",
    children,
  };
  return [root, ...components];
}

export function synthesizeMissingReferencedComponents(components: ComponentRecord[]): ComponentRecord[] {
  let current = [...components];
  for (let pass = 0; pass < 4; pass++) {
    const defined = new Set<string>();
    for (const comp of current) {
      if (typeof comp.id === "string" && comp.id) {
        defined.add(comp.id);
      }
    }
    const referenced = collectReferencedComponentIds(current);
    const placeholders: ComponentRecord[] = [];
    for (const id of referenced) {
      if (defined.has(id)) {
        continue;
      }
      for (const ph of placeholderComponents(id)) {
        const phId = ph.id;
        if (typeof phId === "string" && phId && !defined.has(phId)) {
          defined.add(phId);
          placeholders.push(ph);
        }
      }
    }
    if (placeholders.length === 0) {
      return current;
    }
    current = [...current, ...placeholders];
  }
  return current;
}

/** Normalize agent shorthand `{ name }` to A2UI v0.9 `{ event: { name } }`. */
export function normalizeButtonAction(action: unknown): ComponentRecord | undefined {
  if (action == null || typeof action !== "object") {
    return undefined;
  }
  const raw = action as ComponentRecord;
  if (raw.event != null && typeof raw.event === "object") {
    return raw;
  }
  if (typeof raw.name === "string" && raw.name.trim() !== "") {
    return { event: { name: raw.name.trim(), context: raw.context as ComponentRecord | undefined } };
  }
  return raw;
}

/** Convert Button `label` (agent shorthand) to required `child` Text component. */
export function repairButtonLabels(components: ComponentRecord[]): ComponentRecord[] {
  const out = components.map((comp) => ({ ...comp }));
  const ids = new Set(
    out.map((comp) => comp.id).filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  for (const comp of out) {
    if (comp.component !== "Button" || comp.child) {
      continue;
    }
    const btnId = typeof comp.id === "string" ? comp.id : "btn";
    const labelText =
      typeof comp.label === "string"
        ? comp.label
        : typeof comp.text === "string"
          ? comp.text
          : btnId;
    const labelId = `${btnId}_label`;
    if (!ids.has(labelId)) {
      out.push({ id: labelId, component: "Text", text: labelText });
      ids.add(labelId);
    }
    comp.child = labelId;
    delete comp.label;
    const normalized = normalizeButtonAction(comp.action);
    if (normalized) {
      comp.action = normalized;
    }
  }
  return out;
}

function componentById(components: ComponentRecord[]): Map<string, ComponentRecord> {
  const map = new Map<string, ComponentRecord>();
  for (const comp of components) {
    const id = comp.id;
    if (typeof id === "string" && id) {
      map.set(id, comp);
    }
  }
  return map;
}

function isButtonRef(byId: Map<string, ComponentRecord>, id: string): boolean {
  return byId.get(id)?.component === "Button";
}

const CHAT_INPUT_CONFIRMATION_HINT =
  "\n\n请在聊天输入框回复 **确认** 执行，或 **取消** 放弃。";

function buttonActionName(action: unknown): string {
  if (action == null || typeof action !== "object") {
    return "";
  }
  const raw = action as ComponentRecord;
  const event = raw.event;
  if (event != null && typeof event === "object") {
    const name = (event as ComponentRecord).name;
    if (typeof name === "string") {
      return name.trim();
    }
  }
  if (typeof raw.name === "string") {
    return raw.name.trim();
  }
  return "";
}

function buttonLabelText(comp: ComponentRecord, byId: Map<string, ComponentRecord>): string {
  if (typeof comp.label === "string" && comp.label.trim()) {
    return comp.label.trim();
  }
  if (typeof comp.child === "string" && comp.child) {
    const textComp = byId.get(comp.child);
    if (typeof textComp?.text === "string") {
      return textComp.text.trim();
    }
  }
  return "";
}

function isCommandConfirmationButton(
  comp: ComponentRecord,
  byId: Map<string, ComponentRecord>,
): boolean {
  if (comp.component !== "Button") {
    return false;
  }
  const name = buttonActionName(comp.action).toLowerCase();
  if (name.startsWith("confirm") || name === "cancel" || name === "deny") {
    return true;
  }
  const label = buttonLabelText(comp, byId);
  if (!label) {
    return false;
  }
  if (label.includes("确认") || label.includes("取消")) {
    return true;
  }
  const lower = label.toLowerCase();
  return lower === "confirm" || lower === "cancel" || lower.startsWith("confirm ");
}

function looksLikeCommandConfirmationCopy(text: string): boolean {
  if (text.includes("确认") || text.includes("安全规则")) {
    return true;
  }
  const lower = text.toLowerCase();
  return lower.includes("bash") || text.includes("命令") || text.includes("执行 `") || text.includes("执行`");
}

function pruneRemovedChildRefs(comp: ComponentRecord, remove: Set<string>): void {
  if (!Array.isArray(comp.children)) {
    return;
  }
  const next = comp.children.filter((id): id is string => typeof id === "string" && id.length > 0 && !remove.has(id));
  if (next.length === 0) {
    delete comp.children;
    return;
  }
  comp.children = next;
}

function appendChatInputConfirmationHint(components: ComponentRecord[]): ComponentRecord[] {
  for (const comp of components) {
    if (typeof comp.text === "string" && (comp.text.includes("聊天输入框") || comp.text.includes("输入框回复"))) {
      return components;
    }
  }
  let targetIdx = -1;
  let targetScore = -1;
  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    if (comp.component !== "Text" || typeof comp.text !== "string" || !comp.text.trim()) {
      continue;
    }
    if (!looksLikeCommandConfirmationCopy(comp.text)) {
      continue;
    }
    let score = comp.text.length;
    if (comp.text.includes("命令") || comp.text.includes("执行")) {
      score += 1000;
    }
    if (score > targetScore) {
      targetScore = score;
      targetIdx = i;
    }
  }
  if (targetIdx < 0) {
    return components;
  }
  return components.map((item, index) =>
    index === targetIdx ? { ...item, text: item.text!.trimEnd() + CHAT_INPUT_CONFIRMATION_HINT } : item,
  );
}

/** Remove bash/command approval buttons; users confirm via chat input instead. */
export function stripCommandConfirmationButtons(components: ComponentRecord[]): ComponentRecord[] {
  const byId = componentById(components);
  const remove = new Set<string>();
  for (const comp of components) {
    if (!isCommandConfirmationButton(comp, byId)) {
      continue;
    }
    if (typeof comp.id === "string" && comp.id) {
      remove.add(comp.id);
    }
    if (typeof comp.child === "string" && comp.child) {
      remove.add(comp.child);
    }
  }
  if (remove.size === 0) {
    return components;
  }
  const out = components
    .filter((comp) => typeof comp.id !== "string" || !remove.has(comp.id))
    .map((comp) => {
      const clone = { ...comp };
      pruneRemovedChildRefs(clone, remove);
      return clone;
    });
  return appendChatInputConfirmationHint(out);
}

/** Place trailing confirm/cancel buttons on one Row instead of a vertical Column stack. */
export function wrapTrailingButtonsInRow(components: ComponentRecord[]): ComponentRecord[] {
  const root = components.find((comp) => comp.id === "root");
  if (!root || !Array.isArray(root.children)) {
    return components;
  }
  const childIds = root.children.filter((id): id is string => typeof id === "string" && id.length > 0);
  const byId = componentById(components);
  let start = childIds.length;
  while (start > 0 && isButtonRef(byId, childIds[start - 1] ?? "")) {
    start--;
  }
  const buttonIds = childIds.slice(start);
  if (buttonIds.length < 2) {
    return components;
  }
  const rowId = "_actions_row";
  const nextRootChildren = [...childIds.slice(0, start), rowId];
  const row: ComponentRecord = {
    id: rowId,
    component: "Row",
    children: buttonIds,
    justify: "end",
    align: "center",
  };
  return [
    ...components.map((comp) =>
      comp.id === "root" ? { ...comp, children: nextRootChildren } : comp,
    ),
    row,
  ];
}

export function repairComponentList(raw: unknown): ComponentRecord[] {
  let components = componentsArrayFromRaw(raw);
  if (components.length === 0) {
    return components;
  }
  components = flattenInlineComponents(components);
  components = repairButtonLabels(components);
  components = stripCommandConfirmationButtons(components);
  components = repairTextComponents(components);
  components = synthesizeMissingReferencedComponents(ensureRootComponent(components));
  components = wrapTrailingButtonsInRow(components);
  return components;
}

/** Merge all updateComponents per surfaceId (full replay makes this safe). */
export function coalesceA2UIMessages(messages: v0_9.A2uiMessage[]): v0_9.A2uiMessage[] {
  const withoutUC: v0_9.A2uiMessage[] = [];
  const ucParts = new Map<string, ComponentRecord[]>();

  for (const msg of messages) {
    if (msg.updateComponents?.surfaceId) {
      const sid = msg.updateComponents.surfaceId;
      const parts = ucParts.get(sid) ?? [];
      parts.push(...componentsArrayFromRaw(msg.updateComponents.components));
      ucParts.set(sid, parts);
      continue;
    }
    withoutUC.push(msg);
  }

  if (ucParts.size === 0) {
    return messages;
  }

  const out: v0_9.A2uiMessage[] = [];
  const inserted = new Set<string>();
  for (const msg of withoutUC) {
    out.push(msg);
    const sid = msg.createSurface?.surfaceId;
    if (sid && ucParts.has(sid) && !inserted.has(sid)) {
      inserted.add(sid);
      out.push(makeMergedUpdateComponents(sid, ucParts.get(sid)!));
    }
  }
  for (const [sid, parts] of ucParts) {
    if (inserted.has(sid)) {
      continue;
    }
    out.push(makeMergedUpdateComponents(sid, parts));
  }
  return out;
}

function makeMergedUpdateComponents(surfaceId: string, raw: ComponentRecord[]): v0_9.A2uiMessage {
  return {
    version: "v0.9",
    updateComponents: {
      surfaceId,
      components: repairComponentList(raw),
    },
  } as v0_9.A2uiMessage;
}
