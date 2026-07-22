// Extracted-layout compiler — turns a serializable layout spec (produced by
// the master-deck extraction pipeline and approved by an admin) into a live
// VisualLayoutDef indistinguishable from the hand-coded ones.
//
// The spec is DATA: background draw ops in fixed brand colors plus typed,
// geometry-bound slots. The compiler builds (a) a plain runtime Zod schema
// (no refinements/transforms beyond trim, so z.toJSONSchema keeps working in
// the agent's catalogue prompt) and (b) a deterministic compose() that maps
// slot values onto draw ops — the same op vocabulary every renderer already
// interprets, so PPTX / PDF / preview parity is automatic.
//
// Governance invariants preserved by construction:
// - Colors are restricted to the fixed brand palette (THEME_COLORS values) —
//   the meta-schema rejects anything else, so no gradient and no off-brand
//   color can enter through an extracted spec.
// - Image slots resolve exclusively through the approved brand library
//   (imageOrFallback), identical to the coded layouts.
// - Every slot carries hard character/count limits derived from the source
//   geometry, enforced by the compiled Zod schema before compose runs.

import { z } from "zod/v4";
import { THEME_COLORS } from "./exportTheme";
import {
  SLIDE_W,
  SLIDE_H,
  visualFooter,
  imageOrFallback,
  MUTED,
  INV_TER,
  type DrawOp,
  type VisualLayoutDef,
  type ImageSlotSpec,
  type ComposeCtx,
} from "./visualLayouts";

/** Every color an extracted layout may use — the fixed brand palette. */
const PALETTE = new Set<string>(Object.values(THEME_COLORS));

const paletteColor = z
  .string()
  .refine((c) => PALETTE.has(c), { message: "color must be one of the fixed brand palette values" });

/** Id prefix for extracted layouts — guarantees no collision with the coded registry. */
export const EXTRACTED_LAYOUT_ID_PREFIX = "xl-";

// Geometry tolerance: parsed EMU→inch conversions can land a hair outside the
// canvas; anything beyond this is a genuinely malformed frame.
const EDGE_EPS = 0.05;

const frameSchema = z
  .object({
    x: z.number().min(-EDGE_EPS).max(SLIDE_W),
    y: z.number().min(-EDGE_EPS).max(SLIDE_H),
    w: z.number().min(0.2).max(SLIDE_W + EDGE_EPS),
    h: z.number().min(0.15).max(SLIDE_H + EDGE_EPS),
  })
  .refine((f) => f.x + f.w <= SLIDE_W + EDGE_EPS && f.y + f.h <= SLIDE_H + EDGE_EPS, {
    message: "frame must fit within the 13.33 x 7.5 inch slide",
  });

const slotKey = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]{0,39}$/, "slot keys are camelCase identifiers")
  .refine((k) => k !== "chartId", { message: '"chartId" is reserved for chart-bearing layouts' });

const baseSlot = {
  key: slotKey,
  label: z.string().trim().min(1).max(80),
  required: z.boolean(),
  frame: frameSchema,
};

const textSlotSchema = z
  .object({
    ...baseSlot,
    kind: z.literal("text"),
    size: z.number().min(6).max(60),
    color: paletteColor,
    bold: z.boolean().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    valign: z.enum(["top", "middle"]).optional(),
    lineSpacing: z.number().min(0.8).max(2).optional(),
    maxChars: z.number().int().min(8).max(600),
  })
  .strict();

const bulletsSlotSchema = z
  .object({
    ...baseSlot,
    kind: z.literal("bullets"),
    size: z.number().min(6).max(40),
    color: paletteColor,
    bold: z.boolean().optional(),
    maxItems: z.number().int().min(2).max(8),
    maxCharsPerItem: z.number().int().min(10).max(200),
  })
  .strict();

const imageSlotSchema = z
  .object({
    ...baseSlot,
    kind: z.literal("image"),
    /** Tag guidance for the agent's brand-library selection. */
    hint: z.string().trim().min(1).max(200),
    /** Fallback panel fill when no library image matches. */
    fallbackFill: paletteColor.optional(),
  })
  .strict();

const extractedSlotSchema = z.discriminatedUnion("kind", [
  textSlotSchema,
  bulletsSlotSchema,
  imageSlotSchema,
]);

// Background ops are the static, non-editable part of the layout: panels,
// rules and the brand mark. Deliberately NO free text op — static copy from a
// master deck is placeholder junk, and NO image op — imagery only enters
// through governed slots.
const backgroundOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("rect"),
      x: z.number().min(-EDGE_EPS).max(SLIDE_W),
      y: z.number().min(-EDGE_EPS).max(SLIDE_H),
      w: z.number().min(0.01).max(SLIDE_W + 2 * EDGE_EPS),
      h: z.number().min(0.01).max(SLIDE_H + 2 * EDGE_EPS),
      fill: paletteColor,
      alpha: z.number().min(0.04).max(1).optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal("line"),
      x: z.number().min(-EDGE_EPS).max(SLIDE_W),
      y: z.number().min(-EDGE_EPS).max(SLIDE_H),
      w: z.number().min(0.05).max(SLIDE_W),
      color: paletteColor,
      pt: z.number().min(0.25).max(8),
    })
    .strict(),
  z
    .object({
      op: z.literal("mark"),
      color: paletteColor,
      x: z.number().min(0).max(SLIDE_W),
      y: z.number().min(0).max(SLIDE_H),
      w: z.number().min(0.2).max(4),
      h: z.number().min(0.2).max(4),
    })
    .strict(),
]);

export const extractedLayoutSpecSchema = z
  .object({
    specVersion: z.literal(1),
    id: z
      .string()
      .regex(/^xl-[a-z0-9][a-z0-9-]{1,60}$/, 'extracted layout ids start with "xl-"'),
    name: z.string().trim().min(1).max(80),
    // Written as an agent-facing selection rule, same contract as coded layouts.
    purpose: z.string().trim().min(20).max(400),
    // "light" footer for white slides, "dark" for navy, "none" for covers that
    // draw their own furniture.
    footer: z.enum(["light", "dark", "none"]),
    background: z.array(backgroundOpSchema).max(40),
    slots: z.array(extractedSlotSchema).min(1).max(12),
    /** Approximation notes carried from extraction (shown at review time). */
    confidenceNotes: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  })
  .strict()
  .superRefine((spec, ctx) => {
    const seen = new Set<string>();
    for (const slot of spec.slots) {
      if (seen.has(slot.key)) {
        ctx.addIssue({ code: "custom", message: `duplicate slot key "${slot.key}"` });
      }
      seen.add(slot.key);
    }
    if (!spec.slots.some((s) => s.kind !== "image")) {
      ctx.addIssue({ code: "custom", message: "a layout needs at least one text or bullets slot" });
    }
  });

export type ExtractedLayoutSpec = z.infer<typeof extractedLayoutSpecSchema>;
export type ExtractedSlotSpec = ExtractedLayoutSpec["slots"][number];

export class ExtractedLayoutError extends Error {
  readonly code: string;
  constructor(message: string, code = "invalid_layout_spec") {
    super(message);
    this.name = "ExtractedLayoutError";
    this.code = code;
  }
}

/** Parse + validate an untrusted spec (snapshot load, review approval). */
export function parseExtractedLayoutSpec(raw: unknown): ExtractedLayoutSpec {
  const parsed = extractedLayoutSpecSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ExtractedLayoutError(
      `Invalid layout spec: ${first ? `${first.path.join(".") || "spec"} — ${first.message}` : "validation failed"}`,
    );
  }
  return parsed.data;
}

// ---- Compilation ------------------------------------------------------------

const short = (max: number) => z.string().trim().min(1).max(max);

function buildSlotSchema(spec: ExtractedLayoutSpec): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {};
  for (const slot of spec.slots) {
    let field: z.ZodType;
    if (slot.kind === "text") {
      field = short(slot.maxChars);
    } else if (slot.kind === "bullets") {
      field = z.array(short(slot.maxCharsPerItem)).min(1).max(slot.maxItems);
    } else {
      field = z.string().trim().min(1);
    }
    shape[slot.key] = slot.required ? field : field.optional();
  }
  return z.object(shape).strict() as z.ZodType<Record<string, unknown>>;
}

function frameOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function composeSlots(
  spec: ExtractedLayoutSpec,
  slots: Record<string, unknown>,
  ctx: ComposeCtx,
): DrawOp[] {
  // Which slots actually carry content this time? Unfilled OPTIONAL slots
  // must leave no trace on the slide — no empty fallback boxes, no orphan
  // backing panels.
  const filled = new Set<string>();
  for (const slot of spec.slots) {
    const v = slots[slot.key];
    if (slot.kind === "bullets") {
      if (Array.isArray(v) && v.length > 0) filled.add(slot.key);
    } else if (typeof v === "string" && v.trim().length > 0) {
      filled.add(slot.key);
    }
  }
  const unfilledFrames = spec.slots
    .filter((s) => !s.required && !filled.has(s.key))
    .map((s) => s.frame);
  const filledFrames = spec.slots
    .filter((s) => s.required || filled.has(s.key))
    .map((s) => s.frame);

  // Background first — fresh objects each call so no caller can mutate the
  // spec. Small panels whose only job was to back a slot that stayed empty
  // are skipped; structural bands and full-bleed panels always stay.
  const ops: DrawOp[] = spec.background
    .filter((op) => {
      if (op.op !== "rect" || unfilledFrames.length === 0) return true;
      const area = op.w * op.h;
      if (op.w >= SLIDE_W * 0.55 || op.h >= SLIDE_H * 0.55 || area >= SLIDE_W * SLIDE_H * 0.18) {
        return true;
      }
      const backsUnfilled = unfilledFrames.some(
        (f) => frameOverlap(op, f) >= 0.5 * Math.min(area, f.w * f.h),
      );
      if (!backsUnfilled) return true;
      const backsFilled = filledFrames.some(
        (f) => frameOverlap(op, f) >= 0.25 * Math.min(area, f.w * f.h),
      );
      return backsFilled;
    })
    .map((op) => ({ ...op }));
  for (const slot of spec.slots) {
    const { x, y, w, h } = slot.frame;
    if (slot.kind === "image") {
      const requested = filled.has(slot.key);
      const resolved = ctx.images[slot.key] ?? null;
      // An optional image slot nobody asked to fill draws NOTHING — an empty
      // placeholder box is debris, not honesty. A slot that WAS requested but
      // failed to resolve still renders the honest fallback (never a silent
      // substitute), and required slots always render.
      if (!resolved && !requested && !slot.required) continue;
      ops.push(...imageOrFallback(resolved, x, y, w, h, slot.fallbackFill));
      continue;
    }
    const value = slots[slot.key];
    if (slot.kind === "text") {
      if (typeof value !== "string" || value.length === 0) continue;
      ops.push({
        op: "text",
        text: value,
        x,
        y,
        w,
        h,
        size: slot.size,
        color: slot.color,
        bold: slot.bold,
        align: slot.align,
        valign: slot.valign,
        lineSpacing: slot.lineSpacing,
      });
      continue;
    }
    // bullets — one multiline text op (both renderers interpret "\n"),
    // en-dash marker per line (no emoji, no glyph dependencies).
    const items = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
    if (items.length === 0) continue;
    ops.push({
      op: "text",
      text: items.map((item) => `–  ${item}`).join("\n"),
      x,
      y,
      w,
      h,
      size: slot.size,
      color: slot.color,
      bold: slot.bold,
      lineSpacing: 1.35,
      valign: "top",
    });
  }
  if (spec.footer !== "none") {
    ops.push(...visualFooter(ctx, spec.footer === "dark" ? INV_TER : MUTED));
  }
  return ops;
}

/**
 * Compile a validated spec into a live layout definition. The result plugs
 * into the same registry seam the coded layouts use — the agent catalogue,
 * resolveVisualSlides and every renderer treat it identically.
 */
export function compileExtractedLayout(spec: ExtractedLayoutSpec): VisualLayoutDef {
  const schema = buildSlotSchema(spec);
  const imageSlots: ImageSlotSpec[] = spec.slots
    .filter((s): s is Extract<ExtractedSlotSpec, { kind: "image" }> => s.kind === "image")
    .map((s) => ({ slot: s.key, required: s.required, hint: s.hint }));
  return {
    id: spec.id,
    name: spec.name,
    purpose: spec.purpose,
    schema,
    imageSlots,
    compose: (slots, ctx) => composeSlots(spec, slots, ctx),
  };
}
