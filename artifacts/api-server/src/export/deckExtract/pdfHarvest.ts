// PDF intake fallback: image harvesting ONLY. PDFs carry no layout semantics
// we can trust (no placeholders, no slide masters), so the pipeline never
// proposes layout families from a PDF — it extracts embedded raster images
// with unpdf, re-encodes them as PNG, and feeds them into the same harvest
// queue the PPTX path uses. The upload UI labels the PDF option
// "PDF (images only)" so admins know the limitation up front.

import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import type { MediaAsset } from "./pptxParse";

// ---- Minimal PNG encoder ----------------------------------------------------
// unpdf returns decoded raw pixels (1/3/4 channels). We deliberately encode
// them with a tiny zlib-based PNG writer instead of adding a native image
// dependency (sharp) to the server bundle.

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Encode raw pixel data (grayscale, RGB or RGBA) as a PNG buffer. */
export function encodePng(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  channels: 1 | 3 | 4,
): Buffer {
  if (width <= 0 || height <= 0) throw new Error("encodePng: empty image");
  const expected = width * height * channels;
  if (pixels.length < expected) throw new Error("encodePng: pixel buffer too small");

  // PNG color type: 0 = grayscale, 2 = truecolor, 6 = truecolor + alpha.
  const colorType = channels === 1 ? 0 : channels === 3 ? 2 : 6;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(colorType, 9);
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Scanlines with filter byte 0 (None) per row.
  const rowBytes = width * channels;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0;
    for (let i = 0; i < rowBytes; i++) {
      raw[rowStart + 1 + i] = pixels[y * rowBytes + i]!;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- PDF part extraction ----------------------------------------------------

export interface PdfPartResult {
  media: MediaAsset[];
  pageCount: number;
  notes: string[];
}

/** Hard cap on decoded pixel count per image (guards absurd allocations and
 * multi-second synchronous deflate stalls — 16M px ≈ 64MB RGBA). */
const MAX_PIXELS = 16_000_000;

/**
 * Extract embedded raster images from one uploaded PDF part.
 * Page numbers become "slide" indexes (1-based, offset across parts) so the
 * harvest queue and review UI can keep using their slide-based labels.
 */
export async function parsePdfPartMedia(
  bytes: Buffer,
  partPrefix: string,
  pageOffset: number,
): Promise<PdfPartResult> {
  const { getDocumentProxy, extractImages } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const media: MediaAsset[] = [];
  const notes: string[] = [];
  let failedPages = 0;
  let skippedHuge = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    let images;
    try {
      images = await extractImages(pdf, pageNum);
    } catch {
      failedPages += 1;
      continue;
    }
    const globalPage = pageOffset + pageNum;
    for (let k = 0; k < images.length; k++) {
      const img = images[k]!;
      if (img.width <= 0 || img.height <= 0) continue;
      if (img.width * img.height > MAX_PIXELS) {
        skippedHuge += 1;
        continue;
      }
      let png: Buffer;
      try {
        png = encodePng(img.data, img.width, img.height, img.channels);
      } catch {
        continue;
      }
      media.push({
        path: `${partPrefix}/pdf/page${globalPage}/${img.key || `img${k + 1}`}.png`,
        bytes: png,
        contentType: "image/png",
        ext: "png",
        sha256: createHash("sha256").update(png).digest("hex"),
        width: img.width,
        height: img.height,
        slides: [globalPage],
      });
    }
  }

  if (failedPages > 0) {
    notes.push(`${failedPages} PDF page${failedPages === 1 ? "" : "s"} could not be scanned for images.`);
  }
  if (skippedHuge > 0) {
    notes.push(`${skippedHuge} oversized image${skippedHuge === 1 ? "" : "s"} skipped.`);
  }

  return { media, pageCount: pdf.numPages, notes };
}
