// Governed assets layer for the Generate engine.
// Templates (per shape), an approved-claims list, an approved quotes /
// boilerplate library, disclaimers, a glossary, and unapproved-claim patterns
// used by the Brand Guardian. All content is fictional / illustrative.

import type { Clearance, Validity } from "./corpus";

export type DocShape = "messaging" | "press" | "multiformat" | "visualdeck";

export interface DocumentTemplate {
  id: string;
  shape: DocShape;
  name: string;
  description: string;
  // Ordered section blueprint the engine fills with cited evidence.
  sections: {
    key: string;
    label: string;
    kind:
      | "umbrella"
      | "key_message"
      | "headline"
      | "lead"
      | "body"
      | "quote"
      | "boilerplate"
      | "contact"
      | "qa"
      | "summary";
    perAxis?: boolean;
  }[];
  requiredDisclaimerIds: string[];
}

export interface ApprovedClaim {
  id: string;
  text: string;
  confidentiality: Clearance;
  validity: Validity;
  requiresCitationDocId?: string;
  note?: string;
}

export interface ApprovedQuote {
  id: string;
  text: string;
  attribution: string;
  confidentiality: Clearance;
  validity: Validity;
  docId: string;
}

export interface Boilerplate {
  id: string;
  name: string;
  text: string;
  confidentiality: Clearance;
  validity: Validity;
}

export interface Disclaimer {
  id: string;
  name: string;
  text: string;
  appliesTo: DocShape[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

// Superlative / unapproved-claim patterns. The Brand Guardian blocks export
// when any of these appear in a draft without an approved, cited exception.
export interface UnapprovedClaimPattern {
  id: string;
  pattern: string; // matched case-insensitively against the draft text
  reason: string;
  rewrite: string; // a cited, dated, hedged alternative to propose
}

export const TEMPLATES: DocumentTemplate[] = [
  {
    id: "tmpl-messaging",
    shape: "messaging",
    name: "Messaging document",
    description:
      "Umbrella message plus key messages per strategic axis, each backed by a cited figure, with spokesperson notes.",
    sections: [
      { key: "umbrella", label: "Umbrella message", kind: "umbrella" },
      { key: "keymsg", label: "Key messages by axis", kind: "key_message", perAxis: true },
    ],
    requiredDisclaimerIds: ["disc-forward-looking"],
  },
  {
    id: "tmpl-press",
    shape: "press",
    name: "Press release + Q&A",
    description:
      "Headline, lead, cited body, an executive quote, boilerplate and press contact, plus a prepared Q&A.",
    sections: [
      { key: "headline", label: "Headline", kind: "headline" },
      { key: "lead", label: "Standfirst", kind: "lead" },
      { key: "body", label: "Body", kind: "body" },
      { key: "quote", label: "Executive quote", kind: "quote" },
      { key: "boilerplate", label: "About Telefónica", kind: "boilerplate" },
      { key: "contact", label: "Press contact", kind: "contact" },
      { key: "qa", label: "Q&A", kind: "qa" },
    ],
    requiredDisclaimerIds: ["disc-forward-looking", "disc-no-offer"],
  },
  {
    id: "tmpl-multiformat",
    shape: "multiformat",
    name: "Multi-format document",
    description:
      "A flexible on-brand document: executive summary, themed sections with charts, and a close.",
    sections: [
      { key: "summary", label: "Executive summary", kind: "summary" },
      { key: "body", label: "Themed sections", kind: "body", perAxis: true },
    ],
    requiredDisclaimerIds: ["disc-forward-looking"],
  },
  // Visual deck templates: the composed text sections stay the governed,
  // cited backbone (traceability panel, guardian, evidence page); a second
  // agent pass then arranges that content into coded visual slide layouts.
  {
    id: "tmpl-visual-weekly",
    shape: "visualdeck",
    name: "Weekly activity report (visual deck)",
    description:
      "A visually rich weekly headlines deck: photo cover, section dividers, per-item news cards with imagery and metric callouts, KPI slide and closing.",
    sections: [
      { key: "summary", label: "Week at a glance", kind: "summary" },
      { key: "body", label: "News items", kind: "body", perAxis: true },
    ],
    requiredDisclaimerIds: ["disc-forward-looking"],
  },
  {
    id: "tmpl-visual-corporate",
    shape: "visualdeck",
    name: "Corporate deck (visual)",
    description:
      "A corporate presentation deck: full-bleed photo cover, agenda, statement dividers, KPI slides, results table, campaign metrics chart and closing.",
    sections: [
      { key: "summary", label: "Executive summary", kind: "summary" },
      { key: "body", label: "Strategic sections", kind: "body", perAxis: true },
    ],
    requiredDisclaimerIds: ["disc-forward-looking"],
  },
];

export const APPROVED_CLAIMS: ApprovedClaim[] = [
  {
    id: "claim-core-markets",
    text: "Telefónica is focused on four core markets: Spain, Germany, Brazil and the United Kingdom.",
    confidentiality: "public",
    validity: "approved",
  },
  {
    id: "claim-revenue-growth",
    text: "Group revenue grew year on year in Q1 2026, led by convergence and B2B.",
    confidentiality: "public",
    validity: "approved",
    requiresCitationDocId: "doc-q1-2026-results",
  },
  {
    id: "claim-netzero",
    text: "Telefónica is committed to reaching net-zero emissions by 2040 across its main markets.",
    confidentiality: "public",
    validity: "approved",
    requiresCitationDocId: "doc-sustainability-2025",
  },
  {
    id: "claim-large-operator",
    text: "Telefónica is one of the largest telecommunications companies in the world by number of customers.",
    confidentiality: "public",
    validity: "approved",
    note: "Approved comparative. Do NOT upgrade to superlatives such as 'the largest' or 'leader'.",
  },
];

export const APPROVED_QUOTES: ApprovedQuote[] = [
  {
    id: "quote-chile-focus",
    text: "The agreement strengthens our balance sheet and sharpens our focus on the markets where we can lead.",
    attribution: "Group Communications, on the Chile transaction",
    confidentiality: "public",
    validity: "approved",
    docId: "doc-chile-sale",
  },
  {
    id: "quote-tg-discipline",
    text: "Transform & Grow is about focus and discipline: fewer, stronger markets and profitable growth.",
    attribution: "Group Strategy",
    confidentiality: "confidential",
    validity: "approved",
    docId: "doc-transform-grow-plan",
  },
];

export const BOILERPLATES: Boilerplate[] = [
  {
    id: "boiler-standard",
    name: "Standard corporate boilerplate",
    text: "Telefónica is one of the largest telecommunications companies in the world by number of customers, with a presence in Europe and Latin America. It provides connectivity and digital services to consumers and businesses.",
    confidentiality: "public",
    validity: "approved",
  },
];

// Approved press contact block. Deterministic: the model never writes this —
// it is appended verbatim to every press release.
export const PRESS_CONTACT = {
  heading: "Press contact",
  text: "Telefónica Group Communications — press.office@telefonica.com · +34 91 482 38 00 · telefonica.com/press",
};

export const DISCLAIMERS: Disclaimer[] = [
  {
    id: "disc-forward-looking",
    name: "Forward-looking statements",
    text: "This document may contain forward-looking statements. Actual results may differ materially. Figures are as at the date cited and should be verified against the latest published release.",
    appliesTo: ["messaging", "press", "multiformat", "visualdeck"],
  },
  {
    id: "disc-no-offer",
    name: "No offer",
    text: "This document is for information only and does not constitute an offer or solicitation to buy or sell any securities.",
    appliesTo: ["press"],
  },
];

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "gl-tg",
    term: "Transform & Grow",
    definition:
      "Telefónica's strategic plan to focus on four core markets, scale B2B and technology, and grow profitably.",
  },
  {
    id: "gl-accesses",
    term: "Accesses",
    definition:
      "The total number of active customer connections across fixed, mobile and other services.",
  },
  {
    id: "gl-ebitda",
    term: "Adjusted EBITDA",
    definition:
      "Earnings before interest, tax, depreciation and amortisation, adjusted for exceptional items.",
  },
];

export const UNAPPROVED_CLAIM_PATTERNS: UnapprovedClaimPattern[] = [
  {
    id: "unapp-european-leader",
    pattern: "european leader",
    reason:
      "'European leader' is an unapproved superlative that cannot be substantiated across all metrics and markets.",
    rewrite:
      "one of the largest operators in Europe by number of customers [cite Q1 2026 Results]",
  },
  {
    id: "unapp-the-largest",
    pattern: "the largest telecommunications company",
    reason: "Absolute superlative 'the largest' is not approved.",
    rewrite:
      "one of the largest telecommunications companies in the world by number of customers",
  },
  {
    id: "unapp-number-one",
    pattern: "number one",
    reason: "'Number one' is an unapproved ranking claim.",
    rewrite: "a leading provider in its core markets [with a dated, cited source]",
  },
  {
    id: "unapp-best-network",
    pattern: "best network in the world",
    reason: "'Best network in the world' is an unapproved global superlative.",
    rewrite:
      "an ambition to operate the best networks in its markets [cite MWC 2026 Keynote]",
  },
  {
    id: "unapp-guaranteed",
    pattern: "guaranteed returns",
    reason: "'Guaranteed returns' is a prohibited financial promise.",
    rewrite: "expected returns, subject to the forward-looking disclaimer",
  },
];

// European-English spelling preferences. The Brand Guardian flags the American
// form (matched by `pattern`) and the Brand Room surfaces the preferred form.
export interface SpellingPreference {
  id: string;
  american: string;
  european: string;
  pattern: string; // regex source, matched case-insensitively
}

export const SPELLING_PREFERENCES: SpellingPreference[] = [
  { id: "sp-colour", american: "color", european: "colour", pattern: "\\bcolor\\b" },
  {
    id: "sp-organise",
    american: "organize",
    european: "organise",
    pattern: "\\borganiz(?:e|ed|ing|ation)\\b",
  },
  { id: "sp-centre", american: "center", european: "centre", pattern: "\\bcenter\\b" },
  { id: "sp-programme", american: "program", european: "programme", pattern: "\\bprogram\\b" },
];

const templateByShape = new Map(TEMPLATES.map((t) => [t.shape, t]));
export function getTemplate(shape: DocShape): DocumentTemplate | undefined {
  return templateByShape.get(shape);
}

const templateById = new Map(TEMPLATES.map((t) => [t.id, t]));
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return templateById.get(id);
}

const disclaimerById = new Map(DISCLAIMERS.map((d) => [d.id, d]));
export function getDisclaimer(id: string): Disclaimer | undefined {
  return disclaimerById.get(id);
}
