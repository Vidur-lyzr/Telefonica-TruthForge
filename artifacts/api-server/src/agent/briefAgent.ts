// Brief agent — two small governed helpers around the Generate brief:
//
//  1. suggestTemplate: the user describes the document they need in natural
//     language and the model maps it onto one of the three governed shapes,
//     pre-filling the brief. Deterministic keyword fallback when the model is
//     unavailable — never a dead end.
//  2. captureBrief (guided chat): a short parameter-capture conversation. The
//     model extracts whatever brief fields the user has given so far and asks
//     ONE next question for the most important missing field. Capture is
//     conversation-only: it never retrieves evidence and never composes.

import { meteredCreate } from "./metering";
import { TEMPLATES, type DocShape } from "../data/assets";
import { AXES, CLEARANCE_RANK, getDoc, type Clearance } from "../data/corpus";
import { retrieveGoverned } from "../adapters/kb";

const MODEL = "claude-sonnet-4-6";

// Same relevance gate the generate agent applies: a suggestion only counts as
// evidence-backed when at least one permitted chunk clears this coverage.
const COVERAGE_MIN = 0.33;

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const SHAPES: DocShape[] = ["messaging", "press", "multiformat"];
const LANGUAGES = new Set(["en", "es", "de", "pt"]);
const AUDIENCES = new Set(["internal", "external"]);
const CONFIDENTIALITIES = new Set(["public", "private", "confidential", "off_the_record"]);

export interface BriefFields {
  shape: DocShape | null;
  topic: string | null;
  audience: "internal" | "external" | null;
  language: string | null;
  confidentiality: string | null;
  axisIds: string[];
  spokesperson: string | null;
  eventDate: string | null;
}

function sanitiseFields(raw: Record<string, unknown> | null | undefined): BriefFields {
  const r = raw ?? {};
  const shape = SHAPES.includes(r.shape as DocShape) ? (r.shape as DocShape) : null;
  const audience = AUDIENCES.has(String(r.audience)) ? (String(r.audience) as "internal" | "external") : null;
  const language = LANGUAGES.has(String(r.language)) ? String(r.language) : null;
  const confidentiality = CONFIDENTIALITIES.has(String(r.confidentiality))
    ? String(r.confidentiality)
    : null;
  const axisIds = Array.isArray(r.axisIds)
    ? r.axisIds.filter((a): a is string => typeof a === "string" && AXES.some((x) => x.id === a))
    : [];
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  return {
    shape,
    topic: str(r.topic),
    audience: audience ?? (confidentiality === "public" ? "external" : null),
    language,
    confidentiality: audience === "external" ? "public" : confidentiality,
    axisIds,
    spokesperson: str(r.spokesperson),
    eventDate: str(r.eventDate),
  };
}

// ---- 1. Natural-language template suggestion ---------------------------------

export interface SuggestionEvidence {
  matchedDocs: number;
  docTitles: string[];
}

export interface TemplateSuggestion {
  templateId: string;
  shape: DocShape;
  templateName: string;
  rationale: string;
  brief: BriefFields;
  evidence: SuggestionEvidence;
}

function fallbackShape(description: string): DocShape {
  const d = description.toLowerCase();
  if (/press|release|announc|media|q&a|journalist|nota de prensa/.test(d)) return "press";
  if (/talking point|key message|argumentario|messaging|spokes/.test(d)) return "messaging";
  return "multiformat";
}

interface MatchedDoc {
  docId: string;
  title: string;
  confidentiality: string;
  topics: string[];
}

// Governed corpus probe used to anchor and verify suggestions. Runs through
// the same retrieveGoverned + coverage gate as the generate agent, so a
// suggestion is only labelled evidence-backed when the resulting brief would
// actually retrieve permitted material. Only permitted docs are surfaced —
// blocked chunks never contribute titles.
async function matchGovernedDocs(
  query: string,
  clearance: Clearance,
  log: Logger,
): Promise<MatchedDoc[]> {
  try {
    const res = await retrieveGoverned({ question: query, clearance, topK: 10 }, log);
    const out: MatchedDoc[] = [];
    const seen = new Set<string>();
    for (const c of res.chunks) {
      if (!c.accessible || c.coverage < COVERAGE_MIN || seen.has(c.docId)) continue;
      const doc = getDoc(c.docId);
      if (!doc) continue;
      seen.add(c.docId);
      out.push({
        docId: doc.id,
        title: doc.title,
        confidentiality: doc.confidentiality,
        topics: doc.topics ?? [],
      });
    }
    return out;
  } catch (err) {
    log.warn({ err }, "suggestTemplate: governed corpus probe failed");
    return [];
  }
}

export async function suggestTemplate(
  description: string,
  clearance: Clearance,
  log: Logger,
): Promise<TemplateSuggestion> {
  const axisList = AXES.map((a) => `${a.id}: ${a.name}`).join("; ");
  const templateList = TEMPLATES.map(
    (t) => `${t.shape}: ${t.name} — ${t.description}`,
  ).join("\n");

  // Ground the suggestion before the model sees it: probe the governed corpus
  // with the user's own description so the suggested topic can reuse the
  // vocabulary of material that actually exists at this persona's clearance.
  const matched = await matchGovernedDocs(description, clearance, log);
  const sourceBlock =
    matched.length > 0
      ? `Governed sources available for this description (the ONLY material a draft can cite):
${matched
  .slice(0, 6)
  .map((d) => `- "${d.title}"${d.topics.length > 0 ? ` — topics: ${d.topics.join(", ")}` : ""}`)
  .join("\n")}

The topic MUST be a short phrase (at most 15 words) answerable from these sources. Reuse their vocabulary. Do not promise analysis the sources cannot support.`
      : `No governed sources matched this description. Still distil a short topic (at most 15 words), but keep the rationale honest about thin evidence.`;

  const prompt = `A Telefónica communications user describes the document they need:

"${description}"

Available governed document shapes:
${templateList}

Strategic axes (ids): ${axisList}

${sourceBlock}

Pick the best shape and pre-fill the brief. Return ONLY JSON:
{"shape":"messaging"|"press"|"multiformat","rationale":string (one plain sentence, why this shape),"topic":string (short, at most 15 words, grounded in the governed sources),"audience":"internal"|"external"|null,"language":"en"|"es"|"de"|"pt"|null,"confidentiality":"public"|"private"|"confidential"|null,"axisIds":string[],"spokesperson":string|null,"eventDate":string|null}`;

  let parsed: Record<string, unknown> | null = null;
  try {
    const message = await meteredCreate("generate", {
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    parsed = extractJson(raw) as Record<string, unknown> | null;
  } catch (err) {
    log.error({ err }, "suggestTemplate: model call failed, using keyword fallback");
  }

  const fields = sanitiseFields(parsed);
  const shape = fields.shape ?? fallbackShape(description);
  const template = TEMPLATES.find((t) => t.shape === shape) ?? TEMPLATES[2];
  let topic = fields.topic ?? description.trim();

  // Verify the final topic retrieves evidence. An external audience caps the
  // draft's sources at public, so the check must run at that same cap or the
  // suggestion would over-promise. If the model's rephrasing lost the match
  // the description itself had, fall back to the description as the topic.
  const audienceExternal = fields.audience === "external";
  const checkClearance: Clearance = audienceExternal ? "public" : clearance;
  let evidenceDocs =
    checkClearance === clearance && topic === description.trim()
      ? matched
      : await matchGovernedDocs(topic, checkClearance, log);
  if (evidenceDocs.length === 0 && topic !== description.trim()) {
    const descDocs =
      checkClearance === clearance
        ? matched
        : await matchGovernedDocs(description, checkClearance, log);
    if (descDocs.length > 0) {
      topic = description.trim();
      evidenceDocs = descDocs;
    }
  }

  // Align the destination confidentiality with the evidence: an internal
  // draft whose best sources are confidential must be labelled at least
  // confidential, or the generate destination gate would exclude exactly the
  // material the suggestion is promising. Evidence docs are already capped at
  // the persona's clearance, so this never suggests above what they may use.
  let confidentiality = fields.confidentiality;
  if (!audienceExternal && evidenceDocs.length > 0) {
    const rank = (c: string): number => CLEARANCE_RANK[c as Clearance] ?? 0;
    const maxEvidence = evidenceDocs.reduce(
      (best, d) => (rank(d.confidentiality) > rank(best) ? d.confidentiality : best),
      confidentiality ?? "private",
    );
    confidentiality = maxEvidence;
  }

  log.info(
    { matchedDocs: evidenceDocs.length, clearance: checkClearance },
    "suggestTemplate: evidence check",
  );

  return {
    templateId: template.id,
    shape,
    templateName: template.name,
    rationale:
      typeof parsed?.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : `The description maps to the ${template.name.toLowerCase()} shape.`,
    brief: { ...fields, shape, topic, confidentiality },
    evidence: {
      matchedDocs: evidenceDocs.length,
      docTitles: evidenceDocs.slice(0, 5).map((d) => d.title),
    },
  };
}

// ---- 2. Guided-chat parameter capture ----------------------------------------

export interface BriefChatTurn {
  role: string;
  content: string;
}

// Structured question: the client renders real controls (radio buttons for
// `choice`, checkboxes for `multichoice`, a text field for `text`) from the
// field/kind metadata. Option VALUES are machine codes; the client localizes
// the labels. The question TEXT comes from the model (or the deterministic
// fallback) in the conversation's language.
export type BriefQuestionField =
  | "shape"
  | "topic"
  | "audience"
  | "confidentiality"
  | "language"
  | "axisIds"
  | "spokesperson"
  | "other";

export interface BriefChatQuestion {
  text: string;
  field: BriefQuestionField;
  kind: "choice" | "multichoice" | "text";
  optionValues: string[];
  skippable: boolean;
}

export interface BriefChatResult {
  fields: BriefFields;
  nextQuestion: BriefChatQuestion | null;
  complete: boolean;
}

// The input control each field maps to. The server owns this mapping so the
// model can never invent options outside the governed value sets.
const QUESTION_META: Record<
  Exclude<BriefQuestionField, "other">,
  { kind: BriefChatQuestion["kind"]; optionValues: string[]; skippable: boolean }
> = {
  shape: { kind: "choice", optionValues: ["messaging", "press", "multiformat"], skippable: false },
  topic: { kind: "text", optionValues: [], skippable: false },
  audience: { kind: "choice", optionValues: ["internal", "external"], skippable: false },
  confidentiality: {
    kind: "choice",
    optionValues: ["private", "confidential", "off_the_record"],
    skippable: false,
  },
  language: { kind: "choice", optionValues: ["en", "es", "de", "pt"], skippable: false },
  axisIds: { kind: "multichoice", optionValues: AXES.map((a) => a.id), skippable: true },
  spokesperson: { kind: "text", optionValues: [], skippable: true },
};

function buildQuestion(field: BriefQuestionField, text: string): BriefChatQuestion {
  if (field === "other") {
    return { text, field, kind: "text", optionValues: [], skippable: false };
  }
  const meta = QUESTION_META[field];
  return { text, field, kind: meta.kind, optionValues: meta.optionValues, skippable: meta.skippable };
}

// A field counts as "already asked" when any assistant turn touched it — used
// so skippable questions (axes, spokesperson) are never re-asked after a skip,
// even on the deterministic fallback path. Matches the deterministic texts and
// the vocabulary the model reliably uses for these fields in all four
// supported languages.
const ASKED_PATTERNS: Partial<Record<BriefQuestionField, RegExp>> = {
  axisIds: /\bax[ei]s\b|\bejes?\b|\bachsen?\b|\beixos?\b/i,
  spokesperson: /spokes|portavoz|sprecher|porta-voz/i,
};

function alreadyAsked(field: BriefQuestionField, turns: BriefChatTurn[]): boolean {
  const pattern = ASKED_PATTERNS[field];
  if (!pattern) return false;
  return turns.some((t) => t.role === "assistant" && pattern.test(t.content));
}

// Guard against the model proposing a question for a field the conversation
// has already filled (e.g. asking confidentiality when an external audience
// already forced it to public) — fall back to the deterministic next gap.
function fieldAlreadyFilled(field: BriefQuestionField, f: BriefFields): boolean {
  switch (field) {
    case "shape":
      return Boolean(f.shape);
    case "topic":
      return Boolean(f.topic);
    case "audience":
      return Boolean(f.audience);
    case "confidentiality":
      return Boolean(f.confidentiality);
    case "language":
      return Boolean(f.language);
    case "axisIds":
      return f.axisIds.length > 0;
    case "spokesperson":
      return Boolean(f.spokesperson);
    default:
      return false;
  }
}

function deterministicNextQuestion(
  f: BriefFields,
  turns: BriefChatTurn[],
): BriefChatQuestion | null {
  if (!f.shape)
    return buildQuestion(
      "shape",
      "What kind of document do you need — talking points, a press release with Q&A, or a general multi-format document?",
    );
  if (!f.topic)
    return buildQuestion(
      "topic",
      "What is the document about — the topic or the news, in one or two lines?",
    );
  if (!f.audience)
    return buildQuestion("audience", "Is this for an internal audience or an external one?");
  if (!f.confidentiality && f.audience === "internal")
    return buildQuestion(
      "confidentiality",
      "How confidential is the destination — private, confidential or off the record?",
    );
  if (!f.language)
    return buildQuestion("language", "Which language — English, Spanish, German or Portuguese?");
  if (f.axisIds.length === 0 && !alreadyAsked("axisIds", turns))
    return buildQuestion(
      "axisIds",
      "Which strategic axes should the document lean on? Pick any that apply, or skip.",
    );
  if (f.shape === "press" && !f.spokesperson && !alreadyAsked("spokesperson", turns))
    return buildQuestion(
      "spokesperson",
      "Who is the spokesperson for the quote, if any? You can skip this.",
    );
  return null;
}

const QUESTION_FIELDS = new Set<BriefQuestionField>([
  "shape",
  "topic",
  "audience",
  "confidentiality",
  "language",
  "axisIds",
  "spokesperson",
  "other",
]);

export async function captureBrief(
  turns: BriefChatTurn[],
  log: Logger,
): Promise<BriefChatResult> {
  const axisList = AXES.map((a) => `${a.id}: ${a.name}`).join("; ");
  const conversation = turns
    .map((t) => `${t.role === "assistant" ? "Hub" : "User"}: ${t.content}`)
    .join("\n");
  const prompt = `You are capturing the brief for a governed Telefónica document through a short chat. Extract ONLY what the user has actually said — never guess a field they have not given. Then propose ONE next question for the most important missing field, or null when the brief is complete (shape, topic, audience and language present; confidentiality may default).

Strategic axes (ids): ${axisList}
Shapes: messaging (talking points), press (press release + Q&A), multiformat (general document).
If the user skips a question or says 'none'/'no preference', leave that field as it is and NEVER ask about it again.
Ask the question in the same language the user is writing in.

Conversation so far:
${conversation}

Return ONLY JSON:
{"shape":"messaging"|"press"|"multiformat"|null,"topic":string|null,"audience":"internal"|"external"|null,"language":"en"|"es"|"de"|"pt"|null,"confidentiality":"public"|"private"|"confidential"|"off_the_record"|null,"axisIds":string[],"spokesperson":string|null,"eventDate":string|null,"nextField":"shape"|"topic"|"audience"|"confidentiality"|"language"|"axisIds"|"spokesperson"|"other"|null,"nextQuestion":string|null}`;

  let parsed: Record<string, unknown> | null = null;
  try {
    const message = await meteredCreate("generate", {
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    parsed = extractJson(raw) as Record<string, unknown> | null;
  } catch (err) {
    log.error({ err }, "captureBrief: model call failed, using deterministic questions");
  }

  const fields = sanitiseFields(parsed);
  const modelText =
    typeof parsed?.nextQuestion === "string" && parsed.nextQuestion.trim()
      ? parsed.nextQuestion.trim()
      : null;
  const modelField = QUESTION_FIELDS.has(parsed?.nextField as BriefQuestionField)
    ? (parsed?.nextField as BriefQuestionField)
    : "other";
  let nextQuestion: BriefChatQuestion | null = null;
  if (modelText) {
    // Never re-ask a field that is already filled, or a skippable field the
    // assistant already asked about.
    nextQuestion =
      alreadyAsked(modelField, turns) || fieldAlreadyFilled(modelField, fields)
        ? deterministicNextQuestion(fields, turns)
        : buildQuestion(modelField, modelText);
  } else {
    nextQuestion = deterministicNextQuestion(fields, turns);
  }
  const complete = Boolean(fields.shape && fields.topic && fields.audience) && !nextQuestion;
  return { fields, nextQuestion: complete ? null : nextQuestion, complete };
}
