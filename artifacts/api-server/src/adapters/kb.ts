// kb.retrieve — Lyzr-named knowledge-base retrieval adapter.
// Backed natively by a local TF-IDF + BM25 hybrid over the synthetic corpus.
// A real Lyzr Knowledge Base can be swapped in behind this same interface later.

import { DOCS, getDoc, type Area, type Clearance } from "../data/corpus";
import { resolveDocAccess, type BlockedAxis } from "../data/governance";
import { recordRetrievalEvent, type RetrievalLogHit } from "../data/retrievalLog";
import { isQdrantConfigured, qdrantRetrieve } from "./qdrant";
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
  blockedBy: BlockedAxis;
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

function idf(term: string): number {
  const df = docFreq.get(term) ?? 0;
  const n = index.length;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

// Live-ingested documents (B channel) arrive after module init, so they must
// be registered into the governed chunk registry explicitly — otherwise the
// fail-closed Qdrant hit mapping would drop them as unknown material.
export function registerDocInIndex(doc: (typeof DOCS)[number]): void {
  for (const chunk of doc.chunks) {
    if (index.some((c) => c.chunkId === chunk.id)) continue;
    const haystack = `${doc.title} ${chunk.heading} ${chunk.text} ${doc.topics.join(" ")}`;
    const terms = tokenize(haystack);
    const termFreq = new Map<string, number>();
    for (const t of terms) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
    for (const t of new Set(terms)) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
    const indexed: IndexedChunk = {
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
    };
    index.push(indexed);
    chunkById.set(chunk.id, indexed);
  }
  avgLen = index.reduce((sum, c) => sum + c.length, 0) / Math.max(index.length, 1);
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
  // Persona's organisational area. Access = area × confidentiality; a null
  // area means the caller is not area-scoped (legacy paths only).
  area?: Area | null;
  topK?: number;
  filters?: RetrieveFilters | null;
  // Retrieval audit context (F3). When set, this retrieval records an event
  // (engine, filter, hit ids + scores — never text) into the audit entry.
  audit?: { id: string } | null;
}

// Single access decision for a chunk, via the governance resolver. The chunk
// ALWAYS inherits the LIVE document's confidentiality and area scope — never
// the index-build snapshot — so source-sync label changes bind instantly on
// every engine path (the snapshot fallback only covers unknown docs, which
// fail closed elsewhere).
function accessFor(
  docId: string,
  confidentiality: Clearance,
  opts: RetrieveOptions,
) {
  const doc = getDoc(docId);
  return resolveDocAccess(
    {
      confidentiality: doc?.confidentiality ?? confidentiality,
      areas: doc?.areas ?? [],
    },
    { area: opts.area ?? null, clearance: opts.clearance },
  );
}

// Human-readable description of the governance filter in force for a
// retrieval — recorded verbatim in the audit log.
function filterExprFor(opts: RetrieveOptions): string {
  const parts = [`confidentiality<=${opts.clearance}`];
  if (opts.area) parts.push(`area in {${opts.area}, cross-area}`);
  const f = opts.filters;
  if (f?.market) parts.push(`market=${f.market}`);
  if (f?.brand) parts.push(`brand=${f.brand}`);
  if (f?.period) parts.push(`period=${f.period}`);
  if (f?.source) parts.push(`source=${f.source}`);
  if (f?.axis) parts.push(`axis=${f.axis}`);
  return parts.join("; ");
}

function auditHits(chunks: RetrievedChunk[]): RetrievalLogHit[] {
  return chunks.map((c) => ({
    chunkId: c.chunkId,
    docId: c.docId,
    score: c.score,
    accessible: c.accessible,
  }));
}

function passesFilters(chunk: IndexedChunk, f?: RetrieveFilters | null): boolean {
  if (!f) return true;
  const eq = (a: string, b?: string | null) =>
    !b || a.toLowerCase() === b.toLowerCase();
  if (!eq(chunk.country, f.market)) return false;
  if (!eq(chunk.brand, f.brand)) return false;
  if (!eq(chunk.quarter, f.period)) return false;
  if (!eq(chunk.type, f.source)) return false;
  // Axis mapping is live taxonomy configuration — read it from the governed
  // document, not the index-build snapshot, so re-tagging applies instantly.
  if (f.axis) {
    const axisIds = getDoc(chunk.docId)?.axisIds ?? chunk.axisIds;
    if (!axisIds.includes(f.axis)) return false;
  }
  return true;
}

export function retrieve(opts: RetrieveOptions): RetrievedChunk[] {
  const { question, clearance, topK = 6, filters } = opts;
  const qTerms = tokenize(question);
  if (qTerms.length === 0) return [];
  const qSet = new Set(qTerms);

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

  const results = relevant.map(({ chunk, score, coverage }) => {
    const access = accessFor(chunk.docId, chunk.confidentiality, opts);
    return {
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      score: Number(score.toFixed(4)),
      coverage: Number(coverage.toFixed(4)),
      heading: chunk.heading,
      breadcrumb: chunk.breadcrumb,
      text: chunk.text,
      accessible: access.accessible,
      blockedBy: access.blockedBy,
    };
  });

  if (opts.audit) {
    recordRetrievalEvent(opts.audit.id, {
      engine: "native",
      query: opts.question,
      filterExpr: filterExprFor(opts),
      hits: auditHits(results),
    });
  }
  return results;
}

export function resolveDoc(docId: string) {
  return getDoc(docId);
}

// ── Governed retrieval front door ───────────────────────────────────────────
//
// When Qdrant is configured (QDRANT_URL + QDRANT_API_KEY), retrieval runs as
// a hybrid dense+sparse query against the real Qdrant collection, with the
// caller's clearance and area injected as payload filters INSIDE the search —
// early binding: an unpermitted chunk is never returned by Qdrant, so it can
// never enter the model context. A complementary blocked-side probe returns
// ids only (never snippets) so refusals can be honestly classified as
// permission_blocked. Candidates are mapped back onto the governed chunk
// registry (fail closed: unknown ids are dropped) and idf-coverage is
// recomputed locally so the no-evidence gate keeps working on fused scores.
// If Qdrant errors, the failure is surfaced — no silent fallback. The native
// BM25 engine remains behind the same interface as an explicit dev-only mode
// used when Qdrant is not configured.

const chunkById = new Map(index.map((c) => [c.chunkId, c]));

export interface GovernedRetrieval {
  chunks: RetrievedChunk[];
  engine: "qdrant" | "native";
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
  if (!isQdrantConfigured()) {
    // Explicit dev-only mode: Qdrant not configured, native BM25 engine.
    const chunks = retrieve(opts);
    return { chunks, engine: "native", engineDetail: "native BM25 (dev mode — Qdrant not configured)" };
  }

  const limit = Math.max(opts.topK ?? 6, 8);
  const res = await qdrantRetrieve({
    question: opts.question,
    clearance: opts.clearance,
    area: opts.area ?? null,
    filters: opts.filters ?? null,
    limit,
  });

  const qTerms = tokenize(opts.question);
  const qSet = new Set(qTerms);
  const queryIdfMass = Array.from(qSet).reduce((sum, t) => sum + idf(t), 0) || 1;

  const seen = new Set<string>();
  const chunks: RetrievedChunk[] = [];
  let unmapped = 0;

  // Permitted candidates: Qdrant already applied clearance + area filters
  // inside the search. Text and coverage come from the governed registry.
  // The local resolver re-checks every hit against the LIVE document label
  // (defense in depth): if the index payload ever lags a source-sync upgrade,
  // the stricter in-memory label wins and the chunk is demoted to blocked.
  for (const hit of res.permitted) {
    const chunk = chunkById.get(hit.chunkId);
    if (!chunk) {
      unmapped += 1;
      continue; // fail closed: unknown material carries no governance metadata
    }
    if (seen.has(chunk.chunkId)) continue;
    seen.add(chunk.chunkId);
    const access = accessFor(chunk.docId, chunk.confidentiality, opts);
    chunks.push({
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      score: Number(hit.score.toFixed(4)),
      coverage: Number(coverageFor(chunk, qSet, queryIdfMass).toFixed(4)),
      heading: chunk.heading,
      breadcrumb: chunk.breadcrumb,
      text: chunk.text,
      accessible: access.accessible,
      blockedBy: access.blockedBy,
    });
  }

  // Blocked-side probe: ids only, used to classify the refusal. The snippet
  // never leaves the server-side registry lookup below — the agent only sees
  // accessible=false entries, and the ask route strips text from blocked
  // chunks before any composition.
  for (const hit of res.blocked) {
    const chunk = chunkById.get(hit.chunkId);
    if (!chunk || seen.has(chunk.chunkId)) continue;
    seen.add(chunk.chunkId);
    const access = accessFor(chunk.docId, chunk.confidentiality, opts);
    if (access.accessible) continue; // trust the local resolver over the probe
    chunks.push({
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      score: Number(hit.score.toFixed(4)),
      coverage: Number(coverageFor(chunk, qSet, queryIdfMass).toFixed(4)),
      heading: chunk.heading,
      breadcrumb: chunk.breadcrumb,
      text: chunk.text,
      accessible: false,
      blockedBy: access.blockedBy,
    });
  }

  if (unmapped > 0) {
    log?.warn(
      { unmapped },
      "kb: Qdrant returned candidates not present in the governed registry; dropped (fail closed)",
    );
  }

  if (opts.audit) {
    recordRetrievalEvent(opts.audit.id, {
      engine: "qdrant",
      query: opts.question,
      filterExpr: filterExprFor(opts),
      hits: auditHits(chunks),
    });
  }

  const permittedCount = chunks.filter((c) => c.accessible).length;
  return {
    chunks,
    engine: "qdrant",
    engineDetail: `Qdrant hybrid (dense+sparse, RRF), ${permittedCount} permitted candidate${permittedCount === 1 ? "" : "s"}, clearance/area filtered in-query`,
  };
}
