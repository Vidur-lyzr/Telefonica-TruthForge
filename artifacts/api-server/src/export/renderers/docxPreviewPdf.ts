// WYSIWYG print preview of the .docx export, rendered as an A4 PDF that
// mirrors docxRenderer.ts paragraph by paragraph: same page geometry
// (DOCX_PAGE DXA values divided by 20 into points), same type scale
// (DOCX_SIZE half-points divided by 2), same spacing (DOCX_SPACE DXA / 20),
// same cover vocabulary, headings, shaded callouts, fixed-width tables and
// running footer. Word's own line-breaking engine differs slightly from
// pdfkit's, so this is a faithful print-preview approximation — content,
// order, styling and geometry are identical; exact line wraps may not be.

import PDFDocument from "pdfkit";
import type { ExportDocumentModel } from "../exportService";
import type { TemplateDesign } from "../exportTemplates";
import { brandFontPath, brandMarkPng } from "../brandAssets";
import {
  THEME_COLORS,
  DOCX_PAGE,
  DOCX_SPACE,
  TYPE_SCALE_PT,
  docxColumnWidths,
  dataTableWeights,
  CITATION_TABLE_WEIGHTS,
} from "../exportTheme";
import { qaSourcesLine, tableSourceLine } from "../slideModel";

const BRAND = THEME_COLORS.brand;
const NAVY = THEME_COLORS.navy;
const TEXT = THEME_COLORS.textPrimary;
const MUTED = THEME_COLORS.textSecondary;
const DIVIDER = THEME_COLORS.divider;
const ZEBRA = THEME_COLORS.backgroundAlt;
const WARN_BG = THEME_COLORS.warningLow;
const WARN_TX = THEME_COLORS.warningHigh;
const BRAND_LOW = THEME_COLORS.brandLow;
const INVERSE = THEME_COLORS.inverse;
const INV_SEC = THEME_COLORS.inverseSecondary;
const INV_TER = THEME_COLORS.inverseTertiary;

const F = "Brand";
const FB = "Brand-Bold";
const FI = "Brand-Italic";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M_TOP = DOCX_PAGE.marginTop / 20;
const M_BOT = DOCX_PAGE.marginBottom / 20;
const M_L = DOCX_PAGE.marginLeft / 20;
const CONTENT_W = DOCX_PAGE.contentWidthDxa / 20;

// docx sizes are half-points; borders are eighths of a point; spacing is DXA.
const half = (halfPoints: number) => halfPoints / 2;
const dxa = (v: number) => v / 20;
const eighth = (v: number) => v / 8;

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

interface Run {
  text: string;
  sizeHalf: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
}

interface ParaOpts {
  beforeDxa?: number;
  afterDxa?: number;
  lineDxa?: number;
  shading?: string;
  align?: "left" | "center";
  borderLeft?: { color: string; size: number; space: number };
  borderBottom?: { color: string; size: number; space: number };
  borderTop?: { color: string; size: number; space: number };
  // Hanging-indent bullet/numbered prefix (mirrors docx indent left/hanging).
  hanging?: { prefix: string; prefixColor: string; leftDxa: number; hangDxa: number };
}

class Preview {
  doc: PDFKit.PDFDocument;
  y = M_TOP;

  constructor(doc: PDFKit.PDFDocument) {
    this.doc = doc;
    this.doc.addPage();
  }

  ensure(needed: number): void {
    if (this.y + needed > PAGE_H - M_BOT) {
      this.doc.addPage();
      this.y = M_TOP;
    }
  }

  fontOf(run: Run): string {
    return run.bold ? FB : run.italic ? FI : F;
  }

  para(runs: Run[], o: ParaOpts = {}): void {
    const main = runs[runs.length - 1];
    if (!main) return;
    this.y += dxa(o.beforeDxa ?? 0);

    const leftPt = o.hanging ? dxa(o.hanging.leftDxa) : 0;
    const textX = M_L + leftPt;
    const textW = CONTENT_W - leftPt;

    const joined = runs.map((r) => r.text).join("");
    this.doc.font(this.fontOf(main)).fontSize(half(main.sizeHalf));
    const baseLineH = this.doc.currentLineHeight();
    const lineGap = o.lineDxa ? Math.max(0, dxa(o.lineDxa) - baseLineH) : 0;
    const textH = this.doc.heightOfString(joined || " ", { width: textW, lineGap });
    const blockH = textH + (o.shading ? 4 : 0);

    this.ensure(blockH + (o.borderBottom ? o.borderBottom.space + eighth(o.borderBottom.size) : 0));
    const y0 = this.y;

    if (o.shading) {
      this.doc.rect(M_L, y0, CONTENT_W, blockH).fill(o.shading);
    }
    if (o.borderTop) {
      const by = y0 - o.borderTop.space;
      this.doc
        .moveTo(M_L, by)
        .lineTo(M_L + CONTENT_W, by)
        .strokeColor(o.borderTop.color)
        .lineWidth(eighth(o.borderTop.size))
        .stroke();
    }
    if (o.borderLeft) {
      const bx = M_L - o.borderLeft.space;
      this.doc
        .moveTo(bx, y0)
        .lineTo(bx, y0 + blockH)
        .strokeColor(o.borderLeft.color)
        .lineWidth(eighth(o.borderLeft.size))
        .stroke();
    }

    const ty = y0 + (o.shading ? 2 : 0);
    if (o.hanging) {
      this.doc
        .font(FB)
        .fontSize(half(main.sizeHalf))
        .fillColor(o.hanging.prefixColor)
        .text(o.hanging.prefix, M_L + dxa(o.hanging.leftDxa - o.hanging.hangDxa), ty, {
          lineBreak: false,
        });
      this.doc
        .font(this.fontOf(main))
        .fontSize(half(main.sizeHalf))
        .fillColor(main.color)
        .text(main.text, textX, ty, { width: textW, lineGap });
    } else if (runs.length === 1) {
      this.doc
        .font(this.fontOf(main))
        .fontSize(half(main.sizeHalf))
        .fillColor(main.color)
        .text(main.text, textX, ty, { width: textW, lineGap, align: o.align ?? "left" });
    } else {
      runs.forEach((run, i) => {
        this.doc
          .font(this.fontOf(run))
          .fontSize(half(run.sizeHalf))
          .fillColor(run.color)
          .text(run.text, i === 0 ? textX : undefined as unknown as number, i === 0 ? ty : undefined as unknown as number, {
            continued: i < runs.length - 1,
            lineGap,
          });
      });
    }

    this.y = y0 + blockH;
    if (o.borderBottom) {
      const by = this.y + o.borderBottom.space;
      this.doc
        .moveTo(M_L, by)
        .lineTo(M_L + CONTENT_W, by)
        .strokeColor(o.borderBottom.color)
        .lineWidth(eighth(o.borderBottom.size))
        .stroke();
      this.y = by + eighth(o.borderBottom.size);
    }
    this.y += dxa(o.afterDxa ?? 0);
  }

  image(png: Buffer, widthPt: number, heightPt: number, opts?: { center?: boolean; shading?: string; inline?: { text: string; sizeHalf: number; color: string; bold?: boolean } }): void {
    this.ensure(heightPt + 8);
    const y0 = this.y;
    if (opts?.shading) {
      this.doc.rect(M_L, y0, CONTENT_W, heightPt + 4).fill(opts.shading);
    }
    const x = opts?.center ? M_L + (CONTENT_W - widthPt) / 2 : M_L;
    this.doc.image(png, x, y0 + (opts?.shading ? 2 : 0), { width: widthPt, height: heightPt });
    if (opts?.inline) {
      this.doc
        .font(opts.inline.bold ? FB : F)
        .fontSize(half(opts.inline.sizeHalf))
        .fillColor(opts.inline.color)
        .text(opts.inline.text, x + widthPt + 4, y0 + (heightPt - half(opts.inline.sizeHalf)) / 2 - 2, {
          lineBreak: false,
        });
    }
    this.y = y0 + heightPt + (opts?.shading ? 4 : 0);
  }
}

// ---- docxRenderer mirrors ---------------------------------------------------

const S = {
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

function heading(p: Preview, text: string, design: TemplateDesign): void {
  const accent = accentOf(design);
  const runs: Run[] = [{ text, sizeHalf: S.h1, color: NAVY, bold: true }];
  switch (design.headingStyle) {
    case "rule":
      p.para(runs, {
        beforeDxa: DOCX_SPACE.beforeH1,
        afterDxa: DOCX_SPACE.afterH1,
        borderBottom: { color: accent, size: 8, space: 4 },
      });
      break;
    case "block":
      p.para(runs, {
        beforeDxa: DOCX_SPACE.beforeH1,
        afterDxa: DOCX_SPACE.afterH1,
        shading: design.accent === "navy" ? ZEBRA : BRAND_LOW,
      });
      break;
    default:
      p.para(runs, {
        beforeDxa: DOCX_SPACE.beforeH1,
        afterDxa: DOCX_SPACE.afterH1,
        borderLeft: { color: accent, size: 24, space: 8 },
      });
  }
}

function bodyPara(p: Preview, text: string): void {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const bullet = /^-\s+(.*)$/.exec(trimmed);
    if (bullet) {
      p.para([{ text: bullet[1], sizeHalf: S.body, color: TEXT }], {
        afterDxa: 60,
        lineDxa: DOCX_SPACE.bodyLine,
        hanging: { prefix: "•  ", prefixColor: BRAND, leftDxa: 360, hangDxa: 200 },
      });
      continue;
    }
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (numbered) {
      p.para([{ text: numbered[2], sizeHalf: S.body, color: TEXT }], {
        afterDxa: 60,
        lineDxa: DOCX_SPACE.bodyLine,
        hanging: { prefix: `${numbered[1]}.  `, prefixColor: BRAND, leftDxa: 360, hangDxa: 240 },
      });
      continue;
    }
    p.para([{ text: trimmed, sizeHalf: S.body, color: TEXT }], {
      afterDxa: DOCX_SPACE.afterBody,
      lineDxa: DOCX_SPACE.bodyLine,
    });
  }
}

function metaPara(p: Preview, text: string): void {
  p.para([{ text, sizeHalf: S.caption, color: MUTED }], { afterDxa: 80 });
}

function brandedTable(
  p: Preview,
  columns: string[],
  rows: string[][],
  weights: number[],
  design: TemplateDesign,
): void {
  const style = tableHeaderStyleOf(design);
  const widths = docxColumnWidths(weights).map(dxa);
  const padV = dxa(DOCX_SPACE.cellMarginV);
  const padH = dxa(DOCX_SPACE.cellMarginH);
  const doc = p.doc;

  const drawRow = (
    cells: string[],
    opts: { header?: boolean; zebra?: boolean },
  ): void => {
    let rowH = 0;
    cells.forEach((cell, i) => {
      doc.font(opts.header || i === 0 ? FB : F).fontSize(half(S.small));
      const h = doc.heightOfString(cell || " ", { width: widths[i] - padH * 2 });
      rowH = Math.max(rowH, h + padV * 2);
    });
    p.ensure(rowH);
    const y0 = p.y;
    let cx = M_L;
    cells.forEach((cell, i) => {
      const fill = opts.header ? style.fill : opts.zebra ? ZEBRA : null;
      if (fill) doc.rect(cx, y0, widths[i], rowH).fill(fill);
      const bold = opts.header || i === 0;
      doc
        .font(bold ? FB : F)
        .fontSize(half(S.small))
        .fillColor(opts.header ? style.color : bold ? NAVY : TEXT)
        .text(cell, cx + padH, y0 + padV, { width: widths[i] - padH * 2 });
      cx += widths[i];
    });
    // insideHorizontal / top / bottom borders: 0.25pt divider lines.
    doc
      .moveTo(M_L, y0 + rowH)
      .lineTo(M_L + CONTENT_W, y0 + rowH)
      .strokeColor(DIVIDER)
      .lineWidth(eighth(2))
      .stroke();
    p.y = y0 + rowH;
  };

  doc
    .moveTo(M_L, p.y)
    .lineTo(M_L + CONTENT_W, p.y)
    .strokeColor(DIVIDER)
    .lineWidth(eighth(2))
    .stroke();
  drawRow(columns, { header: true });
  rows.forEach((row, r) => drawRow(row, { zebra: r % 2 === 1 }));
  p.y += dxa(DOCX_SPACE.afterBody);
}

// Cover — the same shaded-block vocabulary as docxRenderer's coverChildren.
function cover(p: Preview, model: ExportDocumentModel, design: TemplateDesign): void {
  const generated = `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} · Hub SSoT governed output · every figure cited`;

  const shadedLine = (fill: string, sizeHalf = 8): void =>
    p.para([{ text: " ", sizeHalf, color: fill }], { shading: fill });

  switch (design.coverStyle) {
    case "navy-full":
    case "brand-full": {
      const bg = design.coverStyle === "navy-full" ? NAVY : BRAND;
      const markColor = design.coverStyle === "navy-full" ? BRAND : INVERSE;
      const onBg = (text: string, o: { bold?: boolean; sizeHalf: number; color?: string }) =>
        p.para([{ text, sizeHalf: o.sizeHalf, color: o.color ?? INVERSE, bold: o.bold }], {
          shading: bg,
        });
      p.image(brandMarkPng(120, markColor), 19.5, 19.5, {
        shading: bg,
        inline: { text: "  Telefónica", sizeHalf: S.h1, color: INVERSE, bold: true },
      });
      onBg(" ", { sizeHalf: 48 });
      onBg(model.title, { bold: true, sizeHalf: S.coverTitle });
      onBg(" ", { sizeHalf: 12 });
      onBg(model.subtitle, { sizeHalf: S.coverSubtitle, color: INV_SEC });
      onBg(generated, { sizeHalf: S.coverMeta, color: INV_TER });
      onBg(model.confidentiality.toUpperCase(), { sizeHalf: S.small, color: INV_TER });
      shadedLine(design.coverStyle === "navy-full" ? BRAND : NAVY, 10);
      p.para([{ text: " ", sizeHalf: 8, color: TEXT }], { afterDxa: 120 });
      break;
    }
    case "brand-band": {
      p.image(brandMarkPng(120, BRAND), 19.5, 19.5, {
        inline: { text: "  Telefónica", sizeHalf: S.h1, color: NAVY, bold: true },
      });
      p.y += dxa(200);
      const onBand = (text: string, o: { bold?: boolean; sizeHalf: number; color?: string }) =>
        p.para([{ text, sizeHalf: o.sizeHalf, color: o.color ?? INVERSE, bold: o.bold }], {
          shading: BRAND,
        });
      onBand(" ", { sizeHalf: 20 });
      onBand(model.title, { bold: true, sizeHalf: S.coverTitle });
      onBand(" ", { sizeHalf: 8 });
      onBand(model.subtitle, { sizeHalf: S.coverSubtitle, color: INV_SEC });
      onBand(" ", { sizeHalf: 20 });
      p.y += dxa(160);
      metaPara(p, generated);
      p.para(
        [{ text: `${design.footerLabel} · ${model.confidentiality.toUpperCase()}`, sizeHalf: S.small, color: MUTED }],
        { afterDxa: 120, borderBottom: { color: DIVIDER, size: 4, space: 4 } },
      );
      break;
    }
    case "masthead": {
      shadedLine(NAVY, 6);
      p.y += dxa(160);
      p.image(brandMarkPng(120, NAVY), 22.5, 22.5, {
        inline: { text: `  Telefónica   ·   ${model.template.name.toUpperCase()}`, sizeHalf: S.small, color: NAVY, bold: true },
      });
      p.para([{ text: " ", sizeHalf: 4, color: TEXT }], {
        afterDxa: 60,
        borderBottom: { color: DIVIDER, size: 4, space: 6 },
      });
      p.para([{ text: model.title, sizeHalf: S.coverTitle, color: NAVY, bold: true }], {
        beforeDxa: 300,
        afterDxa: 120,
      });
      p.para([{ text: model.subtitle, sizeHalf: S.coverSubtitle, color: MUTED }], { afterDxa: 100 });
      p.para([{ text: generated, sizeHalf: S.caption, color: MUTED }], {
        afterDxa: 80,
        borderTop: { color: NAVY, size: 12, space: 6 },
      });
      p.para(
        [{ text: `${design.footerLabel} · ${model.confidentiality.toUpperCase()}`, sizeHalf: S.small, color: MUTED }],
        { afterDxa: 120, borderBottom: { color: NAVY, size: 6, space: 4 } },
      );
      break;
    }
    case "split": {
      p.image(brandMarkPng(120, BRAND), 19.5, 19.5, {
        shading: NAVY,
        inline: { text: "  Telefónica", sizeHalf: S.h1, color: INVERSE, bold: true },
      });
      shadedLine(BRAND, 6);
      p.para([{ text: model.title, sizeHalf: S.coverTitle - 4, color: NAVY, bold: true }], {
        beforeDxa: 360,
        afterDxa: 120,
        borderLeft: { color: NAVY, size: 36, space: 12 },
      });
      p.para([{ text: model.subtitle, sizeHalf: S.coverSubtitle, color: MUTED }], {
        afterDxa: 100,
        borderLeft: { color: NAVY, size: 36, space: 12 },
      });
      metaPara(p, generated);
      p.para([{ text: model.confidentiality.toUpperCase(), sizeHalf: S.small, color: MUTED }], {
        afterDxa: 120,
      });
      break;
    }
    case "minimal": {
      p.y += dxa(600);
      p.image(brandMarkPng(320, BRAND), 54, 54, { center: true });
      p.y += dxa(200);
      p.para([{ text: model.title, sizeHalf: S.coverTitle - 4, color: NAVY, bold: true }], {
        afterDxa: 80,
        align: "center",
      });
      p.para([{ text: model.subtitle, sizeHalf: S.coverSubtitle, color: MUTED }], {
        afterDxa: 80,
        align: "center",
      });
      p.para([{ text: generated, sizeHalf: S.caption, color: MUTED }], { afterDxa: 80, align: "center" });
      p.para([{ text: model.confidentiality.toUpperCase(), sizeHalf: S.small, color: MUTED }], {
        afterDxa: 240,
        align: "center",
      });
      break;
    }
  }
}

export async function renderDocxPreviewPdf(model: ExportDocumentModel): Promise<Buffer> {
  const design = model.template.design;

  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margin: 0,
    autoFirstPage: false,
    bufferPages: true,
    info: { Title: `${model.title} — print preview`, Author: "Hub SSoT" },
  });
  doc.registerFont(F, brandFontPath("regular"));
  doc.registerFont(FB, brandFontPath("bold"));
  doc.registerFont(FI, brandFontPath("italic"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const p = new Preview(doc);

  cover(p, model, design);

  if (model.umbrella) {
    heading(p, "Umbrella message", design);
    p.para([{ text: model.umbrella, sizeHalf: S.h2, color: NAVY, bold: true }], {
      afterDxa: DOCX_SPACE.afterBody,
      lineDxa: DOCX_SPACE.bodyLine,
      shading: design.accent === "navy" ? ZEBRA : BRAND_LOW,
      borderLeft: { color: accentOf(design), size: 24, space: 8 },
    });
  }

  const pushQaBlock = (): void => {
    heading(p, model.qaHeading ?? "Q&A", design);
    for (const item of model.qa) {
      p.para([{ text: `Q: ${item.question}`, sizeHalf: S.h2, color: NAVY, bold: true }], {
        beforeDxa: 200,
        afterDxa: 80,
      });
      bodyPara(p, item.answer);
      metaPara(
        p,
        item.provenance.length > 0
          ? `Sources: ${item.provenance
              .map((pr) => [pr.docTitle, pr.version, pr.date, pr.owner].filter(Boolean).join(" · "))
              .join(" | ")}`
          : "Not covered by approved material — no governed source backs this answer.",
      );
      if (item.note) {
        p.para(
          [{ text: `Internal note — not exportable externally: ${item.note}`, sizeHalf: S.caption, color: WARN_TX, italic: true }],
          { afterDxa: 120, shading: WARN_BG },
        );
      }
    }
  };

  for (const section of model.sections) {
    if (section.isQa && model.qa.length > 0) {
      pushQaBlock();
      continue;
    }
    heading(p, section.heading, design);
    if (section.internalOnly) {
      metaPara(p, "Internal only — not for external distribution.");
    }
    bodyPara(p, section.body);
  }

  for (const chart of model.charts) {
    const w = 420; // docx embeds at 560px ≈ 420pt (96dpi → 72dpi)
    const h = Math.round((w * chart.height) / chart.width);
    p.y += dxa(240);
    p.image(chart.png, w, h, { center: true });
    p.y += dxa(120);
  }

  for (const table of model.tables) {
    heading(p, table.title, design);
    metaPara(p, tableSourceLine(table));
    brandedTable(p, table.columns, table.rows, dataTableWeights(table.columns.length), design);
  }

  if (model.spokesperson.length > 0) {
    heading(p, "Spokesperson guidance (internal only)", design);
    for (const note of model.spokesperson) {
      p.para([{ text: `Q: ${note.question}`, sizeHalf: S.h2, color: NAVY, bold: true }], {
        beforeDxa: 160,
        afterDxa: 60,
      });
      bodyPara(p, note.guidance);
      if (note.doNotSay) {
        p.para(
          [{ text: `Do not say: ${note.doNotSay}`, sizeHalf: S.small, color: WARN_TX, italic: true }],
          { afterDxa: 120, shading: WARN_BG },
        );
      }
    }
  }

  if (model.citations.length > 0) {
    heading(p, "Evidence and citations", design);
    brandedTable(
      p,
      ["Ref", "Source", "Location", "Owner"],
      model.citations.map((c) => [c.id, `${c.docTitle} (v${c.version})`, c.sourceLoc, c.owner]),
      [...CITATION_TABLE_WEIGHTS],
      design,
    );
  }

  if (model.disclaimers.length > 0) {
    heading(p, "Disclaimers", design);
    for (const d of model.disclaimers) {
      metaPara(p, `${d.name}: ${d.text}`);
    }
  }

  // Running footer on every page — same wording as the Word footer.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font(F)
      .fontSize(TYPE_SCALE_PT.footer)
      .fillColor(MUTED)
      .text(
        `Telefónica · ${design.footerLabel} · ${model.confidentiality} · page ${i + 1}`,
        M_L,
        PAGE_H - M_BOT + 24,
        { width: CONTENT_W, align: "center", lineBreak: false },
      );
  }

  doc.end();
  return done;
}
