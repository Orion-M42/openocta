type MarkdownRenderer = (markdown: string, options?: unknown) => Promise<string>;
import { toSanitizedMarkdownHtml } from "../markdown.ts";

/** Shared markdown renderer for A2UI Text components (matches chat bubble styling). */
export function createA2UIMarkdownRenderer(): MarkdownRenderer {
  return async (markdown: string) => toSanitizedMarkdownHtml(markdown);
}
