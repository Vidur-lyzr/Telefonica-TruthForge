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
  chunks: Chunk[];
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

export type GraphKind = "market" | "brand" | "executive" | "axis";

export interface GraphNode {
  id: string;
  name: string;
  kind: GraphKind;
  keywords: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
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
    summary:
      "Group revenue reached €8,127M in Q1 2026, up 1.8% year on year, driven by core-market convergence and B2B growth.",
    chunks: [
      {
        id: "doc-q1-2026-results#1",
        heading: "Group revenue",
        breadcrumb: "Q1 2026 Results › Financial highlights › slide 4",
        text: "Group revenue reached €8,127M in the first quarter of 2026, an increase of 1.8% year on year. Growth was led by convergent bundles in the core markets and by double-digit growth at Telefónica Tech.",
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
    summary:
      "Q4 2025 group revenue was €7,982M. Superseded by the Q1 2026 results release.",
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
    language: "en",
    topics: ["Germany", "O2", "mobile", "market share"],
    axisIds: ["ax-core", "ax-networks"],
    areas: ["Comunicación"],
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
    language: "en",
    topics: ["Brazil", "Vivo", "fibre", "digital services"],
    axisIds: ["ax-core", "ax-b2b"],
    areas: ["Comunicación"],
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
];

export const NUMERIC_FACTS: NumericFact[] = [
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
];

export const GRAPH_NODES: GraphNode[] = [
  { id: "mkt-spain", name: "Spain", kind: "market", keywords: ["spain", "españa", "spanish"] },
  { id: "mkt-germany", name: "Germany", kind: "market", keywords: ["germany", "german", "alemania"] },
  { id: "mkt-brazil", name: "Brazil", kind: "market", keywords: ["brazil", "brasil", "brazilian"] },
  { id: "mkt-uk", name: "United Kingdom", kind: "market", keywords: ["uk", "united kingdom", "britain"] },
  { id: "brand-movistar", name: "Movistar", kind: "brand", keywords: ["movistar"] },
  { id: "brand-o2", name: "O2", kind: "brand", keywords: ["o2"] },
  { id: "brand-vivo", name: "Vivo", kind: "brand", keywords: ["vivo"] },
  { id: "brand-tech", name: "Telefónica Tech", kind: "brand", keywords: ["telefónica tech", "telefonica tech", "b2b", "enterprise"] },
  { id: "ax-core", name: "Grow the core", kind: "axis", keywords: ["core", "grow the core"] },
  { id: "ax-b2b", name: "Scale B2B & Tech", kind: "axis", keywords: ["b2b", "tech"] },
  { id: "ax-networks", name: "Build the best networks", kind: "axis", keywords: ["network", "5g", "fibre"] },
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: "brand-movistar", to: "mkt-spain", relation: "operates in" },
  { from: "brand-o2", to: "mkt-germany", relation: "operates in" },
  { from: "brand-vivo", to: "mkt-brazil", relation: "operates in" },
  { from: "brand-movistar", to: "ax-core", relation: "contributes to" },
  { from: "brand-tech", to: "ax-b2b", relation: "leads" },
  { from: "mkt-spain", to: "ax-networks", relation: "invests in" },
];

export const SUGGESTIONS = [
  { id: "sug-revenue", text: "What was Telefónica's group revenue in Q1 2026?", kind: "cited" },
  { id: "sug-brand-blue", text: "What is the primary Telefónica brand colour and when is navy used?", kind: "cited" },
  { id: "sug-netzero", text: "What is Telefónica's net-zero commitment?", kind: "cited" },
  { id: "sug-atlas", text: "Is Telefónica planning any acquisition or merger?", kind: "permission" },
  { id: "sug-quantum", text: "What is Telefónica's strategy for consumer quantum computing devices?", kind: "no_evidence" },
  { id: "sug-oldrev", text: "What was group revenue in Q4 2025?", kind: "historic" },
];

const docById = new Map(DOCS.map((d) => [d.id, d]));
export function getDoc(id: string): CorpusDoc | undefined {
  return docById.get(id);
}
