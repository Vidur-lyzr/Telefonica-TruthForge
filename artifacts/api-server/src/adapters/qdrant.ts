// Qdrant retrieval backend — real vector database with early-binding access
// control. Dense vectors come from Qdrant Cloud Inference
// (sentence-transformers/all-MiniLM-L6-v2, computed once at seed time and per
// query); sparse BM25 vectors are generated deterministically here from the
// same multilingual tokenizer the native engine uses, so exact terms and the
// ES/EN/DE/PT synonym map keep working. Dense + sparse are fused server-side
// with RRF via the Query API.
//
// Governance lives in the QUERY, not in the agent: the caller's clearance and
// area are translated into payload `must` filters injected into the Qdrant
// search itself, so an unpermitted chunk is never returned — it can never
// enter the model context. Taxonomy is payload metadata only: re-tagging is a
// `set_payload` call, vectors are never recomputed.

import { DOCS, CLEARANCE_RANK, type Area, type Clearance } from "../data/corpus";
import { tokenize } from "./text";

// Separate collections per environment: production keeps the original
// collection name; development seeds and searches its own, so local corpus
// experiments can never touch what the deployed app retrieves from.
// QDRANT_COLLECTION overrides both when set explicitly.
export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ??
  (process.env.NODE_ENV === "production" ? "hub_ssot_chunks" : "hub_ssot_chunks_dev");
const DENSE_MODEL = "sentence-transformers/all-minilm-l6-v2";
const DENSE_SIZE = 384;

const BM25_K1 = 1.5;
const BM25_B = 0.75;

export function isQdrantConfigured(): boolean {
  return Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
}

function baseUrl(): string {
  const url = process.env.QDRANT_URL;
  if (!url) throw new Error("QDRANT_URL is not configured");
  return url.replace(/\/+$/, "");
}

async function qdrant<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const apiKey = process.env.QDRANT_API_KEY;
  if (!apiKey) throw new Error("QDRANT_API_KEY is not configured");
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let json: { result?: T; status?: unknown };
  try {
    json = JSON.parse(text) as { result?: T; status?: unknown };
  } catch {
    throw new Error(`Qdrant ${method} ${path} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const detail =
      typeof json.status === "object" && json.status !== null && "error" in json.status
        ? String((json.status as { error: unknown }).error)
        : text.slice(0, 200);
    throw new Error(`Qdrant ${method} ${path} failed (${res.status}): ${detail}`);
  }
  return json.result as T;
}

// ── Sparse BM25 encoding (deterministic, taxonomy-agnostic) ─────────────────
//
// Term ids are stable 32-bit FNV-1a hashes of tokens; weights are BM25 term
// weights computed against the corpus document-frequency table. The same
// tokenizer (with the multilingual synonym map) runs at seed time and at
// query time, so cross-language matching carries over to Qdrant unchanged.

const sparseDf = new Map<string, number>();
let sparseAvgLen = 0;
let sparseN = 0;
{
  let totalLen = 0;
  for (const doc of DOCS) {
    for (const chunk of doc.chunks) {
      const terms = tokenize(`${doc.title} ${chunk.heading} ${chunk.text} ${doc.topics.join(" ")}`);
      totalLen += terms.length;
      sparseN += 1;
      for (const t of new Set(terms)) sparseDf.set(t, (sparseDf.get(t) ?? 0) + 1);
    }
  }
  sparseAvgLen = totalLen / Math.max(sparseN, 1);
}

function sparseIdf(term: string): number {
  const df = sparseDf.get(term) ?? 0;
  return Math.log(1 + (sparseN - df + 0.5) / (df + 0.5));
}

function termId(term: string): number {
  // FNV-1a, 32-bit, unsigned — stable across runs and processes.
  let h = 0x811c9dc5;
  for (let i = 0; i < term.length; i++) {
    h ^= term.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface SparseVector {
  indices: number[];
  values: number[];
}

export function encodeChunkSparse(haystack: string): SparseVector {
  const terms = tokenize(haystack);
  const tf = new Map<string, number>();
  for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
  const indices: number[] = [];
  const values: number[] = [];
  for (const [term, f] of tf) {
    const denom = f + BM25_K1 * (1 - BM25_B + (BM25_B * terms.length) / sparseAvgLen);
    const w = sparseIdf(term) * ((f * (BM25_K1 + 1)) / denom);
    if (w <= 0) continue;
    indices.push(termId(term));
    values.push(Number(w.toFixed(6)));
  }
  return { indices, values };
}

export function encodeQuerySparse(question: string): SparseVector {
  const qSet = new Set(tokenize(question));
  const indices: number[] = [];
  const values: number[] = [];
  for (const term of qSet) {
    const w = sparseIdf(term);
    if (w <= 0) continue;
    indices.push(termId(term));
    values.push(Number(w.toFixed(6)));
  }
  return { indices, values };
}

// ── Collection lifecycle ─────────────────────────────────────────────────────

export interface ChunkPayload {
  chunkId: string;
  docId: string;
  category: "A" | "B" | "E";
  confidentiality: Clearance;
  areas: Area[];
  country: string;
  brand: string;
  quarter: string;
  type: string;
  validity: string;
  axisIds: string[];
  topics: string[];
  taxonomyVersion: number;
  [key: string]: unknown;
}

export async function ensureCollection(): Promise<void> {
  const exists = await qdrant<{ exists: boolean }>(
    "GET",
    `/collections/${QDRANT_COLLECTION}/exists`,
  );
  if (exists.exists) return;
  await qdrant("PUT", `/collections/${QDRANT_COLLECTION}`, {
    vectors: { dense: { size: DENSE_SIZE, distance: "Cosine" } },
    sparse_vectors: { sparse: {} },
  });
  const indexFields: { name: string; schema: string }[] = [
    { name: "chunkId", schema: "keyword" },
    { name: "docId", schema: "keyword" },
    { name: "category", schema: "keyword" },
    { name: "confidentiality", schema: "keyword" },
    { name: "areas", schema: "keyword" },
    { name: "country", schema: "keyword" },
    { name: "brand", schema: "keyword" },
    { name: "quarter", schema: "keyword" },
    { name: "type", schema: "keyword" },
    { name: "validity", schema: "keyword" },
    { name: "axisIds", schema: "keyword" },
  ];
  for (const f of indexFields) {
    await qdrant("PUT", `/collections/${QDRANT_COLLECTION}/index`, {
      field_name: f.name,
      field_schema: f.schema,
    });
  }
}

// Stable numeric point id from the chunk id, so re-seeding upserts in place
// (idempotent) instead of duplicating points.
export function pointIdFor(chunkId: string): number {
  // 52-bit hash (two FNV passes) — safe integer, collision-free at our scale.
  const a = termId(chunkId);
  const b = termId(`${chunkId}#salt`) & 0xfffff;
  return a * 0x100000 + b;
}

export interface UpsertChunk {
  chunkId: string;
  payload: ChunkPayload;
  embedText: string;
}

// Anti-fakeness instrumentation: this counter increments ONLY here, on the
// single code path where dense embeddings are computed (cloud inference at
// upsert time). Re-tagging goes through set_payload and must never move it.
let embedCallCount = 0;

export function getEmbedCallCount(): number {
  return embedCallCount;
}

export async function upsertChunks(chunks: UpsertChunk[]): Promise<void> {
  const points = chunks.map((c) => ({
    id: pointIdFor(c.chunkId),
    vector: {
      dense: { text: c.embedText, model: DENSE_MODEL },
      sparse: encodeChunkSparse(c.embedText),
    },
    payload: c.payload,
  }));
  embedCallCount += points.length;
  await qdrant("PUT", `/collections/${QDRANT_COLLECTION}/points?wait=true`, { points });
}

// Live-ingested (B channel) documents carry their full governed document in
// the point payload, so a restarted server can rebuild its in-memory corpus
// from the persistent index — Qdrant is the durable store for live docs.
export async function ensureLiveFieldIndex(): Promise<void> {
  try {
    await qdrant("PUT", `/collections/${QDRANT_COLLECTION}/index`, {
      field_name: "live",
      field_schema: "bool",
    });
  } catch (err) {
    if (!String(err).toLowerCase().includes("already exists")) throw err;
  }
}

export async function scrollLivePayloads(): Promise<Record<string, unknown>[]> {
  const payloads: Record<string, unknown>[] = [];
  let offset: unknown = undefined;
  for (;;) {
    const page = await qdrant<{
      points: { payload?: Record<string, unknown> }[];
      next_page_offset?: unknown;
    }>("POST", `/collections/${QDRANT_COLLECTION}/points/scroll`, {
      filter: { must: [{ key: "live", match: { value: true } }] },
      with_payload: true,
      with_vector: false,
      limit: 256,
      offset,
    });
    for (const p of page.points ?? []) {
      if (p.payload) payloads.push(p.payload);
    }
    if (!page.next_page_offset) break;
    offset = page.next_page_offset;
  }
  return payloads;
}
export interface CollectionStatus {
  pointsCount: number;
  status: string;
}

export async function collectionStatus(): Promise<CollectionStatus> {
  const info = await qdrant<{ points_count: number; status: string }>(
    "GET",
    `/collections/${QDRANT_COLLECTION}`,
  );
  return { pointsCount: info.points_count, status: info.status };
}

// ── Governance filter (early binding) ────────────────────────────────────────
//
// The subject's clearance and area become payload conditions in the query
// itself. `allowedFilter` admits exactly the documents resolveDocAccess would
// admit; `blockedFilter` is its complement, used only to LABEL a refusal
// (permission_blocked) — blocked hits are mapped to ids, never to snippets.

interface QdrantCondition {
  [key: string]: unknown;
}

function clearanceCondition(clearance: Clearance): QdrantCondition {
  const allowed = (Object.keys(CLEARANCE_RANK) as Clearance[]).filter(
    (c) => CLEARANCE_RANK[c] <= CLEARANCE_RANK[clearance],
  );
  return { key: "confidentiality", match: { any: allowed } };
}

function areaCondition(area: Area): QdrantCondition {
  return {
    should: [
      { is_empty: { key: "areas" } },
      { key: "areas", match: { value: area } },
    ],
  };
}

export function allowedFilter(clearance: Clearance, area: Area | null): QdrantCondition {
  const must: QdrantCondition[] = [clearanceCondition(clearance)];
  if (area) must.push(areaCondition(area));
  return { must };
}

function blockedFilter(clearance: Clearance, area: Area | null): QdrantCondition {
  return { must_not: [allowedFilter(clearance, area)] };
}

export interface DeterministicFilters {
  market?: string | null;
  brand?: string | null;
  period?: string | null;
  source?: string | null;
  axis?: string | null;
}

function deterministicConditions(f?: DeterministicFilters | null): QdrantCondition[] {
  if (!f) return [];
  const conds: QdrantCondition[] = [];
  if (f.market) conds.push({ key: "country", match: { value: f.market } });
  if (f.brand) conds.push({ key: "brand", match: { value: f.brand } });
  if (f.period) conds.push({ key: "quarter", match: { value: f.period } });
  if (f.source) conds.push({ key: "type", match: { value: f.source } });
  if (f.axis) conds.push({ key: "axisIds", match: { value: f.axis } });
  return conds;
}

// ── Hybrid query (dense + sparse, RRF fusion, filters inside the search) ────

export interface QdrantHit {
  chunkId: string;
  docId: string;
  score: number;
}

interface RawHit {
  payload?: { chunkId?: string; docId?: string };
  score: number;
}

async function hybridQuery(
  question: string,
  filter: QdrantCondition,
  limit: number,
): Promise<QdrantHit[]> {
  const sparse = encodeQuerySparse(question);
  const prefetch: unknown[] = [
    {
      query: { nearest: { text: question, model: DENSE_MODEL } },
      using: "dense",
      filter,
      limit: limit * 3,
    },
  ];
  if (sparse.indices.length > 0) {
    prefetch.push({
      query: { nearest: sparse },
      using: "sparse",
      filter,
      limit: limit * 3,
    });
  }
  const result = await qdrant<{ points: RawHit[] }>(
    "POST",
    `/collections/${QDRANT_COLLECTION}/points/query`,
    {
      prefetch,
      query: { fusion: "rrf" },
      filter,
      limit,
      with_payload: ["chunkId", "docId"],
    },
  );
  return (result.points ?? [])
    .filter((p) => p.payload?.chunkId && p.payload?.docId)
    .map((p) => ({
      chunkId: p.payload!.chunkId!,
      docId: p.payload!.docId!,
      score: p.score,
    }));
}

export interface QdrantRetrieval {
  permitted: QdrantHit[];
  // Chunks that MATCHED the question but were excluded by the governance
  // filter. Ids only — used to classify a refusal, never to build context.
  blocked: QdrantHit[];
}

export async function qdrantRetrieve(opts: {
  question: string;
  clearance: Clearance;
  area: Area | null;
  filters?: DeterministicFilters | null;
  limit: number;
}): Promise<QdrantRetrieval> {
  const det = deterministicConditions(opts.filters);
  const allow = allowedFilter(opts.clearance, opts.area);
  const permittedFilter = {
    must: [...((allow.must as QdrantCondition[]) ?? []), ...det],
  };
  const blocked = {
    must: det,
    must_not: [allowedFilter(opts.clearance, opts.area)],
  };
  const [permitted, blockedHits] = await Promise.all([
    hybridQuery(opts.question, permittedFilter, opts.limit),
    hybridQuery(opts.question, blocked, opts.limit),
  ]);
  return { permitted, blocked: blockedHits };
}

// ── Re-tagging: metadata-only payload updates (never touches vectors) ───────

export interface RetagPayloadUpdate {
  docId: string;
  axisIds: string[];
  topics: string[];
}

export async function setDocPayloads(
  updates: RetagPayloadUpdate[],
  taxonomyVersion: number,
): Promise<void> {
  for (const u of updates) {
    await qdrant("POST", `/collections/${QDRANT_COLLECTION}/points/payload?wait=true`, {
      payload: { axisIds: u.axisIds, topics: u.topics, taxonomyVersion },
      filter: { must: [{ key: "docId", match: { value: u.docId } }] },
    });
  }
}

// Generic governance payload update for one document's points: confidentiality
// changes (source-sync deltas), validity changes (supersession) and liveDoc
// blob rewrites all go through here. Payload-only — vectors never recomputed.
export async function setDocGovernancePayload(
  docId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await qdrant("POST", `/collections/${QDRANT_COLLECTION}/points/payload?wait=true`, {
    payload,
    filter: { must: [{ key: "docId", match: { value: docId } }] },
  });
}

// ── Anti-fakeness instrumentation for the re-tag pipeline ───────────────────

export interface AxisDocAggregate {
  docId: string;
  axisIds: string[];
  topics: string[];
  pointCount: number;
}

export interface AxisScrollResult {
  docs: AxisDocAggregate[];
  totalPoints: number;
}

// Live mapping table: scroll the payload index for every point carrying the
// axis and aggregate per document. This is the ground truth the wizard shows —
// derived from Qdrant, not from any in-memory list.
export async function scrollDocsByAxis(axisId: string): Promise<AxisScrollResult> {
  const byDoc = new Map<string, AxisDocAggregate>();
  let totalPoints = 0;
  let offset: unknown = undefined;
  for (;;) {
    const page = await qdrant<{
      points: { payload?: { docId?: string; axisIds?: string[]; topics?: string[] } }[];
      next_page_offset?: unknown;
    }>("POST", `/collections/${QDRANT_COLLECTION}/points/scroll`, {
      filter: { must: [{ key: "axisIds", match: { value: axisId } }] },
      with_payload: ["docId", "axisIds", "topics"],
      with_vector: false,
      limit: 256,
      offset,
    });
    for (const p of page.points ?? []) {
      const docId = p.payload?.docId;
      if (!docId) continue;
      totalPoints += 1;
      const existing = byDoc.get(docId);
      if (existing) {
        existing.pointCount += 1;
      } else {
        byDoc.set(docId, {
          docId,
          axisIds: p.payload?.axisIds ?? [],
          topics: p.payload?.topics ?? [],
          pointCount: 1,
        });
      }
    }
    if (!page.next_page_offset) break;
    offset = page.next_page_offset;
  }
  return { docs: [...byDoc.values()], totalPoints };
}

export interface DocVectorHash {
  pointCount: number;
  hash: string;
}

// FNV-1a over the concatenated dense vectors of ALL points of a document,
// sorted by point id so the hash is order-stable. Identical hashes before and
// after a re-tag prove set_payload did not touch a single stored vector.
export async function vectorHashForDoc(docId: string): Promise<DocVectorHash> {
  const points: { id: number; dense: number[] }[] = [];
  let offset: unknown = undefined;
  for (;;) {
    const page = await qdrant<{
      points: { id: number; vector?: { dense?: number[] } }[];
      next_page_offset?: unknown;
    }>("POST", `/collections/${QDRANT_COLLECTION}/points/scroll`, {
      filter: { must: [{ key: "docId", match: { value: docId } }] },
      with_payload: false,
      with_vector: ["dense"],
      limit: 64,
      offset,
    });
    for (const p of page.points ?? []) {
      if (Array.isArray(p.vector?.dense)) {
        points.push({ id: p.id, dense: p.vector.dense });
      }
    }
    if (!page.next_page_offset) break;
    offset = page.next_page_offset;
  }
  points.sort((a, b) => a.id - b.id);
  let h = 0x811c9dc5;
  const mix = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  };
  let h2 = 0xcbf29ce4; // second lane for a 64-bit-ish hex digest
  const mix2 = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h2 ^= s.charCodeAt(i);
      h2 = Math.imul(h2, 0x01000197);
    }
  };
  for (const p of points) {
    const line = `${p.id}:${p.dense.map((v) => v.toFixed(6)).join(",")};`;
    mix(line);
    mix2(line);
  }
  const hash = `${(h >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
  return { pointCount: points.length, hash };
}

// Exact payload-filter count: how many points of this document currently
// carry this axis. Used to prove the retrieval filter genuinely flips when a
// re-tag is committed (before: >0, after: 0 — or the inverse for an add).
export async function countDocAxisPoints(docId: string, axisId: string): Promise<number> {
  const result = await qdrant<{ count: number }>(
    "POST",
    `/collections/${QDRANT_COLLECTION}/points/count`,
    {
      filter: {
        must: [
          { key: "docId", match: { value: docId } },
          { key: "axisIds", match: { value: axisId } },
        ],
      },
      exact: true,
    },
  );
  return result.count;
}
