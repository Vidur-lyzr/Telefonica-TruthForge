// Byte fetcher for governed brand-library images with a small in-memory LRU.
// Renderers never talk to object storage directly — the export model builder
// resolves an image id to bytes here (mirroring how charts are pre-rendered
// PNG buffers) so PPTX, PDF and preview all embed the exact same pixels.

import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { logger } from "./logger";

const MAX_ENTRIES = 24;

const cache = new Map<string, Buffer>();
const service = new ObjectStorageService();

function remember(key: string, value: Buffer): void {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * Fetch the bytes behind a normalized /objects/ path. Returns null (and logs)
 * when the object is missing — a deleted upload degrades to "no image",
 * never a failed export.
 */
export async function fetchObjectBytes(objectPath: string): Promise<Buffer | null> {
  const hit = cache.get(objectPath);
  if (hit) {
    remember(objectPath, hit);
    return hit;
  }
  try {
    const file = await service.getObjectEntityFile(objectPath);
    const [bytes] = await file.download();
    remember(objectPath, bytes);
    return bytes;
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      logger.warn({ objectPath }, "image-bytes: object missing — rendering without image");
      return null;
    }
    logger.error({ err, objectPath }, "image-bytes: fetch failed — rendering without image");
    return null;
  }
}

/** Drop a deleted image from the cache immediately. */
export function evictObjectBytes(objectPath: string): void {
  cache.delete(objectPath);
}
