/**
 * Chat-related constants for the UI layer.
 */

/** Character threshold for showing tool output inline vs collapsed */
export const TOOL_INLINE_THRESHOLD = 80;

/** Maximum lines to show in collapsed preview */
export const PREVIEW_MAX_LINES = 2;

/** Maximum characters to show in collapsed preview */
export const PREVIEW_MAX_CHARS = 100;

/** Internal transport tools — not shown in the tool trace UI */
export const A2UI_PROTOCOL_TOOLS = new Set(["a2ui_push", "a2ui_reset"]);

export function isA2UIProtocolTool(name?: string): boolean {
  return A2UI_PROTOCOL_TOOLS.has((name ?? "").trim().toLowerCase());
}
