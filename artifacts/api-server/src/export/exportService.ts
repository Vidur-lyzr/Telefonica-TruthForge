// Export service — turns a governed, guardian-passed draft into a real
// downloadable document. Governance is enforced HERE, server-side, before any
// byte is rendered:
//
//  1. The Brand Guardian is re-run on the submitted draft; a block means no
//     export, whatever the client claims.
//  2. Scheduled drafts must have been approved in the review inbox and must
//     still match the approved content hash (same server-authoritative gate as
//     versioning).
//  3. Destination confidentiality: an EXTERNAL destination never receives
//     non-public content. Internal-only sections and spokesperson guidance are
//     stripped, and if the draft itself (or any cited source) is above public,
//     the export is refused rather than silently truncated.

import { runBrandGuardian } from "../agent/brandGuardian";
import type { GeneratedDraft } from "../agent/generateAgent";
import { DOCS } from "../data/corpus";
import {
  findScheduledReviewItemId,
  findEditorialReview,
  getReviewItem,
  hashDraftContent,
} from "../data/generateStore";
import { renderChart, type RenderedChart, type ExportSeries } from "./chartEngine";
import {
  getExportTemplate,
  defaultTemplateForShape,
  type ExportTemplate,
  type ExportFormat,
} from "./exportTemplates";
import { renderDocx } from "./renderers/docxRenderer";
import { renderPptx } from "./renderers/pptxRenderer";
import { renderPdf } from "./renderers/pdfRenderer";

export type ExportDestination = "internal" | "external";

// The normalised, already-gated document model shared by all three renderers.
export interface ExportDocumentModel {
  template: ExportTemplate;
  title: string;
  subtitle: string;
  language: string;
  audience: string;
  confidentiality: string;
  destination: ExportDestination;
  generatedAt: string;
  umbrella: string | null;
  sections: { heading: string; body: string; internalOnly: boolean }[];
  spokesperson: { question: string; guidance: string; doNotSay: string | null }[];
  charts: RenderedChart[];
  citations: {
    id: string;
    docTitle: string;
    sourceLoc: string;
    version: string;
    owner: string;
    confidentiality: string;
    snippet: string;
  }[];
  disclaimers: { name: string; text: string }[];
}

export class ExportRefusedError extends Error {
  constructor(
    public readonly code:
      | "guardian_blocked"
      | "approval_required"
      | "editorial_review_required"
      | "confidentiality_blocked"
      | "not_exportable",
    message: string,
  ) {
    super(message);
    this.name = "ExportRefusedError";
  }
}

const PUBLIC = "public";

function assertExportable(draft: GeneratedDraft): void {
  if (draft.status !== "drafted" || draft.sections.length === 0) {
    throw new ExportRefusedError(
      "not_exportable",
      "Only a drafted document with content can be exported.",
    );
  }
}

function assertGuardian(draft: GeneratedDraft): void {
  const guardian = runBrandGuardian(draft);
  if (guardian.status !== "pass") {
    const first = guardian.findings.find((f) => f.severity === "error");
    throw new ExportRefusedError(
      "guardian_blocked",
      first
        ? `The Brand Guardian blocks this export: ${first.message}`
        : "The Brand Guardian must pass before this document can be exported.",
    );
  }
}

function assertScheduledApproval(draft: GeneratedDraft): void {
  const submittedHash = hashDraftContent(draft);
  // Look the lineage up by every server-known key we have: the draft id, the
  // content hash, AND the review item the server stamped on the draft when it
  // entered the scheduled pipeline. A client that mutates the draft id alone
  // therefore cannot shake off scheduled provenance.
  const lineageKeys = [draft.id, submittedHash];
  if (draft.reviewItemId) lineageKeys.push(draft.reviewItemId);
  const reviewItemId =
    findScheduledReviewItemId(lineageKeys) ??
    (draft.reviewItemId && getReviewItem(draft.reviewItemId) ? draft.reviewItemId : undefined);
  if (!reviewItemId) return;
  const item = getReviewItem(reviewItemId);
  if (!item || item.status !== "approved" || item.approvedHash !== submittedHash) {
    throw new ExportRefusedError(
      "approval_required",
      "Scheduled documents must be approved in the review inbox before export, and the content must match the approved version.",
    );
  }
}

// Press releases carry a mandatory editorial-review step before ANY export.
// Server-authoritative: the review registry is keyed by content hash, so a
// post-review edit voids the review and the export is refused again.
function assertEditorialReview(draft: GeneratedDraft): void {
  if (draft.shape !== "press") return;
  const review = findEditorialReview(hashDraftContent(draft));
  if (!review) {
    throw new ExportRefusedError(
      "editorial_review_required",
      "A press release must pass the editorial review before it can be exported. Mark it reviewed in the editor — any later edit voids the review.",
    );
  }
}

// External destination: refuse when anything non-public would be carried.
function gateDestination(draft: GeneratedDraft, destination: ExportDestination): void {
  if (destination !== "external") return;
  if (draft.confidentiality !== PUBLIC) {
    throw new ExportRefusedError(
      "confidentiality_blocked",
      `This document is classified "${draft.confidentiality}". An external export may only carry public content — regenerate it for an external audience first.`,
    );
  }
  // Re-derive each citation's confidentiality from the server-side corpus
  // rather than trusting the client-supplied label. Unknown docIds fail closed.
  const nonPublic: string[] = [];
  for (const c of draft.citations) {
    const doc = DOCS.find((d) => d.id === c.docId);
    if (!doc) {
      throw new ExportRefusedError(
        "confidentiality_blocked",
        `Citation ${c.id} references an unknown source document — the export cannot be verified for an external destination.`,
      );
    }
    if (doc.confidentiality !== PUBLIC || c.confidentiality !== PUBLIC) {
      nonPublic.push(c.id);
    }
  }
  if (nonPublic.length > 0) {
    throw new ExportRefusedError(
      "confidentiality_blocked",
      `This document cites non-public sources (${nonPublic.join(", ")}). An external export may only cite public material.`,
    );
  }
}

// The canvas editor stores emphasis as markdown-style markers (**bold**,
// *italic*) inside the plain-text body. Export renderers are plain-text, so
// strip the markers to keep exported copy clean.
function stripEmphasisMarkers(text: string): string {
  return text
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1$2");
}

export function buildExportModel(
  draft: GeneratedDraft,
  destination: ExportDestination,
  templateId?: string | null,
): ExportDocumentModel {
  assertExportable(draft);
  assertGuardian(draft);
  assertScheduledApproval(draft);
  assertEditorialReview(draft);
  gateDestination(draft, destination);

  const template =
    (templateId ? getExportTemplate(templateId) : undefined) ??
    defaultTemplateForShape(draft.shape);
  if (templateId && !getExportTemplate(templateId)) {
    throw new ExportRefusedError("not_exportable", "Unknown export template.");
  }

  const external = destination === "external";
  // Strip internal-only material for external destinations even though the
  // confidentiality gate above should already have kept it public — belt and
  // braces, fail closed.
  const sections = draft.sections
    .filter((s) => !(external && s.internalOnly))
    .map((s) => ({
      heading: s.heading,
      body: stripEmphasisMarkers(s.body),
      internalOnly: s.internalOnly,
    }));
  const spokesperson = external
    ? []
    : draft.spokesperson.map((s) => ({
        question: s.question,
        guidance: s.guidance,
        doNotSay: s.doNotSay ?? null,
      }));

  const wantsCharts = template.blocks.some((b) => b.kind === "charts");
  const charts: RenderedChart[] = wantsCharts
    ? draft.charts.map((c) =>
        renderChart({
          id: c.id,
          label: c.title,
          unit: c.unit,
          source: c.source,
          citationId: c.citationId ?? null,
          points: c.points,
        } satisfies ExportSeries),
      )
    : [];

  return {
    template,
    title: draft.title,
    subtitle: `${template.name} · ${draft.language.toUpperCase()} · ${destination === "external" ? "External" : "Internal"} · ${draft.confidentiality}`,
    language: draft.language,
    audience: draft.audience,
    confidentiality: draft.confidentiality,
    destination,
    generatedAt: new Date().toISOString(),
    umbrella: draft.umbrella ? stripEmphasisMarkers(draft.umbrella) : null,
    sections,
    spokesperson,
    charts,
    citations: draft.citations.map((c) => ({
      id: c.id,
      docTitle: c.docTitle,
      sourceLoc: c.sourceLoc,
      version: c.version,
      owner: c.owner,
      confidentiality: c.confidentiality,
      snippet: c.snippet,
    })),
    disclaimers: draft.disclaimers.map((d) => ({ name: d.name, text: d.text })),
  };
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  templateId: string;
  chartCount: number;
}

const CONTENT_TYPES: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};

function safeFilename(title: string, format: ExportFormat): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  return `${base || "document"}.${format}`;
}

export async function exportDraft(
  draft: GeneratedDraft,
  format: ExportFormat,
  destination: ExportDestination,
  templateId?: string | null,
): Promise<ExportResult> {
  const model = buildExportModel(draft, destination, templateId);
  if (!model.template.formats.includes(format)) {
    throw new ExportRefusedError(
      "not_exportable",
      `The "${model.template.name}" template does not export as .${format}.`,
    );
  }
  const buffer =
    format === "docx"
      ? await renderDocx(model)
      : format === "pptx"
        ? await renderPptx(model)
        : await renderPdf(model);
  return {
    buffer,
    contentType: CONTENT_TYPES[format],
    filename: safeFilename(draft.title, format),
    templateId: model.template.id,
    chartCount: model.charts.length,
  };
}
