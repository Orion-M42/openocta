import type { FileBlock } from "./file-blocks.ts";
import { fileBlockFromGatewayPayload } from "./file-blocks.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import { canonicalGatewaySessionKey } from "../sessions/session-key-utils.js";

const fileBlockCache = new Map<string, FileBlock>();
const inflight = new Map<string, Promise<FileBlock | null>>();

function cacheKey(sessionKey: string, path: string): string {
  return `${canonicalGatewaySessionKey(sessionKey)}::${path}`;
}

export function getCachedAttachmentBlock(sessionKey: string, path: string): FileBlock | undefined {
  return fileBlockCache.get(cacheKey(sessionKey, path));
}

export async function loadAttachmentBlock(
  client: GatewayBrowserClient,
  sessionKey: string,
  path: string,
): Promise<FileBlock | null> {
  const key = cacheKey(sessionKey, path);
  const cached = fileBlockCache.get(key);
  if (cached) {
    return cached;
  }
  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }
  const task = (async () => {
    try {
      const payload = await client.request<Record<string, unknown>>("chat.attachment.read", {
        sessionKey: canonicalGatewaySessionKey(sessionKey),
        path,
      });
      const block = fileBlockFromGatewayPayload(payload);
      if (block) {
        fileBlockCache.set(key, block);
      }
      return block;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}
