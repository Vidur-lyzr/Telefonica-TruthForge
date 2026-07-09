// Q&A structure helpers — the Q&A section of a press draft is stored as plain
// text in its section body (single source of truth). These helpers parse that
// body into structured question/answer pairs, canonicalise the model's output
// into a stable "Q: ... / A: ..." format, and derive per-answer provenance
// from the draft's citations. Used by the compose pipeline and the export
// gates so the editor and the exported file can never disagree.

import type { DraftCitation } from "./generateAgent";

export interface QaPair {
  question: string;
  answer: string;
}

export interface QaProvenanceEntry {
  citationId: string;
  docTitle: string;
  version: string;
  date: string;
  owner: string;
}

const Q_START = /^\s*(?:\*\*)?\s*Q(?:uestion)?\s*\d*\s*(?:\*\*)?\s*[:.)\-–]\s*/i;
const A_START = /^\s*(?:\*\*)?\s*A(?:nswer)?\s*\d*\s*(?:\*\*)?\s*[:.)\-–]\s*/i;

/** Tolerant parse of a Q&A body into question/answer pairs. Returns [] when
 * the text does not look like a Q&A at all (callers then fall back to plain
 * section handling — never guess). */
export function parseQaBody(body: string): QaPair[] {
  const lines = body.split("\n");
  const pairs: QaPair[] = [];
  let question: string[] | null = null;
  let answer: string[] | null = null;

  const flush = () => {
    if (question && answer) {
      const q = question.join(" ").replace(/\s+/g, " ").trim();
      const a = answer.join("\n").trim();
      if (q && a) pairs.push({ question: q, answer: a });
    }
    question = null;
    answer = null;
  };

  for (const line of lines) {
    if (Q_START.test(line)) {
      flush();
      question = [line.replace(Q_START, "").trim()];
      answer = null;
    } else if (A_START.test(line) && question) {
      answer = [line.replace(A_START, "").trim()];
    } else if (answer) {
      answer.push(line.trim());
    } else if (question) {
      question.push(line.trim());
    }
  }
  flush();
  return pairs;
}

/** Canonical serialisation: "Q: ...\nA: ...\n" blocks separated by blank
 * lines. The editor writes this same format back, so parse(serialize(x)) is
 * stable. */
export function serializeQaPairs(pairs: QaPair[]): string {
  return pairs.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join("\n\n");
}

/** Notes are keyed by the normalised question so they survive a refine that
 * regenerates section/draft ids but keeps the question. */
export function normalizeQuestion(q: string): string {
  return q.replace(/\s+/g, " ").trim().toLowerCase();
}

export function citationIdsIn(text: string): string[] {
  return [...new Set([...text.matchAll(/S\s*(\d+)/gi)].map((m) => `S${Number(m[1])}`))];
}

/** Per-answer provenance derived from the citations the answer actually
 * carries: document title · version · date · owner. */
export function provenanceForAnswer(
  answer: string,
  citations: Pick<DraftCitation, "id" | "docTitle" | "version" | "owner" | "validUntil">[],
): QaProvenanceEntry[] {
  return citationIdsIn(answer)
    .map((id) => citations.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({
      citationId: c.id,
      docTitle: c.docTitle,
      version: c.version,
      date: c.validUntil ? `valid until ${c.validUntil}` : "",
      owner: c.owner,
    }));
}
