// Re-tagging proposal agent — step 3 of the governed pipeline.
// Given an axis edit (rename / redefinition), it proposes, per affected
// document, whether the document still belongs under the edited axis and any
// topic adjustments. Zero-shot via Claude; if the model is unavailable it
// falls back to a deterministic keep-mapping — always labelled, never silent.
// Proposals are NEVER applied here: a human validates each one first.

import { meteredCreate } from "./metering";
import { AXES } from "../data/corpus";
import { retagCandidatesForAxis, type RetagCandidate } from "../data/governance";

const MODEL = "claude-sonnet-4-6";

export interface RetagProposal {
  docId: string;
  title: string;
  type: string;
  currentAxisIds: string[];
  proposedAxisIds: string[];
  currentTopics: string[];
  proposedTopics: string[];
  confidence: number;
  rationale: string;
}

export interface RetagProposeResult {
  axisId: string;
  fromName: string;
  toName: string;
  engine: "llm" | "deterministic";
  affectedCount: number;
  proposals: RetagProposal[];
}

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
}

function deterministicProposals(
  candidates: RetagCandidate[],
): RetagProposal[] {
  return candidates.map((c) => ({
    docId: c.docId,
    title: c.title,
    type: c.type,
    currentAxisIds: c.axisIds,
    proposedAxisIds: c.axisIds,
    currentTopics: c.topics,
    proposedTopics: c.topics,
    confidence: 0.6,
    rationale:
      "Deterministic mapping: the document keeps its current axis assignment under the renamed label. Model-assisted review was unavailable.",
  }));
}

interface ModelVerdict {
  docId: string;
  keep: boolean;
  topics?: string[];
  confidence?: number;
  rationale?: string;
}

export async function proposeRetag(
  input: { axisId: string; newName: string; newDescription?: string | null },
  log: Logger,
): Promise<RetagProposeResult | null> {
  const axis = AXES.find((a) => a.id === input.axisId);
  if (!axis) return null;

  const candidates = retagCandidatesForAxis(input.axisId);
  const base = {
    axisId: axis.id,
    fromName: axis.name,
    toName: input.newName,
    affectedCount: candidates.length,
  };

  if (candidates.length === 0) {
    return { ...base, engine: "deterministic", proposals: [] };
  }

  const docList = candidates
    .map(
      (c) =>
        `- id: ${c.docId}\n  title: ${c.title}\n  type: ${c.type}\n  topics: ${c.topics.join(", ")}\n  summary: ${c.summary}`,
    )
    .join("\n");

  const prompt = [
    `A strategic taxonomy axis is being edited.`,
    `Current axis: "${axis.name}" — ${axis.description}`,
    `New axis: "${input.newName}"${input.newDescription ? ` — ${input.newDescription}` : ""}`,
    ``,
    `For each document below, decide zero-shot whether it still belongs under the edited axis, and propose an updated topic list if the edit warrants it (usually the topics stay unchanged).`,
    ``,
    `Documents:\n${docList}`,
    ``,
    `Respond with ONLY a JSON array, one object per document:`,
    `[{"docId": "...", "keep": true|false, "topics": ["..."], "confidence": 0.0-1.0, "rationale": "one short sentence"}]`,
  ].join("\n");

  try {
    const message = await meteredCreate("data", {
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("no JSON array in model output");
    const verdicts = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as ModelVerdict[];
    const byId = new Map(verdicts.map((v) => [v.docId, v]));

    const proposals: RetagProposal[] = candidates.map((c) => {
      const v = byId.get(c.docId);
      if (!v) {
        return deterministicProposals([c])[0];
      }
      const keep = v.keep !== false;
      return {
        docId: c.docId,
        title: c.title,
        type: c.type,
        currentAxisIds: c.axisIds,
        proposedAxisIds: keep
          ? c.axisIds
          : c.axisIds.filter((id) => id !== input.axisId),
        currentTopics: c.topics,
        proposedTopics:
          Array.isArray(v.topics) && v.topics.length > 0 ? v.topics : c.topics,
        confidence: Math.max(0, Math.min(1, Number(v.confidence ?? 0.7))),
        rationale: String(v.rationale ?? "Model-assisted zero-shot classification."),
      };
    });

    log.info(
      { axisId: axis.id, proposals: proposals.length },
      "retag: LLM zero-shot proposals generated",
    );
    return { ...base, engine: "llm", proposals };
  } catch (err) {
    log.warn({ err }, "retag: model unavailable, deterministic fallback proposals");
    return { ...base, engine: "deterministic", proposals: deterministicProposals(candidates) };
  }
}
