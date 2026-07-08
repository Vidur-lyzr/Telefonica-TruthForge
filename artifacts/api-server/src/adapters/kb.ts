// kb.retrieve — Lyzr-named knowledge-base retrieval adapter.
// Backed natively by a local TF-IDF + BM25 hybrid over the synthetic corpus.
// A real Lyzr Knowledge Base can be swapped in behind this same interface later.

import { DOCS, getDoc, CLEARANCE_RANK, type Clearance } from "../data/corpus";
import { isLyzrConfigured, lyzrRetrieve } from "./lyzr";
import { tokenize } from "./text";

export interface RetrievedChunk {
  chunkId: string;
  docId: string;
  score: number;
  coverage: number;
  heading: string;
  breadcrumb: string;
  text: string;
  accessible: boolean;
}

interface IndexedChunk {
  chunkId: string;
  docId: string;
  heading: string;
  breadcrumb: string;
  text: string;
  confidentiality: Clearance;
  country: string;
  brand: string;
  quarter: string;
  type: string;
  axisIds: string[];
  terms: string[];
  termFreq: Map<string, number>;
  length: number;
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

const index: IndexedChunk[] = [];
const docFreq = new Map<string, number>();
let avgLen = 0;

for (const doc of DOCS) {
  for (const chunk of doc.chunks) {
    const haystack = `${doc.title} ${chunk.heading} ${chunk.text} ${doc.topics.join(" ")}`;
    const terms = tokenize(haystack);
    const termFreq = new Map<string, number>();
    for (const t of terms) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
    for (const t of new Set(terms)) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
    index.push({
      chunkId: chunk.id,
      docId: doc.id,
      heading: chunk.heading,
      breadcrumb: chunk.breadcrumb,
      text: chunk.text,
      confidentiality: doc.confidentiality,
      country: doc.country,
      brand: doc.brand,
      quarter: doc.quarter,
      type: doc.type,
      axisIds: doc.axisIds,
      terms,
      termFreq,
      length: terms.length,
    });
  }
}
avgLen = index.reduce((sum, c) => sum + c.length, 0) / Math.max(index.length, 1);
const N = index.length;

function idf(term: string): number {
  const df = docFreq.get(term) ?? 0;
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

export interface RetrieveFilters {
  market?: string | null;
  brand?: string | null;
  period?: string | null;
  source?: string | null;
  axis?: string | null;
}

export interface RetrieveOptions {
  question: string;
  clearance: Clearance;
  topK?: number;
  filters?: RetrieveFilters | null;
}

function passesFilters(chunk: IndexedChunk, f?: RetrieveFilters | null): boolean {
  if (!f) return true;
  const eq = (a: string, b?: string | null) =>
    !b || a.toLowerCase() === b.toLowerCase();
  if (!eq(chunk.country, f.market)) return false;
  if (!eq(chunk.brand, f.brand)) return false;
  if (!eq(chunk.quarter, f.period)) return false;
  if (!eq(chunk.type, f.source)) return false;
  if (f.axis && !chunk.axisIds.includes(f.axis)) return false;
  return true;
}

export function retrieve(opts: RetrieveOptions): RetrievedChunk[] {
  const { question, clearance, topK = 6, filters } = opts;
  const qTerms = tokenize(question);
  if (qTerms.length === 0) return [];
  const qSet = new Set(qTerms);
  const roleRank = CLEARANCE_RANK[clearance];

  // Total idf mass of the query. Absent terms (df = 0) get a naturally high idf,
  // so a question full of terms the corpus has never seen keeps its denominator
  // large and its coverage low — that is what starves red-herring matches.
  const queryIdfMass =
    Array.from(qSet).reduce((sum, t) => sum + idf(t), 0) || 1;

  const scored = index.filter((c) => passesFilters(c, filters)).map((chunk) => {
    let score = 0;
    let matchedMass = 0;
    for (const term of qSet) {
      const tf = chunk.termFreq.get(term);
      if (!tf) continue;
      matchedMass += idf(term);
      const denom = tf + BM25_K1 * (1 - BM25_B + (BM25_B * chunk.length) / avgLen);
      score += idf(term) * ((tf * (BM25_K1 + 1)) / denom);
    }
    // Small boost for phrase overlap in the raw text.
    const lowerText = chunk.text.toLowerCase();
    for (const term of qSet) {
      if (term.length > 4 && lowerText.includes(term)) score += 0.15;
    }
    return { chunk, score, coverage: matchedMass / queryIdfMass };
  });

  const relevant = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(topK, 8));

  return relevant.map(({ chunk, score, coverage }) => ({
    chunkId: chunk.chunkId,
    docId: chunk.docId,
    score: Number(score.toFixed(4)),
    coverage: Number(coverage.toFixed(4)),
    heading: chunk.heading,
    breadcrumb: chunk.breadcrumb,
    text: chunk.text,
    accessible: CLEARANCE_RANK[chunk.confidentiality] <= roleRank,
  }));
}

export function resolveDoc(docId: string) {
  return getDoc(docId);
}

// ── Governed retrieval front door ───────────────────────────────────────────
//
// When the Lyzr KB is configured (LYZR_API_KEY + LYZR_RAG_ID), semantic
// candidate selection is delegated to the real Lyzr RAG API. Governance stays
// local and non-negotiable: every Lyzr candidate is mapped back onto the
// governed chunk registry, and clearance + idf-coverage are recomputed here.
// Candidates that cannot be mapped to a governed chunk are dropped (fail
// closed). If Lyzr errors, we fall back to the native engine and say so in
// the engine detail — never silently.

const chunkById = new Map(index.map((c) => [c.chunkId, c]));
const chunkByText = new Map(index.map((c) => [c.text.trim(), c]));

export interface GovernedRetrieval {
  chunks: RetrievedChunk[];
  engine: "lyzr" | "native";
  engineDetail: string;
}

interface RetrieveLogger {
  warn: (obj: unknown, msg?: string) => void;
}

function coverageFor(chunk: IndexedChunk, qSet: Set<string>, queryIdfMass: number): number {
  let matchedMass = 0;
  for (const term of qSet) {
    if (chunk.termFreq.has(term)) matchedMass += idf(term);
  }
  return matchedMass / queryIdfMass;
}

export async function retrieveGoverned(
  opts: RetrieveOptions,
  log?: RetrieveLogger,
): Promise<GovernedRetrieval> {
  if (isLyzrConfigured()) {
    try {
      const candidates = await lyzrRetrieve(opts.question, Math.max(opts.topK ?? 6, 8));
      const qTerms = tokenize(opts.question);
      const qSet = new Set(qTerms);
      const queryIdfMass =
        Array.from(qSet).reduce((sum, t) => sum + idf(t), 0) || 1;
      const roleRank = CLEARANCE_RANK[opts.clearance];
      const seen = new Set<string>();
      const chunks: RetrievedChunk[] = [];
      let unmapped = 0;

      for (const cand of candidates) {
        const chunk =
          (cand.chunkId ? chunkById.get(cand.chunkId) : undefined) ??
          chunkByText.get(cand.text.trim());
        if (!chunk) {
          unmapped += 1;
          continue; // fail closed: unknown material carries no governance metadata
        }
        if (seen.has(chunk.chunkId)) continue;
        if (!passesFilters(chunk, opts.filters)) continue;
        seen.add(chunk.chunkId);
        chunks.push({
          chunkId: chunk.chunkId,
          docId: chunk.docId,
          score: Number(cand.score.toFixed(4)),
          coverage: Number(coverageFor(chunk, qSet, queryIdfMass).toFixed(4)),
          heading: chunk.heading,
          breadcrumb: chunk.breadcrumb,
          text: chunk.text,
          accessible: CLEARANCE_RANK[chunk.confidentiality] <= roleRank,
        });
      }

      if (unmapped > 0) {
        log?.warn(
          { unmapped },
          "kb: Lyzr returned candidates not present in the governed registry; dropped (fail closed)",
        );
      }

      return {
        chunks,
        engine: "lyzr",
        engineDetail: `Lyzr KB, ${chunks.length} governed candidate${chunks.length === 1 ? "" : "s"}`,
      };
    } catch (err) {
      log?.warn({ err }, "kb: Lyzr retrieve failed; using native engine for this query");
      const chunks = retrieve(opts);
      return { chunks, engine: "native", engineDetail: "native BM25 (Lyzr unavailable)" };
    }
  }

  const chunks = retrieve(opts);
  return { chunks, engine: "native", engineDetail: "native BM25 (Lyzr not configured)" };
}
