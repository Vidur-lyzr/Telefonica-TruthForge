// .pdf renderer — Telefónica corporate PDF: brand-blue cover, styled headings,
// cited body, embedded charts and a citation table, drawn with pdfkit. Colours
// come from the shared export palette.

import PDFDocument from "pdfkit";
import type { ExportDocumentModel } from "../exportService";
import { EXPORT_PALETTE } from "../chartEngine";

const BRAND = EXPORT_PALETTE.brand;
const NAVY = EXPORT_PALETTE.navy;
const TEXT = EXPORT_PALETTE.textPrimary;
const MUTED = EXPORT_PALETTE.textSecondary;
const DIVIDER = EXPORT_PALETTE.divider;

const MARGIN = 56;
const CONTENT_W = 595.28 - MARGIN * 2; // A4 width in points

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - MARGIN - 24) {
    doc.addPage();
  }
}

function heading(doc: PDFKit.PDFDocument, text: string): void {
  ensureSpace(doc, 60);
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(15).fillColor(NAVY).text(text, { width: CONTENT_W });
  doc.moveDown(0.4);
}

function bodyText(doc: PDFKit.PDFDocument, text: string): void {
  for (const para of text.split("\n").filter((p) => p.trim().length > 0)) {
    ensureSpace(doc, 40);
    doc.font("Helvetica").fontSize(10.5).fillColor(TEXT).text(para, {
      width: CONTENT_W,
      lineGap: 3,
    });
    doc.moveDown(0.5);
  }
}

export async function renderPdf(model: ExportDocumentModel): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Cover
  doc.rect(0, 0, doc.page.width, 8).fill(BRAND);
  doc.y = 96;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND).text("Telefónica", MARGIN, doc.y);
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(28).fillColor(NAVY).text(model.title, { width: CONTENT_W });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11).fillColor(MUTED).text(model.subtitle, { width: CONTENT_W });
  doc.moveDown(0.2);
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(MUTED)
    .text(
      `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })} · Hub SSoT governed output · every figure cited`,
      { width: CONTENT_W },
    );
  doc.moveDown(0.8);
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(doc.page.width - MARGIN, doc.y)
    .strokeColor(DIVIDER)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);

  if (model.umbrella) {
    heading(doc, "Umbrella message");
    doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND).text(model.umbrella, {
      width: CONTENT_W,
      lineGap: 3,
    });
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
        .font("Helvetica-Oblique")
        .fontSize(9)
        .fillColor(MUTED)
        .text("Internal only — not for external distribution.", { width: CONTENT_W });
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
      doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(`Q: ${item.question}`, {
        width: CONTENT_W,
      });
      doc.moveDown(0.2);
      bodyText(doc, item.answer);
      doc
        .font("Helvetica-Oblique")
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(
          item.provenance.length > 0
            ? `Sources: ${item.provenance
                .map((p) => [p.docTitle, p.version, p.owner].filter(Boolean).join(" · "))
                .join(" | ")}`
            : "Not covered by approved material — no governed source backs this answer.",
          { width: CONTENT_W },
        );
      if (item.note) {
        doc.moveDown(0.2);
        doc
          .font("Helvetica-Oblique")
          .fontSize(8.5)
          .fillColor(MUTED)
          .text(`Internal note — not exportable externally: ${item.note}`, { width: CONTENT_W });
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
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `Source: ${table.source}${table.citationId ? ` · cited [${table.citationId}]` : ""}`,
        { width: CONTENT_W },
      );
    doc.moveDown(0.4);
    const colW = CONTENT_W / table.columns.length;
    const rowH = 20;
    // Header row
    ensureSpace(doc, rowH * 2);
    let y = doc.y;
    doc.rect(MARGIN, y, CONTENT_W, rowH).fill(NAVY);
    table.columns.forEach((label, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text(label, MARGIN + i * colW + 6, y + 6, { width: colW - 12, lineBreak: false });
    });
    y += rowH;
    for (const row of table.rows) {
      if (y + rowH > doc.page.height - MARGIN - 24) {
        doc.addPage();
        y = doc.y;
      }
      row.forEach((value, i) => {
        doc
          .font(i === 0 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9)
          .fillColor(i === 0 ? NAVY : TEXT)
          .text(value, MARGIN + i * colW + 6, y + 6, { width: colW - 12, lineBreak: false });
      });
      doc
        .moveTo(MARGIN, y + rowH)
        .lineTo(MARGIN + CONTENT_W, y + rowH)
        .strokeColor(DIVIDER)
        .lineWidth(0.5)
        .stroke();
      y += rowH;
    }
    doc.y = y + 10;
    doc.x = MARGIN;
  }

  if (model.spokesperson.length > 0) {
    heading(doc, "Spokesperson guidance (internal only)");
    for (const note of model.spokesperson) {
      ensureSpace(doc, 60);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXT).text(`Q: ${note.question}`, {
        width: CONTENT_W,
      });
      doc.moveDown(0.2);
      bodyText(doc, note.guidance);
      if (note.doNotSay) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(9.5)
          .fillColor(MUTED)
          .text(`Do not say: ${note.doNotSay}`, { width: CONTENT_W });
        doc.moveDown(0.5);
      }
    }
  }

  if (model.citations.length > 0) {
    heading(doc, "Evidence and citations");
    for (const c of model.citations) {
      ensureSpace(doc, 44);
      const y0 = doc.y;
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(BRAND).text(c.id, MARGIN, y0, { width: 36 });
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(TEXT)
        .text(`${c.docTitle} (v${c.version})`, MARGIN + 44, y0, { width: CONTENT_W - 44 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(MUTED)
        .text(`${c.sourceLoc} · ${c.owner} · ${c.confidentiality}`, MARGIN + 44, doc.y, {
          width: CONTENT_W - 44,
        });
      doc.moveDown(0.6);
      doc.x = MARGIN;
    }
  }

  if (model.disclaimers.length > 0) {
    heading(doc, "Disclaimers");
    for (const d of model.disclaimers) {
      ensureSpace(doc, 36);
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(`${d.name}: ${d.text}`, { width: CONTENT_W, lineGap: 2 });
      doc.moveDown(0.4);
    }
  }

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
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
