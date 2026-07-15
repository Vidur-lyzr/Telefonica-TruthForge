// Brand assets for the export renderers — Hanken Grotesk font files (the
// open-weight face closest to Telefónica Sans, embedded so exported documents
// render on-brand on machines without corporate fonts installed) and the
// five-dot Telefónica mark rasterised from a local SVG.
//
// All paths resolve file-relative to the artifact directory at runtime: the
// server bundle is esbuild output under dist/, and pdfkit/resvg are
// externalized, so assets must be looked up on disk — never bundled.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

function assetsRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), "assets"),
    path.resolve(process.cwd(), "artifacts/api-server/assets"),
    path.resolve(__dirname, "../assets"),
    path.resolve(__dirname, "../../assets"),
  ];
  for (const c of candidates) {
    if (existsSync(path.join(c, "fonts", "HankenGrotesk-Regular.ttf"))) return c;
  }
  throw new Error(
    "Brand assets directory not found — expected assets/fonts/HankenGrotesk-Regular.ttf under the api-server artifact.",
  );
}

let cachedRoot: string | null = null;
function root(): string {
  if (!cachedRoot) cachedRoot = assetsRoot();
  return cachedRoot;
}

export type BrandFontStyle = "regular" | "medium" | "bold" | "italic";

const FONT_FILES: Record<BrandFontStyle, string> = {
  regular: "HankenGrotesk-Regular.ttf",
  medium: "HankenGrotesk-Medium.ttf",
  bold: "HankenGrotesk-Bold.ttf",
  italic: "HankenGrotesk-Italic.ttf",
};

const fontCache = new Map<BrandFontStyle, Buffer>();

export function brandFontPath(style: BrandFontStyle): string {
  return path.join(root(), "fonts", FONT_FILES[style]);
}

export function brandFont(style: BrandFontStyle): Buffer {
  const cached = fontCache.get(style);
  if (cached) return cached;
  const buf = readFileSync(brandFontPath(style));
  fontCache.set(style, buf);
  return buf;
}

// The exported name embedded documents reference. DOCX embeds the TTFs under
// this family name; PDF registers them directly; PPTX names the face (fonts
// cannot be embedded by pptxgenjs — noted in the renderer).
export const BRAND_FONT_FAMILY = "Hanken Grotesk";

const logoCache = new Map<string, Buffer>();

/** Rasterise the five-dot Telefónica mark at the given pixel width. */
export function brandMarkPng(widthPx: number, color: string): Buffer {
  const key = `${widthPx}:${color}`;
  const cached = logoCache.get(key);
  if (cached) return cached;
  const svg = readFileSync(path.join(root(), "brand", "telefonica-mark.svg"), "utf8").replaceAll(
    "CURRENT",
    color,
  );
  const png = new Resvg(svg, { fitTo: { mode: "width", value: widthPx } }).render().asPng();
  const buf = Buffer.from(png);
  logoCache.set(key, buf);
  return buf;
}
