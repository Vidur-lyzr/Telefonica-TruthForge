// .pdf renderer — Telefónica corporate PDF: full-page brand cover with the
// five-dot mark, embedded Hanken Grotesk (the open face closest to Telefónica
// Sans), styled headings, cited body, embedded charts, branded tables and a
// citation table, drawn with pdfkit. Colours come from the shared palette.

import PDFDocument from "pdfkit";
import type { ExportDocumentModel } from "../exportService";
import { EXPORT_PALETTE } from "../chartEngine";
import { brandFontPath, brandMarkPng } from "../brandAssets";

const BRAND = EXPORT_PALETTE.brand;
const NAVY = EXPORT_PALETTE.navy;
const TEXT = EXPORT_PALETTE.textPrimary;
const MUTED = EXPORT_PALETTE.textSecondary;
const DIVIDER = EXPORT_PALETTE.divider;

const MARGIN = 56;
const CONTENT_W = 595.28 - MARGIN * 2; // A4 width in points

// Registered font names — Hanken Grotesk, embedded from local TTFs.
const F = "Brand";
const FB = "Brand-Bold";
const FM = "Brand-Medium";
const FI = "Brand-Italic";

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - MARGIN - 24) {
    doc.addPage();
  }
}

function heading(doc: PDFKit.PDFDocument, text: string): void {
  ensureSpace(doc, 60);
  doc.moveDown(1);
  const y = doc.y;
  doc.rect(MARGIN, y + 2, 3, 14).fill(BRAND);
  doc.font(FB).fontSize(15).fillColor(NAVY).text(text, MARGIN + 12, y, { width: CONTENT_W - 12 });
  doc.x = MARGIN;
  doc.moveDown(0.4);
}

function bodyText(doc: PDFKit.PDFDocument, text: string): void {
  for (const para of text.split("\n").filter((p) => p.trim().length > 0)) {
    ensureSpace(doc, 40);
    doc.font(F).fontSize(10.5).fillColor(TEXT).text(para, MARGIN, doc.y, {
      width: CONTENT_W,
      lineGap: 3,
    });
    doc.moveDown(0.5);
  }
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
  doc.font(FB).fontSize(19).fillColor("#FFFFFF").text("Telefónica", MARGIN + 52, 98);
  doc
    .font(FB)
    .fontSize(30)
    .fillColor("#FFFFFF")
    .text(model.title, MARGIN, 300, { width: CONTENT_W, lineGap: 4 });
  doc.moveDown(0.5);
  doc.font(FM).fontSize(12).fillColor("#C7D6F0").text(model.subtitle, { width: CONTENT_W });
  doc.moveDown(0.4);
  doc
    .font(F)
    .fontSize(10)
    .fillColor("#8FA6C9")
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
    .fontSize(9)
    .fillColor("#8FA6C9")
    .text(model.confidentiality.toUpperCase(), MARGIN, ph - 72, { width: CONTENT_W });

  doc.addPage();
  doc.rect(0, 0, pw, 8).fill(BRAND);
  doc.y = 72;
  doc.x = MARGIN;

  if (model.umbrella) {
    heading(doc, "Umbrella message");
    doc.font(FB).fontSize(13).fillColor(BRAND).text(model.umbrella, MARGIN, doc.y, {
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
        .font(FI)
        .fontSize(9)
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
      doc.font(FB).fontSize(11).fillColor(NAVY).text(`Q: ${item.question}`, MARGIN, doc.y, {
        width: CONTENT_W,
      });
      doc.moveDown(0.2);
      bodyText(doc, item.answer);
      doc
        .font(FI)
        .fontSize(8.5)
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
        doc
          .font(FI)
          .fontSize(8.5)
          .fillColor(MUTED)
          .text(`Internal note — not exportable externally: ${item.note}`, MARGIN, doc.y, {
            width: CONTENT_W,
          });
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
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `Source: ${table.source}${table.citationId ? ` · cited [${table.citationId}]` : ""}`,
        MARGIN,
        doc.y,
        { width: CONTENT_W },
      );
    doc.moveDown(0.4);
    const colW = CONTENT_W / table.columns.length;
    const rowH = 20;
    // Header row — brand blue, on-brand with the corporate table style.
    ensureSpace(doc, rowH * 2);
    let y = doc.y;
    doc.rect(MARGIN, y, CONTENT_W, rowH).fill(BRAND);
    table.columns.forEach((label, i) => {
      doc
        .font(FB)
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text(label, MARGIN + i * colW + 6, y + 6, { width: colW - 12, lineBreak: false });
    });
    y += rowH;
    let zebra = false;
    for (const row of table.rows) {
      if (y + rowH > doc.page.height - MARGIN - 24) {
        doc.addPage();
        y = doc.y;
      }
      if (zebra) {
        doc.rect(MARGIN, y, CONTENT_W, rowH).fill(EXPORT_PALETTE.backgroundAlt);
      }
      zebra = !zebra;
      row.forEach((value, i) => {
        doc
          .font(i === 0 ? FB : F)
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
      doc.font(FB).fontSize(10.5).fillColor(TEXT).text(`Q: ${note.question}`, MARGIN, doc.y, {
        width: CONTENT_W,
      });
      doc.moveDown(0.2);
      bodyText(doc, note.guidance);
      if (note.doNotSay) {
        doc
          .font(FI)
          .fontSize(9.5)
          .fillColor(MUTED)
          .text(`Do not say: ${note.doNotSay}`, MARGIN, doc.y, { width: CONTENT_W });
        doc.moveDown(0.5);
      }
    }
  }

  if (model.citations.length > 0) {
    heading(doc, "Evidence and citations");
    for (const c of model.citations) {
      ensureSpace(doc, 44);
      const y0 = doc.y;
      doc.font(FB).fontSize(9.5).fillColor(BRAND).text(c.id, MARGIN, y0, { width: 36 });
      doc
        .font(FB)
        .fontSize(9.5)
        .fillColor(TEXT)
        .text(`${c.docTitle} (v${c.version})`, MARGIN + 44, y0, { width: CONTENT_W - 44 });
      doc
        .font(F)
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
        .font(F)
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(`${d.name}: ${d.text}`, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
      doc.moveDown(0.4);
    }
  }

  // Footer on every content page (the cover stays clean).
  const range = doc.bufferedPageRange();
  for (let i = range.start + 1; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font(F)
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
