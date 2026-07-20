// F3 — per-query retrieval audit log. Every governed retrieval (Ask and
// Generate) appends an entry recording WHO asked (persona), WHAT filter was
// in force (clearance ceiling, area scope, deterministic filters), WHICH
// chunks came back (ids and scores only — never text), and the final outcome
// the agent decided. This is the layer that answers "who accessed document X,
// when, and under which permission set".
//
// The log is recorded at the retrieval adapter boundary — the single choke
// point every surface goes through — because the vector store itself has no
// per-query audit facility. Retrieval is on the hot path of every question,
// so the WRITE side never blocks on I/O: turns are built synchronously in a
// small in-memory working set and a debounced serialized flush upserts each
// dirty turn as one retrieval_log row. READS query the database, so the audit
// trail survives restarts and is shared across autoscale instances.

import { db, retrievalLog } from "@workspace/db";
import { and, desc, eq, sql, inArray, isNotNull, type SQL } from "drizzle-orm";
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

/** In-memory working-set cap; DB rows are the durable, unbounded history. */
const MAX_ENTRIES = 1000;
const MAX_QUERY_CHARS = 120;

// Newest entries LAST in memory. This is only the working set for turns
// recorded by THIS instance since boot — the durable log lives in Postgres.
let entries: RetrievalLogEntry[] = [];
let counter = 0;
// Per-boot suffix so ids from concurrent autoscale instances cannot collide.
const INSTANCE_TAG = Math.random().toString(36).slice(2, 8);

const dirtyIds = new Set<string>();
let flushTimer: NodeJS.Timeout | null = null;
let inFlight: Promise<void> | null = null;

type LogRow = typeof retrievalLog.$inferSelect;

function entryFromRow(r: LogRow): RetrievalLogEntry {
  return {
    id: r.id,
    timestamp: r.ts.toISOString(),
    surface: r.surface as RetrievalSurface,
    roleId: r.roleId,
    roleLabel: r.roleLabel,
    clearance: r.clearance,
    area: r.area,
    status: r.status,
    events: r.events ?? [],
  };
}

async function flushWrite(): Promise<void> {
  while (dirtyIds.size > 0) {
    const ids = [...dirtyIds];
    dirtyIds.clear();
    try {
      for (const id of ids) {
        const entry = entries.find((e) => e.id === id);
        if (!entry) continue;
        await db
          .insert(retrievalLog)
          .values({
            id: entry.id,
            ts: new Date(entry.timestamp),
            surface: entry.surface,
            roleId: entry.roleId,
            roleLabel: entry.roleLabel,
            clearance: entry.clearance,
            area: entry.area,
            status: entry.status,
            events: entry.events,
          })
          .onConflictDoUpdate({
            target: retrievalLog.id,
            set: { status: sql`excluded.status`, events: sql`excluded.events` },
          });
      }
    } catch (err) {
      logger.error(
        { err },
        "retrieval log: persist failed — audit turns re-queued for the next flush",
      );
      for (const id of ids) dirtyIds.add(id);
      break;
    }
  }
  inFlight = null;
}

function scheduleFlush(): void {
  if (inFlight || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    inFlight = flushWrite();
  }, 500);
  // Never keep the process alive just to flush an audit write.
  flushTimer.unref?.();
}

// Also retries turns re-queued by a failed flush (which leaves no timer).
async function flushNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!inFlight && dirtyIds.size > 0) {
    inFlight = flushWrite();
  }
  while (inFlight) {
    await inFlight;
  }
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
  const id = `rlog-${Date.now()}-${INSTANCE_TAG}-${counter}`;
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
  dirtyIds.add(id);
  scheduleFlush();
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
  dirtyIds.add(auditId);
  scheduleFlush();
}

// Snapshot lookup for feedback records: the L2 loop stores the full trace of
// the audited turn so a report stays reproducible even after the rolling
// working set evicts the entry. Memory first (the common case — the turn just
// happened on this instance), then the database.
export async function getRetrievalAuditEntry(
  auditId: string,
): Promise<RetrievalLogEntry | undefined> {
  const local = entries.find((e) => e.id === auditId);
  if (local) return local;
  const rows = await db
    .select()
    .from(retrievalLog)
    .where(eq(retrievalLog.id, auditId))
    .limit(1);
  return rows.length > 0 ? entryFromRow(rows[0]) : undefined;
}

export function finalizeRetrievalAudit(auditId: string, status: string): void {
  const entry = entries.find((e) => e.id === auditId);
  if (!entry) return;
  entry.status = status;
  dirtyIds.add(auditId);
  scheduleFlush();
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

export async function queryRetrievalLog(q: RetrievalLogQuery): Promise<{
  total: number;
  items: RetrievalLogEntry[];
}> {
  await flushNow();
  // Fail closed: a bounded view with no allowed personas sees nothing.
  if (q.allowedRoleIds && q.allowedRoleIds.length === 0) {
    return { total: 0, items: [] };
  }
  const conditions: SQL[] = [];
  if (q.allowedRoleIds) {
    // Entries with no acting persona are hidden from a bounded view.
    conditions.push(isNotNull(retrievalLog.roleId));
    conditions.push(inArray(retrievalLog.roleId, q.allowedRoleIds));
  }
  if (q.docId) {
    // JSONB containment: any event with any hit on this doc id.
    conditions.push(
      sql`${retrievalLog.events} @> ${JSON.stringify([{ hits: [{ docId: q.docId }] }])}::jsonb`,
    );
  }
  if (q.roleId) conditions.push(eq(retrievalLog.roleId, q.roleId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = Math.max(q.offset ?? 0, 0);
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const [countRows, rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(retrievalLog)
      .where(where),
    db
      .select()
      .from(retrievalLog)
      .where(where)
      .orderBy(desc(retrievalLog.seq))
      .offset(offset)
      .limit(limit),
  ]);
  return { total: countRows[0]?.total ?? 0, items: rows.map(entryFromRow) };
}
