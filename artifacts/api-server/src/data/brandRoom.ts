// Brand Room — the governed brand-governance surface for the Marca team.
// Templates, tone-of-voice rules, corporate resources, and the data behind the
// live Brand Guardian text checker. All content is fictional / illustrative.
// Governed templates and resources are permission-filtered by persona clearance
// BEFORE they are returned (fail-closed), mirroring the rest of the platform.

import { CLEARANCE_RANK, ROLES, type Clearance, type Validity } from "./corpus";
import {
  TEMPLATES,
  BOILERPLATES,
  APPROVED_QUOTES,
  GLOSSARY,
  UNAPPROVED_CLAIM_PATTERNS,
  SPELLING_PREFERENCES,
  getDisclaimer,
  type DocShape,
} from "./assets";

// ---- Tone of voice ----------------------------------------------------------

export interface TonePrinciple {
  id: string;
  title: string;
  guidance: string;
  dos: string[];
  donts: string[];
}

export const TONE_PRINCIPLES: TonePrinciple[] = [
  {
    id: "tone-clear",
    title: "Clear over clever",
    guidance:
      "Write so a busy reader understands the point on first read. Short sentences, plain words, one idea at a time.",
    dos: ["Lead with the point", "Use plain, precise language", "Prefer active voice"],
    donts: ["Bury the message in jargon", "Stack clauses and qualifiers"],
  },
  {
    id: "tone-confident",
    title: "Confident, never boastful",
    guidance:
      "State what is true and defensible. Avoid superlatives that cannot be substantiated across every market and metric.",
    dos: ["Use approved, comparative phrasing", "Let cited figures carry the weight"],
    donts: ["Claim 'the largest', 'number one' or 'the best'", "Promise guaranteed outcomes"],
  },
  {
    id: "tone-human",
    title: "Human and direct",
    guidance:
      "Speak to people, not at them. Sentence case, warm and respectful, with no shouting.",
    dos: ["Use sentence case for headings", "Address the reader plainly"],
    donts: ["Write headings in all caps", "Use emoji"],
  },
  {
    id: "tone-evidence",
    title: "Evidence-led",
    guidance:
      "Every claim rests on a governed, cited source. If it cannot be cited, it does not ship.",
    dos: ["Attach an [S#] marker to every figure", "Cite the dated, approved source"],
    donts: ["State numbers without a source", "Quote unpublished or historic figures as current"],
  },
  {
    id: "tone-european-english",
    title: "Consistent European English",
    guidance:
      "Use European English spelling and the agreed Telefónica terminology throughout.",
    dos: ["Prefer 'colour', 'centre', 'programme'", "Use the governed glossary"],
    donts: ["Mix American and European spelling", "Invent new terms for governed concepts"],
  },
  {
    id: "tone-inclusive",
    title: "Calm and inclusive",
    guidance:
      "Measured, inclusive language and calm delivery — in copy and in motion alike.",
    dos: ["Keep tone measured and inclusive", "Use restrained, purposeful emphasis"],
    donts: ["Overstate or sensationalise", "Rely on hype words"],
  },
];

// Hard, deterministic brand rules — the same vocabulary the Brand Guardian enforces.
export interface BrandRule {
  id: string;
  rule: string;
  severity: "error" | "warning";
  detail: string;
}

export const BRAND_RULES: BrandRule[] = [
  {
    id: "rule-emoji",
    rule: "No emoji",
    severity: "error",
    detail: "Emoji never appear in Telefónica communications.",
  },
  {
    id: "rule-superlative",
    rule: "No unapproved superlatives",
    severity: "error",
    detail:
      "Absolute claims such as 'the largest', 'number one' or 'the best' need an approved, cited exception.",
  },
  {
    id: "rule-citations",
    rule: "Cite every figure",
    severity: "warning",
    detail: "Any number, percentage or monetary figure must carry an [S#] source marker.",
  },
  {
    id: "rule-caps",
    rule: "Sentence case",
    severity: "warning",
    detail: "Headings use sentence case; all caps is reserved for short tracked eyebrows.",
  },
  {
    id: "rule-spelling",
    rule: "European English",
    severity: "warning",
    detail: "Use European English spelling and the governed Telefónica glossary.",
  },
];

export interface ProhibitedPhrase {
  id: string;
  phrase: string;
  reason: string;
  rewrite: string;
}

export interface SpellingPref {
  american: string;
  european: string;
}

// ---- Templates --------------------------------------------------------------
// Governed document templates are internal brand-governance material — external
// personas (public clearance) see them as permission-blocked, not missing.
const TEMPLATE_CLEARANCE: Clearance = "internal";

export interface BrandTemplateSection {
  key: string;
  label: string;
  kind: string;
  perAxis: boolean;
}

export interface BrandTemplateDisclaimer {
  id: string;
  name: string;
  text: string;
}

export interface BrandTemplate {
  id: string;
  shape: DocShape;
  name: string;
  description: string;
  clearance: Clearance;
  sections: BrandTemplateSection[];
  disclaimers: BrandTemplateDisclaimer[];
}

const BRAND_TEMPLATES: BrandTemplate[] = TEMPLATES.map((t) => ({
  id: t.id,
  shape: t.shape,
  name: t.name,
  description: t.description,
  clearance: TEMPLATE_CLEARANCE,
  sections: t.sections.map((s) => ({
    key: s.key,
    label: s.label,
    kind: s.kind,
    perAxis: Boolean(s.perAxis),
  })),
  disclaimers: t.requiredDisclaimerIds
    .map((id) => getDisclaimer(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({ id: d.id, name: d.name, text: d.text })),
}));

// ---- Resources --------------------------------------------------------------

export type ResourceCategory = "identity" | "messaging" | "legal" | "reference";

export interface BrandResource {
  id: string;
  name: string;
  category: ResourceCategory;
  description: string;
  detail: string;
  format: string;
  clearance: Clearance;
  validity: Validity;
}

const publicQuote = APPROVED_QUOTES.find((q) => q.confidentiality === "public");
const confidentialQuote = APPROVED_QUOTES.find(
  (q) => q.confidentiality === "confidential",
);
const forwardLooking = getDisclaimer("disc-forward-looking");
const noOffer = getDisclaimer("disc-no-offer");

export const BRAND_RESOURCES: BrandResource[] = [
  {
    id: "res-logo",
    name: "Logo lockups",
    category: "identity",
    description:
      "The five-dot Telefónica mark and full lockups for light and dark surfaces.",
    detail:
      "Use the blue lockup on light surfaces and the white lockup on navy or blue bands. Preserve clear space equal to the height of the dot, and never recolour, stretch or add effects to the mark.",
    format: "SVG / PNG lockups",
    clearance: "public",
    validity: "approved",
  },
  {
    id: "res-colour",
    name: "Core colour palette",
    category: "identity",
    description:
      "Brand blue, deep navy and the supporting tints used across every surface.",
    detail:
      "Brand blue #0066FF and deep navy #001B41 lead. Use one or two blues per view and navy for dark bands. Semantic colours (success, warning, error) are used sparingly and never for decoration.",
    format: "Hex tokens",
    clearance: "public",
    validity: "approved",
  },
  {
    id: "res-type",
    name: "Typography",
    category: "identity",
    description:
      "Telefónica Sans with tight display tracking and a sentence-case rule.",
    detail:
      "One sans everywhere, with tight negative tracking on display and titles. Sentence case for headings; all caps only for short tracked eyebrows.",
    format: "Type scale",
    clearance: "public",
    validity: "approved",
  },
  {
    id: "res-boilerplate",
    name: "Corporate boilerplate",
    category: "messaging",
    description: "The approved 'About Telefónica' paragraph for press material.",
    detail: BOILERPLATES[0]?.text ?? "",
    format: "Verbatim text",
    clearance: BOILERPLATES[0]?.confidentiality ?? "public",
    validity: BOILERPLATES[0]?.validity ?? "approved",
  },
  {
    id: "res-quote-public",
    name: "Approved executive quote",
    category: "messaging",
    description: "A cleared, public spokesperson quote for external use.",
    detail: publicQuote ? `"${publicQuote.text}" — ${publicQuote.attribution}` : "",
    format: "Verbatim quote",
    clearance: "public",
    validity: "approved",
  },
  {
    id: "res-quote-confidential",
    name: "Executive quote — strategy",
    category: "messaging",
    description: "A cleared strategy quote restricted to confidential internal use.",
    detail: confidentialQuote
      ? `"${confidentialQuote.text}" — ${confidentialQuote.attribution}`
      : "",
    format: "Verbatim quote",
    clearance: "confidential",
    validity: "approved",
  },
  {
    id: "res-disclaimers",
    name: "Standard disclaimers",
    category: "legal",
    description:
      "Forward-looking and no-offer statements required on governed documents.",
    detail: [forwardLooking?.text, noOffer?.text].filter(Boolean).join("\n\n"),
    format: "Verbatim text",
    clearance: "public",
    validity: "approved",
  },
  {
    id: "res-glossary",
    name: "Governed glossary",
    category: "reference",
    description:
      "Approved definitions for Transform & Grow and key financial terms.",
    detail: GLOSSARY.map((g) => `${g.term} — ${g.definition}`).join("\n\n"),
    format: "Reference sheet",
    clearance: "public",
    validity: "approved",
  },
  {
    id: "res-naming",
    name: "Product & sub-brand naming",
    category: "reference",
    description:
      "Rules for naming products, services and sub-brands consistently.",
    detail:
      "Lead with the Telefónica masterbrand. Sub-brands take sentence case and never introduce a competing colour system. New names route through Brand governance before any external use.",
    format: "Reference sheet",
    clearance: "internal",
    validity: "approved",
  },
  {
    id: "res-playbook",
    name: "Crisis messaging playbook",
    category: "reference",
    description:
      "Escalation and tone guidance for sensitive or crisis communications.",
    detail:
      "Hold to the approved holding statement, route all external lines through the Communications Director, and never speculate ahead of a governed, cited source.",
    format: "Playbook",
    clearance: "confidential",
    validity: "review",
  },
];

// ---- Permission-filtered accessors (fail-closed) ----------------------------

// An unknown or absent persona resolves to the LOWEST clearance so it can only
// ever see less, never more — the same fail-closed default the agent uses.
function personaClearance(roleId?: string): Clearance {
  if (!roleId) return "public";
  const role = ROLES.find((r) => r.id === roleId);
  return role ? role.clearance : "public";
}

function canSee(clearance: Clearance, persona: Clearance): boolean {
  return CLEARANCE_RANK[clearance] <= CLEARANCE_RANK[persona];
}

export interface BrandTemplatesView {
  personaClearance: Clearance;
  blockedCount: number;
  templates: BrandTemplate[];
}

export function accessibleTemplates(roleId?: string): BrandTemplatesView {
  const persona = personaClearance(roleId);
  const templates = BRAND_TEMPLATES.filter((t) => canSee(t.clearance, persona));
  return {
    personaClearance: persona,
    blockedCount: BRAND_TEMPLATES.length - templates.length,
    templates,
  };
}

export interface BrandResourcesView {
  personaClearance: Clearance;
  blockedCount: number;
  resources: BrandResource[];
}

export function accessibleResources(roleId?: string): BrandResourcesView {
  const persona = personaClearance(roleId);
  const resources = BRAND_RESOURCES.filter((r) => canSee(r.clearance, persona));
  return {
    personaClearance: persona,
    blockedCount: BRAND_RESOURCES.length - resources.length,
    resources,
  };
}

export interface BrandToneView {
  principles: TonePrinciple[];
  rules: BrandRule[];
  prohibited: ProhibitedPhrase[];
  spelling: SpellingPref[];
}

export function brandTone(): BrandToneView {
  return {
    principles: TONE_PRINCIPLES,
    rules: BRAND_RULES,
    prohibited: UNAPPROVED_CLAIM_PATTERNS.map((p) => ({
      id: p.id,
      phrase: p.pattern,
      reason: p.reason,
      rewrite: p.rewrite,
    })),
    spelling: SPELLING_PREFERENCES.map((s) => ({
      american: s.american,
      european: s.european,
    })),
  };
}
