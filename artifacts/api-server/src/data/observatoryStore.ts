// Observatory — platform-level audit & usage tracing, distinct from the F3
// retrieval log (which traces WHAT the engine retrieved). The Observatory
// answers WHO did WHAT on the platform: every login, page visit, question
// asked (with the answer that was shown, the persona in force and the
// governance outcome), every generation and export, and how long each
// session lasted.
//
// Two structures, now DB-authoritative:
//   - observatory_events   — append-only rows: login/logout/page_view/ask/
//                            generate/export/download/ingest/config_change.
//                            Heartbeats are NOT events — they only touch the
//                            session aggregate.
//   - observatory_sessions — per-sid aggregate rows: first/last activity and
//                            seconds spent per page, from the server clock.
//
// The WRITE path stays synchronous (recording an audit event must never slow
// a request): events queue in memory and sessions are mutated in an in-memory
// cache, then a debounced serialized flush inserts the event rows and upserts
// the dirty session rows. READS go to the database (after draining the
// queue), so audit history survives restarts and is shared across autoscale
// instances.

import { db, observatoryEvents, observatorySessions } from "@workspace/db";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

export type ObservatoryEventKind =
  | "login"
  | "logout"
  | "page_view"
  | "ask"
  | "generate"
  | "export"
  | "download"
  | "ingest"
  | "config_change";

export interface ObservatoryEventRecord {
  id: string;
  ts: string;
  sid: string;
  email: string;
  team: string;
  kind: ObservatoryEventKind;
  /** App page (route path) where the action happened, when known. */
  page: string | null;
  /** Persona/role in force for governed actions (ask/generate/export). */
  roleId: string | null;
  roleLabel: string | null;
  /** Question / prompt / document title, truncated. */
  summary: string | null;
  /** Response text shown to the user, truncated (ask only). */
  response: string | null;
  /** Governance outcome: answered / no_evidence / permission_blocked / ... */
  status: string | null;
  /** Cited/produced doc ids (ask citations, export doc ids). */
  docIds: string[];
  /** Link into the F3 retrieval log for the full trace. */
  retrievalAuditId: string | null;
  /** Extra detail: format, destination, language... small strings only. */
  detail: Record<string, string> | null;
}

export interface ObservatorySessionRecord {
  sid: string;
  email: string;
  team: string;
  firstSeenTs: string;
  lastSeenTs: string;
  /** Seconds of active time attributed per page path. */
  secondsByPage: Record<string, number>;
  /** Ordered unique page paths visited this session. */
  pagesVisited: string[];
  /** Page the user was last seen on — elapsed gaps are attributed to it. */
  lastPage?: string | null;
  endedTs: string | null;
}

/** Read-side cap: the overview aggregates over at most this many recent events. */
const MAX_EVENTS = 10000;
/** In-memory session cache cap (DB rows are never trimmed). */
const MAX_SESSIONS = 2000;
const MAX_SUMMARY_CHARS = 500;
const MAX_RESPONSE_CHARS = 4000;
/** A heartbeat/page event within this window counts as continuous activity. */
const ACTIVITY_WINDOW_MS = 90 * 1000;
/** Cap on distinct page keys per session — page is a client-sent string, so
 * without a cap one authenticated user could grow a session record without
 * bound. Overflow time buckets into "other". */
const MAX_PAGES_PER_SESSION = 50;

// In-memory working set: sessions need their previous state for gap
// attribution, so the recent ones live here; events only pass through the
// pending queue on their way to the database.
let sessions: Record<string, ObservatorySessionRecord> = {};
let counter = 0;
// Per-boot suffix so ids from concurrent autoscale instances cannot collide
// even when they land in the same millisecond with the same counter value.
const INSTANCE_TAG = Math.random().toString(36).slice(2, 8);

const pendingEvents: ObservatoryEventRecord[] = [];
const dirtySids = new Set<string>();

/** Loads recent sessions into the cache — call once at boot, before listen. */
export async function initObservatory(): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(observatorySessions)
      .orderBy(desc(observatorySessions.lastSeenTs))
      .limit(MAX_SESSIONS);
    sessions = {};
    for (const r of rows) sessions[r.sid] = sessionFromRow(r);
    logger.info({ sessions: rows.length }, "observatory: session cache loaded from db");
  } catch (err) {
    logger.error({ err }, "observatory: session cache load failed — starting empty");
    sessions = {};
  }
}

type SessionRow = typeof observatorySessions.$inferSelect;
type EventRow = typeof observatoryEvents.$inferSelect;

function sessionFromRow(r: SessionRow): ObservatorySessionRecord {
  return {
    sid: r.sid,
    email: r.email,
    team: r.team,
    firstSeenTs: r.firstSeenTs.toISOString(),
    lastSeenTs: r.lastSeenTs.toISOString(),
    secondsByPage: r.secondsByPage ?? {},
    pagesVisited: r.pagesVisited ?? [],
    lastPage: r.lastPage,
    endedTs: r.endedTs ? r.endedTs.toISOString() : null,
  };
}

function eventFromRow(r: EventRow): ObservatoryEventRecord {
  return {
    id: r.id,
    ts: r.ts.toISOString(),
    sid: r.sid,
    email: r.email,
    team: r.team,
    kind: r.kind as ObservatoryEventKind,
    page: r.page,
    roleId: r.roleId,
    roleLabel: r.roleLabel,
    summary: r.summary,
    response: r.response,
    status: r.status,
    docIds: r.docIds ?? [],
    retrievalAuditId: r.retrievalAuditId,
    detail: r.detail ?? null,
  };
}

// ---------------------------------------------------------------------------
// Debounced serialized flush — same discipline as the snapshot writer: at
// most one in-flight write, the drain loop re-checks the queues after each
// pass, and a failed batch is re-queued so audit records are never dropped
// silently (they retry on the next scheduled flush).

let flushTimer: NodeJS.Timeout | null = null;
let inFlight: Promise<void> | null = null;

async function flushWrite(): Promise<void> {
  while (pendingEvents.length > 0 || dirtySids.size > 0) {
    const eventsBatch = pendingEvents.splice(0);
    const sids = [...dirtySids];
    dirtySids.clear();
    try {
      if (eventsBatch.length > 0) {
        await db
          .insert(observatoryEvents)
          .values(
            eventsBatch.map((e) => ({
              id: e.id,
              ts: new Date(e.ts),
              sid: e.sid,
              email: e.email,
              team: e.team,
              kind: e.kind,
              page: e.page,
              roleId: e.roleId,
              roleLabel: e.roleLabel,
              summary: e.summary,
              response: e.response,
              status: e.status,
              docIds: e.docIds,
              retrievalAuditId: e.retrievalAuditId,
              detail: e.detail,
            })),
          )
          .onConflictDoNothing({ target: observatoryEvents.id });
      }
      for (const sid of sids) {
        const s = sessions[sid];
        if (!s) continue;
        await db
          .insert(observatorySessions)
          .values({
            sid: s.sid,
            email: s.email,
            team: s.team,
            firstSeenTs: new Date(s.firstSeenTs),
            lastSeenTs: new Date(s.lastSeenTs),
            secondsByPage: s.secondsByPage,
            pagesVisited: s.pagesVisited,
            lastPage: s.lastPage ?? null,
            endedTs: s.endedTs ? new Date(s.endedTs) : null,
          })
          .onConflictDoUpdate({
            target: observatorySessions.sid,
            set: {
              email: sql`excluded.email`,
              team: sql`excluded.team`,
              lastSeenTs: sql`excluded.last_seen_ts`,
              secondsByPage: sql`excluded.seconds_by_page`,
              pagesVisited: sql`excluded.pages_visited`,
              lastPage: sql`excluded.last_page`,
              endedTs: sql`excluded.ended_ts`,
            },
          });
      }
    } catch (err) {
      logger.error(
        { err },
        "observatory: persist failed — audit records re-queued for the next flush",
      );
      pendingEvents.unshift(...eventsBatch);
      for (const sid of sids) dirtySids.add(sid);
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
  flushTimer.unref?.();
}

/** Drains the write queue — reads call this so they see the latest records.
 * Also retries records re-queued by a failed flush (which leaves no timer). */
async function flushNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!inFlight && (pendingEvents.length > 0 || dirtySids.size > 0)) {
    inFlight = flushWrite();
  }
  while (inFlight) {
    await inFlight;
  }
}

function trimSessions(): void {
  const sids = Object.keys(sessions);
  if (sids.length <= MAX_SESSIONS) return;
  const sorted = sids.sort(
    (a, b) =>
      new Date(sessions[a]!.lastSeenTs).getTime() - new Date(sessions[b]!.lastSeenTs).getTime(),
  );
  for (const sid of sorted.slice(0, sids.length - MAX_SESSIONS)) {
    delete sessions[sid];
  }
}

export interface SessionIdentity {
  sid: string;
  email: string;
  team: string;
}

function touchSession(identity: SessionIdentity, page: string | null): void {
  const now = new Date();
  const nowTs = now.toISOString();
  let s = sessions[identity.sid];
  if (!s) {
    s = {
      sid: identity.sid,
      email: identity.email,
      team: identity.team,
      firstSeenTs: nowTs,
      lastSeenTs: nowTs,
      secondsByPage: {},
      pagesVisited: [],
      lastPage: null,
      endedTs: null,
    };
    sessions[identity.sid] = s;
    trimSessions();
  }
  const gapMs = now.getTime() - new Date(s.lastSeenTs).getTime();
  // Attribute the elapsed gap to the page the user was on DURING that gap —
  // i.e. the previous page, not the one they just arrived at. Server clock
  // only; gaps beyond the window count as idle and are dropped.
  const gapPage = s.lastPage ?? page;
  if (gapMs > 0 && gapMs <= ACTIVITY_WINDOW_MS && gapPage) {
    const key = bucketPage(s, gapPage);
    s.secondsByPage[key] = (s.secondsByPage[key] ?? 0) + Math.round(gapMs / 1000);
  }
  s.lastSeenTs = nowTs;
  if (page) {
    s.lastPage = page;
    if (!s.pagesVisited.includes(page) && s.pagesVisited.length < MAX_PAGES_PER_SESSION) {
      s.pagesVisited.push(page);
    }
  }
  dirtySids.add(identity.sid);
  scheduleFlush();
}

/** Returns the secondsByPage key for a page, bucketing overflow into "other". */
function bucketPage(s: ObservatorySessionRecord, page: string): string {
  if (page in s.secondsByPage) return page;
  return Object.keys(s.secondsByPage).length < MAX_PAGES_PER_SESSION ? page : "other";
}

export function recordHeartbeat(identity: SessionIdentity, page: string | null): void {
  touchSession(identity, page);
}

export interface RecordEventInput {
  identity: SessionIdentity;
  kind: ObservatoryEventKind;
  page?: string | null;
  roleId?: string | null;
  roleLabel?: string | null;
  summary?: string | null;
  response?: string | null;
  status?: string | null;
  docIds?: string[];
  retrievalAuditId?: string | null;
  detail?: Record<string, string> | null;
}

export function recordObservatoryEvent(input: RecordEventInput): void {
  counter += 1;
  pendingEvents.push({
    id: `obs-${Date.now()}-${INSTANCE_TAG}-${counter}`,
    ts: new Date().toISOString(),
    sid: input.identity.sid,
    email: input.identity.email,
    team: input.identity.team,
    kind: input.kind,
    page: input.page ?? null,
    roleId: input.roleId ?? null,
    roleLabel: input.roleLabel ?? null,
    summary: input.summary ? input.summary.slice(0, MAX_SUMMARY_CHARS) : null,
    response: input.response ? input.response.slice(0, MAX_RESPONSE_CHARS) : null,
    status: input.status ?? null,
    docIds: input.docIds ?? [],
    retrievalAuditId: input.retrievalAuditId ?? null,
    detail: input.detail ?? null,
  });
  touchSession(input.identity, input.page ?? null);
  if (input.kind === "logout") {
    const s = sessions[input.identity.sid];
    if (s) {
      s.endedTs = new Date().toISOString();
      dirtySids.add(s.sid);
    }
  }
  scheduleFlush();
}

// ---------------------------------------------------------------------------
// Read side (Observatory panel) — database queries, so every instance sees
// the full shared history.

export interface ObservatoryUserSummary {
  email: string;
  team: string;
  sessionCount: number;
  totalSeconds: number;
  lastSeenTs: string | null;
  askCount: number;
  generateCount: number;
  exportCount: number;
  ingestCount: number;
  changeCount: number;
  pageViewCount: number;
  blockedCount: number;
  topPages: { page: string; seconds: number }[];
}

export async function getObservatoryOverview(
  includeLyzr: boolean,
): Promise<ObservatoryUserSummary[]> {
  await flushNow();
  const [sessionRows, eventRows] = await Promise.all([
    db
      .select()
      .from(observatorySessions)
      .orderBy(desc(observatorySessions.lastSeenTs))
      .limit(MAX_SESSIONS * 5),
    db
      .select({
        email: observatoryEvents.email,
        team: observatoryEvents.team,
        kind: observatoryEvents.kind,
        status: observatoryEvents.status,
        ts: observatoryEvents.ts,
      })
      .from(observatoryEvents)
      .orderBy(desc(observatoryEvents.seq))
      .limit(MAX_EVENTS),
  ]);

  const byEmail = new Map<string, ObservatoryUserSummary>();
  const ensure = (email: string, team: string): ObservatoryUserSummary => {
    let u = byEmail.get(email);
    if (!u) {
      u = {
        email,
        team,
        sessionCount: 0,
        totalSeconds: 0,
        lastSeenTs: null,
        askCount: 0,
        generateCount: 0,
        exportCount: 0,
        ingestCount: 0,
        changeCount: 0,
        pageViewCount: 0,
        blockedCount: 0,
        topPages: [],
      };
      byEmail.set(email, u);
    }
    return u;
  };

  const pageSeconds = new Map<string, Map<string, number>>();
  for (const row of sessionRows) {
    if (!includeLyzr && row.team === "lyzr") continue;
    const s = sessionFromRow(row);
    const u = ensure(s.email, s.team);
    u.sessionCount += 1;
    let secs = 0;
    for (const [page, sec] of Object.entries(s.secondsByPage)) {
      secs += sec;
      let m = pageSeconds.get(s.email);
      if (!m) pageSeconds.set(s.email, (m = new Map()));
      m.set(page, (m.get(page) ?? 0) + sec);
    }
    u.totalSeconds += secs;
    if (!u.lastSeenTs || s.lastSeenTs > u.lastSeenTs) u.lastSeenTs = s.lastSeenTs;
  }
  for (const e of eventRows) {
    if (!includeLyzr && e.team === "lyzr") continue;
    const u = ensure(e.email, e.team);
    if (e.kind === "ask") u.askCount += 1;
    else if (e.kind === "generate") u.generateCount += 1;
    else if (e.kind === "export" || e.kind === "download") u.exportCount += 1;
    else if (e.kind === "ingest") u.ingestCount += 1;
    else if (e.kind === "config_change") u.changeCount += 1;
    else if (e.kind === "page_view") u.pageViewCount += 1;
    if (e.status === "permission_blocked") u.blockedCount += 1;
    const ts = e.ts.toISOString();
    if (!u.lastSeenTs || ts > u.lastSeenTs) u.lastSeenTs = ts;
  }
  for (const u of byEmail.values()) {
    const m = pageSeconds.get(u.email);
    if (m) {
      u.topPages = [...m.entries()]
        .map(([page, seconds]) => ({ page, seconds }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 5);
    }
  }
  return [...byEmail.values()].sort((a, b) =>
    (b.lastSeenTs ?? "").localeCompare(a.lastSeenTs ?? ""),
  );
}

export async function getObservatorySessions(
  email: string,
): Promise<ObservatorySessionRecord[]> {
  await flushNow();
  const rows = await db
    .select()
    .from(observatorySessions)
    .where(eq(observatorySessions.email, email))
    .orderBy(desc(observatorySessions.firstSeenTs))
    .limit(MAX_SESSIONS);
  return rows.map(sessionFromRow);
}

export interface ObservatoryEventsQuery {
  email?: string | null;
  sid?: string | null;
  kind?: ObservatoryEventKind | null;
  limit?: number;
  offset?: number;
}

export async function queryObservatoryEvents(q: ObservatoryEventsQuery): Promise<{
  total: number;
  items: ObservatoryEventRecord[];
}> {
  await flushNow();
  const conditions: SQL[] = [];
  if (q.email) conditions.push(eq(observatoryEvents.email, q.email));
  if (q.sid) conditions.push(eq(observatoryEvents.sid, q.sid));
  if (q.kind) conditions.push(eq(observatoryEvents.kind, q.kind));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = Math.max(q.offset ?? 0, 0);
  const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);
  const [countRows, rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(observatoryEvents)
      .where(where),
    db
      .select()
      .from(observatoryEvents)
      .where(where)
      .orderBy(desc(observatoryEvents.seq))
      .offset(offset)
      .limit(limit),
  ]);
  return { total: countRows[0]?.total ?? 0, items: rows.map(eventFromRow) };
}
