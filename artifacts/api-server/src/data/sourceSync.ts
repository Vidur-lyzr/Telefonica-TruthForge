// D5 — simulated source-system synchronisation with ACL deltas.
//
// This module plays the role of an upstream document-management system (a
// SharePoint stand-in): each governed document has a confidentiality label in
// the SOURCE, and the retrieval index mirrors it. An operator can change the
// source label; the sync policy is asymmetric and fails closed:
//
//   - UPGRADES (more restrictive) propagate immediately — the "webhook" path.
//     The in-memory corpus doc and the vector-index payload are updated in the
//     same operation, so the document disappears for lower clearances at once.
//   - DOWNGRADES (less restrictive) become PENDING deltas that are only
//     applied when a batch sync run executes. Until then the index keeps the
//     stricter label — a document never becomes MORE visible without an
//     explicit, audited sync run.
//
// Persistence is a JSON file (no database, per project constraints). Applied
// deltas are replayed onto the in-memory corpus at boot, exactly like the
// taxonomy version store; deltas that target live-hydrated docs are re-applied
// after hydration via applyDeltasTo().

import fs from "node:fs";
import path from "node:path";
import {
  DOCS,
  AUDIT_LOG,
  CLEARANCE_RANK,
  getDoc,
  type Clearance,
  type CorpusDoc,
  type AuditEntry,
} from "./corpus";
import { isQdrantConfigured, setDocGovernancePayload } from "../adapters/qdrant";

export type DeltaKind = "upgrade" | "downgrade";
export type DeltaMode = "webhook" | "batch";

export interface SourceDelta {
  id: string;
  docId: string;
  docTitle: string;
  from: Clearance;
  to: Clearance;
  kind: DeltaKind;
  requestedAt: string;
  requestedBy: string;
  appliedAt: string | null;
  mode: DeltaMode | null;
}

export interface SyncRun {
  id: string;
  ranAt: string;
  actor: string;
  appliedCount: number;
}

interface SourceSyncFile {
  deltas: SourceDelta[];
  runs: SyncRun[];
  counter: number;
}

const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "source-sync.json");

export const CONNECTOR_NAME = "SharePoint DMS (simulated)";

let deltas: SourceDelta[] = [];
let runs: SyncRun[] = [];
let counter = 0;

function persist(): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.tmp`;
  fs.writeFileSync(
    tmp,
    JSON.stringify({ deltas, runs, counter } satisfies SourceSyncFile, null, 2),
    "utf8",
  );
  fs.renameSync(tmp, STORE_FILE);
}

// Boot: replay every APPLIED delta, in applied order, onto the in-memory
// corpus. Pending downgrades stay pending — they are configuration, not state.
{
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as SourceSyncFile;
    if (Array.isArray(parsed.deltas)) deltas = parsed.deltas;
    if (Array.isArray(parsed.runs)) runs = parsed.runs;
    if (typeof parsed.counter === "number") counter = parsed.counter;
  } catch {
    // First boot or unreadable file — no deltas yet.
  }
  const applied = deltas
    .filter((d) => d.appliedAt !== null)
    .sort((a, b) => (a.appliedAt ?? "").localeCompare(b.appliedAt ?? ""));
  for (const d of applied) {
    const doc = getDoc(d.docId);
    if (doc) doc.confidentiality = d.to;
  }
}

// Live-hydrated documents (published or live-ingested) arrive AFTER module
// init; any applied delta targeting them must be re-applied once they exist.
export function applyDeltasTo(doc: CorpusDoc): void {
  const applied = deltas
    .filter((d) => d.docId === doc.id && d.appliedAt !== null)
    .sort((a, b) => (a.appliedAt ?? "").localeCompare(b.appliedAt ?? ""));
  const last = applied[applied.length - 1];
  if (last) doc.confidentiality = last.to;
}

function pushAudit(entry: Omit<AuditEntry, "id" | "timestamp">): void {
  AUDIT_LOG.push({
    ...entry,
    id: `audit-sync-${Date.now()}-${AUDIT_LOG.length}`,
    timestamp: new Date().toISOString(),
  });
}

const VALID_CLEARANCES = Object.keys(CLEARANCE_RANK) as Clearance[];

export function isValidClearance(value: string): value is Clearance {
  return (VALID_CLEARANCES as string[]).includes(value);
}

export interface SetSourceLabelResult {
  ok: boolean;
  error?: string;
  code?: string;
  delta?: SourceDelta;
}

// The one write path for source-label changes. Upgrades touch the vector
// index BEFORE the in-memory corpus: if the payload update fails, nothing has
// changed anywhere and the error is surfaced — never a half-applied upgrade.
export async function setSourceLabel(
  docId: string,
  to: Clearance,
  actor: string,
): Promise<SetSourceLabelResult> {
  const doc = getDoc(docId);
  if (!doc) {
    return { ok: false, error: "Unknown document.", code: "unknown_document" };
  }
  const pendingForDoc = deltas.find((d) => d.docId === docId && d.appliedAt === null);
  const sourceLabel = pendingForDoc?.to ?? doc.confidentiality;
  if (to === sourceLabel) {
    return {
      ok: false,
      error: `The source label for this document is already "${to}".`,
      code: "label_unchanged",
    };
  }

  const from = doc.confidentiality;
  const kind: DeltaKind = CLEARANCE_RANK[to] > CLEARANCE_RANK[from] ? "upgrade" : "downgrade";
  counter += 1;
  const delta: SourceDelta = {
    id: `delta-${Date.now()}-${counter}`,
    docId,
    docTitle: doc.title,
    from,
    to,
    kind,
    requestedAt: new Date().toISOString(),
    requestedBy: actor,
    appliedAt: null,
    mode: null,
  };

  // Any previous pending delta for this doc is superseded by the new label.
  deltas = deltas.filter((d) => !(d.docId === docId && d.appliedAt === null));

  if (kind === "upgrade") {
    if (isQdrantConfigured()) {
      await setDocGovernancePayload(docId, { confidentiality: to });
    }
    doc.confidentiality = to;
    delta.appliedAt = new Date().toISOString();
    delta.mode = "webhook";
    pushAudit({
      actor,
      action: "Source label upgrade propagated",
      target: doc.title,
      kind: "permission",
      detail: `Source system reclassified "${doc.title}" from "${from}" to "${to}". Upgrade applied immediately (webhook path): corpus and vector index updated in the same operation — the document is no longer visible below the new tier.`,
    });
  } else {
    pushAudit({
      actor,
      action: "Source label downgrade queued",
      target: doc.title,
      kind: "permission",
      detail: `Source system reclassified "${doc.title}" from "${from}" to "${to}". Downgrade held as a pending delta (fail closed): the index keeps the stricter label until a batch sync run applies it.`,
    });
  }

  deltas.push(delta);
  persist();
  return { ok: true, delta };
}

export interface BatchSyncResult {
  run: SyncRun;
  applied: SourceDelta[];
}

// Batch path: apply every pending downgrade. Vector index first, memory
// second, same fail-closed ordering as upgrades.
export async function runBatchSync(actor: string): Promise<BatchSyncResult> {
  const pending = deltas.filter((d) => d.appliedAt === null);
  const applied: SourceDelta[] = [];
  for (const d of pending) {
    const doc = getDoc(d.docId);
    if (!doc) continue;
    if (isQdrantConfigured()) {
      await setDocGovernancePayload(d.docId, { confidentiality: d.to });
    }
    doc.confidentiality = d.to;
    d.appliedAt = new Date().toISOString();
    d.mode = "batch";
    applied.push(d);
    pushAudit({
      actor,
      action: "Source label downgrade applied by batch sync",
      target: doc.title,
      kind: "permission",
      detail: `Batch sync applied the pending delta on "${doc.title}": "${d.from}" to "${d.to}". Corpus and vector index updated together.`,
    });
  }
  counter += 1;
  const run: SyncRun = {
    id: `syncrun-${Date.now()}-${counter}`,
    ranAt: new Date().toISOString(),
    actor,
    appliedCount: applied.length,
  };
  runs.push(run);
  persist();
  return { run, applied };
}

export interface SourceSyncDocState {
  docId: string;
  title: string;
  type: string;
  category: string;
  indexLabel: Clearance;
  sourceLabel: Clearance;
  pending: boolean;
}

export interface SourceSyncState {
  connector: string;
  docs: SourceSyncDocState[];
  pendingDeltas: SourceDelta[];
  appliedDeltas: SourceDelta[];
  runs: SyncRun[];
}

export function getSourceSyncState(): SourceSyncState {
  const pendingByDoc = new Map(
    deltas.filter((d) => d.appliedAt === null).map((d) => [d.docId, d]),
  );
  const docs: SourceSyncDocState[] = DOCS.map((d) => {
    const pending = pendingByDoc.get(d.id);
    return {
      docId: d.id,
      title: d.title,
      type: d.type,
      category: d.category,
      indexLabel: d.confidentiality,
      sourceLabel: pending?.to ?? d.confidentiality,
      pending: Boolean(pending),
    };
  });
  return {
    connector: CONNECTOR_NAME,
    docs,
    pendingDeltas: deltas.filter((d) => d.appliedAt === null),
    appliedDeltas: deltas
      .filter((d) => d.appliedAt !== null)
      .sort((a, b) => (b.appliedAt ?? "").localeCompare(a.appliedAt ?? "")),
    runs: [...runs].sort((a, b) => b.ranAt.localeCompare(a.ranAt)),
  };
}
