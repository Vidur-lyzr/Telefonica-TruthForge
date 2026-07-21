// Brand Room export template library. Each template describes a Telefónica
// corporate document the export service can render to .docx, .pptx and .pdf:
// its structure (blocks), its deterministic DESIGN spec (cover layout, accent
// role, heading treatment, table style, footer label) and a server-only
// SAMPLE payload the preview engine renders into real cover/body pages. The
// design values map onto the shared export theme tokens — renderers and the
// preview engine consume them and never invent a design value of their own.
// All content is fictional / illustrative.

import type { THEME_COLORS } from "./exportTheme";

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
  | "disclaimers"
  // Coded visual slide layouts (visualLayouts.ts): the deck is composed from
  // the draft's visualSlides instead of the text-first slide pipeline.
  | "visual";

export interface ExportTemplateBlock {
  kind: ExportBlockKind;
  label: string;
  // Optional guidance shown in the preview and used as an empty-state note by
  // the renderers when the draft supplies no matching content.
  note?: string;
}

// ---- Design spec -------------------------------------------------------------

export type CoverStyle =
  | "navy-full" // full navy cover, brand rule, inverse type
  | "brand-full" // full brand-blue cover, navy band, inverse type
  | "brand-band" // white cover with a deep brand band across the upper third
  | "masthead" // editorial white cover: wordmark masthead, hairline rules
  | "split" // vertical split: navy left panel, white content column
  | "minimal"; // quiet white cover, oversized five-dot motif, small type

// Accent is constrained to theme colour keys so a design can never point at a
// colour the theme does not define.
export type AccentRole = Extract<keyof typeof THEME_COLORS, "brand" | "navy">;

export type HeadingStyle =
  | "bar" // left accent bar beside the heading
  | "rule" // hairline rule under the heading
  | "block"; // heading on a tinted block

export type TableHeaderStyle = "navy" | "brand" | "light";

export interface TemplateDesign {
  coverStyle: CoverStyle;
  accent: AccentRole;
  headingStyle: HeadingStyle;
  tableHeader: TableHeaderStyle;
  footerLabel: string;
  // One-line voice guidance shown with the template and folded into the
  // export subtitle context — render-time only, never sent to the model.
  tone: string;
}

// ---- Server-only sample payload (drives the preview pages; the response
// schema does not carry it, so it never leaves the server via the templates
// list endpoint) -----------------------------------------------------------

export interface TemplateSample {
  kicker: string;
  title: string;
  subtitle: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  table: { title: string; source: string; columns: string[]; rows: string[][] };
  chart: {
    label: string;
    unit: string;
    source: string;
    points: { label: string; value: number }[];
  };
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
  design: TemplateDesign;
  sample: TemplateSample;
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
    design: {
      coverStyle: "brand-band",
      accent: "brand",
      headingStyle: "bar",
      tableHeader: "brand",
      footerLabel: "Talking points · Global Brand Office",
      tone: "Spoken register: short declarative lines a spokesperson can say aloud, one idea per point, every figure cited.",
    },
    sample: {
      kicker: "Spokesperson pack",
      title: "Talking points — Q1 2026 results",
      subtitle: "Global Brand Office · Internal · Cited against governed sources",
      sections: [
        {
          heading: "Grow the core",
          paragraphs: [
            "Group revenue reached 8,127 million euros in the first quarter, up 2.1 percent year on year, with all four core markets contributing to growth [S1]. The result confirms the focused-markets strategy set out at the Capital Markets Day.",
          ],
          bullets: [
            "Revenue growth was led by Spain and Brazil, both ahead of plan [S1].",
            "Churn in converged households fell for the sixth consecutive quarter [S2].",
          ],
        },
        {
          heading: "Scale B2B & Tech",
          paragraphs: [
            "Telefónica Tech revenue grew at a double-digit rate for the twelfth consecutive quarter, driven by cybersecurity and cloud services for enterprise customers [S2].",
          ],
        },
      ],
      table: {
        title: "Key figures for delivery",
        source: "Q1 2026 results release",
        columns: ["Figure", "Value", "Change", "Source"],
        rows: [
          ["Group revenue", "€8,127m", "+2.1%", "[S1]"],
          ["Tech revenue growth", "+14.3%", "12th quarter", "[S2]"],
          ["Converged churn", "0.9%", "-0.1 pp", "[S2]"],
        ],
      },
      chart: {
        label: "Group revenue by quarter",
        unit: "€ million",
        source: "Q1 2026 results release",
        points: [
          { label: "Q2 2025", value: 7890 },
          { label: "Q3 2025", value: 7955 },
          { label: "Q4 2025", value: 8210 },
          { label: "Q1 2026", value: 8127 },
        ],
      },
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
    design: {
      coverStyle: "masthead",
      accent: "navy",
      headingStyle: "rule",
      tableHeader: "light",
      footerLabel: "Press release · Group Communications",
      tone: "Newsroom register: standfirst carries the whole story, quotable plain sentences, no internal shorthand.",
    },
    sample: {
      kicker: "Press release",
      title: "Telefónica reports Q1 2026 results",
      subtitle: "Madrid, 8 May 2026 · For immediate release",
      sections: [
        {
          heading: "Lead",
          paragraphs: [
            "Telefónica reported group revenue of 8,127 million euros for the first quarter of 2026, up 2.1 percent year on year, as growth in its four core markets offset currency headwinds [S1].",
          ],
        },
        {
          heading: "Body",
          paragraphs: [
            "The company reiterated its full-year guidance of low single-digit revenue growth and continued margin expansion. Free cash flow in the quarter reached 612 million euros, supporting the confirmed dividend calendar [S2].",
            "\u201CThese results show the strategy is working: focused markets, disciplined investment and a growing technology business,\u201D the company said in the statement accompanying the results [S1].",
          ],
        },
      ],
      table: {
        title: "Results at a glance",
        source: "Q1 2026 results release",
        columns: ["Metric", "Q1 2026", "Q1 2025", "Change"],
        rows: [
          ["Revenue", "€8,127m", "€7,960m", "+2.1%"],
          ["EBITDA", "€2,609m", "€2,547m", "+2.4%"],
          ["Free cash flow", "€612m", "€574m", "+6.6%"],
        ],
      },
      chart: {
        label: "Revenue by core market",
        unit: "€ million",
        source: "Q1 2026 results release",
        points: [
          { label: "Spain", value: 3105 },
          { label: "Brazil", value: 2270 },
          { label: "Germany", value: 2064 },
          { label: "UK (VMO2)", value: 688 },
        ],
      },
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
    design: {
      coverStyle: "split",
      accent: "brand",
      headingStyle: "block",
      tableHeader: "navy",
      footerLabel: "Q&A briefing · Group Communications · Internal",
      tone: "Briefing register: complete spokesperson-ready answers, candid internal guidance kept clearly apart from quotable lines.",
    },
    sample: {
      kicker: "Confidential briefing",
      title: "Q&A briefing — network investment",
      subtitle: "Group Communications · Internal only · Prepared answers",
      sections: [
        {
          heading: "Q1. Is Telefónica cutting network investment?",
          paragraphs: [
            "No. Investment is being prioritised, not reduced: capital expenditure remains within the guided 12 to 13 percent of revenue, concentrated on 5G standalone and fibre in the four core markets [S1]. What has changed is the mix — legacy copper decommissioning frees capacity for next-generation networks [S2].",
          ],
          bullets: [
            "Do not say: any capex figure not yet in a published release.",
            "If pressed on rural coverage: point to the published fibre footprint targets [S2].",
          ],
        },
        {
          heading: "Q2. When will the copper switch-off complete?",
          paragraphs: [
            "The published plan completes the copper switch-off in Spain during 2026; more than 94 percent of central offices have already been migrated to fibre [S2].",
          ],
        },
      ],
      table: {
        title: "Approved figures for answers",
        source: "Network investment fact base",
        columns: ["Topic", "Approved figure", "Source"],
        rows: [
          ["Capex envelope", "12–13% of revenue", "[S1]"],
          ["Fibre premises passed", "78 million", "[S2]"],
          ["Copper offices migrated", "94%", "[S2]"],
        ],
      },
      chart: {
        label: "Fibre premises passed",
        unit: "million",
        source: "Network investment fact base",
        points: [
          { label: "2023", value: 63 },
          { label: "2024", value: 70 },
          { label: "2025", value: 75 },
          { label: "2026", value: 78 },
        ],
      },
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
    design: {
      coverStyle: "navy-full",
      accent: "brand",
      headingStyle: "bar",
      tableHeader: "navy",
      footerLabel: "Governed report · Executive Communications",
      tone: "Analytical register: framed argument per section — why it matters, what the cited evidence shows, what follows from it.",
    },
    sample: {
      kicker: "Governed report",
      title: "Brand health report — Spain",
      subtitle: "Executive Communications · Q1 2026 · Every figure cited",
      sections: [
        {
          heading: "Executive summary",
          paragraphs: [
            "Brand consideration in Spain held at 52 percent through the first quarter, maintaining the lead built over the previous year while the nearest competitor slipped one point [S1]. Net promoter score improved four points quarter on quarter, the strongest single-quarter gain since tracking began [S2].",
          ],
        },
        {
          heading: "Momentum",
          paragraphs: [
            "The improvement is broad-based: consideration rose in every age band under 55, and the premium fibre segment recorded its highest satisfaction reading to date [S2]. Campaign recall for the network reliability message reached 61 percent, well above the category norm of 44 percent [S1].",
          ],
        },
      ],
      table: {
        title: "Brand KPI summary — Spain",
        source: "Brand tracker, Q1 2026 wave",
        columns: ["KPI", "Q1 2026", "Q4 2025", "Trend"],
        rows: [
          ["Consideration", "52%", "52%", "Held"],
          ["NPS", "+31", "+27", "Up 4 pts"],
          ["Campaign recall", "61%", "55%", "Up 6 pts"],
        ],
      },
      chart: {
        label: "Brand consideration trend",
        unit: "%",
        source: "Brand tracker, Q1 2026 wave",
        points: [
          { label: "Q2 2025", value: 49 },
          { label: "Q3 2025", value: 50 },
          { label: "Q4 2025", value: 52 },
          { label: "Q1 2026", value: 52 },
        ],
      },
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
    design: {
      coverStyle: "brand-full",
      accent: "navy",
      headingStyle: "rule",
      tableHeader: "brand",
      footerLabel: "KPI report · Insights & Analytics",
      tone: "Figures-first register: the number leads every line, prose only explains definition, period and source.",
    },
    sample: {
      kicker: "Data pack",
      title: "KPI report — Q1 2026",
      subtitle: "Insights & Analytics · Governed figures · Recomputed per persona",
      sections: [
        {
          heading: "Reading this pack",
          paragraphs: [
            "Every figure in this pack is recomputed from governed sources at export time for the requesting persona and destination [S1]. Metrics outside the requester's clearance are omitted and listed as gaps rather than estimated — a blank is honest; a guess is not [S2].",
          ],
        },
      ],
      table: {
        title: "Group KPI table",
        source: "Q1 2026 results release",
        columns: ["KPI", "Value", "vs Q1 2025", "Source"],
        rows: [
          ["Group revenue", "€8,127m", "+2.1%", "[S1]"],
          ["Adj. EBITDA margin", "32.1%", "+0.3 pp", "[S1]"],
          ["Free cash flow", "€612m", "+6.6%", "[S2]"],
          ["Net debt / EBITDA", "2.5x", "-0.1x", "[S2]"],
        ],
      },
      chart: {
        label: "Adjusted EBITDA margin",
        unit: "%",
        source: "Q1 2026 results release",
        points: [
          { label: "Q2 2025", value: 31.4 },
          { label: "Q3 2025", value: 31.7 },
          { label: "Q4 2025", value: 31.8 },
          { label: "Q1 2026", value: 32.1 },
        ],
      },
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
    design: {
      coverStyle: "minimal",
      accent: "brand",
      headingStyle: "block",
      tableHeader: "light",
      footerLabel: "10-day forecast · Planning & Newsroom",
      tone: "Planning register: day-stamped, scannable outlook lines with a prepared response for each expected moment.",
    },
    sample: {
      kicker: "Forward look",
      title: "10-day outlook — week commencing 12 May",
      subtitle: "Planning & Newsroom · Internal · Updated daily",
      sections: [
        {
          heading: "Tuesday 13 May — results follow-ups",
          paragraphs: [
            "Financial press follow-ups on the Q1 release are expected to concentrate on free cash flow phasing and the German integration timetable [S1]. Prepared lines are approved and loaded; hold to the published guidance language.",
          ],
        },
        {
          heading: "Thursday 15 May — network ambition replay",
          paragraphs: [
            "The MWC keynote replay goes out on owned channels, re-surfacing the network ambition theme. Expect renewed questions on rural fibre milestones; the approved footprint figures remain current [S1].",
          ],
          bullets: [
            "Prepared line: hold to approved network phrasing.",
            "Escalation: unbriefed spectrum questions go to Regulatory Affairs.",
          ],
        },
      ],
      table: {
        title: "Coverage outlook",
        source: "Newsroom planning grid",
        columns: ["Day", "Moment", "Readiness"],
        rows: [
          ["Tue 13", "Results follow-ups", "Lines approved"],
          ["Thu 15", "Keynote replay", "Figures current"],
          ["Mon 19", "Sector conference", "Briefing drafted"],
        ],
      },
      chart: {
        label: "Expected coverage volume",
        unit: "items / day",
        source: "Newsroom planning grid",
        points: [
          { label: "Mon", value: 6 },
          { label: "Tue", value: 14 },
          { label: "Wed", value: 9 },
          { label: "Thu", value: 12 },
          { label: "Fri", value: 7 },
        ],
      },
    },
  },
  {
    id: "exp-visual-deck",
    name: "Visual deck",
    description:
      "A designed slide deck built from coded Telefónica layouts: photo covers, stat rows, split layouts and chart slides — every figure still cited.",
    owner: "Global Brand Office",
    version: "v1.0",
    shapes: ["visualdeck"],
    formats: ["pptx", "pdf"],
    blocks: [
      { kind: "visual", label: "Designed slides", note: "Composed from approved brand layouts and the governed image library." },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "Visual deck — strategy update",
      lines: [
        "Cover: full-bleed brand photo with title overlay.",
        "KPI slide: three cited figures in stat cards [S1].",
        "Split slide: image left, argument right [S2].",
      ],
    },
    design: {
      coverStyle: "brand-full",
      accent: "brand",
      headingStyle: "bar",
      tableHeader: "brand",
      footerLabel: "Visual deck · Global Brand Office",
      tone: "Presentation register: one idea per slide, short assertive headlines, figures carried by the layout rather than prose.",
    },
    sample: {
      kicker: "Designed deck",
      title: "Visual deck — strategy update",
      subtitle: "Global Brand Office · Coded layouts · Every figure cited",
      sections: [
        {
          heading: "How this deck is built",
          paragraphs: [
            "Each slide is composed from an approved coded layout — photo cover, stat row, split, quote — with images drawn only from the governed brand library and every figure cited against governed sources [S1].",
          ],
        },
      ],
      table: {
        title: "Slide inventory",
        source: "Layout registry",
        columns: ["Slide", "Layout", "Evidence"],
        rows: [
          ["1", "Photo cover", "—"],
          ["2", "KPI stats", "[S1]"],
          ["3", "Photo split", "[S2]"],
        ],
      },
      chart: {
        label: "Slides by layout family",
        unit: "slides",
        source: "Layout registry",
        points: [
          { label: "Cover", value: 1 },
          { label: "Content", value: 6 },
          { label: "Data", value: 3 },
          { label: "Closing", value: 1 },
        ],
      },
    },
  },
  {
    id: "exp-visual-story",
    name: "Visual story",
    description:
      "An editorial visual deck in the quieter navy register: masthead openers, quotes and imagery for narrative updates.",
    owner: "Executive Communications",
    version: "v1.0",
    shapes: ["visualdeck"],
    formats: ["pptx", "pdf"],
    blocks: [
      { kind: "visual", label: "Designed slides", note: "Composed from approved brand layouts and the governed image library." },
      { kind: "citations", label: "Evidence and citations" },
      { kind: "disclaimers", label: "Disclaimers" },
    ],
    preview: {
      heading: "Visual story — brand momentum",
      lines: [
        "Opener: editorial masthead with headline.",
        "Quote slide: approved executive line [S1].",
        "Closing: five-dot motif and next steps.",
      ],
    },
    design: {
      coverStyle: "masthead",
      accent: "navy",
      headingStyle: "rule",
      tableHeader: "navy",
      footerLabel: "Visual story · Executive Communications",
      tone: "Editorial register: narrative headlines, restrained navy palette, imagery carries the mood while citations carry the facts.",
    },
    sample: {
      kicker: "Editorial deck",
      title: "Visual story — brand momentum",
      subtitle: "Executive Communications · Coded layouts · Every figure cited",
      sections: [
        {
          heading: "How this deck is built",
          paragraphs: [
            "Slides follow the editorial family of coded layouts — masthead openers, quote slides, image-led spreads — with all imagery drawn from the governed brand library and all figures cited [S1].",
          ],
        },
      ],
      table: {
        title: "Slide inventory",
        source: "Layout registry",
        columns: ["Slide", "Layout", "Evidence"],
        rows: [
          ["1", "Masthead opener", "—"],
          ["2", "Quote", "[S1]"],
          ["3", "Photo trio", "—"],
        ],
      },
      chart: {
        label: "Slides by layout family",
        unit: "slides",
        source: "Layout registry",
        points: [
          { label: "Opener", value: 1 },
          { label: "Narrative", value: 5 },
          { label: "Data", value: 2 },
          { label: "Closing", value: 1 },
        ],
      },
    },
  },
];

const byId = new Map(EXPORT_TEMPLATES.map((t) => [t.id, t]));

export function getExportTemplate(id: string): ExportTemplate | undefined {
  return byId.get(id);
}

// Visual register for a template's coded slide layouts: the executive visual
// deck renders in the dark benchmark style (full-bleed navy art, translucent
// cards); every other template — including the editorial visual story —
// keeps the original light register, byte-identical to before.
export function visualStyleForTemplate(templateId: string): "light" | "dark" {
  return templateId === "exp-visual-deck" ? "dark" : "light";
}

// Default template for a draft shape when the caller does not pick one.
export function defaultTemplateForShape(shape: string): ExportTemplate {
  const preferred: Record<string, string> = {
    messaging: "exp-talking-points",
    press: "exp-press-release",
    multiformat: "exp-report",
    visualdeck: "exp-visual-deck",
  };
  return byId.get(preferred[shape] ?? "exp-report") ?? EXPORT_TEMPLATES[3];
}
