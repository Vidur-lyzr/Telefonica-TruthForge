// Template preview engine — renders a deterministic A4 page (cover or body)
// for an export template as PNG. It consumes EXACTLY the same design inputs
// the real exporters do: the shared export theme tokens, the template's
// design spec, the chart engine and the embedded Hanken Grotesk brand fonts.
// The preview therefore IS the design of the downloaded document — no
// screenshotting, no separate preview styling.

import { Resvg } from "@resvg/resvg-js";
import {
  THEME_COLORS,
  TYPE_SCALE_PT,
  LINE_HEIGHT,
  PDF_PAGE,
} from "./exportTheme";
import {
  getExportTemplate,
  type ExportTemplate,
  type TemplateDesign,
} from "./exportTemplates";
import { renderChart } from "./chartEngine";
import { brandFontPath, brandMarkPng, BRAND_FONT_FAMILY } from "./brandAssets";

const W = Math.round(PDF_PAGE.width); // 595
const H = Math.round(PDF_PAGE.height); // 842
const MARGIN = PDF_PAGE.margin; // 56
const CONTENT_W = W - MARGIN * 2;
const FONT = BRAND_FONT_FAMILY;
const C = THEME_COLORS;

export type PreviewPage = "cover" | "body";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Approximate word-wrap for Hanken Grotesk (avg glyph ~0.52 em; bold ~0.55).
function wrap(text: string, maxWidth: number, fontSize: number, bold = false): string[] {
  const perChar = fontSize * (bold ? 0.56 : 0.52);
  const maxChars = Math.max(8, Math.floor(maxWidth / perChar));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function accentOf(design: TemplateDesign): string {
  return design.accent === "navy" ? C.navy : C.brand;
}

function text(
  x: number,
  y: number,
  content: string,
  opts: {
    size: number;
    color: string;
    weight?: 400 | 500 | 700;
    anchor?: "start" | "middle" | "end";
    spacing?: number;
    italic?: boolean;
  },
): string {
  const { size, color, weight = 400, anchor = "start", spacing, italic } = opts;
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ""}${italic ? ` font-style="italic"` : ""}>${esc(content)}</text>`;
}

function markImage(x: number, y: number, widthPx: number, color: string): string {
  const png = brandMarkPng(widthPx * 3, color).toString("base64");
  // Height ratio of the five-dot mark is ~1:1.
  return `<image x="${x}" y="${y}" width="${widthPx}" height="${widthPx}" href="data:image/png;base64,${png}"/>`;
}

// ---- Cover page ---------------------------------------------------------------

function coverSvg(t: ExportTemplate): string {
  const d = t.design;
  const s = t.sample;
  const accent = accentOf(d);
  const parts: string[] = [];
  const generated = "Generated from governed sources · every figure cited";

  const title = (x: number, y: number, color: string, size: number = TYPE_SCALE_PT.coverTitle, maxW = CONTENT_W, anchor: "start" | "middle" = "start") => {
    const lines = wrap(s.title, maxW, size, true);
    return lines
      .map((line, i) => text(x, y + i * size * 1.2, line, { size, color, weight: 700, anchor }))
      .join("");
  };

  switch (d.coverStyle) {
    case "navy-full": {
      parts.push(`<rect width="${W}" height="${H}" fill="${C.navy}"/>`);
      parts.push(`<rect width="10" height="${H}" fill="${C.brand}"/>`);
      parts.push(markImage(MARGIN, 64, 26, C.brand));
      parts.push(text(MARGIN + 36, 82, "Telefónica", { size: 15, color: C.inverse, weight: 700 }));
      parts.push(text(MARGIN, 330, s.kicker.toUpperCase(), { size: 9, color: C.inverseTertiary, weight: 500, spacing: 2 }));
      parts.push(title(MARGIN, 372, C.inverse));
      parts.push(text(MARGIN, 372 + wrap(s.title, CONTENT_W, TYPE_SCALE_PT.coverTitle, true).length * 34 + 14, s.subtitle, { size: TYPE_SCALE_PT.coverSubtitle, color: C.inverseSecondary }));
      parts.push(`<line x1="${MARGIN}" y1="${H - 96}" x2="${W - MARGIN}" y2="${H - 96}" stroke="${C.brand}" stroke-width="2"/>`);
      parts.push(text(MARGIN, H - 72, generated, { size: TYPE_SCALE_PT.coverMeta, color: C.inverseTertiary }));
      break;
    }
    case "brand-full": {
      parts.push(`<rect width="${W}" height="${H}" fill="${C.brand}"/>`);
      parts.push(`<rect y="${H - 250}" width="${W}" height="250" fill="${C.navy}"/>`);
      parts.push(markImage(MARGIN, 64, 26, C.inverse));
      parts.push(text(MARGIN + 36, 82, "Telefónica", { size: 15, color: C.inverse, weight: 700 }));
      parts.push(text(MARGIN, 300, s.kicker.toUpperCase(), { size: 9, color: C.inverseSecondary, weight: 500, spacing: 2 }));
      parts.push(title(MARGIN, 342, C.inverse));
      parts.push(text(MARGIN, H - 196, s.subtitle, { size: TYPE_SCALE_PT.coverSubtitle, color: C.inverseSecondary }));
      parts.push(text(MARGIN, H - 172, generated, { size: TYPE_SCALE_PT.coverMeta, color: C.inverseTertiary }));
      parts.push(`<line x1="${MARGIN}" y1="${H - 220}" x2="${MARGIN + 120}" y2="${H - 220}" stroke="${C.inverse}" stroke-width="2"/>`);
      break;
    }
    case "brand-band": {
      parts.push(`<rect width="${W}" height="${H}" fill="${C.background}"/>`);
      parts.push(markImage(MARGIN, 56, 26, C.brand));
      parts.push(text(MARGIN + 36, 74, "Telefónica", { size: 15, color: C.navy, weight: 700 }));
      parts.push(text(MARGIN, 148, s.kicker.toUpperCase(), { size: 9, color: C.textSecondary, weight: 500, spacing: 2 }));
      parts.push(`<rect y="176" width="${W}" height="190" fill="${C.brand}"/>`);
      parts.push(title(MARGIN, 246, C.inverse, 26, CONTENT_W));
      parts.push(text(MARGIN, 336, s.subtitle, { size: TYPE_SCALE_PT.coverSubtitle, color: C.inverseSecondary }));
      parts.push(text(MARGIN, 420, generated, { size: TYPE_SCALE_PT.coverMeta, color: C.textSecondary }));
      parts.push(`<line x1="${MARGIN}" y1="${H - 80}" x2="${W - MARGIN}" y2="${H - 80}" stroke="${C.divider}" stroke-width="1"/>`);
      parts.push(text(MARGIN, H - 60, d.footerLabel, { size: TYPE_SCALE_PT.footer, color: C.textSecondary }));
      break;
    }
    case "masthead": {
      parts.push(`<rect width="${W}" height="${H}" fill="${C.background}"/>`);
      parts.push(`<rect x="${MARGIN}" y="52" width="${CONTENT_W}" height="4" fill="${C.navy}"/>`);
      parts.push(`<line x1="${MARGIN}" y1="62" x2="${W - MARGIN}" y2="62" stroke="${C.navy}" stroke-width="1"/>`);
      parts.push(markImage(MARGIN, 84, 22, C.navy));
      parts.push(text(MARGIN + 32, 100, "Telefónica", { size: 18, color: C.navy, weight: 700 }));
      parts.push(text(W - MARGIN, 100, s.kicker.toUpperCase(), { size: 9, color: C.textSecondary, weight: 500, anchor: "end", spacing: 2 }));
      parts.push(`<line x1="${MARGIN}" y1="122" x2="${W - MARGIN}" y2="122" stroke="${C.divider}" stroke-width="1"/>`);
      parts.push(title(MARGIN, 210, C.navy, 26));
      const titleLines = wrap(s.title, CONTENT_W, 26, true).length;
      const subY = 210 + titleLines * 31 + 10;
      wrap(s.subtitle, CONTENT_W, TYPE_SCALE_PT.coverSubtitle).forEach((line, i) =>
        parts.push(text(MARGIN, subY + i * 17, line, { size: TYPE_SCALE_PT.coverSubtitle, color: C.textSecondary })),
      );
      parts.push(`<line x1="${MARGIN}" y1="${subY + 44}" x2="${MARGIN + 140}" y2="${subY + 44}" stroke="${C.navy}" stroke-width="2"/>`);
      parts.push(text(MARGIN, subY + 68, generated, { size: TYPE_SCALE_PT.coverMeta, color: C.textSecondary }));
      parts.push(`<line x1="${MARGIN}" y1="${H - 72}" x2="${W - MARGIN}" y2="${H - 72}" stroke="${C.navy}" stroke-width="1"/>`);
      parts.push(text(MARGIN, H - 54, d.footerLabel, { size: TYPE_SCALE_PT.footer, color: C.textSecondary }));
      break;
    }
    case "split": {
      const panelW = 200;
      parts.push(`<rect width="${W}" height="${H}" fill="${C.background}"/>`);
      parts.push(`<rect width="${panelW}" height="${H}" fill="${C.navy}"/>`);
      parts.push(`<rect x="${panelW}" width="4" height="${H}" fill="${C.brand}"/>`);
      parts.push(markImage(40, 64, 26, C.brand));
      parts.push(text(40, 112, "Telefónica", { size: 15, color: C.inverse, weight: 700 }));
      parts.push(text(40, H - 72, d.footerLabel.split(" · ")[0] ?? d.footerLabel, { size: TYPE_SCALE_PT.footer, color: C.inverseTertiary }));
      const x = panelW + 44;
      const colW = W - x - MARGIN;
      parts.push(text(x, 300, s.kicker.toUpperCase(), { size: 9, color: C.textSecondary, weight: 500, spacing: 2 }));
      parts.push(title(x, 340, C.navy, 24, colW));
      const tl = wrap(s.title, colW, 24, true).length;
      wrap(s.subtitle, colW, TYPE_SCALE_PT.coverSubtitle).forEach((line, i) =>
        parts.push(text(x, 340 + tl * 29 + 16 + i * 17, line, { size: TYPE_SCALE_PT.coverSubtitle, color: C.textSecondary })),
      );
      parts.push(text(x, H - 72, generated, { size: TYPE_SCALE_PT.coverMeta, color: C.textSecondary }));
      break;
    }
    case "minimal": {
      parts.push(`<rect width="${W}" height="${H}" fill="${C.background}"/>`);
      parts.push(markImage(W / 2 - 44, 190, 88, C.brand));
      parts.push(text(W / 2, 330, s.kicker.toUpperCase(), { size: 9, color: C.textSecondary, weight: 500, anchor: "middle", spacing: 3 }));
      const lines = wrap(s.title, CONTENT_W - 60, 24, true);
      lines.forEach((line, i) =>
        parts.push(text(W / 2, 372 + i * 29, line, { size: 24, color: C.navy, weight: 700, anchor: "middle" })),
      );
      parts.push(text(W / 2, 372 + lines.length * 29 + 18, s.subtitle, { size: TYPE_SCALE_PT.coverSubtitle, color: C.textSecondary, anchor: "middle" }));
      parts.push(`<line x1="${W / 2 - 60}" y1="${H - 120}" x2="${W / 2 + 60}" y2="${H - 120}" stroke="${C.brand}" stroke-width="2"/>`);
      parts.push(text(W / 2, H - 96, generated, { size: TYPE_SCALE_PT.coverMeta, color: C.textSecondary, anchor: "middle" }));
      break;
    }
  }
  return parts.join("");
}

// ---- Body page ----------------------------------------------------------------

function headingBlock(x: number, y: number, heading: string, d: TemplateDesign): { svg: string; height: number } {
  const accent = accentOf(d);
  const size = TYPE_SCALE_PT.h1;
  const lines = wrap(heading, CONTENT_W - 24, size, true);
  const lineH = size * 1.25;
  const parts: string[] = [];
  switch (d.headingStyle) {
    case "bar": {
      parts.push(`<rect x="${x}" y="${y}" width="4" height="${lines.length * lineH + 4}" fill="${accent}"/>`);
      lines.forEach((line, i) => parts.push(text(x + 14, y + 14 + i * lineH, line, { size, color: C.navy, weight: 700 })));
      return { svg: parts.join(""), height: lines.length * lineH + 16 };
    }
    case "rule": {
      lines.forEach((line, i) => parts.push(text(x, y + 12 + i * lineH, line, { size, color: C.navy, weight: 700 })));
      const ry = y + 12 + (lines.length - 1) * lineH + 10;
      parts.push(`<line x1="${x}" y1="${ry}" x2="${x + CONTENT_W}" y2="${ry}" stroke="${accent}" stroke-width="1.5"/>`);
      return { svg: parts.join(""), height: lines.length * lineH + 26 };
    }
    case "block": {
      const blockH = lines.length * lineH + 14;
      parts.push(`<rect x="${x}" y="${y}" width="${CONTENT_W}" height="${blockH}" fill="${d.accent === "navy" ? C.backgroundAlt : C.brandLow}" rx="3"/>`);
      lines.forEach((line, i) => parts.push(text(x + 12, y + 18 + i * lineH, line, { size, color: C.navy, weight: 700 })));
      return { svg: parts.join(""), height: blockH + 12 };
    }
  }
}

function tableBlock(x: number, y: number, t: ExportTemplate): { svg: string; height: number } {
  const d = t.design;
  const table = t.sample.table;
  const parts: string[] = [];
  const rowH = 22;
  const headerFill = d.tableHeader === "navy" ? C.navy : d.tableHeader === "brand" ? C.brand : C.backgroundAlt;
  const headerText = d.tableHeader === "light" ? C.navy : C.inverse;
  const colW = CONTENT_W / table.columns.length;

  parts.push(text(x, y, table.title, { size: TYPE_SCALE_PT.h2, color: C.navy, weight: 700 }));
  let cy = y + 10;
  parts.push(`<rect x="${x}" y="${cy}" width="${CONTENT_W}" height="${rowH}" fill="${headerFill}"/>`);
  table.columns.forEach((col, i) =>
    parts.push(text(x + i * colW + 8, cy + 15, col, { size: TYPE_SCALE_PT.small, color: headerText, weight: 700 })),
  );
  cy += rowH;
  table.rows.forEach((row, r) => {
    if (r % 2 === 1) parts.push(`<rect x="${x}" y="${cy}" width="${CONTENT_W}" height="${rowH}" fill="${C.backgroundAlt}"/>`);
    row.forEach((cell, i) =>
      parts.push(
        text(x + i * colW + 8, cy + 15, cell, {
          size: TYPE_SCALE_PT.small,
          color: i === 0 ? C.navy : C.textPrimary,
          weight: i === 0 ? 500 : 400,
        }),
      ),
    );
    parts.push(`<line x1="${x}" y1="${cy + rowH}" x2="${x + CONTENT_W}" y2="${cy + rowH}" stroke="${C.divider}" stroke-width="0.75"/>`);
    cy += rowH;
  });
  parts.push(text(x, cy + 14, `Source: ${table.source}`, { size: TYPE_SCALE_PT.caption, color: C.textSecondary, italic: true }));
  return { svg: parts.join(""), height: cy + 24 - y };
}

function bodySvg(t: ExportTemplate): string {
  const d = t.design;
  const s = t.sample;
  const accent = accentOf(d);
  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="${C.background}"/>`);

  // Running header
  parts.push(markImage(MARGIN, 26, 14, accent));
  parts.push(text(MARGIN + 22, 37, "Telefónica", { size: 9, color: C.navy, weight: 700 }));
  parts.push(text(W - MARGIN, 37, d.footerLabel, { size: TYPE_SCALE_PT.footer, color: C.textSecondary, anchor: "end" }));
  parts.push(`<line x1="${MARGIN}" y1="48" x2="${W - MARGIN}" y2="48" stroke="${d.coverStyle === "masthead" ? C.navy : C.divider}" stroke-width="1"/>`);

  let y = 78;
  const bodySize = TYPE_SCALE_PT.body;
  const bodyLine = bodySize * LINE_HEIGHT.body;

  for (const section of s.sections) {
    if (y > 380) break;
    const hb = headingBlock(MARGIN, y, section.heading, d);
    parts.push(hb.svg);
    y += hb.height + 8;
    for (const para of section.paragraphs) {
      const lines = wrap(para, CONTENT_W, bodySize);
      lines.forEach((line, i) => parts.push(text(MARGIN, y + i * bodyLine, line, { size: bodySize, color: C.textPrimary })));
      y += lines.length * bodyLine + 10;
    }
    for (const bullet of section.bullets ?? []) {
      const lines = wrap(bullet, CONTENT_W - 18, bodySize);
      parts.push(`<circle cx="${MARGIN + 4}" cy="${y - 3.5}" r="2.2" fill="${accent}"/>`);
      lines.forEach((line, i) => parts.push(text(MARGIN + 16, y + i * bodyLine, line, { size: bodySize, color: C.textPrimary })));
      y += lines.length * bodyLine + 4;
    }
    y += 10;
  }

  // Data table
  const tb = tableBlock(MARGIN, y + 6, t);
  parts.push(tb.svg);
  y += tb.height + 22;

  // Chart from the real chart engine, embedded as raster
  const chart = renderChart({
    id: `${t.id}-preview`,
    label: s.chart.label,
    unit: s.chart.unit,
    source: s.chart.source,
    citationId: "S1",
    points: s.chart.points,
  });
  const chartW = CONTENT_W;
  const chartH = (chart.height / chart.width) * chartW;
  const maxChartH = H - 64 - y;
  const drawH = Math.min(chartH, maxChartH);
  const drawW = (drawH / chartH) * chartW;
  parts.push(`<rect x="${MARGIN + (CONTENT_W - drawW) / 2 - 1}" y="${y - 1}" width="${drawW + 2}" height="${drawH + 2}" fill="none" stroke="${C.divider}" stroke-width="1"/>`);
  parts.push(
    `<image x="${MARGIN + (CONTENT_W - drawW) / 2}" y="${y}" width="${drawW}" height="${drawH}" href="data:image/png;base64,${chart.png.toString("base64")}"/>`,
  );

  // Footer
  parts.push(`<line x1="${MARGIN}" y1="${H - 42}" x2="${W - MARGIN}" y2="${H - 42}" stroke="${C.divider}" stroke-width="1"/>`);
  parts.push(text(MARGIN, H - 26, d.footerLabel, { size: TYPE_SCALE_PT.footer, color: C.textSecondary }));
  parts.push(text(W - MARGIN, H - 26, "Page 2", { size: TYPE_SCALE_PT.footer, color: C.textSecondary, anchor: "end" }));
  return parts.join("");
}

// ---- Rasterisation + cache ------------------------------------------------------

const cache = new Map<string, Buffer>();

export function renderTemplatePreview(templateId: string, page: PreviewPage): Buffer | null {
  const template = getExportTemplate(templateId);
  if (!template) return null;
  const key = `${templateId}:${page}:${template.version}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const body = page === "cover" ? coverSvg(template) : bodySvg(template);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W * 2 },
    background: "#FFFFFF",
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
  const png = Buffer.from(resvg.render().asPng());
  cache.set(key, png);
  return png;
}
