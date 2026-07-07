// Synthetic Data Center seed for the Hub SSoT documentalist surface.
// All content is fictional / illustrative — NOT real Telefónica data.
// It exists so the sources, ingestion, validation and governance flows have
// something honest and legible to demonstrate the operating model.

import type { Clearance } from "./corpus";

// ---------------------------------------------------------------------------
// Sources & connectors
// ---------------------------------------------------------------------------

export type SourceStatus = "live" | "filtered" | "manual" | "to_configure";

export interface DataSource {
  id: string;
  name: string;
  type: string;
  status: SourceStatus;
  cadence: string;
  docCount: number;
  lastSync: string | null;
  externalFilter: boolean;
  filterNote: string | null;
  description: string;
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "src-sharepoint",
    name: "SharePoint",
    type: "Document repository",
    status: "live",
    cadence: "Continuous sync",
    docCount: 1180,
    lastSync: "11m ago",
    externalFilter: false,
    filterNote: null,
    description:
      "Primary internal repository. Documents inherit their Microsoft sensitivity label, which becomes the confidentiality tier used for governance.",
  },
  {
    id: "src-asana",
    name: "Asana",
    type: "Project & campaign management",
    status: "live",
    cadence: "Continuous sync",
    docCount: 214,
    lastSync: "24m ago",
    externalFilter: false,
    filterNote: null,
    description:
      "Campaign briefs, project plans and status notes from Communication & Brand initiatives.",
  },
  {
    id: "src-talkwalker",
    name: "Talkwalker",
    type: "Social & media listening",
    status: "filtered",
    cadence: "Near real-time",
    docCount: 486,
    lastSync: "3m ago",
    externalFilter: true,
    filterNote:
      "Pre-ingestion filter: keywords, tracked competitors, named executives and priority topics. Only relevant mentions enter the core.",
    description:
      "External listening feed. A filter runs before ingestion so the knowledge core is never flooded with irrelevant chatter.",
  },
  {
    id: "src-manual",
    name: "Manual upload",
    type: "Documentalist upload",
    status: "manual",
    cadence: "On demand",
    docCount: 37,
    lastSync: "Today",
    externalFilter: false,
    filterNote: null,
    description:
      "Documents added by hand through a guided metadata form. Mandatory fields are captured up front so nothing enters the pipeline underspecified.",
  },
  {
    id: "src-sic",
    name: "SIC",
    type: "Corporate information system",
    status: "to_configure",
    cadence: "Not yet scheduled",
    docCount: 0,
    lastSync: null,
    externalFilter: true,
    filterNote:
      "Filter scope to be agreed with the SIC owners before the first sync (keywords, entities, topics).",
    description:
      "Corporate information system connector, planned but not yet configured. No documents have been ingested from this source.",
  },
];

// ---------------------------------------------------------------------------
// Ingestion pipeline snapshot
// ---------------------------------------------------------------------------

export interface PipelineStage {
  id: string;
  name: string;
  count: number;
  description: string;
}

export interface QuarantineDoc {
  id: string;
  title: string;
  source: string;
  stage: string;
  taxonomyVersion: string;
  missingFields: string[];
  receivedAt: string;
  confidentiality: Clearance;
}

export interface IngestionSnapshot {
  stages: PipelineStage[];
  quarantine: QuarantineDoc[];
  validatedPct: number;
  taxonomyVersion: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "stage-intake",
    name: "Intake",
    count: 1204,
    description: "Documents received from a connected source and queued for processing.",
  },
  {
    id: "stage-extract",
    name: "Extract",
    count: 1198,
    description: "Text, tables and structure pulled out of each source file.",
  },
  {
    id: "stage-chunk",
    name: "Chunk",
    count: 1191,
    description: "Content split into passages with headings and breadcrumbs preserved.",
  },
  {
    id: "stage-embed",
    name: "Embed",
    count: 1187,
    description: "Passages turned into vectors for semantic retrieval.",
  },
  {
    id: "stage-classify",
    name: "Classify",
    count: 1180,
    description: "Each document proposed against the three taxonomy layers.",
  },
  {
    id: "stage-index",
    name: "Index",
    count: 1172,
    description: "Validated documents bound to the governed index with their clearance.",
  },
  {
    id: "stage-compile",
    name: "Compile",
    count: 1164,
    description: "Positions and briefs compiled from the indexed, validated core.",
  },
];

export const QUARANTINE_DOCS: QuarantineDoc[] = [
  {
    id: "quar-vivo-brief",
    title: "Vivo Q1 Campaign Brief (draft)",
    source: "Asana",
    stage: "Intake",
    taxonomyVersion: "v4",
    missingFields: ["confidentiality", "owner"],
    receivedAt: "2026-07-07T08:20:00Z",
    confidentiality: "internal",
  },
  {
    id: "quar-talkwalker-exec",
    title: "Executive mention cluster — regulation",
    source: "Talkwalker",
    stage: "Intake",
    taxonomyVersion: "v4",
    missingFields: ["country", "validUntil"],
    receivedAt: "2026-07-07T07:05:00Z",
    confidentiality: "public",
  },
  {
    id: "quar-manual-note",
    title: "Untitled upload — analyst note",
    source: "Manual upload",
    stage: "Intake",
    taxonomyVersion: "v4",
    missingFields: ["title", "owner", "confidentiality"],
    receivedAt: "2026-07-06T16:48:00Z",
    confidentiality: "internal",
  },
];

export const INGESTION_SNAPSHOT: IngestionSnapshot = {
  stages: PIPELINE_STAGES,
  quarantine: QUARANTINE_DOCS,
  validatedPct: 96,
  taxonomyVersion: "v4",
};

// ---------------------------------------------------------------------------
// Validation queue — the heart of the surface
// ---------------------------------------------------------------------------

export type ConfidenceTier = "high" | "medium" | "low";
export type ValidationKind = "standard" | "conflict";

export interface ProposedClassification {
  deterministic: string; // what it is — document type
  semantic: string[]; // what it says — topics
  strategicAxisId: string; // which strategic axis
}

export interface ProposedMetadata {
  confidentiality: Clearance;
  owner: string;
  country: string;
  brand: string;
  validUntil: string | null;
}

export interface ConflictDetail {
  metric: string;
  oldValue: string;
  oldSource: string;
  oldDate: string;
  freshValue: string;
  freshSource: string;
  freshDate: string;
}

export interface ValidationItem {
  id: string;
  title: string;
  source: string;
  kind: ValidationKind;
  confidence: ConfidenceTier;
  confidenceScore: number;
  classification: ProposedClassification;
  metadata: ProposedMetadata;
  refinedNote: string;
  conflict: ConflictDetail | null;
}

export const VALIDATION_ITEMS: ValidationItem[] = [
  {
    id: "val-germany-position",
    title: "Germany market position — updated share figure",
    source: "Talkwalker",
    kind: "conflict",
    confidence: "medium",
    confidenceScore: 0.74,
    classification: {
      deterministic: "Market update",
      semantic: ["Germany", "O2", "market share", "mobile"],
      strategicAxisId: "ax-core",
    },
    metadata: {
      confidentiality: "internal",
      owner: "Germany Communications",
      country: "Germany",
      brand: "O2",
      validUntil: "2026-12-31",
    },
    refinedNote: "This correction refined the German position page.",
    conflict: {
      metric: "German mobile market share",
      oldValue: "31%",
      oldSource: "Germany strategy deck (2024)",
      oldDate: "2024-11-02",
      freshValue: "34%",
      freshSource: "Talkwalker market read (Q1 2026)",
      freshDate: "2026-07-06",
    },
  },
  {
    id: "val-esg-scorecard",
    title: "ESG scorecard extract — inclusion programmes",
    source: "SharePoint",
    kind: "standard",
    confidence: "medium",
    confidenceScore: 0.68,
    classification: {
      deterministic: "Report",
      semantic: ["sustainability", "inclusion", "digital skills"],
      strategicAxisId: "ax-sustainability",
    },
    metadata: {
      confidentiality: "public",
      owner: "Sustainability Office",
      country: "Group",
      brand: "Telefónica",
      validUntil: "2026-12-31",
    },
    refinedNote: "This validation extended the sustainability position with a fresh source.",
    conflict: null,
  },
  {
    id: "val-b2b-note",
    title: "Telefónica Tech — enterprise pipeline note",
    source: "Asana",
    kind: "standard",
    confidence: "medium",
    confidenceScore: 0.71,
    classification: {
      deterministic: "Strategy",
      semantic: ["B2B", "enterprise", "cloud", "cyber"],
      strategicAxisId: "ax-b2b",
    },
    metadata: {
      confidentiality: "confidential",
      owner: "B2B Strategy",
      country: "Group",
      brand: "Telefónica Tech",
      validUntil: "2026-09-30",
    },
    refinedNote: "This validation strengthened the B2B growth evidence base.",
    conflict: null,
  },
  {
    id: "val-campaign-es",
    title: "Movistar campaign asset — pricing transparency",
    source: "SharePoint",
    kind: "standard",
    confidence: "medium",
    confidenceScore: 0.66,
    classification: {
      deterministic: "Campaign",
      semantic: ["pricing", "Movistar", "loyalty", "advertising"],
      strategicAxisId: "ax-core",
    },
    metadata: {
      confidentiality: "internal",
      owner: "Marca España",
      country: "Spain",
      brand: "Movistar",
      validUntil: "2026-06-30",
    },
    refinedNote: "This validation refined the Movistar campaign record.",
    conflict: null,
  },
];

// ---------------------------------------------------------------------------
// Per-document SLA / freshness
// ---------------------------------------------------------------------------

export interface DocFreshness {
  docId: string;
  title: string;
  owner: string;
  lastReviewed: string;
  slaMonths: number;
  monthsSinceReview: number;
  overdue: boolean;
}

// Reference date used to compute months-since-review for the synthetic seed.
const FRESHNESS_REFERENCE = new Date("2026-07-07T00:00:00Z");

function monthsBetween(fromIso: string): number {
  const from = new Date(fromIso);
  const years = FRESHNESS_REFERENCE.getUTCFullYear() - from.getUTCFullYear();
  const months = FRESHNESS_REFERENCE.getUTCMonth() - from.getUTCMonth();
  return Math.max(0, years * 12 + months);
}

interface FreshnessSeed {
  docId: string;
  title: string;
  owner: string;
  lastReviewed: string;
  slaMonths: number;
}

const FRESHNESS_SEED: FreshnessSeed[] = [
  {
    docId: "doc-q1-2026-results",
    title: "Q1 2026 Results — Financial Highlights",
    owner: "Investor Relations",
    lastReviewed: "2026-05-02",
    slaMonths: 6,
  },
  {
    docId: "doc-brand-guidelines-2026",
    title: "Telefónica Brand Guidelines 2026",
    owner: "Global Brand Office",
    lastReviewed: "2026-01-15",
    slaMonths: 12,
  },
  {
    docId: "doc-5g-deployment",
    title: "5G & Fibre Deployment Plan",
    owner: "Network Strategy",
    lastReviewed: "2025-11-20",
    slaMonths: 6,
  },
  {
    docId: "doc-media-relations",
    title: "Media Relations Guidelines",
    owner: "Media Relations",
    lastReviewed: "2025-09-10",
    slaMonths: 12,
  },
  {
    docId: "doc-crisis-playbook",
    title: "Crisis Communications Playbook",
    owner: "Group Communications",
    lastReviewed: "2025-12-01",
    slaMonths: 6,
  },
  {
    docId: "doc-townhall-2026",
    title: "Employee Town Hall — Spring 2026",
    owner: "Internal Communications",
    lastReviewed: "2026-04-01",
    slaMonths: 6,
  },
];

export const DOC_FRESHNESS: DocFreshness[] = FRESHNESS_SEED.map((f) => {
  const monthsSinceReview = monthsBetween(f.lastReviewed);
  return {
    docId: f.docId,
    title: f.title,
    owner: f.owner,
    lastReviewed: f.lastReviewed,
    slaMonths: f.slaMonths,
    monthsSinceReview,
    overdue: monthsSinceReview > 6,
  };
});
