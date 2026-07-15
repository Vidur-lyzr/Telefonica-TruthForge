// Re-tagging proposal agent — step 3 of the governed pipeline.
// Given a taxonomy edit (rename / split / merge), it proposes, per affected
// document, its new axis assignment and any topic adjustments. Zero-shot via
// Claude; if the model is unavailable it falls back to a deterministic
// mapping — always labelled, never silent.
// Proposals are NEVER applied here: a human validates each one first.

import { meteredCreate } from "./metering";
import { AXES, getDoc, type StrategicAxis } from "../data/corpus";
import {
  retagCandidatesForAxis,
  makeAxisId,
  pickAxisColor,
  type RetagCandidate,
} from "../data/governance";

const MODEL = "claude-sonnet-4-6";

export type RetagKind = "rename" | "split" | "merge";

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

export interface RetagProposeInput {
  axisId: string;
  newName: string;
  newDescription?: string | null;
  kind?: RetagKind | null;
  splitNewAxisName?: string | null;
  splitNewAxisDescription?: string | null;
  mergeIntoAxisId?: string | null;
}

export interface RetagProposeResult {
  axisId: string;
  fromName: string;
  toName: string;
  engine: "llm" | "deterministic";
  affectedCount: number;
  proposals: RetagProposal[];
  kind: RetagKind;
  newAxis: StrategicAxis | null;
  mergeIntoAxisId: string | null;
  mergeIntoName: string | null;
}

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
}

export class RetagInputError extends Error {}

function withoutAxis(axisIds: string[], axisId: string): string[] {
  return axisIds.filter((id) => id !== axisId);
}

function withAxis(axisIds: string[], axisId: string): string[] {
  return axisIds.includes(axisId) ? axisIds : [...axisIds, axisId];
}

function deterministicProposals(
  candidates: RetagCandidate[],
  kind: RetagKind,
  sourceAxisId: string,
  mergeIntoAxisId: string | null,
): RetagProposal[] {
  return candidates.map((c) => ({
    docId: c.docId,
    title: c.title,
    type: c.type,
    currentAxisIds: c.axisIds,
    proposedAxisIds:
      kind === "merge" && mergeIntoAxisId
        ? withAxis(withoutAxis(c.axisIds, sourceAxisId), mergeIntoAxisId)
        : c.axisIds,
    currentTopics: c.topics,
    proposedTopics: c.topics,
    confidence: 0.6,
    rationale:
      kind === "merge"
        ? "Deterministic mapping: the document moves to the absorbing axis. Model-assisted review was unavailable."
        : kind === "split"
          ? "Deterministic mapping: the document stays under the renamed original axis. Model-assisted review was unavailable."
          : "Deterministic mapping: the document keeps its current axis assignment under the renamed label. Model-assisted review was unavailable.",
  }));
}

interface ModelVerdict {
  docId: string;
  keep?: boolean;
  assign?: string;
  move?: boolean;
  topics?: string[];
  confidence?: number;
  rationale?: string;
}

export async function proposeRetag(
  input: RetagProposeInput,
  log: Logger,
): Promise<RetagProposeResult | null> {
  const axis = AXES.find((a) => a.id === input.axisId);
  if (!axis) return null;

  const kind: RetagKind = input.kind ?? "rename";

  // Split: the sibling axis is generated at PROPOSE time (id, colour) so the
  // human validates exactly the axis that will be created on apply.
  let newAxis: StrategicAxis | null = null;
  if (kind === "split") {
    const name = input.splitNewAxisName?.trim();
    if (!name) throw new RetagInputError("split requires the new sibling axis name");
    newAxis = {
      id: makeAxisId(name),
      name,
      color: pickAxisColor(),
      description:
        input.splitNewAxisDescription?.trim() ||
        `Documents split out of "${axis.name}".`,
    };
  }

  let mergeTarget: StrategicAxis | null = null;
  if (kind === "merge") {
    const target = AXES.find((a) => a.id === input.mergeIntoAxisId);
    if (!target) throw new RetagInputError("merge requires a valid target axis");
    if (target.id === axis.id)
      throw new RetagInputError("an axis cannot be merged into itself");
    if (target.retired)
      throw new RetagInputError("cannot merge into a retired axis");
    mergeTarget = target;
  }

  const candidates = retagCandidatesForAxis(input.axisId);
  const base = {
    axisId: axis.id,
    fromName: axis.name,
    toName: kind === "merge" ? mergeTarget!.name : input.newName,
    affectedCount: candidates.length,
    kind,
    newAxis,
    mergeIntoAxisId: mergeTarget?.id ?? null,
    mergeIntoName: mergeTarget?.name ?? null,
  };

  if (candidates.length === 0) {
    return { ...base, engine: "deterministic", proposals: [] };
  }

  let taskLines: string[];
  let verdictShape: string;
  if (kind === "split") {
    taskLines = [
      `A strategic taxonomy axis is being SPLIT into two axes.`,
      `Original axis: "${axis.name}" — ${axis.description}`,
      `It becomes: "${input.newName}"${input.newDescription ? ` — ${input.newDescription}` : ""}`,
      `New sibling axis: "${newAxis!.name}" — ${newAxis!.description}`,
      ``,
      `For each document below, decide zero-shot which axis it belongs to after the split: "original" (the renamed original), "new" (the sibling), or "both" if it genuinely covers both. Propose an updated topic list only if the split warrants it.`,
    ];
    verdictShape = `[{"docId": "...", "assign": "original"|"new"|"both", "topics": ["..."], "confidence": 0.0-1.0, "rationale": "one short sentence"}]`;
  } else if (kind === "merge") {
    taskLines = [
      `A strategic taxonomy axis is being MERGED into another axis and will be retired.`,
      `Source axis (being retired): "${axis.name}" — ${axis.description}`,
      `Absorbing axis: "${mergeTarget!.name}" — ${mergeTarget!.description}`,
      ``,
      `For each document below, decide zero-shot whether it belongs under the absorbing axis ("move": true) or should simply leave the retired axis without joining the absorbing one ("move": false). Propose an updated topic list only if the merge warrants it.`,
    ];
    verdictShape = `[{"docId": "...", "move": true|false, "topics": ["..."], "confidence": 0.0-1.0, "rationale": "one short sentence"}]`;
  } else {
    taskLines = [
      `A strategic taxonomy axis is being edited.`,
      `Current axis: "${axis.name}" — ${axis.description}`,
      `New axis: "${input.newName}"${input.newDescription ? ` — ${input.newDescription}` : ""}`,
      ``,
      `For each document below, decide zero-shot whether it still belongs under the edited axis, and propose an updated topic list if the edit warrants it (usually the topics stay unchanged).`,
    ];
    verdictShape = `[{"docId": "...", "keep": true|false, "topics": ["..."], "confidence": 0.0-1.0, "rationale": "one short sentence"}]`;
  }

  // One monolithic call truncates past ~30 docs (max_tokens ceiling on the
  // JSON reply), so classify in batches. A failed batch only degrades its own
  // docs to the labelled deterministic fallback.
  const BATCH_SIZE = 12;
  const batches: RetagCandidate[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  const batchPrompt = (batch: RetagCandidate[]) =>
    [
      ...taskLines,
      ``,
      `Documents:\n${batch
        .map(
          (c) =>
            `- id: ${c.docId}\n  title: ${c.title}\n  type: ${c.type}\n  topics: ${c.topics.join(", ")}\n  summary: ${c.summary}`,
        )
        .join("\n")}`,
      ``,
      `Respond with ONLY a JSON array, one object per document:`,
      verdictShape,
    ].join("\n");

  const runBatch = async (batch: RetagCandidate[]): Promise<ModelVerdict[]> => {
    const message = await meteredCreate("data", {
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: batchPrompt(batch) }],
    });
    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1)
      throw new Error("no JSON array in model output");
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as ModelVerdict[];
  };

  try {
    const settled = await Promise.allSettled(batches.map(runBatch));
    const byId = new Map<string, ModelVerdict>();
    let failedBatches = 0;
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        for (const v of outcome.value) byId.set(v.docId, v);
      } else {
        failedBatches += 1;
        log.warn(
          { err: outcome.reason },
          "retag: batch failed, its docs fall back to deterministic mapping",
        );
      }
    }
    if (byId.size === 0) throw new Error("all retag batches failed");

    const proposals: RetagProposal[] = candidates.map((c) => {
      const v = byId.get(c.docId);
      if (!v) {
        return deterministicProposals([c], kind, axis.id, mergeTarget?.id ?? null)[0];
      }
      let proposedAxisIds: string[];
      if (kind === "split") {
        const assign = v.assign === "new" || v.assign === "both" ? v.assign : "original";
        if (assign === "new") {
          proposedAxisIds = withAxis(withoutAxis(c.axisIds, axis.id), newAxis!.id);
        } else if (assign === "both") {
          proposedAxisIds = withAxis(c.axisIds, newAxis!.id);
        } else {
          proposedAxisIds = c.axisIds;
        }
      } else if (kind === "merge") {
        const move = v.move !== false;
        proposedAxisIds = move
          ? withAxis(withoutAxis(c.axisIds, axis.id), mergeTarget!.id)
          : withoutAxis(c.axisIds, axis.id);
      } else {
        const keep = v.keep !== false;
        proposedAxisIds = keep ? c.axisIds : withoutAxis(c.axisIds, axis.id);
      }
      return {
        docId: c.docId,
        title: c.title,
        type: c.type,
        currentAxisIds: c.axisIds,
        proposedAxisIds,
        currentTopics: c.topics,
        proposedTopics:
          Array.isArray(v.topics) && v.topics.length > 0 ? v.topics : c.topics,
        confidence: Math.max(0, Math.min(1, Number(v.confidence ?? 0.7))),
        rationale: String(v.rationale ?? "Model-assisted zero-shot classification."),
      };
    });

    log.info(
      {
        axisId: axis.id,
        kind,
        proposals: proposals.length,
        batches: batches.length,
        failedBatches,
        modelVerdicts: byId.size,
      },
      "retag: LLM zero-shot proposals generated",
    );
    return { ...base, engine: "llm", proposals };
  } catch (err) {
    if (err instanceof RetagInputError) throw err;
    log.warn({ err }, "retag: model unavailable, deterministic fallback proposals");
    return {
      ...base,
      engine: "deterministic",
      proposals: deterministicProposals(candidates, kind, axis.id, mergeTarget?.id ?? null),
    };
  }
}

// ---------------------------------------------------------------------------
// Per-document tag suggestions — used by the direct "Edit tags" surface.
// The model classifies each document against the ACTIVE axis catalogue and
// proposes a topic list; a deterministic keep-current fallback is always
// labelled. Nothing is applied here — the human editor stays authoritative.
// ---------------------------------------------------------------------------

export interface DocTagSuggestResult {
  engine: "llm" | "deterministic";
  suggestions: RetagProposal[];
}

interface DocSuggestVerdict {
  docId: string;
  axisIds?: string[];
  topics?: string[];
  confidence?: number;
  rationale?: string;
}

export async function suggestDocTags(
  docIds: string[],
  log: Logger,
): Promise<DocTagSuggestResult> {
  const docs = docIds.map((id) => getDoc(id)!).filter(Boolean);
  const activeAxes = AXES.filter((a) => !a.retired);
  const activeIds = new Set(activeAxes.map((a) => a.id));

  const keepCurrent = (): RetagProposal[] =>
    docs.map((d) => ({
      docId: d.id,
      title: d.title,
      type: d.type,
      currentAxisIds: d.axisIds,
      proposedAxisIds: d.axisIds.filter((id) => activeIds.has(id)),
      currentTopics: d.topics,
      proposedTopics: d.topics,
      confidence: 0.5,
      rationale:
        "Deterministic mapping: current tags kept (retired axes dropped). Model-assisted suggestions were unavailable.",
    }));

  if (docs.length === 0) return { engine: "deterministic", suggestions: [] };

  const prompt = [
    `You classify governed corpus documents against a strategic taxonomy.`,
    `Active axes (the ONLY valid axis ids):`,
    ...activeAxes.map((a) => `- id: ${a.id} — "${a.name}": ${a.description}`),
    ``,
    `For each document below, propose zero-shot the set of axis ids it serves (1-3 axes, ids from the list above ONLY) and a concise topic list (3-6 short lowercase topics, keep current topics that still fit).`,
    ``,
    `Documents:`,
    ...docs.map(
      (d) =>
        `- id: ${d.id}\n  title: ${d.title}\n  type: ${d.type}\n  current axes: ${d.axisIds.join(", ")}\n  current topics: ${d.topics.join(", ")}\n  summary: ${d.summary}`,
    ),
    ``,
    `Respond with ONLY a JSON array, one object per document:`,
    `[{"docId": "...", "axisIds": ["..."], "topics": ["..."], "confidence": 0.0-1.0, "rationale": "one short sentence"}]`,
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
    if (jsonStart === -1 || jsonEnd === -1)
      throw new Error("no JSON array in model output");
    const verdicts = JSON.parse(
      text.slice(jsonStart, jsonEnd + 1),
    ) as DocSuggestVerdict[];
    const byId = new Map(verdicts.map((v) => [v.docId, v]));

    const suggestions: RetagProposal[] = docs.map((d) => {
      const v = byId.get(d.id);
      const proposedAxisIds = (v?.axisIds ?? []).filter((id) => activeIds.has(id));
      if (!v || proposedAxisIds.length === 0) return keepCurrent().find((k) => k.docId === d.id)!;
      return {
        docId: d.id,
        title: d.title,
        type: d.type,
        currentAxisIds: d.axisIds,
        proposedAxisIds,
        currentTopics: d.topics,
        proposedTopics:
          Array.isArray(v.topics) && v.topics.length > 0 ? v.topics.map(String) : d.topics,
        confidence: Math.max(0, Math.min(1, Number(v.confidence ?? 0.7))),
        rationale: String(v.rationale ?? "Model-assisted zero-shot classification."),
      };
    });
    log.info(
      { docs: docs.length, verdicts: byId.size },
      "retag: per-document LLM tag suggestions generated",
    );
    return { engine: "llm", suggestions };
  } catch (err) {
    log.warn({ err }, "retag: model unavailable, deterministic keep-current suggestions");
    return { engine: "deterministic", suggestions: keepCurrent() };
  }
}
