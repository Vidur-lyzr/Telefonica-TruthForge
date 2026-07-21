// The visual layout pool, made visible. Lists every layout the generate
// agent can pick from when composing a visual deck (coded + admin-approved
// extracted) and renders a deterministic sample slide for any of them —
// through the exact same compose and PNG engine the real deck exports use,
// so the preview IS what the layout produces.

import {
  VISUAL_LAYOUTS,
  getVisualLayout,
  visualLayoutCatalogue,
  type ComposeCtx,
  type ImageSlotSpec,
  type ResolvedImage,
  type VisualLayoutDef,
} from "./visualLayouts";
import { renderOpsPng } from "./deckExtract/opsSvg";
import { getApprovedLayout } from "../data/extractedLayoutStore";
import { getDeckJob } from "../data/deckIntakeStore";
import type { ExtractedLayoutSpec } from "./extractedLayouts";
import {
  findImagesByTags,
  listBrandImages,
  type BrandImageRecord,
} from "../data/imageLibraryStore";
import { fetchObjectBytes } from "../lib/imageBytes";

export interface VisualLayoutInfo {
  id: string;
  name: string;
  purpose: string;
  source: "coded" | "extracted";
  imageSlots: number;
  wantsChart: boolean;
  deckName?: string;
  approvedAt?: string;
}

const CODED_IDS = new Set(VISUAL_LAYOUTS.map((l) => l.id));

export function listVisualLayoutPool(): VisualLayoutInfo[] {
  return visualLayoutCatalogue().map((l) => {
    const base: VisualLayoutInfo = {
      id: l.id,
      name: l.name,
      purpose: l.purpose,
      source: CODED_IDS.has(l.id) ? "coded" : "extracted",
      imageSlots: l.imageSlots.length,
      wantsChart: l.wantsChart,
    };
    if (base.source === "extracted") {
      const rec = getApprovedLayout(l.id);
      if (rec) {
        base.approvedAt = rec.approvedAt;
        const job = rec.sourceJobId !== "manual" ? getDeckJob(rec.sourceJobId) : undefined;
        if (job) base.deckName = job.deckName;
      }
    }
    return base;
  });
}

// ---- Sample slot content ----------------------------------------------------

// Neutral, obviously synthetic copy for each coded layout — every value is
// hand-checked against the layout's own schema limits.
const CODED_SAMPLES: Record<string, Record<string, unknown>> = {
  "photo-cover": {
    kicker: "Strategy update",
    title: "Sample headline showing how the cover reads",
    subtitle: "Supporting subtitle copy for the opening slide",
    imageId: "sample",
  },
  "section-divider": {
    number: "01",
    title: "Section title",
    subtitle: "Optional supporting line under the chapter title",
  },
  agenda: {
    title: "Agenda",
    items: ["Market context", "Campaign performance", "Network momentum", "Next steps"],
  },
  "photo-split": {
    kicker: "Campaign",
    heading: "One idea per slide",
    body: "Placeholder body copy showing how the argument sits beside the image on this layout.",
    bullets: ["First supporting point", "Second supporting point"],
    imageId: "sample",
  },
  "news-card": {
    kicker: "News",
    headline: "Sample story headline for this layout",
    summary:
      "Placeholder summary copy showing how the story text fills the card next to the editorial image.",
    sourceLine: "Source: layout preview",
    imageId: "sample",
  },
  "kpi-stats": {
    title: "Key figures",
    stats: [
      { value: "8,127", label: "Sample metric one" },
      { value: "+2.1%", label: "Sample metric two" },
      { value: "3", label: "Sample metric three" },
    ],
  },
  "branded-content": {
    heading: "Branded content",
    body: "Placeholder body copy for the showcase panel beside the full-bleed image.",
    imageId: "sample",
  },
  "photo-statement": {
    kicker: "Momentum",
    statement: "One bold message carried by a full-background image",
    support: "Optional supporting line under the statement",
    imageId: "sample",
  },
  quote: {
    quote: "A placeholder quote showing how an approved statement fills this slide.",
    attribution: "First Last",
    role: "Chief Communications Officer",
  },
  "campaign-metrics": {
    title: "Campaign results",
    highlights: [
      { value: "1.2M", label: "Sample highlight one" },
      { value: "+18%", label: "Sample highlight two" },
    ],
  },
  "results-table": {
    title: "Results by market",
    columns: ["Market", "Value", "Change"],
    rows: [
      ["Sample row one", "3,001", "+1.2%"],
      ["Sample row two", "2,240", "+2.4%"],
      ["Sample row three", "2,886", "+3.1%"],
    ],
    sourceLine: "Source: layout preview",
  },
  "photo-trio": {
    heading: "Campaign moments",
    image1Id: "sample-1",
    image2Id: "sample-2",
    image3Id: "sample-3",
    caption1: "Caption one",
    caption2: "Caption two",
    caption3: "Caption three",
  },
  closing: {
    headline: "Thank you",
    subline: "Questions and next steps",
    contactLine: "brand-room@example.com",
  },
};

// Placeholder copy for extracted layouts, derived from the spec's own slot
// kinds and limits — same approach the intake pipeline uses for proposal
// previews.
function sampleSlotsFromSpec(spec: ExtractedLayoutSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const slot of spec.slots) {
    if (slot.kind === "text") {
      const base =
        slot.key === "title"
          ? "Sample headline for this layout"
          : slot.key === "subtitle"
            ? "Supporting subtitle copy"
            : "Placeholder body copy showing how text sits in this frame.";
      out[slot.key] = base.slice(0, Math.max(8, slot.maxChars)).trim();
    } else if (slot.kind === "bullets") {
      out[slot.key] = ["First supporting point", "Second supporting point", "Third supporting point"]
        .slice(0, Math.min(3, slot.maxItems))
        .map((s) => s.slice(0, slot.maxCharsPerItem));
    } else {
      out[slot.key] = "placeholder";
    }
  }
  return out;
}

// ---- Sample image selection --------------------------------------------------
//
// Previews resolve each image slot to a REAL brand-library image so the pool
// shows what the layout actually produces. Selection is deterministic for a
// given library state: the slot hint's words are matched against library tags
// (best match first), the remaining library is the fallback, and the starting
// candidate is rotated by a stable hash of layoutId+slot so different layouts
// showcase different photos. An empty library (or unreadable bytes) degrades
// to the layout's honest no-image fallback.

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function hintTokens(hint: string): string[] {
  return hint
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9]+/)
    .filter((w) => w.length >= 3);
}

function pickSampleImages(def: VisualLayoutDef): Map<string, BrandImageRecord> {
  const picked = new Map<string, BrandImageRecord>();
  const all = listBrandImages();
  if (all.length === 0) return picked;
  const used = new Set<string>();
  for (const spec of def.imageSlots) {
    const matches = findImagesByTags(hintTokens(spec.hint));
    const seen = new Set(matches.map((r) => r.id));
    const candidates = [...matches, ...all.filter((r) => !seen.has(r.id))];
    const start = stableHash(`${def.id}:${spec.slot}`) % candidates.length;
    let choice: BrandImageRecord | undefined;
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[(start + i) % candidates.length];
      if (!used.has(cand.id)) {
        choice = cand;
        break;
      }
    }
    choice = choice ?? candidates[start];
    used.add(choice.id);
    picked.set(spec.slot, choice);
  }
  return picked;
}

// Rendered-sample cache. The key includes the picked image ids (and the
// extracted layout's approval time), so any library or layout change produces
// a new key and stale pixels are never served.
const sampleCache = new Map<string, Buffer>();
const SAMPLE_CACHE_MAX = 64;

/** Render a sample slide PNG for any pool layout, or null when unknown. */
export async function renderLayoutSamplePng(layoutId: string): Promise<Buffer | null> {
  const def = getVisualLayout(layoutId);
  if (!def) return null;
  const extracted = CODED_IDS.has(layoutId) ? undefined : getApprovedLayout(layoutId);
  const sample = extracted ? sampleSlotsFromSpec(extracted.spec) : CODED_SAMPLES[layoutId];
  if (!sample) return null;

  const picked = pickSampleImages(def);
  const cacheKey = [
    layoutId,
    extracted?.approvedAt ?? "",
    ...[...picked.entries()].map(([slot, rec]) => `${slot}=${rec.id}`),
  ].join("|");
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  const images: Record<string, ResolvedImage | null> = {};
  const bytes: Record<string, Buffer> = {};
  for (const spec of def.imageSlots as ImageSlotSpec[]) {
    let resolved: ResolvedImage | null = null;
    const rec = picked.get(spec.slot);
    if (rec) {
      const buf = await fetchObjectBytes(rec.objectPath);
      if (buf) {
        const key = `${spec.slot}:${rec.id}`;
        bytes[key] = buf;
        resolved = { key, width: rec.width, height: rec.height };
      }
    }
    images[spec.slot] = resolved;
  }

  const ctx: ComposeCtx = {
    images,
    footerLabel: "Layout preview",
    confidentiality: "Internal use",
    generatedAt: new Date().toISOString(),
  };
  const ops = def.compose(def.schema.parse(sample), ctx);
  const png = renderOpsPng(ops, bytes);
  if (sampleCache.size >= SAMPLE_CACHE_MAX) sampleCache.clear();
  sampleCache.set(cacheKey, png);
  return png;
}
