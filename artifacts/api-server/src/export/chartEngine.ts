// Deterministic, on-brand chart engine for exports. NO model is involved:
// the chart type is chosen from the SHAPE of the numeric series, the chart is
// drawn as SVG with the Telefónica document palette, and every chart carries
// its governed source line. The SVG is rasterised to PNG for embedding in
// .docx / .pptx / .pdf output.
//
// Colour note: exported documents cannot consume the web app's skinVars tokens,
// so this module holds the corporate document palette (brand blue, deep navy
// and supporting tints) as the export-side counterpart of those tokens.

import { Resvg } from "@resvg/resvg-js";

export const EXPORT_PALETTE = {
  brand: "#0066FF",
  navy: "#001B41",
  textPrimary: "#031A34",
  textSecondary: "#6E7894",
  divider: "#DDDDDD",
  background: "#FFFFFF",
  backgroundAlt: "#F5F9FF",
  seriesTints: ["#0066FF", "#66A3FF", "#001B41", "#99C2FF", "#3384FF"],
} as const;

export type ExportChartType = "line" | "bar" | "stacked";

export interface ExportSeriesPoint {
  label: string;
  value: number;
}

export interface ExportSeries {
  id: string;
  label: string;
  unit: string;
  period?: string;
  source: string;
  citationId?: string | null;
  points: ExportSeriesPoint[];
}

export interface RenderedChart {
  type: ExportChartType;
  title: string;
  unit: string;
  source: string;
  citationId: string | null;
  svg: string;
  png: Buffer;
  width: number;
  height: number;
}

// ---- Deterministic type selection -------------------------------------------
// - time series (labels look like quarters, years or months, in order) -> line
// - share-of-whole (percentage points summing to ~100) -> stacked bar
// - anything else categorical -> bar
const TIME_LABEL =
  /^(q[1-4][\s\-.]*\d{2,4}|\d{4}|h[12][\s\-.]*\d{2,4}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-.]*\d{0,4}|fy\s*\d{2,4})$/i;

export function chooseChartType(series: ExportSeries): ExportChartType {
  const points = series.points;
  if (points.length === 0) return "bar";
  const timeLabels = points.filter((p) => TIME_LABEL.test(p.label.trim())).length;
  if (timeLabels >= Math.max(2, Math.ceil(points.length * 0.75))) return "line";
  const isPercent = /%|percent|share/i.test(series.unit) || /share/i.test(series.label);
  const total = points.reduce((s, p) => s + p.value, 0);
  if (isPercent && total >= 95 && total <= 105) return "stacked";
  return "bar";
}

// ---- SVG drawing --------------------------------------------------------------

const W = 920;
const H = 480;
const FONT = "DejaVu Sans, Verdana, sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-GB");
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

interface Frame {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function header(series: ExportSeries, type: ExportChartType): string {
  const P = EXPORT_PALETTE;
  const subtitle = [series.unit, series.period, series.citationId ? `Source ${series.citationId}` : null]
    .filter(Boolean)
    .join("  ·  ");
  return [
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${P.background}"/>`,
    `<rect x="40" y="40" width="10" height="10" rx="5" fill="${P.brand}"/>`,
    `<text x="62" y="51" font-family="${FONT}" font-size="22" font-weight="bold" fill="${P.textPrimary}">${esc(series.label)}</text>`,
    `<text x="62" y="76" font-family="${FONT}" font-size="14" fill="${P.textSecondary}">${esc(subtitle)}</text>`,
  ].join("");
}

function footer(series: ExportSeries): string {
  const P = EXPORT_PALETTE;
  return [
    `<line x1="40" y1="${H - 44}" x2="${W - 40}" y2="${H - 44}" stroke="${P.divider}" stroke-width="1"/>`,
    `<text x="40" y="${H - 22}" font-family="${FONT}" font-size="12" fill="${P.textSecondary}">Source: ${esc(series.source)}</text>`,
  ].join("");
}

function gridAndAxis(frame: Frame, max: number): string {
  const P = EXPORT_PALETTE;
  const rows: string[] = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = frame.bottom - ((frame.bottom - frame.top) * i) / steps;
    const v = (max * i) / steps;
    rows.push(
      `<line x1="${frame.left}" y1="${y}" x2="${frame.right}" y2="${y}" stroke="${P.divider}" stroke-width="1" stroke-dasharray="${i === 0 ? "none" : "3 4"}"/>`,
      `<text x="${frame.left - 10}" y="${y + 4}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${P.textSecondary}">${fmt(v)}</text>`,
    );
  }
  return rows.join("");
}

function drawBar(series: ExportSeries): string {
  const P = EXPORT_PALETTE;
  const frame: Frame = { left: 110, top: 110, right: W - 50, bottom: H - 80 };
  const max = niceMax(Math.max(...series.points.map((p) => p.value)));
  const n = series.points.length;
  const slot = (frame.right - frame.left) / n;
  const barW = Math.min(90, slot * 0.55);
  const parts: string[] = [header(series, "bar"), gridAndAxis(frame, max)];
  series.points.forEach((p, i) => {
    const x = frame.left + slot * i + (slot - barW) / 2;
    const h = ((frame.bottom - frame.top) * p.value) / max;
    const y = frame.bottom - h;
    parts.push(
      `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${P.brand}"/>`,
      `<text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="bold" fill="${P.navy}">${fmt(p.value)}</text>`,
      `<text x="${x + barW / 2}" y="${frame.bottom + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${P.textPrimary}">${esc(p.label)}</text>`,
    );
  });
  parts.push(footer(series));
  return parts.join("");
}

function drawLine(series: ExportSeries): string {
  const P = EXPORT_PALETTE;
  const frame: Frame = { left: 110, top: 110, right: W - 50, bottom: H - 80 };
  const max = niceMax(Math.max(...series.points.map((p) => p.value)));
  const n = series.points.length;
  const stepX = (frame.right - frame.left) / Math.max(1, n - 1);
  const pts = series.points.map((p, i) => ({
    x: frame.left + stepX * i,
    y: frame.bottom - ((frame.bottom - frame.top) * p.value) / max,
    p,
  }));
  const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${frame.bottom} L${pts[0].x},${frame.bottom} Z`;
  const parts: string[] = [header(series, "line"), gridAndAxis(frame, max)];
  parts.push(`<path d="${area}" fill="${P.brand}" opacity="0.08"/>`);
  parts.push(
    `<path d="${path}" fill="none" stroke="${P.brand}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`,
  );
  for (const pt of pts) {
    parts.push(
      `<circle cx="${pt.x}" cy="${pt.y}" r="5" fill="${P.background}" stroke="${P.brand}" stroke-width="3"/>`,
      `<text x="${pt.x}" y="${pt.y - 14}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="bold" fill="${P.navy}">${fmt(pt.p.value)}</text>`,
      `<text x="${pt.x}" y="${frame.bottom + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${P.textPrimary}">${esc(pt.p.label)}</text>`,
    );
  }
  parts.push(footer(series));
  return parts.join("");
}

function drawStacked(series: ExportSeries): string {
  const P = EXPORT_PALETTE;
  const left = 60;
  const right = W - 60;
  const barY = 190;
  const barH = 64;
  const total = series.points.reduce((s, p) => s + p.value, 0) || 1;
  const parts: string[] = [header(series, "stacked")];
  let x = left;
  series.points.forEach((p, i) => {
    const w = ((right - left) * p.value) / total;
    const colour = P.seriesTints[i % P.seriesTints.length];
    parts.push(`<rect x="${x}" y="${barY}" width="${w}" height="${barH}" fill="${colour}"/>`);
    if (w > 60) {
      parts.push(
        `<text x="${x + w / 2}" y="${barY + barH / 2 + 5}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="bold" fill="#FFFFFF">${fmt(p.value)}%</text>`,
      );
    }
    x += w;
  });
  // Legend
  let lx = left;
  const ly = barY + barH + 44;
  series.points.forEach((p, i) => {
    const colour = P.seriesTints[i % P.seriesTints.length];
    const labelText = `${p.label} (${fmt(p.value)}%)`;
    parts.push(
      `<rect x="${lx}" y="${ly - 11}" width="14" height="14" rx="3" fill="${colour}"/>`,
      `<text x="${lx + 22}" y="${ly}" font-family="${FONT}" font-size="13" fill="${P.textPrimary}">${esc(labelText)}</text>`,
    );
    lx += 30 + labelText.length * 7.4;
  });
  parts.push(footer(series));
  return parts.join("");
}

export function renderChartSvg(series: ExportSeries): { type: ExportChartType; svg: string } {
  const type = chooseChartType(series);
  const body = type === "line" ? drawLine(series) : type === "stacked" ? drawStacked(series) : drawBar(series);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  return { type, svg };
}

export function renderChart(series: ExportSeries): RenderedChart {
  const { type, svg } = renderChartSvg(series);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W * 2 },
    background: "#FFFFFF",
    font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
  });
  const png = Buffer.from(resvg.render().asPng());
  return {
    type,
    title: series.label,
    unit: series.unit,
    source: series.source,
    citationId: series.citationId ?? null,
    svg,
    png,
    width: W,
    height: H,
  };
}
