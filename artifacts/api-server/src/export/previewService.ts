// Export preview service — renders EXACTLY what a download would produce,
// as a PDF the browser can display inline:
//
//  - pdf  → the real renderPdf output (byte-identical pipeline; exact: true)
//  - pptx → pdfkit mirror of the pptx renderer over the SAME shared slide
//           model, every coordinate * 72 (960x540pt pages)
//  - docx → pdfkit mirror of the docx renderer at A4 with the same DOCX
//           geometry, type scale and spacing (print-preview approximation)
//
// Governance: the preview runs the same content pipeline as a real export
// (assertExportable + destination confidentiality gate + template check) but
// intentionally does NOT hard-fail on the RELEASE gates (guardian, scheduled
// approval, editorial review) — those only block the final download. Their
// live status is always computed and returned so the UI shows exactly which
// gates would block the download. Content gates (confidentiality, not
// exportable) still refuse the preview outright: a user must never SEE
// content they could not export.

import type { GeneratedDraft } from "../agent/generateAgent";
import {
  buildExportModel,
  computeGateStatus,
  ExportRefusedError,
  type ExportDestination,
  type ExportGateStatus,
} from "./exportService";
import { renderPdf } from "./renderers/pdfRenderer";
import { renderPptxPreviewPdf } from "./renderers/pptxPreviewPdf";
import { renderDocxPreviewPdf } from "./renderers/docxPreviewPdf";

export type PreviewFormat = "pdf" | "docx" | "pptx";

export interface ExportPreviewResult {
  status: "ok" | "refused";
  format: PreviewFormat;
  pdfBase64: string | null;
  // true when the preview bytes come from the identical pipeline as the
  // download (pdf); false for the pptx/docx pdfkit mirrors.
  exact: boolean;
  templateId: string | null;
  gates: ExportGateStatus;
  refusedCode: string | null;
  refusedMessage: string | null;
}

export async function renderExportPreview(
  draft: GeneratedDraft,
  format: PreviewFormat,
  destination: ExportDestination,
  templateId?: string | null,
): Promise<ExportPreviewResult> {
  const gates = computeGateStatus(draft);
  try {
    const model = buildExportModel(draft, destination, templateId, {
      releaseGates: false,
    });
    if (!model.template.formats.includes(format)) {
      throw new ExportRefusedError(
        "not_exportable",
        `The "${model.template.name}" template does not export as .${format}.`,
      );
    }
    const buffer =
      format === "pdf"
        ? await renderPdf(model)
        : format === "pptx"
          ? await renderPptxPreviewPdf(model)
          : await renderDocxPreviewPdf(model);
    return {
      status: "ok",
      format,
      pdfBase64: buffer.toString("base64"),
      exact: format === "pdf",
      templateId: model.template.id,
      gates,
      refusedCode: null,
      refusedMessage: null,
    };
  } catch (err) {
    if (err instanceof ExportRefusedError) {
      return {
        status: "refused",
        format,
        pdfBase64: null,
        exact: false,
        templateId: templateId ?? null,
        gates,
        refusedCode: err.code,
        refusedMessage: err.message,
      };
    }
    throw err;
  }
}
