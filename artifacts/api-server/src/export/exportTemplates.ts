// Brand Room export template library. Each template describes a Telefónica
// corporate document structure the export service can render to .docx, .pptx
// and .pdf, plus a preview payload for the frontend gallery. All content is
// fictional / illustrative.

export type ExportFormat = "docx" | "pptx" | "pdf" | "txt" | "md";

export type ExportBlockKind =
  | "cover"
  | "summary"
  | "sections"
  | "table"
  | "charts"
  | "qa"
  | "spokesperson"
  | "citations"
  | "disclaimers";

export interface ExportTemplateBlock {
  kind: ExportBlockKind;
  label: string;
  // Optional guidance shown in the preview and used as an empty-state note by
  // the renderers when the draft supplies no matching content.
  note?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  owner: string;
  version: string;
  // The draft shapes this template accepts. Empty = accepts any shape.
  shapes: string[];
  formats: ExportFormat[];
  blocks: ExportTemplateBlock[];
  // Illustrative preview lines rendered as a skeleton page in the gallery.
  preview: {
    heading: string;
    lines: string[];
  };
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: "exp-talking-points",
    name: "Talking points",
    description:
      "One governed umbrella message and short, cited talking points a spokesperson can deliver verbatim.",
    owner: "Global Brand Office",
    version: "v2.4",
    shapes: ["messaging"],
    formats: ["docx", "pptx", "pdf", "txt", "md"],
    blocks: [
      { kind: "cover", label: "Cover" },
      { kind: "summary", label: "Umbrella message" },
      { kind: "sections", label: "Talking points by axis" },
      { kind: "spokesperson", label: "Spokesperson guidance", note: "Stripped from external exports." },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "Talking points — Q1 2026 results",
      lines: [
        "Umbrella: Focused growth in our four core markets.",
        "Axis — Grow the core: revenue up year on year [S1].",
        "Axis — Scale B2B & Tech: double-digit B2B growth [S2].",
        "If asked about Chile: hold to the approved line [G1].",
      ],
    },
  },
  {
    id: "exp-press-release",
    name: "Press release",
    description:
      "External announcement: headline, cited lead and body, an approved executive quote, boilerplate and contact.",
    owner: "Group Communications",
    version: "v4.1",
    shapes: ["press"],
    formats: ["docx", "pptx", "pdf", "txt", "md"],
    blocks: [
      { kind: "cover", label: "Masthead" },
      { kind: "sections", label: "Headline, lead and body" },
      { kind: "charts", label: "Supporting figures", note: "Included only when a governed series is cited." },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "Telefónica reports Q1 2026 results",
      lines: [
        "Madrid, 8 May 2026 — Group revenue reached €8,127m [S1].",
        "\u201CThe agreement strengthens our balance sheet\u2026\u201D — Group Communications.",
        "About Telefónica: one of the largest telecommunications companies\u2026",
      ],
    },
  },
  {
    id: "exp-qa",
    name: "Q&A briefing",
    description:
      "Prepared questions and approved answers, with internal-only guidance on what not to say.",
    owner: "Group Communications",
    version: "v3.0",
    shapes: ["press", "messaging"],
    formats: ["docx", "pptx", "pdf", "txt", "md"],
    blocks: [
      { kind: "cover", label: "Cover" },
      { kind: "qa", label: "Questions and approved answers" },
      { kind: "spokesperson", label: "Do-not-say guidance", note: "Stripped from external exports." },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "Q&A — network investment",
      lines: [
        "Q: Is Telefónica cutting network investment?",
        "A: Investment is prioritised on 5G and fibre in core markets [S1].",
        "Do not say: any figure not yet in a published release.",
      ],
    },
  },
  {
    id: "exp-report",
    name: "Generic report",
    description:
      "A flexible governed report: executive summary, themed sections, on-brand charts and full citations.",
    owner: "Executive Communications",
    version: "v2.2",
    shapes: [],
    formats: ["docx", "pptx", "pdf", "txt", "md"],
    blocks: [
      { kind: "cover", label: "Cover" },
      { kind: "summary", label: "Executive summary" },
      { kind: "sections", label: "Themed sections" },
      { kind: "charts", label: "Charts from governed data" },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "Brand health report — Spain",
      lines: [
        "Executive summary: consideration steady at 52% [S1].",
        "Section — Momentum: NPS improved four points [S2].",
        "Chart: Brand consideration trend (line, cited).",
      ],
    },
  },
  {
    id: "exp-kpi-report",
    name: "KPI report",
    description:
      "A figures-first pack: KPI table with sources, one chart per governed series, and honest gaps where data is not permitted.",
    owner: "Insights & Analytics",
    version: "v1.6",
    shapes: [],
    formats: ["docx", "pptx", "pdf", "txt", "md"],
    blocks: [
      { kind: "cover", label: "Cover" },
      { kind: "table", label: "KPI table with sources" },
      { kind: "charts", label: "One chart per series" },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "KPI report — Q1 2026",
      lines: [
        "Group revenue: €8,127m [S1] · Adj. EBITDA margin: 32.1% [S2].",
        "Chart: Group revenue trend (line, cited).",
        "Not shown: restricted metrics outside your clearance.",
      ],
    },
  },
  {
    id: "exp-forecast",
    name: "10-day forecast",
    description:
      "A forward-looking communications outlook for the next ten days: expected moments, themes and prepared lines.",
    owner: "Planning & Newsroom",
    version: "v1.2",
    shapes: [],
    formats: ["docx", "pptx", "pdf", "txt", "md"],
    blocks: [
      { kind: "cover", label: "Cover" },
      { kind: "summary", label: "Outlook summary" },
      { kind: "sections", label: "Day-by-day outlook" },
      { kind: "spokesperson", label: "Prepared lines", note: "Stripped from external exports." },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "10-day outlook — w/c 12 May",
      lines: [
        "Tue: Q1 results follow-ups expected from financial press.",
        "Thu: MWC keynote replay — network ambition theme [S1].",
        "Prepared line: hold to approved network phrasing.",
      ],
    },
  },
];

const byId = new Map(EXPORT_TEMPLATES.map((t) => [t.id, t]));

export function getExportTemplate(id: string): ExportTemplate | undefined {
  return byId.get(id);
}

// Default template for a draft shape when the caller does not pick one.
export function defaultTemplateForShape(shape: string): ExportTemplate {
  const preferred: Record<string, string> = {
    messaging: "exp-talking-points",
    press: "exp-press-release",
    multiformat: "exp-report",
  };
  return byId.get(preferred[shape] ?? "exp-report") ?? EXPORT_TEMPLATES[3];
}
