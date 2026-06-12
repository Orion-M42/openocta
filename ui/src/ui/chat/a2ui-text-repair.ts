import type { ComponentRecord } from "./a2ui-repair.ts";

const MARKDOWN_FENCE_RE = /```(text)?\s*([\s\S]*?)\s*```/g;
const LS_ENTRY_SPLIT_RE = /\s+(?=(?:total \d+)|(?:[d-][rwx-]{9,10}@?\s))/;

/** Fix collapsed command output and malformed markdown fences in A2UI Text. */
export function repairTextPresentation(text: string): string {
  if (!text.trim()) {
    return text;
  }
  const withFenceBreaks = ensureBlankLineBeforeFence(text);
  return withFenceBreaks.replace(MARKDOWN_FENCE_RE, (_match, lang: string | undefined, body: string) => {
    const fixed = repairListingBody(body.trim());
    return formatCodeFence(lang === "text" ? "text" : lang ?? "", fixed);
  });
}

/** Ensure opening ``` starts on its own line so marked parses fenced blocks. */
function ensureBlankLineBeforeFence(text: string): string {
  return text.replace(/([^\n])\s*(```)/g, "$1\n\n$2");
}

function formatCodeFence(lang: string, body: string): string {
  if (lang === "text") {
    return "```text\n" + body + "\n```";
  }
  if (lang) {
    return "```" + lang + "\n" + body + "\n```";
  }
  return "```\n" + body + "\n```";
}

/** Split collapsed ls -l / ls -alh listings and plain filename lists into readable lines. */
export function repairListingBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return body;
  }

  if (looksLikeMultilineLsListing(trimmed)) {
    return trimmed;
  }

  const lsSplit = splitLsListing(trimmed);
  if (lsSplit !== trimmed) {
    return lsSplit;
  }

  if (!trimmed.includes("\n")) {
    return collapseSpacesToLines(trimmed);
  }

  return trimmed;
}

function looksLikeMultilineLsListing(body: string): boolean {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return false;
  }
  let lsLike = 0;
  for (const line of lines) {
    if (/^total \d+/.test(line) || /^[d-][rwx-]/.test(line)) {
      lsLike++;
    }
  }
  return lsLike >= 2;
}

function splitLsListing(body: string): string {
  if (!/(?:^|\s)total \d+\s|[d-][rwx-]{9,10}@?\s/.test(body)) {
    return body;
  }
  const parts = body
    .trim()
    .split(LS_ENTRY_SPLIT_RE)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return body;
  }
  return parts.join("\n");
}

function collapseSpacesToLines(content: string): string {
  if (!content || content.includes("\n")) {
    return content;
  }
  const fields = content.trim().split(/\s+/).filter(Boolean);
  if (fields.length < 4 || !mostlyPathEntries(fields)) {
    return content;
  }
  return fields.join("\n");
}

function mostlyPathEntries(fields: string[]): boolean {
  if (fields.length < 4) {
    return false;
  }
  let strong = 0;
  let weakDirs = 0;
  for (const field of fields) {
    if (field.includes(".") || field.includes("-") || field.includes("_")) {
      strong++;
      continue;
    }
    if (field === "attachments" || field === "prompt" || field.endsWith("-report")) {
      weakDirs++;
      continue;
    }
    if (/[\u0080-\uFFFF]/.test(field)) {
      strong++;
    }
  }
  if (strong >= 2) {
    return true;
  }
  return fields.length >= 6 && strong + weakDirs >= 3;
}

export function repairTextComponents(components: ComponentRecord[]): ComponentRecord[] {
  return components.map((comp) => {
    if (comp.component !== "Text" || typeof comp.text !== "string" || !comp.text) {
      return comp;
    }
    const repaired = repairTextPresentation(comp.text);
    if (repaired === comp.text) {
      return comp;
    }
    return { ...comp, text: repaired };
  });
}
