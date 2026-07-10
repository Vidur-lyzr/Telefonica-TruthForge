// .pptx renderer — Telefónica corporate slide template: navy title slide with
// the brand-blue accent, one slide per section, chart slides from the
// deterministic chart engine, and a citations slide. Colours come from the
// shared export palette.

import PptxGenJS from "pptxgenjs";
import type { ExportDocumentModel } from "../exportService";
import { EXPORT_PALETTE } from "../chartEngine";

const BRAND = EXPORT_PALETTE.brand;
const NAVY = EXPORT_PALETTE.navy;
const TEXT = EXPORT_PALETTE.textPrimary;
const MUTED = EXPORT_PALETTE.textSecondary;
const FONT = "Telefonica Sans";

function addFooter(slide: PptxGenJS.Slide, model: ExportDocumentModel): void {
  slide.addText("Telefónica · Hub SSoT governed export", {
    x: 0.4,
    y: 6.9,
    w: 6,
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

export async function renderPptx(model: ExportDocumentModel): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";
  pptx.author = "Hub SSoT";
  pptx.title = model.title;

  // Title slide
  const title = pptx.addSlide();
  title.background = { color: NAVY };
  title.addShape("rect", { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: BRAND } });
  title.addText("Telefónica", {
    x: 0.8, y: 0.7, w: 6, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: BRAND,
  });
  title.addText(model.title, {
    x: 0.8, y: 2.6, w: 11.6, h: 1.8, fontFace: FONT, fontSize: 40, bold: true, color: "FFFFFF",
  });
  title.addText(model.subtitle, {
    x: 0.8, y: 4.4, w: 11.6, h: 0.6, fontFace: FONT, fontSize: 16, color: "C7D6F0",
  });
  title.addText(
    `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · every figure cited`,
    { x: 0.8, y: 6.6, w: 11, h: 0.4, fontFace: FONT, fontSize: 11, color: "8FA6C9" },
  );

  // Umbrella slide
  if (model.umbrella) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: BRAND } });
    s.addText("Umbrella message", {
      x: 0.8, y: 0.6, w: 11.6, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: NAVY,
    });
    s.addText(model.umbrella, {
      x: 0.8, y: 2.0, w: 11.6, h: 3.4, fontFace: FONT, fontSize: 26, bold: true, color: BRAND,
    });
    addFooter(s, model);
  }

  // Section slides
  for (const section of model.sections) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: BRAND } });
    s.addText(section.heading, {
      x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
    });
    if (section.internalOnly) {
      s.addText("Internal only — not for external distribution", {
        x: 0.8, y: 1.15, w: 11.6, h: 0.35, fontFace: FONT, fontSize: 12, italic: true, color: MUTED,
      });
    }
    s.addText(section.body, {
      x: 0.8, y: 1.7, w: 11.7, h: 4.9, fontFace: FONT, fontSize: 15, color: TEXT, valign: "top",
      lineSpacingMultiple: 1.2,
    });
    addFooter(s, model);
  }

  // Chart slides
  for (const chart of model.charts) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: BRAND } });
    s.addImage({
      data: `image/png;base64,${chart.png.toString("base64")}`,
      x: 1.9, y: 0.9, w: 9.6, h: 5.0,
    });
    addFooter(s, model);
  }

  // Cited data-table slides
  for (const table of model.tables) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: BRAND } });
    s.addText(table.title, {
      x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
    });
    s.addText(
      `Source: ${table.source}${table.citationId ? ` · cited [${table.citationId}]` : ""}`,
      { x: 0.8, y: 1.15, w: 11.6, h: 0.35, fontFace: FONT, fontSize: 12, color: MUTED },
    );
    const tRows: PptxGenJS.TableRow[] = [
      table.columns.map((t) => ({
        text: t,
        options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontFace: FONT, fontSize: 11 },
      })),
      ...table.rows.map((row) =>
        row.map((value, i) => ({
          text: value,
          options: { color: i === 0 ? NAVY : TEXT, bold: i === 0, fontFace: FONT, fontSize: 10 },
        })),
      ),
    ];
    s.addTable(tRows, {
      x: 0.8, y: 1.7, w: 11.7,
      border: { type: "solid", color: "DDDDDD", pt: 0.5 },
    });
    addFooter(s, model);
  }

  // Citations slide
  if (model.citations.length > 0) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: BRAND } });
    s.addText("Evidence and citations", {
      x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
    });
    const rows: PptxGenJS.TableRow[] = [
      ["Ref", "Source", "Location", "Owner"].map((t) => ({
        text: t,
        options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontFace: FONT, fontSize: 11 },
      })),
      ...model.citations.map((c) => [
        { text: c.id, options: { color: BRAND, bold: true, fontFace: FONT, fontSize: 10 } },
        { text: `${c.docTitle} (v${c.version})`, options: { color: TEXT, fontFace: FONT, fontSize: 10 } },
        { text: c.sourceLoc, options: { color: TEXT, fontFace: FONT, fontSize: 10 } },
        { text: c.owner, options: { color: TEXT, fontFace: FONT, fontSize: 10 } },
      ]),
    ];
    s.addTable(rows, {
      x: 0.8, y: 1.5, w: 11.7, colW: [1.1, 5.4, 2.8, 2.4],
      border: { type: "solid", color: "DDDDDD", pt: 0.5 },
    });
    addFooter(s, model);
  }

  // Disclaimers slide
  if (model.disclaimers.length > 0) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: BRAND } });
    s.addText("Disclaimers", {
      x: 0.8, y: 0.5, w: 11.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY,
    });
    s.addText(
      model.disclaimers.map((d) => `${d.name}: ${d.text}`).join("\n\n"),
      { x: 0.8, y: 1.6, w: 11.7, h: 4.8, fontFace: FONT, fontSize: 12, color: MUTED, valign: "top" },
    );
    addFooter(s, model);
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
