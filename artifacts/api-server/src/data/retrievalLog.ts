// F3 — per-query retrieval audit log. Every governed retrieval (Ask and
// Generate) appends an entry recording WHO asked (persona), WHAT filter was
// in force (clearance ceiling, area scope, deterministic filters), WHICH
// chunks came back (ids and scores only — never text), and the final outcome
// the agent decided. This is the layer that answers "who accessed document X,
// when, and under which permission set".
//
// The log is recorded at the retrieval adapter boundary — the single choke
// point every surface goes through — because the vector store itself has no
// per-query audit facility. Entries are capped and persisted to a JSON file
// (no database, per project constraints) with a debounced writer: retrieval
// is on the hot path of every question, so we never block it on disk I/O.

import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger";

export type RetrievalSurface = "ask" | "generate";

export interface RetrievalLogHit {
  chunkId: string;
  docId: string;
  score: number;
  accessible: boolean;
}

export interface RetrievalLogEvent {
  engine: "qdrant" | "native";
  query: string;
  filterExpr: string;
  hits: RetrievalLogHit[];
}

export interface RetrievalLogEntry {
  id: string;
  timestamp: string;
  surface: RetrievalSurface;
  roleId: string | null;
  roleLabel: string | null;
  clearance: string;
  area: string | null;
  status: string | null;
  events: RetrievalLogEvent[];
}

const MAX_ENTRIES = 1000;
const MAX_QUERY_CHARS = 120;

const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "retrieval-log.json");

// Newest entries LAST in memory; reversed on read.
let entries: RetrievalLogEntry[] = [];
let counter = 0;

{
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as { entries?: RetrievalLogEntry[]; counter?: number };
    if (Array.isArray(parsed.entries)) entries = parsed.entries.slice(-MAX_ENTRIES);
    if (typeof parsed.counter === "number") counter = parsed.counter;
  } catch {
    // First boot or unreadable file — start empty.
  }
}

let persistTimer: NodeJS.Timeout | null = null;

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      fs.mkdirSync(STORE_DIR, { recursive: true });
      const tmp = `${STORE_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ entries, counter }), "utf8");
      fs.renameSync(tmp, STORE_FILE);
    } catch (err) {
      logger.error({ err }, "retrieval log: persist failed — audit entries remain in memory only");
    }
  }, 500);
  // Never keep the process alive just to flush an audit write.
  persistTimer.unref?.();
}

export interface BeginRetrievalAuditInput {
  surface: RetrievalSurface;
  roleId: string | null;
  roleLabel: string | null;
  clearance: string;
  area: string | null;
}

export function beginRetrievalAudit(input: BeginRetrievalAuditInput): string {
  counter += 1;
  const id = `rlog-${Date.now()}-${counter}`;
  entries.push({
    id,
    timestamp: new Date().toISOString(),
    surface: input.surface,
    roleId: input.roleId,
    roleLabel: input.roleLabel,
    clearance: input.clearance,
    area: input.area,
    status: null,
    events: [],
  });
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
  schedulePersist();
  return id;
}

export function recordRetrievalEvent(
  auditId: string,
  event: {
    engine: "qdrant" | "native";
    query: string;
    filterExpr: string;
    hits: RetrievalLogHit[];
  },
): void {
  const entry = entries.find((e) => e.id === auditId);
  if (!entry) return;
  entry.events.push({
    engine: event.engine,
    query: event.query.slice(0, MAX_QUERY_CHARS),
    filterExpr: event.filterExpr,
    hits: event.hits,
  });
  schedulePersist();
}

// Snapshot lookup for feedback records: the L2 loop stores the full trace of
// the audited turn so a report stays reproducible even after the rolling log
// evicts the entry.
export function getRetrievalAuditEntry(auditId: string): RetrievalLogEntry | undefined {
  return entries.find((e) => e.id === auditId);
}

export function finalizeRetrievalAudit(auditId: string, status: string): void {
  const entry = entries.find((e) => e.id === auditId);
  if (!entry) return;
  entry.status = status;
  schedulePersist();
}

export interface RetrievalLogQuery {
  docId?: string | null;
  roleId?: string | null;
  limit?: number;
  offset?: number;
  /**
   * Governance bound applied BEFORE pagination: when set, only entries whose
   * acting persona is in this set are visible (partial view_audit — an area
   * admin sees only retrievals made by personas of their own area).
   */
  allowedRoleIds?: string[];
}

export function queryRetrievalLog(q: RetrievalLogQuery): {
  total: number;
  items: RetrievalLogEntry[];
} {
  let filtered = [...entries].reverse(); // newest first
  if (q.allowedRoleIds) {
    const allowed = new Set(q.allowedRoleIds);
    // Fail closed: entries with no acting persona are hidden from a bounded view.
    filtered = filtered.filter((e) => e.roleId !== null && allowed.has(e.roleId));
  }
  if (q.docId) {
    filtered = filtered.filter((e) =>
      e.events.some((ev) => ev.hits.some((h) => h.docId === q.docId)),
    );
  }
  if (q.roleId) {
    filtered = filtered.filter((e) => e.roleId === q.roleId);
  }
  const total = filtered.length;
  const offset = Math.max(q.offset ?? 0, 0);
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  return { total, items: filtered.slice(offset, offset + limit) };
}
