// Image-harvest candidate selection: which embedded deck images are worth
// offering to the brand library. Dedupes identical bytes across parts,
// filters out icons/decorative slivers, and caps the queue so the review
// screen stays reviewable.

import type { ParsedDeck, MediaAsset } from "./pptxParse";

const MIN_DIM_PX = 200;
const MIN_BYTES = 8 * 1024;
const MAX_ITEMS = 200;

export interface HarvestCandidate {
  /** Server-assigned asset key inside the job's asset map. */
  assetKey: string;
  bytes: Buffer;
  filename: string;
  contentType: string;
  width: number;
  height: number;
  sourceSlide: number;
  suggestedLabel: string;
  suggestedTags: string[];
}

function orientation(a: MediaAsset): string {
  if (a.width > a.height * 1.15) return "landscape";
  if (a.height > a.width * 1.15) return "portrait";
  return "square";
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug.length > 0 ? slug : "deck";
}

export function collectHarvestCandidates(
  deck: ParsedDeck,
  deckName: string,
): { candidates: HarvestCandidate[]; notes: string[] } {
  const notes: string[] = [];
  const bySha = new Map<string, MediaAsset>();
  let tooSmall = 0;
  let unsupported = 0;

  for (const media of deck.media) {
    if (media.contentType !== "image/png" && media.contentType !== "image/jpeg") {
      unsupported += 1;
      continue;
    }
    if (media.width < MIN_DIM_PX || media.height < MIN_DIM_PX || media.bytes.length < MIN_BYTES) {
      tooSmall += 1;
      continue;
    }
    const existing = bySha.get(media.sha256);
    if (existing) {
      for (const s of media.slides) {
        if (!existing.slides.includes(s)) existing.slides.push(s);
      }
    } else {
      bySha.set(media.sha256, media);
    }
  }

  const unique = [...bySha.values()].sort((a, b) => b.bytes.length - a.bytes.length);
  const kept = unique.slice(0, MAX_ITEMS);
  if (unique.length > MAX_ITEMS) {
    notes.push(`${unique.length - MAX_ITEMS} additional images were skipped to keep the review queue manageable.`);
  }
  if (tooSmall > 0) {
    notes.push(`${tooSmall} small or decorative images (under ${MIN_DIM_PX}px) were filtered out.`);
  }
  if (unsupported > 0 || deck.dropped.vectorMedia > 0) {
    notes.push(
      `${unsupported + deck.dropped.vectorMedia} non-photo media files (vector/EMF/other) cannot be harvested.`,
    );
  }

  const slug = slugify(deckName);
  const candidates = kept.map((media, i) => {
    const slide = Math.min(...media.slides);
    return {
      assetKey: `harvest-${i + 1}.${media.ext}`,
      bytes: media.bytes,
      filename: `${slug}-slide${slide}-${i + 1}.${media.ext}`,
      contentType: media.contentType,
      width: media.width,
      height: media.height,
      sourceSlide: slide,
      suggestedLabel: `${deckName} — slide ${slide} image`,
      suggestedTags: ["master-deck", orientation(media)],
    };
  });

  return { candidates, notes };
}
