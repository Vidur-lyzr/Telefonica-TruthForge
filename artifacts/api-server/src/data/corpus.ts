// Synthetic Telefónica corpus for the Hub SSoT hero.
// All content here is fictional / illustrative — it is NOT real Telefónica data.
// It exists so the governed retrieval + citation flow has something honest to cite.

export type Clearance = "public" | "internal" | "confidential" | "restricted";
export type Validity = "approved" | "historic" | "review" | "superseded";
export type Area = "Comunicación" | "Marca" | "Gabinete";

export const CLEARANCE_RANK: Record<Clearance, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

export interface StrategicAxis {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Role {
  id: string;
  label: string;
  clearance: Clearance;
  area: Area;
  description: string;
}

export interface Chunk {
  id: string;
  heading: string;
  breadcrumb: string;
  text: string;
}

// A machine-checkable claim a document makes about a metric for a period.
// Used to compute corroboration ("n sources agree") and to detect conflicts
// (same metric + period, different value) deterministically.
export interface Assertion {
  metric: string;
  period: string;
  value: string;
}

export interface CorpusDoc {
  id: string;
  title: string;
  country: string;
  brand: string;
  entity: string;
  quarter: string;
  type: string;
  confidentiality: Clearance;
  owner: string;
  validity: Validity;
  validUntil: string | null;
  language: string;
  topics: string[];
  axisIds: string[];
  summary: string;
  areas: Area[];
  /** Simulated source format (C): structured Word, Excel numeric, PDF, self-explanatory PPT, API feed, manual form, SharePoint dump. */
  sourceFormat: string;
  /** Simulated connector / provenance the document arrived through (honestly labelled — no real connector). */
  connector: string;
  chunks: Chunk[];
  assertions?: Assertion[];
  // Ids of documents this document materially contradicts. Drives the conflict flag.
  contradicts?: string[];
}

export interface NumericFact {
  id: string;
  label: string;
  value: string;
  unit: string;
  period: string;
  source: string;
  docId: string;
  keywords: string[];
}

export type ProfileId = "superadmin" | "admin" | "editor" | "audit";

export interface AdminProfile {
  id: ProfileId;
  label: string;
  scope: string;
  detail: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  area: Area;
  profileId: ProfileId;
  clearance: Clearance;
}

export type ScheduleStatus = "active" | "paused" | "orphaned";

export interface ScheduledDoc {
  id: string;
  template: string;
  frequency: string;
  languages: string[];
  owner: string;
  reviewFolder: string;
  sourceDocId: string | null;
  status: ScheduleStatus;
}

export type AuditKind = "permission" | "user" | "schedule" | "run";

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  kind: AuditKind;
  timestamp: string;
  detail: string;
}

export type GraphKind =
  | "market"
  | "brand"
  | "executive"
  | "axis"
  | "compiled_page"
  | "document"
  | "figure"
  | "product";

export type EdgeType = "citation" | "relationship";

export interface GraphNode {
  id: string;
  name: string;
  kind: GraphKind;
  keywords: string[];
  /** Strategic axis this node is coloured by (map encoding: colour = axis). */
  axisId?: string;
  /** Confidentiality of the underlying material, when the node wraps a source. */
  confidentiality?: Clearance;
  /** Validity of the underlying material (drives historic/amber rendering). */
  validity?: Validity;
  /** For figure nodes: the governed measurement this node represents. */
  figure?: { value: string; unit: string; period: string; docId: string };
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
  /** citation = solid (evidence), relationship = dashed (association). */
  type: EdgeType;
  /** Optional confidence (0..1) shown as a small edge label. */
  confidence?: number;
}

/** A single piece of cited evidence embedded in a compiled page's position. */
export interface EvidenceRef {
  marker: string; // e.g. "E1" — referenced inline in the position text
  docId: string;
  chunkId: string;
  note: string; // what this evidence supports
}

/** A fact where two sources disagreed and the documentalist settled it. */
export interface ResolvedFact {
  id: string;
  claim: string;
  resolvedValue: string;
  supersededValue: string;
  resolution: string;
  currentDocId: string;
  historicDocId: string;
  resolvedBy: string;
  resolvedAt: string;
}

export interface OpenItem {
  id: string;
  kind: "open" | "watch";
  text: string;
  owner: string;
}

export interface ChangeLogEntry {
  id: string;
  at: string;
  by: string;
  summary: string;
}

/** A compiled "institutional truth" page — the crystallised layer. */
export interface CompiledPage {
  id: string;
  nodeId: string;
  title: string;
  axisId: string;
  confidentiality: Clearance;
  validity: Validity;
  summary: string;
  /** The position we defend — plain prose with [E1] evidence + [[Title]] wiki-links. */
  position: string;
  evidence: EvidenceRef[];
  resolvedFacts: ResolvedFact[];
  openItems: OpenItem[];
  relatedPageIds: string[];
  changeLog: ChangeLogEntry[];
  owners: string[];
  sourceDocIds: string[];
  lastRefinedBy: string;
  lastRefinedAt: string;
  /** True when the page was refined this cycle (drives the map validation pulse). */
  refined: boolean;
  keywords: string[];
}

export interface LineageStep {
  stage: string; // Source file | Extraction | Classification
  detail: string;
  at: string;
  actor: string;
}

export interface ValidationEntry {
  field: string;
  proposed: string;
  approved: string;
  by: string;
  at: string;
  status: "accepted" | "corrected";
}

/** Ingestion lineage + validation trail for a governed document. */
export interface DocLineage {
  docId: string;
  sourceFile: string;
  taxonomyVersion: string;
  ingestion: LineageStep[];
  validation: ValidationEntry[];
}

export const AXES: StrategicAxis[] = [
  {
    id: "ax-core",
    name: "Grow the core",
    color: "#0066FF",
    description:
      "Defend and grow revenue in the four core markets through value, convergence and loyalty.",
  },
  {
    id: "ax-b2b",
    name: "Scale B2B & Tech",
    color: "#00C1B5",
    description:
      "Accelerate Telefónica Tech in cyber, cloud and IoT to grow high-margin enterprise revenue.",
  },
  {
    id: "ax-networks",
    name: "Build the best networks",
    color: "#7D5CFF",
    description:
      "Lead on fibre and 5G coverage and quality while retiring legacy copper.",
  },
  {
    id: "ax-digital",
    name: "Simplify & digitalise",
    color: "#FF7A00",
    description:
      "Cut complexity, digitalise operations and use AI to lower cost-to-serve.",
  },
  {
    id: "ax-sustainability",
    name: "Responsible growth",
    color: "#E5406B",
    description:
      "Deliver profitable growth within firm net-zero, digital-rights and inclusion commitments.",
  },
];

export const ROLES: Role[] = [
  {
    id: "role-press",
    label: "External / Press",
    clearance: "public",
    area: "Comunicación",
    description: "Journalists and external stakeholders. Public material only.",
  },
  {
    id: "role-analyst",
    label: "Communications Analyst",
    clearance: "internal",
    area: "Comunicación",
    description: "Prepares briefings from public and internal material.",
  },
  {
    id: "role-brand",
    label: "Brand Manager",
    clearance: "internal",
    area: "Marca",
    description: "Owns brand governance and campaign consistency.",
  },
  {
    id: "role-director",
    label: "Communications Director",
    clearance: "confidential",
    area: "Comunicación",
    description: "Access to confidential strategy and crisis material.",
  },
  {
    id: "role-cabinet",
    label: "Chief of Staff · Gabinete",
    clearance: "restricted",
    area: "Gabinete",
    description: "Full clearance, including board-restricted material.",
  },
];

export const DOCS: CorpusDoc[] = [
  {
    id: "doc-q1-2026-results",
    title: "Q1 2026 Results — Financial Highlights",
    country: "Group",
    brand: "Telefónica",
    entity: "Telefónica, S.A.",
    quarter: "Q1 2026",
    type: "Results",
    confidentiality: "public",
    owner: "Investor Relations",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["revenue", "results", "guidance", "financials"],
    axisIds: ["ax-core", "ax-b2b"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Self-explanatory PPT",
    connector: "SharePoint sync",
    summary:
      "Group revenue reached €8,127M in Q1 2026, up 1.8% year on year, driven by core-market convergence and B2B growth. This is the defensible, externally reported figure.",
    assertions: [{ metric: "group-revenue", period: "Q1 2026", value: "€8,127M" }],
    chunks: [
      {
        id: "doc-q1-2026-results#1",
        heading: "Group revenue",
        breadcrumb: "Q1 2026 Results › Financial highlights › slide 4",
        text: "Group revenue reached €8,127M in the first quarter of 2026, an increase of 1.8% year on year. This is the defensible figure Telefónica reports and defends externally for Q1 2026. Growth was led by convergent bundles in the core markets and by double-digit growth at Telefónica Tech.",
      },
      {
        id: "doc-q1-2026-results#2",
        heading: "Margin and cash flow",
        breadcrumb: "Q1 2026 Results › Financial highlights › slide 6",
        text: "Adjusted EBITDA margin was stable at 32.1%. Free cash flow generation supports the Board's commitment to the dividend and to continued network investment.",
      },
      {
        id: "doc-q1-2026-results#3",
        heading: "Guidance",
        breadcrumb: "Q1 2026 Results › Outlook › slide 12",
        text: "The company reaffirmed its full-year 2026 guidance of low-single-digit revenue growth and stable-to-improving margins, consistent with the Transform & Grow plan.",
      },
    ],
  },
  {
    id: "doc-q4-2025-results",
    title: "Q4 2025 Results — Financial Highlights",
    country: "Group",
    brand: "Telefónica",
    entity: "Telefónica, S.A.",
    quarter: "Q4 2025",
    type: "Results",
    confidentiality: "public",
    owner: "Investor Relations",
    validity: "superseded",
    validUntil: "2026-02-20",
    language: "en",
    topics: ["revenue", "results", "financials"],
    axisIds: ["ax-core"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Self-explanatory PPT",
    connector: "SharePoint sync",
    summary:
      "Q4 2025 group revenue was €7,982M. Superseded by the Q1 2026 results release.",
    assertions: [{ metric: "group-revenue", period: "Q4 2025", value: "€7,982M" }],
    chunks: [
      {
        id: "doc-q4-2025-results#1",
        heading: "Group revenue",
        breadcrumb: "Q4 2025 Results › Financial highlights › slide 4",
        text: "Group revenue for the fourth quarter of 2025 was €7,982M. This figure has since been superseded by the Q1 2026 results and should not be used as the current revenue reference.",
      },
    ],
  },
  {
    id: "doc-q1-2026-press-release",
    title: "Q1 2026 Results — Press Release",
    country: "Group",
    brand: "Telefónica",
    entity: "Telefónica, S.A.",
    quarter: "Q1 2026",
    type: "Press release",
    confidentiality: "public",
    owner: "Investor Relations",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["revenue", "results", "press release", "financials"],
    axisIds: ["ax-core"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "Public press release confirming €8,127M group revenue in Q1 2026 — the defensible figure for external use.",
    assertions: [{ metric: "group-revenue", period: "Q1 2026", value: "€8,127M" }],
    chunks: [
      {
        id: "doc-q1-2026-press-release#1",
        heading: "Headline",
        breadcrumb: "Q1 2026 Press Release › Headline",
        text: "Telefónica today reported group revenue of €8,127M for the first quarter of 2026. This is the figure the company defends externally and is consistent with the results presentation for Q1 2026.",
      },
    ],
  },
  {
    id: "doc-q1-2026-ir-factsheet",
    title: "Q1 2026 Investor Relations Factsheet",
    country: "Group",
    brand: "Telefónica",
    entity: "Investor Relations",
    quarter: "Q1 2026",
    type: "Factsheet",
    confidentiality: "public",
    owner: "Investor Relations",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["revenue", "financials", "investor relations", "factsheet"],
    axisIds: ["ax-core", "ax-b2b"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "PDF",
    connector: "SharePoint sync",
    summary:
      "Investor factsheet reaffirming the €8,127M Q1 2026 group revenue figure defended externally.",
    assertions: [{ metric: "group-revenue", period: "Q1 2026", value: "€8,127M" }],
    chunks: [
      {
        id: "doc-q1-2026-ir-factsheet#1",
        heading: "Key figures",
        breadcrumb: "Q1 2026 IR Factsheet › Key figures",
        text: "Q1 2026 group revenue: €8,127M. This defensible figure is reconciled with the audited management accounts and is the reference the company defends with analysts for Q1 2026.",
      },
    ],
  },
  {
    id: "doc-q1-2026-prelim-finance",
    title: "Q1 2026 Preliminary Finance Flash (Pre-Publication)",
    country: "Group",
    brand: "Telefónica",
    entity: "Group Finance",
    quarter: "Q1 2026",
    type: "Finance flash",
    confidentiality: "confidential",
    owner: "Group Finance",
    validity: "review",
    validUntil: "2026-04-25",
    language: "en",
    topics: ["revenue", "pre-publication", "preliminary", "flash", "unpublished", "finance"],
    axisIds: ["ax-core"],
    areas: ["Gabinete"],
    sourceFormat: "Excel numeric",
    connector: "SharePoint sync (restricted library)",
    summary:
      "Confidential pre-publication finance flash with unaudited preliminary Q1 figures. Not for external or Comms use before publication.",
    chunks: [
      {
        id: "doc-q1-2026-prelim-finance#1",
        heading: "Preliminary flash",
        breadcrumb: "Q1 2026 Preliminary Finance Flash › Summary",
        text: "This confidential pre-publication finance flash contains unaudited preliminary Q1 numbers circulated to Group Finance ahead of the results release. Preliminary figures are embargoed and must not be quoted before publication.",
      },
    ],
  },
  {
    id: "doc-hispam-exit",
    title: "Hispam Footprint — Spanish America Exit Update",
    country: "Group",
    brand: "Telefónica",
    entity: "Corporate Development",
    quarter: "Q1 2026",
    type: "Market update",
    confidentiality: "public",
    owner: "Corporate Development",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["Hispam", "Mexico", "Chile", "Spanish America", "divestment", "footprint"],
    axisIds: ["ax-core"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "Public update on Telefónica's reduction of its Spanish America (Hispam) footprint, including the completed sale of Chile.",
    chunks: [
      {
        id: "doc-hispam-exit#1",
        heading: "Spanish America footprint",
        breadcrumb: "Hispam Exit Update › Footprint",
        text: "Telefónica has been reducing its presence across Spanish America (Hispam). The sale of its Chile operation completed on 10 February 2026, and the group continues to review its remaining Spanish American positions, including Mexico.",
      },
      {
        id: "doc-hispam-exit#2",
        heading: "What is not affected",
        breadcrumb: "Hispam Exit Update › Scope",
        text: "This reduction concerns Spanish America only. Brazil, operated under the Vivo brand, is a core market and is not part of the Hispam exit. Vivo does not operate in Mexico.",
      },
    ],
  },
  {
    id: "doc-approved-messaging-q1",
    title: "Approved Q1 Messaging — Spokesperson Talking Points",
    country: "Group",
    brand: "Telefónica",
    entity: "Group Communications",
    quarter: "Q1 2026",
    type: "Messaging",
    confidentiality: "internal",
    owner: "Group Communications",
    validity: "superseded",
    validUntil: "2026-03-31",
    language: "en",
    topics: ["messaging", "talking points", "spokesperson", "positioning", "lines to take"],
    axisIds: ["ax-core"],
    areas: ["Comunicación", "Marca"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "Superseded approved messaging pack. Its headline top-line figure predates and disagrees with the published Q1 2026 results.",
    assertions: [{ metric: "group-revenue", period: "Q1 2026", value: "€7,982M" }],
    contradicts: ["doc-q1-2026-results"],
    chunks: [
      {
        id: "doc-approved-messaging-q1#1",
        heading: "Lines to take",
        breadcrumb: "Approved Q1 Messaging › Lines to take",
        text: "Approved spokesperson talking points and lines to take for the quarter. The agreed external line references a group top-line of around €7,982M for the period. Note: this messaging pack has been superseded and its top-line figure no longer matches the published results.",
      },
    ],
  },
  {
    id: "doc-brand-guidelines-2026",
    title: "Telefónica Brand Guidelines 2026",
    country: "Group",
    brand: "Telefónica",
    entity: "Global Brand",
    quarter: "2026",
    type: "Guideline",
    confidentiality: "internal",
    owner: "Global Brand Office",
    validity: "approved",
    validUntil: "2027-01-31",
    language: "en",
    topics: ["brand", "logo", "colour", "identity", "typography", "tone"],
    axisIds: ["ax-sustainability"],
    areas: ["Marca", "Comunicación"],
    sourceFormat: "PDF",
    connector: "SharePoint sync",
    summary:
      "Defines the five-dot 'T' identity, the vivid brand blue, the single sans typeface and voice principles.",
    chunks: [
      {
        id: "doc-brand-guidelines-2026#1",
        heading: "Colour",
        breadcrumb: "Brand Guidelines 2026 › Foundations › Colour",
        text: "The primary brand colour is Telefónica blue (#0066FF). White and one or two blues carry each surface; deep navy is reserved for dark bands. Semantic colours are used sparingly.",
      },
      {
        id: "doc-brand-guidelines-2026#2",
        heading: "Logo",
        breadcrumb: "Brand Guidelines 2026 › Foundations › Logo",
        text: "The identity is the five-dot 'T' lockup. Use the blue lockup on light surfaces and the white lockup on blue or navy bands. Never recolour, rotate or add effects to the mark.",
      },
      {
        id: "doc-brand-guidelines-2026#3",
        heading: "Voice",
        breadcrumb: "Brand Guidelines 2026 › Verbal identity › Voice",
        text: "Telefónica's voice is clear, human and confident. Use sentence case, avoid jargon, and never use emoji in corporate communications.",
      },
    ],
  },
  {
    id: "doc-mwc-2026-keynote",
    title: "CEO Keynote — MWC Barcelona 2026",
    country: "Spain",
    brand: "Telefónica",
    entity: "Group",
    quarter: "Q1 2026",
    type: "Speech",
    confidentiality: "public",
    owner: "Executive Communications",
    validity: "approved",
    validUntil: null,
    language: "en",
    topics: ["5G", "AI", "networks", "keynote", "strategy"],
    axisIds: ["ax-networks", "ax-digital"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Structured Word",
    connector: "Manual upload",
    summary:
      "Keynote positioning Telefónica as a network and AI leader, announcing expanded 5G standalone coverage.",
    chunks: [
      {
        id: "doc-mwc-2026-keynote#1",
        heading: "Network leadership",
        breadcrumb: "MWC 2026 Keynote › Networks",
        text: "At MWC Barcelona 2026 the CEO reaffirmed Telefónica's ambition to operate the best networks in its markets, highlighting 5G standalone availability across major Spanish and German cities.",
      },
      {
        id: "doc-mwc-2026-keynote#2",
        heading: "AI and automation",
        breadcrumb: "MWC 2026 Keynote › Artificial intelligence",
        text: "The keynote framed AI as a lever to simplify operations and improve customer experience, not as a replacement for human judgement in sensitive communications.",
      },
    ],
  },
  {
    id: "doc-sustainability-2025",
    title: "Sustainability Report 2025",
    country: "Group",
    brand: "Telefónica",
    entity: "Group",
    quarter: "2025",
    type: "Report",
    confidentiality: "public",
    owner: "Sustainability Office",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["sustainability", "net zero", "emissions", "inclusion", "climate"],
    axisIds: ["ax-sustainability"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "PDF",
    connector: "SharePoint sync",
    summary:
      "Reports progress toward the net-zero 2040 commitment and on digital inclusion programmes.",
    chunks: [
      {
        id: "doc-sustainability-2025#1",
        heading: "Net zero",
        breadcrumb: "Sustainability Report 2025 › Climate › Net zero",
        text: "Telefónica reaffirms its commitment to reach net-zero emissions by 2040 across its main markets, having cut Scope 1 and 2 emissions materially since the 2015 baseline.",
      },
      {
        id: "doc-sustainability-2025#2",
        heading: "Digital inclusion",
        breadcrumb: "Sustainability Report 2025 › Society › Inclusion",
        text: "Digital inclusion programmes extended connectivity and digital skills to rural communities across Spain, Germany, Brazil and the United Kingdom.",
      },
    ],
  },
  {
    id: "doc-tech-b2b-strategy",
    title: "Telefónica Tech — B2B Growth Strategy",
    country: "Group",
    brand: "Telefónica Tech",
    entity: "Telefónica Tech",
    quarter: "Q1 2026",
    type: "Strategy",
    confidentiality: "confidential",
    owner: "B2B Strategy",
    validity: "approved",
    validUntil: "2026-09-30",
    language: "en",
    topics: ["B2B", "enterprise", "cyber", "cloud", "IoT", "Telefónica Tech"],
    axisIds: ["ax-b2b"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Self-explanatory PPT",
    connector: "SharePoint sync (restricted library)",
    summary:
      "Confidential plan to scale enterprise revenue in cyber security, cloud and IoT.",
    chunks: [
      {
        id: "doc-tech-b2b-strategy#1",
        heading: "Enterprise priorities",
        breadcrumb: "B2B Growth Strategy › Priorities",
        text: "Telefónica Tech will prioritise managed cyber security and multi-cloud services for large enterprises, targeting double-digit annual revenue growth in the segment.",
      },
      {
        id: "doc-tech-b2b-strategy#2",
        heading: "Margin profile",
        breadcrumb: "B2B Growth Strategy › Economics",
        text: "The enterprise portfolio carries a higher margin profile than legacy connectivity and is a core lever of the Scale B2B & Tech axis.",
      },
    ],
  },
  {
    id: "doc-5g-deployment",
    title: "5G & Fibre Deployment Plan",
    country: "Spain",
    brand: "Movistar",
    entity: "Telefónica España",
    quarter: "Q1 2026",
    type: "Plan",
    confidentiality: "internal",
    owner: "Network Strategy",
    validity: "review",
    validUntil: "2026-06-30",
    language: "en",
    topics: ["5G", "fibre", "network", "copper", "coverage"],
    axisIds: ["ax-networks"],
    areas: ["Comunicación"],
    sourceFormat: "Self-explanatory PPT",
    connector: "SharePoint sync",
    summary:
      "Internal plan (under review) for 5G standalone expansion and copper retirement in Spain.",
    chunks: [
      {
        id: "doc-5g-deployment#1",
        heading: "Copper retirement",
        breadcrumb: "5G & Fibre Deployment Plan › Fibre › Copper",
        text: "The plan accelerates copper network retirement in Spain in favour of full-fibre access, subject to regulatory milestones. This section is currently under review.",
      },
      {
        id: "doc-5g-deployment#2",
        heading: "5G standalone",
        breadcrumb: "5G & Fibre Deployment Plan › Mobile › 5G SA",
        text: "5G standalone coverage will expand to additional metropolitan areas, enabling network slicing for enterprise customers.",
      },
    ],
  },
  {
    id: "doc-ma-project-atlas",
    title: "Project Atlas — Potential Transaction Memo",
    country: "Group",
    brand: "Telefónica",
    entity: "Corporate Development",
    quarter: "Q1 2026",
    type: "Memo",
    confidentiality: "restricted",
    owner: "Corporate Development",
    validity: "approved",
    validUntil: "2026-05-31",
    language: "en",
    topics: ["M&A", "acquisition", "merger", "transaction", "consolidation"],
    axisIds: ["ax-core"],
    areas: ["Gabinete"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync (restricted library)",
    summary:
      "Board-restricted memo assessing a potential in-market consolidation opportunity.",
    chunks: [
      {
        id: "doc-ma-project-atlas#1",
        heading: "Rationale",
        breadcrumb: "Project Atlas › Executive summary",
        text: "This board-restricted memo assesses a potential in-market consolidation. Any acquisition or merger would be subject to regulatory approval and is strictly confidential.",
      },
      {
        id: "doc-ma-project-atlas#2",
        heading: "Communications posture",
        breadcrumb: "Project Atlas › Communications",
        text: "No external or internal communication on a possible transaction is authorised until the Board decides. Standard holding response: the company does not comment on market speculation.",
      },
    ],
  },
  {
    id: "doc-crisis-playbook",
    title: "Crisis Communications Playbook",
    country: "Group",
    brand: "Telefónica",
    entity: "Group Communications",
    quarter: "2026",
    type: "Playbook",
    confidentiality: "confidential",
    owner: "Group Communications",
    validity: "approved",
    validUntil: "2027-01-31",
    language: "en",
    topics: ["crisis", "incident", "outage", "reputation", "holding statement"],
    axisIds: ["ax-digital"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "PDF",
    connector: "SharePoint sync (restricted library)",
    summary:
      "Confidential procedures for network outages, data incidents and reputational events.",
    chunks: [
      {
        id: "doc-crisis-playbook#1",
        heading: "First hour",
        breadcrumb: "Crisis Playbook › Response › First hour",
        text: "In the first hour of a major network outage, activate the crisis committee, publish a holding statement acknowledging the issue, and avoid speculation on causes until verified.",
      },
      {
        id: "doc-crisis-playbook#2",
        heading: "Data incidents",
        breadcrumb: "Crisis Playbook › Response › Data incidents",
        text: "For suspected data incidents, coordinate with legal and the DPO before any external statement, and follow regulatory notification timelines.",
      },
    ],
  },
  {
    id: "doc-media-relations",
    title: "Media Relations Guidelines",
    country: "Group",
    brand: "Telefónica",
    entity: "Group Communications",
    quarter: "2026",
    type: "Guideline",
    confidentiality: "internal",
    owner: "Media Relations",
    validity: "approved",
    validUntil: "2027-01-31",
    language: "en",
    topics: ["media", "press", "spokesperson", "interview", "embargo"],
    axisIds: ["ax-digital"],
    areas: ["Comunicación"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "How to handle press enquiries, spokespeople, embargoes and attribution.",
    chunks: [
      {
        id: "doc-media-relations#1",
        heading: "Spokespeople",
        breadcrumb: "Media Relations Guidelines › Spokespeople",
        text: "Only authorised spokespeople may speak on the record. Route all press enquiries through the Media Relations desk, which logs the enquiry and agrees attribution.",
      },
    ],
  },
  {
    id: "doc-germany-o2",
    title: "Germany (O2 Telefónica) Market Update",
    country: "Germany",
    brand: "O2",
    entity: "Telefónica Deutschland",
    quarter: "Q1 2026",
    type: "Market update",
    confidentiality: "internal",
    owner: "Germany Communications",
    validity: "approved",
    validUntil: "2026-06-30",
    language: "de",
    topics: ["Germany", "O2", "mobile", "market share"],
    axisIds: ["ax-core", "ax-networks"],
    areas: ["Comunicación"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary: "Internal update on O2 Telefónica performance and 5G rollout in Germany.",
    chunks: [
      {
        id: "doc-germany-o2#1",
        heading: "Performance",
        breadcrumb: "Germany Market Update › Performance",
        text: "O2 Telefónica maintained mobile service revenue growth in Germany, supported by strong postpaid net additions and expanding 5G coverage.",
      },
    ],
  },
  {
    id: "doc-brazil-vivo",
    title: "Brazil (Vivo) Market Update",
    country: "Brazil",
    brand: "Vivo",
    entity: "Telefônica Brasil",
    quarter: "Q1 2026",
    type: "Market update",
    confidentiality: "internal",
    owner: "Brazil Communications",
    validity: "approved",
    validUntil: "2026-06-30",
    language: "pt",
    topics: ["Brazil", "Vivo", "fibre", "digital services"],
    axisIds: ["ax-core", "ax-b2b"],
    areas: ["Comunicación"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary: "Internal update on Vivo's fibre and digital-services growth in Brazil.",
    chunks: [
      {
        id: "doc-brazil-vivo#1",
        heading: "Fibre and digital",
        breadcrumb: "Brazil Market Update › Growth",
        text: "Vivo continued to grow fibre-to-the-home connections and digital services revenue in Brazil, reinforcing its market leadership.",
      },
    ],
  },
  {
    id: "doc-campaign-mismo-sitio",
    title: "Movistar Campaign — 'Mismo sitio, mismo precio'",
    country: "Spain",
    brand: "Movistar",
    entity: "Telefónica España",
    quarter: "Q1 2026",
    type: "Campaign",
    confidentiality: "internal",
    owner: "Marca España",
    validity: "approved",
    validUntil: "2026-06-30",
    language: "es",
    topics: ["campaign", "pricing", "Movistar", "advertising", "marca"],
    axisIds: ["ax-core"],
    areas: ["Marca", "Comunicación"],
    sourceFormat: "Self-explanatory PPT",
    connector: "Asana feed (simulated)",
    summary:
      "Campaign reinforcing price transparency and loyalty for existing Movistar customers.",
    chunks: [
      {
        id: "doc-campaign-mismo-sitio#1",
        heading: "Proposition",
        breadcrumb: "Campaign 'Mismo sitio, mismo precio' › Proposition",
        text: "The campaign promises existing Movistar customers the same price without hidden increases, reinforcing loyalty and price transparency as brand values.",
      },
    ],
  },
  {
    id: "doc-townhall-2026",
    title: "Employee Town Hall — Spring 2026",
    country: "Group",
    brand: "Telefónica",
    entity: "Internal Communications",
    quarter: "Q1 2026",
    type: "Internal comms",
    confidentiality: "internal",
    owner: "Internal Communications",
    validity: "historic",
    validUntil: "2026-04-01",
    language: "en",
    topics: ["employees", "town hall", "culture", "strategy"],
    axisIds: ["ax-digital"],
    areas: ["Comunicación"],
    sourceFormat: "Self-explanatory PPT",
    connector: "SharePoint sync",
    summary:
      "Historic record of the spring 2026 employee town hall on the Transform & Grow plan.",
    chunks: [
      {
        id: "doc-townhall-2026#1",
        heading: "Strategy update",
        breadcrumb: "Town Hall Spring 2026 › Strategy",
        text: "At the spring 2026 town hall, leadership summarised progress on the Transform & Grow plan and thanked teams for delivery. This is a historic record of that event.",
      },
    ],
  },
  {
    id: "doc-transform-grow-plan",
    title: "Transform & Grow — Strategic Plan 2026-2028",
    country: "Group",
    brand: "Telefónica",
    entity: "Group Strategy",
    quarter: "Q1 2026",
    type: "Plan",
    confidentiality: "confidential",
    owner: "Group Strategy",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: [
      "transform and grow",
      "transform & grow",
      "strategy",
      "synergies",
      "narrative",
      "efficiency",
      "markets",
    ],
    axisIds: ["ax-core", "ax-b2b", "ax-digital"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Self-explanatory PPT",
    connector: "SharePoint sync (restricted library)",
    summary:
      "Confidential three-year Transform & Grow plan setting the group narrative, targeted synergies and core-market priorities.",
    chunks: [
      {
        id: "doc-transform-grow-plan#1",
        heading: "Narrative",
        breadcrumb: "Transform & Grow Plan › Narrative",
        text: "The Transform & Grow narrative frames Telefónica as a simpler, more focused operator concentrating on four core markets while scaling B2B and technology. Communications should lead with focus, discipline and profitable growth.",
      },
      {
        id: "doc-transform-grow-plan#2",
        heading: "Synergies",
        breadcrumb: "Transform & Grow Plan › Financials › Synergies",
        text: "The plan targets 400 million euros of annual run-rate synergies by 2028, driven by network simplification, digitalisation and shared-service consolidation. These figures are confidential and for internal narrative alignment only.",
      },
      {
        id: "doc-transform-grow-plan#3",
        heading: "Core markets",
        breadcrumb: "Transform & Grow Plan › Markets",
        text: "Capital is prioritised toward Spain, Germany, Brazil and the United Kingdom. Non-core Hispanoamérica positions are managed for value, including selective disposals where they strengthen the balance sheet.",
      },
    ],
  },
  {
    id: "doc-chile-sale",
    title: "Sale of Chilean Subsidiary — Announcement",
    country: "Chile",
    brand: "Telefónica",
    entity: "Telefónica Hispanoamérica",
    quarter: "Q1 2026",
    type: "Press release",
    confidentiality: "public",
    owner: "Group Communications",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: [
      "chile",
      "subsidiary",
      "sale",
      "disposal",
      "divestment",
      "hispanoamérica",
      "transaction",
    ],
    axisIds: ["ax-core"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "Public announcement that Telefónica has agreed to sell its Chilean subsidiary as part of its portfolio focus.",
    chunks: [
      {
        id: "doc-chile-sale#1",
        heading: "Transaction",
        breadcrumb: "Chile Sale Announcement › Transaction",
        text: "Telefónica has agreed to sell its Chilean subsidiary to a local infrastructure investor for an enterprise value of 1,240 million euros. The transaction is consistent with the group's focus on its four core markets.",
      },
      {
        id: "doc-chile-sale#2",
        heading: "Executive comment",
        breadcrumb: "Chile Sale Announcement › Quote",
        text: "The agreement strengthens our balance sheet and sharpens our focus on the markets where we can lead. Chile has a talented team and we have secured strong commitments to customers and employees under the new owner.",
      },
      {
        id: "doc-chile-sale#3",
        heading: "Boilerplate",
        breadcrumb: "Chile Sale Announcement › About Telefónica",
        text: "Telefónica is one of the largest telecommunications companies in the world by number of customers, with a presence in Europe and Latin America. It provides connectivity and digital services to consumers and businesses.",
      },
    ],
  },
  {
    id: "doc-venezuela-note",
    title: "Hispanoamérica Disposals — Internal Holding Note",
    country: "Venezuela",
    brand: "Telefónica",
    entity: "Corporate Development",
    quarter: "Q1 2026",
    type: "Note",
    confidentiality: "internal",
    owner: "Corporate Development",
    validity: "approved",
    validUntil: "2026-09-30",
    language: "en",
    topics: [
      "venezuela",
      "hispanoamérica",
      "disposal",
      "timeline",
      "holding line",
      "do not confirm",
      "sequencing",
    ],
    axisIds: ["ax-core"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Structured Word",
    connector: "Manual upload",
    summary:
      "Internal-only holding note on the sequencing of further Hispanoamérica disposals. Not for external use.",
    chunks: [
      {
        id: "doc-venezuela-note#1",
        heading: "Do not confirm timelines",
        breadcrumb: "Internal Holding Note › Guidance",
        text: "Do not confirm any timeline for further Hispanoamérica disposals, including Venezuela. If pressed, state only that the group manages its portfolio for value and does not comment on speculation. This guidance is internal and must never appear in an external release.",
      },
      {
        id: "doc-venezuela-note#2",
        heading: "Sequencing",
        breadcrumb: "Internal Holding Note › Sequencing",
        text: "Any further disposals will be sequenced to protect valuation and employee commitments. No sequencing detail is to be shared externally or with press under any circumstances.",
      },
    ],
  },

  // ── PC3 data universe expansion ──────────────────────────────────────────
  // A·Internal: calendar, HR, customer, research, New USP.
  // B·External: social listening, SIC, media coverage, competitor studies,
  // sector reports, legislation. E: SSoT-generated output.
  {
    id: "doc-comms-calendar-2026",
    title: "Communication Calendar & Milestones 2026",
    country: "Group",
    brand: "Telefónica",
    entity: "Group Communications",
    quarter: "FY 2026",
    type: "Calendar",
    confidentiality: "internal",
    owner: "Group Communications",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["calendar", "milestones", "events", "results dates", "planning", "calendario", "hitos"],
    axisIds: ["ax-core", "ax-digital"],
    areas: ["Comunicación", "Marca", "Gabinete"],
    sourceFormat: "API feed",
    connector: "Asana feed (simulated)",
    summary:
      "The governed 2026 communication calendar: results dates, MWC, shareholder meeting, campaign windows and internal milestones, synchronised from the project system.",
    chunks: [
      {
        id: "doc-comms-calendar-2026#1",
        heading: "Fixed corporate milestones",
        breadcrumb: "Communication Calendar 2026 › Corporate milestones",
        text: "Fixed corporate milestones for 2026: quarterly results on 25 February, 13 May, 29 July and 4 November; the Annual General Meeting on 11 June in Madrid; and MWC Barcelona from 2 to 5 March. Quiet periods start ten days before each results date and constrain proactive announcements.",
      },
      {
        id: "doc-comms-calendar-2026#2",
        heading: "Campaign and brand windows",
        breadcrumb: "Communication Calendar 2026 › Campaign windows",
        text: "Brand campaign windows are reserved for April (convergence offer), September (fibre and 5G leadership) and November (centenary of the Movistar brand identity refresh). Each window has a named owner in Marca and a talking-points pack scheduled 48 hours before launch.",
      },
    ],
  },
  {
    id: "doc-hr-talento-2026",
    title: "Programa Talento 2026 — Personas y Cultura",
    country: "Spain",
    brand: "Telefónica",
    entity: "Personas (HR)",
    quarter: "FY 2026",
    type: "HR programme",
    confidentiality: "internal",
    owner: "Dirección de Personas",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "es",
    topics: ["talento", "personas", "cultura", "formación", "hr", "talent", "people", "culture", "training", "reskilling"],
    axisIds: ["ax-digital", "ax-sustainability"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "Programa interno de talento 2026: 45.000 horas de formación en IA y datos, movilidad interna y objetivos de diversidad. Documento interno de Personas para comunicación interna.",
    assertions: [{ metric: "ai-training-hours", period: "FY 2026", value: "45,000" }],
    chunks: [
      {
        id: "doc-hr-talento-2026#1",
        heading: "Formación en IA y datos",
        breadcrumb: "Programa Talento 2026 › Formación",
        text: "El Programa Talento 2026 compromete 45.000 horas de formación en inteligencia artificial y datos para empleados en España durante 2026. La formación (training, reskilling) prioriza los equipos de operaciones y atención al cliente, y se comunica internamente cada trimestre.",
      },
      {
        id: "doc-hr-talento-2026#2",
        heading: "Movilidad y diversidad",
        breadcrumb: "Programa Talento 2026 › Movilidad y diversidad",
        text: "El programa fija un objetivo del 33% de mujeres en puestos directivos a final de 2026 y un mercado interno de talento que cubra el 40% de las vacantes con movilidad interna. Estos objetivos son internos y no constituyen guía externa.",
      },
    ],
  },
  {
    id: "doc-customer-nps-q1-2026",
    title: "Customer Experience Scorecard — NPS Q1 2026",
    country: "Group",
    brand: "Telefónica",
    entity: "Customer Experience Office",
    quarter: "Q1 2026",
    type: "Customer scorecard",
    confidentiality: "internal",
    owner: "Customer Experience Office",
    validity: "approved",
    validUntil: "2026-09-30",
    language: "en",
    topics: ["nps", "customer", "satisfaction", "experience", "churn", "clientes", "satisfacción", "kunden"],
    axisIds: ["ax-core", "ax-digital"],
    areas: ["Comunicación", "Marca", "Gabinete"],
    sourceFormat: "Excel numeric",
    connector: "SharePoint sync",
    summary:
      "Quarterly customer scorecard: group NPS reached 34 in Q1 2026, up three points year on year, with churn at a record low in convergent households.",
    assertions: [{ metric: "group-nps", period: "Q1 2026", value: "34" }],
    chunks: [
      {
        id: "doc-customer-nps-q1-2026#1",
        heading: "Group NPS",
        breadcrumb: "CX Scorecard Q1 2026 › NPS",
        text: "Group Net Promoter Score (NPS) reached 34 in Q1 2026, an improvement of three points year on year and the best first quarter on record. Spain and Brazil led the improvement; Germany was stable. The figure is the internal reference for customer satisfaction in Q1 2026.",
      },
      {
        id: "doc-customer-nps-q1-2026#2",
        heading: "Churn in convergent households",
        breadcrumb: "CX Scorecard Q1 2026 › Churn",
        text: "Churn in convergent households fell to 0.9% monthly, a record low. The scorecard attributes the improvement to the loyalty programme relaunch and faster fault resolution, both tracked as customer-experience milestones in the 2026 plan.",
      },
    ],
  },
  {
    id: "doc-brand-tracker-q1-2026",
    title: "Brand Tracker Wave — Q1 2026 (Research)",
    country: "Group",
    brand: "Telefónica",
    entity: "Brand Insights",
    quarter: "Q1 2026",
    type: "Research",
    confidentiality: "internal",
    owner: "Global Brand Office",
    validity: "approved",
    validUntil: "2026-09-30",
    language: "en",
    topics: ["brand power", "consideration", "tracker", "research", "insights", "marca", "estudio", "markenstudie"],
    axisIds: ["ax-core"],
    areas: ["Marca", "Gabinete"],
    sourceFormat: "Self-explanatory PPT",
    connector: "Manual upload",
    summary:
      "Quarterly brand tracker: brand consideration at 52% across the four core markets, brand power index up two points, with the strongest gains among under-35 audiences.",
    assertions: [{ metric: "brand-consideration", period: "Q1 2026", value: "52%" }],
    chunks: [
      {
        id: "doc-brand-tracker-q1-2026#1",
        heading: "Consideration and brand power",
        breadcrumb: "Brand Tracker Q1 2026 › Headline measures",
        text: "Brand consideration reached 52% on average across Spain, Germany, Brazil and the UK joint venture in Q1 2026, and the composite brand power index rose two points against the previous wave. The research (estudio de marca) is fielded monthly with a quarterly reported wave.",
      },
      {
        id: "doc-brand-tracker-q1-2026#2",
        heading: "Audience detail",
        breadcrumb: "Brand Tracker Q1 2026 › Audiences",
        text: "The strongest gains came from under-35 audiences, where consideration rose four points after the digital-first campaign flight. Premium perception remains the main gap against the leading competitor in Germany.",
      },
    ],
  },
  {
    id: "doc-new-usp-fibra",
    title: "Nuevo USP — Garantía de Fibra Simétrica",
    country: "Spain",
    brand: "Movistar",
    entity: "Marca España",
    quarter: "Q2 2026",
    type: "USP definition",
    confidentiality: "internal",
    owner: "Marca España",
    validity: "review",
    validUntil: "2026-08-31",
    language: "es",
    topics: ["usp", "fibra", "garantía", "propuesta de valor", "fibre", "guarantee", "value proposition", "symmetric"],
    axisIds: ["ax-core", "ax-networks"],
    areas: ["Marca", "Comunicación"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "Definición del nuevo USP de Movistar: garantía de velocidad simétrica en fibra con compensación automática. En revisión — pendiente de aprobación legal antes de uso externo.",
    chunks: [
      {
        id: "doc-new-usp-fibra#1",
        heading: "Definición del USP",
        breadcrumb: "Nuevo USP › Definición",
        text: "El nuevo USP propuesto para Movistar es la garantía de velocidad simétrica en fibra: si la velocidad medida baja del 80% de la contratada, el cliente recibe compensación automática en factura. La propuesta de valor (value proposition) está en revisión legal y no debe usarse externamente hasta su aprobación.",
      },
      {
        id: "doc-new-usp-fibra#2",
        heading: "Mensajes soporte",
        breadcrumb: "Nuevo USP › Mensajes",
        text: "Mensajes de soporte aprobados provisionalmente: la mayor red de fibra de Europa occidental, instalación en 24 horas y garantía sin letra pequeña. El claim de compensación automática requiere validación de Asesoría Jurídica antes de cualquier campaña.",
      },
    ],
  },
  {
    id: "doc-social-listening-w27",
    title: "Social Listening Digest — Week 27 2026",
    country: "Group",
    brand: "Telefónica",
    entity: "External Listening",
    quarter: "Q3 2026",
    type: "Social listening",
    confidentiality: "public",
    owner: "External Listening",
    validity: "approved",
    validUntil: "2026-07-14",
    language: "en",
    topics: ["social listening", "mentions", "sentiment", "talkwalker", "redes sociales", "menciones"],
    axisIds: ["ax-core", "ax-digital"],
    areas: ["Comunicación", "Marca"],
    sourceFormat: "API feed",
    connector: "Talkwalker feed (simulated, pre-filtered)",
    summary:
      "Weekly digest of relevant external mentions that passed the pre-ingestion relevance filter: sentiment stable at 68% positive-or-neutral, fibre guarantee chatter rising in Spain.",
    chunks: [
      {
        id: "doc-social-listening-w27#1",
        heading: "Sentiment and volume",
        breadcrumb: "Social Listening W27 › Sentiment",
        text: "Of 14,300 raw external mentions captured in week 27, 412 passed the relevance filter (keywords, tracked competitors, named executives, priority topics). Sentiment on the retained set was 68% positive or neutral. Only filtered mentions enter the knowledge core; raw chatter is never ingested.",
      },
      {
        id: "doc-social-listening-w27#2",
        heading: "Themes to watch",
        breadcrumb: "Social Listening W27 › Themes",
        text: "Rising themes: speculation about a Movistar symmetric-fibre guarantee in Spain (positive), questions about rural 5G coverage in Germany (negative flag), and analyst commentary on B2B cyber growth. The fibre-guarantee theme is flagged to Marca because the USP is not yet approved for external use.",
      },
    ],
  },
  {
    id: "doc-sic-regulatorio-q2",
    title: "SIC — Síntesis Regulatoria Q2 2026",
    country: "Spain",
    brand: "Telefónica",
    entity: "Regulación",
    quarter: "Q2 2026",
    type: "Regulatory brief",
    confidentiality: "internal",
    owner: "Dirección de Regulación",
    validity: "approved",
    validUntil: "2026-10-31",
    language: "es",
    topics: ["regulación", "cnmc", "espectro", "regulatory", "regulation", "spectrum", "sic"],
    axisIds: ["ax-networks", "ax-core"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "API feed",
    connector: "SIC feed (simulated, filter agreed with owners)",
    summary:
      "Síntesis del sistema de información corporativo (SIC): la CNMC abre consulta sobre la extensión del espectro 3,5 GHz y mantiene la senda de liberalización del cobre.",
    chunks: [
      {
        id: "doc-sic-regulatorio-q2#1",
        heading: "Consulta de espectro",
        breadcrumb: "SIC Q2 2026 › Espectro",
        text: "La CNMC ha abierto consulta pública sobre la extensión de las licencias de espectro (spectrum) en la banda de 3,5 GHz hasta 2040. La posición de la compañía apoya la extensión con obligaciones de cobertura rural proporcionadas. Cualquier declaración pública debe coordinarse con Regulación.",
      },
      {
        id: "doc-sic-regulatorio-q2#2",
        heading: "Cierre de cobre",
        breadcrumb: "SIC Q2 2026 › Cobre",
        text: "El calendario de cierre de centrales de cobre se mantiene: el 92% de las centrales estarán apagadas a final de 2026, consistente con el plan de redes. Este dato es utilizable externamente porque coincide con la información ya publicada.",
      },
    ],
  },
  {
    id: "doc-media-coverage-q2-2026",
    title: "Media Coverage Digest — Q2 2026",
    country: "Group",
    brand: "Telefónica",
    entity: "Media Relations",
    quarter: "Q2 2026",
    type: "Media digest",
    confidentiality: "public",
    owner: "Media Relations",
    validity: "approved",
    validUntil: "2026-10-31",
    language: "en",
    topics: ["media", "coverage", "press", "share of voice", "prensa", "cobertura", "medien"],
    axisIds: ["ax-core", "ax-b2b"],
    areas: ["Comunicación"],
    sourceFormat: "API feed",
    connector: "Media monitoring feed (simulated, pre-filtered)",
    summary:
      "Quarterly media digest: 1,240 relevant articles retained by the relevance filter, share of voice at 31% in the core markets, tone predominantly factual around results and B2B growth.",
    chunks: [
      {
        id: "doc-media-coverage-q2-2026#1",
        heading: "Share of voice",
        breadcrumb: "Media Digest Q2 2026 › Share of voice",
        text: "Share of voice across the four core markets was 31% in Q2 2026, ahead of the nearest competitor at 27%. The relevance filter retained 1,240 articles out of 9,700 captured; retained coverage was predominantly factual, centred on the Q1 results and Telefónica Tech growth.",
      },
    ],
  },
  {
    id: "doc-competitor-study-dt-2026",
    title: "Competitor Study — Deutsche Telekom Positioning 2026",
    country: "Germany",
    brand: "O2",
    entity: "Brand Insights",
    quarter: "Q2 2026",
    type: "Competitor study",
    confidentiality: "confidential",
    owner: "Global Brand Office",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["competitor", "deutsche telekom", "positioning", "germany", "wettbewerb", "competencia", "benchmark"],
    axisIds: ["ax-core"],
    areas: ["Marca", "Gabinete"],
    sourceFormat: "PDF",
    connector: "Manual upload",
    summary:
      "Confidential competitive study of Deutsche Telekom's 2026 brand positioning and price architecture in Germany, with implications for O2's premium-perception gap.",
    chunks: [
      {
        id: "doc-competitor-study-dt-2026#1",
        heading: "Positioning read",
        breadcrumb: "Competitor Study DT 2026 › Positioning",
        text: "Deutsche Telekom continues to anchor its German positioning on network superiority and premium service, sustaining a price premium of roughly 15% over O2 equivalents. The study concludes O2's most defensible counter-position is transparent value with verified network parity in cities, not a premium claim.",
      },
      {
        id: "doc-competitor-study-dt-2026#2",
        heading: "Implications for O2",
        breadcrumb: "Competitor Study DT 2026 › Implications",
        text: "Closing the premium-perception gap requires sustained proof points rather than claims: publish independent city-level network tests and extend the loyalty programme. This study is confidential; its figures must not be quoted externally.",
      },
    ],
  },
  {
    id: "doc-sector-report-gsma-2026",
    title: "Sector Report — European Telecoms Outlook 2026 (GSMA-style)",
    country: "Group",
    brand: "Telefónica",
    entity: "External research",
    quarter: "FY 2026",
    type: "Sector report",
    confidentiality: "public",
    owner: "Strategy & Insights",
    validity: "approved",
    validUntil: "2027-03-31",
    language: "en",
    topics: ["sector", "telecoms", "outlook", "market", "industry", "5g", "fibre", "informe sectorial", "branchenbericht"],
    axisIds: ["ax-networks", "ax-b2b"],
    areas: ["Comunicación", "Marca", "Gabinete"],
    sourceFormat: "PDF",
    connector: "Manual upload",
    summary:
      "Synthetic industry outlook: European telecom service revenue expected to grow 1.5% in 2026, with fibre passing 80% of households in Spain and B2B digital services as the fastest-growing segment.",
    chunks: [
      {
        id: "doc-sector-report-gsma-2026#1",
        heading: "European outlook",
        breadcrumb: "Sector Report 2026 › Outlook",
        text: "European telecom service revenue is expected to grow around 1.5% in 2026. Fibre now passes more than 80% of households in Spain, the highest in the large European markets, while Germany continues to lag on fibre but leads on 5G population coverage. B2B digital services remain the fastest-growing segment at 8% annually.",
      },
    ],
  },
  {
    id: "doc-eu-dsa-briefing",
    title: "EU Digital Services & AI Act — Compliance Briefing",
    country: "Group",
    brand: "Telefónica",
    entity: "Public Policy",
    quarter: "Q2 2026",
    type: "Legislation brief",
    confidentiality: "internal",
    owner: "Public Policy",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "en",
    topics: ["legislation", "eu", "ai act", "digital services act", "compliance", "regulación europea", "gesetzgebung"],
    axisIds: ["ax-sustainability", "ax-digital"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "Structured Word",
    connector: "SharePoint sync",
    summary:
      "Briefing on EU legislation affecting communications work in 2026: AI Act transparency duties for AI-generated content and Digital Services Act obligations relevant to brand campaigns.",
    chunks: [
      {
        id: "doc-eu-dsa-briefing#1",
        heading: "AI Act duties for comms",
        breadcrumb: "EU Legislation Briefing › AI Act",
        text: "From August 2026, AI-generated or AI-assisted public content must be identifiable as such under the EU AI Act transparency provisions. All SSoT-generated external drafts must carry the provenance label, and spokespeople must not present synthetic media as unedited footage.",
      },
      {
        id: "doc-eu-dsa-briefing#2",
        heading: "DSA and campaigns",
        breadcrumb: "EU Legislation Briefing › DSA",
        text: "The Digital Services Act requires clear labelling of paid placements and influencer partnerships. Brand campaigns must include the paid-partnership disclosure in every market; the legal minimum is not the ceiling — the brand standard is full disclosure.",
      },
    ],
  },
  {
    id: "doc-tkg-novelle-2026",
    title: "TKG-Novelle 2026 — Auswirkungen auf O2 Telefónica",
    country: "Germany",
    brand: "O2",
    entity: "Regulierung Deutschland",
    quarter: "Q2 2026",
    type: "Legislation brief",
    confidentiality: "internal",
    owner: "Regulierung Deutschland",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "de",
    topics: ["tkg", "gesetzgebung", "regulierung", "deutschland", "legislation", "regulation", "germany", "netzausbau"],
    axisIds: ["ax-networks"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "PDF",
    connector: "SharePoint sync",
    summary:
      "Zusammenfassung der TKG-Novelle 2026: beschleunigte Genehmigungen für den Netzausbau und neue Transparenzpflichten bei Mobilfunkverträgen für O2 Telefónica in Deutschland.",
    chunks: [
      {
        id: "doc-tkg-novelle-2026#1",
        heading: "Beschleunigter Netzausbau",
        breadcrumb: "TKG-Novelle 2026 › Netzausbau",
        text: "Die TKG-Novelle 2026 verkürzt Genehmigungsverfahren für Mobilfunkstandorte auf maximal drei Monate. Für O2 Telefónica bedeutet das einen schnelleren 5G-Ausbau (network build-out) im ländlichen Raum. Die Kommunikationslinie betont, dass O2 die neuen Verfahren aktiv nutzt.",
      },
      {
        id: "doc-tkg-novelle-2026#2",
        heading: "Transparenzpflichten",
        breadcrumb: "TKG-Novelle 2026 › Transparenz",
        text: "Neue Transparenzpflichten verlangen eine jährliche Vertragsübersicht für Mobilfunkkunden. O2 setzt die Pflicht ab Oktober 2026 um; die externe Kommunikation positioniert dies als Verbraucherfreundlichkeit, nicht als regulatorische Last.",
      },
    ],
  },
  {
    id: "doc-vivo-social-w27",
    title: "Escuta Social Vivo — Semana 27 de 2026",
    country: "Brazil",
    brand: "Vivo",
    entity: "Vivo Comunicação",
    quarter: "Q3 2026",
    type: "Social listening",
    confidentiality: "public",
    owner: "Vivo Comunicação",
    validity: "approved",
    validUntil: "2026-07-14",
    language: "pt",
    topics: ["escuta social", "vivo", "menções", "sentimento", "social listening", "mentions", "sentiment", "brasil"],
    axisIds: ["ax-core", "ax-digital"],
    areas: ["Comunicación", "Marca"],
    sourceFormat: "API feed",
    connector: "Talkwalker feed (simulated, pre-filtered)",
    summary:
      "Resumo semanal de escuta social da Vivo: sentimento 72% positivo ou neutro após o lançamento do Vivo Total, com o filtro de relevância retendo 380 menções de 11.900 capturadas.",
    chunks: [
      {
        id: "doc-vivo-social-w27#1",
        heading: "Sentimento e volume",
        breadcrumb: "Escuta Social Vivo S27 › Sentimento",
        text: "Na semana 27, o filtro de relevância reteve 380 menções de 11.900 capturadas sobre a Vivo no Brasil. O sentimento (sentiment) ficou em 72% positivo ou neutro, impulsionado pelo lançamento do Vivo Total. Menções irrelevantes nunca entram no núcleo de conhecimento.",
      },
      {
        id: "doc-vivo-social-w27#2",
        heading: "Temas em alta",
        breadcrumb: "Escuta Social Vivo S27 › Temas",
        text: "Temas em alta: elogios à velocidade da fibra em São Paulo, dúvidas sobre cobertura 5G no Nordeste e comparações de preço com a concorrência. O tema de cobertura foi sinalizado à equipa de redes para resposta coordenada.",
      },
    ],
  },
  {
    id: "doc-cnmc-datos-q1-2026",
    title: "CNMC — Datos del Mercado Español Q1 2026",
    country: "Spain",
    brand: "Movistar",
    entity: "External research",
    quarter: "Q1 2026",
    type: "Sector report",
    confidentiality: "public",
    owner: "Strategy & Insights",
    validity: "approved",
    validUntil: "2026-12-31",
    language: "es",
    topics: ["cnmc", "mercado", "españa", "cuota", "market", "spain", "share", "fibra", "portabilidad"],
    axisIds: ["ax-core"],
    areas: ["Comunicación", "Marca", "Gabinete"],
    sourceFormat: "API feed",
    connector: "CNMC open data feed (simulated)",
    summary:
      "Datos públicos del regulador español: Movistar mantiene el 27,4% de cuota móvil y lidera la banda ancha con el 35,1% en el primer trimestre de 2026.",
    assertions: [{ metric: "spain-mobile-share", period: "Q1 2026", value: "27.4%" }],
    chunks: [
      {
        id: "doc-cnmc-datos-q1-2026#1",
        heading: "Cuota de mercado",
        breadcrumb: "CNMC Q1 2026 › Cuotas",
        text: "Según los datos públicos de la CNMC del primer trimestre de 2026, Movistar mantiene una cuota (market share) del 27,4% en líneas móviles y lidera la banda ancha fija con el 35,1%. La portabilidad neta fue positiva por segundo trimestre consecutivo.",
      },
    ],
  },
  {
    id: "doc-ssot-weekly-brief-w27",
    title: "SSoT Weekly Executive Brief — Week 27 2026",
    country: "Group",
    brand: "Telefónica",
    entity: "Hub SSoT",
    quarter: "Q3 2026",
    type: "SSoT output",
    confidentiality: "internal",
    owner: "Hub SSoT",
    validity: "approved",
    validUntil: "2026-07-14",
    language: "en",
    topics: ["weekly brief", "executive summary", "ssot", "generated", "resumen ejecutivo"],
    axisIds: ["ax-core", "ax-digital"],
    areas: ["Comunicación", "Gabinete"],
    sourceFormat: "SSoT generated",
    connector: "Hub SSoT scheduled generation",
    summary:
      "System-generated weekly brief compiled from governed sources only, with every statement traceable to a cited document. Labelled as SSoT output under the AI Act provenance rule.",
    chunks: [
      {
        id: "doc-ssot-weekly-brief-w27#1",
        heading: "Week in brief",
        breadcrumb: "SSoT Weekly Brief W27 › Summary",
        text: "Week 27 summary, generated by the Hub from governed sources: external sentiment held at 68% positive or neutral; the CNMC confirmed Movistar's broadband leadership at 35.1%; and the fibre-guarantee USP remains in legal review and must not be used externally. Every statement in this brief traces to a cited governed document.",
      },
    ],
  },
  {
    id: "doc-research-genz-2026",
    title: "Estudio de Audiencias Jóvenes 2026 — Insights",
    country: "Spain",
    brand: "Movistar",
    entity: "Brand Insights",
    quarter: "Q2 2026",
    type: "Research",
    confidentiality: "internal",
    owner: "Marca España",
    validity: "approved",
    validUntil: "2027-03-31",
    language: "es",
    topics: ["audiencias", "jóvenes", "insights", "estudio", "research", "youth", "gen z", "audiences"],
    axisIds: ["ax-core", "ax-digital"],
    areas: ["Marca"],
    sourceFormat: "Self-explanatory PPT",
    connector: "Manual upload",
    summary:
      "Estudio de audiencias jóvenes: el 61% de los menores de 30 valora la transparencia de precios por encima del descuento, y la notoriedad de Movistar en ese segmento sube cuatro puntos.",
    chunks: [
      {
        id: "doc-research-genz-2026#1",
        heading: "Transparencia sobre descuento",
        breadcrumb: "Estudio Jóvenes 2026 › Insights",
        text: "El 61% de los menores de 30 años valora la transparencia de precios por encima del descuento puntual. El estudio (research) recomienda que la comunicación joven de Movistar evite promociones complejas y refuerce el mensaje de precio claro, alineado con la campaña 'Mismo sitio, mismo precio'.",
      },
    ],
  },
];

export const NUMERIC_FACTS: NumericFact[] = [
  {
    id: "num-nps-q1-2026",
    label: "Group NPS",
    value: "34",
    unit: "points",
    period: "Q1 2026",
    source: "Customer Experience Scorecard — NPS Q1 2026",
    docId: "doc-customer-nps-q1-2026",
    keywords: ["nps", "net promoter", "customer satisfaction", "satisfacción", "kundenzufriedenheit", "satisfação"],
  },
  {
    id: "num-brand-consideration-q1-2026",
    label: "Brand consideration",
    value: "52",
    unit: "%",
    period: "Q1 2026",
    source: "Brand Tracker Wave — Q1 2026 (Research)",
    docId: "doc-brand-tracker-q1-2026",
    keywords: ["consideration", "brand tracker", "brand power", "consideración", "marca", "markenstärke"],
  },
  {
    id: "num-spain-mobile-share-q1-2026",
    label: "Movistar mobile market share (Spain)",
    value: "27.4",
    unit: "%",
    period: "Q1 2026",
    source: "CNMC — Datos del Mercado Español Q1 2026",
    docId: "doc-cnmc-datos-q1-2026",
    keywords: ["cuota", "market share", "movistar", "spain mobile", "españa", "portabilidad"],
  },
  {
    id: "num-revenue-q1-2026",
    label: "Group revenue",
    value: "8,127",
    unit: "€M",
    period: "Q1 2026",
    source: "Q1 2026 Results — Financial Highlights",
    docId: "doc-q1-2026-results",
    keywords: ["revenue", "sales", "turnover", "ingresos", "income", "group revenue"],
  },
  {
    id: "num-ebitda-margin-q1-2026",
    label: "Adjusted EBITDA margin",
    value: "32.1",
    unit: "%",
    period: "Q1 2026",
    source: "Q1 2026 Results — Financial Highlights",
    docId: "doc-q1-2026-results",
    keywords: ["ebitda", "margin", "profitability"],
  },
  {
    id: "num-netzero-2040",
    label: "Net-zero target year",
    value: "2040",
    unit: "",
    period: "Group",
    source: "Sustainability Report 2025",
    docId: "doc-sustainability-2025",
    keywords: ["net zero", "net-zero", "carbon", "emissions", "climate target"],
  },
  {
    id: "num-dividend-2026",
    label: "Dividend per share",
    value: "0.30",
    unit: "€",
    period: "FY 2026",
    source: "Q1 2026 Results — Financial Highlights",
    docId: "doc-q1-2026-results",
    keywords: ["dividend", "dividend per share", "shareholder return", "payout"],
  },
  {
    id: "num-netdebt-q1-2026",
    label: "Net financial debt",
    value: "26,140",
    unit: "€M",
    period: "Q1 2026",
    source: "Q1 2026 Results — Financial Highlights",
    docId: "doc-q1-2026-results",
    keywords: ["net debt", "net financial debt", "leverage", "borrowings", "debt"],
  },
  {
    id: "num-chile-ev",
    label: "Chile disposal enterprise value",
    value: "1,240",
    unit: "€M",
    period: "Q1 2026",
    source: "Sale of Chilean Subsidiary — Announcement",
    docId: "doc-chile-sale",
    keywords: ["chile", "enterprise value", "disposal value", "sale price"],
  },
  {
    id: "num-tg-synergies",
    label: "Transform & Grow run-rate synergies",
    value: "400",
    unit: "€M",
    period: "by 2028",
    source: "Transform & Grow — Strategic Plan 2026-2028",
    docId: "doc-transform-grow-plan",
    keywords: ["synergies", "run-rate synergies", "efficiency savings", "transform and grow"],
  },
];

// Time-series numeric data for chart-from-data. Each series fails closed the
// same way single facts do: the chart is only rendered when its source doc is
// within the caller's effective clearance.
export interface NumericSeriesPoint {
  label: string;
  value: number;
}

export interface NumericSeries {
  id: string;
  label: string;
  unit: string;
  period: string;
  source: string;
  docId: string;
  keywords: string[];
  points: NumericSeriesPoint[];
}

export const NUMERIC_SERIES: NumericSeries[] = [
  {
    id: "series-accesses",
    label: "Total accesses",
    unit: "million",
    period: "Q1 2026",
    source: "Q1 2026 Results — Financial Highlights",
    docId: "doc-q1-2026-results",
    keywords: ["accesses", "access", "connections", "customers", "subscribers"],
    points: [
      { label: "Spain", value: 38.2 },
      { label: "Germany", value: 45.1 },
      { label: "Brazil", value: 116.4 },
      { label: "United Kingdom", value: 41.7 },
    ],
  },
  {
    id: "series-revenue-trend",
    label: "Group revenue trend",
    unit: "€M",
    period: "Q2 2025 - Q1 2026",
    source: "Q1 2026 Results — Financial Highlights",
    docId: "doc-q1-2026-results",
    keywords: ["revenue trend", "revenue growth", "quarterly revenue", "revenue"],
    points: [
      { label: "Q2 2025", value: 7910 },
      { label: "Q3 2025", value: 7955 },
      { label: "Q4 2025", value: 7982 },
      { label: "Q1 2026", value: 8127 },
    ],
  },
];

// Entity nodes (markets, brands, products, executives, figures). Axes come from
// AXES, compiled pages from COMPILED_PAGES and documents from DOCS — the full
// map graph is assembled in the kg adapter from all four sources.
export const GRAPH_NODES: GraphNode[] = [
  { id: "mkt-spain", name: "Spain", kind: "market", axisId: "ax-core", keywords: ["spain", "españa", "spanish"] },
  { id: "mkt-germany", name: "Germany", kind: "market", axisId: "ax-core", keywords: ["germany", "german", "alemania"] },
  { id: "mkt-brazil", name: "Brazil", kind: "market", axisId: "ax-core", keywords: ["brazil", "brasil", "brazilian"] },
  { id: "mkt-uk", name: "United Kingdom", kind: "market", axisId: "ax-core", keywords: ["uk", "united kingdom", "britain"] },
  { id: "mkt-mexico", name: "Mexico", kind: "market", keywords: ["mexico", "méxico", "mexican"] },
  { id: "mkt-chile", name: "Chile", kind: "market", keywords: ["chile", "chilean"] },
  { id: "brand-movistar", name: "Movistar", kind: "brand", axisId: "ax-core", keywords: ["movistar"] },
  { id: "brand-o2", name: "O2", kind: "brand", axisId: "ax-core", keywords: ["o2"] },
  { id: "brand-vivo", name: "Vivo", kind: "brand", axisId: "ax-core", keywords: ["vivo"] },
  { id: "brand-tech", name: "Telefónica Tech", kind: "brand", axisId: "ax-b2b", keywords: ["telefónica tech", "telefonica tech", "b2b", "enterprise"] },
  { id: "ax-core", name: "Grow the core", kind: "axis", keywords: ["core", "grow the core"] },
  { id: "ax-b2b", name: "Scale B2B & Tech", kind: "axis", keywords: ["b2b", "tech"] },
  { id: "ax-networks", name: "Build the best networks", kind: "axis", keywords: ["network", "5g", "fibre"] },
  { id: "prod-fusion", name: "Movistar Fusión", kind: "product", axisId: "ax-core", keywords: ["fusion", "fusión", "convergent", "bundle"] },
  { id: "prod-movistar-plus", name: "Movistar Plus+", kind: "product", axisId: "ax-core", keywords: ["movistar plus", "content", "tv"] },
  { id: "prod-tech-cyber", name: "Tech Cyber Security", kind: "product", axisId: "ax-b2b", keywords: ["cyber", "security", "managed"] },
  { id: "exec-ceo", name: "Group CEO", kind: "executive", axisId: "ax-networks", keywords: ["ceo", "chief executive"] },
  { id: "exec-cfo", name: "Group CFO", kind: "executive", axisId: "ax-core", keywords: ["cfo", "chief financial"] },
  {
    id: "fig-revenue-q1", name: "Group revenue Q1 2026", kind: "figure", axisId: "ax-core",
    confidentiality: "public", validity: "approved",
    figure: { value: "8,127", unit: "€M", period: "Q1 2026", docId: "doc-q1-2026-results" },
    keywords: ["revenue", "group revenue", "8127"],
  },
  {
    id: "fig-revenue-q4", name: "Group revenue Q4 2025", kind: "figure", axisId: "ax-core",
    confidentiality: "public", validity: "superseded",
    figure: { value: "7,982", unit: "€M", period: "Q4 2025", docId: "doc-q4-2025-results" },
    keywords: ["revenue", "q4 2025", "7982", "superseded"],
  },
  {
    id: "fig-ebitda-q1", name: "Adj. EBITDA margin Q1 2026", kind: "figure", axisId: "ax-core",
    confidentiality: "public", validity: "approved",
    figure: { value: "32.1", unit: "%", period: "Q1 2026", docId: "doc-q1-2026-results" },
    keywords: ["ebitda", "margin"],
  },
  {
    id: "fig-netzero", name: "Net-zero target year", kind: "figure", axisId: "ax-sustainability",
    confidentiality: "public", validity: "approved",
    figure: { value: "2040", unit: "", period: "Group", docId: "doc-sustainability-2025" },
    keywords: ["net zero", "net-zero", "2040", "emissions"],
  },
];

// Entity ↔ entity / entity → axis relationships (all dashed on the map).
export const GRAPH_EDGES: GraphEdge[] = [
  { from: "brand-movistar", to: "mkt-spain", relation: "operates in", type: "relationship" },
  { from: "brand-o2", to: "mkt-germany", relation: "operates in", type: "relationship" },
  { from: "brand-vivo", to: "mkt-brazil", relation: "operates in", type: "relationship" },
  { from: "brand-movistar", to: "ax-core", relation: "contributes to", type: "relationship", confidence: 0.9 },
  { from: "brand-tech", to: "ax-b2b", relation: "leads", type: "relationship", confidence: 0.92 },
  { from: "mkt-spain", to: "ax-networks", relation: "invests in", type: "relationship", confidence: 0.8 },
  { from: "brand-vivo", to: "ax-core", relation: "contributes to", type: "relationship" },
  { from: "mkt-chile", to: "mkt-mexico", relation: "Spanish America (Hispam)", type: "relationship" },
  { from: "prod-fusion", to: "brand-movistar", relation: "offered by", type: "relationship" },
  { from: "prod-movistar-plus", to: "brand-movistar", relation: "offered by", type: "relationship" },
  { from: "prod-tech-cyber", to: "brand-tech", relation: "offered by", type: "relationship" },
  { from: "exec-ceo", to: "ax-networks", relation: "champions", type: "relationship", confidence: 0.7 },
  { from: "exec-cfo", to: "ax-core", relation: "reports on", type: "relationship", confidence: 0.75 },
];

export const COMPILED_PAGES: CompiledPage[] = [
  {
    id: "page-core-revenue",
    nodeId: "page-core-revenue",
    title: "Core revenue trajectory",
    axisId: "ax-core",
    confidentiality: "public",
    validity: "approved",
    summary: "Group revenue is on a low-single-digit growth path, led by convergence and B2B.",
    position:
      "Telefónica's group revenue is on a low-single-digit growth path. In Q1 2026 group revenue reached €8,127M, up 1.8% year on year [E1], driven by convergent bundles in the core markets and double-digit growth at Telefónica Tech [E1]. The company has reaffirmed full-year 2026 guidance of low-single-digit revenue growth with stable-to-improving margins [E2]. The operational levers behind this trajectory are set out in [[Network leadership position]] and [[B2B growth thesis]].",
    evidence: [
      { marker: "E1", docId: "doc-q1-2026-results", chunkId: "doc-q1-2026-results#1", note: "Q1 2026 group revenue and growth drivers" },
      { marker: "E2", docId: "doc-q1-2026-results", chunkId: "doc-q1-2026-results#3", note: "Reaffirmed full-year guidance" },
    ],
    resolvedFacts: [
      {
        id: "rf-revenue",
        claim: "Current group revenue reference",
        resolvedValue: "€8,127M (Q1 2026)",
        supersededValue: "€7,982M (Q4 2025)",
        resolution:
          "The Q1 2026 release supersedes the Q4 2025 figure. The historic figure is retained but must not be cited as the current reference.",
        currentDocId: "doc-q1-2026-results",
        historicDocId: "doc-q4-2025-results",
        resolvedBy: "Investor Relations",
        resolvedAt: "2026-04-24",
      },
    ],
    openItems: [
      { id: "oi-fx", kind: "open", text: "Confirm FX impact on Brazil revenue for the H1 restatement.", owner: "Group Finance" },
      { id: "oi-guid", kind: "watch", text: "Full-year guidance to be re-tested at the H1 2026 results.", owner: "Investor Relations" },
    ],
    relatedPageIds: ["page-networks", "page-b2b"],
    changeLog: [
      { id: "cl-1", at: "2026-04-24", by: "Investor Relations", summary: "Refined position with Q1 2026 revenue; superseded the Q4 2025 figure." },
      { id: "cl-2", at: "2026-02-20", by: "Group Communications", summary: "Created page from Q4 2025 results release." },
    ],
    owners: ["Investor Relations", "Group Communications"],
    sourceDocIds: ["doc-q1-2026-results", "doc-q4-2025-results"],
    lastRefinedBy: "Investor Relations",
    lastRefinedAt: "2026-04-24",
    refined: true,
    keywords: ["revenue", "growth", "guidance", "convergence", "ebitda", "margin", "financials"],
  },
  {
    id: "page-networks",
    nodeId: "page-networks",
    title: "Network leadership position",
    axisId: "ax-networks",
    confidentiality: "public",
    validity: "approved",
    summary: "We claim network leadership on 5G standalone and full-fibre, retiring legacy copper.",
    position:
      "Telefónica positions itself to operate the best networks in each of its markets. At MWC Barcelona 2026 the CEO reaffirmed 5G standalone availability across major Spanish and German cities [E1]. AI is framed as a lever to simplify operations and improve experience, not to replace human judgement in sensitive communications [E2]. The internal deployment plan accelerates copper retirement in favour of full-fibre access, subject to regulatory milestones. This trajectory underpins [[Core revenue trajectory]].",
    evidence: [
      { marker: "E1", docId: "doc-mwc-2026-keynote", chunkId: "doc-mwc-2026-keynote#1", note: "5G standalone coverage claim" },
      { marker: "E2", docId: "doc-mwc-2026-keynote", chunkId: "doc-mwc-2026-keynote#2", note: "AI framing for operations" },
    ],
    resolvedFacts: [],
    openItems: [
      { id: "oi-copper", kind: "watch", text: "Copper retirement schedule pending regulatory milestones (plan under review).", owner: "Network Strategy" },
    ],
    relatedPageIds: ["page-core-revenue"],
    changeLog: [
      { id: "cl-1", at: "2026-03-04", by: "Executive Communications", summary: "Refined with MWC 2026 keynote positioning." },
    ],
    owners: ["Executive Communications", "Network Strategy"],
    sourceDocIds: ["doc-mwc-2026-keynote", "doc-5g-deployment"],
    lastRefinedBy: "Executive Communications",
    lastRefinedAt: "2026-03-04",
    refined: true,
    keywords: ["network", "5g", "fibre", "copper", "coverage", "mwc", "ai"],
  },
  {
    id: "page-b2b",
    nodeId: "page-b2b",
    title: "B2B growth thesis",
    axisId: "ax-b2b",
    confidentiality: "confidential",
    validity: "approved",
    summary: "Telefónica Tech scales high-margin enterprise revenue in cyber, cloud and IoT.",
    position:
      "Telefónica Tech is the engine of the Scale B2B & Tech axis. The plan prioritises managed cyber security and multi-cloud services for large enterprises, targeting double-digit annual revenue growth in the segment [E1]. The enterprise portfolio carries a higher margin profile than legacy connectivity and is a core lever of group profitability [E2]. Enterprise momentum reinforces [[Core revenue trajectory]].",
    evidence: [
      { marker: "E1", docId: "doc-tech-b2b-strategy", chunkId: "doc-tech-b2b-strategy#1", note: "Enterprise priorities and growth target" },
      { marker: "E2", docId: "doc-tech-b2b-strategy", chunkId: "doc-tech-b2b-strategy#2", note: "Margin profile of the enterprise portfolio" },
    ],
    resolvedFacts: [],
    openItems: [
      { id: "oi-mix", kind: "open", text: "Quantify cyber vs cloud revenue mix for the next board review.", owner: "B2B Strategy" },
    ],
    relatedPageIds: ["page-core-revenue"],
    changeLog: [
      { id: "cl-1", at: "2026-03-18", by: "B2B Strategy", summary: "Compiled thesis from the confidential B2B growth strategy." },
    ],
    owners: ["B2B Strategy"],
    sourceDocIds: ["doc-tech-b2b-strategy"],
    lastRefinedBy: "B2B Strategy",
    lastRefinedAt: "2026-03-18",
    refined: false,
    keywords: ["b2b", "enterprise", "cyber", "cloud", "iot", "tech", "margin"],
  },
  {
    id: "page-simplify",
    nodeId: "page-simplify",
    title: "Simplify & digitalise operations",
    axisId: "ax-digital",
    confidentiality: "internal",
    validity: "approved",
    summary: "Disciplined media operations and AI-led simplification lower cost-to-serve.",
    position:
      "The Simplify & digitalise axis pairs operational simplification with disciplined communications. AI is positioned to simplify operations and improve customer experience [E1]. On the media side, only authorised spokespeople may speak on the record, and all press enquiries are routed through the Media Relations desk, which logs the enquiry and agrees attribution [E2]. This discipline protects the positions defended in [[Core revenue trajectory]].",
    evidence: [
      { marker: "E1", docId: "doc-mwc-2026-keynote", chunkId: "doc-mwc-2026-keynote#2", note: "AI to simplify operations" },
      { marker: "E2", docId: "doc-media-relations", chunkId: "doc-media-relations#1", note: "Spokesperson and attribution discipline" },
    ],
    resolvedFacts: [],
    openItems: [
      { id: "oi-auto", kind: "watch", text: "Track cost-to-serve reduction from operational automation.", owner: "Transformation Office" },
    ],
    relatedPageIds: ["page-core-revenue"],
    changeLog: [
      { id: "cl-1", at: "2026-03-10", by: "Internal Communications", summary: "Compiled from keynote and media-relations guidance." },
    ],
    owners: ["Internal Communications", "Transformation Office"],
    sourceDocIds: ["doc-mwc-2026-keynote", "doc-media-relations"],
    lastRefinedBy: "Internal Communications",
    lastRefinedAt: "2026-03-10",
    refined: false,
    keywords: ["simplify", "digitalise", "ai", "automation", "media", "spokesperson", "cost"],
  },
  {
    id: "page-netzero",
    nodeId: "page-netzero",
    title: "Responsible growth & net zero",
    axisId: "ax-sustainability",
    confidentiality: "public",
    validity: "approved",
    summary: "Profitable growth within a firm net-zero-by-2040 and digital-inclusion commitment.",
    position:
      "Telefónica commits to profitable growth within firm sustainability boundaries. The company reaffirms its commitment to reach net-zero emissions by 2040 across its main markets, having cut Scope 1 and 2 emissions materially since the 2015 baseline [E1]. Digital inclusion programmes extended connectivity and skills to rural communities across Spain, Germany, Brazil and the United Kingdom [E2]. Brand voice principles — clear, human and confident, never using emoji — govern how this is communicated.",
    evidence: [
      { marker: "E1", docId: "doc-sustainability-2025", chunkId: "doc-sustainability-2025#1", note: "Net-zero 2040 commitment" },
      { marker: "E2", docId: "doc-sustainability-2025", chunkId: "doc-sustainability-2025#2", note: "Digital inclusion programmes" },
    ],
    resolvedFacts: [],
    openItems: [
      { id: "oi-scope3", kind: "open", text: "Add Scope 3 pathway detail once the supplier data is validated.", owner: "Sustainability Office" },
    ],
    relatedPageIds: [],
    changeLog: [
      { id: "cl-1", at: "2026-01-30", by: "Sustainability Office", summary: "Compiled from the 2025 sustainability report." },
    ],
    owners: ["Sustainability Office", "Global Brand Office"],
    sourceDocIds: ["doc-sustainability-2025", "doc-brand-guidelines-2026"],
    lastRefinedBy: "Sustainability Office",
    lastRefinedAt: "2026-01-30",
    refined: false,
    keywords: ["net zero", "sustainability", "emissions", "climate", "inclusion", "responsible", "brand", "voice"],
  },
];

export const DOC_LINEAGE: DocLineage[] = [
  {
    docId: "doc-q1-2026-results",
    sourceFile: "Q1-2026-Results-Financial-Highlights.pdf",
    taxonomyVersion: "tax-2026.1",
    ingestion: [
      { stage: "Source file", detail: "Ingested from Investor Relations SharePoint (12 slides, PDF).", at: "2026-04-24T07:10:00Z", actor: "ingest-service" },
      { stage: "Extraction", detail: "Text and figures extracted per slide; 3 chunks created with breadcrumbs.", at: "2026-04-24T07:11:00Z", actor: "ingest-service" },
      { stage: "Classification", detail: "Classified under Grow the core and Scale B2B & Tech; language en.", at: "2026-04-24T07:12:00Z", actor: "auto-classifier" },
    ],
    validation: [
      { field: "confidentiality", proposed: "internal", approved: "public", by: "Investor Relations", at: "2026-04-24", status: "corrected" },
      { field: "validity", proposed: "approved", approved: "approved", by: "Investor Relations", at: "2026-04-24", status: "accepted" },
      { field: "axisIds", proposed: "ax-core", approved: "ax-core, ax-b2b", by: "Group Communications", at: "2026-04-24", status: "corrected" },
    ],
  },
  {
    docId: "doc-q4-2025-results",
    sourceFile: "Q4-2025-Results-Financial-Highlights.pdf",
    taxonomyVersion: "tax-2025.4",
    ingestion: [
      { stage: "Source file", detail: "Ingested from Investor Relations SharePoint (PDF).", at: "2026-02-20T08:00:00Z", actor: "ingest-service" },
      { stage: "Extraction", detail: "Single revenue chunk extracted.", at: "2026-02-20T08:01:00Z", actor: "ingest-service" },
      { stage: "Classification", detail: "Superseded by Q1 2026 release; retained as historic.", at: "2026-04-24T07:12:00Z", actor: "Investor Relations" },
    ],
    validation: [
      { field: "validity", proposed: "approved", approved: "superseded", by: "Investor Relations", at: "2026-04-24", status: "corrected" },
    ],
  },
  {
    docId: "doc-brand-guidelines-2026",
    sourceFile: "Telefonica-Brand-Guidelines-2026.pdf",
    taxonomyVersion: "tax-2026.1",
    ingestion: [
      { stage: "Source file", detail: "Ingested from the Global Brand Office (PDF).", at: "2026-01-15T09:00:00Z", actor: "ingest-service" },
      { stage: "Extraction", detail: "Colour, logo and voice sections extracted as 3 chunks.", at: "2026-01-15T09:02:00Z", actor: "ingest-service" },
      { stage: "Classification", detail: "Classified under Responsible growth; marked internal.", at: "2026-01-15T09:03:00Z", actor: "auto-classifier" },
    ],
    validation: [
      { field: "confidentiality", proposed: "public", approved: "internal", by: "Global Brand Office", at: "2026-01-16", status: "corrected" },
      { field: "topics", proposed: "brand, logo", approved: "brand, logo, colour, identity, typography, tone", by: "Global Brand Office", at: "2026-01-16", status: "corrected" },
    ],
  },
  {
    docId: "doc-mwc-2026-keynote",
    sourceFile: "MWC-2026-CEO-Keynote-transcript.docx",
    taxonomyVersion: "tax-2026.1",
    ingestion: [
      { stage: "Source file", detail: "Ingested from Executive Communications (transcript).", at: "2026-03-04T18:30:00Z", actor: "ingest-service" },
      { stage: "Extraction", detail: "Networks and AI sections extracted as 2 chunks.", at: "2026-03-04T18:31:00Z", actor: "ingest-service" },
      { stage: "Classification", detail: "Classified under Build the best networks and Simplify & digitalise.", at: "2026-03-04T18:32:00Z", actor: "auto-classifier" },
    ],
    validation: [
      { field: "confidentiality", proposed: "public", approved: "public", by: "Executive Communications", at: "2026-03-05", status: "accepted" },
    ],
  },
  {
    docId: "doc-tech-b2b-strategy",
    sourceFile: "Telefonica-Tech-B2B-Growth-Strategy.pptx",
    taxonomyVersion: "tax-2026.1",
    ingestion: [
      { stage: "Source file", detail: "Ingested from B2B Strategy (restricted share).", at: "2026-03-18T10:00:00Z", actor: "ingest-service" },
      { stage: "Extraction", detail: "Priorities and economics extracted as 2 chunks.", at: "2026-03-18T10:02:00Z", actor: "ingest-service" },
      { stage: "Classification", detail: "Classified under Scale B2B & Tech; marked confidential.", at: "2026-03-18T10:03:00Z", actor: "auto-classifier" },
    ],
    validation: [
      { field: "confidentiality", proposed: "internal", approved: "confidential", by: "B2B Strategy", at: "2026-03-19", status: "corrected" },
    ],
  },
  {
    docId: "doc-sustainability-2025",
    sourceFile: "Sustainability-Report-2025.pdf",
    taxonomyVersion: "tax-2026.1",
    ingestion: [
      { stage: "Source file", detail: "Ingested from the Sustainability Office (PDF).", at: "2026-01-30T11:00:00Z", actor: "ingest-service" },
      { stage: "Extraction", detail: "Net-zero and inclusion sections extracted as 2 chunks.", at: "2026-01-30T11:02:00Z", actor: "ingest-service" },
      { stage: "Classification", detail: "Classified under Responsible growth; language en.", at: "2026-01-30T11:03:00Z", actor: "auto-classifier" },
    ],
    validation: [
      { field: "confidentiality", proposed: "public", approved: "public", by: "Sustainability Office", at: "2026-01-31", status: "accepted" },
    ],
  },
  {
    docId: "doc-media-relations",
    sourceFile: "Media-Relations-Guidelines.docx",
    taxonomyVersion: "tax-2026.1",
    ingestion: [
      { stage: "Source file", detail: "Ingested from Media Relations.", at: "2026-02-02T09:00:00Z", actor: "ingest-service" },
      { stage: "Extraction", detail: "Spokespeople section extracted as 1 chunk.", at: "2026-02-02T09:01:00Z", actor: "ingest-service" },
      { stage: "Classification", detail: "Classified under Simplify & digitalise; marked internal.", at: "2026-02-02T09:02:00Z", actor: "auto-classifier" },
    ],
    validation: [
      { field: "confidentiality", proposed: "internal", approved: "internal", by: "Media Relations", at: "2026-02-03", status: "accepted" },
    ],
  },
];

export const WIKI_STATS = {
  factsResolved: 3,
  conflictsSettled: 2,
  pagesRefined: 4,
  windowLabel: "This week",
};

export const SUGGESTIONS = [
  { id: "sug-revenue", text: "What was Telefónica's group revenue in Q1 2026?", kind: "cited" },
  { id: "sug-brand-blue", text: "What is the primary Telefónica brand colour and when is navy used?", kind: "cited" },
  { id: "sug-netzero", text: "What is Telefónica's net-zero commitment?", kind: "cited" },
  { id: "sug-defend", text: "What group revenue figure do we defend for Q1 2026?", kind: "cited" },
  { id: "sug-vivo-mexico", text: "What is Vivo's position in Mexico?", kind: "cited" },
  { id: "sug-messaging", text: "What is our approved messaging on Q1 2026 revenue?", kind: "conflict" },
  { id: "sug-prelim", text: "What are the pre-publication preliminary Q1 finance figures?", kind: "permission" },
  { id: "sug-atlas", text: "Is Telefónica planning any acquisition or merger?", kind: "permission" },
  { id: "sug-quantum", text: "What is Telefónica's strategy for consumer quantum computing devices?", kind: "no_evidence" },
  { id: "sug-oldrev", text: "What was group revenue in Q4 2025?", kind: "historic" },
  { id: "sug-copper", text: "What is the plan for copper network retirement in Spain?", kind: "low_confidence" },
];

export const ADMIN_PROFILES: AdminProfile[] = [
  {
    id: "superadmin",
    label: "Superadmin",
    scope: "Full backend + workspace",
    detail:
      "Complete control of the platform: users, profiles, permissions, scheduled documents, corpus governance and the full workspace.",
  },
  {
    id: "admin",
    label: "Admin",
    scope: "Metadata, Brand Room, access-control",
    detail:
      "Manages document metadata, the Brand Room and access control (users, areas and profiles). Cannot alter platform-level configuration.",
  },
  {
    id: "editor",
    label: "Editor",
    scope: "Workspace: Documentation + agent, KPIs, Planning",
    detail:
      "Works in the governed workspace — Documentation and the agent, KPIs and Planning. No access to backend access-control.",
  },
  {
    id: "audit",
    label: "Audit",
    scope: "Read-only trail",
    detail:
      "Read-only view of the audit trail: permission changes and scheduled runs. Cannot change any configuration or content.",
  },
];

export const PLATFORM_USERS: PlatformUser[] = [
  {
    id: "user-elena-ramos",
    name: "Elena Ramos",
    email: "elena.ramos@telefonica.com",
    area: "Gabinete",
    profileId: "superadmin",
    clearance: "restricted",
  },
  {
    id: "user-marco-diaz",
    name: "Marco Díaz",
    email: "marco.diaz@telefonica.com",
    area: "Comunicación",
    profileId: "admin",
    clearance: "confidential",
  },
  {
    id: "user-sofia-lang",
    name: "Sofía Lang",
    email: "sofia.lang@telefonica.com",
    area: "Marca",
    profileId: "admin",
    clearance: "internal",
  },
  {
    id: "user-david-keller",
    name: "David Keller",
    email: "david.keller@telefonica.com",
    area: "Comunicación",
    profileId: "editor",
    clearance: "internal",
  },
  {
    id: "user-lucia-fernandez",
    name: "Lucía Fernández",
    email: "lucia.fernandez@telefonica.com",
    area: "Marca",
    profileId: "editor",
    clearance: "public",
  },
  {
    id: "user-tomas-neu",
    name: "Tomás Neu",
    email: "tomas.neu@telefonica.com",
    area: "Gabinete",
    profileId: "audit",
    clearance: "confidential",
  },
];

export const SCHEDULED_DOCS: ScheduledDoc[] = [
  {
    id: "sched-weekly-press-digest",
    template: "Weekly press digest",
    frequency: "Weekly · Monday 08:00 CET",
    languages: ["es", "en"],
    owner: "Media Relations",
    reviewFolder: "Comunicación / Review / Press digest",
    sourceDocId: "doc-media-relations",
    status: "active",
  },
  {
    id: "sched-quarterly-results-brief",
    template: "Quarterly results briefing",
    frequency: "Quarterly · results day +1",
    languages: ["en"],
    owner: "Investor Relations",
    reviewFolder: "Gabinete / Review / Results brief",
    sourceDocId: "doc-q1-2026-results",
    status: "active",
  },
  {
    id: "sched-brand-consistency-note",
    template: "Brand consistency note",
    frequency: "Monthly · first working day",
    languages: ["es", "en"],
    owner: "Global Brand Office",
    reviewFolder: "Marca / Review / Brand notes",
    sourceDocId: "doc-brand-guidelines-2026",
    status: "paused",
  },
  {
    id: "sched-sustainability-snapshot",
    template: "Sustainability snapshot",
    frequency: "Monthly · mid-month",
    languages: ["en"],
    owner: "Sustainability Office",
    reviewFolder: "Comunicación / Review / Sustainability",
    sourceDocId: "doc-esg-scorecard-2026",
    status: "active",
  },
];

export const AUDIT_LOG: AuditEntry[] = [
  {
    id: "audit-1",
    actor: "Elena Ramos",
    action: "Registered user",
    target: "David Keller (Editor · Comunicación)",
    kind: "user",
    timestamp: "2026-06-30T09:12:00Z",
    detail: "New Editor onboarded to Comunicación with internal clearance.",
  },
  {
    id: "audit-2",
    actor: "Marco Díaz",
    action: "Permission change",
    target: "Sofía Lang",
    kind: "permission",
    timestamp: "2026-07-01T14:40:00Z",
    detail: "Clearance kept at internal; profile confirmed as Admin for Marca.",
  },
  {
    id: "audit-3",
    actor: "System",
    action: "Scheduled run",
    target: "Weekly press digest",
    kind: "run",
    timestamp: "2026-07-06T06:03:00Z",
    detail: "Draft generated and delivered to the Media Relations review folder. Not published.",
  },
  {
    id: "audit-4",
    actor: "Elena Ramos",
    action: "Schedule created",
    target: "Quarterly results briefing",
    kind: "schedule",
    timestamp: "2026-07-02T11:20:00Z",
    detail: "Recurring briefing bound to Q1 2026 Results. Output routed to review folder.",
  },
  {
    id: "audit-5",
    actor: "System",
    action: "Scheduled run",
    target: "Sustainability snapshot",
    kind: "run",
    timestamp: "2026-07-06T12:00:00Z",
    detail: "Run flagged: source document missing. Draft withheld pending source review.",
  },
];

const docById = new Map(DOCS.map((d) => [d.id, d]));
export function getDoc(id: string): CorpusDoc | undefined {
  return docById.get(id);
}

export function resolveScheduleStatus(s: ScheduledDoc): ScheduleStatus {
  if (s.sourceDocId && !docById.has(s.sourceDocId)) return "orphaned";
  return s.status;
}

// ============================================================
// KPIs — governed objective tracking (configuration-as-data).
// Objectives are the goals Telefónica has set; KPI definitions are
// configured against those objectives, blending internal results with
// external signals (Talkwalker, Meltwater, Kantar, Nielsen, LinkedIn).
// Nothing here is hard-coded in the UI — the panel adapts by configuration.
// ============================================================

export type KpiPeriodType = "week" | "month" | "quarter";
export type KpiDirection = "higher-better" | "lower-better";
export type InitiativeType = "reputation" | "brand" | "campaign";

export interface Objective {
  id: string;
  name: string;
  description: string;
  axisId: string;
  area: Area;
  period: string;
}

export interface KpiComposingSource {
  id: string;
  label: string;
  kind: "internal" | "external";
  weight: number;
  docId?: string;
  note?: string;
  conflict?: boolean;
}

export interface KpiBreakdownGroup {
  dimension: string;
  points: { label: string; value: number }[];
}

export interface KpiDefinition {
  id: string;
  objectiveId: string;
  name: string;
  description: string;
  unit: string;
  axisId: string;
  market: string;
  brand: string;
  initiativeType: InitiativeType;
  confidentiality: Clearance;
  areas: Area[];
  direction: KpiDirection;
  target: number;
  confidence: number;
  sources: KpiComposingSource[];
  series: Record<KpiPeriodType, number[]>;
  breakdowns: KpiBreakdownGroup[];
}

export interface KpiMention {
  id: string;
  kpiIds: string[];
  source: string;
  market: string;
  sentiment: "positive" | "neutral" | "negative";
  date: string;
  text: string;
  confidentiality: Clearance;
}

export const OBJECTIVES: Objective[] = [
  {
    id: "obj-reputation",
    name: "Protect and grow corporate reputation",
    description:
      "Keep Telefónica's reputation and share of voice ahead of the sector across its main markets.",
    axisId: "ax-digital",
    area: "Comunicación",
    period: "FY2026",
  },
  {
    id: "obj-brand",
    name: "Strengthen brand equity and consistency",
    description:
      "Grow consideration for the commercial brands and hold brand execution consistent everywhere.",
    axisId: "ax-sustainability",
    area: "Marca",
    period: "FY2026",
  },
  {
    id: "obj-conversation",
    name: "Lead the industry conversation",
    description:
      "Own the narrative on networks, AI and enterprise technology in earned and social media.",
    axisId: "ax-networks",
    area: "Comunicación",
    period: "FY2026",
  },
  {
    id: "obj-campaign",
    name: "Deliver measurable campaign impact",
    description:
      "Convert campaign investment into recall and consideration in the core markets.",
    axisId: "ax-core",
    area: "Marca",
    period: "Q2 2026",
  },
];

export const KPIS: KpiDefinition[] = [
  {
    id: "kpi-sov",
    objectiveId: "obj-conversation",
    name: "Share of Voice",
    description:
      "Telefónica's share of sector conversation across earned and social media, blended from the internal media tracker and Talkwalker.",
    unit: "%",
    axisId: "ax-networks",
    market: "Group",
    brand: "Telefónica",
    initiativeType: "reputation",
    confidentiality: "internal",
    areas: ["Comunicación", "Gabinete"],
    direction: "higher-better",
    target: 30,
    confidence: 0.9,
    sources: [
      { id: "src-sov-internal", label: "Internal media tracker", kind: "internal", weight: 0.5, docId: "doc-media-relations", note: "Media Relations desk share tracker" },
      { id: "src-sov-talkwalker", label: "Talkwalker", kind: "external", weight: 0.5, note: "Talkwalker reports 28% vs the internal tracker's 32% — sources disagree.", conflict: true },
    ],
    series: {
      week: [28, 29, 30, 31, 30, 31, 32, 32],
      month: [27, 29, 30, 31, 32, 32],
      quarter: [26, 29, 31, 32],
    },
    breakdowns: [
      {
        dimension: "Market",
        points: [
          { label: "Spain", value: 34 },
          { label: "Germany", value: 29 },
          { label: "Brazil", value: 21 },
          { label: "United Kingdom", value: 16 },
        ],
      },
    ],
  },
  {
    id: "kpi-sentiment-brazil",
    objectiveId: "obj-reputation",
    name: "Net Sentiment · Brazil",
    description:
      "Net positive-minus-negative sentiment for Vivo in Brazil, blended from Talkwalker social listening and the internal Brazil market read.",
    unit: "pts",
    axisId: "ax-core",
    market: "Brazil",
    brand: "Vivo",
    initiativeType: "reputation",
    confidentiality: "internal",
    areas: ["Comunicación", "Gabinete"],
    direction: "higher-better",
    target: 20,
    confidence: 0.86,
    sources: [
      { id: "src-sent-talkwalker", label: "Talkwalker", kind: "external", weight: 0.6, note: "Social listening across Brazilian platforms" },
      { id: "src-sent-internal", label: "Brazil market read", kind: "internal", weight: 0.4, docId: "doc-brazil-vivo" },
    ],
    series: {
      week: [18, 16, 15, 13, 11, 9, 7, 6],
      month: [20, 16, 12, 9, 7, 6],
      quarter: [22, 15, 9, 6],
    },
    breakdowns: [
      {
        dimension: "Channel",
        points: [
          { label: "Social", value: -14 },
          { label: "News", value: 8 },
          { label: "Forums", value: -6 },
          { label: "Broadcast", value: 4 },
        ],
      },
    ],
  },
  {
    id: "kpi-media-coverage",
    objectiveId: "obj-reputation",
    name: "Positive Media Coverage",
    description:
      "Share of earned coverage rated positive, blended from Meltwater and the internal media desk.",
    unit: "%",
    axisId: "ax-digital",
    market: "Group",
    brand: "Telefónica",
    initiativeType: "reputation",
    confidentiality: "internal",
    areas: ["Comunicación", "Gabinete"],
    direction: "higher-better",
    target: 70,
    confidence: 0.88,
    sources: [
      { id: "src-cov-meltwater", label: "Meltwater", kind: "external", weight: 0.6 },
      { id: "src-cov-internal", label: "Internal media desk", kind: "internal", weight: 0.4, docId: "doc-media-relations" },
    ],
    series: {
      week: [68, 69, 70, 71, 72, 72, 73, 73],
      month: [66, 69, 71, 72, 73, 73],
      quarter: [64, 69, 72, 73],
    },
    breakdowns: [
      {
        dimension: "Market",
        points: [
          { label: "Spain", value: 76 },
          { label: "Germany", value: 71 },
          { label: "Brazil", value: 70 },
          { label: "United Kingdom", value: 72 },
        ],
      },
    ],
  },
  {
    id: "kpi-brand-consideration",
    objectiveId: "obj-brand",
    name: "Brand Consideration · Movistar",
    description:
      "Consideration for Movistar in Spain, blended from the Kantar brand tracker and the internal campaign read.",
    unit: "%",
    axisId: "ax-core",
    market: "Spain",
    brand: "Movistar",
    initiativeType: "brand",
    confidentiality: "internal",
    areas: ["Marca", "Comunicación"],
    direction: "higher-better",
    target: 45,
    confidence: 0.84,
    sources: [
      { id: "src-cons-kantar", label: "Kantar", kind: "external", weight: 0.5 },
      { id: "src-cons-internal", label: "Campaign read", kind: "internal", weight: 0.5, docId: "doc-campaign-mismo-sitio" },
    ],
    series: {
      week: [40, 41, 42, 42, 43, 43, 43, 43],
      month: [39, 41, 42, 43, 43, 43],
      quarter: [38, 41, 42, 43],
    },
    breakdowns: [
      {
        dimension: "Segment",
        points: [
          { label: "Youth", value: 39 },
          { label: "Family", value: 46 },
          { label: "Senior", value: 44 },
        ],
      },
    ],
  },
  {
    id: "kpi-brand-consistency",
    objectiveId: "obj-brand",
    name: "Brand Consistency Score",
    description:
      "Share of surfaces audited as fully compliant with the 2026 brand guidelines.",
    unit: "%",
    axisId: "ax-sustainability",
    market: "Group",
    brand: "Telefónica",
    initiativeType: "brand",
    confidentiality: "internal",
    areas: ["Marca", "Comunicación"],
    direction: "higher-better",
    target: 90,
    confidence: 0.82,
    sources: [
      { id: "src-consist-internal", label: "Brand guidelines audit", kind: "internal", weight: 1, docId: "doc-brand-guidelines-2026" },
    ],
    series: {
      week: [89, 90, 91, 91, 92, 92, 93, 93],
      month: [88, 90, 91, 92, 93, 93],
      quarter: [87, 90, 92, 93],
    },
    breakdowns: [
      {
        dimension: "Channel",
        points: [
          { label: "Web", value: 95 },
          { label: "Retail", value: 90 },
          { label: "Social", value: 92 },
          { label: "TV", value: 94 },
        ],
      },
    ],
  },
  {
    id: "kpi-tech-awareness",
    objectiveId: "obj-conversation",
    name: "Telefónica Tech Awareness",
    description:
      "Prompted enterprise awareness of Telefónica Tech, blended from LinkedIn signal and the confidential B2B growth read.",
    unit: "%",
    axisId: "ax-b2b",
    market: "Group",
    brand: "Telefónica Tech",
    initiativeType: "reputation",
    confidentiality: "confidential",
    areas: ["Comunicación", "Gabinete"],
    direction: "higher-better",
    target: 25,
    confidence: 0.8,
    sources: [
      { id: "src-tech-linkedin", label: "LinkedIn", kind: "external", weight: 0.4 },
      { id: "src-tech-internal", label: "B2B growth read", kind: "internal", weight: 0.6, docId: "doc-tech-b2b-strategy" },
    ],
    series: {
      week: [23, 24, 24, 25, 25, 26, 26, 27],
      month: [22, 24, 25, 26, 26, 27],
      quarter: [21, 24, 26, 27],
    },
    breakdowns: [
      {
        dimension: "Market",
        points: [
          { label: "Spain", value: 30 },
          { label: "Germany", value: 26 },
          { label: "United Kingdom", value: 24 },
        ],
      },
    ],
  },
  {
    id: "kpi-campaign-recall",
    objectiveId: "obj-campaign",
    name: "Campaign Recall · 'Mismo sitio'",
    description:
      "Aided recall of the 'Mismo sitio, mismo precio' campaign, blended from Nielsen and the internal campaign read.",
    unit: "%",
    axisId: "ax-core",
    market: "Spain",
    brand: "Movistar",
    initiativeType: "campaign",
    confidentiality: "internal",
    areas: ["Marca", "Comunicación"],
    direction: "higher-better",
    target: 55,
    confidence: 0.85,
    sources: [
      { id: "src-recall-nielsen", label: "Nielsen", kind: "external", weight: 0.5 },
      { id: "src-recall-internal", label: "Campaign read", kind: "internal", weight: 0.5, docId: "doc-campaign-mismo-sitio" },
    ],
    series: {
      week: [50, 52, 53, 54, 55, 56, 57, 58],
      month: [48, 51, 53, 55, 57, 58],
      quarter: [46, 51, 55, 58],
    },
    breakdowns: [
      {
        dimension: "Segment",
        points: [
          { label: "Existing customers", value: 61 },
          { label: "New prospects", value: 52 },
        ],
      },
    ],
  },
  {
    id: "kpi-crisis-readiness",
    objectiveId: "obj-reputation",
    name: "Crisis Response Readiness",
    description:
      "Readiness score against the crisis communications playbook (drills, contacts, holding statements).",
    unit: "%",
    axisId: "ax-digital",
    market: "Group",
    brand: "Telefónica",
    initiativeType: "reputation",
    confidentiality: "internal",
    areas: ["Comunicación", "Gabinete"],
    direction: "higher-better",
    target: 95,
    confidence: 0.83,
    sources: [
      { id: "src-crisis-internal", label: "Crisis playbook audit", kind: "internal", weight: 1, docId: "doc-crisis-playbook" },
    ],
    series: {
      week: [92, 93, 94, 94, 95, 95, 96, 96],
      month: [91, 93, 94, 95, 96, 96],
      quarter: [90, 93, 95, 96],
    },
    breakdowns: [
      {
        dimension: "Dimension",
        points: [
          { label: "Playbook", value: 98 },
          { label: "Drills", value: 94 },
          { label: "Contacts", value: 96 },
        ],
      },
    ],
  },
  {
    id: "kpi-employee-advocacy",
    objectiveId: "obj-brand",
    name: "Employee Advocacy",
    description:
      "Share of employees actively advocating the brand, read from the spring 2026 town hall pulse.",
    unit: "%",
    axisId: "ax-digital",
    market: "Group",
    brand: "Telefónica",
    initiativeType: "brand",
    confidentiality: "internal",
    areas: ["Comunicación", "Marca"],
    direction: "higher-better",
    target: 60,
    confidence: 0.72,
    sources: [
      { id: "src-adv-internal", label: "Town hall pulse", kind: "internal", weight: 1, docId: "doc-townhall-2026" },
    ],
    series: {
      week: [55, 55, 56, 56, 57, 57, 57, 57],
      month: [54, 55, 56, 56, 57, 57],
      quarter: [53, 55, 56, 57],
    },
    breakdowns: [
      {
        dimension: "Market",
        points: [
          { label: "Spain", value: 60 },
          { label: "Germany", value: 54 },
          { label: "Brazil", value: 58 },
        ],
      },
    ],
  },
];

export const KPI_MENTIONS: KpiMention[] = [
  {
    id: "mention-br-outage",
    kpiIds: ["kpi-sentiment-brazil", "kpi-sov"],
    source: "Talkwalker",
    market: "Brazil",
    sentiment: "negative",
    date: "2026-06-27",
    text: "Vivo customers in São Paulo reported a weekend service outage; social sentiment turned sharply negative and drove a spike in complaint volume.",
    confidentiality: "public",
  },
  {
    id: "mention-br-billing",
    kpiIds: ["kpi-sentiment-brazil"],
    source: "Talkwalker",
    market: "Brazil",
    sentiment: "negative",
    date: "2026-06-25",
    text: "Complaints about billing changes trended on Brazilian social platforms this week, weighing further on net sentiment for Vivo.",
    confidentiality: "internal",
  },
  {
    id: "mention-br-fibre",
    kpiIds: ["kpi-sentiment-brazil", "kpi-media-coverage"],
    source: "Meltwater",
    market: "Brazil",
    sentiment: "neutral",
    date: "2026-06-24",
    text: "Local press covered Vivo's fibre expansion with a broadly balanced tone, partly offsetting negative social chatter.",
    confidentiality: "public",
  },
  {
    id: "mention-mwc-spike",
    kpiIds: ["kpi-sov"],
    source: "Talkwalker",
    market: "Group",
    sentiment: "positive",
    date: "2026-06-20",
    text: "Telefónica's MWC keynote drove a spike in positive share of voice across European tech media.",
    confidentiality: "public",
  },
  {
    id: "mention-esg-coverage",
    kpiIds: ["kpi-media-coverage"],
    source: "Meltwater",
    market: "Group",
    sentiment: "positive",
    date: "2026-06-18",
    text: "The 2025 sustainability report generated favourable ESG coverage in national and trade outlets.",
    confidentiality: "public",
  },
  {
    id: "mention-consideration-family",
    kpiIds: ["kpi-brand-consideration"],
    source: "Kantar",
    market: "Spain",
    sentiment: "neutral",
    date: "2026-06-15",
    text: "Brand consideration for Movistar held steady among family segments, with youth consideration still lagging the target.",
    confidentiality: "internal",
  },
  {
    id: "mention-recall-existing",
    kpiIds: ["kpi-campaign-recall"],
    source: "Nielsen",
    market: "Spain",
    sentiment: "positive",
    date: "2026-06-12",
    text: "'Mismo sitio, mismo precio' recall was strongest among existing customers, reinforcing the loyalty proposition.",
    confidentiality: "internal",
  },
  {
    id: "mention-tech-linkedin",
    kpiIds: ["kpi-tech-awareness"],
    source: "LinkedIn",
    market: "Group",
    sentiment: "positive",
    date: "2026-06-10",
    text: "Telefónica Tech thought-leadership posts lifted enterprise awareness among IT decision-makers.",
    confidentiality: "confidential",
  },
];

const objectiveById = new Map(OBJECTIVES.map((o) => [o.id, o]));
export function getObjective(id: string): Objective | undefined {
  return objectiveById.get(id);
}

const kpiById = new Map(KPIS.map((k) => [k.id, k]));
export function getKpiById(id: string): KpiDefinition | undefined {
  return kpiById.get(id);
}
// ---------------------------------------------------------------------------
// Home front-door seed data. Every item carries a clearance and the areas it
// belongs to, so the Home endpoints can filter fail-closed exactly like the
// retrieval path. Timestamps are stored as an `hoursAgo` offset and resolved
// to a real ISO instant at request time so the radar always reads as fresh.
// ---------------------------------------------------------------------------

export type RadarKind = "external_signal" | "knowledge_event" | "your_queue";

export interface RadarEvent {
  id: string;
  kind: RadarKind;
  title: string;
  detail: string | null;
  hoursAgo: number;
  href: string;
  evidenceDocId: string | null;
  axisId: string | null;
  tone: "default" | "warning";
  clearance: Clearance;
  areas: Area[];
}

export interface KpiItem {
  id: string;
  name: string;
  axisId: string;
  status: "tracked" | "off_target";
  clearance: Clearance;
  areas: Area[];
}

export interface PlanningEvent {
  id: string;
  title: string;
  thisWeek: boolean;
  conflict: boolean;
  clearance: Clearance;
  areas: Area[];
}

export interface GenerateDraft {
  id: string;
  title: string;
  status: "in_progress" | "review";
  clearance: Clearance;
  areas: Area[];
}

export const RADAR_EVENTS: RadarEvent[] = [
  {
    id: "radar-mwc-coverage",
    kind: "external_signal",
    title: "Press pickup rising on the MWC 2026 keynote",
    detail: "Trade press quoting the 5G standalone commitment across Spain and Germany.",
    hoursAgo: 2,
    href: "/data",
    evidenceDocId: "doc-mwc-2026-keynote",
    axisId: "ax-networks",
    tone: "default",
    clearance: "public",
    areas: ["Comunicación", "Gabinete"],
  },
  {
    id: "radar-q1-results",
    kind: "knowledge_event",
    title: "Q1 2026 results added to the governed corpus",
    detail: "Group revenue and guidance now citable; Q4 2025 marked superseded.",
    hoursAgo: 6,
    href: "/data",
    evidenceDocId: "doc-q1-2026-results",
    axisId: "ax-core",
    tone: "default",
    clearance: "public",
    areas: ["Comunicación", "Gabinete"],
  },
  {
    id: "radar-brand-refresh",
    kind: "knowledge_event",
    title: "Brand Guidelines 2026 updated — colour and voice",
    detail: "Refreshed guidance on navy usage and the no-emoji voice principle.",
    hoursAgo: 20,
    href: "/data",
    evidenceDocId: "doc-brand-guidelines-2026",
    axisId: "ax-sustainability",
    tone: "default",
    clearance: "internal",
    areas: ["Marca", "Comunicación"],
  },
  {
    id: "radar-5g-review",
    kind: "your_queue",
    title: "5G & Fibre Deployment Plan awaits your review",
    detail: "Copper-retirement section flagged for validation before it can be cited.",
    hoursAgo: 26,
    href: "/data",
    evidenceDocId: "doc-5g-deployment",
    axisId: "ax-networks",
    tone: "warning",
    clearance: "internal",
    areas: ["Comunicación"],
  },
  {
    id: "radar-campaign-live",
    kind: "external_signal",
    title: "Movistar 'Mismo sitio, mismo precio' campaign in market",
    detail: "Loyalty and price-transparency campaign now live in Spain.",
    hoursAgo: 32,
    href: "/data",
    evidenceDocId: "doc-campaign-mismo-sitio",
    axisId: "ax-core",
    tone: "default",
    clearance: "internal",
    areas: ["Marca", "Comunicación"],
  },
  {
    id: "radar-b2b-strategy",
    kind: "knowledge_event",
    title: "Telefónica Tech B2B strategy refreshed",
    detail: "Confidential enterprise growth plan updated with new margin targets.",
    hoursAgo: 40,
    href: "/data",
    evidenceDocId: "doc-tech-b2b-strategy",
    axisId: "ax-b2b",
    tone: "default",
    clearance: "confidential",
    areas: ["Comunicación", "Gabinete"],
  },
  {
    id: "radar-crisis-drill",
    kind: "your_queue",
    title: "Crisis playbook drill scheduled this week",
    detail: "Confirm the first-hour holding statement owners before the drill.",
    hoursAgo: 12,
    href: "/planning",
    evidenceDocId: "doc-crisis-playbook",
    axisId: "ax-digital",
    tone: "warning",
    clearance: "confidential",
    areas: ["Comunicación", "Gabinete"],
  },
  {
    id: "radar-atlas-hold",
    kind: "your_queue",
    title: "Project Atlas — holding response ready",
    detail: "Board-restricted memo; no external comment authorised until the Board decides.",
    hoursAgo: 4,
    href: "/data",
    evidenceDocId: "doc-ma-project-atlas",
    axisId: "ax-core",
    tone: "warning",
    clearance: "restricted",
    areas: ["Gabinete"],
  },
];

export const KPI_ITEMS: KpiItem[] = [
  { id: "kpi-revenue", name: "Group revenue growth", axisId: "ax-core", status: "tracked", clearance: "public", areas: ["Comunicación", "Gabinete"] },
  { id: "kpi-ebitda", name: "Adjusted EBITDA margin", axisId: "ax-core", status: "tracked", clearance: "public", areas: ["Comunicación", "Gabinete"] },
  { id: "kpi-netzero", name: "Net-zero trajectory", axisId: "ax-sustainability", status: "tracked", clearance: "public", areas: ["Comunicación", "Gabinete"] },
  { id: "kpi-5g", name: "5G standalone coverage", axisId: "ax-networks", status: "off_target", clearance: "internal", areas: ["Comunicación"] },
  { id: "kpi-b2b", name: "B2B & Tech revenue", axisId: "ax-b2b", status: "off_target", clearance: "confidential", areas: ["Comunicación", "Gabinete"] },
  { id: "kpi-brand", name: "Brand consistency score", axisId: "ax-sustainability", status: "tracked", clearance: "internal", areas: ["Marca", "Comunicación"] },
];

export const PLANNING_EVENTS: PlanningEvent[] = [
  { id: "plan-results-briefing", title: "Q1 2026 results media briefing", thisWeek: true, conflict: false, clearance: "public", areas: ["Comunicación", "Gabinete"] },
  { id: "plan-brand-review", title: "Brand consistency review", thisWeek: true, conflict: false, clearance: "internal", areas: ["Marca"] },
  { id: "plan-crisis-drill", title: "Crisis playbook drill", thisWeek: true, conflict: true, clearance: "confidential", areas: ["Comunicación", "Gabinete"] },
  { id: "plan-townhall", title: "Employee town hall follow-up", thisWeek: true, conflict: true, clearance: "internal", areas: ["Comunicación"] },
  { id: "plan-atlas-checkpoint", title: "Project Atlas board checkpoint", thisWeek: false, conflict: false, clearance: "restricted", areas: ["Gabinete"] },
];

export const GENERATE_DRAFTS: GenerateDraft[] = [
  { id: "gen-results-note", title: "Q1 2026 results press note", status: "in_progress", clearance: "public", areas: ["Comunicación", "Gabinete"] },
  { id: "gen-brand-memo", title: "Brand refresh internal memo", status: "in_progress", clearance: "internal", areas: ["Marca", "Comunicación"] },
  { id: "gen-5g-briefing", title: "5G coverage briefing", status: "review", clearance: "internal", areas: ["Comunicación"] },
  { id: "gen-b2b-deck", title: "B2B growth narrative deck", status: "in_progress", clearance: "confidential", areas: ["Comunicación", "Gabinete"] },
];
