// L1 — the weekly golden question set. Every question is grounded in the real
// governed corpus: expected statuses follow from each persona's clearance and
// area against the documents' governance labels, and expected doc ids are the
// documents the corpus genuinely answers from. The eval runner replays these
// through the REAL Ask agent (no mocks) and scores the outcome, so the
// scorecard measures the same pipeline users talk to.
//
// Design notes:
// - Refusal goldens (no_evidence / permission_blocked / conflict) never reach
//   the model, so those rows are cheap; only `answered` goldens spend a model
//   call. Most goldens now expect `answered` — the corpus deliberately carries
//   public "graze" material so refusal questions often have an honest,
//   permitted public answer instead of a hard block.
// - Languages are mixed (EN/ES/DE/PT) to keep the cross-language retrieval
//   path under weekly measurement.
// - Personas cover the full clearance ladder so permission behaviour is
//   measured from both sides: the persona who must be blocked AND the persona
//   who must get the answer.

export type GoldenExpectedStatus =
  | "answered"
  | "no_evidence"
  | "permission_blocked"
  | "conflict";

export type GoldenLang = "en" | "es" | "de" | "pt";

export interface GoldenQuestion {
  id: string;
  question: string;
  /** Persona the question is asked as — governance is part of what is tested. */
  roleId: string;
  lang: GoldenLang;
  expectedStatus: GoldenExpectedStatus;
  /**
   * For `answered` goldens: at least ONE of these documents must appear in the
   * citations for the answer to count as correct. Empty/absent for refusals —
   * a refusal must cite nothing.
   */
  expectedDocIds?: string[];
  /** The answer must additionally carry the historic flag (superseded source). */
  expectHistoric?: boolean;
  /** Why this golden exists — shown in the golden browser. */
  rationale: string;
}

export const GOLDEN_QUESTIONS: GoldenQuestion[] = [
  // ---- Answered: public material, lowest clearance persona ----------------
  {
    id: "gq-revenue-q1",
    question: "What was Telefónica's group revenue in Q1 2026?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: [
      "doc-q1-2026-results",
      "doc-q1-2026-press-release",
      "doc-q1-2026-ir-factsheet",
    ],
    rationale: "Headline public figure — must always answer with the approved release.",
  },
  {
    id: "gq-netzero",
    question: "What is Telefónica's net-zero commitment?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-sustainability-2025"],
    rationale: "Public sustainability claim — a press persona must get the cited answer.",
  },
  {
    id: "gq-mwc-keynote",
    question: "What were the key announcements in the CEO keynote at MWC 2026?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-mwc-2026-keynote"],
    rationale: "Public event coverage must be retrievable by external stakeholders.",
  },
  {
    id: "gq-chile-sale",
    question: "What was announced about the sale of the Chilean subsidiary?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-chile-sale"],
    rationale: "Public M&A announcement — answerable at public clearance.",
  },
  {
    id: "gq-hispam-exit",
    question: "What is the status of the Spanish America exit?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-hispam-exit", "doc-chile-sale"],
    rationale: "Public footprint update — the approved public narrative must surface.",
  },
  {
    id: "gq-gsma-outlook",
    question:
      "What is the outlook for European telecoms in 2026 according to the sector report?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-sector-report-gsma-2026"],
    rationale: "Public third-party sector evidence must be retrievable and cited.",
  },
  {
    id: "gq-social-listening",
    question: "How did social sentiment react to the Movistar fibre outage in Spain?",
    roleId: "role-analyst",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-social-listening-w27", "doc-b-social-es-fibre-outage"],
    rationale:
      "B-source social listening — either the weekly digest or the outage-specific digest is legitimate evidence.",
  },
  {
    id: "gq-cnmc-es",
    question: "¿Qué muestran los datos de la CNMC sobre el mercado español en Q1 2026?",
    roleId: "role-analyst",
    lang: "es",
    expectedStatus: "answered",
    expectedDocIds: ["doc-cnmc-datos-q1-2026"],
    rationale: "Spanish-language question over a Spanish-language public source.",
  },
  // ---- Answered: internal material, correctly-cleared personas ------------
  {
    id: "gq-brand-colour",
    question: "What is the primary Telefónica brand colour and when is navy used?",
    roleId: "role-brand",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-brand-guidelines-2026"],
    rationale: "Brand persona over brand guidelines — core Marca retrieval path.",
  },
  {
    id: "gq-usp-conexion",
    question: "What is the 'Conexión que entiende' value proposition?",
    roleId: "role-brand",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-a-usp-conexion-entiende-brief"],
    rationale: "USP brief is private/Marca — the brand manager must get it.",
  },
  {
    id: "gq-mismo-sitio-es",
    question: "¿Qué es la campaña 'Mismo sitio, mismo precio' de Movistar?",
    roleId: "role-brand",
    lang: "es",
    expectedStatus: "answered",
    expectedDocIds: ["doc-campaign-mismo-sitio"],
    rationale: "Spanish campaign question over a private Marca-scoped campaign doc.",
  },
  {
    id: "gq-genz-es",
    question: "¿Qué dice el estudio de audiencias jóvenes 2026 sobre la Generación Z?",
    roleId: "role-brand",
    lang: "es",
    expectedStatus: "answered",
    expectedDocIds: ["doc-research-genz-2026"],
    rationale: "Marca-only research — the Marca persona must reach it.",
  },
  {
    id: "gq-fibra-usp-es",
    question: "¿Qué es la garantía de fibra simétrica del nuevo USP?",
    roleId: "role-brand",
    lang: "es",
    expectedStatus: "answered",
    expectedDocIds: ["doc-new-usp-fibra"],
    rationale: "In-review USP doc — answerable, validity surfaced honestly.",
  },
  {
    id: "gq-vivo-pt",
    question: "Qual é a posição da Vivo no mercado brasileiro?",
    roleId: "role-analyst",
    lang: "pt",
    expectedStatus: "answered",
    expectedDocIds: ["doc-brazil-vivo"],
    rationale: "Portuguese question over the Brazil market update (private, Comunicación).",
  },
  {
    id: "gq-o2-5g-de",
    question: "Wie baut O2 Telefónica das 5G-Netz in Deutschland 2026 aus?",
    roleId: "role-director",
    lang: "de",
    expectedStatus: "answered",
    expectedDocIds: [
      "doc-germany-o2",
      "doc-5g-deployment",
      "doc-tkg-novelle-2026",
      "doc-e-pr-o2-network",
      "doc-a-talking-points-sprechzettel-de-2026",
      "doc-b-press-en-de-market",
    ],
    rationale:
      "German question over the Germany market/network material — any of the German-market network docs is legitimate evidence.",
  },
  {
    id: "gq-nps-q1",
    question: "What is the group NPS for Q1 2026?",
    roleId: "role-director",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-customer-nps-q1-2026"],
    rationale: "Numeric-fact answer — the governed figure must come from the scorecard.",
  },
  {
    id: "gq-crisis-playbook",
    question:
      "What does the crisis communications playbook say about the first hour of an incident?",
    roleId: "role-director",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-crisis-playbook"],
    rationale: "Confidential playbook — the director must get it; press must not (see below).",
  },
  {
    id: "gq-b2b-strategy",
    question: "What is Telefónica Tech's B2B growth strategy?",
    roleId: "role-director",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-tech-b2b-strategy"],
    rationale: "Confidential strategy — answerable at director clearance.",
  },
  {
    id: "gq-transform-grow",
    question: "What are the pillars of the Transform & Grow strategic plan?",
    roleId: "role-director",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-transform-grow-plan"],
    rationale: "Confidential strategic plan — the core internal strategy answer.",
  },
  {
    id: "gq-atlas-super",
    question: "Is Telefónica planning any acquisition or merger?",
    roleId: "role-superuser",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-ma-project-atlas"],
    rationale:
      "Off-the-record memo — the cross-area super user is the persona who CAN see it.",
  },
  // ---- Answered + historic: superseded material flagged honestly ----------
  {
    id: "gq-oldrev-historic",
    question: "What was group revenue in Q4 2025?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-q4-2025-results"],
    expectHistoric: true,
    rationale: "Superseded quarter — must answer WITH the historic warning, never silently.",
  },
  {
    id: "gq-uk-rev-historic",
    question: "What was UK market revenue in Q3 2025?",
    roleId: "role-superuser",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-a-results-uk-q3-2025"],
    expectHistoric: true,
    rationale: "Historic confidential market results — historic flag at full clearance.",
  },
  {
    id: "gq-townhall-historic",
    question: "What was covered in the spring 2026 employee town hall?",
    roleId: "role-analyst",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-townhall-2026"],
    expectHistoric: true,
    rationale: "Historic internal event doc — the historic label must survive retrieval.",
  },
  // ---- Conflict: two permitted sources disagree ----------------------------
  {
    id: "gq-conflict-messaging",
    question: "What is our approved messaging on Q1 2026 revenue?",
    roleId: "role-analyst",
    lang: "en",
    expectedStatus: "conflict",
    rationale:
      "Superseded talking points disagree with the approved release — the Hub must surface both, not pick one.",
  },
  {
    id: "gq-conflict-q2-tp",
    question: "What are our approved Q2 2026 results talking points?",
    roleId: "role-director",
    lang: "en",
    expectedStatus: "conflict",
    rationale:
      "Approved vs superseded Q2 talking points — deterministic conflict detection.",
  },
  // ---- Permission blocked: the refusal side of the ladder ------------------
  {
    id: "gq-perm-prelim-press",
    question: "What are the pre-publication preliminary Q1 finance figures?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-q1-2026-ir-factsheet", "doc-q4-2025-results"],
    rationale:
      "The pre-publication pack stays blocked, but public IR material honestly answers with the PUBLISHED figures — governance is proven by grounding, not by refusal.",
  },
  {
    id: "gq-perm-prelim-analyst",
    question: "What are the pre-publication preliminary Q1 finance figures?",
    roleId: "role-analyst",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-q1-2026-ir-factsheet", "doc-q4-2025-results"],
    rationale:
      "One rung up the same ladder: the confidential pack is still out of reach; the honest answer cites permitted published material only.",
  },
  {
    id: "gq-perm-atlas-press",
    question: "Is Telefónica planning any acquisition or merger?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-b-press-en-ma-rumour"],
    rationale:
      "The off-the-record memo never surfaces; the public persona gets only the ingested press rumour, clearly labelled as unconfirmed.",
  },
  {
    id: "gq-perm-atlas-director",
    question: "Is Telefónica planning any acquisition or merger?",
    roleId: "role-director",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-b-press-en-ma-rumour", "doc-tech-b2b-strategy"],
    rationale:
      "The memo is Gabinete-scoped, so even confidential clearance answers from adjacent permitted material, never the memo itself.",
  },
  {
    id: "gq-perm-spain-rev-press",
    question: "What was Spain's market revenue in Q1 2026?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-q1-2026-ir-factsheet", "doc-cnmc-datos-q1-2026"],
    rationale:
      "The confidential per-market pack stays blocked; public IR and CNMC data honestly cover the published Spain figures.",
  },
  {
    id: "gq-perm-crisis-press",
    question: "What does the crisis playbook say about escalation?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "permission_blocked",
    rationale: "Confidential playbook — the counterpart to gq-crisis-playbook above.",
  },
  {
    id: "gq-perm-b2b-press",
    question: "What is Telefónica Tech's B2B growth strategy?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: [
      "doc-q1-2026-press-release",
      "doc-mwc-2026-keynote",
      "doc-e-pr-tech-partnership",
    ],
    rationale:
      "The confidential strategy paper stays blocked; the public keynote and press material honestly cover the announced B2B direction.",
  },
  {
    id: "gq-perm-tgp-press",
    question: "What are the pillars of the Transform & Grow strategic plan?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-q1-2026-press-release", "doc-mwc-2026-keynote"],
    rationale:
      "The confidential plan stays blocked; publicly announced pillars from the keynote and press release are the honest permitted answer.",
  },
  {
    id: "gq-perm-dt-analyst",
    question: "What does the competitor study say about Deutsche Telekom's positioning?",
    roleId: "role-analyst",
    lang: "en",
    expectedStatus: "permission_blocked",
    rationale:
      "Confidential AND Marca/Gabinete-scoped — blocked by clearance and area at once.",
  },
  {
    id: "gq-perm-hr-press",
    question: "What is the current group headcount and attrition rate?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-q1-2026-results"],
    rationale:
      "The confidential people dashboard stays blocked; the published results deck carries the public headcount figure and is the honest permitted answer.",
  },
  {
    id: "gq-perm-tracker-analyst",
    question: "What does the Q1 2026 brand tracker wave show?",
    roleId: "role-analyst",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-ssot-weekly-brief-w27", "doc-e-kpi-nps-objective"],
    rationale:
      "The Marca-scoped tracker itself stays blocked; the weekly brief's permitted summary of the wave is the honest cross-area answer.",
  },
  {
    id: "gq-perm-genz-analyst",
    question: "¿Qué dice el estudio de audiencias jóvenes 2026?",
    roleId: "role-analyst",
    lang: "es",
    expectedStatus: "answered",
    expectedDocIds: ["doc-a-research-market-spain-2026"],
    rationale:
      "The Marca-only youth study stays blocked; the permitted Spain market research covers the youth-audience findings the analyst may see.",
  },
  {
    id: "gq-perm-churn-brand",
    question: "What is the churn rate in Spain for Q1 2026?",
    roleId: "role-brand",
    lang: "en",
    expectedStatus: "answered",
    expectedDocIds: ["doc-customer-nps-q1-2026", "doc-cnmc-datos-q1-2026"],
    rationale:
      "The confidential CX dashboard stays blocked; permitted NPS and CNMC material honestly cover the published churn picture.",
  },
  {
    id: "gq-perm-regulatorio-press",
    question: "¿Qué dice la síntesis regulatoria del SIC para el Q2 2026?",
    roleId: "role-press",
    lang: "es",
    expectedStatus: "permission_blocked",
    rationale: "Private regulatory synthesis — refused at public clearance, in Spanish.",
  },
  // ---- No evidence: the honest-refusal side ---------------------------------
  {
    id: "gq-noev-quantum",
    question: "What is Telefónica's strategy for consumer quantum computing devices?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "Plausible-sounding topic with zero corpus evidence — must refuse, not guess.",
  },
  {
    id: "gq-noev-crypto",
    question: "Does Telefónica accept cryptocurrency payments?",
    roleId: "role-analyst",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "No governed evidence — generic brand words must not fake relevance.",
  },
  {
    id: "gq-noev-f1",
    question: "Is Telefónica sponsoring a Formula 1 team in 2026?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "Sponsorship question with no corpus coverage — honest empty answer.",
  },
  {
    id: "gq-noev-space",
    question: "What are Telefónica's space tourism partnerships?",
    roleId: "role-director",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "High-clearance persona changes nothing when evidence does not exist.",
  },
  {
    id: "gq-noev-bank",
    question: "Does Telefónica hold a banking licence in Norway?",
    roleId: "role-superuser",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "Even the super user gets an honest no-evidence, never a guess.",
  },
  {
    id: "gq-noev-console",
    question: "When does Telefónica launch its video game console?",
    roleId: "role-brand",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "Fabricated product line — the classic hallucination bait.",
  },
  {
    id: "gq-noev-airline-es",
    question: "¿Tiene Telefónica un acuerdo de código compartido con alguna aerolínea?",
    roleId: "role-analyst",
    lang: "es",
    expectedStatus: "no_evidence",
    rationale: "Spanish-language no-evidence path.",
  },
  {
    id: "gq-noev-fridge-de",
    question: "Plant O2 Telefónica eine Produktlinie für smarte Kühlschränke?",
    roleId: "role-director",
    lang: "de",
    expectedStatus: "no_evidence",
    rationale: "German-language no-evidence path.",
  },
  {
    id: "gq-noev-cruise-pt",
    question: "A Vivo tem parceria com alguma linha de cruzeiros?",
    roleId: "role-analyst",
    lang: "pt",
    expectedStatus: "no_evidence",
    rationale: "Portuguese-language no-evidence path.",
  },
  {
    id: "gq-noev-mars",
    question: "What is Telefónica's Mars colonisation roadmap?",
    roleId: "role-cabinet",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "Absurd topic at the highest clearance — refusal must be about evidence.",
  },
  {
    id: "gq-noev-restaurant",
    question: "Which restaurant chains has Telefónica acquired?",
    roleId: "role-superuser",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale:
      "Acquisition wording overlaps real M&A vocabulary — retrieval must still refuse.",
  },
  {
    id: "gq-noev-olympics",
    question: "What is Telefónica's medal forecast for the 2028 Olympics?",
    roleId: "role-press",
    lang: "en",
    expectedStatus: "no_evidence",
    rationale: "Nonsense metric request — no numeric fact must be invented.",
  },
];
