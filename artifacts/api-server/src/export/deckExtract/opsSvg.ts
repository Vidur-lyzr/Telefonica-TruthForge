// Third DrawOp interpreter: ops → SVG → PNG via resvg, using the same Hanken
// Grotesk faces the PDF/preview renderers embed (never system fonts). Used
// for two things:
//   - rendered previews of PROPOSED layouts (compose with placeholder copy),
//   - wireframe thumbnails of SOURCE slides (typed boxes, not a fidelity
//     render — honest about being an approximation).

import { Resvg } from "@resvg/resvg-js";
import { brandFontPath, brandMarkPng, BRAND_FONT_FAMILY } from "../brandAssets";
import { THEME_COLORS } from "../exportTheme";
import { SLIDE_W, SLIDE_H, type DrawOp } from "../visualLayouts";
import type { ParsedSlide } from "./pptxParse";

const PX_PER_IN = 96;
const W = Math.round(SLIDE_W * PX_PER_IN); // 1280
const H = Math.round(SLIDE_H * PX_PER_IN); // 720
const PX_PER_PT = PX_PER_IN / 72;

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function px(inches: number): number {
  return Math.round(inches * PX_PER_IN * 100) / 100;
}

interface TextSpec {
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

/** Greedy word-wrap with an average-glyph-width estimate (preview grade). */
function wrapLines(spec: TextSpec): string[] {
  const sizePx = spec.size * PX_PER_PT;
  const charW = sizePx * (spec.bold ? 0.56 : 0.52);
  const maxChars = Math.max(1, Math.floor((spec.w * PX_PER_IN) / charW));
  const out: string[] = [];
  for (const raw of spec.text.split("\n")) {
    if (raw.length <= maxChars) {
      out.push(raw);
      continue;
    }
    let line = "";
    for (const word of raw.split(/\s+/)) {
      if (line.length === 0) line = word;
      else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line.length > 0) out.push(line);
  }
  return out;
}

function textSvg(spec: TextSpec): string {
  const sizePx = spec.size * PX_PER_PT;
  const lineH = sizePx * (spec.lineSpacing ?? 1.18);
  const boxHpx = spec.h * PX_PER_IN;
  const maxLines = Math.max(1, Math.floor(boxHpx / lineH));
  const lines = wrapLines(spec).slice(0, maxLines);
  if (lines.length === 0) return "";
  const usedH = lines.length * lineH;
  const startY =
    spec.valign === "middle"
      ? spec.y * PX_PER_IN + Math.max(0, (boxHpx - usedH) / 2)
      : spec.y * PX_PER_IN;
  const anchor = spec.align === "center" ? "middle" : spec.align === "right" ? "end" : "start";
  const anchorX =
    spec.align === "center"
      ? (spec.x + spec.w / 2) * PX_PER_IN
      : spec.align === "right"
        ? (spec.x + spec.w) * PX_PER_IN
        : spec.x * PX_PER_IN;
  const weight = spec.bold ? 700 : 400;
  const style = spec.italic ? ' font-style="italic"' : "";
  const spacing = spec.charSpacing ? ` letter-spacing="${spec.charSpacing * PX_PER_PT}"` : "";
  const parts: string[] = [];
  lines.forEach((line, i) => {
    const baseline = startY + i * lineH + sizePx * 0.82;
    if (baseline > (spec.y + spec.h) * PX_PER_IN + lineH) return;
    parts.push(
      `<text x="${anchorX}" y="${baseline}" font-family="${BRAND_FONT_FAMILY}" font-size="${sizePx}" font-weight="${weight}" fill="${spec.color}" text-anchor="${anchor}"${style}${spacing}>${esc(line)}</text>`,
    );
  });
  return parts.join("");
}

function sniffMime(bytes: Buffer): string {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  return "image/png";
}

function rasterize(body: string, background: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    background,
    font: {
      loadSystemFonts: false,
      fontFiles: [
        brandFontPath("regular"),
        brandFontPath("medium"),
        brandFontPath("bold"),
        brandFontPath("italic"),
      ],
      defaultFontFamily: BRAND_FONT_FAMILY,
    },
  });
  return Buffer.from(resvg.render().asPng());
}

/**
 * Render a resolved DrawOp list to a 1280x720 PNG. `images` maps image-op
 * keys to raw bytes; missing keys render as a quiet placeholder panel.
 */
export function renderOpsPng(ops: DrawOp[], images: Record<string, Buffer> = {}): Buffer {
  const parts: string[] = [];
  let clipId = 0;
  for (const op of ops) {
    switch (op.op) {
      case "rect": {
        const alpha = op.alpha != null ? ` fill-opacity="${op.alpha}"` : "";
        parts.push(
          `<rect x="${px(op.x)}" y="${px(op.y)}" width="${px(op.w)}" height="${px(op.h)}" fill="${op.fill}"${alpha}/>`,
        );
        break;
      }
      case "line": {
        const thick = Math.max(0.5, op.pt * PX_PER_PT);
        parts.push(
          `<rect x="${px(op.x)}" y="${px(op.y)}" width="${px(op.w)}" height="${thick}" fill="${op.color}"/>`,
        );
        break;
      }
      case "text": {
        parts.push(textSvg(op));
        break;
      }
      case "image": {
        const bytes = images[op.key];
        if (!bytes) {
          parts.push(
            `<rect x="${px(op.x)}" y="${px(op.y)}" width="${px(op.w)}" height="${px(op.h)}" fill="${THEME_COLORS.backgroundAlt}"/>`,
          );
          break;
        }
        clipId += 1;
        const id = `c${clipId}`;
        const mime = sniffMime(bytes);
        parts.push(
          `<clipPath id="${id}"><rect x="${px(op.x)}" y="${px(op.y)}" width="${px(op.w)}" height="${px(op.h)}"/></clipPath>` +
            `<image x="${px(op.x)}" y="${px(op.y)}" width="${px(op.w)}" height="${px(op.h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" href="data:${mime};base64,${bytes.toString("base64")}"/>`,
        );
        break;
      }
      case "mark": {
        const markPng = brandMarkPng(Math.max(32, Math.round(op.w * PX_PER_IN * 2)), op.color);
        parts.push(
          `<image x="${px(op.x)}" y="${px(op.y)}" width="${px(op.w)}" height="${px(op.h)}" href="data:image/png;base64,${markPng.toString("base64")}"/>`,
        );
        break;
      }
    }
  }
  return rasterize(parts.join(""), THEME_COLORS.background);
}

/**
 * Wireframe thumbnail of a SOURCE slide: typed boxes over the real geometry.
 * Deliberately schematic — it shows what the parser saw, not deck pixels.
 */
export function renderWireframePng(slide: ParsedSlide): Buffer {
  const parts: string[] = [];
  if (slide.bgColorHex && slide.bgColorHex.toUpperCase() !== "#FFFFFF") {
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${slide.bgColorHex}" fill-opacity="0.25"/>`);
  }
  for (const s of slide.shapes) {
    if (s.kind === "fill") {
      parts.push(
        `<rect x="${px(s.x)}" y="${px(s.y)}" width="${px(s.w)}" height="${px(s.h)}" fill="${s.colorHex ?? THEME_COLORS.backgroundAlt}" fill-opacity="${Math.min(0.45, s.alpha)}" stroke="${THEME_COLORS.divider}" stroke-width="1"/>`,
      );
    } else if (s.kind === "line") {
      parts.push(
        `<rect x="${px(s.x)}" y="${px(s.y)}" width="${px(s.w)}" height="2" fill="${s.colorHex ?? THEME_COLORS.divider}"/>`,
      );
    }
  }
  for (const s of slide.shapes) {
    if (s.kind === "image") {
      const x = px(s.x);
      const y = px(s.y);
      const w = px(s.w);
      const h = px(s.h);
      parts.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${THEME_COLORS.backgroundAlt}" stroke="${THEME_COLORS.textSecondary}" stroke-width="1.5" stroke-dasharray="6 4"/>` +
          `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" stroke="${THEME_COLORS.divider}" stroke-width="1"/>` +
          `<line x1="${x + w}" y1="${y}" x2="${x}" y2="${y + h}" stroke="${THEME_COLORS.divider}" stroke-width="1"/>` +
          `<text x="${x + w / 2}" y="${y + h / 2 + 5}" font-family="${BRAND_FONT_FAMILY}" font-size="14" fill="${THEME_COLORS.textSecondary}" text-anchor="middle">Image</text>`,
      );
    } else if (s.kind === "text") {
      const x = px(s.x);
      const y = px(s.y);
      const w = px(s.w);
      const h = px(s.h);
      const displaySize = Math.min(22, Math.max(9, s.sizePt * PX_PER_PT * 0.55));
      const sample = s.sample.length > 60 ? `${s.sample.slice(0, 57)}...` : s.sample;
      parts.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${THEME_COLORS.brandLow}" fill-opacity="0.5" stroke="${THEME_COLORS.brand}" stroke-width="1.5" stroke-dasharray="4 3"/>` +
          `<text x="${x + 8}" y="${y + displaySize + 6}" font-family="${BRAND_FONT_FAMILY}" font-size="${displaySize}" font-weight="${s.bold ? 700 : 400}" fill="${THEME_COLORS.textPrimary}">${esc(sample)}</text>` +
          `<text x="${x + w - 6}" y="${y + h - 6}" font-family="${BRAND_FONT_FAMILY}" font-size="11" fill="${THEME_COLORS.textSecondary}" text-anchor="end">${s.bulleted ? "bullets · " : ""}${Math.round(s.sizePt)}pt</text>`,
      );
    }
  }
  return rasterize(parts.join(""), THEME_COLORS.background);
}
