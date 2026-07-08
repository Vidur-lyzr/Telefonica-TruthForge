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
import { AXES } from "../data/corpus";

const MODEL = "claude-sonnet-4-6";

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
const CONFIDENTIALITIES = new Set(["public", "internal", "confidential", "restricted"]);

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

export interface TemplateSuggestion {
  templateId: string;
  shape: DocShape;
  templateName: string;
  rationale: string;
  brief: BriefFields;
}

function fallbackShape(description: string): DocShape {
  const d = description.toLowerCase();
  if (/press|release|announc|media|q&a|journalist|nota de prensa/.test(d)) return "press";
  if (/talking point|key message|argumentario|messaging|spokes/.test(d)) return "messaging";
  return "multiformat";
}

export async function suggestTemplate(
  description: string,
  log: Logger,
): Promise<TemplateSuggestion> {
  const axisList = AXES.map((a) => `${a.id}: ${a.name}`).join("; ");
  const templateList = TEMPLATES.map(
    (t) => `${t.shape}: ${t.name} — ${t.description}`,
  ).join("\n");
  const prompt = `A Telefónica communications user describes the document they need:

"${description}"

Available governed document shapes:
${templateList}

Strategic axes (ids): ${axisList}

Pick the best shape and pre-fill the brief. Return ONLY JSON:
{"shape":"messaging"|"press"|"multiformat","rationale":string (one plain sentence, why this shape),"topic":string (a concise brief distilled from the description),"audience":"internal"|"external"|null,"language":"en"|"es"|"de"|"pt"|null,"confidentiality":"public"|"internal"|"confidential"|null,"axisIds":string[],"spokesperson":string|null,"eventDate":string|null}`;

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
  return {
    templateId: template.id,
    shape,
    templateName: template.name,
    rationale:
      typeof parsed?.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : `The description maps to the ${template.name.toLowerCase()} shape.`,
    brief: { ...fields, shape, topic: fields.topic ?? description.trim() },
  };
}

// ---- 2. Guided-chat parameter capture ----------------------------------------

export interface BriefChatTurn {
  role: string;
  content: string;
}

export interface BriefChatResult {
  fields: BriefFields;
  nextQuestion: string | null;
  complete: boolean;
}

function deterministicNextQuestion(f: BriefFields): string | null {
  if (!f.shape)
    return "What kind of document do you need — talking points, a press release with Q&A, or a general multi-format document?";
  if (!f.topic) return "What is the document about — the topic or the news, in one or two lines?";
  if (!f.audience) return "Is this for an internal audience or an external one?";
  if (!f.confidentiality && f.audience === "internal")
    return "How confidential is the destination — internal, confidential or public?";
  if (!f.language) return "Which language — English, Spanish, German or Portuguese?";
  if (f.shape === "press" && !f.spokesperson)
    return "Who is the spokesperson for the quote, if any? Say 'none' to skip.";
  return null;
}

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
If the user says the spokesperson is 'none' or skips it, set spokesperson to null and do not ask again.

Conversation so far:
${conversation}

Return ONLY JSON:
{"shape":"messaging"|"press"|"multiformat"|null,"topic":string|null,"audience":"internal"|"external"|null,"language":"en"|"es"|"de"|"pt"|null,"confidentiality":"public"|"internal"|"confidential"|null,"axisIds":string[],"spokesperson":string|null,"eventDate":string|null,"nextQuestion":string|null}`;

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
  const modelQuestion =
    typeof parsed?.nextQuestion === "string" && parsed.nextQuestion.trim()
      ? parsed.nextQuestion.trim()
      : null;
  const nextQuestion = modelQuestion ?? deterministicNextQuestion(fields);
  const complete = Boolean(fields.shape && fields.topic && fields.audience) && !nextQuestion;
  return { fields, nextQuestion: complete ? null : nextQuestion, complete };
}
