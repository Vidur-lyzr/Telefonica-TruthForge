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
} from "./visualLayouts";
import { renderOpsPng } from "./deckExtract/opsSvg";
import { getApprovedLayout } from "../data/extractedLayoutStore";
import { getDeckJob } from "../data/deckIntakeStore";
import type { ExtractedLayoutSpec } from "./extractedLayouts";

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

/** Render a sample slide PNG for any pool layout, or null when unknown. */
export function renderLayoutSamplePng(layoutId: string): Buffer | null {
  const def = getVisualLayout(layoutId);
  if (!def) return null;
  const extracted = CODED_IDS.has(layoutId) ? undefined : getApprovedLayout(layoutId);
  const sample = extracted ? sampleSlotsFromSpec(extracted.spec) : CODED_SAMPLES[layoutId];
  if (!sample) return null;
  const ctx: ComposeCtx = {
    // No images resolved — layouts draw their honest no-image fallback,
    // which keeps the preview deterministic and library-independent.
    images: Object.fromEntries(def.imageSlots.map((s) => [s.slot, null])),
    footerLabel: "Layout preview",
    confidentiality: "Internal use",
    generatedAt: new Date().toISOString(),
  };
  const ops = def.compose(def.schema.parse(sample), ctx);
  return renderOpsPng(ops);
}
