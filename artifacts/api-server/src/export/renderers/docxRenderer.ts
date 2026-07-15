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
const FONT = BRAND_FONT_FAMILY;

function h(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: DOCX_SPACE.beforeH1, after: DOCX_SPACE.afterH1 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: BRAND, space: 8 },
    },
    children: [new TextRun({ text, bold: true, color: NAVY, size: DOCX_SIZE.h1, font: FONT })],
  });
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

function headerCell(label: string, widthDxa: number): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: label, bold: true, color: "FFFFFF", size: DOCX_SIZE.small, font: FONT }),
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
function brandedTable(columns: string[], rows: string[][], weights: number[]): Table {
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
        children: columns.map((label, i) => headerCell(label, widths[i])),
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

export async function renderDocx(model: ExportDocumentModel): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Branded cover: brand rule, five-dot mark next to the wordmark, title
  // block, subtitle and governed-output meta.
  children.push(
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND },
      spacing: { after: 240 },
      children: [new TextRun({ text: " ", size: 8 })],
    }),
    new Paragraph({
      spacing: { before: 200, after: 240 },
      children: [
        new ImageRun({
          type: "png",
          data: brandMarkPng(120, THEME_COLORS.brand),
          transformation: { width: 26, height: 26 },
        }),
        new TextRun({ text: "  Telefónica", bold: true, color: BRAND, size: DOCX_SIZE.h1, font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: model.title, bold: true, color: NAVY, size: DOCX_SIZE.coverTitle, font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: model.subtitle, color: MUTED, size: DOCX_SIZE.coverSubtitle, font: FONT }),
      ],
    }),
    meta(
      `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })} · Hub SSoT governed output · every figure cited`,
    ),
    new Paragraph({
      spacing: { after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DIVIDER, space: 4 } },
      children: [new TextRun({ text: " ", size: 8 })],
    }),
  );

  if (model.umbrella) {
    children.push(h("Umbrella message"));
    children.push(
      new Paragraph({
        spacing: { after: DOCX_SPACE.afterBody, line: DOCX_SPACE.bodyLine },
        shading: { type: ShadingType.SOLID, color: hex(THEME_COLORS.brandLow), fill: hex(THEME_COLORS.brandLow) },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: BRAND, space: 8 },
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
    children.push(h(model.qaHeading ?? "Q&A"));
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
    children.push(h(section.heading));
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
    children.push(h(table.title));
    children.push(
      meta(`Source: ${table.source}${table.citationId ? ` · cited [${table.citationId}]` : ""}`),
    );
    children.push(brandedTable(table.columns, table.rows, dataTableWeights(table.columns.length)));
  }

  if (model.spokesperson.length > 0) {
    children.push(h("Spokesperson guidance (internal only)"));
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
    children.push(h("Evidence and citations"));
    children.push(
      brandedTable(
        ["Ref", "Source", "Location", "Owner"],
        model.citations.map((c) => [c.id, `${c.docTitle} (v${c.version})`, c.sourceLoc, c.owner]),
        [...CITATION_TABLE_WEIGHTS],
      ),
    );
  }

  if (model.disclaimers.length > 0) {
    children.push(h("Disclaimers"));
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
                    text: `Telefónica — Hub SSoT governed export · ${model.confidentiality} · page `,
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
