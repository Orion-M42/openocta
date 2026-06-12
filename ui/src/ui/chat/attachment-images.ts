const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
/** Only explicit attachments/ paths — bare filenames in directory listings must not trigger loads. */
const ATTACHMENT_IMAGE_PATH_RE =
  /attachments\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|gif|webp|bmp|svg)/gi;

export type LocalImageRef = {
  alt: string;
  path: string;
};

export function isLocalImagePath(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("data:")) {
    return false;
  }
  return IMAGE_EXTENSION_RE.test(trimmed);
}

export function normalizeLocalImagePath(raw: string): string {
  const trimmed = raw.trim().replace(/^["'`]+|["'`]+$/g, "").replace(/^\.\//, "");
  if (!trimmed) {
    return "";
  }
  if (trimmed.includes("/") || /^attachments[/\\]/i.test(trimmed)) {
    return trimmed.replace(/\\/g, "/");
  }
  return `attachments/${trimmed}`;
}

export function parseMarkdownLocalImageRefs(text: string): LocalImageRef[] {
  if (!text.trim()) {
    return [];
  }
  const seen = new Set<string>();
  const out: LocalImageRef[] = [];
  for (const match of text.matchAll(MARKDOWN_IMAGE_RE)) {
    const alt = match[1]?.trim() ?? "";
    const raw = match[2]?.trim() ?? "";
    if (!isLocalImagePath(raw)) {
      continue;
    }
    const path = normalizeLocalImagePath(raw);
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    out.push({ alt, path });
  }
  return out;
}

export function extractReferencedImagePaths(text: string): string[] {
  if (!text.trim()) {
    return [];
  }
  const seen = new Set<string>();
  const paths: string[] = [];
  const add = (raw: string) => {
    const trimmed = raw.trim();
    if (!isLocalImagePath(trimmed)) {
      return;
    }
    const path = normalizeLocalImagePath(trimmed);
    if (!path || seen.has(path)) {
      return;
    }
    seen.add(path);
    paths.push(path);
  };

  for (const ref of parseMarkdownLocalImageRefs(text)) {
    add(ref.path);
  }
  for (const match of text.match(ATTACHMENT_IMAGE_PATH_RE) ?? []) {
    add(match);
  }
  return paths;
}

export function stripMarkdownLocalImageRefs(text: string): string {
  if (!text.trim()) {
    return text;
  }
  return text
    .replace(MARKDOWN_IMAGE_RE, (full, _alt, src) => (isLocalImagePath(String(src)) ? "" : full))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
