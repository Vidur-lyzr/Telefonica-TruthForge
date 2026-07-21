// PPTX part parser — unzips a .pptx, walks every slide's shape tree (with
// slideLayout → slideMaster placeholder-geometry inheritance and group
// transforms) and reduces each slide to a small set of typed, inch-space
// shapes the clustering and proposal stages can reason about. Also lifts
// the embedded media files for the image-harvest queue.
//
// Everything is normalised to the renderer's 13.33 x 7.5 inch canvas: decks
// authored at other slide sizes are scaled proportionally per axis.

import crypto from "crypto";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { imageSize } from "image-size";
import { SLIDE_W, SLIDE_H } from "../visualLayouts";
import { THEME_COLORS } from "../exportTheme";
import { DeckExtractionError } from "./errors";

const EMU_PER_INCH = 914400;
const EMU_PER_PT = 12700;

/** Hard cap so a pathological deck cannot pin the event loop for minutes. */
const MAX_SLIDES_PER_PART = 300;

// ---- Parsed model ---------------------------------------------------------------

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextShape extends Box {
  kind: "text";
  /** Total characters across paragraphs (newlines counted once each). */
  chars: number;
  paragraphs: number;
  bulleted: boolean;
  sizePt: number;
  sizeKnown: boolean;
  bold: boolean;
  /** Raw #RRGGBB if the run declared one (scheme colors pre-mapped). */
  colorHex: string | null;
  schemeColor: boolean;
  align: "left" | "center" | "right";
  phType: string | null;
  sample: string;
}

export interface ImageShape extends Box {
  kind: "image";
  /** Zip path under ppt/media, when the relationship resolved. */
  mediaPath: string | null;
}

export interface FillShape extends Box {
  kind: "fill";
  colorHex: string | null;
  alpha: number;
  gradient: boolean;
}

export interface LineShape {
  kind: "line";
  x: number;
  y: number;
  w: number;
  colorHex: string | null;
  pt: number;
}

export type ParsedShape = TextShape | ImageShape | FillShape | LineShape;

export interface ParsedSlide {
  /** 1-based global index across all uploaded parts. */
  index: number;
  sourceFile: string;
  shapes: ParsedShape[];
  bgColorHex: string | null;
  bgGradient: boolean;
}

export interface MediaAsset {
  /** Zip path, e.g. ppt/media/image3.png (prefixed per part to stay unique). */
  path: string;
  bytes: Buffer;
  contentType: string;
  ext: string;
  sha256: string;
  width: number;
  height: number;
  /** Slide indexes (global) that reference this media. */
  slides: number[];
}

export interface DroppedCounts {
  tables: number;
  charts: number;
  other: number;
  vectorMedia: number;
}

export interface ParsedDeck {
  slides: ParsedSlide[];
  media: MediaAsset[];
  dropped: DroppedCounts;
  gradientFills: number;
  notes: string[];
}

export function emptyParsedDeck(): ParsedDeck {
  return {
    slides: [],
    media: [],
    dropped: { tables: 0, charts: 0, other: 0, vectorMedia: 0 },
    gradientFills: 0,
    notes: [],
  };
}

// ---- XML helpers ---------------------------------------------------------------

const ARRAY_TAGS = new Set([
  "p:sp",
  "p:pic",
  "p:cxnSp",
  "p:graphicFrame",
  "p:grpSp",
  "a:p",
  "a:r",
  "a:br",
  "a:fld",
  "Relationship",
  "p:sldId",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ARRAY_TAGS.has(name),
  parseTagValue: false,
});

type XmlNode = Record<string, unknown>;

function node(value: unknown): XmlNode | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as XmlNode) : null;
}

function arr(value: unknown): XmlNode[] {
  if (Array.isArray(value)) return value.filter((v): v is XmlNode => !!node(v));
  const single = node(value);
  return single ? [single] : [];
}

function attr(n: XmlNode | null, name: string): string | null {
  if (!n) return null;
  const v = n[`@_${name}`];
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function num(n: XmlNode | null, name: string): number | null {
  const raw = attr(n, name);
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---- Color resolution -----------------------------------------------------------

// Office scheme-color names mapped onto the closest Telefónica token. This is
// an approximation by construction (the review UI says so); exactness is not
// the goal — landing inside the fixed brand palette is.
const SCHEME_MAP: Record<string, string> = {
  tx1: THEME_COLORS.textPrimary,
  dk1: THEME_COLORS.textPrimary,
  tx2: THEME_COLORS.navy,
  dk2: THEME_COLORS.navy,
  bg1: THEME_COLORS.background,
  lt1: THEME_COLORS.background,
  bg2: THEME_COLORS.backgroundAlt,
  lt2: THEME_COLORS.backgroundAlt,
  accent1: THEME_COLORS.brand,
  accent2: THEME_COLORS.navy,
  accent3: THEME_COLORS.textSecondary,
  accent4: THEME_COLORS.brandLow,
  accent5: THEME_COLORS.divider,
  accent6: THEME_COLORS.warningHigh,
  hlink: THEME_COLORS.brand,
  folHlink: THEME_COLORS.textSecondary,
};

interface ResolvedFill {
  colorHex: string | null;
  alpha: number;
  gradient: boolean;
  scheme: boolean;
  none: boolean;
}

function resolveColorNode(container: XmlNode | null): { hex: string | null; alpha: number; scheme: boolean } {
  if (!container) return { hex: null, alpha: 1, scheme: false };
  const srgb = node(container["a:srgbClr"]);
  if (srgb) {
    const val = attr(srgb, "val");
    const alphaNode = node(srgb["a:alpha"]);
    const alpha = alphaNode ? (num(alphaNode, "val") ?? 100000) / 100000 : 1;
    return {
      hex: val && /^[0-9A-Fa-f]{6}$/.test(val) ? `#${val.toUpperCase()}` : null,
      alpha: Math.min(1, Math.max(0, alpha)),
      scheme: false,
    };
  }
  const scheme = node(container["a:schemeClr"]);
  if (scheme) {
    const name = attr(scheme, "val") ?? "";
    const alphaNode = node(scheme["a:alpha"]);
    const alpha = alphaNode ? (num(alphaNode, "val") ?? 100000) / 100000 : 1;
    return { hex: SCHEME_MAP[name] ?? null, alpha: Math.min(1, Math.max(0, alpha)), scheme: true };
  }
  return { hex: null, alpha: 1, scheme: false };
}

function resolveFill(spPr: XmlNode | null): ResolvedFill {
  if (!spPr) return { colorHex: null, alpha: 1, gradient: false, scheme: false, none: true };
  if (node(spPr["a:noFill"])) return { colorHex: null, alpha: 1, gradient: false, scheme: false, none: true };
  const solid = node(spPr["a:solidFill"]);
  if (solid) {
    const { hex, alpha, scheme } = resolveColorNode(solid);
    return { colorHex: hex, alpha, gradient: false, scheme, none: false };
  }
  const grad = node(spPr["a:gradFill"]);
  if (grad) {
    // Take the first gradient stop as the representative solid.
    const stops = arr(node(grad["a:gsLst"])?.["a:gs"]);
    const first = stops.length > 0 ? resolveColorNode(stops[0]!) : { hex: null, alpha: 1, scheme: false };
    return { colorHex: first.hex, alpha: first.alpha, gradient: true, scheme: first.scheme, none: false };
  }
  return { colorHex: null, alpha: 1, gradient: false, scheme: false, none: true };
}

// ---- Geometry -------------------------------------------------------------------

interface EmuBox {
  x: number;
  y: number;
  cx: number;
  cy: number;
}

function readXfrm(spPr: XmlNode | null): EmuBox | null {
  const xfrm = node(spPr?.["a:xfrm"]);
  if (!xfrm) return null;
  const off = node(xfrm["a:off"]);
  const ext = node(xfrm["a:ext"]);
  const x = num(off, "x");
  const y = num(off, "y");
  const cx = num(ext, "cx");
  const cy = num(ext, "cy");
  if (x == null || y == null || cx == null || cy == null) return null;
  return { x, y, cx, cy };
}

/** Child-EMU → slide-EMU mapping for group nesting. */
interface GroupTransform {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
}

const IDENTITY: GroupTransform = { tx: 0, ty: 0, sx: 1, sy: 1 };

function applyTransform(box: EmuBox, t: GroupTransform): EmuBox {
  return {
    x: t.tx + box.x * t.sx,
    y: t.ty + box.y * t.sy,
    cx: box.cx * t.sx,
    cy: box.cy * t.sy,
  };
}

function childTransform(grpSpPr: XmlNode | null, parent: GroupTransform): GroupTransform | null {
  const xfrm = node(grpSpPr?.["a:xfrm"]);
  if (!xfrm) return null;
  const off = node(xfrm["a:off"]);
  const ext = node(xfrm["a:ext"]);
  const chOff = node(xfrm["a:chOff"]);
  const chExt = node(xfrm["a:chExt"]);
  const ox = num(off, "x");
  const oy = num(off, "y");
  const ecx = num(ext, "cx");
  const ecy = num(ext, "cy");
  const cox = num(chOff, "x") ?? ox;
  const coy = num(chOff, "y") ?? oy;
  const ccx = num(chExt, "cx") ?? ecx;
  const ccy = num(chExt, "cy") ?? ecy;
  if (ox == null || oy == null || ecx == null || ecy == null || cox == null || coy == null) return null;
  const sx = ccx && ccx !== 0 ? ecx / ccx : 1;
  const sy = ccy && ccy !== 0 ? ecy / ccy : 1;
  // Compose with the parent transform: child EMU → group EMU → slide EMU.
  return {
    tx: parent.tx + (ox - cox * sx) * parent.sx,
    ty: parent.ty + (oy - coy * sy) * parent.sy,
    sx: sx * parent.sx,
    sy: sy * parent.sy,
  };
}

// ---- Placeholder inheritance ---------------------------------------------------

type PlaceholderGeom = Map<string, EmuBox>;

function placeholderKeys(ph: XmlNode): string[] {
  const type = attr(ph, "type");
  const idx = attr(ph, "idx");
  const keys: string[] = [];
  if (type != null && idx != null) keys.push(`${type}:${idx}`);
  if (idx != null) keys.push(`idx:${idx}`);
  if (type != null) keys.push(`type:${type}`);
  return keys;
}

function collectPlaceholders(spTree: XmlNode | null, out: PlaceholderGeom): void {
  if (!spTree) return;
  for (const sp of arr(spTree["p:sp"])) {
    const ph = node(node(node(sp["p:nvSpPr"])?.["p:nvPr"])?.["p:ph"]);
    if (!ph) continue;
    const geom = readXfrm(node(sp["p:spPr"]));
    if (!geom) continue;
    for (const key of placeholderKeys(ph)) {
      if (!out.has(key)) out.set(key, geom);
    }
  }
}

function lookupPlaceholder(ph: XmlNode, maps: PlaceholderGeom[]): EmuBox | null {
  for (const key of placeholderKeys(ph)) {
    for (const map of maps) {
      const hit = map.get(key);
      if (hit) return hit;
    }
  }
  return null;
}

// ---- Relationships --------------------------------------------------------------

interface RelInfo {
  byId: Map<string, string>;
  layoutTarget: string | null;
  masterTarget: string | null;
}

async function readRels(zip: JSZip, relsPath: string): Promise<RelInfo> {
  const info: RelInfo = { byId: new Map(), layoutTarget: null, masterTarget: null };
  const file = zip.file(relsPath);
  if (!file) return info;
  const doc = parser.parse(await file.async("string")) as XmlNode;
  const rels = arr(node(doc["Relationships"])?.["Relationship"]);
  for (const rel of rels) {
    const id = attr(rel, "Id");
    const target = attr(rel, "Target");
    const type = attr(rel, "Type") ?? "";
    if (id && target) info.byId.set(id, target);
    if (type.endsWith("/slideLayout") && target) info.layoutTarget = target;
    if (type.endsWith("/slideMaster") && target) info.masterTarget = target;
  }
  return info;
}

/** Resolve a relationship target ("../media/image1.png") against a base dir. */
function resolveTarget(baseDir: string, target: string): string {
  const stack = baseDir.split("/").filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "..") stack.pop();
    else if (seg !== "." && seg !== "") stack.push(seg);
  }
  return stack.join("/");
}

// ---- Text extraction ------------------------------------------------------------

interface ParaStats {
  text: string;
  bulleted: boolean;
  align: "left" | "center" | "right" | null;
  maxSizePt: number | null;
  bold: boolean;
  colorHex: string | null;
  scheme: boolean;
}

function readParagraph(p: XmlNode): ParaStats {
  const pPr = node(p["a:pPr"]);
  const bulleted = !!(pPr && (node(pPr["a:buChar"]) || node(pPr["a:buAutoNum"])) && !node(pPr["a:buNone"]));
  const algnRaw = attr(pPr, "algn");
  const align = algnRaw === "ctr" ? "center" : algnRaw === "r" ? "right" : algnRaw === "l" ? "left" : null;
  let text = "";
  let maxSizePt: number | null = null;
  let bold = false;
  let colorHex: string | null = null;
  let scheme = false;
  const runs = [...arr(p["a:r"]), ...arr(p["a:fld"])];
  for (const r of runs) {
    const t = r["a:t"];
    if (typeof t === "string") text += t;
    else if (typeof t === "number") text += String(t);
    const rPr = node(r["a:rPr"]);
    if (rPr) {
      const sz = num(rPr, "sz");
      if (sz != null) {
        const pt = sz / 100;
        if (maxSizePt == null || pt > maxSizePt) maxSizePt = pt;
      }
      const b = attr(rPr, "b");
      if (b === "1" || b === "true") bold = true;
      const fill = node(rPr["a:solidFill"]);
      if (fill && colorHex == null) {
        const resolved = resolveColorNode(fill);
        colorHex = resolved.hex;
        scheme = resolved.scheme;
      }
    }
  }
  return { text: text.trim(), bulleted, align, maxSizePt, bold, colorHex, scheme };
}

const PH_DEFAULT_SIZE: Record<string, number> = {
  title: 32,
  ctrTitle: 40,
  subTitle: 18,
  body: 14,
};

// ---- Part parsing ---------------------------------------------------------------

export interface ParsePartResult {
  slides: ParsedSlide[];
  media: MediaAsset[];
  dropped: DroppedCounts;
  gradientFills: number;
  notes: string[];
}

export async function parsePptxPart(
  bytes: Buffer,
  startIndex: number,
  sourceFile: string,
  partTag: string,
): Promise<ParsePartResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new DeckExtractionError(`"${sourceFile}" could not be opened as a PowerPoint file.`);
  }

  const presFile = zip.file("ppt/presentation.xml");
  if (!presFile) {
    throw new DeckExtractionError(`"${sourceFile}" is not a PowerPoint deck (missing presentation.xml).`);
  }
  const pres = parser.parse(await presFile.async("string")) as XmlNode;
  const presRoot = node(pres["p:presentation"]);
  const sldSz = node(presRoot?.["p:sldSz"]);
  const deckWEmu = num(sldSz, "cx") ?? 12192000;
  const deckHEmu = num(sldSz, "cy") ?? 6858000;
  const scaleX = SLIDE_W / (deckWEmu / EMU_PER_INCH);
  const scaleY = SLIDE_H / (deckHEmu / EMU_PER_INCH);

  const presRels = await readRels(zip, "ppt/_rels/presentation.xml.rels");
  const slideIds = arr(node(presRoot?.["p:sldIdLst"])?.["p:sldId"]);
  const slidePaths: string[] = [];
  for (const sldId of slideIds) {
    const rid = attr(sldId, "r:id");
    const target = rid ? presRels.byId.get(rid) : null;
    if (target) slidePaths.push(resolveTarget("ppt", target));
  }
  if (slidePaths.length === 0) {
    throw new DeckExtractionError(`"${sourceFile}" contains no slides.`);
  }

  const notes: string[] = [];
  let truncated = false;
  if (slidePaths.length > MAX_SLIDES_PER_PART) {
    truncated = true;
    slidePaths.length = MAX_SLIDES_PER_PART;
  }

  // Layout/master caches shared across the part's slides.
  const layoutCache = new Map<string, { geom: PlaceholderGeom; bg: ResolvedFill | null; masterPath: string | null }>();
  const masterCache = new Map<string, { geom: PlaceholderGeom; bg: ResolvedFill | null }>();

  async function loadMaster(path: string): Promise<{ geom: PlaceholderGeom; bg: ResolvedFill | null }> {
    const hit = masterCache.get(path);
    if (hit) return hit;
    const out = { geom: new Map<string, EmuBox>(), bg: null as ResolvedFill | null };
    const file = zip.file(path);
    if (file) {
      const doc = parser.parse(await file.async("string")) as XmlNode;
      const cSld = node(node(doc["p:sldMaster"])?.["p:cSld"]);
      collectPlaceholders(node(cSld?.["p:spTree"]), out.geom);
      out.bg = readBackground(cSld);
    }
    masterCache.set(path, out);
    return out;
  }

  async function loadLayout(path: string): Promise<{ geom: PlaceholderGeom; bg: ResolvedFill | null; masterPath: string | null }> {
    const hit = layoutCache.get(path);
    if (hit) return hit;
    const out = {
      geom: new Map<string, EmuBox>(),
      bg: null as ResolvedFill | null,
      masterPath: null as string | null,
    };
    const file = zip.file(path);
    if (file) {
      const doc = parser.parse(await file.async("string")) as XmlNode;
      const cSld = node(node(doc["p:sldLayout"])?.["p:cSld"]);
      collectPlaceholders(node(cSld?.["p:spTree"]), out.geom);
      out.bg = readBackground(cSld);
      const dir = path.slice(0, path.lastIndexOf("/"));
      const base = path.slice(path.lastIndexOf("/") + 1);
      const rels = await readRels(zip, `${dir}/_rels/${base}.rels`);
      if (rels.masterTarget) out.masterPath = resolveTarget(dir, rels.masterTarget);
    }
    layoutCache.set(path, out);
    return out;
  }

  function readBackground(cSld: XmlNode | null): ResolvedFill | null {
    const bgPr = node(node(cSld?.["p:bg"])?.["p:bgPr"]);
    if (!bgPr) return null;
    const fill = resolveFill(bgPr);
    return fill.none ? null : fill;
  }

  const mediaBySlidePath = new Map<string, MediaAsset>();
  const dropped: DroppedCounts = { tables: 0, charts: 0, other: 0, vectorMedia: 0 };
  let gradientFills = 0;
  const slides: ParsedSlide[] = [];

  const MEDIA_TYPES: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };

  async function loadMedia(zipPath: string, slideIndex: number): Promise<MediaAsset | null> {
    const existing = mediaBySlidePath.get(zipPath);
    if (existing) {
      if (!existing.slides.includes(slideIndex)) existing.slides.push(slideIndex);
      return existing;
    }
    const ext = zipPath.slice(zipPath.lastIndexOf(".") + 1).toLowerCase();
    const contentType = MEDIA_TYPES[ext];
    if (!contentType) {
      dropped.vectorMedia += 1;
      return null;
    }
    const file = zip.file(zipPath);
    if (!file) return null;
    const buf = await file.async("nodebuffer");
    let width = 0;
    let height = 0;
    try {
      const dims = imageSize(buf);
      width = dims.width ?? 0;
      height = dims.height ?? 0;
    } catch {
      return null;
    }
    const asset: MediaAsset = {
      path: `${partTag}:${zipPath}`,
      bytes: buf,
      contentType,
      ext: ext === "jpeg" ? "jpg" : ext,
      sha256: crypto.createHash("sha256").update(buf).digest("hex"),
      width,
      height,
      slides: [slideIndex],
    };
    mediaBySlidePath.set(zipPath, asset);
    return asset;
  }

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i]!;
    const slideIndex = startIndex + i + 1;
    const file = zip.file(slidePath);
    if (!file) continue;
    const doc = parser.parse(await file.async("string")) as XmlNode;
    const cSld = node(node(doc["p:sld"])?.["p:cSld"]);
    const spTree = node(cSld?.["p:spTree"]);
    const dir = slidePath.slice(0, slidePath.lastIndexOf("/"));
    const base = slidePath.slice(slidePath.lastIndexOf("/") + 1);
    const rels = await readRels(zip, `${dir}/_rels/${base}.rels`);

    const phMaps: PlaceholderGeom[] = [];
    let inheritedBg: ResolvedFill | null = null;
    if (rels.layoutTarget) {
      const layout = await loadLayout(resolveTarget(dir, rels.layoutTarget));
      phMaps.push(layout.geom);
      inheritedBg = layout.bg;
      if (layout.masterPath) {
        const master = await loadMaster(layout.masterPath);
        phMaps.push(master.geom);
        if (!inheritedBg) inheritedBg = master.bg;
      }
    }

    const ownBg = readBackground(cSld);
    const bg = ownBg ?? inheritedBg;
    if (bg?.gradient) gradientFills += 1;

    const shapes: ParsedShape[] = [];

    const toInches = (box: EmuBox): Box => ({
      x: (box.x / EMU_PER_INCH) * scaleX,
      y: (box.y / EMU_PER_INCH) * scaleY,
      w: (box.cx / EMU_PER_INCH) * scaleX,
      h: (box.cy / EMU_PER_INCH) * scaleY,
    });

    const walk = async (tree: XmlNode, t: GroupTransform): Promise<void> => {
      for (const sp of arr(tree["p:sp"])) {
        const spPr = node(sp["p:spPr"]);
        const ph = node(node(node(sp["p:nvSpPr"])?.["p:nvPr"])?.["p:ph"]);
        let emu = readXfrm(spPr);
        if (emu) emu = applyTransform(emu, t);
        else if (ph) emu = lookupPlaceholder(ph, phMaps);
        if (!emu || emu.cx <= 0 || emu.cy <= 0) {
          dropped.other += 1;
          continue;
        }
        const box = toInches(emu);
        const txBody = node(sp["p:txBody"]);
        const paras = txBody ? arr(txBody["a:p"]).map(readParagraph) : [];
        const nonEmpty = paras.filter((p) => p.text.length > 0);
        if (nonEmpty.length > 0) {
          const phType = ph ? attr(ph, "type") : null;
          const chars = nonEmpty.reduce((acc, p) => acc + p.text.length, 0) + (nonEmpty.length - 1);
          const explicitBullets = nonEmpty.some((p) => p.bulleted);
          const avgLen = chars / nonEmpty.length;
          const bulleted =
            explicitBullets ||
            ((phType === "body" || phType == null) && nonEmpty.length >= 2 && avgLen < 140 && !ph === false);
          const sizes = nonEmpty.map((p) => p.maxSizePt).filter((s): s is number => s != null);
          const sizeKnown = sizes.length > 0;
          const sizePt = sizeKnown
            ? Math.max(...sizes)
            : PH_DEFAULT_SIZE[phType ?? ""] ?? 14;
          const colored = nonEmpty.find((p) => p.colorHex != null);
          shapes.push({
            kind: "text",
            ...box,
            chars,
            paragraphs: nonEmpty.length,
            bulleted: explicitBullets || (bulleted && nonEmpty.length >= 2),
            sizePt,
            sizeKnown,
            bold: nonEmpty.some((p) => p.bold),
            colorHex: colored?.colorHex ?? null,
            schemeColor: colored?.scheme ?? false,
            align: nonEmpty[0]!.align ?? "left",
            phType,
            sample: nonEmpty[0]!.text.slice(0, 80),
          });
          continue;
        }
        // No text — a filled shape can still matter as background furniture.
        const fill = resolveFill(spPr);
        if (fill.gradient) gradientFills += 1;
        if (!fill.none && fill.colorHex) {
          const prst = attr(node(spPr?.["a:prstGeom"]), "prst") ?? "rect";
          const heightIn = box.h;
          if ((prst === "line" || heightIn <= 0.06) && box.w >= 0.3) {
            shapes.push({ kind: "line", x: box.x, y: box.y, w: box.w, colorHex: fill.colorHex, pt: 1 });
          } else {
            shapes.push({ kind: "fill", ...box, colorHex: fill.colorHex, alpha: fill.alpha, gradient: fill.gradient });
          }
        } else if (!fill.none) {
          dropped.other += 1;
        }
      }
      for (const pic of arr(tree["p:pic"])) {
        let emu = readXfrm(node(pic["p:spPr"]));
        if (emu) emu = applyTransform(emu, t);
        if (!emu || emu.cx <= 0 || emu.cy <= 0) {
          dropped.other += 1;
          continue;
        }
        const box = toInches(emu);
        const blip = node(node(pic["p:blipFill"])?.["a:blip"]);
        const rid = attr(blip, "r:embed");
        const target = rid ? rels.byId.get(rid) : null;
        let mediaPath: string | null = null;
        if (target) {
          const zipPath = resolveTarget(dir, target);
          const asset = await loadMedia(zipPath, slideIndex);
          if (asset) mediaPath = asset.path;
        }
        shapes.push({ kind: "image", ...box, mediaPath });
      }
      for (const cxn of arr(tree["p:cxnSp"])) {
        const spPr = node(cxn["p:spPr"]);
        let emu = readXfrm(spPr);
        if (emu) emu = applyTransform(emu, t);
        if (!emu) continue;
        const box = toInches(emu);
        const ln = node(spPr?.["a:ln"]);
        const lnFill = resolveFill(ln);
        const widthEmu = num(ln, "w");
        const pt = widthEmu != null ? widthEmu / EMU_PER_PT : 1;
        if (box.h <= 0.12 && box.w >= 0.3) {
          shapes.push({
            kind: "line",
            x: box.x,
            y: box.y,
            w: box.w,
            colorHex: lnFill.colorHex,
            pt: Math.min(8, Math.max(0.25, pt)),
          });
        } else {
          dropped.other += 1;
        }
      }
      for (const frame of arr(tree["p:graphicFrame"])) {
        const data = node(node(frame["a:graphic"])?.["a:graphicData"]);
        const uri = attr(data, "uri") ?? "";
        if (uri.includes("table")) dropped.tables += 1;
        else if (uri.includes("chart")) dropped.charts += 1;
        else dropped.other += 1;
      }
      for (const grp of arr(tree["p:grpSp"])) {
        const inner = childTransform(node(grp["p:grpSpPr"]), t);
        if (inner) await walk(grp, inner);
        else dropped.other += 1;
      }
    };

    if (spTree) await walk(spTree, IDENTITY);

    slides.push({
      index: slideIndex,
      sourceFile,
      shapes,
      bgColorHex: bg && !bg.none ? bg.colorHex : null,
      bgGradient: bg?.gradient ?? false,
    });
  }

  if (truncated) {
    notes.push(
      `"${sourceFile}" has more than ${MAX_SLIDES_PER_PART} slides — only the first ${MAX_SLIDES_PER_PART} were analysed.`,
    );
  }

  return { slides, media: [...mediaBySlidePath.values()], dropped, gradientFills, notes };
}

/** Merge one parsed part into the accumulating deck. */
export function mergeIntoDeck(deck: ParsedDeck, part: ParsePartResult): void {
  deck.slides.push(...part.slides);
  // Cross-part dedupe happens at harvest time via sha256; keep all here.
  deck.media.push(...part.media);
  deck.dropped.tables += part.dropped.tables;
  deck.dropped.charts += part.dropped.charts;
  deck.dropped.other += part.dropped.other;
  deck.dropped.vectorMedia += part.dropped.vectorMedia;
  deck.gradientFills += part.gradientFills;
  deck.notes.push(...part.notes);
}
