// .pdf renderer — Telefónica corporate PDF driven entirely by the
// deterministic export theme (exportTheme.ts): full-page brand cover with the
// five-dot mark, embedded Hanken Grotesk (the open face closest to Telefónica
// Sans), styled headings, cited body with bullet support, embedded charts and
// real wrapped-cell tables (measured row heights, repeated headers across page
// breaks — never truncated, never one-character columns).

import PDFDocument from "pdfkit";
import type { ExportDocumentModel } from "../exportService";
import type { TemplateDesign } from "../exportTemplates";
import { brandFontPath, brandMarkPng } from "../brandAssets";
import {
  THEME_COLORS,
  TYPE_SCALE_PT,
  PDF_PAGE,
  pdfColumnWidths,
  dataTableWeights,
  CITATION_TABLE_WEIGHTS,
} from "../exportTheme";
import { renderPptxPreviewPdf } from "./pptxPreviewPdf";
import { iconForHeading, sectionIconPng } from "./sectionIcons";

// Uppercase classification label for the per-page footer strip — always
// derived from the server-side confidentiality, never from client input.
export function classificationLabel(confidentiality: string): string {
  switch (confidentiality) {
    case "public":
      return "PUBLIC";
    case "internal":
      return "USO INTERNO · INTERNAL USE";
    case "confidential":
      return "CONFIDENCIAL · CONFIDENTIAL";
    case "off_the_record":
      return "OFF THE RECORD";
    default:
      return confidentiality.toUpperCase();
  }
}

const BRAND = THEME_COLORS.brand;
const NAVY = THEME_COLORS.navy;
const TEXT = THEME_COLORS.textPrimary;
const MUTED = THEME_COLORS.textSecondary;
const DIVIDER = THEME_COLORS.divider;
const ZEBRA = THEME_COLORS.backgroundAlt;

const MARGIN = PDF_PAGE.margin;
const CONTENT_W = PDF_PAGE.contentWidth;

// The template design drives every stylistic choice below: which theme colour
// is the accent, how section headings are treated, how table headers are
// filled and what the running footer says. Renderers never invent a value —
// they map the design spec onto theme tokens.
function accentOf(design: TemplateDesign): string {
  return design.accent === "navy" ? NAVY : BRAND;
}

function tableHeaderStyleOf(design: TemplateDesign): { fill: string; color: string } {
  switch (design.tableHeader) {
    case "brand":
      return { fill: BRAND, color: THEME_COLORS.inverse };
    case "light":
      return { fill: ZEBRA, color: NAVY };
    default:
      return { fill: NAVY, color: THEME_COLORS.inverse };
  }
}

// Registered font names — Hanken Grotesk, embedded from local TTFs.
const F = "Brand";
const FB = "Brand-Bold";
const FM = "Brand-Medium";
const FI = "Brand-Italic";

const CELL_PAD_H = 6;
const CELL_PAD_V = 5;

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - MARGIN - 24) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

function heading(doc: PDFKit.PDFDocument, text: string, design: TemplateDesign): void {
  ensureSpace(doc, 60);
  doc.moveDown(1);
  const accent = accentOf(design);
  const y = doc.y;
  // Longform forecast headings: small line icon beside the heading plus a
  // brand rule underneath, regardless of the base heading style.
  if (design.sectionIcons) {
    const iconSize = 14;
    doc.image(sectionIconPng(iconForHeading(text), accent, iconSize * 4), MARGIN, y + 1, {
      width: iconSize,
    });
    doc
      .font(FB)
      .fontSize(TYPE_SCALE_PT.h1)
      .fillColor(NAVY)
      .text(text, MARGIN + iconSize + 8, y, { width: CONTENT_W - iconSize - 8 });
    const ry = doc.y + 3;
    doc
      .moveTo(MARGIN, ry)
      .lineTo(MARGIN + CONTENT_W, ry)
      .strokeColor(accent)
      .lineWidth(1.2)
      .stroke();
    doc.y = ry + 4;
    doc.x = MARGIN;
    doc.moveDown(0.4);
    return;
  }
  switch (design.headingStyle) {
    case "rule": {
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.h1)
        .fillColor(NAVY)
        .text(text, MARGIN, y, { width: CONTENT_W });
      const ry = doc.y + 3;
      doc
        .moveTo(MARGIN, ry)
        .lineTo(MARGIN + CONTENT_W, ry)
        .strokeColor(accent)
        .lineWidth(1.2)
        .stroke();
      doc.y = ry + 4;
      break;
    }
    case "block": {
      doc.font(FB).fontSize(TYPE_SCALE_PT.h1);
      const h = doc.heightOfString(text, { width: CONTENT_W - 24 });
      doc
        .rect(MARGIN, y, CONTENT_W, h + 12)
        .fill(design.accent === "navy" ? ZEBRA : THEME_COLORS.brandLow);
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.h1)
        .fillColor(NAVY)
        .text(text, MARGIN + 12, y + 6, { width: CONTENT_W - 24 });
      doc.y = y + h + 12;
      break;
    }
    default: {
      doc.rect(MARGIN, y + 2, 3, 14).fill(accent);
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.h1)
        .fillColor(NAVY)
        .text(text, MARGIN + 12, y, { width: CONTENT_W - 12 });
      break;
    }
  }
  doc.x = MARGIN;
  doc.moveDown(0.4);
}

// Body copy with bullet support: "- " lines render as brand-blue bullets with
// a hanging indent; "N. " lines as numbered items; everything else wraps as a
// justified-left paragraph at the themed body size and line height.
// Forecast block vocabulary (Previsiones benchmark), applied only when the
// template design opts in via sectionIcons: bold bracketed date-block headers
// ("[29 June]: ..."), "o " sub-bullets nested under "- " bullets, ALL-CAPS
// sub-brand subheadings, and channel-prefixed lines (IG:/TT:/LK:/...).
const DATE_BLOCK = /^\[([^\]]{1,40})\]:\s*(.*)$/;
const SUB_BULLET = /^o\s+(.*)$/;
const CHANNEL_LINE = /^(?:-\s+)?(IG|TT|LK|X|FB|YT|TW|WEB):\s+(.*)$/;
// A standalone short ALL-CAPS line (sub-brand grouping like "MOVISTAR").
function isCapsSubheading(line: string): boolean {
  if (line.length < 2 || line.length > 48) return false;
  if (!/^[A-ZÁÉÍÓÚÜÑ0-9][A-ZÁÉÍÓÚÜÑ0-9 &.·+-]*$/.test(line)) return false;
  if (!/[A-ZÁÉÍÓÚÜÑ]/.test(line)) return false;
  return line.split(/\s+/).length <= 6;
}

function bodyText(doc: PDFKit.PDFDocument, text: string, forecast = false): void {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (forecast) {
      const dateBlock = DATE_BLOCK.exec(trimmed);
      if (dateBlock) {
        const marker = `[${dateBlock[1]}]:`;
        doc.font(FB).fontSize(TYPE_SCALE_PT.body);
        const h = doc.heightOfString(trimmed, { width: CONTENT_W, lineGap: 3 });
        ensureSpace(doc, h + 10);
        doc.moveDown(0.2);
        const y = doc.y;
        doc
          .font(FB)
          .fontSize(TYPE_SCALE_PT.body)
          .fillColor(BRAND)
          .text(marker, MARGIN, y, { continued: dateBlock[2].length > 0, lineGap: 3 });
        if (dateBlock[2].length > 0) {
          doc.font(FB).fillColor(NAVY).text(` ${dateBlock[2]}`, { lineGap: 3 });
        }
        doc.x = MARGIN;
        doc.moveDown(0.25);
        continue;
      }
      const channel = CHANNEL_LINE.exec(trimmed);
      if (channel) {
        const indent = 16;
        doc.font(F).fontSize(TYPE_SCALE_PT.body);
        const h = doc.heightOfString(trimmed, { width: CONTENT_W - indent, lineGap: 3 });
        ensureSpace(doc, h + 6);
        const y = doc.y;
        doc
          .font(FB)
          .fontSize(TYPE_SCALE_PT.body)
          .fillColor(BRAND)
          .text(`${channel[1]}:`, MARGIN + indent, y, { continued: true, lineGap: 3 });
        doc.font(F).fillColor(TEXT).text(` ${channel[2]}`, { lineGap: 3 });
        doc.x = MARGIN;
        doc.moveDown(0.2);
        continue;
      }
      const sub = SUB_BULLET.exec(trimmed);
      if (sub) {
        const indent = 34;
        doc.font(F).fontSize(TYPE_SCALE_PT.body);
        const h = doc.heightOfString(sub[1], { width: CONTENT_W - indent, lineGap: 3 });
        ensureSpace(doc, h + 6);
        const y = doc.y;
        doc.font(FB).fontSize(TYPE_SCALE_PT.body).fillColor(MUTED).text("o", MARGIN + 20, y, {
          width: indent - 20,
          lineBreak: false,
        });
        doc.font(F).fontSize(TYPE_SCALE_PT.body).fillColor(TEXT).text(sub[1], MARGIN + indent, y, {
          width: CONTENT_W - indent,
          lineGap: 3,
        });
        doc.x = MARGIN;
        doc.moveDown(0.2);
        continue;
      }
      if (isCapsSubheading(trimmed)) {
        ensureSpace(doc, 30);
        doc.moveDown(0.3);
        doc
          .font(FB)
          .fontSize(TYPE_SCALE_PT.h2)
          .fillColor(NAVY)
          .text(trimmed, MARGIN, doc.y, { width: CONTENT_W, characterSpacing: 0.4 });
        doc.x = MARGIN;
        doc.moveDown(0.2);
        continue;
      }
    }
    const bullet = /^-\s+(.*)$/.exec(trimmed);
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      const markText = bullet ? "•" : `${numbered![1]}.`;
      const itemText = bullet ? bullet[1] : numbered![2];
      const indent = 16;
      doc.font(F).fontSize(TYPE_SCALE_PT.body);
      const h = doc.heightOfString(itemText, { width: CONTENT_W - indent, lineGap: 3 });
      ensureSpace(doc, h + 6);
      const y = doc.y;
      doc.font(FB).fontSize(TYPE_SCALE_PT.body).fillColor(BRAND).text(markText, MARGIN, y, {
        width: indent,
        lineBreak: false,
      });
      doc.font(F).fontSize(TYPE_SCALE_PT.body).fillColor(TEXT).text(itemText, MARGIN + indent, y, {
        width: CONTENT_W - indent,
        lineGap: 3,
      });
      doc.x = MARGIN;
      doc.moveDown(0.25);
      continue;
    }
    ensureSpace(doc, 40);
    doc.font(F).fontSize(TYPE_SCALE_PT.body).fillColor(TEXT).text(trimmed, MARGIN, doc.y, {
      width: CONTENT_W,
      lineGap: 3,
    });
    doc.moveDown(0.5);
  }
}

interface CellStyle {
  font: string;
  size: number;
  color: string;
}

function cellHeight(doc: PDFKit.PDFDocument, value: string, width: number, style: CellStyle): number {
  doc.font(style.font).fontSize(style.size);
  return doc.heightOfString(value, { width: width - CELL_PAD_H * 2 }) + CELL_PAD_V * 2;
}

function drawRow(
  doc: PDFKit.PDFDocument,
  y: number,
  values: string[],
  widths: number[],
  styles: CellStyle[],
  fill: string | null,
): number {
  const rowH = Math.max(
    18,
    ...values.map((v, i) => cellHeight(doc, v, widths[i], styles[i])),
  );
  if (fill) {
    doc.rect(MARGIN, y, CONTENT_W, rowH).fill(fill);
  }
  let x = MARGIN;
  values.forEach((value, i) => {
    doc
      .font(styles[i].font)
      .fontSize(styles[i].size)
      .fillColor(styles[i].color)
      .text(value, x + CELL_PAD_H, y + CELL_PAD_V, { width: widths[i] - CELL_PAD_H * 2 });
    x += widths[i];
  });
  return rowH;
}

// Branded table with real text wrapping: row heights are measured per cell,
// the navy header repeats after a page break, and zebra striping follows the
// theme. Column widths are deterministic weight allocations of the content
// width — a column can never collapse below its allocation.
function brandedTable(
  doc: PDFKit.PDFDocument,
  columns: string[],
  rows: string[][],
  weights: readonly number[],
  design: TemplateDesign,
): void {
  const widths = pdfColumnWidths(weights);
  const headerStyle = tableHeaderStyleOf(design);
  const headerStyles: CellStyle[] = columns.map(() => ({
    font: FB,
    size: TYPE_SCALE_PT.small,
    color: headerStyle.color,
  }));
  const rowStyles: CellStyle[] = columns.map((_, i) => ({
    font: i === 0 ? FB : F,
    size: TYPE_SCALE_PT.small,
    color: i === 0 ? NAVY : TEXT,
  }));

  const drawHeader = () => {
    const headerH = Math.max(
      20,
      ...columns.map((label, i) => cellHeight(doc, label, widths[i], headerStyles[i])),
    );
    ensureSpace(doc, headerH + 24);
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT_W, headerH).fill(headerStyle.fill);
    let x = MARGIN;
    columns.forEach((label, i) => {
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(headerStyle.color)
        .text(label, x + CELL_PAD_H, y + CELL_PAD_V, { width: widths[i] - CELL_PAD_H * 2 });
      x += widths[i];
    });
    doc.y = y + headerH;
  };

  drawHeader();
  let zebra = false;
  for (const row of rows) {
    const rowH = Math.max(
      18,
      ...row.map((v, i) => cellHeight(doc, v, widths[i], rowStyles[i])),
    );
    if (doc.y + rowH > doc.page.height - MARGIN - 24) {
      doc.addPage();
      doc.y = MARGIN;
      drawHeader();
      zebra = false;
    }
    const y = doc.y;
    drawRow(doc, y, row, widths, rowStyles, zebra ? ZEBRA : null);
    zebra = !zebra;
    doc
      .moveTo(MARGIN, y + rowH)
      .lineTo(MARGIN + CONTENT_W, y + rowH)
      .strokeColor(DIVIDER)
      .lineWidth(0.5)
      .stroke();
    doc.y = y + rowH;
  }
  doc.y += 10;
  doc.x = MARGIN;
}

export async function renderPdf(model: ExportDocumentModel): Promise<Buffer> {
  // A visual deck is slide-shaped content — its .pdf export is the slide-page
  // renderer (960x540pt pages over the shared slide model), not the A4
  // document layout. Delegating keeps download and preview byte-identical.
  if (model.visualSlides.length > 0) {
    return renderPptxPreviewPdf(model);
  }
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  doc.registerFont(F, brandFontPath("regular"));
  doc.registerFont(FB, brandFontPath("bold"));
  doc.registerFont(FM, brandFontPath("medium"));
  doc.registerFont(FI, brandFontPath("italic"));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // ---- Cover page — layout variant chosen by the template design spec.
  const design = model.template.design;
  const accent = accentOf(design);
  const pw = doc.page.width;
  const ph = doc.page.height;
  const generatedLine = `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} · Hub SSoT governed output · every figure cited`;

  switch (design.coverStyle) {
    case "brand-full": {
      doc.rect(0, 0, pw, ph).fill(BRAND);
      doc.rect(0, ph - 250, pw, 250).fill(NAVY);
      doc.image(brandMarkPng(160, THEME_COLORS.inverse), MARGIN, 88, { width: 40 });
      doc.font(FB).fontSize(19).fillColor(THEME_COLORS.inverse).text("Telefónica", MARGIN + 52, 98);
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.coverTitle + 2)
        .fillColor(THEME_COLORS.inverse)
        .text(model.title, MARGIN, 290, { width: CONTENT_W, lineGap: 4 });
      doc.rect(MARGIN, ph - 222, 120, 2).fill(THEME_COLORS.inverse);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.coverSubtitle)
        .fillColor(THEME_COLORS.inverseSecondary)
        .text(model.subtitle, MARGIN, ph - 198, { width: CONTENT_W });
      doc
        .font(F)
        .fontSize(TYPE_SCALE_PT.coverMeta)
        .fillColor(THEME_COLORS.inverseTertiary)
        .text(generatedLine, MARGIN, ph - 172, { width: CONTENT_W });
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(THEME_COLORS.inverseTertiary)
        .text(model.confidentiality.toUpperCase(), MARGIN, ph - 72, { width: CONTENT_W });
      break;
    }
    case "brand-band": {
      doc.rect(0, 0, pw, ph).fill(THEME_COLORS.background);
      doc.image(brandMarkPng(160, BRAND), MARGIN, 72, { width: 36 });
      doc.font(FB).fontSize(17).fillColor(NAVY).text("Telefónica", MARGIN + 48, 82);
      doc.rect(0, 200, pw, 230).fill(BRAND);
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.coverTitle)
        .fillColor(THEME_COLORS.inverse)
        .text(model.title, MARGIN, 250, { width: CONTENT_W, lineGap: 4 });
      doc.moveDown(0.5);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.coverSubtitle)
        .fillColor(THEME_COLORS.inverseSecondary)
        .text(model.subtitle, { width: CONTENT_W });
      doc
        .font(F)
        .fontSize(TYPE_SCALE_PT.coverMeta)
        .fillColor(MUTED)
        .text(generatedLine, MARGIN, 470, { width: CONTENT_W });
      doc
        .moveTo(MARGIN, ph - 88)
        .lineTo(pw - MARGIN, ph - 88)
        .strokeColor(DIVIDER)
        .lineWidth(1)
        .stroke();
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(MUTED)
        .text(`${design.footerLabel} · ${model.confidentiality.toUpperCase()}`, MARGIN, ph - 72, {
          width: CONTENT_W,
        });
      break;
    }
    case "masthead": {
      doc.rect(0, 0, pw, ph).fill(THEME_COLORS.background);
      doc.rect(MARGIN, 64, CONTENT_W, 4).fill(NAVY);
      doc
        .moveTo(MARGIN, 76)
        .lineTo(pw - MARGIN, 76)
        .strokeColor(NAVY)
        .lineWidth(1)
        .stroke();
      doc.image(brandMarkPng(160, NAVY), MARGIN, 96, { width: 30 });
      doc.font(FB).fontSize(21).fillColor(NAVY).text("Telefónica", MARGIN + 42, 104);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(MUTED)
        .text(model.template.name.toUpperCase(), MARGIN, 112, {
          width: CONTENT_W,
          align: "right",
        });
      doc
        .moveTo(MARGIN, 148)
        .lineTo(pw - MARGIN, 148)
        .strokeColor(DIVIDER)
        .lineWidth(1)
        .stroke();
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.coverTitle - 2)
        .fillColor(NAVY)
        .text(model.title, MARGIN, 220, { width: CONTENT_W, lineGap: 4 });
      doc.moveDown(0.6);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.coverSubtitle)
        .fillColor(MUTED)
        .text(model.subtitle, { width: CONTENT_W });
      doc.moveDown(0.8);
      const ruleY = doc.y;
      doc.rect(MARGIN, ruleY, 140, 2).fill(NAVY);
      doc
        .font(F)
        .fontSize(TYPE_SCALE_PT.coverMeta)
        .fillColor(MUTED)
        .text(generatedLine, MARGIN, ruleY + 16, { width: CONTENT_W });
      doc
        .moveTo(MARGIN, ph - 88)
        .lineTo(pw - MARGIN, ph - 88)
        .strokeColor(NAVY)
        .lineWidth(1)
        .stroke();
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(MUTED)
        .text(`${design.footerLabel} · ${model.confidentiality.toUpperCase()}`, MARGIN, ph - 72, {
          width: CONTENT_W,
        });
      break;
    }
    case "split": {
      const panelW = 200;
      doc.rect(0, 0, pw, ph).fill(THEME_COLORS.background);
      doc.rect(0, 0, panelW, ph).fill(NAVY);
      doc.rect(panelW, 0, 5, ph).fill(BRAND);
      doc.image(brandMarkPng(160, BRAND), 40, 88, { width: 36 });
      doc.font(FB).fontSize(16).fillColor(THEME_COLORS.inverse).text("Telefónica", 40, 146);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.footer)
        .fillColor(THEME_COLORS.inverseTertiary)
        .text(model.confidentiality.toUpperCase(), 40, ph - 88, { width: panelW - 80 });
      const colX = panelW + 48;
      const colW = pw - colX - MARGIN;
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.coverTitle - 4)
        .fillColor(NAVY)
        .text(model.title, colX, 320, { width: colW, lineGap: 4 });
      doc.moveDown(0.6);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.coverSubtitle)
        .fillColor(MUTED)
        .text(model.subtitle, { width: colW });
      doc
        .font(F)
        .fontSize(TYPE_SCALE_PT.coverMeta)
        .fillColor(MUTED)
        .text(generatedLine, colX, ph - 88, { width: colW });
      break;
    }
    case "minimal": {
      doc.rect(0, 0, pw, ph).fill(THEME_COLORS.background);
      doc.image(brandMarkPng(320, BRAND), pw / 2 - 52, 200, { width: 104 });
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.coverTitle - 4)
        .fillColor(NAVY)
        .text(model.title, MARGIN, 380, { width: CONTENT_W, align: "center", lineGap: 4 });
      doc.moveDown(0.6);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.coverSubtitle)
        .fillColor(MUTED)
        .text(model.subtitle, { width: CONTENT_W, align: "center" });
      doc.rect(pw / 2 - 60, ph - 132, 120, 2).fill(BRAND);
      doc
        .font(F)
        .fontSize(TYPE_SCALE_PT.coverMeta)
        .fillColor(MUTED)
        .text(generatedLine, MARGIN, ph - 108, { width: CONTENT_W, align: "center" });
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(MUTED)
        .text(model.confidentiality.toUpperCase(), MARGIN, ph - 72, {
          width: CONTENT_W,
          align: "center",
        });
      break;
    }
    default: {
      // navy-full
      doc.rect(0, 0, pw, ph).fill(NAVY);
      doc.rect(0, 0, 10, ph).fill(BRAND);
      doc.image(brandMarkPng(160, BRAND), MARGIN, 88, { width: 40 });
      doc.font(FB).fontSize(19).fillColor(THEME_COLORS.inverse).text("Telefónica", MARGIN + 52, 98);
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.coverTitle + 2)
        .fillColor(THEME_COLORS.inverse)
        .text(model.title, MARGIN, 300, { width: CONTENT_W, lineGap: 4 });
      doc.moveDown(0.5);
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.coverSubtitle)
        .fillColor(THEME_COLORS.inverseSecondary)
        .text(model.subtitle, { width: CONTENT_W });
      doc.moveDown(0.4);
      doc
        .font(F)
        .fontSize(TYPE_SCALE_PT.coverMeta)
        .fillColor(THEME_COLORS.inverseTertiary)
        .text(generatedLine, { width: CONTENT_W });
      doc
        .font(FM)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(THEME_COLORS.inverseTertiary)
        .text(model.confidentiality.toUpperCase(), MARGIN, ph - 72, { width: CONTENT_W });
      break;
    }
  }

  doc.addPage();
  doc.rect(0, 0, pw, 8).fill(accent);
  doc.y = 72;
  doc.x = MARGIN;

  if (model.umbrella) {
    heading(doc, "Umbrella message", design);
    doc.font(FB).fontSize(TYPE_SCALE_PT.h2);
    const umbH = doc.heightOfString(model.umbrella, { width: CONTENT_W - 24, lineGap: 3 });
    ensureSpace(doc, umbH + 20);
    const y = doc.y;
    doc
      .rect(MARGIN, y, CONTENT_W, umbH + 16)
      .fill(design.accent === "navy" ? ZEBRA : THEME_COLORS.brandLow);
    doc.rect(MARGIN, y, 3, umbH + 16).fill(accent);
    doc
      .font(FB)
      .fontSize(TYPE_SCALE_PT.h2)
      .fillColor(NAVY)
      .text(model.umbrella, MARGIN + 12, y + 8, { width: CONTENT_W - 24, lineGap: 3 });
    doc.y = y + umbH + 16;
    doc.x = MARGIN;
    doc.moveDown(0.5);
  }

  // The raw Q&A section is skipped when the structured Q&A block is present —
  // it is rendered as styled Q/A pairs with provenance below, never as an
  // unformatted text blob.
  for (const section of model.sections) {
    if (section.isQa && model.qa.length > 0) continue;
    heading(doc, section.heading, design);
    if (section.internalOnly) {
      doc
        .font(FI)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(MUTED)
        .text("Internal only — not for external distribution.", MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.3);
    }
    bodyText(doc, section.body, design.sectionIcons === true);
  }

  // Structured Q&A block: styled question, answer, provenance and (internal
  // exports only) the internal note.
  if (model.qa.length > 0) {
    heading(doc, model.qaHeading ?? "Q&A", design);
    for (const item of model.qa) {
      ensureSpace(doc, 70);
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.h2)
        .fillColor(NAVY)
        .text(`Q: ${item.question}`, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.2);
      bodyText(doc, item.answer);
      doc
        .font(FI)
        .fontSize(TYPE_SCALE_PT.caption)
        .fillColor(MUTED)
        .text(
          item.provenance.length > 0
            ? `Sources: ${item.provenance
                .map((p) => [p.docTitle, p.version, p.owner].filter(Boolean).join(" · "))
                .join(" | ")}`
            : "Not covered by approved material — no governed source backs this answer.",
          MARGIN,
          doc.y,
          { width: CONTENT_W },
        );
      if (item.note) {
        doc.moveDown(0.2);
        doc.font(FI).fontSize(TYPE_SCALE_PT.caption);
        const noteText = `Internal note — not exportable externally: ${item.note}`;
        const noteH = doc.heightOfString(noteText, { width: CONTENT_W - 16 });
        ensureSpace(doc, noteH + 12);
        const ny = doc.y;
        doc.rect(MARGIN, ny, CONTENT_W, noteH + 8).fill(THEME_COLORS.warningLow);
        doc
          .font(FI)
          .fontSize(TYPE_SCALE_PT.caption)
          .fillColor(THEME_COLORS.warningHigh)
          .text(noteText, MARGIN + 8, ny + 4, { width: CONTENT_W - 16 });
        doc.y = ny + noteH + 8;
        doc.x = MARGIN;
      }
      doc.moveDown(0.6);
    }
  }

  for (const chart of model.charts) {
    const imgW = CONTENT_W;
    const imgH = (imgW * chart.height) / chart.width;
    ensureSpace(doc, imgH + 20);
    doc.image(chart.png, MARGIN, doc.y, { width: imgW });
    doc.y += imgH + 12;
  }

  for (const table of model.tables) {
    heading(doc, table.title, design);
    doc
      .font(F)
      .fontSize(TYPE_SCALE_PT.small)
      .fillColor(MUTED)
      .text(
        `Source: ${table.source}${table.citationId ? ` · cited [${table.citationId}]` : ""}`,
        MARGIN,
        doc.y,
        { width: CONTENT_W },
      );
    doc.moveDown(0.4);
    brandedTable(doc, table.columns, table.rows, dataTableWeights(table.columns.length), design);
  }

  if (model.spokesperson.length > 0) {
    heading(doc, "Spokesperson guidance (internal only)", design);
    for (const note of model.spokesperson) {
      ensureSpace(doc, 60);
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.body)
        .fillColor(TEXT)
        .text(`Q: ${note.question}`, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.2);
      bodyText(doc, note.guidance);
      if (note.doNotSay) {
        doc
          .font(FI)
          .fontSize(TYPE_SCALE_PT.small)
          .fillColor(THEME_COLORS.warningHigh)
          .text(`Do not say: ${note.doNotSay}`, MARGIN, doc.y, { width: CONTENT_W });
        doc.moveDown(0.5);
      }
    }
  }

  if (model.citations.length > 0) {
    heading(doc, "Evidence and citations", design);
    brandedTable(
      doc,
      ["Ref", "Source", "Location", "Owner"],
      model.citations.map((c) => [
        c.id,
        `${c.docTitle} (v${c.version})`,
        c.sourceLoc,
        `${c.owner} · ${c.confidentiality}`,
      ]),
      CITATION_TABLE_WEIGHTS,
      design,
    );
  }

  if (model.disclaimers.length > 0) {
    heading(doc, "Disclaimers", design);
    for (const d of model.disclaimers) {
      ensureSpace(doc, 36);
      doc
        .font(F)
        .fontSize(TYPE_SCALE_PT.caption)
        .fillColor(MUTED)
        .text(`${d.name}: ${d.text}`, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
      doc.moveDown(0.4);
    }
  }

  // Footer on every content page (the cover stays clean). The footer sits
  // below the page's bottom margin, so the margin must be zeroed per page
  // before writing — otherwise pdfkit auto-paginates and spawns a blank page
  // per footer.
  const range = doc.bufferedPageRange();
  const classification = classificationLabel(model.confidentiality);
  // Dark cover variants need an inverse footer so the strip stays legible.
  const darkCover =
    design.coverStyle === "navy-full" ||
    design.coverStyle === "brand-full" ||
    design.coverStyle === "split";
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    const isCover = i === range.start;
    const color = isCover && darkCover ? THEME_COLORS.inverseTertiary : MUTED;
    doc
      .font(FM)
      .fontSize(TYPE_SCALE_PT.footer)
      .fillColor(color)
      .text(classification, MARGIN, doc.page.height - 40, {
        width: CONTENT_W,
        align: "center",
        lineBreak: false,
        characterSpacing: 0.6,
      });
    doc
      .font(F)
      .fontSize(TYPE_SCALE_PT.footer)
      .fillColor(color)
      .text(
        `Telefónica · ${design.footerLabel} · page ${i + 1} of ${range.count}`,
        MARGIN,
        doc.page.height - 30,
        { width: CONTENT_W, align: "center", lineBreak: false },
      );
  }

  doc.end();
  return done;
}
