// Brand Guardian agent — the live Brand Room checker, rebuilt as a real agent.
//
// Two passes over the pasted copy:
//   1. A deterministic rule pass (checkBrandText) — emoji, unapproved claims,
//      shouted lines, American spelling, uncited figures — with exact character
//      spans. These findings are always kept: the hard rules never depend on a
//      model.
//   2. A Claude review working from the EDITABLE Brand Guardian skill document
//      (brandSkillStore) — voice pillars, register, manifesto discipline,
//      headline formula — returning structured findings with verbatim quotes
//      that are mapped back to character spans for inline highlighting.
//
// If the model call fails or returns unusable JSON, the deterministic verdict
// is returned honestly, with the summary noting that the model review was
// unavailable. An abort (client disconnect) is rethrown, never swallowed.

import { meteredCreate } from "./metering";
import { checkBrandText } from "./brandGuardian";
import { getBrandSkill } from "../data/brandSkillStore";
import type { GuardianFinding, GuardianResult } from "./generateAgent";

const MODEL = "claude-sonnet-4-6";

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

export type GuardianStreamEvent = {
  type: "step";
  id: string;
  label: string;
  state: "active" | "done";
  detail?: string | null;
};

type GuardianEmit = (event: GuardianStreamEvent) => void;

// Rules the model may report. Anything else is coerced to "voice".
const MODEL_RULES = new Set([
  "voice-open",
  "voice-bold",
  "voice-trustworthy",
  "register",
  "manifesto",
  "headline-formula",
  "voice",
]);

interface ModelFinding {
  severity?: unknown;
  rule?: unknown;
  message?: unknown;
  suggestion?: unknown;
  quote?: unknown;
}

interface ModelVerdict {
  summary?: unknown;
  findings?: unknown;
}

const RESPONSE_INSTRUCTIONS = [
  "You will receive a piece of copy to review. Respond with ONLY a JSON object wrapped in <verdict></verdict> tags, no other prose.",
  'Shape: {"summary": string, "findings": [{"severity": "error"|"warning", "rule": string, "message": string, "suggestion": string, "quote": string}]}.',
  `"rule" must be one of: voice-open, voice-bold, voice-trustworthy, register, manifesto, headline-formula.`,
  '"quote" must be an EXACT verbatim substring of the copy (the shortest span that shows the problem). Never paraphrase inside "quote".',
  '"summary" is one or two plain sentences judging the whole text against the skill. No emoji anywhere.',
  "Only report genuine voice, register or narrative problems the skill describes. Do NOT report emoji, superlative claims, all-caps lines, American spelling or uncited figures — a deterministic pass already covers those. Report at most six findings.",
  "Severity: use \"error\" only when the skill names it a hard rule; everything stylistic is \"warning\".",
].join("\n");

function extractVerdict(raw: string): ModelVerdict | null {
  const tagMatch = raw.match(/<verdict>([\s\S]*?)<\/verdict>/i);
  const candidate = (tagMatch ? tagMatch[1] : raw)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === "object") return parsed as ModelVerdict;
    return null;
  } catch {
    return null;
  }
}

// Map each model finding's verbatim quote back to a character span. Repeated
// quotes advance past the previous match so two findings on the same phrase
// highlight successive occurrences.
function toFindings(text: string, verdict: ModelVerdict): GuardianFinding[] {
  if (!Array.isArray(verdict.findings)) return [];
  const out: GuardianFinding[] = [];
  const cursor = new Map<string, number>();
  for (const f of verdict.findings.slice(0, 6) as ModelFinding[]) {
    if (!f || typeof f !== "object") continue;
    const message = typeof f.message === "string" ? f.message.trim() : "";
    if (!message) continue;
    const severity = f.severity === "error" ? "error" : "warning";
    const ruleRaw = typeof f.rule === "string" ? f.rule.trim() : "";
    const rule = MODEL_RULES.has(ruleRaw) ? ruleRaw : "voice";
    const suggestion =
      typeof f.suggestion === "string" && f.suggestion.trim().length > 0
        ? f.suggestion.trim()
        : null;
    let location: { start: number; end: number } | null = null;
    const quote = typeof f.quote === "string" ? f.quote : "";
    if (quote.trim().length > 0) {
      const from = cursor.get(quote) ?? 0;
      const idx = text.indexOf(quote, from);
      if (idx !== -1) {
        location = { start: idx, end: idx + quote.length };
        cursor.set(quote, idx + quote.length);
      }
    }
    out.push({ severity, rule, message, suggestion, location });
  }
  return out;
}

// Drop model findings that overlap a deterministic finding for the same ground
// (the deterministic span already highlights it with an exact rule).
function dedupe(
  deterministic: GuardianFinding[],
  model: GuardianFinding[],
): GuardianFinding[] {
  return model.filter((m) => {
    if (!m.location) return true;
    return !deterministic.some(
      (d) =>
        d.location &&
        m.location &&
        d.location.start < m.location.end &&
        m.location.start < d.location.end,
    );
  });
}

export async function runBrandGuardianAgent(
  text: string,
  log: Logger,
  emit?: GuardianEmit,
  signal?: AbortSignal,
): Promise<GuardianResult> {
  const step = (
    id: string,
    label: string,
    state: "active" | "done",
    detail?: string | null,
  ) => emit?.({ type: "step", id, label, state, detail: detail ?? null });

  const throwIfAborted = () => {
    if (signal?.aborted) {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
  };

  // 1. Load the editable skill.
  step("skill", "Loading the Brand Guardian skill", "active");
  const skill = getBrandSkill();
  step(
    "skill",
    "Loading the Brand Guardian skill",
    "done",
    `Version ${skill.version}${skill.isDefault ? " (governed default)" : " (edited)"}`,
  );

  // 2. Deterministic hard rules.
  step("rules", "Running deterministic brand rules", "active");
  const deterministic = checkBrandText(text);
  const detErrors = deterministic.findings.filter((f) => f.severity === "error").length;
  const detWarnings = deterministic.findings.length - detErrors;
  step(
    "rules",
    "Running deterministic brand rules",
    "done",
    `${detErrors} blocking, ${detWarnings} advisory`,
  );
  throwIfAborted();

  // 3. Claude review against the skill.
  step("model", "Reviewing voice and register with Claude", "active");
  let modelFindings: GuardianFinding[] = [];
  let modelSummary: string | null = null;
  let modelUnavailable = false;
  try {
    const message = await meteredCreate("brand", {
      model: MODEL,
      max_tokens: 1200,
      system: `${skill.content}\n\n---\n\n${RESPONSE_INSTRUCTIONS}`,
      messages: [{ role: "user", content: `Copy to review:\n\n${text}` }],
    });
    throwIfAborted();
    const raw = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const verdict = extractVerdict(raw);
    if (verdict) {
      modelFindings = dedupe(deterministic.findings, toFindings(text, verdict));
      modelSummary =
        typeof verdict.summary === "string" && verdict.summary.trim().length > 0
          ? verdict.summary.trim()
          : null;
      step(
        "model",
        "Reviewing voice and register with Claude",
        "done",
        `${modelFindings.length} ${modelFindings.length === 1 ? "finding" : "findings"}`,
      );
    } else {
      modelUnavailable = true;
      log.warn({ raw: raw.slice(0, 200) }, "brand guardian: unusable model verdict");
      step("model", "Reviewing voice and register with Claude", "done", "Review unavailable");
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    modelUnavailable = true;
    log.warn({ err }, "brand guardian: model review failed; deterministic verdict only");
    step("model", "Reviewing voice and register with Claude", "done", "Review unavailable");
  }

  // 4. Compose the verdict.
  step("verdict", "Composing the verdict", "active");
  const findings = [...deterministic.findings, ...modelFindings].sort(
    (a, b) => (a.location?.start ?? Number.MAX_SAFE_INTEGER) -
      (b.location?.start ?? Number.MAX_SAFE_INTEGER),
  );
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const status = errorCount > 0 ? "block" : "pass";

  let summary: string;
  if (modelSummary && !modelUnavailable) {
    summary = modelSummary;
  } else {
    summary = `${deterministic.summary} Model review unavailable — deterministic rules only.`;
  }

  step("verdict", "Composing the verdict", "done", null);
  return { status, summary, findings };
}
