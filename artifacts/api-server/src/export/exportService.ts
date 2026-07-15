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
import {
  parseQaBody,
  provenanceForAnswer,
  normalizeQuestion,
} from "../agent/qa";
import { renderChart, type RenderedChart, type ExportSeries } from "./chartEngine";
import type { ExportTemplate, ExportFormat } from "./exportTemplates";
// Effective template resolution: exports always follow any saved edit of the
// corporate template until it is reset.
import {
  effectiveTemplate as getExportTemplate,
  effectiveDefaultTemplateForShape as defaultTemplateForShape,
} from "../data/templateOverrides";
import JSZip from "jszip";
import { renderDocx } from "./renderers/docxRenderer";
import { renderPptx } from "./renderers/pptxRenderer";
import { renderPdf } from "./renderers/pdfRenderer";
import { renderTxt, renderMd } from "./renderers/textRenderer";

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
  sections: { heading: string; body: string; internalOnly: boolean; isQa: boolean }[];
  // Structured Q&A (press shape): per-answer provenance derived from the
  // server corpus and, for INTERNAL destinations only, the per-answer internal
  // note. External destinations always receive note: null — stripped here,
  // server-side, regardless of what the client sent.
  qa: {
    question: string;
    answer: string;
    provenance: { citationId: string; docTitle: string; version: string; date: string; owner: string }[];
    note: string | null;
  }[];
  qaHeading: string | null;
  spokesperson: { question: string; guidance: string; doNotSay: string | null }[];
  charts: RenderedChart[];
  tables: {
    title: string;
    unit: string;
    source: string;
    citationId: string | null;
    columns: string[];
    rows: string[][];
  }[];
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
    .replace(/^#{2,3}\s+/gm, "")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1$2");
}

// Release gates (guardian / scheduled approval / editorial review) decide
// whether a document may LEAVE the system — they are skippable for the
// on-screen WYSIWYG preview of a draft still being edited. Confidentiality
// gates (gateDestination + the external stripping below) are NEVER skippable:
// a preview obeys exactly the same secrecy rules as a download.
export interface BuildExportModelOptions {
  releaseGates?: boolean;
}

// Would-block status of each release gate, computed by running the very gate
// functions a real export enforces — never a parallel reimplementation.
export interface ExportGateStatus {
  guardian: { blocked: boolean; message: string | null };
  approval: { blocked: boolean; message: string | null };
  editorial: { blocked: boolean; message: string | null };
}

function gateStatusOf(fn: () => void): { blocked: boolean; message: string | null } {
  try {
    fn();
    return { blocked: false, message: null };
  } catch (err) {
    if (err instanceof ExportRefusedError) {
      return { blocked: true, message: err.message };
    }
    throw err;
  }
}

export function computeGateStatus(draft: GeneratedDraft): ExportGateStatus {
  return {
    guardian: gateStatusOf(() => assertGuardian(draft)),
    approval: gateStatusOf(() => assertScheduledApproval(draft)),
    editorial: gateStatusOf(() => assertEditorialReview(draft)),
  };
}

export function buildExportModel(
  draft: GeneratedDraft,
  destination: ExportDestination,
  templateId?: string | null,
  options?: BuildExportModelOptions,
): ExportDocumentModel {
  const releaseGates = options?.releaseGates !== false;
  assertExportable(draft);
  if (releaseGates) {
    assertGuardian(draft);
    assertScheduledApproval(draft);
    assertEditorialReview(draft);
  }
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
      isQa: s.kind === "qa",
    }));

  // Structured Q&A: parsed from the gated section body (single source of
  // truth), provenance re-derived from the draft citations, and internal notes
  // attached ONLY for internal destinations. External exports never carry a
  // note, whatever the client submitted.
  const qaSection = sections.find((s) => s.isQa);
  const qa = qaSection
    ? parseQaBody(qaSection.body).map((p) => ({
        question: p.question,
        answer: p.answer,
        provenance: provenanceForAnswer(p.answer, draft.citations),
        note: external
          ? null
          : (draft.qaNotes ?? []).find(
              (n) => normalizeQuestion(n.question) === normalizeQuestion(p.question),
            )?.note ?? null,
      }))
    : [];
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

  // Cited data tables travel with any template that carries data blocks
  // (table or charts). They come from the same destination-gated series the
  // charts were built from, so no extra confidentiality gate is needed here.
  const wantsTables = template.blocks.some(
    (b) => b.kind === "table" || b.kind === "charts",
  );
  const tables = wantsTables
    ? (draft.tables ?? []).map((t) => ({
        title: t.title,
        unit: t.unit,
        source: t.source,
        citationId: t.citationId ?? null,
        columns: t.columns,
        rows: t.rows,
      }))
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
    // The raw Q&A section stays in `sections` (pptx/pdf render it as plain
    // text and never see notes); the docx renderer skips isQa sections and
    // renders the structured `qa` block instead — never both.
    sections,
    qa,
    qaHeading: qa.length > 0 ? (qaSection?.heading ?? "Q&A") : null,
    spokesperson,
    charts,
    tables,
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
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
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
        : format === "pdf"
          ? await renderPdf(model)
          : format === "txt"
            ? renderTxt(model)
            : renderMd(model);
  return {
    buffer,
    contentType: CONTENT_TYPES[format],
    filename: safeFilename(draft.title, format),
    templateId: model.template.id,
    chartCount: model.charts.length,
  };
}

// Bundle several formats of the same governed draft into one ZIP. Every
// governance gate runs exactly as in a single-format export (buildExportModel
// is called per format via exportDraft), so a pack can never bypass a refusal
// a single download would hit.
export async function exportPack(
  draft: GeneratedDraft,
  formats: ExportFormat[],
  destination: ExportDestination,
  templateId?: string | null,
): Promise<ExportResult> {
  const model = buildExportModel(draft, destination, templateId);
  const allowed = model.template.formats;
  const requested = formats.length > 0 ? formats : allowed;
  const unique = Array.from(new Set(requested));
  const bad = unique.filter((f) => !allowed.includes(f));
  if (bad.length > 0) {
    throw new ExportRefusedError(
      "not_exportable",
      `The "${model.template.name}" template does not export as ${bad.map((f) => `.${f}`).join(", ")}.`,
    );
  }
  const zip = new JSZip();
  let chartCount = 0;
  for (const format of unique) {
    const result = await exportDraft(draft, format, destination, templateId);
    zip.file(result.filename, result.buffer);
    chartCount = result.chartCount;
  }
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  const base = safeFilename(draft.title, "txt").replace(/\.txt$/, "");
  return {
    buffer,
    contentType: "application/zip",
    filename: `${base}-pack.zip`,
    templateId: model.template.id,
    chartCount,
  };
}
