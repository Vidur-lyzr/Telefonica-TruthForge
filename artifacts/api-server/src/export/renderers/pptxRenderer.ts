// .pptx renderer — Telefónica corporate slide template driven by the shared
// export theme and the template's design spec: the title slide follows the
// template's cover style, content slides carry the template accent, table
// headers follow the template's table style and the running footer names the
// template. Colours come from the shared export theme only.

import PptxGenJS from "pptxgenjs";
import type { ExportDocumentModel } from "../exportService";
import type { TemplateDesign } from "../exportTemplates";
import { THEME_COLORS } from "../exportTheme";
import { brandMarkPng, BRAND_FONT_FAMILY } from "../brandAssets";
import { buildSlides } from "../slideModel";

const hex = (c: string) => c.replace("#", "");
const BRAND = hex(THEME_COLORS.brand);
const NAVY = hex(THEME_COLORS.navy);
const TEXT = hex(THEME_COLORS.textPrimary);
const MUTED = hex(THEME_COLORS.textSecondary);
const DIVIDER = hex(THEME_COLORS.divider);
const ZEBRA = hex(THEME_COLORS.backgroundAlt);
const INVERSE = "FFFFFF";
const INV_SEC = hex(THEME_COLORS.inverseSecondary);
const INV_TER = hex(THEME_COLORS.inverseTertiary);
// Hanken Grotesk face name. pptxgenjs cannot embed font files into a .pptx —
// the face is named so it renders on-brand wherever the font is available.
const FONT = BRAND_FONT_FAMILY;

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

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

function addFooter(slide: PptxGenJS.Slide, model: ExportDocumentModel, design: TemplateDesign): void {
  slide.addText(`Telefónica · ${design.footerLabel}`, {
    x: 0.4,
    y: 6.9,
    w: 8,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9,
    color: MUTED,
  });
  slide.addText(model.confidentiality, {
    x: 10.4,
    y: 6.9,
    w: 2.4,
    h: 0.3,
    align: "right",
    fontFace: FONT,
    fontSize: 9,
    color: MUTED,
  });
}

// Content-slide chrome: the accent strip along the top.
function contentSlide(pptx: PptxGenJS, design: TemplateDesign): PptxGenJS.Slide {
  const s = pptx.addSlide();
  s.background = { color: INVERSE };
  s.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.18, fill: { color: accentOf(design) } });
  return s;
}

function markData(color: string): string {
  return `image/png;base64,${brandMarkPng(160, color).toString("base64")}`;
}

// Title slide, laid out per the template's cover style.
function addTitleSlide(pptx: PptxGenJS, model: ExportDocumentModel, design: TemplateDesign): void {
  const s = pptx.addSlide();
  const generated = `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} · every figure cited`;

  switch (design.coverStyle) {
    case "brand-full": {
      s.background = { color: BRAND };
      s.addShape("rect", { x: 0, y: 5.4, w: SLIDE_W, h: 2.1, fill: { color: NAVY } });
      s.addImage({ data: markData(THEME_COLORS.inverse), x: 0.8, y: 0.62, w: 0.44, h: 0.44 });
      s.addText("Telefónica", { x: 1.35, y: 0.6, w: 6, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: INVERSE });
      s.addText(model.title, { x: 0.8, y: 2.4, w: 11.6, h: 1.8, fontFace: FONT, fontSize: 40, bold: true, color: INVERSE });
      s.addShape("rect", { x: 0.8, y: 5.7, w: 1.6, h: 0.03, fill: { color: INVERSE } });
      s.addText(model.subtitle, { x: 0.8, y: 5.9, w: 11.6, h: 0.5, fontFace: FONT, fontSize: 15, color: INV_SEC });
      s.addText(generated, { x: 0.8, y: 6.5, w: 11, h: 0.4, fontFace: FONT, fontSize: 11, color: INV_TER });
      break;
    }
    case "brand-band": {
      s.background = { color: INVERSE };
      s.addImage({ data: markData(THEME_COLORS.brand), x: 0.8, y: 0.62, w: 0.44, h: 0.44 });
      s.addText("Telefónica", { x: 1.35, y: 0.6, w: 6, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: NAVY });
      s.addShape("rect", { x: 0, y: 2.0, w: SLIDE_W, h: 2.9, fill: { color: BRAND } });
      s.addText(model.title, { x: 0.8, y: 2.4, w: 11.6, h: 1.4, fontFace: FONT, fontSize: 36, bold: true, color: INVERSE });
      s.addText(model.subtitle, { x: 0.8, y: 3.9, w: 11.6, h: 0.6, fontFace: FONT, fontSize: 15, color: INV_SEC });
      s.addText(generated, { x: 0.8, y: 5.4, w: 11, h: 0.4, fontFace: FONT, fontSize: 11, color: MUTED });
      s.addShape("line", { x: 0.8, y: 6.7, w: 11.7, h: 0, line: { color: DIVIDER, width: 1 } });
      s.addText(design.footerLabel, { x: 0.8, y: 6.85, w: 11, h: 0.35, fontFace: FONT, fontSize: 10, color: MUTED });
      break;
    }
    case "masthead": {
      s.background = { color: INVERSE };
      s.addShape("rect", { x: 0.8, y: 0.55, w: 11.7, h: 0.06, fill: { color: NAVY } });
      s.addShape("line", { x: 0.8, y: 0.75, w: 11.7, h: 0, line: { color: NAVY, width: 0.75 } });
      s.addImage({ data: markData(THEME_COLORS.navy), x: 0.8, y: 1.0, w: 0.5, h: 0.5 });
      s.addText("Telefónica", { x: 1.42, y: 0.98, w: 5, h: 0.55, fontFace: FONT, fontSize: 24, bold: true, color: NAVY });
      s.addText(model.template.name.toUpperCase(), { x: 7.5, y: 1.08, w: 5, h: 0.4, align: "right", fontFace: FONT, fontSize: 11, color: MUTED, charSpacing: 2 });
      s.addShape("line", { x: 0.8, y: 1.75, w: 11.7, h: 0, line: { color: DIVIDER, width: 0.75 } });
      s.addText(model.title, { x: 0.8, y: 2.8, w: 11.6, h: 1.5, fontFace: FONT, fontSize: 34, bold: true, color: NAVY });
      s.addText(model.subtitle, { x: 0.8, y: 4.3, w: 11.6, h: 0.6, fontFace: FONT, fontSize: 15, color: MUTED });
      s.addShape("rect", { x: 0.8, y: 5.15, w: 1.8, h: 0.035, fill: { color: NAVY } });
      s.addText(generated, { x: 0.8, y: 5.35, w: 11, h: 0.4, fontFace: FONT, fontSize: 11, color: MUTED });
      s.addShape("line", { x: 0.8, y: 6.8, w: 11.7, h: 0, line: { color: NAVY, width: 0.75 } });
      s.addText(design.footerLabel, { x: 0.8, y: 6.95, w: 11, h: 0.35, fontFace: FONT, fontSize: 10, color: MUTED });
      break;
    }
    case "split": {
      s.background = { color: INVERSE };
      s.addShape("rect", { x: 0, y: 0, w: 4.4, h: SLIDE_H, fill: { color: NAVY } });
      s.addShape("rect", { x: 4.4, y: 0, w: 0.1, h: SLIDE_H, fill: { color: BRAND } });
      s.addImage({ data: markData(THEME_COLORS.brand), x: 0.8, y: 0.8, w: 0.5, h: 0.5 });
      s.addText("Telefónica", { x: 0.78, y: 1.45, w: 3.4, h: 0.5, fontFace: FONT, fontSize: 19, bold: true, color: INVERSE });
      s.addText(model.confidentiality.toUpperCase(), { x: 0.8, y: 6.6, w: 3.2, h: 0.35, fontFace: FONT, fontSize: 9, color: INV_TER });
      s.addText(model.title, { x: 5.1, y: 2.7, w: 7.4, h: 1.7, fontFace: FONT, fontSize: 32, bold: true, color: NAVY });
      s.addText(model.subtitle, { x: 5.1, y: 4.4, w: 7.4, h: 0.6, fontFace: FONT, fontSize: 14, color: MUTED });
      s.addText(generated, { x: 5.1, y: 6.6, w: 7.4, h: 0.4, fontFace: FONT, fontSize: 10, color: MUTED });
      break;
    }
    case "minimal": {
      s.background = { color: INVERSE };
      s.addImage({ data: markData(THEME_COLORS.brand), x: 6.06, y: 1.5, w: 1.2, h: 1.2 });
      s.addText(model.title, { x: 1.2, y: 3.1, w: 10.9, h: 1.2, align: "center", fontFace: FONT, fontSize: 32, bold: true, color: NAVY });
      s.addText(model.subtitle, { x: 1.2, y: 4.3, w: 10.9, h: 0.5, align: "center", fontFace: FONT, fontSize: 14, color: MUTED });
      s.addShape("rect", { x: 5.86, y: 5.3, w: 1.6, h: 0.03, fill: { color: BRAND } });
      s.addText(generated, { x: 1.2, y: 5.55, w: 10.9, h: 0.4, align: "center", fontFace: FONT, fontSize: 10, color: MUTED });
      s.addText(model.confidentiality.toUpperCase(), { x: 1.2, y: 6.5, w: 10.9, h: 0.35, align: "center", fontFace: FONT, fontSize: 9, color: MUTED });
      break;
    }
    default: {
      // navy-full
      s.background = { color: NAVY };
      s.addShape("rect", { x: 0, y: 0, w: 0.25, h: SLIDE_H, fill: { color: BRAND } });
      s.addImage({ data: markData(THEME_COLORS.brand), x: 0.8, y: 0.62, w: 0.44, h: 0.44 });
      s.addText("Telefónica", { x: 1.35, y: 0.6, w: 6, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: INVERSE });
      s.addText(model.title, { x: 0.8, y: 2.6, w: 11.6, h: 1.8, fontFace: FONT, fontSize: 40, bold: true, color: INVERSE });
      s.addText(model.subtitle, { x: 0.8, y: 4.4, w: 11.6, h: 0.6, fontFace: FONT, fontSize: 16, color: INV_SEC });
      s.addText(generated, { x: 0.8, y: 6.6, w: 11, h: 0.4, fontFace: FONT, fontSize: 11, color: INV_TER });
      break;
    }
  }
}

export async function renderPptx(model: ExportDocumentModel): Promise<Buffer> {
  const design = model.template.design;
  const accent = accentOf(design);
  const headerStyle = tableHeaderStyleOf(design);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "WIDE";
  pptx.author = "Hub SSoT";
  pptx.title = model.title;

  // Slide sequence comes from the shared slide model — the WYSIWYG preview
  // iterates exactly the same specs, so the deck a user downloads always
  // matches the deck they previewed, slide for slide.
  for (const spec of buildSlides(model)) {
    switch (spec.kind) {
      case "title": {
        addTitleSlide(pptx, model, design);
        break;
      }
      case "umbrella": {
        const s = contentSlide(pptx, design);
        s.addText("Umbrella message", {
          x: 0.8, y: 0.6, w: 11.6, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: NAVY,
        });
        s.addText(spec.text, {
          x: 0.8, y: 2.0, w: 11.6, h: 3.4, fontFace: FONT, fontSize: 26, bold: true, color: accent,
        });
        addFooter(s, model, design);
        break;
      }
      case "section": {
        const s = contentSlide(pptx, design);
        s.addText(spec.heading, {
          x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
        });
        if (spec.internalOnly) {
          s.addText("Internal only — not for external distribution", {
            x: 0.8, y: 1.15, w: 11.6, h: 0.35, fontFace: FONT, fontSize: 12, italic: true, color: MUTED,
          });
        }
        s.addText(spec.body, {
          x: 0.8, y: 1.7, w: 11.7, h: 4.9, fontFace: FONT, fontSize: 15, color: TEXT, valign: "top",
          lineSpacingMultiple: 1.2,
        });
        addFooter(s, model, design);
        break;
      }
      case "qa": {
        const s = contentSlide(pptx, design);
        s.addText(`${model.qaHeading ?? "Q&A"} — ${spec.index + 1}/${spec.total}`, {
          x: 0.8, y: 0.5, w: 11.6, h: 0.4, fontFace: FONT, fontSize: 12, color: MUTED,
        });
        s.addText(spec.question, {
          x: 0.8, y: 1.0, w: 11.7, h: 1.1, fontFace: FONT, fontSize: 22, bold: true, color: NAVY, valign: "top",
        });
        s.addText(spec.answer, {
          x: 0.8, y: 2.2, w: 11.7, h: 3.2, fontFace: FONT, fontSize: 15, color: TEXT, valign: "top",
          lineSpacingMultiple: 1.2,
        });
        s.addText(spec.sourcesLine, {
          x: 0.8, y: 5.5, w: 11.7, h: 0.5, fontFace: FONT, fontSize: 11, italic: true, color: MUTED, valign: "top",
        });
        if (spec.note) {
          s.addText(`Internal note — not exportable externally: ${spec.note}`, {
            x: 0.8, y: 6.1, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 11, italic: true, color: MUTED, valign: "top",
            fill: { color: hex(THEME_COLORS.warningLow) },
          });
        }
        addFooter(s, model, design);
        break;
      }
      case "spokesperson": {
        const s = contentSlide(pptx, design);
        s.addText("Spokesperson guidance (internal only)", {
          x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
        });
        spec.batch.forEach((note, j) => {
          const y = 1.6 + j * 2.6;
          s.addText(`If asked: ${note.question}`, {
            x: 0.8, y, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 15, bold: true, color: NAVY, valign: "top",
          });
          s.addText(note.guidance, {
            x: 0.8, y: y + 0.65, w: 11.7, h: 1.3, fontFace: FONT, fontSize: 13, color: TEXT, valign: "top",
            lineSpacingMultiple: 1.15,
          });
          if (note.doNotSay) {
            s.addText(`Do not say: ${note.doNotSay}`, {
              x: 0.8, y: y + 2.0, w: 11.7, h: 0.45, fontFace: FONT, fontSize: 11, italic: true, color: MUTED, valign: "top",
            });
          }
        });
        addFooter(s, model, design);
        break;
      }
      case "chart": {
        const s = contentSlide(pptx, design);
        s.addImage({
          data: `image/png;base64,${spec.chart.png.toString("base64")}`,
          x: 1.9, y: 0.9, w: 9.6, h: 5.0,
        });
        addFooter(s, model, design);
        break;
      }
      case "table": {
        const s = contentSlide(pptx, design);
        s.addText(spec.title, {
          x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
        });
        s.addText(spec.sourceLine, {
          x: 0.8, y: 1.15, w: 11.6, h: 0.35, fontFace: FONT, fontSize: 12, color: MUTED,
        });
        const tRows: PptxGenJS.TableRow[] = [
          spec.columns.map((t) => ({
            text: t,
            options: { bold: true, color: headerStyle.color, fill: { color: headerStyle.fill }, fontFace: FONT, fontSize: 11 },
          })),
          ...spec.rows.map((row) =>
            row.map((value, i) => ({
              text: value,
              options: { color: i === 0 ? NAVY : TEXT, bold: i === 0, fontFace: FONT, fontSize: 10 },
            })),
          ),
        ];
        s.addTable(tRows, {
          x: 0.8, y: 1.7, w: 11.7,
          border: { type: "solid", color: DIVIDER, pt: 0.5 },
        });
        addFooter(s, model, design);
        break;
      }
      case "citations": {
        const s = contentSlide(pptx, design);
        s.addText("Evidence and citations", {
          x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
        });
        const rows: PptxGenJS.TableRow[] = [
          ["Ref", "Source", "Location", "Owner"].map((t) => ({
            text: t,
            options: { bold: true, color: headerStyle.color, fill: { color: headerStyle.fill }, fontFace: FONT, fontSize: 11 },
          })),
          ...model.citations.map((c) => [
            { text: c.id, options: { color: accent, bold: true, fontFace: FONT, fontSize: 10 } },
            { text: `${c.docTitle} (v${c.version})`, options: { color: TEXT, fontFace: FONT, fontSize: 10 } },
            { text: c.sourceLoc, options: { color: TEXT, fontFace: FONT, fontSize: 10 } },
            { text: c.owner, options: { color: TEXT, fontFace: FONT, fontSize: 10 } },
          ]),
        ];
        s.addTable(rows, {
          x: 0.8, y: 1.5, w: 11.7, colW: [1.1, 5.4, 2.8, 2.4],
          border: { type: "solid", color: DIVIDER, pt: 0.5 },
        });
        addFooter(s, model, design);
        break;
      }
      case "disclaimers": {
        const s = contentSlide(pptx, design);
        s.addText("Disclaimers", {
          x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
        });
        s.addText(
          model.disclaimers.map((d) => `${d.name}: ${d.text}`).join("\n\n"),
          { x: 0.8, y: 1.6, w: 11.7, h: 4.8, fontFace: FONT, fontSize: 12, color: MUTED, valign: "top" },
        );
        addFooter(s, model, design);
        break;
      }
    }
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
