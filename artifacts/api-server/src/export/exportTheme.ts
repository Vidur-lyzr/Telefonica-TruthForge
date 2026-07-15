// Telefónica export theme — the single deterministic source of design truth
// for every document renderer (.docx, .pdf, .pptx). Values mirror the Mística
// Telefónica skin tokens the app itself renders with (see
// artifacts/hub-ssot/DESIGN_SYSTEM.md): colors come from the same palette as
// the UI skinVars, the type scale follows the Mística text presets adapted to
// print points, and spacing sits on the same 8pt grid.
//
// Renderers must take EVERY color, size and spacing value from this file —
// never hardcode a design value in a renderer.

export const THEME_COLORS = {
  // skinVars.colors.brand (Telefónica core blue)
  brand: "#0066FF",
  // Dark navy used by Mística brand variants (navigation bar / hero bands)
  navy: "#001B41",
  // skinVars.colors.textPrimary
  textPrimary: "#031A34",
  // skinVars.colors.textSecondary
  textSecondary: "#6E7894",
  // skinVars.colors.divider
  divider: "#DDDDDD",
  background: "#FFFFFF",
  // skinVars.colors.backgroundAlternative — zebra rows, quiet panels
  backgroundAlt: "#F5F9FF",
  // skinVars.colors.brandLow — light blue tint for emphasis panels
  brandLow: "#E5F0FF",
  // Warning-low background + warning text for internal-note callouts
  warningLow: "#FFF4E5",
  warningHigh: "#8F5C00",
  // Text colors on dark (navy/brand) backgrounds
  inverse: "#FFFFFF",
  inverseSecondary: "#C7D6F0",
  inverseTertiary: "#8FA6C9",
} as const;

// Type scale in POINTS (print). Derived from the Mística Telefónica text
// presets (Text1–Text8 / Title1–Title4) adapted for A4 documents.
export const TYPE_SCALE_PT = {
  coverTitle: 28, // document title on the cover
  coverSubtitle: 12, // template · language · destination line
  coverMeta: 9.5, // generated-on line
  h1: 15, // section headings ("Title3" tier)
  h2: 12, // sub-headings, Q lines
  body: 10.5, // body copy ("Text3" tier)
  small: 9, // table cells, source lines
  caption: 8.5, // provenance, disclaimers, footers
  footer: 8,
} as const;

// Line spacing multipliers (Mística uses ~1.5 for body text).
export const LINE_HEIGHT = {
  body: 1.45,
  compact: 1.25,
} as const;

// Spacing in POINTS on the Mística 8pt grid.
export const SPACE_PT = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ---- DOCX geometry (DXA twips: 20ths of a point) ---------------------------
// A4 page: 11906 x 16838 DXA. Margins 2.2cm sides / 2.5cm top-bottom keeps the
// corporate look and gives a wide, readable measure.
export const DOCX_PAGE = {
  marginTop: 1418, // 2.5 cm
  marginBottom: 1418,
  marginLeft: 1247, // 2.2 cm
  marginRight: 1247,
  contentWidthDxa: 11906 - 1247 * 2, // 9412
} as const;

// docx TextRun sizes are half-points.
export const DOCX_SIZE = {
  coverTitle: TYPE_SCALE_PT.coverTitle * 2,
  coverSubtitle: TYPE_SCALE_PT.coverSubtitle * 2,
  coverMeta: TYPE_SCALE_PT.coverMeta * 2,
  h1: TYPE_SCALE_PT.h1 * 2,
  h2: TYPE_SCALE_PT.h2 * 2,
  body: TYPE_SCALE_PT.body * 2,
  small: TYPE_SCALE_PT.small * 2,
  caption: TYPE_SCALE_PT.caption * 2,
  footer: TYPE_SCALE_PT.footer * 2,
} as const;

// docx spacing values are DXA (20ths of a point).
export const DOCX_SPACE = {
  beforeH1: SPACE_PT.lg * 20, // 480
  afterH1: SPACE_PT.sm * 20, // 160
  afterBody: SPACE_PT.sm * 20,
  bodyLine: Math.round(TYPE_SCALE_PT.body * LINE_HEIGHT.body * 20), // ~305
  cellMarginV: 90,
  cellMarginH: 120,
} as const;

// Deterministic table column allocation. Returns integer DXA widths that sum
// exactly to the content width, so no viewer ever collapses a column.
export function docxColumnWidths(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const width = DOCX_PAGE.contentWidthDxa;
  const out = weights.map((w) => Math.floor((w / total) * width));
  out[out.length - 1] += width - out.reduce((a, b) => a + b, 0);
  return out;
}

// Column weights: first column (label/ref) narrower, data columns equal.
export function dataTableWeights(columnCount: number): number[] {
  if (columnCount <= 1) return [1];
  return [1.4, ...Array.from({ length: columnCount - 1 }, () => 1)];
}

// Citations table: Ref | Source | Location | Owner
export const CITATION_TABLE_WEIGHTS = [0.9, 3.6, 2.6, 2.0] as const;

// ---- PDF geometry (points) -------------------------------------------------
export const PDF_PAGE = {
  margin: 56,
  width: 595.28, // A4
  height: 841.89,
  contentWidth: 595.28 - 56 * 2,
} as const;

export function pdfColumnWidths(weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / total) * PDF_PAGE.contentWidth);
}
