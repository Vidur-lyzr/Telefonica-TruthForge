// Proposal generator — turns a clustered layout family into a draft
// ExtractedLayoutSpec that ALWAYS validates against the meta-schema: every
// geometry is clamped into the canvas, every color snapped to the fixed
// brand palette, every character limit derived from the source frame. What
// could not be carried over faithfully lands in confidenceNotes so the
// reviewing admin decides with open eyes.

import { SLIDE_W, SLIDE_H } from "../visualLayouts";
import { THEME_COLORS } from "../exportTheme";
import {
  parseExtractedLayoutSpec,
  type ExtractedLayoutSpec,
} from "../extractedLayouts";
import type { SlideCluster } from "./cluster";
import type { ParsedShape, TextShape, ImageShape, FillShape, LineShape, Box } from "./pptxParse";

const EPS = 0.04; // stay inside the schema's 0.05 tolerance

// ---- Palette snapping -----------------------------------------------------------

const PALETTE_ENTRIES = Object.entries(THEME_COLORS) as Array<[string, string]>;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return null;
  const v = parseInt(m[1]!, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}

interface Snapped {
  hex: string;
  token: string;
  distance: number;
}

function snapColor(hex: string | null, fallback: string): Snapped {
  if (!hex) {
    const token = PALETTE_ENTRIES.find(([, v]) => v === fallback)?.[0] ?? "background";
    return { hex: fallback, token, distance: 0 };
  }
  const rgb = hexToRgb(hex);
  if (!rgb) {
    const token = PALETTE_ENTRIES.find(([, v]) => v === fallback)?.[0] ?? "background";
    return { hex: fallback, token, distance: 0 };
  }
  let best: Snapped = { hex: THEME_COLORS.textPrimary, token: "textPrimary", distance: Infinity };
  for (const [token, value] of PALETTE_ENTRIES) {
    const pv = hexToRgb(value);
    if (!pv) continue;
    const d = Math.sqrt(
      (rgb[0] - pv[0]) ** 2 + (rgb[1] - pv[1]) ** 2 + (rgb[2] - pv[2]) ** 2,
    );
    if (d < best.distance) best = { hex: value, token, distance: d };
  }
  return best;
}

// ---- Geometry clamping ----------------------------------------------------------

function clampFrame(box: Box): { x: number; y: number; w: number; h: number } | null {
  let x = Math.max(-EPS, Math.min(box.x, SLIDE_W - 0.2));
  let y = Math.max(-EPS, Math.min(box.y, SLIDE_H - 0.15));
  let w = Math.min(box.w, SLIDE_W + EPS - x);
  let h = Math.min(box.h, SLIDE_H + EPS - y);
  if (w < 0.2 || h < 0.15) return null;
  const r = (v: number): number => Math.round(v * 100) / 100;
  x = r(x);
  y = r(y);
  w = r(w);
  h = r(h);
  if (x + w > SLIDE_W + EPS) w = r(SLIDE_W + EPS - x);
  if (y + h > SLIDE_H + EPS) h = r(SLIDE_H + EPS - y);
  if (w < 0.2 || h < 0.15) return null;
  return { x, y, w, h };
}

// ---- Quality gates ----------------------------------------------------------------
//
// A reusable layout is structurally SPARSE: a handful of text areas, at most a
// few images, and background furniture that is bands/panels — not dozens of
// scattered boxes. Content-dense pages (agendas, mood boards, palette/style
// pages full of color chips) are honest content, not templates, and proposing
// them produces garbage layouts. They are rejected outright.

const MAX_SOURCE_TEXTS = 8;
const MAX_SOURCE_IMAGES = 5;
const MAX_SOURCE_FILLS = 14;

/** Slot budget of a professional layout — small on purpose. */
const MAX_TEXT_SLOTS = 4;
const MAX_BULLET_SLOTS = 2;
const MAX_IMAGE_SLOTS = 3;
const MAX_TOTAL_SLOTS = 7;

export type ClusterRejection =
  | { reason: "content_dense"; detail: string }
  | { reason: "no_text"; detail: string };

/** Why a cluster cannot become a layout, or null when it is a valid candidate. */
export function assessCluster(cluster: SlideCluster): ClusterRejection | null {
  const rep = cluster.representative;
  const texts = rep.shapes.filter((s) => s.kind === "text").length;
  const images = rep.shapes.filter((s) => s.kind === "image").length;
  const fills = rep.shapes.filter((s) => s.kind === "fill").length;
  if (texts === 0) {
    return { reason: "no_text", detail: "no usable text content" };
  }
  if (texts > MAX_SOURCE_TEXTS || images > MAX_SOURCE_IMAGES || fills > MAX_SOURCE_FILLS) {
    return {
      reason: "content_dense",
      detail: `${texts} text boxes, ${images} images, ${fills} decorative shapes — a content page, not a reusable layout`,
    };
  }
  return null;
}

// ---- Slot naming ----------------------------------------------------------------

const TEXT_KEYS = ["title", "subtitle", "body", "bodyTwo"];
const TEXT_LABELS = ["Title", "Subtitle", "Body copy", "Second body block"];
const BULLET_KEYS = ["bullets", "bulletsTwo"];
const BULLET_LABELS = ["Bullet points", "Second bullet list"];
const IMAGE_KEYS = ["image", "imageTwo", "imageThree"];
const IMAGE_LABELS = ["Supporting image", "Second image", "Third image"];

function overlapArea(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Human layout name derived from the KEPT slot structure — never from raw
 * source shape counts ("28 text blocks" is a diagnosis, not a template name).
 */
function structuralName(slots: ExtractedLayoutSpec["slots"], bgIsDark: boolean): string {
  const textSlots = slots.filter((s) => s.kind === "text");
  const bulletCount = slots.filter((s) => s.kind === "bullets").length;
  const imageSlots = slots.filter((s) => s.kind === "image");
  if (imageSlots.length >= 2) {
    return textSlots.length + bulletCount > 0 ? "Image gallery with text" : "Image gallery";
  }
  if (imageSlots.length === 1) {
    const img = imageSlots[0]!.frame;
    if (img.w * img.h >= SLIDE_W * SLIDE_H * 0.4) return "Hero image";
    if (img.w >= SLIDE_W * 0.4) return "Image + text split";
    return "Text with image";
  }
  if (bulletCount >= 1) return textSlots.length >= 1 ? "Title + bullet list" : "Bullet list";
  if (textSlots.length === 1) return bgIsDark ? "Chapter divider" : "Statement";
  const bodies = textSlots.slice(1);
  if (bodies.length === 2) {
    const [a, b] = [bodies[0]!.frame, bodies[1]!.frame];
    const yOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const xDisjoint = a.x + a.w <= b.x + 0.2 || b.x + b.w <= a.x + 0.2;
    if (yOverlap > Math.min(a.h, b.h) * 0.5 && xDisjoint) return "Two-column text";
  }
  if (textSlots.length === 2) return "Title + text";
  return "Title + text blocks";
}

function positionHint(f: { x: number; y: number; w: number; h: number }): string {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const horiz = cx < SLIDE_W * 0.38 ? "left" : cx > SLIDE_W * 0.62 ? "right" : "center";
  const vert = cy < SLIDE_H * 0.38 ? "top" : cy > SLIDE_H * 0.62 ? "bottom" : "middle";
  const area = f.w * f.h;
  const scale = area > SLIDE_W * SLIDE_H * 0.45 ? "large hero" : area > SLIDE_W * SLIDE_H * 0.18 ? "supporting" : "small accent";
  return `${scale} image, ${vert}-${horiz} of the slide (${f.w.toFixed(1)} x ${f.h.toFixed(1)} in)`;
}

// ---- Main -----------------------------------------------------------------------

export interface ProposalResult {
  spec: ExtractedLayoutSpec;
  notes: string[];
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36)
    .replace(/-+$/g, "");
  return slug.length > 0 && /^[a-z0-9]/.test(slug) ? slug : "deck";
}

export function proposeLayout(
  cluster: SlideCluster,
  deckName: string,
  familyIndex: number,
): ProposalResult | null {
  const rep = cluster.representative;
  const notes = new Set<string>();
  const addNote = (n: string): void => {
    if (notes.size < 18) notes.add(n.slice(0, 300));
  };

  const texts = rep.shapes.filter((s): s is TextShape => s.kind === "text");
  const images = rep.shapes.filter((s): s is ImageShape => s.kind === "image");
  const fills = rep.shapes.filter((s): s is FillShape => s.kind === "fill");
  const lines = rep.shapes.filter((s): s is LineShape => s.kind === "line");

  // Content-dense pages never become layouts — see assessCluster.
  if (assessCluster(cluster) !== null) return null;

  // ---- Background ----------------------------------------------------------
  const bgSnap = snapColor(rep.bgColorHex, THEME_COLORS.background);
  const bgIsDark = luminance(bgSnap.hex) < 0.45;
  if (rep.bgColorHex && bgSnap.distance > 90) {
    addNote(`Slide background ${rep.bgColorHex} was snapped to the brand token "${bgSnap.token}".`);
  }
  if (rep.bgGradient) {
    addNote("The source background used a gradient — replaced with a solid brand color (gradients are not permitted).");
  }

  const background: ExtractedLayoutSpec["background"] = [];
  if (bgSnap.hex.toUpperCase() !== THEME_COLORS.background) {
    background.push({ op: "rect", x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: bgSnap.hex });
  }

  const sortedFills = [...fills].sort((a, b) => b.w * b.h - a.w * a.h);
  // Decorative fills and lines are appended AFTER slot selection, so only
  // structural furniture (bands, edge bars, panels backing kept slots)
  // survives — color swatches and orphan boxes are dropped.

  // ---- Slots ---------------------------------------------------------------
  const slots: ExtractedLayoutSpec["slots"] = [];
  let sizeApproximated = false;
  let contrastFixed = false;

  /** The strongest fill panel behind a point decides local contrast. */
  const fillAt = (cx: number, cy: number): string => {
    let hex = bgSnap.hex;
    for (const fill of sortedFills) {
      if (cx >= fill.x && cx <= fill.x + fill.w && cy >= fill.y && cy <= fill.y + fill.h && fill.alpha > 0.6) {
        hex = snapColor(fill.colorHex, THEME_COLORS.backgroundAlt).hex;
      }
    }
    return hex;
  };

  const orderedTexts = [...texts].sort((a, b) => {
    const aTitle = a.phType === "title" || a.phType === "ctrTitle" ? 1 : 0;
    const bTitle = b.phType === "title" || b.phType === "ctrTitle" ? 1 : 0;
    if (aTitle !== bTitle) return bTitle - aTitle;
    if (b.sizePt !== a.sizePt) return b.sizePt - a.sizePt;
    return b.w * b.h - a.w * a.h;
  });

  const imageReserve = Math.min(images.length, MAX_IMAGE_SLOTS);
  let textIdx = 0;
  let bulletIdx = 0;
  for (const t of orderedTexts) {
    if (slots.length >= MAX_TOTAL_SLOTS - imageReserve) {
      addNote("Some minor text areas were dropped — a clean layout keeps only its main content areas.");
      break;
    }
    const frame = clampFrame(t);
    if (!frame) continue;
    if (!t.sizeKnown) sizeApproximated = true;

    const under = fillAt(frame.x + frame.w / 2, frame.y + frame.h / 2);
    const underDark = luminance(under) < 0.45;
    let colorSnap = snapColor(t.colorHex, underDark ? THEME_COLORS.inverse : THEME_COLORS.textPrimary);
    if (t.colorHex && colorSnap.distance > 90) {
      addNote(`Text color ${t.colorHex} was snapped to the brand token "${colorSnap.token}".`);
    }
    const colorDark = luminance(colorSnap.hex) < 0.45;
    if (underDark && colorDark) {
      colorSnap = { hex: THEME_COLORS.inverse, token: "inverse", distance: 0 };
      contrastFixed = true;
    } else if (!underDark && !colorDark) {
      colorSnap = { hex: THEME_COLORS.textPrimary, token: "textPrimary", distance: 0 };
      contrastFixed = true;
    }

    const isBullets = t.bulleted && t.paragraphs >= 2 && !(t.phType === "title" || t.phType === "ctrTitle");
    if (isBullets && bulletIdx < BULLET_KEYS.length) {
      const size = Math.max(6, Math.min(40, Math.round(t.sizePt)));
      const charsPerLine = Math.max(8, Math.floor((frame.w * 72) / (size * 0.52)));
      slots.push({
        kind: "bullets",
        key: BULLET_KEYS[bulletIdx]!,
        label: BULLET_LABELS[bulletIdx]!,
        required: false,
        frame,
        size,
        color: colorSnap.hex,
        ...(t.bold ? { bold: true } : {}),
        maxItems: Math.max(2, Math.min(8, t.paragraphs)),
        maxCharsPerItem: Math.max(10, Math.min(200, Math.round(charsPerLine * 1.6))),
      });
      bulletIdx += 1;
      continue;
    }
    if (textIdx >= TEXT_KEYS.length) continue;
    const size = Math.max(6, Math.min(60, Math.round(t.sizePt)));
    const charsPerLine = Math.max(4, Math.floor((frame.w * 72) / (size * 0.52)));
    const linesFit = Math.max(1, Math.floor((frame.h * 72) / (size * 1.35)));
    const capacity = Math.round(charsPerLine * linesFit * 0.9);
    slots.push({
      kind: "text",
      key: TEXT_KEYS[textIdx]!,
      label: TEXT_LABELS[textIdx]!,
      required: textIdx === 0,
      frame,
      size,
      color: colorSnap.hex,
      ...(t.bold ? { bold: true } : {}),
      ...(t.align !== "left" ? { align: t.align } : {}),
      maxChars: Math.max(8, Math.min(600, capacity)),
    });
    textIdx += 1;
  }

  if (slots.length === 0) return null;

  let imageIdx = 0;
  for (const img of [...images].sort((a, b) => b.w * b.h - a.w * a.h)) {
    if (slots.length >= MAX_TOTAL_SLOTS || imageIdx >= IMAGE_KEYS.length) {
      if (images.length > imageIdx) addNote("Additional image frames were dropped to stay within the slot budget.");
      break;
    }
    const frame = clampFrame(img);
    if (!frame) continue;
    slots.push({
      kind: "image",
      key: IMAGE_KEYS[imageIdx]!,
      label: IMAGE_LABELS[imageIdx]!,
      required: false,
      frame,
      hint: positionHint(frame),
      fallbackFill: THEME_COLORS.brandLow,
    });
    imageIdx += 1;
  }

  // ---- Decorative furniture (filtered) --------------------------------------
  // Keep only structural fills: full-width/height bands, large panels, edge
  // bars, and panels that visually back a kept slot. Small floating rectangles
  // (color swatches, orphan boxes from dropped content) are discarded.
  const slotFrames = slots.map((s) => s.frame);
  const slideArea = SLIDE_W * SLIDE_H;
  let droppedDecor = 0;
  for (const fill of sortedFills) {
    if (background.length >= 30) break;
    const snap = snapColor(fill.colorHex, THEME_COLORS.backgroundAlt);
    // Skip fills that just repeat the background.
    if (snap.hex === bgSnap.hex && fill.w * fill.h > slideArea * 0.9) continue;
    const area = fill.w * fill.h;
    const isBand =
      fill.w >= SLIDE_W * 0.55 || fill.h >= SLIDE_H * 0.55 || area >= slideArea * 0.18;
    const backsSlot =
      area >= 0.8 &&
      slotFrames.some((k) => overlapArea(fill, k) >= 0.55 * k.w * k.h);
    if (!isBand && !backsSlot) {
      droppedDecor += 1;
      continue;
    }
    if (fill.gradient) {
      addNote("A gradient-filled panel was flattened to its first stop, snapped to the brand palette.");
    }
    if (snap.distance > 90 && fill.colorHex) {
      addNote(`Panel color ${fill.colorHex} was snapped to the brand token "${snap.token}".`);
    }
    const x = Math.max(-EPS, Math.min(fill.x, SLIDE_W));
    const y = Math.max(-EPS, Math.min(fill.y, SLIDE_H));
    const w = Math.max(0.01, Math.min(fill.w, SLIDE_W + 2 * EPS));
    const h = Math.max(0.01, Math.min(fill.h, SLIDE_H + 2 * EPS));
    const alpha = fill.alpha < 1 ? Math.max(0.04, Math.min(1, fill.alpha)) : undefined;
    background.push({
      op: "rect",
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      w: Math.round(w * 100) / 100,
      h: Math.round(h * 100) / 100,
      fill: snap.hex,
      ...(alpha != null ? { alpha } : {}),
    });
  }
  for (const line of lines) {
    if (background.length >= 36) break;
    // Keep only structural rules: long dividers, or underlines attached to a
    // kept slot. Short floating dashes are dropped.
    const underlinesSlot = slotFrames.some((k) => {
      const xOverlap = Math.min(line.x + line.w, k.x + k.w) - Math.max(line.x, k.x);
      const nearY = line.y >= k.y - 0.35 && line.y <= k.y + k.h + 0.35;
      return xOverlap >= line.w * 0.5 && nearY;
    });
    if (line.w < SLIDE_W * 0.3 && !underlinesSlot) {
      droppedDecor += 1;
      continue;
    }
    const snap = snapColor(line.colorHex, THEME_COLORS.divider);
    const x = Math.max(-EPS, Math.min(line.x, SLIDE_W - 0.05));
    const w = Math.max(0.05, Math.min(line.w, SLIDE_W));
    background.push({
      op: "line",
      x: Math.round(x * 100) / 100,
      y: Math.round(Math.max(-EPS, Math.min(line.y, SLIDE_H)) * 100) / 100,
      w: Math.round(w * 100) / 100,
      color: snap.hex,
      pt: Math.max(0.25, Math.min(8, line.pt)),
    });
  }
  if (droppedDecor > 0) {
    addNote(
      `${droppedDecor} decorative shape${droppedDecor === 1 ? "" : "s"} from the source slide (small boxes, swatches, stray rules) were dropped — only structural bands and panels behind content are kept.`,
    );
  }

  // ---- Notes ---------------------------------------------------------------
  addNote("Character limits are derived from the source frame geometry, not measured text.");
  if (sizeApproximated) {
    addNote("Some font sizes were not declared on the slide and were approximated from placeholder defaults.");
  }
  if (contrastFixed) {
    addNote("Some text colors were adjusted to keep readable contrast against their background.");
  }
  if (texts.some((t) => t.schemeColor)) {
    addNote("Office theme colors were mapped onto the nearest Telefónica tokens.");
  }
  addNote(`Proposed from ${cluster.slideIndexes.length === 1 ? "a single slide" : `${cluster.slideIndexes.length} similar slides`} (representative: slide ${rep.index}).`);

  // ---- Identity ------------------------------------------------------------
  const slug = slugify(deckName);
  const id = `xl-${slug}-f${familyIndex + 1}`.slice(0, 63);
  const structure = structuralName(slots, bgIsDark);
  const name = `${structure} — ${deckName}`.slice(0, 80);
  const footer: ExtractedLayoutSpec["footer"] =
    orderedTexts[0]?.phType === "ctrTitle" ? "none" : bgIsDark ? "dark" : "light";

  const textSlotCount = slots.filter((s) => s.kind === "text").length;
  const bulletSlotCount = slots.filter((s) => s.kind === "bullets").length;
  const imageSlotCount = slots.filter((s) => s.kind === "image").length;
  const pieces: string[] = [];
  if (textSlotCount > 0) pieces.push(`${textSlotCount} text area${textSlotCount === 1 ? "" : "s"}`);
  if (bulletSlotCount > 0) pieces.push(`${bulletSlotCount} bullet list${bulletSlotCount === 1 ? "" : "s"}`);
  if (imageSlotCount > 0) pieces.push(`${imageSlotCount} image panel${imageSlotCount === 1 ? "" : "s"}`);
  const purpose =
    `${structure} layout with ${pieces.join(", ")}. ` +
    `Extracted from the master deck "${deckName}" (family of ${cluster.slideIndexes.length} slide${cluster.slideIndexes.length === 1 ? "" : "s"}).`;

  const raw = {
    specVersion: 1 as const,
    id,
    name,
    purpose: purpose.slice(0, 400),
    footer,
    background: background.slice(0, 40),
    slots,
    confidenceNotes: [...notes],
  };

  try {
    const spec = parseExtractedLayoutSpec(raw);
    return { spec, notes: [...notes] };
  } catch {
    return null;
  }
}
