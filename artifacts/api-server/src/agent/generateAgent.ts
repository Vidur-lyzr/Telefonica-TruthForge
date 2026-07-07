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

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { retrieve, resolveDoc } from "../adapters/kb";
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

export interface GuardianFinding {
  severity: "error" | "warning";
  rule: string;
  message: string;
  suggestion?: string | null;
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
  // Governed source/query presets (used by scheduled definitions). These are
  // added to the retrieval query so a recurring document always pulls from the
  // same governed material, not just the free-text topic. They never bypass the
  // permission filter — retrieved chunks are still clearance-gated.
  sourceQueries?: string[];
}

export interface RefineInput {
  draft: GeneratedDraft;
  instruction: string;
  roleId: string;
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

  // Audience gate: external caps the body's accessible set to public.
  const bodyClearance: Clearance = audience === "external" ? "public" : clearance;
  const bodyRank = CLEARANCE_RANK[bodyClearance];

  const axisNames = (input.axisIds ?? [])
    .map((id) => AXES.find((a) => a.id === id)?.name ?? "")
    .filter(Boolean)
    .join(" ");
  const sourceQueryText = (input.sourceQueries ?? []).filter(Boolean).join(" ");
  const retrievalQuery = [input.topic, sourceQueryText, axisNames, instruction ?? ""]
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
  };

  const emptyGuardian: GuardianResult = {
    status: "pass",
    summary: "No draft to check.",
    findings: [],
  };

  // ---- Governed retrieval (body) --------------------------------------------
  onStage?.("retrieving");
  const retrieved = retrieve({ question: retrievalQuery, clearance: bodyClearance, topK: 12 });
  const relevant = retrieved.filter((c) => c.coverage >= COVERAGE_MIN);
  const permitted = relevant.filter((c) => c.accessible);
  const blocked = relevant.filter((c) => !c.accessible);

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
    const need = blocked
      .map((b) => resolveDoc(b.docId)?.confidentiality)
      .filter((c): c is Clearance => Boolean(c))
      .sort((a, b) => CLEARANCE_RANK[b] - CLEARANCE_RANK[a])[0];
    const reason =
      audience === "external"
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
    (s) => CLEARANCE_RANK[resolveDoc(s.docId)?.confidentiality ?? "restricted"] <= bodyRank,
  );
  // Financial briefs get a revenue-trend chart by default when accessible.
  const looksFinancial = /result|revenue|financ|earnings|dividend|ebitda/i.test(
    retrievalQuery,
  );
  if (looksFinancial && !series.some((s) => s.id === "series-revenue-trend")) {
    const extra = querySeries("revenue trend").filter(
      (s) => CLEARANCE_RANK[resolveDoc(s.docId)?.confidentiality ?? "restricted"] <= bodyRank,
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
- Output format: ${format}

Body sources (cite these with [S#]):
${sourceBlock}

Approved quotes you may use verbatim (already cited):
${quoteBlock}

Approved boilerplate (use verbatim for the 'boilerplate' section if present):
${boiler ? boiler.text : "None available."}

Internal guidance for spokesperson notes only (do NOT place in the published body):
${guidanceBlock}

Return the document as JSON in exactly this shape:
${jsonShape}${refineBlock}`;

  let raw = "";
  try {
    onStage?.("composing");
    const message = await anthropic.messages.create({
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
  };
  return compose({ input: genInput, instruction: input.instruction, baseDraft: base, onStage }, log);
}
