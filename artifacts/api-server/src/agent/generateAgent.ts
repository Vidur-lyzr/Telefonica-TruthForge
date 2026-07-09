// Generate agent — the one engine behind the three document shapes
// (messaging, press + Q&A, multi-format). It reuses the Ask governance model:
//
//  - Retrieval is permission-filtered BEFORE the model sees any chunk.
//  - An AUDIENCE gate is applied on top: choosing an external audience caps the
//    accessible set to public material BEFORE retrieval, so confidential /
//    internal / off-the-record chunks can never reach an external output,
//    regardless of the persona's clearance.
//  - Spokesperson / internal-only guidance is retrieved under the PERSONA's
//    clearance (not the audience gate) and is always flagged internalOnly, so it
//    supports the drafter but is stripped from any external release/export.
//  - If nothing relevant is permitted we return an honest no_evidence /
//    permission_blocked state WITHOUT calling the model. We never fabricate.

import { meteredCreate } from "./metering";
import { retrieve, resolveDoc } from "../adapters/kb";
import { listKpis, type KpiCard } from "../adapters/kpi";
import { queryAll as numericQueryAll, querySeries } from "../adapters/numeric";
import {
  CLEARANCE_RANK,
  ROLES,
  AXES,
  type Clearance,
} from "../data/corpus";
import {
  getTemplate,
  getDisclaimer,
  APPROVED_QUOTES,
  BOILERPLATES,
  PRESS_CONTACT,
  type DocShape,
} from "../data/assets";
import { runBrandGuardian } from "./brandGuardian";

const MODEL = "claude-sonnet-4-6";
const COVERAGE_MIN = 0.33;
const MAX_SOURCES = 6;
const GUIDANCE_TYPES = new Set(["Note", "Playbook", "Guideline"]);

export type GenStatus = "drafted" | "no_evidence" | "permission_blocked";
export type Audience = "internal" | "external";

export interface DraftCitation {
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

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartSpec {
  id: string;
  title: string;
  type: "bar" | "line";
  unit: string;
  source: string;
  citationId?: string | null;
  points: ChartPoint[];
}

export interface SpokespersonNote {
  question: string;
  guidance: string;
  doNotSay?: string | null;
}

// A source the dual filter kept away from the model, surfaced honestly so the
// user can see WHAT was excluded and WHY. Titles are only revealed when the
// persona itself is cleared to read the document (destination exclusions);
// clearance exclusions never leak a title — only the classification.
export interface DraftExclusion {
  reason: "clearance" | "destination";
  docTitle: string | null;
  confidentiality: string;
  note: string;
}

export interface DraftSection {
  id: string;
  kind: string;
  heading: string;
  axisId?: string | null;
  body: string;
  citationIds: string[];
  internalOnly: boolean;
}

export interface DraftDisclaimer {
  id: string;
  name: string;
  text: string;
}

export interface GuardianLocation {
  start: number;
  end: number;
}

export interface GuardianFinding {
  severity: "error" | "warning";
  rule: string;
  message: string;
  suggestion?: string | null;
  // Character span in the checked text (live Brand Room checker). The export
  // gate operates on a composed draft rather than raw prose and omits it.
  location?: GuardianLocation | null;
}

export interface GuardianResult {
  status: "pass" | "block";
  summary: string;
  findings: GuardianFinding[];
}

export interface DraftParams {
  shape: DocShape;
  topic: string;
  roleId: string;
  audience: Audience;
  language: string;
  confidentiality: string;
  format: string;
  axisIds: string[];
  spokesperson?: string | null;
  eventDate?: string | null;
}

export interface GeneratedDraft {
  id: string;
  status: GenStatus;
  shape: DocShape;
  templateId: string;
  title: string;
  language: string;
  audience: Audience;
  confidentiality: string;
  umbrella?: string | null;
  exclusions: DraftExclusion[];
  sections: DraftSection[];
  spokesperson: SpokespersonNote[];
  charts: ChartSpec[];
  citations: DraftCitation[];
  disclaimers: DraftDisclaimer[];
  axisIds: string[];
  guardian: GuardianResult;
  historic: boolean;
  historicNote?: string | null;
  permissionNote?: string | null;
  note?: string | null;
  createdAt: string;
  params: DraftParams;
  // Provenance for the scheduled human-approval gate. A draft produced by a
  // schedule is origin "scheduled" and cannot be exported or versioned until the
  // owner approves it in the review inbox (approved = true, set only there).
  origin?: "manual" | "scheduled";
  reviewItemId?: string | null;
  approved?: boolean;
  // Risk state carried over from an Ask answer handoff. `historic` is
  // re-derived server-side from the re-validated handoff sources' validity;
  // conflict / low-confidence are the Ask engine's own labels, persisted so
  // the provenance stays visible all the way to export (and mirrored as Brand
  // Guardian advisories).
  askSignals?: AskSignals | null;
}

export interface AskSignals {
  question: string;
  conflict: boolean;
  lowConfidence: boolean;
  historic: boolean;
  note?: string | null;
}

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

export interface GenerateInput {
  shape: DocShape;
  topic: string;
  roleId: string;
  audience: Audience;
  language?: string;
  confidentiality?: string;
  format?: string;
  axisIds?: string[];
  spokesperson?: string | null;
  eventDate?: string | null;
  // Governed source/query presets (used by scheduled definitions). These are
  // added to the retrieval query so a recurring document always pulls from the
  // same governed material, not just the free-text topic. They never bypass the
  // permission filter — retrieved chunks are still clearance-gated.
  sourceQueries?: string[];
  // Structured KPI panel handoff from the KPIs page. Only the FILTERS travel:
  // every figure is recomputed server-side under the persona's clearance
  // (fail closed), so a tampered client payload can never smuggle numbers in.
  kpiContext?: KpiReportContext | null;
  // Structured Ask answer handoff from the Ask page. Only the question, the
  // cited document IDS and honest status flags travel — never snippets or
  // answer text. Every cited doc is re-derived from the server corpus under
  // the CURRENT persona's clearance AND the destination gate (fail closed),
  // so a stale or tampered payload can never surface content the persona
  // could not retrieve itself.
  askContext?: AskHandoffContext | null;
}

export interface AskHandoffContext {
  question: string;
  citedDocIds: string[];
  status?: string | null;
  historic?: boolean | null;
  lowConfidence?: boolean | null;
}

export interface KpiReportContext {
  period: string;
  area: string;
  axisId?: string | null;
  market?: string | null;
  brand?: string | null;
  source?: string | null;
  initiativeType?: string | null;
  objectiveId?: string | null;
}

export interface RefineInput {
  draft: GeneratedDraft;
  instruction: string;
  roleId: string;
  // Optional passage of the draft the instruction targets (selection-to-chat).
  selection?: string | null;
}

function confidenceFor(score: number, topScore: number): number {
  if (topScore <= 0) return 0.5;
  const rel = score / topScore;
  return Number(Math.min(0.98, Math.max(0.5, 0.55 + rel * 0.43)).toFixed(2));
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// Extract the first balanced JSON object from a model response.
function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function languageName(code: string): string {
  const map: Record<string, string> = {
    en: "British / European English",
    es: "Spanish (español)",
    pt: "Portuguese (português)",
    de: "German (Deutsch)",
  };
  return map[code] ?? "British / European English";
}

// Observable phases the compose pipeline actually moves through, emitted as they
// happen so the client can watch real backend progress (not a timer simulation).
export type GenerationStage = "retrieving" | "composing" | "guardian" | "done";
export type StageReporter = (stage: GenerationStage) => void;

interface ComposeContext {
  input: GenerateInput;
  instruction?: string;
  baseDraft?: GeneratedDraft;
  onStage?: StageReporter;
}

// Shared compose used by both fresh generation and refine.
async function compose(
  ctx: ComposeContext,
  log: Logger,
): Promise<GeneratedDraft> {
  const { input, instruction, baseDraft, onStage } = ctx;
  const role = ROLES.find((r) => r.id === input.roleId) ?? ROLES[0];
  const clearance: Clearance = role.clearance;
  const audience: Audience = input.audience;
  const language = input.language ?? "en";
  const confidentiality = input.confidentiality ?? (audience === "external" ? "public" : "internal");
  const format = input.format ?? "document";
  const shape = input.shape;
  const template = getTemplate(shape);
  const templateId = template?.id ?? "tmpl-multiformat";

  // Dual filter: the model may only see material that BOTH the persona is
  // cleared to read AND the destination may carry. External audiences are
  // additionally capped to public regardless of the declared destination.
  const destRank =
    CLEARANCE_RANK[confidentiality as Clearance] ?? CLEARANCE_RANK[clearance];
  const bodyRank = Math.min(
    CLEARANCE_RANK[clearance],
    destRank,
    audience === "external" ? CLEARANCE_RANK.public : CLEARANCE_RANK[clearance],
  );
  const bodyClearance: Clearance =
    (Object.entries(CLEARANCE_RANK).find(([, r]) => r === bodyRank)?.[0] as
      | Clearance
      | undefined) ?? "public";

  const axisNames = (input.axisIds ?? [])
    .map((id) => AXES.find((a) => a.id === id)?.name ?? "")
    .filter(Boolean)
    .join(" ");
  const sourceQueryText = (input.sourceQueries ?? []).filter(Boolean).join(" ");

  // ---- Structured KPI panel context (recomputed server-side, fail closed) ----
  // The client hands over FILTERS only. Figures are recomputed here under the
  // DUAL-FILTERED clearance (persona AND destination/audience gate) via the
  // same visibility rules as the KPIs page, so the draft can only ever carry
  // KPI numbers that both the persona may see and the destination may carry.
  let kpiCards: KpiCard[] = [];
  const kc = input.kpiContext ?? null;
  if (kc) {
    try {
      kpiCards = listKpis({
        clearance: bodyClearance,
        area: kc.area as Parameters<typeof listKpis>[0]["area"],
        period: (["week", "month", "quarter"].includes(kc.period)
          ? kc.period
          : "month") as Parameters<typeof listKpis>[0]["period"],
        axisId: kc.axisId ?? undefined,
        market: kc.market ?? undefined,
        brand: kc.brand ?? undefined,
        source: kc.source ?? undefined,
        initiativeType: kc.initiativeType ?? undefined,
        objectiveId: kc.objectiveId ?? undefined,
      }).kpis;
    } catch (err) {
      log.warn({ err }, "generate: kpi context could not be recomputed; ignoring");
      kpiCards = [];
    }
  }
  const kpiQueryText = kpiCards.map((k) => k.name).join(" ");

  // ---- Ask answer handoff (re-validated server-side, fail closed) -----------
  // Only doc IDS travel. Each is re-resolved against the server corpus and
  // re-gated under BOTH the persona's clearance and the destination rank; a
  // docId the current persona could not read (or the destination cannot carry)
  // is dropped and honestly surfaced as an exclusion below. Unknown docIds are
  // dropped silently (fail closed).
  const ac = input.askContext ?? null;
  const askDocIds = new Set<string>();
  const askExclusions: { docId: string; ex: DraftExclusion }[] = [];
  if (ac) {
    for (const docId of [...new Set(ac.citedDocIds)]) {
      const doc = resolveDoc(docId);
      if (!doc) continue;
      const docRank = CLEARANCE_RANK[doc.confidentiality as Clearance] ?? CLEARANCE_RANK.off_the_record;
      if (docRank > CLEARANCE_RANK[clearance]) {
        // Above the CURRENT persona's clearance (e.g. persona switched between
        // pages): never reveal the title, only the classification.
        askExclusions.push({
          docId,
          ex: {
            reason: "clearance",
            docTitle: null,
            confidentiality: doc.confidentiality,
            note: `A source cited by the Ask answer, classified "${doc.confidentiality}", was excluded: it is above your clearance ("${clearance}").`,
          },
        });
      } else if (docRank > bodyRank) {
        askExclusions.push({
          docId,
          ex: {
            reason: "destination",
            docTitle: doc.title,
            confidentiality: doc.confidentiality,
            note:
              audience === "external"
                ? `"${doc.title}" (${doc.confidentiality}), cited by the Ask answer, was excluded: an external destination may only carry public material.`
                : `"${doc.title}" (${doc.confidentiality}), cited by the Ask answer, was excluded: it is above the destination confidentiality ("${bodyClearance}").`,
          },
        });
      } else {
        askDocIds.add(docId);
      }
    }
  }
  const askQueryText = ac?.question?.trim() ?? "";

  // The instruction is deliberately NOT folded into the main retrieval query:
  // coverage is a ratio over query idf mass, so refine wording ("make this more
  // concise") would inflate the denominator and starve every chunk, flipping a
  // valid refine into no_evidence. Instead the instruction gets its own
  // retrieval pass below, gated by the same coverage threshold.
  const retrievalQuery = [input.topic, sourceQueryText, kpiQueryText, axisNames]
    .filter(Boolean)
    .join(" ");

  const now = new Date().toISOString();
  const params: DraftParams = {
    shape,
    topic: input.topic,
    roleId: role.id,
    audience,
    language,
    confidentiality,
    format,
    axisIds: input.axisIds ?? [],
    spokesperson: input.spokesperson ?? null,
    eventDate: input.eventDate ?? null,
  };

  const emptyGuardian: GuardianResult = {
    status: "pass",
    summary: "No draft to check.",
    findings: [],
  };

  // ---- Governed retrieval (body) --------------------------------------------
  // Retrieval runs at the PERSONA's clearance so we can explain honestly which
  // relevant sources the dual filter excluded. Nothing above the effective
  // (dual-filtered) rank ever reaches the model: permitted is re-capped below.
  onStage?.("retrieving");
  const retrieved = retrieve({ question: retrievalQuery, clearance, topK: 12 });
  if (askQueryText && askQueryText !== input.topic) {
    // Ask handoff: also retrieve for the original question itself (its own
    // coverage-gated pass, never folded into the main query — coverage is a
    // ratio, so mixing two texts would dilute both).
    const extra = retrieve({ question: askQueryText, clearance, topK: 8 });
    const seen = new Set(retrieved.map((c) => c.chunkId));
    for (const c of extra) {
      if (c.coverage >= COVERAGE_MIN && !seen.has(c.chunkId)) {
        seen.add(c.chunkId);
        retrieved.push(c);
      }
    }
  }
  if (instruction && baseDraft) {
    // Refine: also retrieve for the instruction itself (e.g. "add the dividend
    // figure") so newly requested material can enter, judged by its own
    // coverage against the instruction query alone.
    const extra = retrieve({ question: instruction, clearance, topK: 6 });
    const seen = new Set(retrieved.map((c) => c.chunkId));
    for (const c of extra) {
      if (c.coverage >= COVERAGE_MIN && !seen.has(c.chunkId)) {
        seen.add(c.chunkId);
        retrieved.push(c);
      }
    }
  }
  const relevant = retrieved.filter((c) => c.coverage >= COVERAGE_MIN);
  const personaPermitted = relevant.filter((c) => c.accessible);
  const blocked = relevant.filter((c) => !c.accessible);
  // Destination gate on top of the persona gate.
  const permitted = personaPermitted.filter(
    (c) =>
      CLEARANCE_RANK[resolveDoc(c.docId)?.confidentiality ?? "off_the_record"] <= bodyRank,
  );
  if (askDocIds.size > 0) {
    // Ask handoff: stable-prioritise chunks from the re-validated cited docs so
    // the draft is grounded in the same sources the answer cited. This only
    // reorders material that already passed BOTH gates above — it never adds
    // anything the persona/destination could not see.
    permitted.sort(
      (a, b) => Number(askDocIds.has(b.docId)) - Number(askDocIds.has(a.docId)),
    );
  }
  const destinationExcluded = personaPermitted.filter(
    (c) =>
      CLEARANCE_RANK[resolveDoc(c.docId)?.confidentiality ?? "off_the_record"] > bodyRank,
  );

  // Visible dual-filter explanation. Clearance exclusions never reveal a title
  // (the persona may not know the document exists); destination exclusions do,
  // because the persona could read the document — it is the destination that
  // cannot carry it.
  const exclusions: DraftExclusion[] = [];
  const seenClearance = new Set<string>();
  for (const b of blocked) {
    const doc = resolveDoc(b.docId);
    const conf = doc?.confidentiality ?? "off_the_record";
    if (seenClearance.has(b.docId)) continue;
    seenClearance.add(b.docId);
    exclusions.push({
      reason: "clearance",
      docTitle: null,
      confidentiality: conf,
      note: `A relevant source classified "${conf}" was excluded: it is above your clearance ("${clearance}").`,
    });
  }
  const seenDest = new Set<string>();
  for (const d of destinationExcluded) {
    const doc = resolveDoc(d.docId);
    if (seenDest.has(d.docId)) continue;
    seenDest.add(d.docId);
    const conf = doc?.confidentiality ?? "off_the_record";
    exclusions.push({
      reason: "destination",
      docTitle: doc?.title ?? d.docId,
      confidentiality: conf,
      note:
        audience === "external" && CLEARANCE_RANK[conf as Clearance] > CLEARANCE_RANK.public
          ? `"${doc?.title ?? d.docId}" (${conf}) was excluded: an external destination may only carry public material.`
          : `"${doc?.title ?? d.docId}" (${conf}) was excluded: it is above the destination confidentiality ("${bodyClearance}").`,
    });
  }
  // Ask-handoff sources the re-validation gate dropped, deduped against docs
  // retrieval already reported.
  for (const { docId, ex } of askExclusions) {
    const seen = ex.reason === "clearance" ? seenClearance : seenDest;
    if (seen.has(docId)) continue;
    seen.add(docId);
    exclusions.push(ex);
  }

  if (relevant.length === 0) {
    log.info({ topic: input.topic, roleId: role.id }, "generate: no_evidence");
    return {
      id: baseDraft?.id ?? newId("draft"),
      status: "no_evidence",
      shape,
      templateId,
      title: input.topic,
      language,
      audience,
      confidentiality,
      umbrella: null,
      exclusions,
      sections: [],
      spokesperson: [],
      charts: [],
      citations: [],
      disclaimers: [],
      axisIds: [],
      guardian: emptyGuardian,
      historic: false,
      note:
        "There is no approved, permitted source in the governed corpus for this brief. Rather than invent content, the engine has produced nothing. Broaden the topic, adjust the audience, or check the Data area for governed material.",
      createdAt: now,
      params,
    };
  }

  if (permitted.length === 0) {
    const need = [...blocked, ...destinationExcluded]
      .map((b) => resolveDoc(b.docId)?.confidentiality)
      .filter((c): c is Clearance => Boolean(c))
      .sort((a, b) => CLEARANCE_RANK[b] - CLEARANCE_RANK[a])[0];
    const reason =
      destinationExcluded.length > 0 && blocked.length === 0
        ? audience === "external"
          ? `The only relevant material is classified "${need}". For an external audience the engine restricts sources to public material, so this content cannot be used.`
          : `The only relevant material is classified "${need}", above the destination confidentiality "${bodyClearance}". Raise the destination confidentiality or choose different material.`
        : audience === "external"
          ? `The only relevant material is classified "${need}". For an external audience the engine restricts sources to public material, so this content cannot be used.`
          : `Relevant material exists but is classified "${need}", above your clearance "${clearance}".`;
    log.info(
      { topic: input.topic, roleId: role.id, audience, need },
      "generate: permission_blocked",
    );
    return {
      id: baseDraft?.id ?? newId("draft"),
      status: "permission_blocked",
      shape,
      templateId,
      title: input.topic,
      language,
      audience,
      confidentiality,
      umbrella: null,
      exclusions,
      sections: [],
      spokesperson: [],
      charts: [],
      citations: [],
      disclaimers: [],
      axisIds: [],
      guardian: emptyGuardian,
      historic: false,
      permissionNote: reason,
      createdAt: now,
      params,
    };
  }

  const sources = permitted.slice(0, MAX_SOURCES);
  const topScore = sources[0]?.score ?? 1;
  const docIndexByDoc = new Map<string, number>();
  sources.forEach((s, i) => {
    if (!docIndexByDoc.has(s.docId)) docIndexByDoc.set(s.docId, i + 1);
  });

  // ---- Numeric facts (citeable only when their doc is among the sources) -----
  const numericFacts = numericQueryAll(retrievalQuery).filter((f) =>
    docIndexByDoc.has(f.docId),
  );

  // ---- Charts from data (fail closed on doc access) --------------------------
  let series = querySeries(retrievalQuery).filter(
    (s) => CLEARANCE_RANK[resolveDoc(s.docId)?.confidentiality ?? "off_the_record"] <= bodyRank,
  );
  // Financial briefs get a revenue-trend chart by default when accessible.
  const looksFinancial = /result|revenue|financ|earnings|dividend|ebitda/i.test(
    retrievalQuery,
  );
  if (looksFinancial && !series.some((s) => s.id === "series-revenue-trend")) {
    const extra = querySeries("revenue trend").filter(
      (s) => CLEARANCE_RANK[resolveDoc(s.docId)?.confidentiality ?? "off_the_record"] <= bodyRank,
    );
    series = [...series, ...extra];
  }
  const charts: ChartSpec[] = series.slice(0, 2).map((s) => ({
    id: newId("chart"),
    title: s.label,
    type: s.id === "series-revenue-trend" ? "line" : "bar",
    unit: s.unit,
    source: s.source,
    citationId: docIndexByDoc.has(s.docId) ? `S${docIndexByDoc.get(s.docId)}` : null,
    points: s.points,
  }));

  // ---- Internal guidance (persona-gated, always internalOnly) ----------------
  let guidanceChunks: { tag: string; docTitle: string; text: string }[] = [];
  if (shape === "messaging" || shape === "press") {
    // Guidance is gated by the AUDIENCE-derived bodyClearance, NOT the raw
    // persona clearance: for an external audience this caps guidance to public
    // material so no confidential / internal / off-the-record chunk can reach
    // the model prompt, even indirectly via spokesperson notes.
    const gRetrieved = retrieve({
      question: `${retrievalQuery} spokesperson holding line do not confirm guidance`,
      clearance: bodyClearance,
      topK: 8,
    });
    guidanceChunks = gRetrieved
      .filter((c) => c.accessible)
      .filter((c) => GUIDANCE_TYPES.has(resolveDoc(c.docId)?.type ?? ""))
      .slice(0, 4)
      .map((c, i) => ({
        tag: `G${i + 1}`,
        docTitle: resolveDoc(c.docId)?.title ?? c.docId,
        text: c.text,
      }));
  }

  // ---- Assemble the model prompt --------------------------------------------
  const sourceBlock = sources
    .map((s, i) => {
      const doc = resolveDoc(s.docId);
      const facts = numericFacts
        .filter((f) => docIndexByDoc.get(f.docId) === i + 1)
        .map((f) => `${f.label} = ${f.value}${f.unit ? " " + f.unit : ""} (${f.period})`)
        .join("; ");
      return `[S${i + 1}] ${doc?.title ?? s.docId} — ${s.breadcrumb}\n${s.text}${
        facts ? `\nGoverned figures in this source: ${facts}` : ""
      }`;
    })
    .join("\n\n");

  const guidanceBlock = guidanceChunks.length
    ? guidanceChunks.map((g) => `[${g.tag}] ${g.docTitle}\n${g.text}`).join("\n\n")
    : "None available at your clearance.";

  const relevantQuotes = APPROVED_QUOTES.filter(
    (q) => CLEARANCE_RANK[q.confidentiality] <= bodyRank && docIndexByDoc.has(q.docId),
  );
  const quoteBlock = relevantQuotes.length
    ? relevantQuotes
        .map((q) => `"${q.text}" — ${q.attribution} [S${docIndexByDoc.get(q.docId)}]`)
        .join("\n")
    : "None; if a quote is needed, mark it for spokesperson approval and do not invent one.";

  const boiler = BOILERPLATES.find((b) => CLEARANCE_RANK[b.confidentiality] <= bodyRank);

  // Governed KPI panel block: figures recomputed server-side above. Where a
  // KPI's source document is among the numbered body sources, the model is
  // told which [S#] to cite; KPI lines without a permitted body source are
  // marked as panel-only so the model does not invent a citation for them.
  const kpiBlock = kpiCards.length
    ? kpiCards
        .map((k) => {
          const markers = [
            ...new Set(
              k.sources
                .map((s) => (s.docId && docIndexByDoc.has(s.docId) ? `S${docIndexByDoc.get(s.docId)}` : null))
                .filter((m): m is string => m !== null),
            ),
          ];
          const fc = k.forecast?.note ? ` Forecast: ${k.forecast.note}` : "";
          return `- ${k.name} (${k.objectiveName}, ${k.market}, owner: ${k.owner}, definition v${k.definitionVersion}): current ${k.current}${k.unit} against a ${k.target}${k.unit} target — ${k.status === "on-track" ? "on track" : k.status === "amber" ? "at risk" : "off track"}.${fc}${
            markers.length > 0
              ? ` Cite ${markers.map((m) => `[${m}]`).join(" or ")} for this figure.`
              : " Panel-only figure: reference it as coming from the governed KPI panel, without a source marker."
          }`;
        })
        .join("\n")
    : null;

  const sectionBlueprint = (template?.sections ?? [])
    .map(
      (s) =>
        `- ${s.label} (kind: ${s.kind}${s.perAxis ? ", one per selected strategic axis" : ""})`,
    )
    .join("\n");

  const axisList = (input.axisIds ?? [])
    .map((id) => {
      const a = AXES.find((x) => x.id === id);
      return a ? `${a.id}: ${a.name}` : id;
    })
    .join("; ");

  const refineBlock =
    instruction && baseDraft
      ? `\n\nThis is a REFINE request. Apply this instruction to the existing draft, keeping everything else intact and still cited: "${instruction}".\n\nExisting draft sections (JSON):\n${JSON.stringify(
          baseDraft.sections.map((s) => ({
            kind: s.kind,
            axisId: s.axisId,
            heading: s.heading,
            body: s.body,
            internalOnly: s.internalOnly,
          })),
        )}\nExisting umbrella: ${baseDraft.umbrella ?? "(none)"}`
      : "";

  const systemPrompt = [
    "You are the document-generation engine of Telefónica's Hub SSoT, a governed single source of truth for the Communication and Brand teams.",
    "You write on-brand corporate documents where EVERY factual claim carries a source marker in square brackets, e.g. [S1] or [S2].",
    "Use ONLY the numbered body sources provided for factual claims. Do not use outside knowledge and never invent a figure, quote or fact.",
    "Only cite markers that were provided. If a section cannot be supported by a source, write a brief honest note instead of a fabricated claim.",
    "The umbrella message, when present, must also end with at least one source marker.",
    "Voice: clear, human, confident. Sentence case for headings. No jargon. Never use emoji. No unapproved superlatives (e.g. 'European leader', 'the largest', 'number one', 'best network in the world').",
    "Spokesperson notes and any internal-only guidance draw on the internal guidance sources [G#]; these support the drafter and must never be phrased as external-facing copy.",
    `Write the document in ${languageName(language)}.`,
    "Return ONLY a single JSON object, no prose around it.",
  ].join(" ");

  const jsonShape = `{
  "title": string,
  "umbrella": string | null,   // a single umbrella message for messaging/multiformat; null for press
  "sections": [ { "kind": string, "axisId": string | null, "heading": string, "body": string } ],
  "spokesperson": [ { "question": string, "guidance": string, "doNotSay": string | null } ]
}`;

  const userPrompt = `Document shape: ${shape}
Section blueprint:
${sectionBlueprint}

Brief:
- Topic: ${input.topic}
- Audience: ${audience}${audience === "external" ? " (only public sources are available; nothing confidential can appear)" : ""}
- Destination confidentiality: ${confidentiality}
- Selected strategic axes: ${axisList || "(none specified — infer the most relevant from the sources)"}
- Output format: ${format}${input.spokesperson ? `\n- Spokesperson: ${input.spokesperson} (address spokesperson notes to this person; for the quote section use ONLY an approved quote whose attribution matches — never invent or reattribute a quote. If no approved quote is attributed to this person, leave the quote section body completely empty)` : ""}${input.eventDate ? `\n- Event / publication date: ${input.eventDate} (frame timing references around this date)` : ""}${
    shape === "press"
      ? `\n\nPress-release structure requirements:\n- The headline must carry a source marker like every other factual section.\n- The 'lead' section is the STANDFIRST: one or two sentences that carry the whole story, cited.\n- Every Q&A answer must end with its own source marker(s); an answer without support must honestly say the point is not covered by approved material.\n- Do not write the press contact or boilerplate yourself beyond the approved text provided.`
      : ""
  }${
    shape === "messaging"
      ? `\n\nTalking-points requirements:\n- One key message per selected axis, each backed by a cited figure where available.\n- Match the tone to the audience: ${audience === "external" ? "external — quotable, plain-spoken, no internal shorthand" : "internal — candid, direct, may reference internal context"}.`
      : ""
  }

Body sources (cite these with [S#]):
${sourceBlock}

Approved quotes you may use verbatim (already cited):
${quoteBlock}

Approved boilerplate (use verbatim for the 'boilerplate' section if present):
${boiler ? boiler.text : "None available."}${
    kpiBlock
      ? `\n\nGoverned KPI panel (figures recomputed by the calculation engine for this persona and destination — use these exact numbers, never adjust them):\n${kpiBlock}`
      : ""
  }

Internal guidance for spokesperson notes only (do NOT place in the published body):
${guidanceBlock}

Return the document as JSON in exactly this shape:
${jsonShape}${refineBlock}`;

  let raw = "";
  try {
    onStage?.("composing");
    const message = await meteredCreate("generate", {
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    log.error({ err }, "generate: model call failed");
    raw = "";
  }

  const parsed = extractJson(raw) as
    | {
        title?: string;
        umbrella?: string | null;
        sections?: { kind?: string; axisId?: string | null; heading?: string; body?: string }[];
        spokesperson?: { question?: string; guidance?: string; doNotSay?: string | null }[];
      }
    | null;

  // Extractive fallback if the model failed or returned nothing usable.
  const rawSections =
    parsed?.sections && parsed.sections.length > 0
      ? parsed.sections
      : sources.map((s, i) => ({
          kind: "body",
          axisId: null,
          heading: resolveDoc(s.docId)?.title ?? "Section",
          body: `${s.text} [S${i + 1}]`,
        }));

  // ---- Renumber citations contiguously across the whole draft ----------------
  const referencedOld = new Set<number>();
  const scanText = (t: string) => {
    for (const m of t.matchAll(/S\s*(\d+)/gi)) {
      const n = Number(m[1]);
      if (n >= 1 && n <= sources.length) referencedOld.add(n);
    }
  };
  for (const s of rawSections) scanText(s.body ?? "");
  const usedOld =
    referencedOld.size > 0 ? [...referencedOld].sort((a, b) => a - b) : [];
  const oldToNew = new Map<number, number>();
  usedOld.forEach((oldN, i) => oldToNew.set(oldN, i + 1));

  const rewriteMarkers = (t: string): string =>
    t
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

  const sections: DraftSection[] = rawSections.map((s) => {
    const body = rewriteMarkers(s.body ?? "");
    const citationIds = [...new Set([...body.matchAll(/S\s*(\d+)/gi)].map((m) => `S${Number(m[1])}`))];
    return {
      id: newId("sec"),
      kind: s.kind ?? "body",
      heading: s.heading ?? "",
      axisId: s.axisId ?? null,
      body,
      citationIds,
      internalOnly: false,
    };
  });

  // Quote sections are governed verbatim assets: if the model wrote a quote
  // that is not one of the approved quotes available to this brief (e.g. it
  // reattributed one to the requested spokesperson), blank it deterministically
  // — an empty quote section is honest; an invented quote is a brand breach.
  for (const s of sections) {
    if (s.kind !== "quote" || !s.body.trim()) continue;
    const matchesApproved = relevantQuotes.some((q) => s.body.includes(q.text));
    if (!matchesApproved) {
      s.body = "";
      s.heading = "Executive quote — pending spokesperson approval";
      s.citationIds = [];
    }
  }

  // Press releases always end body content with the approved press-contact
  // block — deterministic, never model-written. Any model attempt is replaced.
  if (shape === "press") {
    const withoutContact = sections.filter((s) => s.kind !== "contact");
    withoutContact.push({
      id: newId("sec"),
      kind: "contact",
      heading: PRESS_CONTACT.heading,
      axisId: null,
      body: PRESS_CONTACT.text,
      citationIds: [],
      internalOnly: false,
    });
    sections.length = 0;
    sections.push(...withoutContact);
  }

  // Chart citation ids also need renumbering.
  for (const c of charts) {
    if (c.citationId) {
      const oldN = Number(c.citationId.replace(/\D/g, ""));
      const mapped = oldToNew.get(oldN);
      c.citationId = mapped ? `S${mapped}` : null;
    }
  }

  const citations: DraftCitation[] = usedOld.map((oldN) => {
    const s = sources[oldN - 1];
    const doc = resolveDoc(s.docId);
    const fact = numericFacts.find((f) => docIndexByDoc.get(f.docId) === oldN);
    return {
      id: `S${oldToNew.get(oldN)}`,
      docId: s.docId,
      docTitle: doc?.title ?? s.docId,
      sourceLoc: s.breadcrumb,
      version: doc?.quarter ?? "",
      owner: doc?.owner ?? "",
      validUntil: doc?.validUntil ?? null,
      confidence: confidenceFor(s.score, topScore),
      confidentiality: doc?.confidentiality ?? "public",
      validity: doc?.validity ?? "approved",
      snippet: s.text,
      value: fact ? `${fact.value}${fact.unit ? " " + fact.unit : ""}` : null,
      country: doc?.country ?? null,
      brand: doc?.brand ?? null,
      axisIds: doc?.axisIds ?? [],
    };
  });

  // ---- Spokesperson notes (internal only) ------------------------------------
  const spokesperson: SpokespersonNote[] =
    (shape === "messaging" || shape === "press") && parsed?.spokesperson
      ? parsed.spokesperson
          .filter((n) => n && n.question && n.guidance)
          .slice(0, 5)
          .map((n) => ({
            question: n.question!.trim(),
            guidance: n.guidance!.trim(),
            doNotSay: n.doNotSay ? String(n.doNotSay).trim() : null,
          }))
      : [];

  // ---- Disclaimers (required by the template) --------------------------------
  const disclaimers: DraftDisclaimer[] = (template?.requiredDisclaimerIds ?? [])
    .map((id) => getDisclaimer(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({ id: d.id, name: d.name, text: d.text }));

  // ---- Historic detection ----------------------------------------------------
  const citedDocs = citations.map((c) => resolveDoc(c.docId));
  const historicDocs = citedDocs.filter(
    (d) => d && (d.validity === "historic" || d.validity === "superseded"),
  );
  const historic = historicDocs.length > 0;
  const historicNote = historic
    ? `This draft draws on ${historicDocs.length === 1 ? "a source" : "sources"} marked ${[
        ...new Set(historicDocs.map((d) => `"${d?.validity}"`)),
      ].join(" / ")}. Treat the figures as historic and verify against the current release.`
    : null;

  const axisIds = [
    ...new Set([
      ...(input.axisIds ?? []),
      ...sections.map((s) => s.axisId).filter((a): a is string => Boolean(a)),
      ...citedDocs.flatMap((d) => d?.axisIds ?? []),
    ]),
  ];

  const title = parsed?.title?.trim() || input.topic;
  const umbrella =
    shape === "press" ? null : rewriteMarkers(parsed?.umbrella ?? "") || null;

  // ---- Ask handoff risk state --------------------------------------------------
  // Persisted on the draft so the provenance stays visible through export.
  // `historic` is re-derived server-side from the re-validated handoff docs'
  // validity (never trusted from the client); conflict / low-confidence are the
  // Ask engine's own labels, carried through as advisories.
  let askSignals: AskSignals | null = null;
  if (ac) {
    const handoffDocs = [...askDocIds].map((id) => resolveDoc(id));
    const askHistoric = handoffDocs.some(
      (d) => d && (d.validity === "historic" || d.validity === "superseded"),
    );
    const conflict = ac.status === "conflict";
    const lowConfidence = ac.lowConfidence === true;
    const parts: string[] = [];
    if (conflict) parts.push("the Ask answer found conflicting figures across permitted sources");
    if (lowConfidence) parts.push("the Ask answer was marked low confidence");
    if (askHistoric) parts.push("the handed-over sources include historic or superseded material");
    askSignals = {
      question: ac.question,
      conflict,
      lowConfidence,
      historic: askHistoric,
      note:
        parts.length > 0
          ? `This draft started from an Ask answer where ${parts.join("; ")}. Verify before export.`
          : null,
    };
  }

  const draft: GeneratedDraft = {
    id: baseDraft?.id ?? newId("draft"),
    status: "drafted",
    shape,
    templateId,
    title,
    language,
    audience,
    confidentiality,
    umbrella,
    exclusions,
    sections,
    spokesperson,
    charts,
    citations,
    disclaimers,
    axisIds,
    guardian: emptyGuardian,
    historic,
    historicNote,
    createdAt: now,
    params,
    origin: baseDraft?.origin ?? "manual",
    reviewItemId: baseDraft?.reviewItemId ?? null,
    // Any (re)composition invalidates a prior approval; only the inbox approve
    // endpoint may set this back to true.
    approved: false,
    // A refine has no fresh askContext; the persisted risk state carries over
    // so the provenance never disappears mid-flow.
    askSignals: askSignals ?? baseDraft?.askSignals ?? null,
  };

  onStage?.("guardian");
  draft.guardian = runBrandGuardian(draft);

  log.info(
    {
      topic: input.topic,
      roleId: role.id,
      shape,
      audience,
      sources: citations.length,
      guardian: draft.guardian.status,
    },
    "generate: drafted",
  );

  return draft;
}

export async function runGenerateAgent(
  input: GenerateInput,
  log: Logger,
  onStage?: StageReporter,
): Promise<GeneratedDraft> {
  return compose({ input, onStage }, log);
}

export async function refineDraft(
  input: RefineInput,
  log: Logger,
  onStage?: StageReporter,
): Promise<GeneratedDraft> {
  const base = input.draft;
  const genInput: GenerateInput = {
    shape: base.params.shape,
    topic: base.params.topic,
    roleId: input.roleId || base.params.roleId,
    audience: base.params.audience,
    language: base.params.language,
    confidentiality: base.params.confidentiality,
    format: base.params.format,
    axisIds: base.params.axisIds,
    spokesperson: base.params.spokesperson ?? null,
    eventDate: base.params.eventDate ?? null,
  };
  const selection = input.selection?.trim();
  const instruction = selection
    ? `${input.instruction}\n\nApply the change specifically to this passage of the draft, keeping the rest intact: "${selection}"`
    : input.instruction;
  return compose({ input: genInput, instruction, baseDraft: base, onStage }, log);
}
