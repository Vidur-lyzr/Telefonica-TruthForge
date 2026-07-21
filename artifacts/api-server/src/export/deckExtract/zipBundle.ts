// Zip-bundle intake: unpack a brand-asset .zip into its constituent decks,
// PDFs and loose images so the pipeline can route each to the right stage.
// Legacy binary formats (.ppt) and unsupported media are skipped with honest
// per-file reasons instead of failing the whole job.

import JSZip from "jszip";
import crypto from "node:crypto";
import { imageSize } from "image-size";
import { Resvg } from "@resvg/resvg-js";
import type { MediaAsset } from "./pptxParse";

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** Raster width for SVG logos — large enough for deck use, small enough to stay light. */
const SVG_RASTER_WIDTH = 1600;

// Zip-bomb defenses: a tiny crafted archive can inflate to gigabytes and OOM
// the shared server, so unpacking enforces hard caps and skips (or aborts)
// with honest reasons instead of allocating blindly.
const MAX_ENTRIES = 500;
const MAX_ENTRY_BYTES = 200 * 1024 * 1024; // per decompressed file
const MAX_TOTAL_BYTES = 1_500 * 1024 * 1024; // cumulative decompressed
/** Matches pdfHarvest's raster ceiling — extreme-aspect SVGs can't force giant bitmaps. */
const MAX_SVG_PIXELS = 16_000_000;

export class ZipBundleError extends Error {}

export interface ZipEntryFile {
  name: string;
  bytes: Buffer;
}

export interface ZipBundleResult {
  decks: ZipEntryFile[];
  pdfs: ZipEntryFile[];
  /** Loose images (PNG/JPG as-is, SVG rasterized to PNG), slides: [0]. */
  images: MediaAsset[];
  skipped: { name: string; reason: string }[];
}

function baseName(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function toAsset(
  partTag: string,
  name: string,
  buf: Buffer,
  contentType: string,
  ext: string,
  width: number,
  height: number,
): MediaAsset {
  return {
    path: `${partTag}:${name}`,
    bytes: buf,
    contentType,
    ext,
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    width,
    height,
    slides: [0],
  };
}

/**
 * Unpack one uploaded .zip part. Never throws on individual entries — a bad
 * file lands in `skipped` with a reason; only an unreadable archive throws.
 */
export async function unpackZipBundle(bytes: Buffer, partTag: string): Promise<ZipBundleResult> {
  const zip = await JSZip.loadAsync(bytes);
  const result: ZipBundleResult = { decks: [], pdfs: [], images: [], skipped: [] };

  let totalBytes = 0;
  let entryCount = 0;

  /** Inflate one entry within the caps; returns null (and records a skip) when over budget. */
  async function inflate(name: string, entry: JSZip.JSZipObject): Promise<Buffer | null> {
    const buf = await entry.async("nodebuffer");
    if (buf.length > MAX_ENTRY_BYTES) {
      result.skipped.push({ name, reason: "file is larger than 200 MB unpacked" });
      return null;
    }
    totalBytes += buf.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new ZipBundleError(
        "The bundle unpacks to more than 1.5 GB — split it into smaller zips and upload them as parts.",
      );
    }
    return buf;
  }

  const names = Object.keys(zip.files).sort();
  for (const name of names) {
    const entry = zip.files[name]!;
    if (entry.dir) continue;
    const base = baseName(name);
    // macOS resource forks and hidden files are noise, not user content.
    if (name.startsWith("__MACOSX/") || base.startsWith(".")) continue;
    entryCount += 1;
    if (entryCount > MAX_ENTRIES) {
      result.skipped.push({
        name,
        reason: `over the ${MAX_ENTRIES}-file limit — split the bundle into smaller zips`,
      });
      continue;
    }
    const dot = base.lastIndexOf(".");
    const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";

    if (ext === "pptx") {
      const buf = await inflate(name, entry);
      if (buf) result.decks.push({ name: base, bytes: buf });
      continue;
    }
    if (ext === "pdf") {
      const buf = await inflate(name, entry);
      if (buf) result.pdfs.push({ name: base, bytes: buf });
      continue;
    }
    if (IMAGE_TYPES[ext]) {
      const buf = await inflate(name, entry);
      if (!buf) continue;
      let width = 0;
      let height = 0;
      try {
        const dims = imageSize(buf);
        width = dims.width ?? 0;
        height = dims.height ?? 0;
      } catch {
        result.skipped.push({ name, reason: "unreadable image file" });
        continue;
      }
      result.images.push(
        toAsset(partTag, name, buf, IMAGE_TYPES[ext]!, ext === "jpeg" ? "jpg" : ext, width, height),
      );
      continue;
    }
    if (ext === "svg") {
      const raw = await inflate(name, entry);
      if (!raw) continue;
      try {
        const svg = raw.toString("utf8");
        const renderer = new Resvg(svg, {
          fitTo: { mode: "width", value: SVG_RASTER_WIDTH },
        });
        // Predict the raster size from the intrinsic aspect ratio BEFORE
        // rendering so an extreme-aspect SVG never allocates a giant bitmap.
        const iw = renderer.width;
        const ih = renderer.height;
        const predictedHeight = iw > 0 ? Math.ceil((SVG_RASTER_WIDTH * ih) / iw) : 0;
        if (iw <= 0 || ih <= 0 || SVG_RASTER_WIDTH * predictedHeight > MAX_SVG_PIXELS) {
          result.skipped.push({ name, reason: "SVG renders too large to rasterize" });
          continue;
        }
        const png = renderer.render().asPng();
        const buf = Buffer.from(png);
        const dims = imageSize(buf);
        result.images.push(
          toAsset(partTag, name, buf, "image/png", "png", dims.width ?? 0, dims.height ?? 0),
        );
      } catch (err) {
        if (err instanceof ZipBundleError) throw err;
        result.skipped.push({ name, reason: "SVG could not be rendered" });
      }
      continue;
    }
    if (ext === "ppt" || ext === "pps" || ext === "pot") {
      result.skipped.push({ name, reason: "legacy binary PowerPoint — save it as .pptx" });
      continue;
    }
    if (ext === "zip") {
      result.skipped.push({ name, reason: "nested zip archives are not unpacked" });
      continue;
    }
    result.skipped.push({ name, reason: ext ? `unsupported file type (.${ext})` : "unsupported file" });
  }
  return result;
}
