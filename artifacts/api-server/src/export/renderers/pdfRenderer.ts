// .pdf renderer — Telefónica corporate PDF driven entirely by the
// deterministic export theme (exportTheme.ts): full-page brand cover with the
// five-dot mark, embedded Hanken Grotesk (the open face closest to Telefónica
// Sans), styled headings, cited body with bullet support, embedded charts and
// real wrapped-cell tables (measured row heights, repeated headers across page
// breaks — never truncated, never one-character columns).

import PDFDocument from "pdfkit";
import type { ExportDocumentModel } from "../exportService";
import { brandFontPath, brandMarkPng } from "../brandAssets";
import {
  THEME_COLORS,
  TYPE_SCALE_PT,
  PDF_PAGE,
  pdfColumnWidths,
  dataTableWeights,
  CITATION_TABLE_WEIGHTS,
} from "../exportTheme";

const BRAND = THEME_COLORS.brand;
const NAVY = THEME_COLORS.navy;
const TEXT = THEME_COLORS.textPrimary;
const MUTED = THEME_COLORS.textSecondary;
const DIVIDER = THEME_COLORS.divider;
const ZEBRA = THEME_COLORS.backgroundAlt;

const MARGIN = PDF_PAGE.margin;
const CONTENT_W = PDF_PAGE.contentWidth;

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

function heading(doc: PDFKit.PDFDocument, text: string): void {
  ensureSpace(doc, 60);
  doc.moveDown(1);
  const y = doc.y;
  doc.rect(MARGIN, y + 2, 3, 14).fill(BRAND);
  doc
    .font(FB)
    .fontSize(TYPE_SCALE_PT.h1)
    .fillColor(NAVY)
    .text(text, MARGIN + 12, y, { width: CONTENT_W - 12 });
  doc.x = MARGIN;
  doc.moveDown(0.4);
}

// Body copy with bullet support: "- " lines render as brand-blue bullets with
// a hanging indent; "N. " lines as numbered items; everything else wraps as a
// justified-left paragraph at the themed body size and line height.
function bodyText(doc: PDFKit.PDFDocument, text: string): void {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
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
): void {
  const widths = pdfColumnWidths(weights);
  const headerStyles: CellStyle[] = columns.map(() => ({
    font: FB,
    size: TYPE_SCALE_PT.small,
    color: THEME_COLORS.inverse,
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
    doc.rect(MARGIN, y, CONTENT_W, headerH).fill(NAVY);
    let x = MARGIN;
    columns.forEach((label, i) => {
      doc
        .font(FB)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(THEME_COLORS.inverse)
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

  // ---- Branded cover page: full navy page, five-dot mark, wordmark, title.
  const pw = doc.page.width;
  const ph = doc.page.height;
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
    .text(
      `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })} · Hub SSoT governed output · every figure cited`,
      { width: CONTENT_W },
    );
  doc
    .font(FM)
    .fontSize(TYPE_SCALE_PT.small)
    .fillColor(THEME_COLORS.inverseTertiary)
    .text(model.confidentiality.toUpperCase(), MARGIN, ph - 72, { width: CONTENT_W });

  doc.addPage();
  doc.rect(0, 0, pw, 8).fill(BRAND);
  doc.y = 72;
  doc.x = MARGIN;

  if (model.umbrella) {
    heading(doc, "Umbrella message");
    doc.font(FB).fontSize(TYPE_SCALE_PT.h2);
    const umbH = doc.heightOfString(model.umbrella, { width: CONTENT_W - 24, lineGap: 3 });
    ensureSpace(doc, umbH + 20);
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT_W, umbH + 16).fill(THEME_COLORS.brandLow);
    doc.rect(MARGIN, y, 3, umbH + 16).fill(BRAND);
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
    heading(doc, section.heading);
    if (section.internalOnly) {
      doc
        .font(FI)
        .fontSize(TYPE_SCALE_PT.small)
        .fillColor(MUTED)
        .text("Internal only — not for external distribution.", MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.3);
    }
    bodyText(doc, section.body);
  }

  // Structured Q&A block: styled question, answer, provenance and (internal
  // exports only) the internal note.
  if (model.qa.length > 0) {
    heading(doc, model.qaHeading ?? "Q&A");
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
    heading(doc, table.title);
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
    brandedTable(doc, table.columns, table.rows, dataTableWeights(table.columns.length));
  }

  if (model.spokesperson.length > 0) {
    heading(doc, "Spokesperson guidance (internal only)");
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
    heading(doc, "Evidence and citations");
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
    );
  }

  if (model.disclaimers.length > 0) {
    heading(doc, "Disclaimers");
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
  for (let i = range.start + 1; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc
      .font(F)
      .fontSize(TYPE_SCALE_PT.footer)
      .fillColor(MUTED)
      .text(
        `Telefónica — Hub SSoT governed export · ${model.confidentiality} · page ${i + 1} of ${range.count}`,
        MARGIN,
        doc.page.height - 40,
        { width: CONTENT_W, align: "center", lineBreak: false },
      );
  }

  doc.end();
  return done;
}
