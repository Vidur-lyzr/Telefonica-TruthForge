// Brand Guardian — the export gate.
//
// A draft may only be exported (or a scheduled item approved) when the Guardian
// returns "pass". It enforces, on the composed draft itself:
//   1. Every substantive claim is cited (carries at least one [S#] marker).
//   2. No unapproved superlatives / prohibited claims (see UNAPPROVED_CLAIM_PATTERNS).
//   3. All template-required disclaimers are present.
//   4. Tone rules: no emoji; headings are not shouted in ALL CAPS.
//   5. European-English spelling nudge (warning only).
//
// Errors block export; warnings do not. Each finding carries a concrete,
// often cited/dated, rewrite suggestion so the drafter can fix and re-check.

import { getTemplate, UNAPPROVED_CLAIM_PATTERNS } from "../data/assets";
import type { GeneratedDraft, GuardianFinding, GuardianResult } from "./generateAgent";

// Every generated section is treated as claim-bearing (must be cited) EXCEPT
// these deterministically non-claim kinds: approved boilerplate (governed
// verbatim asset), press-contact blocks, and legal disclaimers.
const NON_CLAIM_KINDS = new Set(["boilerplate", "contact", "disclaimer"]);
// Rough emoji range check (no emoji is a hard brand rule).
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
const AMERICAN_SPELLINGS: { find: RegExp; prefer: string }[] = [
  { find: /\bcolor\b/i, prefer: "colour" },
  { find: /\borganiz(e|ed|ing|ation)\b/i, prefer: "organis-" },
  { find: /\bcenter\b/i, prefer: "centre" },
  { find: /\bprogram\b/i, prefer: "programme" },
];

export function runBrandGuardian(draft: GeneratedDraft): GuardianResult {
  const findings: GuardianFinding[] = [];

  // Only draftable content can be checked.
  if (draft.status !== "drafted") {
    return {
      status: "pass",
      summary: "No composed content to check.",
      findings: [],
    };
  }

  const allText = [
    draft.title,
    draft.umbrella ?? "",
    ...draft.sections.map((s) => `${s.heading} ${s.body}`),
  ].join("\n");

  // 1. Uncited substantive claims — every claim-bearing section AND the umbrella
  //    message must carry at least one [S#] marker.
  const claimSuggestion =
    "Attach an [S#] marker from the evidence, or remove the claim. Every factual statement must be backed by a governed source.";
  for (const s of draft.sections) {
    if (NON_CLAIM_KINDS.has(s.kind)) continue;
    if (s.internalOnly) continue;
    const hasMarker = /\[S\s*\d+/i.test(s.body);
    if (!hasMarker && s.body.trim().length > 0) {
      findings.push({
        severity: "error",
        rule: "citations",
        message: `Section "${s.heading || s.kind}" makes a claim with no source citation.`,
        suggestion: claimSuggestion,
      });
    }
  }
  if (draft.umbrella && draft.umbrella.trim().length > 0 && !/\[S\s*\d+/i.test(draft.umbrella)) {
    findings.push({
      severity: "error",
      rule: "citations",
      message: "The umbrella message makes a claim with no source citation.",
      suggestion: claimSuggestion,
    });
  }

  // 2. Unapproved / superlative claims.
  const lower = allText.toLowerCase();
  for (const p of UNAPPROVED_CLAIM_PATTERNS) {
    if (lower.includes(p.pattern.toLowerCase())) {
      findings.push({
        severity: "error",
        rule: "unapproved-claim",
        message: `Unapproved claim detected: "${p.pattern}". ${p.reason}`,
        suggestion: `Replace with: ${p.rewrite}`,
      });
    }
  }

  // 3. Required disclaimers.
  const template = getTemplate(draft.shape);
  const present = new Set(draft.disclaimers.map((d) => d.id));
  for (const id of template?.requiredDisclaimerIds ?? []) {
    if (!present.has(id)) {
      findings.push({
        severity: "error",
        rule: "disclaimer",
        message: `Required disclaimer "${id}" is missing.`,
        suggestion: "Restore the disclaimer before export.",
      });
    }
  }

  // 4. Tone — no emoji.
  if (EMOJI_RE.test(allText)) {
    findings.push({
      severity: "error",
      rule: "tone-emoji",
      message: "Emoji are not permitted in Telefónica communications.",
      suggestion: "Remove all emoji.",
    });
  }

  // 4b. Shouted headings.
  for (const s of draft.sections) {
    const letters = s.heading.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters.length >= 6 && s.heading === s.heading.toUpperCase()) {
      findings.push({
        severity: "warning",
        rule: "tone-caps",
        message: `Heading "${s.heading}" is in all caps.`,
        suggestion: "Use sentence case for headings.",
      });
    }
  }

  // 5. European-English spelling nudge.
  for (const rule of AMERICAN_SPELLINGS) {
    if (rule.find.test(allText)) {
      findings.push({
        severity: "warning",
        rule: "spelling",
        message: `American spelling detected; Telefónica uses European English.`,
        suggestion: `Prefer "${rule.prefer}".`,
      });
    }
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warning").length;
  const status = errorCount > 0 ? "block" : "pass";
  const summary =
    status === "pass"
      ? warnCount > 0
        ? `Cleared for export with ${warnCount} advisory ${warnCount === 1 ? "note" : "notes"}. Every claim is cited and no unapproved claims were found.`
        : "Cleared for export. Every claim is cited, no unapproved claims, disclaimers present."
      : `Export blocked: ${errorCount} ${errorCount === 1 ? "issue" : "issues"} must be resolved first.`;

  return { status, summary, findings };
}
