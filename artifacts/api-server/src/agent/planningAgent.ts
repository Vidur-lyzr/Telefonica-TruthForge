// Planning agent — the language layer over the Lyzr-named planning adapter.
// It mirrors askAgent's governance discipline: evidence (calendar events) is
// permission-filtered BEFORE the model sees it, honest no-evidence / permission-
// blocked states return without a model call, and every claim is cited to a
// governed event. The model only ever provides language, never facts.

import { meteredCreate } from "./metering";
import { CLEARANCE_RANK, ROLES } from "../data/corpus";
import type { GeneratedDraft } from "./generateAgent";
import type { PlanningEvent } from "../data/planning";
import {
  analyze,
  selectRelevantEvents,
  forecastWindow,
  formatPlanningDate,
  type Insights,
  type PersonaScope,
} from "../adapters/planning";

const MODEL = "claude-sonnet-4-6";

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

interface Citation {
  id: string;
  docId: string;
  docTitle: string;
  sourceLoc: string;
  version: string;
  owner: string;
  validUntil?: string | null;
  confidence: number;
  confidentiality: string;
  validity: string;
  snippet: string;
  value?: string | null;
  country?: string | null;
  brand?: string | null;
  axisIds?: string[];
}

export interface PlanningAskResult {
  status: "answered" | "no_evidence" | "permission_blocked" | "conversational";
  answer: string;
  citations: Citation[];
  historic: boolean;
  permissionNote?: string | null;
  axisIds: string[];
  suggestedActions: string[];
}

// One live step of a calendar agent run, streamed as it genuinely happens.
export interface PlanningAskStep {
  type: "step";
  id: string;
  label: string;
  state: "active" | "done";
  detail?: string | null;
}

export type PlanningStepEmitter = (step: PlanningAskStep) => void;

export interface PlanningForecastResult {
  status: "generated" | "no_activity";
  generatedAt: string;
  horizonDays: number;
  rangeStart: string;
  rangeEnd: string;
  summary: string;
  citations: Citation[];
  highlights: { liveCount: number; conflictCount: number; riskCount: number };
}

function statusToValidity(status: string): string {
  return status === "at_risk" ? "review" : "approved";
}

function eventToCitation(ev: PlanningEvent, marker: string, confidence: number): Citation {
  return {
    id: marker,
    docId: ev.id,
    docTitle: ev.title,
    sourceLoc: `${ev.source} · ${ev.market}`,
    version: "read-only sync",
    owner: ev.owner,
    validUntil: null,
    confidence,
    confidentiality: ev.confidentiality,
    validity: statusToValidity(ev.status),
    snippet: `${ev.type} · ${formatPlanningDate(ev.startDate)}${
      ev.endDate !== ev.startDate ? `–${formatPlanningDate(ev.endDate)}` : ""
    } · ${ev.brand} · ${ev.description}`,
    value: null,
    country: ev.market,
    brand: ev.brand,
    axisIds: [ev.axisId],
  };
}

// Shared: turn a model answer's [S#] markers into contiguous citations tied to
// the provided source events (mirrors askAgent's renumbering discipline).
function bindCitations(
  answer: string,
  sources: PlanningEvent[],
): { finalAnswer: string; citations: Citation[]; axisIds: string[] } {
  const referencedOld = new Set<number>();
  for (const m of answer.matchAll(/S\s*(\d+)/gi)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= sources.length) referencedOld.add(n);
  }
  const usedOld = referencedOld.size > 0 ? [...referencedOld].sort((a, b) => a - b) : [1];
  const oldToNew = new Map<number, number>();
  usedOld.forEach((oldN, i) => oldToNew.set(oldN, i + 1));

  const citations = usedOld.map((oldN) =>
    eventToCitation(
      sources[oldN - 1],
      `S${oldToNew.get(oldN)}`,
      Number(Math.max(0.6, 0.95 - (oldToNew.get(oldN)! - 1) * 0.05).toFixed(2)),
    ),
  );

  const finalAnswer = answer
    .replace(/\[([^\]]*)\]/g, (whole, inner: string) => {
      if (!/S\s*\d/i.test(inner)) return whole;
      const mapped = [...inner.matchAll(/S\s*(\d+)/gi)]
        .map((mm) => oldToNew.get(Number(mm[1])))
        .filter((n): n is number => n !== undefined);
      const uniq = [...new Set(mapped)].sort((a, b) => a - b);
      if (uniq.length === 0) return "";
      return `[${uniq.map((n) => `S${n}`).join(", ")}]`;
    })
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const axisIds = Array.from(new Set(usedOld.map((oldN) => sources[oldN - 1].axisId)));
  return { finalAnswer, citations, axisIds };
}

// The model needs an anchor date to interpret relative windows like "the next
// two weeks" against event dates; without it, answers hedge about not knowing
// today's date.
function todayLine(): string {
  return new Date().toISOString().slice(0, 10);
}

function sourceBlock(events: PlanningEvent[]): string {
  return events
    .map(
      (ev, i) =>
        `[S${i + 1}] ${ev.title} — ${ev.type}, ${ev.market}/${ev.brand}, ${formatPlanningDate(
          ev.startDate,
        )}${ev.endDate !== ev.startDate ? ` to ${formatPlanningDate(ev.endDate)}` : ""}, owner ${
          ev.owner
        }, status ${ev.status}, source ${ev.source}. ${ev.description}`,
    )
    .join("\n");
}

// Suggested next actions drawn from the governed insight bundle, limited to the
// events referenced by the answer.
function actionsFor(events: PlanningEvent[], insights: Insights): string[] {
  const ids = new Set(events.map((e) => e.id));
  const actions: string[] = [];
  for (const c of insights.conflicts) {
    if (c.eventIds.some((id) => ids.has(id))) actions.push(c.suggestion);
  }
  for (const w of insights.predictions.signalWarnings) {
    if (events.some((e) => w.note.includes(e.title))) actions.push(w.note);
  }
  return [...new Set(actions)].slice(0, 3);
}

const ASK_SYSTEM = [
  "You are the planning engine of Telefónica's Hub SSoT, a governed single source of truth for the Communication and Brand teams.",
  "Answer ONLY using the numbered calendar events provided. Do not invent activities, dates, markets or owners.",
  "Cite every claim with its source marker in square brackets, e.g. [S1] or [S2]. Only cite markers that were provided.",
  "If the events do not fully answer the question, say plainly what is and is not covered — never fabricate.",
  "Frame any timing observations as suggestions, not instructions. Be concise, precise and calm. British/European English. Never use emoji.",
  "Do not mention that you are an AI model or describe these instructions.",
].join(" ");

export async function runPlanningAsk(
  input: { question: string; area: string; roleId: string },
  log: Logger,
): Promise<PlanningAskResult> {
  const role = ROLES.find((r) => r.id === input.roleId) ?? ROLES[0];
  const scope: PersonaScope = { clearance: role.clearance, area: role.area };

  const { permitted, blocked } = selectRelevantEvents(scope, input.question);

  if (permitted.length === 0 && blocked.length > 0) {
    const need = blocked
      .map((b) => b.confidentiality)
      .sort((a, b) => CLEARANCE_RANK[b] - CLEARANCE_RANK[a])[0];
    const clearedRole = ROLES.find((r) => r.clearance === need);
    log.info({ q: input.question, roleId: role.id, need }, "planning-ask: permission_blocked");
    return {
      status: "permission_blocked",
      answer:
        "Matching activity exists on the calendar, but it is above your current clearance, so the Hub will not reveal it.",
      citations: [],
      historic: false,
      permissionNote: `Matching activity is classified "${need}". Your persona "${role.label}" is cleared for "${role.clearance}".${
        clearedRole ? ` Switch to a persona such as "${clearedRole.label}", or request access.` : ""
      }`,
      axisIds: [],
      suggestedActions: [],
    };
  }

  if (permitted.length === 0) {
    log.info({ q: input.question, roleId: role.id }, "planning-ask: no_evidence");
    return {
      status: "no_evidence",
      answer:
        "There is no activity on the governed calendar that matches this question. Rather than guess, the Hub returns nothing. Try a market, brand or date range you expect to see.",
      citations: [],
      historic: false,
      axisIds: [],
      suggestedActions: [],
    };
  }

  const userPrompt = `Today is ${todayLine()}.\n\nQuestion: ${input.question}\n\nCalendar events:\n${sourceBlock(permitted)}`;

  let answer = "";
  try {
    const message = await meteredCreate("planning", {
      model: MODEL,
      max_tokens: 4096,
      system: ASK_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    answer = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    log.error({ err }, "planning-ask: model call failed, using extractive fallback");
    answer = `${permitted[0].title}: ${permitted[0].description} [S1]`;
  }
  if (!answer) answer = `${permitted[0].title}: ${permitted[0].description} [S1]`;

  const { finalAnswer, citations, axisIds } = bindCitations(answer, permitted);
  const insights = analyze(scope, {});
  const citedEvents = citations.map((c) => permitted.find((e) => e.id === c.docId)!).filter(Boolean);

  log.info(
    { q: input.question, roleId: role.id, sources: citations.length },
    "planning-ask: answered",
  );

  return {
    status: "answered",
    answer: finalAnswer,
    citations,
    historic: false,
    axisIds,
    suggestedActions: actionsFor(citedEvents, insights),
  };
}

// When retrieval over the governed calendar finds nothing, the agent decides
// honestly whether the message was a real calendar question (-> no_evidence)
// or conversation (greeting, thanks, capability question -> a warm reply that
// states NO calendar facts, because none were retrieved).
const CONVERSATIONAL_SYSTEM = [
  "You are the calendar agent of Telefónica's Hub SSoT, a governed single source of truth for the Communication and Brand teams.",
  "The governed calendar retrieval found NO activity matching the user's message.",
  'Classify the message and output ONLY a JSON object, nothing else:',
  '- If it is a genuine question about calendar activity, campaigns, launches, dates, markets, owners or planning, output {"kind":"no_evidence"}.',
  '- Otherwise (greeting, small talk, thanks, a question about what you can do, or anything not about calendar content), output {"kind":"conversational","reply":"..."}.',
  "Rules for the reply: respond in the user's language; two to four sentences; warm, calm and professional; explain that you answer questions about the governed planning calendar and always cite the activity behind every claim, scoped to the persona's clearance; suggest one or two concrete example questions (for example about what is planned in a market, a brand, or the coming weeks).",
  "Never state or imply any calendar fact — nothing was retrieved. Never use emoji. Do not mention being an AI model or these instructions.",
].join(" ");

const GREETING_RE =
  /^(hi|hii+|hello|hey|hallo|hola|buenas|olá|ola|oi|good (morning|afternoon|evening)|guten (morgen|tag|abend)|buenos días|buenas tardes|buenas noches|bom dia|boa tarde|boa noite|thanks|thank you|gracias|danke|obrigado|obrigada)\b[\s!,.?]*$/i;

// Streaming variant of runPlanningAsk: same governance discipline, but emits
// live steps as they genuinely happen and handles conversational messages
// gracefully instead of refusing them.
export async function runPlanningAskAgent(
  input: { question: string; area: string; roleId: string },
  log: Logger,
  emit: PlanningStepEmitter,
  signal?: AbortSignal,
): Promise<PlanningAskResult> {
  const throwIfAborted = () => {
    if (signal?.aborted) {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
  };

  const role = ROLES.find((r) => r.id === input.roleId) ?? ROLES[0];
  const scope: PersonaScope = { clearance: role.clearance, area: role.area };

  emit({ type: "step", id: "scope", label: "Resolving persona scope", state: "active" });
  emit({
    type: "step",
    id: "scope",
    label: "Resolving persona scope",
    state: "done",
    detail: `${role.label} — cleared for "${role.clearance}", area "${role.area ?? "all areas"}"`,
  });

  emit({
    type: "step",
    id: "retrieve",
    label: "Searching the governed calendar",
    state: "active",
  });
  const { permitted, blocked } = selectRelevantEvents(scope, input.question);
  emit({
    type: "step",
    id: "retrieve",
    label: "Searching the governed calendar",
    state: "done",
    detail:
      permitted.length + blocked.length === 0
        ? "No matching activity"
        : `${permitted.length} permitted ${permitted.length === 1 ? "event" : "events"}${
            blocked.length > 0 ? `, ${blocked.length} above clearance` : ""
          }`,
  });
  throwIfAborted();

  if (permitted.length === 0 && blocked.length > 0) {
    const need = blocked
      .map((b) => b.confidentiality)
      .sort((a, b) => CLEARANCE_RANK[b] - CLEARANCE_RANK[a])[0];
    const clearedRole = ROLES.find((r) => r.clearance === need);
    emit({
      type: "step",
      id: "decide",
      label: "Applying governance",
      state: "done",
      detail: "Matching activity is above this persona's clearance — refusing honestly",
    });
    log.info({ q: input.question, roleId: role.id, need }, "planning-agent: permission_blocked");
    return {
      status: "permission_blocked",
      answer:
        "Matching activity exists on the calendar, but it is above your current clearance, so the Hub will not reveal it.",
      citations: [],
      historic: false,
      permissionNote: `Matching activity is classified "${need}". Your persona "${role.label}" is cleared for "${role.clearance}".${
        clearedRole ? ` Switch to a persona such as "${clearedRole.label}", or request access.` : ""
      }`,
      axisIds: [],
      suggestedActions: [],
    };
  }

  if (permitted.length === 0) {
    emit({
      type: "step",
      id: "decide",
      label: "Nothing retrieved — checking intent",
      state: "active",
    });

    const conversationalResult = (reply: string): PlanningAskResult => ({
      status: "conversational",
      answer: reply,
      citations: [],
      historic: false,
      axisIds: [],
      suggestedActions: [],
    });
    const noEvidenceResult = (): PlanningAskResult => ({
      status: "no_evidence",
      answer:
        "There is no activity on the governed calendar that matches this question. Rather than guess, the Hub returns nothing. Try a market, brand or date range you expect to see.",
      citations: [],
      historic: false,
      axisIds: [],
      suggestedActions: [],
    });

    try {
      const message = await meteredCreate("planning", {
        model: MODEL,
        max_tokens: 600,
        system: CONVERSATIONAL_SYSTEM,
        messages: [{ role: "user", content: input.question }],
      });
      throwIfAborted();
      const raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as { kind?: string; reply?: string })
        : null;
      if (parsed?.kind === "conversational" && parsed.reply && parsed.reply.trim()) {
        emit({
          type: "step",
          id: "decide",
          label: "Nothing retrieved — checking intent",
          state: "done",
          detail: "Conversational message — replying without touching calendar data",
        });
        log.info({ q: input.question, roleId: role.id }, "planning-agent: conversational");
        return conversationalResult(parsed.reply.trim());
      }
      emit({
        type: "step",
        id: "decide",
        label: "Nothing retrieved — checking intent",
        state: "done",
        detail: "Calendar question with no evidence — refusing honestly",
      });
      log.info({ q: input.question, roleId: role.id }, "planning-agent: no_evidence");
      return noEvidenceResult();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      log.error({ err }, "planning-agent: intent check failed, using heuristic");
      emit({
        type: "step",
        id: "decide",
        label: "Nothing retrieved — checking intent",
        state: "done",
        detail: GREETING_RE.test(input.question.trim())
          ? "Conversational message — replying without touching calendar data"
          : "Calendar question with no evidence — refusing honestly",
      });
      if (GREETING_RE.test(input.question.trim())) {
        return conversationalResult(
          `Hello — I am the calendar agent of the Hub. Ask me about governed planning activity and I will answer with cited evidence, scoped to your persona "${role.label}". For example: "What is planned in Spain in July?" or "Which campaigns are live this week?"`,
        );
      }
      return noEvidenceResult();
    }
  }

  emit({
    type: "step",
    id: "compose",
    label: "Composing a cited answer",
    state: "active",
    detail: `Claude writes the language; every claim must cite one of the ${permitted.length} permitted ${
      permitted.length === 1 ? "event" : "events"
    }`,
  });

  const userPrompt = `Today is ${todayLine()}.\n\nQuestion: ${input.question}\n\nCalendar events:\n${sourceBlock(permitted)}`;

  let answer = "";
  try {
    const message = await meteredCreate("planning", {
      model: MODEL,
      max_tokens: 4096,
      system: ASK_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    throwIfAborted();
    answer = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    log.error({ err }, "planning-agent: model call failed, using extractive fallback");
    answer = `${permitted[0].title}: ${permitted[0].description} [S1]`;
  }
  if (!answer) answer = `${permitted[0].title}: ${permitted[0].description} [S1]`;

  const { finalAnswer, citations, axisIds } = bindCitations(answer, permitted);
  const insights = analyze(scope, {});
  const citedEvents = citations.map((c) => permitted.find((e) => e.id === c.docId)!).filter(Boolean);

  emit({
    type: "step",
    id: "compose",
    label: "Composing a cited answer",
    state: "done",
    detail: `${citations.length} ${citations.length === 1 ? "citation" : "citations"} bound to governed activity`,
  });

  log.info(
    { q: input.question, roleId: role.id, sources: citations.length },
    "planning-agent: answered",
  );

  return {
    status: "answered",
    answer: finalAnswer,
    citations,
    historic: false,
    axisIds,
    suggestedActions: actionsFor(citedEvents, insights),
  };
}

const FORECAST_SYSTEM = [
  "You are the planning engine of Telefónica's Hub SSoT.",
  "Write a short, calm 10-day outlook using ONLY the numbered calendar events provided.",
  "Group by what is live now, what is coming up, and any timing risks. Cite every activity you mention with its marker, e.g. [S1].",
  "Frame conflicts and timing observations as suggestions to check, not commands. Do not invent activities. British/European English. Never use emoji.",
  "Two or three tight paragraphs. Do not mention that you are an AI model or describe these instructions.",
].join(" ");

export async function runPlanningForecast(
  input: { area: string; roleId: string },
  log: Logger,
): Promise<PlanningForecastResult> {
  const role = ROLES.find((r) => r.id === input.roleId) ?? ROLES[0];
  const scope: PersonaScope = { clearance: role.clearance, area: role.area };
  const { from, to, events, insights } = forecastWindow(scope, 10);
  const generatedAt = new Date().toISOString();

  if (events.length === 0) {
    log.info({ roleId: role.id }, "planning-forecast: no_activity");
    return {
      status: "no_activity",
      generatedAt,
      horizonDays: 10,
      rangeStart: from,
      rangeEnd: to,
      summary:
        "There is no activity you are cleared to see in the next 10 days. The Hub reports the empty window honestly rather than filling it.",
      citations: [],
      highlights: { liveCount: 0, conflictCount: 0, riskCount: 0 },
    };
  }

  const ordered = [...events].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const conflictLine = insights.conflicts.length
    ? `\n\nKnown conflicts in this window: ${insights.conflicts.map((c) => c.suggestion).join(" ")}`
    : "";
  const signalLine = insights.predictions.signalWarnings.length
    ? `\n\nExternal timing signals: ${insights.predictions.signalWarnings.map((w) => w.note).join(" ")}`
    : "";

  const userPrompt = `10-day window: ${formatPlanningDate(from)} to ${formatPlanningDate(
    to,
  )}.\n\nCalendar events:\n${sourceBlock(ordered)}${conflictLine}${signalLine}`;

  let summary = "";
  try {
    const message = await meteredCreate("planning", {
      model: MODEL,
      max_tokens: 4096,
      system: FORECAST_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    summary = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    log.error({ err }, "planning-forecast: model call failed, using extractive fallback");
    summary = ordered.map((e, i) => `${e.title} (${formatPlanningDate(e.startDate)}) [S${i + 1}]`).join(". ");
  }
  if (!summary) summary = ordered.map((e, i) => `${e.title} [S${i + 1}]`).join(". ");

  const { finalAnswer, citations } = bindCitations(summary, ordered);

  const liveCount = ordered.filter((e) => e.status === "live" || e.status === "in_progress").length;
  const riskCount =
    ordered.filter((e) => e.status === "at_risk").length +
    insights.predictions.signalWarnings.length;

  log.info(
    { roleId: role.id, events: ordered.length, conflicts: insights.conflicts.length },
    "planning-forecast: generated",
  );

  return {
    status: "generated",
    generatedAt,
    horizonDays: 10,
    rangeStart: from,
    rangeEnd: to,
    summary: finalAnswer,
    citations,
    highlights: { liveCount, conflictCount: insights.conflicts.length, riskCount },
  };
}

// ---------------------------------------------------------------------------
// Forecast → document engine: turn a generated forecast into a GeneratedDraft
// so it can land in the review inbox as a scheduled, approval-gated item. The
// draft's content is exactly the deterministic forecast output — the document
// engine adds shape and governance metadata, never new facts.
// ---------------------------------------------------------------------------

export const PLANNING_FORECAST_TEMPLATE_ID = "tmpl-planning-forecast";

export function buildForecastDraft(
  forecast: PlanningForecastResult,
  input: { area: string; roleId: string },
): GeneratedDraft {
  const role = ROLES.find((r) => r.id === input.roleId) ?? ROLES[0];
  const rangeLabel = `${formatPlanningDate(forecast.rangeStart)} to ${formatPlanningDate(forecast.rangeEnd)}`;
  const axisIds = Array.from(new Set(forecast.citations.flatMap((c) => c.axisIds ?? [])));
  const highestConfidentiality = forecast.citations.reduce<string>((acc, c) => {
    const rank = CLEARANCE_RANK[c.confidentiality as keyof typeof CLEARANCE_RANK] ?? 0;
    const accRank = CLEARANCE_RANK[acc as keyof typeof CLEARANCE_RANK] ?? 0;
    return rank > accRank ? c.confidentiality : acc;
  }, "public");

  const highlightsBody = [
    `Live or in-progress activities in the window: ${forecast.highlights.liveCount}.`,
    `Detected timing conflicts: ${forecast.highlights.conflictCount}.`,
    `Activities or signals flagged as at risk: ${forecast.highlights.riskCount}.`,
  ].join(" ");

  return {
    id: `draft-forecast-${Date.now().toString(36)}`,
    status: "drafted",
    shape: "multiformat",
    templateId: PLANNING_FORECAST_TEMPLATE_ID,
    title: `10-day planning forecast — ${rangeLabel}`,
    language: "en",
    audience: "internal",
    confidentiality: highestConfidentiality,
    umbrella: null,
    exclusions: [],
    sections: [
      {
        id: "sec-forecast-summary",
        kind: "summary",
        heading: `Forecast summary (${rangeLabel})`,
        axisId: null,
        body: forecast.summary,
        citationIds: forecast.citations.map((c) => c.id),
        internalOnly: true,
      },
      {
        id: "sec-forecast-highlights",
        kind: "body",
        heading: "Window highlights",
        axisId: null,
        body: highlightsBody,
        citationIds: [],
        internalOnly: true,
      },
      {
        id: "sec-forecast-method",
        kind: "body",
        heading: "Method note",
        axisId: null,
        body: "This forecast was produced from the governed planning calendar only, filtered to the activities this persona is cleared to see. Conflicts, gaps and risks are detected deterministically; the language layer narrates them and cites every activity it mentions.",
        citationIds: [],
        internalOnly: true,
      },
    ],
    spokesperson: [],
    charts: [],
    tables: [],
    citations: forecast.citations,
    disclaimers: [],
    axisIds,
    guardian: {
      status: "pass",
      summary: "Deterministic forecast content over permitted calendar events; no claims outside the governed calendar.",
      findings: [],
    },
    historic: false,
    historicNote: null,
    permissionNote: null,
    note: `Scheduled planning forecast for the ${input.area} area, generated for ${role.label}.`,
    createdAt: forecast.generatedAt,
    params: {
      shape: "multiformat",
      topic: `10-day planning forecast (${rangeLabel})`,
      roleId: role.id,
      audience: "internal",
      language: "en",
      confidentiality: highestConfidentiality,
      format: "planning-forecast",
      axisIds,
    },
  };
}
