// Governed brand image library — the ONLY imagery the visual slide layouts
// may use. Admin-curated (Brand Room capability gated): every record points at
// an object-storage upload that has been confirmed, probed for dimensions and
// tagged. The generate agent selects images strictly by tag from this library;
// an empty match means NO image (honest fallback), never an off-library one.
//
// Records are admin-edited and low churn, so they persist as a JSONB snapshot
// (same write-behind pattern as the other admin stores).

import { logger } from "../lib/logger";
import { loadSnapshot, createSnapshotWriter } from "./dbSnapshot";
import { BRAND_IMAGE_SEED } from "./brandImageSeed";

const STORE_NAME = "brand-image-library";
const INSTANCE_TAG = Math.random().toString(36).slice(2, 8);

export const BRAND_IMAGE_CONTENT_TYPES = ["image/png", "image/jpeg"] as const;
export const MAX_IMAGE_TAGS = 12;
export const MAX_TAG_CHARS = 40;
export const MAX_LABEL_CHARS = 120;

export interface BrandImageRecord {
  id: string;
  /** Normalized object-storage path, e.g. /objects/uploads/<uuid>. */
  objectPath: string;
  filename: string;
  contentType: string;
  width: number;
  height: number;
  label: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
}

export class ImageLibraryError extends Error {
  readonly code: string;
  constructor(message: string, code = "invalid_image") {
    super(message);
    this.name = "ImageLibraryError";
    this.code = code;
  }
}

// ---- State + persistence -----------------------------------------------------

let images: Record<string, BrandImageRecord> = {};
let counter = 0;
// One-shot flag persisted with the snapshot: once the committed starter
// records have been applied, they are never re-applied — an admin deleting
// every image stays at zero, it does not resurrect the seed.
let seedApplied = false;

const writer = createSnapshotWriter(STORE_NAME, () => ({ images, seedApplied }));

export async function initImageLibrary(): Promise<void> {
  try {
    const raw = await loadSnapshot<{
      images?: Record<string, BrandImageRecord>;
      seedApplied?: boolean;
    }>(STORE_NAME);
    if (raw?.images && typeof raw.images === "object") {
      images = {};
      for (const [id, rec] of Object.entries(raw.images)) {
        if (
          rec &&
          typeof rec.objectPath === "string" &&
          rec.objectPath.startsWith("/objects/") &&
          typeof rec.width === "number" &&
          typeof rec.height === "number"
        ) {
          images[id] = { ...rec, tags: sanitizeTags(rec.tags ?? []) };
        }
      }
    }
    seedApplied = raw?.seedApplied === true;
    if (!seedApplied) {
      const existingPaths = new Set(Object.values(images).map((r) => r.objectPath));
      let added = 0;
      for (const rec of BRAND_IMAGE_SEED) {
        if (images[rec.id] || existingPaths.has(rec.objectPath)) continue;
        images[rec.id] = { ...rec, tags: sanitizeTags(rec.tags) };
        added += 1;
      }
      seedApplied = true;
      writer.schedule();
      logger.info({ added }, "image-library: starter seed applied");
    }
    logger.info({ images: Object.keys(images).length }, "image-library: loaded");
  } catch (err) {
    logger.error({ err }, "image-library: load failed — starting clean");
    images = {};
  }
}

/** Await any pending snapshot write (used by the seed script). */
export async function flushImageLibrary(): Promise<void> {
  await writer.flush();
}

// ---- Validation ----------------------------------------------------------------

export function sanitizeTags(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, MAX_TAG_CHARS);
    if (tag.length === 0 || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_IMAGE_TAGS) break;
  }
  return out;
}

function assertLabel(label: string): string {
  const value = label.trim();
  if (value.length === 0 || value.length > MAX_LABEL_CHARS) {
    throw new ImageLibraryError(
      `Image label must be between 1 and ${MAX_LABEL_CHARS} characters.`,
      "invalid_label",
    );
  }
  return value;
}

// ---- Reads ----------------------------------------------------------------------

export function listBrandImages(): BrandImageRecord[] {
  return Object.values(images).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function getBrandImage(id: string): BrandImageRecord | undefined {
  return images[id];
}

/** All distinct tags in the library, alphabetical — fed to the agent prompt. */
export function libraryTags(): string[] {
  const tags = new Set<string>();
  for (const rec of Object.values(images)) for (const t of rec.tags) tags.add(t);
  return [...tags].sort();
}

/**
 * Images matching ANY of the wanted tags, best match first (most wanted tags
 * in common). Empty result means the layout renders without an image.
 */
export function findImagesByTags(wanted: string[]): BrandImageRecord[] {
  const want = new Set(sanitizeTags(wanted));
  if (want.size === 0) return [];
  return listBrandImages()
    .map((rec) => ({ rec, hits: rec.tags.filter((t) => want.has(t)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.rec);
}

// ---- Mutations --------------------------------------------------------------------

export interface RegisterBrandImageInput {
  objectPath: string;
  filename: string;
  contentType: string;
  width: number;
  height: number;
  label: string;
  tags: string[];
  uploadedBy: string;
}

export function registerBrandImage(input: RegisterBrandImageInput): BrandImageRecord {
  if (!input.objectPath.startsWith("/objects/")) {
    throw new ImageLibraryError("Object path must be a normalized /objects/ path.", "invalid_object_path");
  }
  if (!(BRAND_IMAGE_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    throw new ImageLibraryError("Only PNG and JPEG images are supported.", "unsupported_content_type");
  }
  if (!Number.isFinite(input.width) || !Number.isFinite(input.height) || input.width < 16 || input.height < 16) {
    throw new ImageLibraryError("Image dimensions could not be verified.", "invalid_dimensions");
  }
  const duplicate = Object.values(images).find((r) => r.objectPath === input.objectPath);
  if (duplicate) {
    throw new ImageLibraryError("This upload is already registered in the library.", "duplicate_object");
  }
  const tags = sanitizeTags(input.tags);
  if (tags.length === 0) {
    throw new ImageLibraryError("At least one tag is required so the agent can find the image.", "missing_tags");
  }
  counter += 1;
  const rec: BrandImageRecord = {
    id: `img-${Date.now()}-${INSTANCE_TAG}-${counter}`,
    objectPath: input.objectPath,
    filename: input.filename.trim().slice(0, 160) || "image",
    contentType: input.contentType,
    width: Math.round(input.width),
    height: Math.round(input.height),
    label: assertLabel(input.label),
    tags,
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
  images[rec.id] = rec;
  writer.schedule();
  return rec;
}

export function updateBrandImage(
  id: string,
  edit: { label?: string; tags?: string[] },
): BrandImageRecord {
  const rec = images[id];
  if (!rec) throw new ImageLibraryError("Unknown image.", "unknown_image");
  if (edit.label !== undefined) rec.label = assertLabel(edit.label);
  if (edit.tags !== undefined) {
    const tags = sanitizeTags(edit.tags);
    if (tags.length === 0) {
      throw new ImageLibraryError("At least one tag is required so the agent can find the image.", "missing_tags");
    }
    rec.tags = tags;
  }
  writer.schedule();
  return rec;
}

export function deleteBrandImage(id: string): BrandImageRecord {
  const rec = images[id];
  if (!rec) throw new ImageLibraryError("Unknown image.", "unknown_image");
  delete images[id];
  writer.schedule();
  return rec;
}
