const OPENOCTA_ATTACHMENTS_MARKER = "@@OPENOCTA_ATTACHMENTS@@";

export type ParsedOpenOctaImage = {
  url: string;
  filename?: string;
  alt?: string;
};

type RawAttachment = {
  type?: string;
  filename?: string;
  mimeType?: string;
  data?: string;
  url?: string;
};

export function stripOpenOctaAttachmentsMarker(text: string): string {
  const idx = text.indexOf(OPENOCTA_ATTACHMENTS_MARKER);
  if (idx < 0) {
    return text;
  }
  return text.slice(0, idx).trimEnd();
}

export type ParsedOpenOctaFile = {
  filename: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
};

export function parseOpenOctaFileAttachmentsFromText(text: string): ParsedOpenOctaFile[] {
  const idx = text.indexOf(OPENOCTA_ATTACHMENTS_MARKER);
  if (idx < 0) {
    return [];
  }
  const raw = text.slice(idx + OPENOCTA_ATTACHMENTS_MARKER.length).trim();
  if (!raw) {
    return [];
  }
  let attachments: RawAttachment[];
  try {
    attachments = JSON.parse(raw) as RawAttachment[];
  } catch {
    return [];
  }
  if (!Array.isArray(attachments)) {
    return [];
  }

  const files: ParsedOpenOctaFile[] = [];
  for (const item of attachments) {
    const kind = (item.type ?? "").toLowerCase();
    if (kind !== "file" && kind !== "document" && kind !== "attachment") {
      continue;
    }
    const mimeType = item.mimeType || "application/octet-stream";
    const filename = item.filename?.trim() || "download";
    if (item.data) {
      const data = item.data;
      const url = data.startsWith("data:") ? data : `data:${mimeType};base64,${data}`;
      files.push({ filename, mimeType, url });
      continue;
    }
    if (item.url) {
      files.push({ filename, mimeType, url: item.url });
    }
  }
  return files;
}

export function parseOpenOctaAttachmentsFromText(text: string): ParsedOpenOctaImage[] {
  const idx = text.indexOf(OPENOCTA_ATTACHMENTS_MARKER);
  if (idx < 0) {
    return [];
  }
  const raw = text.slice(idx + OPENOCTA_ATTACHMENTS_MARKER.length).trim();
  if (!raw) {
    return [];
  }
  let attachments: RawAttachment[];
  try {
    attachments = JSON.parse(raw) as RawAttachment[];
  } catch {
    return [];
  }
  if (!Array.isArray(attachments)) {
    return [];
  }

  const images: ParsedOpenOctaImage[] = [];
  for (const item of attachments) {
    if ((item.type ?? "").toLowerCase() !== "image") {
      continue;
    }
    const mimeType = item.mimeType || "image/png";
    const filename = item.filename?.trim() || undefined;
    if (item.data) {
      const data = item.data;
      const url = data.startsWith("data:") ? data : `data:${mimeType};base64,${data}`;
      images.push({ url, filename, alt: filename });
      continue;
    }
    if (item.url) {
      images.push({ url: item.url, filename, alt: filename });
    }
  }
  return images;
}
