// Visual slide layout engine — a coded layout library with strict slot
// schemas, modeled on the Telefónica reference decks (Capital Markets Day,
// weekly Marketing headlines, corporate master deck).
//
// Every layout is a deterministic compose function: typed slots (validated by
// Zod with hard char/count limits) in, a flat list of DRAW OPS out. The agent
// never draws or styles anything — it only fills slots; renderers never lay
// anything out — they interpret ops. Template adherence is therefore 100% by
// construction, and PPTX / PDF / preview parity is automatic because all
// three interpret the exact same op list.
//
// Units: INCHES on a 13.33 x 7.5 widescreen slide (pptx native; the pdfkit
// interpreters multiply by 72).
//
// Governance: slots are filled from governed, cited draft content upstream
// (agent) and the whole slot text passes through the Brand Guardian. Images
// come exclusively from the approved brand library — an unknown or deleted
// image degrades to an honest no-image fallback, never a wrong image.

import { z } from "zod/v4";
import { THEME_COLORS } from "./exportTheme";
import { getBrandImage } from "../data/imageLibraryStore";
import { fetchObjectBytes } from "../lib/imageBytes";
import { renderChart, type ExportSeries } from "./chartEngine";

const BRAND = THEME_COLORS.brand;
const NAVY = THEME_COLORS.navy;
const TEXT = THEME_COLORS.textPrimary;
const MUTED = THEME_COLORS.textSecondary;
const DIVIDER = THEME_COLORS.divider;
const ZEBRA = THEME_COLORS.backgroundAlt;
const BRAND_LOW = THEME_COLORS.brandLow;
const INVERSE = THEME_COLORS.inverse;
const INV_SEC = THEME_COLORS.inverseSecondary;
const INV_TER = THEME_COLORS.inverseTertiary;

export const SLIDE_W = 13.33;
export const SLIDE_H = 7.5;

// ---- Draw ops ---------------------------------------------------------------

export type DrawOp =
  | { op: "rect"; x: number; y: number; w: number; h: number; fill: string; alpha?: number }
  | { op: "line"; x: number; y: number; w: number; color: string; pt: number }
  | {
      op: "text";
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
      size: number;
      color: string;
      bold?: boolean;
      italic?: boolean;
      align?: "left" | "center" | "right";
      valign?: "top" | "middle";
      lineSpacing?: number;
      charSpacing?: number;
    }
  // Cover-cropped image; `key` indexes the slide's resolved bytes map.
  | { op: "image"; key: string; x: number; y: number; w: number; h: number }
  // The five-dot Telefónica mark, tinted.
  | { op: "mark"; color: string; x: number; y: number; w: number; h: number };

// A fully resolved visual slide: ops plus the exact bytes every image op
// references. Renderers embed these bytes verbatim — same pixels everywhere.
export interface VisualSlideModel {
  layoutId: string;
  ops: DrawOp[];
  images: Record<string, Buffer>;
}

// The unresolved form carried on a draft: which layout, and the slot payload
// the agent filled. Validated against the layout schema at resolve time.
export interface VisualSlideInput {
  layoutId: string;
  slots: Record<string, unknown>;
}

export class VisualSlideError extends Error {
  constructor(
    message: string,
    public readonly slideIndex: number,
  ) {
    super(message);
    this.name = "VisualSlideError";
  }
}

// ---- Layout registry --------------------------------------------------------

// Image reference resolved for compose: bytes key + intrinsic pixel size.
export interface ResolvedImage {
  key: string;
  width: number;
  height: number;
}

export interface ComposeCtx {
  // slot name → resolved image (null = honest no-image fallback).
  images: Record<string, ResolvedImage | null>;
  footerLabel: string;
  confidentiality: string;
  generatedAt: string;
}

export interface ImageSlotSpec {
  slot: string;
  required: boolean;
  // Guidance for the agent's tag-based selection.
  hint: string;
}

export interface VisualLayoutDef {
  id: string;
  name: string;
  // One-line purpose used by the agent to pick a layout — written as a
  // selection rule, not marketing copy.
  purpose: string;
  schema: z.ZodType<Record<string, unknown>>;
  imageSlots: ImageSlotSpec[];
  // True when the layout consumes a chart from the draft's governed series.
  wantsChart?: boolean;
  compose: (slots: Record<string, unknown>, ctx: ComposeCtx) => DrawOp[];
}

// Shared footer for visual content slides (covers/dividers draw their own).
function visualFooter(ctx: ComposeCtx, color: string = MUTED): DrawOp[] {
  return [
    { op: "text", text: `Telefónica · ${ctx.footerLabel}`, x: 0.5, y: 7.06, w: 8, h: 0.3, size: 9, color },
    { op: "text", text: ctx.confidentiality, x: 10.4, y: 7.06, w: 2.43, h: 0.3, size: 9, color, align: "right" },
  ];
}

// Honest no-image fallback: quiet tinted panel with a centered brand mark.
function imageOrFallback(
  img: ResolvedImage | null,
  x: number,
  y: number,
  w: number,
  h: number,
  fallbackFill: string = ZEBRA,
): DrawOp[] {
  if (img) return [{ op: "image", key: img.key, x, y, w, h }];
  const mw = Math.min(w, h) * 0.28;
  return [
    { op: "rect", x, y, w, h, fill: fallbackFill },
    { op: "mark", color: DIVIDER, x: x + (w - mw) / 2, y: y + (h - mw) / 2, w: mw, h: mw },
  ];
}

function dateLine(generatedAt: string): string {
  return new Date(generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const short = (max: number) => z.string().trim().min(1).max(max);

// ---- photo-cover --------------------------------------------------------
// Full-bleed brand-library photo, solid navy title band across the lower
// third (CMD cover look): kicker, two-line max title, subtitle, date line.

const photoCoverSchema = z
  .object({
    kicker: short(40),
    title: short(90),
    subtitle: short(120),
    imageId: z.string().trim().min(1),
  })
  .strict();

const photoCover: VisualLayoutDef = {
  id: "photo-cover",
  name: "Photo cover",
  purpose:
    "Opening slide of a deck. Use exactly once, always first. Needs a kicker (eyebrow label), a headline title of at most 90 characters (~2 lines), a one-line subtitle and one brand-library image.",
  schema: photoCoverSchema,
  imageSlots: [
    { slot: "imageId", required: true, hint: "Wide, atmospheric cover image matching the deck topic (tags like cover, network, city)." },
  ],
  compose(raw, ctx) {
    const s = photoCoverSchema.parse(raw);
    const img = ctx.images.imageId ?? null;
    const ops: DrawOp[] = [];
    // Full-bleed photo (or quiet navy fallback keeping the cover on-brand).
    if (img) {
      ops.push({ op: "image", key: img.key, x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });
    } else {
      ops.push({ op: "rect", x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: NAVY });
      ops.push({ op: "mark", color: BRAND, x: 5.96, y: 1.1, w: 1.4, h: 1.4 });
    }
    // Solid navy band carries all type — deterministic contrast, no gradients.
    ops.push({ op: "rect", x: 0, y: 4.55, w: SLIDE_W, h: SLIDE_H - 4.55, fill: NAVY });
    ops.push({ op: "rect", x: 0, y: 4.55, w: SLIDE_W, h: 0.06, fill: BRAND });
    // Wordmark chip top-left so the brand reads over any photo.
    ops.push({ op: "rect", x: 0, y: 0.42, w: 2.86, h: 0.84, fill: NAVY });
    ops.push({ op: "mark", color: BRAND, x: 0.5, y: 0.62, w: 0.44, h: 0.44 });
    ops.push({ op: "text", text: "Telefónica", x: 1.06, y: 0.6, w: 1.9, h: 0.5, size: 18, bold: true, color: INVERSE });
    ops.push({
      op: "text", text: s.kicker.toUpperCase(), x: 0.8, y: 4.85, w: 11.7, h: 0.35, size: 12,
      color: INV_SEC, charSpacing: 2,
    });
    ops.push({ op: "text", text: s.title, x: 0.8, y: 5.2, w: 11.7, h: 1.25, size: 34, bold: true, color: INVERSE, valign: "top" });
    ops.push({ op: "text", text: s.subtitle, x: 0.8, y: 6.5, w: 11.7, h: 0.4, size: 14, color: INV_SEC });
    ops.push({
      op: "text", text: `${dateLine(ctx.generatedAt)} · ${ctx.confidentiality}`, x: 0.8, y: 7.02, w: 11.7, h: 0.32,
      size: 10, color: INV_TER,
    });
    return ops;
  },
};

// ---- section-divider ------------------------------------------------------
// Full navy chapter break (CMD section look): oversized section number in
// brand blue, short title, optional one-line subtitle.

const sectionDividerSchema = z
  .object({
    number: short(4),
    title: short(60),
    subtitle: short(120).optional(),
  })
  .strict();

const sectionDivider: VisualLayoutDef = {
  id: "section-divider",
  name: "Section divider",
  purpose:
    "Chapter break between topic groups. Needs a short section number label (like \"01\"), a title of at most 60 characters and optionally a one-line subtitle. No image.",
  schema: sectionDividerSchema,
  imageSlots: [],
  compose(raw, ctx) {
    const s = sectionDividerSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: NAVY },
      { op: "rect", x: 0, y: 0, w: 0.25, h: SLIDE_H, fill: BRAND },
      { op: "mark", color: BRAND, x: 0.8, y: 0.62, w: 0.44, h: 0.44 },
      { op: "text", text: "Telefónica", x: 1.36, y: 0.6, w: 4, h: 0.5, size: 18, bold: true, color: INVERSE },
      { op: "text", text: s.number, x: 0.8, y: 1.9, w: 6, h: 1.9, size: 88, bold: true, color: BRAND, valign: "top" },
      { op: "rect", x: 0.85, y: 4.1, w: 1.6, h: 0.05, fill: BRAND },
      { op: "text", text: s.title, x: 0.8, y: 4.35, w: 11.7, h: 1.05, size: 34, bold: true, color: INVERSE, valign: "top" },
    ];
    if (s.subtitle) {
      ops.push({ op: "text", text: s.subtitle, x: 0.8, y: 5.55, w: 11.7, h: 0.6, size: 15, color: INV_SEC, valign: "top" });
    }
    ops.push(...visualFooter(ctx, INV_TER));
    return ops;
  },
};

// ---- agenda -----------------------------------------------------------------
// Navy left panel with the deck/agenda title; numbered item list on the right.

const agendaSchema = z
  .object({
    title: short(40),
    items: z.array(short(70)).min(3).max(7),
  })
  .strict();

const agenda: VisualLayoutDef = {
  id: "agenda",
  name: "Agenda",
  purpose:
    "Agenda or contents slide, usually second in the deck. Needs a short title and 3 to 7 item lines of at most 70 characters each. No image.",
  schema: agendaSchema,
  imageSlots: [],
  compose(raw, ctx) {
    const s = agendaSchema.parse(raw);
    const items = s.items;
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: 4.4, h: SLIDE_H, fill: NAVY },
      { op: "rect", x: 4.4, y: 0, w: 0.1, h: SLIDE_H, fill: BRAND },
      { op: "mark", color: BRAND, x: 0.8, y: 0.8, w: 0.5, h: 0.5 },
      { op: "text", text: "Telefónica", x: 0.78, y: 1.45, w: 3.4, h: 0.5, size: 19, bold: true, color: INVERSE },
      { op: "text", text: s.title, x: 0.8, y: 3.0, w: 3.2, h: 1.6, size: 30, bold: true, color: INVERSE, valign: "top" },
      { op: "text", text: ctx.confidentiality.toUpperCase(), x: 0.8, y: 6.6, w: 3.2, h: 0.35, size: 9, color: INV_TER },
    ];
    const top = 1.15;
    const bottom = 6.7;
    const step = Math.min(0.95, (bottom - top) / items.length);
    items.forEach((item, i) => {
      const y = top + i * step;
      ops.push({ op: "text", text: String(i + 1).padStart(2, "0"), x: 5.1, y, w: 0.75, h: 0.55, size: 18, bold: true, color: BRAND });
      ops.push({ op: "text", text: item, x: 6.0, y, w: 6.5, h: 0.55, size: 15, color: TEXT });
      if (i < items.length - 1) {
        ops.push({ op: "line", x: 5.1, y: y + step - 0.14, w: 7.4, color: DIVIDER, pt: 0.75 });
      }
    });
    return ops;
  },
};

// ---- photo-split --------------------------------------------------------------
// Brand-library photo on the left half, argument on the right: kicker,
// heading, short body, up to four bullet lines.

const photoSplitSchema = z
  .object({
    kicker: short(40).optional(),
    heading: short(80),
    body: short(360),
    bullets: z.array(short(90)).max(4).optional(),
    imageId: z.string().trim().min(1),
  })
  .strict();

const photoSplit: VisualLayoutDef = {
  id: "photo-split",
  name: "Photo split",
  purpose:
    "Standard content slide pairing one image with an argument. Needs a heading (max 80 chars), a short body paragraph (max 360 chars), optionally a kicker and up to 4 bullet lines, and one brand-library image.",
  schema: photoSplitSchema,
  imageSlots: [
    { slot: "imageId", required: true, hint: "Image supporting the slide's single idea (people, network, product — match the heading)." },
  ],
  compose(raw, ctx) {
    const s = photoSplitSchema.parse(raw);
    const ops: DrawOp[] = [
      ...imageOrFallback(ctx.images.imageId ?? null, 0, 0, 6.1, SLIDE_H),
      { op: "rect", x: 6.1, y: 0, w: 0.08, h: SLIDE_H, fill: BRAND },
    ];
    let y = 1.0;
    if (s.kicker) {
      ops.push({ op: "text", text: s.kicker.toUpperCase(), x: 6.7, y, w: 6.1, h: 0.35, size: 11, color: BRAND, charSpacing: 2 });
      y += 0.5;
    }
    ops.push({ op: "text", text: s.heading, x: 6.7, y, w: 6.1, h: 1.15, size: 26, bold: true, color: NAVY, valign: "top" });
    y += 1.35;
    ops.push({ op: "text", text: s.body, x: 6.7, y, w: 6.1, h: 2.0, size: 13, color: TEXT, valign: "top", lineSpacing: 1.15 });
    y += 2.2;
    for (const bullet of s.bullets ?? []) {
      ops.push({ op: "rect", x: 6.7, y: y + 0.16, w: 0.1, h: 0.1, fill: BRAND });
      ops.push({ op: "text", text: bullet, x: 6.95, y, w: 5.85, h: 0.5, size: 12, color: TEXT, valign: "top" });
      y += 0.55;
    }
    // Footer stays in the text column — the default left position would sit
    // on top of the photo.
    ops.push({ op: "text", text: `Telefónica · ${ctx.footerLabel}`, x: 6.7, y: 7.06, w: 4.5, h: 0.3, size: 9, color: MUTED });
    ops.push({ op: "text", text: ctx.confidentiality, x: 10.4, y: 7.06, w: 2.43, h: 0.3, size: 9, color: MUTED, align: "right" });
    return ops;
  },
};

// ---- news-card ----------------------------------------------------------------
// Weekly Marketing headlines look: one story — headline, summary and source
// line on the left, image card on the right.

const newsCardSchema = z
  .object({
    kicker: short(30),
    headline: short(110),
    summary: short(340),
    sourceLine: short(90),
    imageId: z.string().trim().min(1),
  })
  .strict();

const newsCard: VisualLayoutDef = {
  id: "news-card",
  name: "News card",
  purpose:
    "Single news story or announcement (weekly-headlines register). Needs a kicker (like NEWS or CAMPAIGN), a headline (max 110 chars), a summary paragraph (max 340 chars), a source line naming where the story ran, and one image.",
  schema: newsCardSchema,
  imageSlots: [
    { slot: "imageId", required: true, hint: "Editorial image for the story (campaign still, event photo, product shot)." },
  ],
  compose(raw, ctx) {
    const s = newsCardSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: 0.18, fill: BRAND },
      { op: "text", text: s.kicker.toUpperCase(), x: 0.8, y: 0.75, w: 6, h: 0.35, size: 11, color: BRAND, charSpacing: 2 },
      { op: "text", text: s.headline, x: 0.8, y: 1.25, w: 6.6, h: 1.8, size: 27, bold: true, color: NAVY, valign: "top" },
      { op: "text", text: s.summary, x: 0.8, y: 3.25, w: 6.6, h: 2.4, size: 13, color: TEXT, valign: "top", lineSpacing: 1.2 },
      { op: "line", x: 0.8, y: 6.1, w: 6.6, color: DIVIDER, pt: 0.75 },
      { op: "text", text: s.sourceLine, x: 0.8, y: 6.25, w: 6.6, h: 0.4, size: 10, italic: true, color: MUTED },
      ...imageOrFallback(ctx.images.imageId ?? null, 7.9, 0.75, 4.63, 5.9),
      { op: "rect", x: 7.9, y: 6.65, w: 4.63, h: 0.07, fill: BRAND },
    ];
    ops.push(...visualFooter(ctx));
    return ops;
  },
};

// ---- kpi-stats -----------------------------------------------------------------
// Two to four stat cards in a row — the cited figures ARE the slide.

const kpiStatsSchema = z
  .object({
    title: short(70),
    stats: z
      .array(
        z
          .object({
            value: short(16),
            label: short(60),
            note: short(40).optional(),
          })
          .strict(),
      )
      .min(2)
      .max(4),
  })
  .strict();

const kpiStats: VisualLayoutDef = {
  id: "kpi-stats",
  name: "KPI stats",
  purpose:
    "Figures-first slide with 2 to 4 stat cards. Each stat needs a short value (like \"€8,127m\" or \"+2.1%\", max 16 chars), a label (max 60 chars) and optionally a small note such as a citation marker or period. No image.",
  schema: kpiStatsSchema,
  imageSlots: [],
  compose(raw, ctx) {
    const s = kpiStatsSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: 0.18, fill: BRAND },
      { op: "text", text: s.title, x: 0.8, y: 0.75, w: 11.73, h: 0.85, size: 24, bold: true, color: NAVY, valign: "top" },
    ];
    const n = s.stats.length;
    const gap = 0.35;
    const cardW = (11.73 - (n - 1) * gap) / n;
    const cardY = 2.15;
    const cardH = 3.7;
    s.stats.forEach((stat, i) => {
      const x = 0.8 + i * (cardW + gap);
      ops.push({ op: "rect", x, y: cardY, w: cardW, h: cardH, fill: ZEBRA });
      ops.push({ op: "rect", x, y: cardY, w: cardW, h: 0.07, fill: BRAND });
      ops.push({ op: "text", text: stat.value, x: x + 0.3, y: cardY + 0.65, w: cardW - 0.6, h: 1.0, size: n === 4 ? 30 : 36, bold: true, color: NAVY, valign: "top" });
      ops.push({ op: "text", text: stat.label, x: x + 0.3, y: cardY + 1.85, w: cardW - 0.6, h: 1.0, size: 13, color: TEXT, valign: "top", lineSpacing: 1.1 });
      if (stat.note) {
        ops.push({ op: "text", text: stat.note, x: x + 0.3, y: cardY + cardH - 0.6, w: cardW - 0.6, h: 0.35, size: 10, color: MUTED });
      }
    });
    ops.push(...visualFooter(ctx));
    return ops;
  },
};

// ---- branded-content ------------------------------------------------------------
// Full-bleed image with a solid navy content panel on the left (branded
// content / campaign showcase look).

const brandedContentSchema = z
  .object({
    heading: short(80),
    body: short(360),
    imageId: z.string().trim().min(1),
  })
  .strict();

const brandedContent: VisualLayoutDef = {
  id: "branded-content",
  name: "Branded content",
  purpose:
    "Image-led showcase slide (campaign, sponsorship, branded content). Needs a heading (max 80 chars), a body paragraph (max 360 chars) and one strong brand-library image that fills the slide.",
  schema: brandedContentSchema,
  imageSlots: [
    { slot: "imageId", required: true, hint: "Hero image that can carry the whole slide (stadium, city, campaign still)." },
  ],
  compose(raw, ctx) {
    const s = brandedContentSchema.parse(raw);
    const img = ctx.images.imageId ?? null;
    const ops: DrawOp[] = [];
    if (img) {
      ops.push({ op: "image", key: img.key, x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });
    } else {
      ops.push({ op: "rect", x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: ZEBRA });
      ops.push({ op: "mark", color: DIVIDER, x: 8.6, y: 2.9, w: 1.7, h: 1.7 });
    }
    ops.push({ op: "rect", x: 0, y: 0, w: 5.3, h: SLIDE_H, fill: NAVY });
    ops.push({ op: "rect", x: 5.3, y: 0, w: 0.08, h: SLIDE_H, fill: BRAND });
    ops.push({ op: "mark", color: BRAND, x: 0.8, y: 0.8, w: 0.5, h: 0.5 });
    ops.push({ op: "text", text: "Telefónica", x: 0.78, y: 1.45, w: 3.7, h: 0.5, size: 19, bold: true, color: INVERSE });
    ops.push({ op: "text", text: s.heading, x: 0.8, y: 2.6, w: 3.9, h: 1.7, size: 26, bold: true, color: INVERSE, valign: "top" });
    ops.push({ op: "rect", x: 0.8, y: 4.35, w: 1.2, h: 0.045, fill: BRAND });
    ops.push({ op: "text", text: s.body, x: 0.8, y: 4.6, w: 3.9, h: 2.0, size: 12, color: INV_SEC, valign: "top", lineSpacing: 1.2 });
    ops.push({ op: "text", text: `Telefónica · ${ctx.footerLabel}`, x: 0.8, y: 7.06, w: 4.2, h: 0.3, size: 9, color: INV_TER });
    ops.push({ op: "text", text: ctx.confidentiality, x: 10.4, y: 7.06, w: 2.43, h: 0.3, size: 9, color: INVERSE, align: "right" });
    return ops;
  },
};

// ---- quote -----------------------------------------------------------------------
// Approved quote, brand-blue full bleed, attribution with role.

const quoteSchema = z
  .object({
    quote: z.string().trim().min(1).max(260),
    attribution: short(60),
    role: short(80).optional(),
  })
  .strict();

const quoteLayout: VisualLayoutDef = {
  id: "quote",
  name: "Quote",
  purpose:
    "One approved quote as a full slide. Needs the quote text (max 260 chars, without surrounding quote marks), the speaker's name and optionally their role. Use only quotes present in the governed draft. No image.",
  schema: quoteSchema,
  imageSlots: [],
  compose(raw, ctx) {
    const s = quoteSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: BRAND },
      { op: "rect", x: 0, y: SLIDE_H - 0.18, w: SLIDE_W, h: 0.18, fill: NAVY },
      { op: "mark", color: INVERSE, x: 0.8, y: 0.75, w: 0.55, h: 0.55 },
      { op: "text", text: `\u201C${s.quote}\u201D`, x: 1.5, y: 2.0, w: 10.3, h: 2.9, size: 27, bold: true, color: INVERSE, valign: "top", lineSpacing: 1.15 },
      { op: "rect", x: 1.5, y: 5.15, w: 1.4, h: 0.045, fill: INVERSE },
      { op: "text", text: s.attribution, x: 1.5, y: 5.4, w: 10.3, h: 0.45, size: 15, bold: true, color: INVERSE },
    ];
    if (s.role) {
      ops.push({ op: "text", text: s.role, x: 1.5, y: 5.85, w: 10.3, h: 0.4, size: 12, color: INV_SEC });
    }
    ops.push(...visualFooter(ctx, INV_TER));
    return ops;
  },
};

// ---- campaign-metrics ------------------------------------------------------------
// Governed chart on the right, up to three highlight figures on the left.

const campaignMetricsSchema = z
  .object({
    title: short(80),
    chartId: z.string().trim().min(1).optional(),
    highlights: z
      .array(z.object({ value: short(14), label: short(50) }).strict())
      .max(3)
      .optional(),
  })
  .strict();

const campaignMetrics: VisualLayoutDef = {
  id: "campaign-metrics",
  name: "Campaign metrics",
  purpose:
    "Chart-led results slide. Needs a title and, optionally, the id of one of the draft's governed chart series (chartId) plus up to 3 highlight figures (value max 14 chars, label max 50). Only usable when the draft carries at least one chart series. No brand-library image.",
  schema: campaignMetricsSchema,
  imageSlots: [],
  wantsChart: true,
  compose(raw, ctx) {
    const s = campaignMetricsSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: 0.18, fill: BRAND },
      { op: "text", text: s.title, x: 0.8, y: 0.75, w: 11.73, h: 0.85, size: 24, bold: true, color: NAVY, valign: "top" },
    ];
    const chart = ctx.images.chart ?? null;
    if (chart) {
      // Fit, not crop: the chart PNG is ~1.9:1, the box matches that ratio.
      ops.push({ op: "image", key: chart.key, x: 5.5, y: 2.15, w: 7.03, h: 3.67 });
    } else {
      ops.push(...imageOrFallback(null, 5.5, 2.15, 7.03, 3.67));
      ops.push({ op: "text", text: "No governed series available for this deck.", x: 5.5, y: 5.95, w: 7.03, h: 0.35, size: 10, italic: true, color: MUTED });
    }
    const highlights = s.highlights ?? [];
    let y = 2.15;
    for (const h of highlights) {
      ops.push({ op: "text", text: h.value, x: 0.8, y, w: 4.3, h: 0.8, size: 30, bold: true, color: BRAND, valign: "top" });
      ops.push({ op: "text", text: h.label, x: 0.8, y: y + 0.75, w: 4.3, h: 0.45, size: 12, color: TEXT, valign: "top" });
      y += 1.45;
    }
    ops.push(...visualFooter(ctx));
    return ops;
  },
};

// ---- results-table -----------------------------------------------------------------
// Compact cited table: 2-5 columns, up to 6 rows, optional source line.

const resultsTableSchema = z
  .object({
    title: short(70),
    columns: z.array(short(24)).min(2).max(5),
    rows: z.array(z.array(short(40)).min(2).max(5)).min(1).max(6),
    sourceLine: short(90).optional(),
  })
  .strict()
  .refine((v) => v.rows.every((r) => r.length === v.columns.length), {
    message: "every row must have exactly one cell per column",
    path: ["rows"],
  });

const resultsTable: VisualLayoutDef = {
  id: "results-table",
  name: "Results table",
  purpose:
    "Tabular figures slide. Needs a title, 2 to 5 column headers (max 24 chars each), 1 to 6 rows whose cell count matches the columns (max 40 chars per cell), and optionally a source line. No image.",
  schema: resultsTableSchema,
  imageSlots: [],
  compose(raw, ctx) {
    const s = resultsTableSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: 0.18, fill: BRAND },
      { op: "text", text: s.title, x: 0.8, y: 0.75, w: 11.73, h: 0.85, size: 24, bold: true, color: NAVY, valign: "top" },
    ];
    const tableX = 0.8;
    const tableW = 11.73;
    const colW = tableW / s.columns.length;
    const headerY = 2.05;
    const headerH = 0.55;
    const rowH = 0.55;
    ops.push({ op: "rect", x: tableX, y: headerY, w: tableW, h: headerH, fill: NAVY });
    s.columns.forEach((col, c) => {
      ops.push({ op: "text", text: col, x: tableX + c * colW + 0.18, y: headerY + 0.06, w: colW - 0.36, h: headerH - 0.12, size: 12, bold: true, color: INVERSE });
    });
    s.rows.forEach((row, r) => {
      const y = headerY + headerH + r * rowH;
      if (r % 2 === 1) {
        ops.push({ op: "rect", x: tableX, y, w: tableW, h: rowH, fill: ZEBRA });
      }
      row.forEach((cell, c) => {
        ops.push({ op: "text", text: cell, x: tableX + c * colW + 0.18, y: y + 0.06, w: colW - 0.36, h: rowH - 0.12, size: 11, color: TEXT });
      });
    });
    const tableBottom = headerY + headerH + s.rows.length * rowH;
    ops.push({ op: "line", x: tableX, y: tableBottom + 0.02, w: tableW, color: DIVIDER, pt: 1 });
    if (s.sourceLine) {
      ops.push({ op: "text", text: s.sourceLine, x: tableX, y: tableBottom + 0.15, w: tableW, h: 0.35, size: 10, italic: true, color: MUTED });
    }
    ops.push(...visualFooter(ctx));
    return ops;
  },
};

// ---- photo-trio -------------------------------------------------------------------
// Three images in a row with optional captions under a heading.

const photoTrioSchema = z
  .object({
    heading: short(80),
    image1Id: z.string().trim().min(1),
    image2Id: z.string().trim().min(1),
    image3Id: z.string().trim().min(1),
    caption1: short(60).optional(),
    caption2: short(60).optional(),
    caption3: short(60).optional(),
  })
  .strict();

const photoTrio: VisualLayoutDef = {
  id: "photo-trio",
  name: "Photo trio",
  purpose:
    "Gallery slide with exactly three brand-library images side by side, each with an optional caption (max 60 chars). Needs a heading. Use for moments, markets or campaign roundups.",
  schema: photoTrioSchema,
  imageSlots: [
    { slot: "image1Id", required: true, hint: "Left image of the trio." },
    { slot: "image2Id", required: true, hint: "Middle image of the trio." },
    { slot: "image3Id", required: true, hint: "Right image of the trio." },
  ],
  compose(raw, ctx) {
    const s = photoTrioSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: 0.18, fill: BRAND },
      { op: "text", text: s.heading, x: 0.8, y: 0.75, w: 11.73, h: 0.85, size: 24, bold: true, color: NAVY, valign: "top" },
    ];
    const imgW = 3.71;
    const gap = 0.3;
    const imgY = 2.05;
    const imgH = 3.9;
    const slots: { img: ResolvedImage | null; caption?: string }[] = [
      { img: ctx.images.image1Id ?? null, caption: s.caption1 },
      { img: ctx.images.image2Id ?? null, caption: s.caption2 },
      { img: ctx.images.image3Id ?? null, caption: s.caption3 },
    ];
    slots.forEach((slot, i) => {
      const x = 0.8 + i * (imgW + gap);
      ops.push(...imageOrFallback(slot.img, x, imgY, imgW, imgH));
      ops.push({ op: "rect", x, y: imgY + imgH, w: imgW, h: 0.06, fill: BRAND });
      if (slot.caption) {
        ops.push({ op: "text", text: slot.caption, x, y: imgY + imgH + 0.18, w: imgW, h: 0.4, size: 11, color: MUTED });
      }
    });
    ops.push(...visualFooter(ctx));
    return ops;
  },
};

// ---- closing ---------------------------------------------------------------------
// Navy closing slide: large centered mark, headline, optional subline/contact.

const closingSchema = z
  .object({
    headline: short(70),
    subline: short(120).optional(),
    contactLine: short(90).optional(),
  })
  .strict();

const closing: VisualLayoutDef = {
  id: "closing",
  name: "Closing",
  purpose:
    "Final slide of the deck. Use exactly once, always last. Needs a headline (like a thank-you or call to action, max 70 chars), optionally a subline and a contact line. No image.",
  schema: closingSchema,
  imageSlots: [],
  compose(raw, ctx) {
    const s = closingSchema.parse(raw);
    const ops: DrawOp[] = [
      { op: "rect", x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: NAVY },
      { op: "rect", x: 0, y: SLIDE_H - 0.18, w: SLIDE_W, h: 0.18, fill: BRAND },
      { op: "mark", color: BRAND, x: 6.06, y: 1.35, w: 1.2, h: 1.2 },
      { op: "text", text: s.headline, x: 1.2, y: 3.1, w: 10.93, h: 1.0, size: 34, bold: true, color: INVERSE, align: "center", valign: "top" },
    ];
    if (s.subline) {
      ops.push({ op: "text", text: s.subline, x: 1.2, y: 4.25, w: 10.93, h: 0.5, size: 15, color: INV_SEC, align: "center" });
    }
    ops.push({ op: "rect", x: 5.86, y: 5.05, w: 1.6, h: 0.03, fill: BRAND });
    if (s.contactLine) {
      ops.push({ op: "text", text: s.contactLine, x: 1.2, y: 5.3, w: 10.93, h: 0.4, size: 12, color: INV_TER, align: "center" });
    }
    ops.push(...visualFooter(ctx, INV_TER));
    return ops;
  },
};

// ---- Registry ----------------------------------------------------------------

export const VISUAL_LAYOUTS: VisualLayoutDef[] = [
  photoCover,
  sectionDivider,
  agenda,
  photoSplit,
  newsCard,
  kpiStats,
  brandedContent,
  quoteLayout,
  campaignMetrics,
  resultsTable,
  photoTrio,
  closing,
];

const layoutById = new Map(VISUAL_LAYOUTS.map((l) => [l.id, l]));

// Dynamic layouts (admin-approved extracted specs) are looked up at CALL
// time, never captured at import time — the provider is registered by the
// extracted-layout store during boot. Coded layouts always win an id
// collision (extracted ids are "xl-" prefixed, so one should never occur).
let dynamicProvider: (() => VisualLayoutDef[]) | null = null;

export function registerDynamicLayoutProvider(provider: () => VisualLayoutDef[]): void {
  dynamicProvider = provider;
}

function dynamicLayouts(): VisualLayoutDef[] {
  if (!dynamicProvider) return [];
  return dynamicProvider().filter((l) => !layoutById.has(l.id));
}

export function getVisualLayout(id: string): VisualLayoutDef | undefined {
  const coded = layoutById.get(id);
  if (coded) return coded;
  return dynamicLayouts().find((l) => l.id === id);
}

// ---- Resolution ----------------------------------------------------------------

// Chart series available to chart-bearing layouts, taken from the draft's
// governed (already destination-gated) chart specs.
export interface VisualChartSource {
  id: string;
  title: string;
  unit: string;
  source: string;
  citationId?: string | null;
  points: { label: string; value: number }[];
}

export interface ResolveVisualContext {
  footerLabel: string;
  confidentiality: string;
  generatedAt: string;
  charts: VisualChartSource[];
}

/**
 * Validate every visual slide against its layout schema, resolve image slots
 * to brand-library bytes and compose the final draw ops. Throws
 * VisualSlideError on an unknown layout or a slot payload that fails its
 * schema — an invalid slide is refused, never silently dropped or overflowed.
 */
export async function resolveVisualSlides(
  slides: VisualSlideInput[],
  ctx: ResolveVisualContext,
): Promise<VisualSlideModel[]> {
  const out: VisualSlideModel[] = [];
  for (let i = 0; i < slides.length; i++) {
    const input = slides[i];
    const layout = getVisualLayout(input.layoutId);
    if (!layout) {
      throw new VisualSlideError(`Slide ${i + 1} uses an unknown layout "${input.layoutId}".`, i);
    }
    const parsed = layout.schema.safeParse(input.slots);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new VisualSlideError(
        `Slide ${i + 1} (${layout.id}) has invalid content: ${first ? `${first.path.join(".")} — ${first.message}` : "slot validation failed"}.`,
        i,
      );
    }
    const slots = parsed.data;

    // Resolve image slots to governed library bytes. Unknown/deleted images
    // degrade to null — the layout renders its honest fallback.
    const images: Record<string, ResolvedImage | null> = {};
    const bytes: Record<string, Buffer> = {};
    for (const spec of layout.imageSlots) {
      const idRaw = slots[spec.slot];
      const id = typeof idRaw === "string" ? idRaw : "";
      let resolved: ResolvedImage | null = null;
      if (id) {
        const record = getBrandImage(id);
        if (record) {
          const buf = await fetchObjectBytes(record.objectPath);
          if (buf) {
            const key = `${spec.slot}:${record.id}`;
            bytes[key] = buf;
            resolved = { key, width: record.width, height: record.height };
          }
        }
      }
      images[spec.slot] = resolved;
    }

    // Chart-bearing layouts get their governed series pre-rendered to PNG so
    // every format embeds identical chart pixels.
    if (layout.wantsChart) {
      const chartIdRaw = slots["chartId"];
      const chartId = typeof chartIdRaw === "string" ? chartIdRaw : "";
      // When no chartId was given, default deterministically to the draft's
      // first governed series. When a chartId WAS given but matches nothing,
      // render the honest no-chart fallback instead of silently substituting
      // a different governed chart.
      const series =
        chartId === ""
          ? ctx.charts[0]
          : ctx.charts.find((c) => c.id === chartId);
      if (series) {
        const rendered = renderChart({
          id: series.id,
          label: series.title,
          unit: series.unit,
          source: series.source,
          citationId: series.citationId ?? null,
          points: series.points,
        } satisfies ExportSeries);
        bytes["chart"] = rendered.png;
        images["chart"] = { key: "chart", width: rendered.width, height: rendered.height };
      } else {
        images["chart"] = null;
      }
    }

    const ops = layout.compose(slots, {
      images,
      footerLabel: ctx.footerLabel,
      confidentiality: ctx.confidentiality,
      generatedAt: ctx.generatedAt,
    });
    out.push({ layoutId: layout.id, ops, images: bytes });
  }
  return out;
}

// Agent-facing catalogue: layout ids, purposes and slot documentation used by
// the slot-filling pass (T004) to pick layouts and fill slots.
export function visualLayoutCatalogue(): {
  id: string;
  name: string;
  purpose: string;
  imageSlots: ImageSlotSpec[];
  wantsChart: boolean;
}[] {
  return [...VISUAL_LAYOUTS, ...dynamicLayouts()].map((l) => ({
    id: l.id,
    name: l.name,
    purpose: l.purpose,
    imageSlots: l.imageSlots,
    wantsChart: l.wantsChart === true,
  }));
}

export { visualFooter, imageOrFallback, short, dateLine };
export { BRAND, NAVY, TEXT, MUTED, DIVIDER, ZEBRA, BRAND_LOW, INVERSE, INV_SEC, INV_TER };
