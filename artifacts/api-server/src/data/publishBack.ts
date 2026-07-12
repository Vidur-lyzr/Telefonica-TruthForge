// D4 — live write-back of approved drafts into the governed corpus.
//
// An approved review item can be PUBLISHED: it becomes a real category-E
// corpus document — versioned, chunked per section, registered in the local
// retrieval index and upserted to the vector index with a durable payload —
// so Ask can retrieve and cite it immediately, like any governed source.
//
// Server-authoritative by construction: the route gates on the review item's
// own status and approved content hash (never a client flag), and THIS module
// resolves version lineage from the publications registry. Publishing the
// same schedule again produces vN+1 and marks the previous publication
// superseded — in memory and in the vector-index payload — so Ask's validity
// handling (historic/superseded pointers) applies to written-back content
// exactly as it does to seeded content.

import {
  DOCS,
  AUDIT_LOG,
  CLEARANCE_RANK,
  getDoc,
  type Clearance,
  type CorpusDoc,
} from "./corpus";
import { registerDocInIndex } from "../adapters/kb";
import {
  isQdrantConfigured,
  upsertChunks,
  setDocGovernancePayload,
  type UpsertChunk,
} from "../adapters/qdrant";
import { currentTaxonomyVersion } from "./governance";
import {
  addPublication,
  findLatestPublicationForSchedule,
  type ReviewItem,
} from "./generateStore";

export class PublishRefusedError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export interface PublishResult {
  docId: string;
  title: string;
  version: number;
  upsertedChunks: number;
  supersededDocId: string | null;
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "document"
  );
}

// Citation markers ([S1], [S1, S2]) are draft-local — they reference the
// draft's own citation list, which does not exist inside a corpus chunk.
function stripCitationMarkers(text: string): string {
  return text
    .replace(/\[S\d+(?:\s*,\s*S\d+)*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function currentQuarter(): string {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
}

const SHAPE_TYPE: Record<string, string> = {
  press: "Press release",
  "talking-points": "Talking points",
  report: "Report",
  social: "Social copy",
  qa: "Q&A brief",
};

export async function publishApprovedDraft(item: ReviewItem): Promise<PublishResult> {
  const draft = item.draft;

  // Confidentiality of the published document. The draft's audience and label
  // arrive with the client-submitted draft, so they are treated as a REQUEST,
  // not a fact: the published label is clamped to be at least as restrictive
  // as the most restrictive lineage source doc that fed the draft. A lineage
  // doc that no longer exists fails closed to the most restrictive tier.
  const requested: Clearance =
    draft.audience === "external"
      ? "public"
      : draft.confidentiality in CLEARANCE_RANK
        ? (draft.confidentiality as Clearance)
        : "private";
  const lineageSourceDocIds = Array.from(new Set(draft.citations.map((c) => c.docId)));
  let confidentiality: Clearance = requested;
  for (const srcId of lineageSourceDocIds) {
    const src = getDoc(srcId);
    const srcLabel: Clearance = src ? src.confidentiality : "off_the_record";
    if (CLEARANCE_RANK[srcLabel] > CLEARANCE_RANK[confidentiality]) {
      confidentiality = srcLabel;
    }
  }

  // Internal-only sections are working material. They may live inside an
  // internal publication, but never inside a public one.
  const sections = draft.sections.filter(
    (s) =>
      s.body.trim().length > 0 && (confidentiality !== "public" || !s.internalOnly),
  );
  if (sections.length === 0) {
    throw new PublishRefusedError(
      "This draft has no publishable sections, so there is nothing to write back.",
      "empty_content",
    );
  }

  const prev = findLatestPublicationForSchedule(item.scheduleId);
  const version = (prev?.version ?? 0) + 1;
  // "doc-live-" prefix is REQUIRED: boot hydration restores only docs whose
  // id carries it, which is what makes publications survive a restart.
  let docId = `doc-live-pub-${slugify(draft.title)}-v${version}`;
  let dedupe = 1;
  while (DOCS.some((d) => d.id === docId)) {
    dedupe += 1;
    docId = `doc-live-pub-${slugify(draft.title)}-v${version}-${dedupe}`;
  }

  const topics = Array.from(
    new Set(
      draft.title
        .toLowerCase()
        .split(/[^a-z0-9áéíóúüñçãõäöß]+/i)
        .filter((w) => w.length > 3)
        .slice(0, 6)
        .concat(["published", "approved output"]),
    ),
  );

  const doc: CorpusDoc = {
    id: docId,
    category: "E",
    title: draft.title,
    country: "Group",
    brand: "Telefónica",
    entity: "Telefónica S.A.",
    quarter: currentQuarter(),
    type: SHAPE_TYPE[draft.shape] ?? "Generated document",
    confidentiality,
    owner: item.ownerLabel,
    validity: "approved",
    validUntil: null,
    language: draft.language,
    topics,
    axisIds: draft.axisIds,
    summary: `SSoT-generated ${SHAPE_TYPE[draft.shape]?.toLowerCase() ?? "document"} published from the review inbox after human approval. Version ${version} for schedule "${item.scheduleName}". Composed exclusively from governed sources; full lineage retained.`,
    areas: [],
    sourceFormat: "SSoT generated output",
    connector: "Hub write-back (review inbox)",
    frequency: "on approval",
    version: `v${version}`,
    ...(prev ? { supersedes: prev.docId } : {}),
    lineageSourceDocIds,
    chunks: sections.map((s, i) => ({
      id: `${docId}-c${i + 1}`,
      heading: s.heading,
      breadcrumb: `${draft.title} > ${s.heading}`,
      text: stripCitationMarkers(s.body),
    })),
  };

  // Vector index FIRST (fail closed: if the upsert fails, nothing has been
  // published anywhere), then the in-memory corpus and local index.
  if (isQdrantConfigured()) {
    const taxonomyVersion = currentTaxonomyVersion();
    const chunks: UpsertChunk[] = doc.chunks.map((chunk) => ({
      chunkId: chunk.id,
      embedText: `${doc.title} — ${chunk.heading}. ${chunk.text} ${doc.topics.join(" ")}`,
      payload: {
        chunkId: chunk.id,
        docId: doc.id,
        category: doc.category,
        confidentiality: doc.confidentiality,
        areas: doc.areas,
        country: doc.country,
        brand: doc.brand,
        quarter: doc.quarter,
        type: doc.type,
        validity: doc.validity,
        axisIds: doc.axisIds,
        topics: doc.topics,
        taxonomyVersion,
        live: true,
        liveDoc: doc,
        publishedFromReviewItemId: item.id,
        scheduleId: item.scheduleId,
      },
    }));
    await upsertChunks(chunks);
  }

  DOCS.push(doc);
  registerDocInIndex(doc);

  // Supersede the previous publication of this schedule: memory first, then
  // its durable payload (validity + refreshed liveDoc blob) so hydration
  // after a restart restores it as superseded, not approved.
  let supersededDocId: string | null = null;
  if (prev) {
    const prevDoc = getDoc(prev.docId);
    if (prevDoc) {
      prevDoc.validity = "superseded";
      supersededDocId = prev.docId;
      if (isQdrantConfigured()) {
        await setDocGovernancePayload(prev.docId, {
          validity: "superseded",
          liveDoc: prevDoc,
        });
      }
    }
  }

  addPublication({
    reviewItemId: item.id,
    scheduleId: item.scheduleId,
    docId,
    version,
    contentHash: item.approvedHash ?? "",
  });

  AUDIT_LOG.push({
    id: `audit-publish-${Date.now()}-${AUDIT_LOG.length}`,
    timestamp: new Date().toISOString(),
    actor: item.ownerLabel,
    action: "Approved draft published to corpus",
    target: draft.title,
    kind: "schedule",
    detail: `"${draft.title}" (v${version}, "${confidentiality}") was written back into the governed corpus as document ${docId} with ${doc.chunks.length} chunk${doc.chunks.length === 1 ? "" : "s"} and ${lineageSourceDocIds.length} lineage source${lineageSourceDocIds.length === 1 ? "" : "s"}.${supersededDocId ? ` Supersedes ${supersededDocId}.` : ""} It is now retrievable and citable in Ask.`,
  });

  return {
    docId,
    title: draft.title,
    version,
    upsertedChunks: doc.chunks.length,
    supersededDocId,
  };
}
