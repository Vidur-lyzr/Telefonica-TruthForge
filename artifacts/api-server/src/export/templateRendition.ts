// Full-document renditions of an export template's built-in illustrative
// sample, rendered through the SAME renderers the real export pipeline uses:
//
//  - pdf  → the real renderPdf output (exact: true)
//  - pptx → the pdfkit mirror of the pptx renderer (print rendition)
//  - docx → the pdfkit mirror of the docx renderer (print rendition)
//
// The content is a fixed, fictional sample that lives server-side on each
// template — no governed corpus content and no draft is involved, so no
// governance gate applies. What IS enforced is the template itself: an
// unsaved edit passed for live preview is validated exactly like a saved one.

import type { ExportDocumentModel } from "./exportService";
import type { ExportTemplate } from "./exportTemplates";
import { renderChart, type ExportSeries } from "./chartEngine";
import { renderPdf } from "./renderers/pdfRenderer";
import { renderPptxPreviewPdf } from "./renderers/pptxPreviewPdf";
import { renderDocxPreviewPdf } from "./renderers/docxPreviewPdf";
import {
  effectiveTemplate,
  applyTemplateEdit,
  validateTemplateEdit,
  TemplateEditError,
  type TemplateEdit,
} from "../data/templateOverrides";

export type RenditionFormat = "pdf" | "docx" | "pptx";

// Fictional provenance shown in the citations block so the sample document
// demonstrates the full evidence layout. Clearly synthetic, clearly labelled.
const SAMPLE_CITATIONS = [
  {
    id: "S1",
    docTitle: "Sample source — Q1 2026 results pack (illustrative)",
    sourceLoc: "Section 2, p. 4",
    version: "v1.0",
    owner: "Template sample",
    confidentiality: "internal",
    snippet:
      "Illustrative evidence line used by the template sample. Real exports cite governed corpus sources here.",
  },
  {
    id: "S2",
    docTitle: "Sample source — brand narrative anchors (illustrative)",
    sourceLoc: "Anchor 3",
    version: "v1.0",
    owner: "Template sample",
    confidentiality: "internal",
    snippet:
      "Second illustrative evidence line. Citation chips in a real document resolve to the knowledge core.",
  },
];

function sectionBody(section: {
  paragraphs: string[];
  bullets?: string[];
}): string {
  const parts = [...section.paragraphs];
  if (section.bullets && section.bullets.length > 0) {
    parts.push(section.bullets.map((b) => `- ${b}`).join("\n"));
  }
  return parts.join("\n\n");
}

// Build the shared renderer model from the template's own sample payload.
export function sampleExportModel(template: ExportTemplate): ExportDocumentModel {
  const sample = template.sample;
  const wantsCharts = template.blocks.some((b) => b.kind === "charts");
  const wantsTables = template.blocks.some(
    (b) => b.kind === "table" || b.kind === "charts",
  );
  const charts = wantsCharts
    ? [
        renderChart({
          id: "sample-chart",
          label: sample.chart.label,
          unit: sample.chart.unit,
          source: sample.chart.source,
          citationId: "S1",
          points: sample.chart.points,
        } satisfies ExportSeries),
      ]
    : [];
  const tables = wantsTables
    ? [
        {
          title: sample.table.title,
          unit: "",
          source: sample.table.source,
          citationId: "S1",
          columns: sample.table.columns,
          rows: sample.table.rows,
        },
      ]
    : [];
  return {
    template,
    title: sample.title,
    subtitle: sample.subtitle,
    language: "en",
    audience: "internal",
    confidentiality: "internal",
    destination: "internal",
    generatedAt: new Date().toISOString(),
    umbrella: null,
    sections: sample.sections.map((s) => ({
      heading: s.heading,
      body: sectionBody(s),
      internalOnly: false,
      isQa: false,
    })),
    qa: [],
    qaHeading: null,
    spokesperson: [],
    charts,
    tables,
    visualSlides: [],
    citations: SAMPLE_CITATIONS,
    disclaimers: [
      {
        name: "Illustrative sample",
        text: "This rendition shows the template design over fixed sample content. Real exports carry governed, cited content from the knowledge core.",
      },
    ],
  };
}

export interface TemplateRenditionResult {
  pdfBase64: string;
  exact: boolean;
}

export async function renderTemplateRendition(
  templateId: string,
  format: RenditionFormat,
  override?: TemplateEdit,
): Promise<TemplateRenditionResult | null> {
  const base = effectiveTemplate(templateId);
  if (!base) return null;
  let template: ExportTemplate = base;
  if (override) {
    validateTemplateEdit(base, override);
    template = applyTemplateEdit(base, override);
  }
  if (!template.formats.includes(format)) {
    throw new TemplateEditError(
      `The "${template.name}" template does not export as .${format}.`,
    );
  }
  const model = sampleExportModel(template);
  const buffer =
    format === "pdf"
      ? await renderPdf(model)
      : format === "pptx"
        ? await renderPptxPreviewPdf(model)
        : await renderDocxPreviewPdf(model);
  return { pdfBase64: buffer.toString("base64"), exact: format === "pdf" };
}
