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
  "photo-quad": {
    heading: "Markets at a glance",
    image1Id: "sample-1",
    image2Id: "sample-2",
    image3Id: "sample-3",
    image4Id: "sample-4",
    caption1: "Caption one",
    caption2: "Caption two",
    caption3: "Caption three",
    caption4: "Caption four",
  },
  "photo-banner": {
    kicker: "Context",
    heading: "Argument under a wide image band",
    bullets: [
      "First supporting point for the banner layout",
      "Second supporting point for the banner layout",
      "Third supporting point for the banner layout",
    ],
    imageId: "sample",
  },
  "photo-divider": {
    number: "02",
    title: "Chapter over brand art",
    subtitle: "Optional supporting line under the chapter title",
    imageId: "sample",
  },
  "photo-quote": {
    quote: "A placeholder quote showing how an approved statement reads over the full-page brand art.",
    attribution: "First Last",
    role: "Chief Communications Officer",
    imageId: "sample",
  },
  "photo-kpi": {
    title: "Key figures on brand art",
    stats: [
      { value: "8,127", label: "Sample metric one" },
      { value: "+2.1%", label: "Sample metric two" },
      { value: "1.2M", label: "Sample metric three" },
    ],
    imageId: "sample",
  },
  closing: {
    headline: "Thank you",
    subline: "Questions and next steps",
    contactLine: "brand-room@example.com",
  },
  "icon-cards": {
    title: "What carries the strategy",
    cards: [
      { icon: "network", label: "Network leadership", text: "Placeholder line describing this pillar." },
      { icon: "people", label: "Customer focus", text: "Placeholder line describing this pillar." },
      { icon: "shield", label: "Trust and security", text: "Placeholder line describing this pillar." },
    ],
    sourceLine: "Source: layout preview",
  },
  "numbered-pillars": {
    title: "Strategic priorities",
    pillars: [
      { heading: "Sample pillar one", text: "Placeholder supporting line for this pillar." },
      { heading: "Sample pillar two", text: "Placeholder supporting line for this pillar." },
      { heading: "Sample pillar three", text: "Placeholder supporting line for this pillar." },
    ],
    sourceLine: "Source: layout preview",
  },
  "stat-tiles": {
    title: "Figures at a glance",
    tiles: [
      { value: "8,127", label: "Sample metric one", note: "vs prior period" },
      { value: "+2.1%", label: "Sample metric two" },
      { value: "1.2M", label: "Sample metric three" },
      { value: "94%", label: "Sample metric four", note: "of target" },
      { value: "3", label: "Sample metric five" },
      { value: "€310M", label: "Sample metric six" },
    ],
    sourceLine: "Source: layout preview",
  },
  "big-number": {
    kicker: "Momentum",
    value: "5.5M",
    label: "Sample hero figure label for this layout",
    callouts: [
      { value: "+18%", label: "Sample callout one" },
      { value: "3 of 4", label: "Sample callout two" },
      { value: "94%", label: "Sample callout three" },
    ],
    sourceLine: "Source: layout preview",
  },
  "list-bars": {
    title: "Key takeaways",
    items: [
      { text: "First takeaway line showing how a bar reads on this layout.", icon: "check" },
      { text: "Second takeaway line, numbered because it has no icon." },
      { text: "Third takeaway line with an icon marker.", icon: "growth" },
      { text: "Fourth takeaway line, numbered again." },
    ],
    sourceLine: "Source: layout preview",
  },
  "two-column-compare": {
    title: "Today and tomorrow",
    leftTitle: "Today",
    rightTitle: "Tomorrow",
    leftItems: ["Sample current-state line one", "Sample current-state line two", "Sample current-state line three"],
    rightItems: ["Sample future-state line one", "Sample future-state line two", "Sample future-state line three"],
    sourceLine: "Source: layout preview",
  },
  timeline: {
    title: "Roadmap",
    milestones: [
      { label: "Q1", text: "Sample milestone one" },
      { label: "Q2", text: "Sample milestone two" },
      { label: "Q3", text: "Sample milestone three" },
      { label: "Q4", text: "Sample milestone four" },
    ],
    sourceLine: "Source: layout preview",
  },
  "flow-steps": {
    title: "How it works",
    steps: [
      { label: "Brief", text: "Sample step description" },
      { label: "Compose", text: "Sample step description" },
      { label: "Review", text: "Sample step description" },
      { label: "Publish", text: "Sample step description" },
    ],
    sourceLine: "Source: layout preview",
  },
  "kpi-table": {
    title: "Results by market",
    columns: ["Market", "Value", "Change"],
    rows: [
      ["Sample market one", "3,001", "+1.2%"],
      ["Sample market two", "2,240", "-0.8%"],
      ["Sample market three", "2,886", "+3.1%"],
    ],
    chipLast: true,
    sourceLine: "Source: layout preview",
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
    style: def.previewStyle ?? "light",
  };
  const ops = def.compose(def.schema.parse(sample), ctx);
  const png = renderOpsPng(ops, bytes);
  if (sampleCache.size >= SAMPLE_CACHE_MAX) sampleCache.clear();
  sampleCache.set(cacheKey, png);
  return png;
}
