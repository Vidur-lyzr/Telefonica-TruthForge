// .docx renderer — Telefónica corporate Word template, driven entirely by the
// deterministic export theme (exportTheme.ts): brand cover, Telefónica-styled
// headings, cited body with bullet support, embedded on-brand charts, and
// FIXED-layout tables with explicit DXA column widths so no viewer can ever
// collapse a column (the historic one-character-per-line bug).

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  TableLayoutType,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  VerticalAlign,
  Footer,
  PageNumber,
} from "docx";
import type { ExportDocumentModel } from "../exportService";
import type { TemplateDesign } from "../exportTemplates";
import { brandFont, brandMarkPng, BRAND_FONT_FAMILY } from "../brandAssets";
import {
  THEME_COLORS,
  DOCX_PAGE,
  DOCX_SIZE,
  DOCX_SPACE,
  docxColumnWidths,
  dataTableWeights,
  CITATION_TABLE_WEIGHTS,
} from "../exportTheme";

const hex = (c: string) => c.replace("#", "");
const BRAND = hex(THEME_COLORS.brand);
const NAVY = hex(THEME_COLORS.navy);
const TEXT = hex(THEME_COLORS.textPrimary);
const MUTED = hex(THEME_COLORS.textSecondary);
const DIVIDER = hex(THEME_COLORS.divider);
const ZEBRA = hex(THEME_COLORS.backgroundAlt);
const WARN_BG = hex(THEME_COLORS.warningLow);
const WARN_TX = hex(THEME_COLORS.warningHigh);
const BRAND_LOW = hex(THEME_COLORS.brandLow);
const INVERSE = "FFFFFF";
const INV_SEC = hex(THEME_COLORS.inverseSecondary);
const INV_TER = hex(THEME_COLORS.inverseTertiary);
const FONT = BRAND_FONT_FAMILY;

// The template design drives accent colour, heading treatment, table header
// fill, cover layout and the running footer — mapped onto theme tokens only.
function accentOf(design: TemplateDesign): string {
  return design.accent === "navy" ? NAVY : BRAND;
}

function h(text: string, design: TemplateDesign): Paragraph {
  const accent = accentOf(design);
  switch (design.headingStyle) {
    case "rule":
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: DOCX_SPACE.beforeH1, after: DOCX_SPACE.afterH1 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 4 },
        },
        children: [new TextRun({ text, bold: true, color: NAVY, size: DOCX_SIZE.h1, font: FONT })],
      });
    case "block":
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: DOCX_SPACE.beforeH1, after: DOCX_SPACE.afterH1 },
        shading: {
          type: ShadingType.SOLID,
          color: design.accent === "navy" ? ZEBRA : BRAND_LOW,
          fill: design.accent === "navy" ? ZEBRA : BRAND_LOW,
        },
        children: [new TextRun({ text, bold: true, color: NAVY, size: DOCX_SIZE.h1, font: FONT })],
      });
    default:
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: DOCX_SPACE.beforeH1, after: DOCX_SPACE.afterH1 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: accent, space: 8 },
        },
        children: [new TextRun({ text, bold: true, color: NAVY, size: DOCX_SIZE.h1, font: FONT })],
      });
  }
}

// Body copy with bullet support: lines starting "- " render as real Word
// bullets with a hanging indent; numbered "N. " lines render as numbered-style
// text items; everything else is a paragraph.
function body(text: string): Paragraph[] {
  const out: Paragraph[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const bullet = /^-\s+(.*)$/.exec(trimmed);
    if (bullet) {
      out.push(
        new Paragraph({
          spacing: { after: 60, line: DOCX_SPACE.bodyLine },
          indent: { left: 360, hanging: 200 },
          children: [
            new TextRun({ text: "•  ", color: BRAND, size: DOCX_SIZE.body, font: FONT, bold: true }),
            new TextRun({ text: bullet[1], color: TEXT, size: DOCX_SIZE.body, font: FONT }),
          ],
        }),
      );
      continue;
    }
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (numbered) {
      out.push(
        new Paragraph({
          spacing: { after: 60, line: DOCX_SPACE.bodyLine },
          indent: { left: 360, hanging: 240 },
          children: [
            new TextRun({ text: `${numbered[1]}.  `, color: BRAND, size: DOCX_SIZE.body, font: FONT, bold: true }),
            new TextRun({ text: numbered[2], color: TEXT, size: DOCX_SIZE.body, font: FONT }),
          ],
        }),
      );
      continue;
    }
    out.push(
      new Paragraph({
        spacing: { after: DOCX_SPACE.afterBody, line: DOCX_SPACE.bodyLine },
        children: [new TextRun({ text: trimmed, color: TEXT, size: DOCX_SIZE.body, font: FONT })],
      }),
    );
  }
  return out;
}

function meta(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, color: MUTED, size: DOCX_SIZE.caption, font: FONT })],
  });
}

const CELL_MARGINS = {
  top: DOCX_SPACE.cellMarginV,
  bottom: DOCX_SPACE.cellMarginV,
  left: DOCX_SPACE.cellMarginH,
  right: DOCX_SPACE.cellMarginH,
} as const;

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

function headerCell(label: string, widthDxa: number, design: TemplateDesign): TableCell {
  const style = tableHeaderStyleOf(design);
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: style.fill, fill: style.fill },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: label, bold: true, color: style.color, size: DOCX_SIZE.small, font: FONT }),
        ],
      }),
    ],
  });
}

function bodyCell(value: string, widthDxa: number, opts?: { bold?: boolean; zebra?: boolean }): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts?.zebra
      ? { type: ShadingType.SOLID, color: ZEBRA, fill: ZEBRA }
      : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: value,
            bold: opts?.bold ?? false,
            color: opts?.bold ? NAVY : TEXT,
            size: DOCX_SIZE.small,
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

// Fixed-layout branded table. Explicit DXA widths on the table, the column
// grid AND every cell — deterministic in Word, Pages, Google Docs and Preview.
function brandedTable(
  columns: string[],
  rows: string[][],
  weights: number[],
  design: TemplateDesign,
): Table {
  const widths = docxColumnWidths(weights);
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: DOCX_PAGE.contentWidthDxa, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: DIVIDER },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: DIVIDER },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: DIVIDER },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: columns.map((label, i) => headerCell(label, widths[i], design)),
      }),
      ...rows.map(
        (row, r) =>
          new TableRow({
            children: row.map((value, i) =>
              bodyCell(value, widths[i], { bold: i === 0, zebra: r % 2 === 1 }),
            ),
          }),
      ),
    ],
  });
}

// Cover paragraphs per design cover style. Word cannot paint a full page, so
// each variant expresses its identity through shaded blocks, rules and type
// colour — the same vocabulary at document scale.
function coverChildren(model: ExportDocumentModel, design: TemplateDesign): Paragraph[] {
  const accent = accentOf(design);
  const generated = `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} · Hub SSoT governed output · every figure cited`;

  const shadedLine = (fill: string, size = 8): Paragraph =>
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: fill, fill },
      spacing: { after: 0 },
      children: [new TextRun({ text: " ", size })],
    });

  switch (design.coverStyle) {
    case "navy-full":
    case "brand-full": {
      const bg = design.coverStyle === "navy-full" ? NAVY : BRAND;
      const markColor =
        design.coverStyle === "navy-full" ? THEME_COLORS.brand : THEME_COLORS.inverse;
      const onBg = (text: string, opts: { bold?: boolean; size: number; color?: string }) =>
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: bg, fill: bg },
          spacing: { after: 0 },
          children: [
            new TextRun({
              text,
              bold: opts.bold ?? false,
              color: opts.color ?? INVERSE,
              size: opts.size,
              font: FONT,
            }),
          ],
        });
      return [
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: bg, fill: bg },
          spacing: { after: 0 },
          children: [
            new ImageRun({
              type: "png",
              data: brandMarkPng(120, markColor),
              transformation: { width: 26, height: 26 },
            }),
            new TextRun({ text: "  Telefónica", bold: true, color: INVERSE, size: DOCX_SIZE.h1, font: FONT }),
          ],
        }),
        onBg(" ", { size: 48 }),
        onBg(model.title, { bold: true, size: DOCX_SIZE.coverTitle }),
        onBg(" ", { size: 12 }),
        onBg(model.subtitle, { size: DOCX_SIZE.coverSubtitle, color: INV_SEC }),
        onBg(generated, { size: DOCX_SIZE.coverMeta, color: INV_TER }),
        onBg(model.confidentiality.toUpperCase(), { size: DOCX_SIZE.small, color: INV_TER }),
        shadedLine(design.coverStyle === "navy-full" ? BRAND : NAVY, 10),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: " ", size: 8 })] }),
      ];
    }
    case "brand-band": {
      const onBand = (text: string, opts: { bold?: boolean; size: number; color?: string }) =>
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND },
          spacing: { after: 0 },
          children: [
            new TextRun({
              text,
              bold: opts.bold ?? false,
              color: opts.color ?? INVERSE,
              size: opts.size,
              font: FONT,
            }),
          ],
        });
      return [
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new ImageRun({
              type: "png",
              data: brandMarkPng(120, THEME_COLORS.brand),
              transformation: { width: 26, height: 26 },
            }),
            new TextRun({ text: "  Telefónica", bold: true, color: NAVY, size: DOCX_SIZE.h1, font: FONT }),
          ],
        }),
        onBand(" ", { size: 20 }),
        onBand(model.title, { bold: true, size: DOCX_SIZE.coverTitle }),
        onBand(" ", { size: 8 }),
        onBand(model.subtitle, { size: DOCX_SIZE.coverSubtitle, color: INV_SEC }),
        onBand(" ", { size: 20 }),
        new Paragraph({ spacing: { before: 160 }, children: [] }),
        meta(generated),
        new Paragraph({
          spacing: { after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DIVIDER, space: 4 } },
          children: [
            new TextRun({
              text: `${design.footerLabel} · ${model.confidentiality.toUpperCase()}`,
              color: MUTED,
              size: DOCX_SIZE.small,
              font: FONT,
            }),
          ],
        }),
      ];
    }
    case "masthead": {
      return [
        shadedLine(NAVY, 6),
        new Paragraph({
          spacing: { before: 160, after: 60 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DIVIDER, space: 6 } },
          children: [
            new ImageRun({
              type: "png",
              data: brandMarkPng(120, THEME_COLORS.navy),
              transformation: { width: 30, height: 30 },
            }),
            new TextRun({ text: "  Telefónica", bold: true, color: NAVY, size: DOCX_SIZE.coverTitle - 12, font: FONT }),
            new TextRun({ text: `   ·   ${model.template.name.toUpperCase()}`, color: MUTED, size: DOCX_SIZE.small, font: FONT }),
          ],
        }),
        new Paragraph({
          spacing: { before: 300, after: 120 },
          children: [
            new TextRun({ text: model.title, bold: true, color: NAVY, size: DOCX_SIZE.coverTitle, font: FONT }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: model.subtitle, color: MUTED, size: DOCX_SIZE.coverSubtitle, font: FONT }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          border: { top: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 6 } },
          children: [new TextRun({ text: generated, color: MUTED, size: DOCX_SIZE.caption, font: FONT })],
        }),
        new Paragraph({
          spacing: { after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
          children: [
            new TextRun({
              text: `${design.footerLabel} · ${model.confidentiality.toUpperCase()}`,
              color: MUTED,
              size: DOCX_SIZE.small,
              font: FONT,
            }),
          ],
        }),
      ];
    }
    case "split": {
      return [
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          spacing: { after: 0 },
          children: [
            new ImageRun({
              type: "png",
              data: brandMarkPng(120, THEME_COLORS.brand),
              transformation: { width: 26, height: 26 },
            }),
            new TextRun({ text: "  Telefónica", bold: true, color: INVERSE, size: DOCX_SIZE.h1, font: FONT }),
          ],
        }),
        shadedLine(BRAND, 6),
        new Paragraph({
          spacing: { before: 360, after: 120 },
          border: { left: { style: BorderStyle.SINGLE, size: 36, color: NAVY, space: 12 } },
          children: [
            new TextRun({ text: model.title, bold: true, color: NAVY, size: DOCX_SIZE.coverTitle - 4, font: FONT }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          border: { left: { style: BorderStyle.SINGLE, size: 36, color: NAVY, space: 12 } },
          children: [
            new TextRun({ text: model.subtitle, color: MUTED, size: DOCX_SIZE.coverSubtitle, font: FONT }),
          ],
        }),
        meta(generated),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: model.confidentiality.toUpperCase(),
              color: MUTED,
              size: DOCX_SIZE.small,
              font: FONT,
            }),
          ],
        }),
      ];
    }
    case "minimal": {
      const centered = (children: TextRun[] | ImageRun[], spacingAfter = 80): Paragraph =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: spacingAfter },
          children,
        });
      return [
        new Paragraph({ spacing: { before: 600 }, children: [] }),
        centered(
          [
            new ImageRun({
              type: "png",
              data: brandMarkPng(320, THEME_COLORS.brand),
              transformation: { width: 72, height: 72 },
            }),
          ],
          200,
        ),
        centered([
          new TextRun({ text: model.title, bold: true, color: NAVY, size: DOCX_SIZE.coverTitle - 4, font: FONT }),
        ]),
        centered([
          new TextRun({ text: model.subtitle, color: MUTED, size: DOCX_SIZE.coverSubtitle, font: FONT }),
        ]),
        centered([new TextRun({ text: generated, color: MUTED, size: DOCX_SIZE.caption, font: FONT })]),
        centered(
          [
            new TextRun({
              text: model.confidentiality.toUpperCase(),
              color: MUTED,
              size: DOCX_SIZE.small,
              font: FONT,
            }),
          ],
          240,
        ),
      ];
    }
  }
}

export async function renderDocx(model: ExportDocumentModel): Promise<Buffer> {
  const design = model.template.design;
  const accent = accentOf(design);
  const children: (Paragraph | Table)[] = [];

  children.push(...coverChildren(model, design));

  if (model.umbrella) {
    children.push(h("Umbrella message", design));
    children.push(
      new Paragraph({
        spacing: { after: DOCX_SPACE.afterBody, line: DOCX_SPACE.bodyLine },
        shading: {
          type: ShadingType.SOLID,
          color: design.accent === "navy" ? ZEBRA : BRAND_LOW,
          fill: design.accent === "navy" ? ZEBRA : BRAND_LOW,
        },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: accent, space: 8 },
        },
        children: [
          new TextRun({ text: model.umbrella, bold: true, color: NAVY, size: DOCX_SIZE.h2, font: FONT }),
        ],
      }),
    );
  }

  // Structured Q&A block: rendered in place of the raw Q&A section so each
  // answer carries its provenance line and, for internal exports, its note.
  const pushQaBlock = () => {
    children.push(h(model.qaHeading ?? "Q&A", design));
    for (const item of model.qa) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({ text: `Q: ${item.question}`, bold: true, color: NAVY, size: DOCX_SIZE.h2, font: FONT }),
          ],
        }),
        ...body(item.answer),
      );
      children.push(
        meta(
          item.provenance.length > 0
            ? `Sources: ${item.provenance
                .map((p) => [p.docTitle, p.version, p.date, p.owner].filter(Boolean).join(" · "))
                .join(" | ")}`
            : "Not covered by approved material — no governed source backs this answer.",
        ),
      );
      if (item.note) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            shading: { type: ShadingType.SOLID, color: WARN_BG, fill: WARN_BG },
            children: [
              new TextRun({
                text: `Internal note — not exportable externally: ${item.note}`,
                italics: true,
                color: WARN_TX,
                size: DOCX_SIZE.caption,
                font: FONT,
              }),
            ],
          }),
        );
      }
    }
  };

  for (const section of model.sections) {
    if (section.isQa && model.qa.length > 0) {
      pushQaBlock();
      continue;
    }
    children.push(h(section.heading, design));
    if (section.internalOnly) {
      children.push(meta("Internal only — not for external distribution."));
    }
    children.push(...body(section.body));
  }

  for (const chart of model.charts) {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "png",
            data: chart.png,
            transformation: {
              width: 560,
              height: Math.round((560 * chart.height) / chart.width),
            },
          }),
        ],
      }),
    );
  }

  for (const table of model.tables) {
    children.push(h(table.title, design));
    children.push(
      meta(`Source: ${table.source}${table.citationId ? ` · cited [${table.citationId}]` : ""}`),
    );
    children.push(brandedTable(table.columns, table.rows, dataTableWeights(table.columns.length), design));
  }

  if (model.spokesperson.length > 0) {
    children.push(h("Spokesperson guidance (internal only)", design));
    for (const note of model.spokesperson) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `Q: ${note.question}`, bold: true, color: NAVY, size: DOCX_SIZE.h2, font: FONT }),
          ],
        }),
        ...body(note.guidance),
      );
      if (note.doNotSay) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            shading: { type: ShadingType.SOLID, color: WARN_BG, fill: WARN_BG },
            children: [
              new TextRun({
                text: `Do not say: ${note.doNotSay}`,
                italics: true,
                color: WARN_TX,
                size: DOCX_SIZE.small,
                font: FONT,
              }),
            ],
          }),
        );
      }
    }
  }

  if (model.citations.length > 0) {
    children.push(h("Evidence and citations", design));
    children.push(
      brandedTable(
        ["Ref", "Source", "Location", "Owner"],
        model.citations.map((c) => [c.id, `${c.docTitle} (v${c.version})`, c.sourceLoc, c.owner]),
        [...CITATION_TABLE_WEIGHTS],
        design,
      ),
    );
  }

  if (model.disclaimers.length > 0) {
    children.push(h("Disclaimers", design));
    for (const d of model.disclaimers) {
      children.push(meta(`${d.name}: ${d.text}`));
    }
  }

  const doc = new Document({
    creator: "Hub SSoT",
    title: model.title,
    description: model.subtitle,
    // Embed Hanken Grotesk so the exported file renders on-brand everywhere.
    // One family entry — Word synthesizes bold/italic from the embedded face.
    fonts: [{ name: FONT, data: brandFont("regular"), characterSet: "00" }],
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: DOCX_PAGE.marginTop,
              bottom: DOCX_PAGE.marginBottom,
              left: DOCX_PAGE.marginLeft,
              right: DOCX_PAGE.marginRight,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Telefónica · ${design.footerLabel} · ${model.confidentiality} · page `,
                    color: MUTED,
                    size: DOCX_SIZE.footer,
                    font: FONT,
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: DOCX_SIZE.footer, font: FONT }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
