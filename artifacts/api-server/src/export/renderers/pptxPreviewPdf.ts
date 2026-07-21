// WYSIWYG preview of the .pptx export, rendered as a PDF whose pages are
// exact 13.33in x 7.5in slides (1in = 72pt). It iterates the SAME shared
// slide model as the real pptx renderer (slideModel.ts) and mirrors every
// coordinate of pptxRenderer.ts multiplied by 72 — so the preview shows the
// same slides, in the same order, with the same layout, colours and type
// scale as the deck a download produces. Unlike the .pptx itself (pptxgenjs
// cannot embed fonts), the preview embeds Hanken Grotesk, i.e. it shows the
// deck as it looks on a machine with the brand font installed.

import PDFDocument from "pdfkit";
import type { ExportDocumentModel } from "../exportService";
import type { TemplateDesign } from "../exportTemplates";
import { THEME_COLORS } from "../exportTheme";
import { brandFontPath, brandMarkPng } from "../brandAssets";
import { iconPng } from "../iconSet";
import { backgroundPng } from "../backgroundArt";
import { buildSlides } from "../slideModel";
import type { VisualSlideModel } from "../visualLayouts";

const BRAND = THEME_COLORS.brand;
const NAVY = THEME_COLORS.navy;
const TEXT = THEME_COLORS.textPrimary;
const MUTED = THEME_COLORS.textSecondary;
const DIVIDER = THEME_COLORS.divider;
const ZEBRA = THEME_COLORS.backgroundAlt;
const INVERSE = THEME_COLORS.inverse;
const INV_SEC = THEME_COLORS.inverseSecondary;
const INV_TER = THEME_COLORS.inverseTertiary;

const IN = 72;
const SLIDE_W = 13.33 * IN;
const SLIDE_H = 7.5 * IN;

const F = "Brand";
const FB = "Brand-Bold";
const FI = "Brand-Italic";

function accentOf(design: TemplateDesign): string {
  return design.accent === "navy" ? NAVY : BRAND;
}

function tableHeaderStyleOf(design: TemplateDesign): { fill: string; color: string } {
  switch (design.tableHeader) {
    case "brand":
      return { fill: BRAND, color: INVERSE };
    case "light":
      return { fill: ZEBRA, color: NAVY };
    default:
      return { fill: NAVY, color: INVERSE };
  }
}

// Mirrors a pptxgenjs addText box. Coordinates are in INCHES exactly as the
// pptx renderer passes them; valign defaults to middle like pptxgenjs.
function textBox(
  doc: PDFKit.PDFDocument,
  text: string,
  o: {
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
    lineSpacingMultiple?: number;
    charSpacing?: number;
    fill?: string;
  },
): void {
  const x = o.x * IN;
  const y = o.y * IN;
  const w = o.w * IN;
  const h = o.h * IN;
  const font = o.bold ? FB : o.italic ? FI : F;
  const lineGap = o.lineSpacingMultiple ? o.size * (o.lineSpacingMultiple - 1) : 0;
  if (o.fill) {
    doc.rect(x, y, w, h).fill(o.fill);
  }
  doc.font(font).fontSize(o.size);
  const th = doc.heightOfString(text, {
    width: w,
    lineGap,
    characterSpacing: o.charSpacing ?? 0,
  });
  const ty = o.valign === "top" ? y : y + Math.max(0, (h - th) / 2);
  doc.fillColor(o.color).text(text, x, ty, {
    width: w,
    align: o.align ?? "left",
    lineGap,
    characterSpacing: o.charSpacing ?? 0,
  });
}

function rect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, fill: string): void {
  doc.rect(x * IN, y * IN, w * IN, h * IN).fill(fill);
}

function hline(doc: PDFKit.PDFDocument, x: number, y: number, w: number, color: string, pt: number): void {
  doc
    .moveTo(x * IN, y * IN)
    .lineTo((x + w) * IN, y * IN)
    .strokeColor(color)
    .lineWidth(pt)
    .stroke();
}

function mark(doc: PDFKit.PDFDocument, color: string, x: number, y: number, w: number, h: number): void {
  doc.image(brandMarkPng(320, color), x * IN, y * IN, { width: w * IN, height: h * IN });
}

function addFooter(doc: PDFKit.PDFDocument, model: ExportDocumentModel, design: TemplateDesign): void {
  textBox(doc, `Telefónica · ${design.footerLabel}`, {
    x: 0.4, y: 6.9, w: 8, h: 0.3, size: 9, color: MUTED,
  });
  textBox(doc, model.confidentiality, {
    x: 10.4, y: 6.9, w: 2.4, h: 0.3, size: 9, color: MUTED, align: "right",
  });
}

// New slide page with the content-slide chrome (top accent strip).
function contentSlide(doc: PDFKit.PDFDocument, design: TemplateDesign): void {
  doc.addPage();
  rect(doc, 0, 0, 13.33, 0.18, accentOf(design));
}

interface PreviewCell {
  text: string;
  bold?: boolean;
  color: string;
  fill?: string;
}

// Mirrors a pptxgenjs addTable: measured row heights, 0.5pt divider borders,
// ~0.05in cell margins, equal column split unless explicit widths are given.
function slideTable(
  doc: PDFKit.PDFDocument,
  o: { x: number; y: number; w: number; colW?: number[]; header: PreviewCell[]; rows: PreviewCell[][] },
): void {
  const pad = 0.05 * IN;
  const x0 = o.x * IN;
  let y = o.y * IN;
  const widths = (
    o.colW ?? Array.from({ length: o.header.length }, () => o.w / o.header.length)
  ).map((w) => w * IN);

  const drawRow = (cells: PreviewCell[], headerSize: number): void => {
    let rowH = 0;
    cells.forEach((cell, i) => {
      doc.font(cell.bold ? FB : F).fontSize(headerSize);
      const h = doc.heightOfString(cell.text || " ", { width: widths[i] - pad * 2 });
      rowH = Math.max(rowH, h + pad * 2);
    });
    let cx = x0;
    cells.forEach((cell, i) => {
      if (cell.fill) doc.rect(cx, y, widths[i], rowH).fill(cell.fill);
      doc.rect(cx, y, widths[i], rowH).strokeColor(DIVIDER).lineWidth(0.5).stroke();
      doc
        .font(cell.bold ? FB : F)
        .fontSize(headerSize)
        .fillColor(cell.color)
        .text(cell.text, cx + pad, y + pad, { width: widths[i] - pad * 2 });
      cx += widths[i];
    });
    y += rowH;
  };

  drawRow(o.header, 11);
  for (const row of o.rows) drawRow(row, 10);
}

// Interpreter for the visual layout draw ops — the pdfkit mirror of
// pptxRenderer's addVisualSlide, every coordinate * 72. Exported so the real
// .pdf export of a visual deck (pdfRenderer) draws the very same pages.
export function drawVisualOps(doc: PDFKit.PDFDocument, slide: VisualSlideModel): void {
  for (const op of slide.ops) {
    switch (op.op) {
      case "rect": {
        if (!op.fill && !op.stroke) break;
        doc.save();
        const r = op.radius ? Math.min(op.radius, Math.min(op.w, op.h) / 2) * IN : 0;
        const shape = () =>
          r > 0
            ? doc.roundedRect(op.x * IN, op.y * IN, op.w * IN, op.h * IN, r)
            : doc.rect(op.x * IN, op.y * IN, op.w * IN, op.h * IN);
        if (op.fill) {
          if (op.alpha !== undefined) doc.fillOpacity(op.alpha);
          if (op.stroke) {
            shape().lineWidth(op.strokePt ?? 1).fillAndStroke(op.fill, op.stroke);
          } else {
            shape().fill(op.fill);
          }
        } else if (op.stroke) {
          if (op.alpha !== undefined) doc.strokeOpacity(op.alpha);
          shape().lineWidth(op.strokePt ?? 1).stroke(op.stroke);
        }
        doc.restore();
        break;
      }
      case "circle": {
        if (!op.fill && !op.stroke) break;
        doc.save();
        const circle = () => doc.circle(op.cx * IN, op.cy * IN, op.r * IN);
        if (op.fill) {
          if (op.alpha !== undefined) doc.fillOpacity(op.alpha);
          if (op.stroke) {
            circle().lineWidth(op.strokePt ?? 1).fillAndStroke(op.fill, op.stroke);
          } else {
            circle().fill(op.fill);
          }
        } else if (op.stroke) {
          if (op.alpha !== undefined) doc.strokeOpacity(op.alpha);
          circle().lineWidth(op.strokePt ?? 1).stroke(op.stroke);
        }
        doc.restore();
        break;
      }
      case "icon": {
        // Unknown icon name renders nothing — honest absence.
        const icon = iconPng(op.icon, Math.max(48, Math.round(op.w * 192)), op.color);
        if (icon) {
          doc.image(icon, op.x * IN, op.y * IN, { fit: [op.w * IN, op.h * IN] });
        }
        break;
      }
      case "bg": {
        const bg = backgroundPng(op.variant);
        doc.image(bg, 0, 0, { width: 13.33 * IN, height: 7.5 * IN });
        break;
      }
      case "line": {
        hline(doc, op.x, op.y, op.w, op.color, op.pt);
        break;
      }
      case "text": {
        textBox(doc, op.text, {
          x: op.x, y: op.y, w: op.w, h: op.h,
          size: op.size,
          color: op.color,
          bold: op.bold,
          italic: op.italic,
          align: op.align,
          valign: op.valign,
          lineSpacingMultiple: op.lineSpacing,
          charSpacing: op.charSpacing,
        });
        break;
      }
      case "image": {
        const bytes = slide.images[op.key];
        if (bytes) {
          // Cover-crop inside a clip so the image never bleeds past its box —
          // mirrors pptxgenjs sizing { type: "cover" }.
          doc.save();
          doc.rect(op.x * IN, op.y * IN, op.w * IN, op.h * IN).clip();
          doc.image(bytes, op.x * IN, op.y * IN, {
            cover: [op.w * IN, op.h * IN],
            align: "center",
            valign: "center",
          });
          doc.restore();
        } else {
          rect(doc, op.x, op.y, op.w, op.h, ZEBRA);
        }
        break;
      }
      case "mark": {
        mark(doc, op.color, op.x, op.y, op.w, op.h);
        break;
      }
    }
  }
}

// Title slide — a 1:1 mirror of pptxRenderer's addTitleSlide per cover style.
function addTitleSlide(doc: PDFKit.PDFDocument, model: ExportDocumentModel, design: TemplateDesign): void {
  doc.addPage();
  const generated = `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} · every figure cited`;

  switch (design.coverStyle) {
    case "brand-full": {
      rect(doc, 0, 0, 13.33, 7.5, BRAND);
      rect(doc, 0, 5.4, 13.33, 2.1, NAVY);
      mark(doc, INVERSE, 0.8, 0.62, 0.44, 0.44);
      textBox(doc, "Telefónica", { x: 1.35, y: 0.6, w: 6, h: 0.5, size: 20, bold: true, color: INVERSE });
      textBox(doc, model.title, { x: 0.8, y: 2.4, w: 11.6, h: 1.8, size: 40, bold: true, color: INVERSE });
      rect(doc, 0.8, 5.7, 1.6, 0.03, INVERSE);
      textBox(doc, model.subtitle, { x: 0.8, y: 5.9, w: 11.6, h: 0.5, size: 15, color: INV_SEC });
      textBox(doc, generated, { x: 0.8, y: 6.5, w: 11, h: 0.4, size: 11, color: INV_TER });
      break;
    }
    case "brand-band": {
      mark(doc, BRAND, 0.8, 0.62, 0.44, 0.44);
      textBox(doc, "Telefónica", { x: 1.35, y: 0.6, w: 6, h: 0.5, size: 20, bold: true, color: NAVY });
      rect(doc, 0, 2.0, 13.33, 2.9, BRAND);
      textBox(doc, model.title, { x: 0.8, y: 2.4, w: 11.6, h: 1.4, size: 36, bold: true, color: INVERSE });
      textBox(doc, model.subtitle, { x: 0.8, y: 3.9, w: 11.6, h: 0.6, size: 15, color: INV_SEC });
      textBox(doc, generated, { x: 0.8, y: 5.4, w: 11, h: 0.4, size: 11, color: MUTED });
      hline(doc, 0.8, 6.7, 11.7, DIVIDER, 1);
      textBox(doc, design.footerLabel, { x: 0.8, y: 6.85, w: 11, h: 0.35, size: 10, color: MUTED });
      break;
    }
    case "masthead": {
      rect(doc, 0.8, 0.55, 11.7, 0.06, NAVY);
      hline(doc, 0.8, 0.75, 11.7, NAVY, 0.75);
      mark(doc, NAVY, 0.8, 1.0, 0.5, 0.5);
      textBox(doc, "Telefónica", { x: 1.42, y: 0.98, w: 5, h: 0.55, size: 24, bold: true, color: NAVY });
      textBox(doc, model.template.name.toUpperCase(), {
        x: 7.5, y: 1.08, w: 5, h: 0.4, size: 11, color: MUTED, align: "right", charSpacing: 2,
      });
      hline(doc, 0.8, 1.75, 11.7, DIVIDER, 0.75);
      textBox(doc, model.title, { x: 0.8, y: 2.8, w: 11.6, h: 1.5, size: 34, bold: true, color: NAVY });
      textBox(doc, model.subtitle, { x: 0.8, y: 4.3, w: 11.6, h: 0.6, size: 15, color: MUTED });
      rect(doc, 0.8, 5.15, 1.8, 0.035, NAVY);
      textBox(doc, generated, { x: 0.8, y: 5.35, w: 11, h: 0.4, size: 11, color: MUTED });
      hline(doc, 0.8, 6.8, 11.7, NAVY, 0.75);
      textBox(doc, design.footerLabel, { x: 0.8, y: 6.95, w: 11, h: 0.35, size: 10, color: MUTED });
      break;
    }
    case "split": {
      rect(doc, 0, 0, 4.4, 7.5, NAVY);
      rect(doc, 4.4, 0, 0.1, 7.5, BRAND);
      mark(doc, BRAND, 0.8, 0.8, 0.5, 0.5);
      textBox(doc, "Telefónica", { x: 0.78, y: 1.45, w: 3.4, h: 0.5, size: 19, bold: true, color: INVERSE });
      textBox(doc, model.confidentiality.toUpperCase(), { x: 0.8, y: 6.6, w: 3.2, h: 0.35, size: 9, color: INV_TER });
      textBox(doc, model.title, { x: 5.1, y: 2.7, w: 7.4, h: 1.7, size: 32, bold: true, color: NAVY });
      textBox(doc, model.subtitle, { x: 5.1, y: 4.4, w: 7.4, h: 0.6, size: 14, color: MUTED });
      textBox(doc, generated, { x: 5.1, y: 6.6, w: 7.4, h: 0.4, size: 10, color: MUTED });
      break;
    }
    case "minimal": {
      mark(doc, BRAND, 6.06, 1.5, 1.2, 1.2);
      textBox(doc, model.title, { x: 1.2, y: 3.1, w: 10.9, h: 1.2, size: 32, bold: true, color: NAVY, align: "center" });
      textBox(doc, model.subtitle, { x: 1.2, y: 4.3, w: 10.9, h: 0.5, size: 14, color: MUTED, align: "center" });
      rect(doc, 5.86, 5.3, 1.6, 0.03, BRAND);
      textBox(doc, generated, { x: 1.2, y: 5.55, w: 10.9, h: 0.4, size: 10, color: MUTED, align: "center" });
      textBox(doc, model.confidentiality.toUpperCase(), {
        x: 1.2, y: 6.5, w: 10.9, h: 0.35, size: 9, color: MUTED, align: "center",
      });
      break;
    }
    default: {
      // navy-full
      rect(doc, 0, 0, 13.33, 7.5, NAVY);
      rect(doc, 0, 0, 0.25, 7.5, BRAND);
      mark(doc, BRAND, 0.8, 0.62, 0.44, 0.44);
      textBox(doc, "Telefónica", { x: 1.35, y: 0.6, w: 6, h: 0.5, size: 20, bold: true, color: INVERSE });
      textBox(doc, model.title, { x: 0.8, y: 2.6, w: 11.6, h: 1.8, size: 40, bold: true, color: INVERSE });
      textBox(doc, model.subtitle, { x: 0.8, y: 4.4, w: 11.6, h: 0.6, size: 16, color: INV_SEC });
      textBox(doc, generated, { x: 0.8, y: 6.6, w: 11, h: 0.4, size: 11, color: INV_TER });
      break;
    }
  }
}

export async function renderPptxPreviewPdf(model: ExportDocumentModel): Promise<Buffer> {
  const design = model.template.design;
  const accent = accentOf(design);
  const headerStyle = tableHeaderStyleOf(design);

  const doc = new PDFDocument({
    size: [SLIDE_W, SLIDE_H],
    margin: 0,
    autoFirstPage: false,
    info: { Title: `${model.title} — slide preview`, Author: "Hub SSoT" },
  });
  doc.registerFont(F, brandFontPath("regular"));
  doc.registerFont(FB, brandFontPath("bold"));
  doc.registerFont(FI, brandFontPath("italic"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  for (const spec of buildSlides(model)) {
    switch (spec.kind) {
      case "visual": {
        doc.addPage();
        drawVisualOps(doc, spec.slide);
        break;
      }
      case "title": {
        addTitleSlide(doc, model, design);
        break;
      }
      case "umbrella": {
        contentSlide(doc, design);
        textBox(doc, "Umbrella message", { x: 0.8, y: 0.6, w: 11.6, h: 0.6, size: 22, bold: true, color: NAVY });
        textBox(doc, spec.text, { x: 0.8, y: 2.0, w: 11.6, h: 3.4, size: 26, bold: true, color: accent });
        addFooter(doc, model, design);
        break;
      }
      case "section": {
        contentSlide(doc, design);
        textBox(doc, spec.heading, { x: 0.8, y: 0.5, w: 11.6, h: 0.7, size: 24, bold: true, color: NAVY });
        if (spec.internalOnly) {
          textBox(doc, "Internal only — not for external distribution", {
            x: 0.8, y: 1.15, w: 11.6, h: 0.35, size: 12, italic: true, color: MUTED,
          });
        }
        textBox(doc, spec.body, {
          x: 0.8, y: 1.7, w: 11.7, h: 4.9, size: 15, color: TEXT, valign: "top", lineSpacingMultiple: 1.2,
        });
        addFooter(doc, model, design);
        break;
      }
      case "qa": {
        contentSlide(doc, design);
        textBox(doc, `${model.qaHeading ?? "Q&A"} — ${spec.index + 1}/${spec.total}`, {
          x: 0.8, y: 0.5, w: 11.6, h: 0.4, size: 12, color: MUTED,
        });
        textBox(doc, spec.question, {
          x: 0.8, y: 1.0, w: 11.7, h: 1.1, size: 22, bold: true, color: NAVY, valign: "top",
        });
        textBox(doc, spec.answer, {
          x: 0.8, y: 2.2, w: 11.7, h: 3.2, size: 15, color: TEXT, valign: "top", lineSpacingMultiple: 1.2,
        });
        textBox(doc, spec.sourcesLine, {
          x: 0.8, y: 5.5, w: 11.7, h: 0.5, size: 11, italic: true, color: MUTED, valign: "top",
        });
        if (spec.note) {
          textBox(doc, `Internal note — not exportable externally: ${spec.note}`, {
            x: 0.8, y: 6.1, w: 11.7, h: 0.6, size: 11, italic: true, color: MUTED, valign: "top",
            fill: THEME_COLORS.warningLow,
          });
        }
        addFooter(doc, model, design);
        break;
      }
      case "spokesperson": {
        contentSlide(doc, design);
        textBox(doc, "Spokesperson guidance (internal only)", {
          x: 0.8, y: 0.5, w: 11.6, h: 0.7, size: 24, bold: true, color: NAVY,
        });
        spec.batch.forEach((note, j) => {
          const y = 1.6 + j * 2.6;
          textBox(doc, `If asked: ${note.question}`, {
            x: 0.8, y, w: 11.7, h: 0.6, size: 15, bold: true, color: NAVY, valign: "top",
          });
          textBox(doc, note.guidance, {
            x: 0.8, y: y + 0.65, w: 11.7, h: 1.3, size: 13, color: TEXT, valign: "top", lineSpacingMultiple: 1.15,
          });
          if (note.doNotSay) {
            textBox(doc, `Do not say: ${note.doNotSay}`, {
              x: 0.8, y: y + 2.0, w: 11.7, h: 0.45, size: 11, italic: true, color: MUTED, valign: "top",
            });
          }
        });
        addFooter(doc, model, design);
        break;
      }
      case "chart": {
        contentSlide(doc, design);
        doc.image(spec.chart.png, 1.9 * IN, 0.9 * IN, { width: 9.6 * IN, height: 5.0 * IN });
        addFooter(doc, model, design);
        break;
      }
      case "table": {
        contentSlide(doc, design);
        textBox(doc, spec.title, { x: 0.8, y: 0.5, w: 11.6, h: 0.7, size: 24, bold: true, color: NAVY });
        textBox(doc, spec.sourceLine, { x: 0.8, y: 1.15, w: 11.6, h: 0.35, size: 12, color: MUTED });
        slideTable(doc, {
          x: 0.8,
          y: 1.7,
          w: 11.7,
          header: spec.columns.map((t) => ({ text: t, bold: true, color: headerStyle.color, fill: headerStyle.fill })),
          rows: spec.rows.map((row) =>
            row.map((value, i) => ({ text: value, bold: i === 0, color: i === 0 ? NAVY : TEXT })),
          ),
        });
        addFooter(doc, model, design);
        break;
      }
      case "citations": {
        contentSlide(doc, design);
        textBox(doc, "Evidence and citations", { x: 0.8, y: 0.5, w: 11.6, h: 0.7, size: 24, bold: true, color: NAVY });
        slideTable(doc, {
          x: 0.8,
          y: 1.5,
          w: 11.7,
          colW: [1.1, 5.4, 2.8, 2.4],
          header: ["Ref", "Source", "Location", "Owner"].map((t) => ({
            text: t, bold: true, color: headerStyle.color, fill: headerStyle.fill,
          })),
          rows: model.citations.map((c) => [
            { text: c.id, bold: true, color: accent },
            { text: `${c.docTitle} (v${c.version})`, color: TEXT },
            { text: c.sourceLoc, color: TEXT },
            { text: c.owner, color: TEXT },
          ]),
        });
        addFooter(doc, model, design);
        break;
      }
      case "disclaimers": {
        contentSlide(doc, design);
        textBox(doc, "Disclaimers", { x: 0.8, y: 0.5, w: 11.6, h: 0.7, size: 24, bold: true, color: NAVY });
        textBox(doc, model.disclaimers.map((d) => `${d.name}: ${d.text}`).join("\n\n"), {
          x: 0.8, y: 1.6, w: 11.7, h: 4.8, size: 12, color: MUTED, valign: "top",
        });
        addFooter(doc, model, design);
        break;
      }
    }
  }

  doc.end();
  return done;
}
