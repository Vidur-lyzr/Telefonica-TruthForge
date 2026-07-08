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
    status: "filtered",
    cadence: "Quarterly synthesis",
    docCount: 12,
    lastSync: "2d ago",
    externalFilter: true,
    filterNote:
      "Filter scope agreed with the SIC owners: regulatory keywords, named entities and priority topics only.",
    description:
      "Corporate information system feed (simulated). Regulatory syntheses pass the agreed relevance filter before entering the core.",
  },
  {
    id: "src-media",
    name: "Media monitoring",
    type: "Press & media coverage",
    status: "filtered",
    cadence: "Continuous, digested quarterly",
    docCount: 96,
    lastSync: "1h ago",
    externalFilter: true,
    filterNote:
      "Pre-ingestion filter: tracked outlets, competitors, executives and priority topics. Irrelevant articles never enter the core.",
    description:
      "External media coverage feed (simulated). Retained articles are digested into governed coverage documents with share-of-voice figures.",
  },
  {
    id: "src-cnmc",
    name: "CNMC open data",
    type: "Regulator open data API",
    status: "live",
    cadence: "Quarterly release",
    docCount: 8,
    lastSync: "5d ago",
    externalFilter: false,
    filterNote: null,
    description:
      "Public market data from the Spanish regulator (simulated API feed). Figures arrive already public and are governed as public-tier documents.",
  },
];

// ---------------------------------------------------------------------------
// Pre-ingestion relevance filter (RFP rule): external mentions are screened
// against keywords, tracked competitors, named executives and priority topics
// BEFORE ingestion. Dropped mentions never reach the knowledge core.
// ---------------------------------------------------------------------------

export interface RelevanceFilterRule {
  id: string;
  category: "keywords" | "competitors" | "executives" | "topics";
  terms: string[];
  note: string;
}

export interface FilteredMention {
  id: string;
  source: string;
  excerpt: string;
  matchedRule: string | null;
  sentiment: "positive" | "negative" | "neutral";
  decision: "kept" | "dropped";
  at: string;
}

export const RELEVANCE_FILTER_RULES: RelevanceFilterRule[] = [
  {
    id: "rf-keywords",
    category: "keywords",
    terms: ["Telefónica", "Movistar", "O2", "Vivo", "Telefónica Tech", "fibre guarantee", "5G coverage"],
    note: "Brand and product keywords. A mention must reference the group or one of its brands to be considered.",
  },
  {
    id: "rf-competitors",
    category: "competitors",
    terms: ["Deutsche Telekom", "Vodafone", "Orange", "Claro", "MásOrange", "1&1"],
    note: "Tracked competitors. Mentions comparing them to our brands are retained for competitive context.",
  },
  {
    id: "rf-executives",
    category: "executives",
    terms: ["Group CEO", "Group CFO", "O2 Telefónica CEO", "Vivo CEO"],
    note: "Named executives (role-based tracking). Any mention of a tracked executive is retained and flagged.",
  },
  {
    id: "rf-topics",
    category: "topics",
    terms: ["results", "spectrum", "regulation", "network outage", "M&A speculation", "sustainability", "AI Act"],
    note: "Priority topics agreed with Communications. Mentions on these topics are retained even without a brand keyword.",
  },
];

export const FILTERED_MENTIONS: FilteredMention[] = [
  {
    id: "fm-1",
    source: "Talkwalker",
    excerpt: "Movistar's rumoured symmetric-fibre guarantee would be a first in Spain if confirmed.",
    matchedRule: "keywords · fibre guarantee",
    sentiment: "positive",
    decision: "kept",
    at: "2026-07-07T09:12:00Z",
  },
  {
    id: "fm-2",
    source: "Talkwalker",
    excerpt: "Rural 5G coverage in Bavaria still patchy according to user reports tagging O2.",
    matchedRule: "keywords · 5G coverage",
    sentiment: "negative",
    decision: "kept",
    at: "2026-07-07T08:47:00Z",
  },
  {
    id: "fm-3",
    source: "Media monitoring",
    excerpt: "Deutsche Telekom raises German price premium; analysts compare value positioning against O2.",
    matchedRule: "competitors · Deutsche Telekom",
    sentiment: "neutral",
    decision: "kept",
    at: "2026-07-07T07:30:00Z",
  },
  {
    id: "fm-4",
    source: "Talkwalker",
    excerpt: "Best paella places near the Gran Vía flagship store thread (brand handle tagged in passing).",
    matchedRule: null,
    sentiment: "neutral",
    decision: "dropped",
    at: "2026-07-07T07:22:00Z",
  },
  {
    id: "fm-5",
    source: "Media monitoring",
    excerpt: "Group CEO quoted on AI Act transparency duties for telecom operators at industry panel.",
    matchedRule: "executives · Group CEO",
    sentiment: "positive",
    decision: "kept",
    at: "2026-07-06T18:05:00Z",
  },
  {
    id: "fm-6",
    source: "Talkwalker",
    excerpt: "Generic meme about phone batteries with an unrelated operator hashtag.",
    matchedRule: null,
    sentiment: "neutral",
    decision: "dropped",
    at: "2026-07-06T16:40:00Z",
  },
  {
    id: "fm-7",
    source: "Talkwalker",
    excerpt: "Speculation thread on further Hispam disposals citing unnamed sources.",
    matchedRule: "topics · M&A speculation",
    sentiment: "negative",
    decision: "kept",
    at: "2026-07-06T14:11:00Z",
  },
  {
    id: "fm-8",
    source: "Media monitoring",
    excerpt: "Lifestyle piece on holiday roaming tips mentioning several operators generically.",
    matchedRule: null,
    sentiment: "neutral",
    decision: "dropped",
    at: "2026-07-06T11:02:00Z",
  },
];

export interface RelevanceFilterSnapshot {
  rules: RelevanceFilterRule[];
  mentions: FilteredMention[];
  keptCount: number;
  droppedCount: number;
}

export const RELEVANCE_FILTER: RelevanceFilterSnapshot = {
  rules: RELEVANCE_FILTER_RULES,
  mentions: FILTERED_MENTIONS,
  keptCount: FILTERED_MENTIONS.filter((m) => m.decision === "kept").length,
  droppedCount: FILTERED_MENTIONS.filter((m) => m.decision === "dropped").length,
};

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
