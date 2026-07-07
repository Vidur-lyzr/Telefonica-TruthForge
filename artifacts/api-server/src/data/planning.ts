// Synthetic planning dataset for the Hub SSoT unified calendar.
// All content here is fictional / illustrative — it is NOT real Telefónica data.
// It backs the governed Planning surface: events, external signals and the
// (synthetic) source calendars they are "synced" from. No database is used.

import type { Clearance, Area } from "./corpus";

// The calendar is anchored to a fixed "today" so the demo always has activity
// in view and the 10-day forecast is deterministic, independent of the real
// server clock.
export const PLANNING_TODAY = "2026-07-07";

export type PlanningType = "campaign" | "milestone" | "event" | "publication";
export type PlanningStatus =
  | "planned"
  | "in_progress"
  | "live"
  | "done"
  | "at_risk";

export interface PlanningEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (same as start for single-day items)
  area: Area;
  type: PlanningType;
  status: PlanningStatus;
  owner: string;
  axisId: string;
  market: string; // Spain | Germany | Brazil | United Kingdom | Group
  brand: string;
  source: string; // source-of-origin system (Asana, Excel, ...)
  confidentiality: Clearance;
  description: string;
}

export type SignalKind = "competitor" | "sector" | "regulatory" | "seasonal";

export interface ExternalSignal {
  id: string;
  title: string;
  date: string;
  kind: SignalKind;
  market: string;
  description: string;
}

export interface PlanningSource {
  id: string;
  name: string; // e.g. Asana
  kind: string; // Project tracker, Spreadsheet, Calendar ...
  status: "connected" | "read_only";
  description: string;
}

// Synthetic "connected" source calendars. All are read-only in the demo: the
// Hub reflects them, it never writes back.
export const PLANNING_SOURCES: PlanningSource[] = [
  { id: "src-asana", name: "Asana", kind: "Project tracker", status: "read_only", description: "Campaign and milestone tasks synced read-only from Asana." },
  { id: "src-excel", name: "Excel", kind: "Spreadsheet", status: "read_only", description: "Editorial and publication plan imported read-only from Excel." },
  { id: "src-gcal", name: "Google Calendar", kind: "Calendar", status: "read_only", description: "Press events and briefings mirrored read-only from Google Calendar." },
  { id: "src-jira", name: "Jira", kind: "Delivery tracker", status: "read_only", description: "Network and delivery milestones synced read-only from Jira." },
  { id: "src-confluence", name: "Confluence", kind: "Workspace", status: "read_only", description: "Governance and board items referenced read-only from Confluence." },
];

export const PLANNING_EVENTS: PlanningEvent[] = [
  {
    id: "evt-mwc-recap-deck",
    title: "MWC 2026 recap deck",
    startDate: "2026-06-27",
    endDate: "2026-06-27",
    area: "Comunicación",
    type: "publication",
    status: "done",
    owner: "Executive Communications",
    axisId: "ax-networks",
    market: "Spain",
    brand: "Telefónica",
    source: "Excel",
    confidentiality: "internal",
    description: "Internal recap deck summarising the MWC Barcelona keynote for the comms team.",
  },
  {
    id: "evt-sustainability-teaser",
    title: "Sustainability report teaser",
    startDate: "2026-07-02",
    endDate: "2026-07-02",
    area: "Comunicación",
    type: "publication",
    status: "done",
    owner: "Sustainability Office",
    axisId: "ax-sustainability",
    market: "Group",
    brand: "Telefónica",
    source: "Excel",
    confidentiality: "internal",
    description: "Teaser communications ahead of the annual sustainability report launch.",
  },
  {
    id: "evt-vivo-fibre-milestone",
    title: "Vivo fibre 25M homes milestone",
    startDate: "2026-07-06",
    endDate: "2026-07-06",
    area: "Comunicación",
    type: "milestone",
    status: "live",
    owner: "Brazil Communications",
    axisId: "ax-core",
    market: "Brazil",
    brand: "Vivo",
    source: "Jira",
    confidentiality: "internal",
    description: "Vivo reaches 25 million fibre-passed homes; milestone note for market comms.",
  },
  {
    id: "evt-mwc-public-recap",
    title: "MWC public keynote recap",
    startDate: "2026-07-08",
    endDate: "2026-07-08",
    area: "Comunicación",
    type: "publication",
    status: "live",
    owner: "Media Relations",
    axisId: "ax-networks",
    market: "Spain",
    brand: "Telefónica",
    source: "Google Calendar",
    confidentiality: "public",
    description: "Public-facing recap article of the MWC keynote published to the newsroom.",
  },
  {
    id: "evt-crisis-drill",
    title: "Crisis simulation drill",
    startDate: "2026-07-09",
    endDate: "2026-07-09",
    area: "Comunicación",
    type: "event",
    status: "planned",
    owner: "Group Communications",
    axisId: "ax-digital",
    market: "Group",
    brand: "Telefónica",
    source: "Asana",
    confidentiality: "confidential",
    description: "Confidential tabletop exercise rehearsing the network-outage crisis playbook.",
  },
  {
    id: "evt-q2-preclose",
    title: "Q2 pre-close press note",
    startDate: "2026-07-11",
    endDate: "2026-07-11",
    area: "Comunicación",
    type: "publication",
    status: "planned",
    owner: "Investor Relations",
    axisId: "ax-core",
    market: "Group",
    brand: "Telefónica",
    source: "Google Calendar",
    confidentiality: "internal",
    description: "Pre-close quiet-period reminder and holding lines for press enquiries.",
  },
  {
    id: "evt-movistar-summer-pricing",
    title: "Movistar summer pricing launch",
    startDate: "2026-07-14",
    endDate: "2026-07-20",
    area: "Marca",
    type: "campaign",
    status: "planned",
    owner: "Marca España",
    axisId: "ax-core",
    market: "Spain",
    brand: "Movistar",
    source: "Asana",
    confidentiality: "internal",
    description: "Summer pricing and loyalty campaign for existing Movistar customers in Spain.",
  },
  {
    id: "evt-fibre-press-briefing",
    title: "Fibre network press briefing",
    startDate: "2026-07-14",
    endDate: "2026-07-14",
    area: "Comunicación",
    type: "event",
    status: "planned",
    owner: "Media Relations",
    axisId: "ax-networks",
    market: "Spain",
    brand: "Movistar",
    source: "Google Calendar",
    confidentiality: "internal",
    description: "On-the-record briefing on fibre rollout and copper retirement progress in Spain.",
  },
  {
    id: "evt-sustainability-launch",
    title: "Sustainability report launch",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
    area: "Comunicación",
    type: "publication",
    status: "planned",
    owner: "Sustainability Office",
    axisId: "ax-sustainability",
    market: "Group",
    brand: "Telefónica",
    source: "Excel",
    confidentiality: "public",
    description: "Public launch of the annual sustainability report and net-zero progress update.",
  },
  {
    id: "evt-atlas-board-update",
    title: "Project Atlas board update",
    startDate: "2026-07-16",
    endDate: "2026-07-16",
    area: "Gabinete",
    type: "milestone",
    status: "planned",
    owner: "Corporate Development",
    axisId: "ax-core",
    market: "Group",
    brand: "Telefónica",
    source: "Confluence",
    confidentiality: "restricted",
    description: "Board-restricted checkpoint on the potential in-market consolidation opportunity.",
  },
  {
    id: "evt-o2-5g-campaign",
    title: "O2 5G coverage campaign",
    startDate: "2026-07-20",
    endDate: "2026-07-31",
    area: "Marca",
    type: "campaign",
    status: "planned",
    owner: "Germany Communications",
    axisId: "ax-networks",
    market: "Germany",
    brand: "O2",
    source: "Asana",
    confidentiality: "internal",
    description: "Awareness campaign highlighting expanded O2 5G standalone coverage in Germany.",
  },
  {
    id: "evt-townhall-summer",
    title: "Employee town hall",
    startDate: "2026-07-23",
    endDate: "2026-07-23",
    area: "Comunicación",
    type: "event",
    status: "planned",
    owner: "Internal Communications",
    axisId: "ax-digital",
    market: "Group",
    brand: "Telefónica",
    source: "Google Calendar",
    confidentiality: "internal",
    description: "All-employee town hall on Transform & Grow delivery and the second-half priorities.",
  },
  {
    id: "evt-brand-guidelines-v2",
    title: "Brand guidelines v2 publication",
    startDate: "2026-07-27",
    endDate: "2026-07-27",
    area: "Marca",
    type: "publication",
    status: "planned",
    owner: "Global Brand Office",
    axisId: "ax-sustainability",
    market: "Group",
    brand: "Telefónica",
    source: "Confluence",
    confidentiality: "internal",
    description: "Refreshed brand guidelines with updated colour and voice guidance for all markets.",
  },
  {
    id: "evt-o2-brand-refresh",
    title: "O2 brand refresh teaser",
    startDate: "2026-07-28",
    endDate: "2026-08-05",
    area: "Marca",
    type: "campaign",
    status: "planned",
    owner: "Germany Communications",
    axisId: "ax-core",
    market: "Germany",
    brand: "O2",
    source: "Asana",
    confidentiality: "internal",
    description: "Teaser phase for the O2 brand refresh across German channels.",
  },
  {
    id: "evt-uk-b2b-webinar",
    title: "UK B2B cyber webinar",
    startDate: "2026-07-30",
    endDate: "2026-07-30",
    area: "Comunicación",
    type: "event",
    status: "planned",
    owner: "B2B Strategy",
    axisId: "ax-b2b",
    market: "United Kingdom",
    brand: "Telefónica Tech",
    source: "Asana",
    confidentiality: "internal",
    description: "Enterprise webinar on managed cyber security for UK B2B prospects.",
  },
  {
    id: "evt-vivo-digital-campaign",
    title: "Vivo digital services campaign",
    startDate: "2026-08-03",
    endDate: "2026-08-12",
    area: "Marca",
    type: "campaign",
    status: "planned",
    owner: "Brazil Communications",
    axisId: "ax-b2b",
    market: "Brazil",
    brand: "Vivo",
    source: "Asana",
    confidentiality: "internal",
    description: "Campaign promoting Vivo digital services and value bundles in Brazil.",
  },
  {
    id: "evt-copper-retirement-milestone",
    title: "Copper retirement phase gate",
    startDate: "2026-08-07",
    endDate: "2026-08-07",
    area: "Comunicación",
    type: "milestone",
    status: "planned",
    owner: "Network Strategy",
    axisId: "ax-networks",
    market: "Spain",
    brand: "Movistar",
    source: "Jira",
    confidentiality: "internal",
    description: "Regulatory phase gate for the next tranche of copper network retirement in Spain.",
  },
];

export const EXTERNAL_SIGNALS: ExternalSignal[] = [
  {
    id: "sig-mwc-followup",
    title: "MWC follow-up industry summit",
    date: "2026-07-10",
    kind: "sector",
    market: "Germany",
    description: "Sector summit where operators reiterate 5G and AI roadmaps.",
  },
  {
    id: "sig-claronet-launch",
    title: "Competitor ClaroNet fibre launch",
    date: "2026-07-13",
    kind: "competitor",
    market: "Brazil",
    description: "A Brazilian competitor is expected to launch a new fibre offer.",
  },
  {
    id: "sig-movecorp-results",
    title: "Competitor MoveCorp Q2 results",
    date: "2026-07-15",
    kind: "competitor",
    market: "Spain",
    description: "A Spanish competitor publishes quarterly results, drawing press attention.",
  },
  {
    id: "sig-eu-networks-act",
    title: "EU Digital Networks Act milestone",
    date: "2026-07-22",
    kind: "regulatory",
    market: "Group",
    description: "A regulatory milestone likely to prompt sector-wide media coverage.",
  },
  {
    id: "sig-ifa-berlin",
    title: "IFA Berlin technology fair",
    date: "2026-09-04",
    kind: "seasonal",
    market: "Germany",
    description: "Major consumer-technology fair; a recurring seasonal press moment.",
  },
];

const eventById = new Map(PLANNING_EVENTS.map((e) => [e.id, e]));
export function getPlanningEvent(id: string): PlanningEvent | undefined {
  return eventById.get(id);
}
