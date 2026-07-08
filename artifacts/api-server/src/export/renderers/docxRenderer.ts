// .docx renderer — Telefónica corporate Word template: brand-blue cover band,
// Telefónica-styled headings, cited body, embedded on-brand charts, citation
// table and disclaimers. Colours come from the shared export palette.

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
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  Footer,
  PageNumber,
} from "docx";
import type { ExportDocumentModel } from "../exportService";
import { EXPORT_PALETTE } from "../chartEngine";

const BRAND = EXPORT_PALETTE.brand.replace("#", "");
const NAVY = EXPORT_PALETTE.navy.replace("#", "");
const TEXT = EXPORT_PALETTE.textPrimary.replace("#", "");
const MUTED = EXPORT_PALETTE.textSecondary.replace("#", "");
const FONT = "Telefonica Sans";

function h(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 30, font: FONT })],
  });
}

function body(text: string): Paragraph[] {
  return text
    .split("\n")
    .filter((p) => p.trim().length > 0)
    .map(
      (p) =>
        new Paragraph({
          spacing: { after: 140, line: 300 },
          children: [new TextRun({ text: p, color: TEXT, size: 22, font: FONT })],
        }),
    );
}

function meta(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, color: MUTED, size: 18, font: FONT })],
  });
}

export async function renderDocx(model: ExportDocumentModel): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Cover band
  children.push(
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND },
      spacing: { after: 60 },
      children: [new TextRun({ text: " ", size: 8 })],
    }),
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: "Telefónica", bold: true, color: BRAND, size: 26, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: model.title, bold: true, color: NAVY, size: 52, font: FONT })],
    }),
    meta(model.subtitle),
    meta(
      `Generated ${new Date(model.generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })} · Hub SSoT governed output · every figure cited`,
    ),
  );

  if (model.umbrella) {
    children.push(h("Umbrella message"), ...body(model.umbrella));
  }

  for (const section of model.sections) {
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
            transformation: { width: 560, height: 292 },
          }),
        ],
      }),
    );
  }

  if (model.spokesperson.length > 0) {
    children.push(h("Spokesperson guidance (internal only)"));
    for (const note of model.spokesperson) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [new TextRun({ text: `Q: ${note.question}`, bold: true, color: TEXT, size: 22, font: FONT })],
        }),
        ...body(note.guidance),
      );
      if (note.doNotSay) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: `Do not say: ${note.doNotSay}`, italics: true, color: MUTED, size: 20, font: FONT })],
          }),
        );
      }
    }
  }

  if (model.citations.length > 0) {
    children.push(h("Evidence and citations"));
    const rows = [
      new TableRow({
        children: ["Ref", "Source", "Location", "Owner"].map(
          (label) =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true, color: "FFFFFF", size: 18, font: FONT })],
                }),
              ],
            }),
        ),
      }),
      ...model.citations.map(
        (c) =>
          new TableRow({
            children: [c.id, `${c.docTitle} (v${c.version})`, c.sourceLoc, c.owner].map(
              (value) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: value, color: TEXT, size: 18, font: FONT })],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows,
      }),
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
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Telefónica — Hub SSoT governed export · page ", color: MUTED, size: 16, font: FONT }),
                  new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16, font: FONT }),
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
