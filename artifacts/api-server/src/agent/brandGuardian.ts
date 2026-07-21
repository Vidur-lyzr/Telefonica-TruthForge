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

import { getTemplate, UNAPPROVED_CLAIM_PATTERNS, SPELLING_PREFERENCES } from "../data/assets";
import type { GeneratedDraft, GuardianFinding, GuardianResult } from "./generateAgent";

// Every generated section is treated as claim-bearing (must be cited) EXCEPT
// these deterministically non-claim kinds: approved boilerplate (governed
// verbatim asset), press-contact blocks, and legal disclaimers.
const NON_CLAIM_KINDS = new Set(["boilerplate", "contact", "disclaimer"]);
// Rough emoji range check (no emoji is a hard brand rule).
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
// Derived from the shared spelling-preference list so the export gate and the
// Brand Room's live checker flag exactly the same words.
const AMERICAN_SPELLINGS: { find: RegExp; prefer: string }[] = SPELLING_PREFERENCES.map(
  (s) => ({ find: new RegExp(s.pattern, "i"), prefer: s.european }),
);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

  // Visual-deck slot text is display copy on rendered slides — it must pass
  // the same brand checks as the document body. Ids (image/chart references)
  // are harmless to include; only strings are collected.
  const collectStrings = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(collectStrings);
    if (value && typeof value === "object") {
      return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
    }
    return [];
  };
  const visualText = (draft.visualSlides ?? [])
    .flatMap((s) => collectStrings(s.slots))
    .join("\n");

  const allText = [
    draft.title,
    draft.umbrella ?? "",
    ...draft.sections.map((s) => `${s.heading} ${s.body}`),
    visualText,
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

  // 6. Ask handoff risk state — a draft that started from an Ask answer with
  //    conflicting, low-confidence or historic evidence carries that provenance
  //    as explicit advisories so it stays visible at the export gate.
  if (draft.askSignals?.conflict) {
    findings.push({
      severity: "warning",
      rule: "ask-conflict",
      message:
        "This draft started from an Ask answer where permitted sources conflicted on the figures.",
      suggestion:
        "Verify the cited figures against the most recent governed release before export.",
    });
  }
  if (draft.askSignals?.lowConfidence) {
    findings.push({
      severity: "warning",
      rule: "ask-low-confidence",
      message: "This draft started from an Ask answer marked low confidence (thin corroboration).",
      suggestion: "Corroborate the key claims with additional governed sources before export.",
    });
  }
  if (draft.askSignals?.historic) {
    findings.push({
      severity: "warning",
      rule: "ask-historic",
      message:
        "The Ask answer this draft started from cited historic or superseded material.",
      suggestion: "Check the current release supersedes these figures before export.",
    });
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

// A figure — money, percentage, or magnitude word — that a reader would expect
// to be backed by a governed source.
const FIGURE_RE =
  /(?:[€£$]\s?\d|\d[\d.,]*\s?%|\b\d[\d.,]*\s?(?:m|bn|k)\b|\bmillion\b|\bbillion\b)/i;

function truncateLine(line: string): string {
  const s = line.trim();
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}

// Live, deterministic Brand Guardian over arbitrary pasted prose (Brand Room).
// It shares the exact rule vocabulary as the export-gate Guardian above, but
// runs on free text rather than a composed draft, so a drafter can check any
// copy — a tweet, an intro, a caption — before it goes near the corpus.
export function checkBrandText(text: string): GuardianResult {
  const findings: GuardianFinding[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      status: "pass",
      summary: "Paste a draft above to run the Brand Guardian.",
      findings: [],
    };
  }

  // Each rule emits one finding PER occurrence with the exact character span it
  // matched, so the Brand Room can highlight every violation inline in the
  // checked text rather than listing rules abstractly.

  // 1. Emoji — hard brand rule.
  {
    const re = new RegExp(EMOJI_RE.source, "gu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "error",
        rule: "tone-emoji",
        message: "Emoji are not permitted in Telefónica communications.",
        suggestion: "Remove the emoji.",
        location: { start: m.index, end: m.index + m[0].length },
      });
    }
  }

  // 2. Unapproved / superlative claims.
  for (const p of UNAPPROVED_CLAIM_PATTERNS) {
    const re = new RegExp(escapeRegExp(p.pattern), "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "error",
        rule: "unapproved-claim",
        message: `Unapproved claim detected: "${p.pattern}". ${p.reason}`,
        suggestion: `Replace with: ${p.rewrite}`,
        location: { start: m.index, end: m.index + m[0].length },
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // 3. Shouted lines — headings or sentences in all caps.
  {
    let offset = 0;
    for (const line of text.split("\n")) {
      const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "");
      if (letters.length >= 6 && line === line.toUpperCase()) {
        const leading = line.length - line.trimStart().length;
        findings.push({
          severity: "warning",
          rule: "tone-caps",
          message: `Line "${truncateLine(line)}" is in all caps.`,
          suggestion: "Use sentence case; reserve caps for short tracked eyebrows.",
          location: { start: offset + leading, end: offset + line.trimEnd().length },
        });
      }
      offset += line.length + 1; // +1 for the "\n" removed by split
    }
  }

  // 4. European-English spelling.
  for (const rule of AMERICAN_SPELLINGS) {
    const re = new RegExp(rule.find.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        rule: "spelling",
        message: "American spelling detected; Telefónica uses European English.",
        suggestion: `Prefer "${rule.prefer}".`,
        location: { start: m.index, end: m.index + m[0].length },
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // 5. Uncited figures — a number that should carry a governed source.
  if (!/\[S\s*\d+/i.test(text)) {
    const re = new RegExp(FIGURE_RE.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        rule: "citations",
        message: "A figure appears without a source citation.",
        suggestion:
          "Attach an [S#] marker from a governed source so the number can be defended.",
        location: { start: m.index, end: m.index + m[0].length },
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // Present in document order so inline highlighting reads top-to-bottom.
  findings.sort((a, b) => (a.location?.start ?? 0) - (b.location?.start ?? 0));

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warning").length;
  const status = errorCount > 0 ? "block" : "pass";
  const summary =
    status === "block"
      ? `${errorCount} ${errorCount === 1 ? "issue blocks" : "issues block"} this text${
          warnCount > 0
            ? `, plus ${warnCount} advisory ${warnCount === 1 ? "note" : "notes"}`
            : ""
        }.`
      : warnCount > 0
        ? `On brand, with ${warnCount} advisory ${warnCount === 1 ? "note" : "notes"} to consider.`
        : "On brand. No emoji, no unapproved claims, and every figure is cited.";

  return { status, summary, findings };
}
