// Observatory — platform-level audit & usage tracing, distinct from the F3
// retrieval log (which traces WHAT the engine retrieved). The Observatory
// answers WHO did WHAT on the platform: every login, page visit, question
// asked (with the answer that was shown, the persona in force and the
// governance outcome), every generation and export, and how long each
// session lasted.
//
// Two structures:
//   - events[]  — append-only, capped: login/logout/page_view/ask/generate/
//                 export/download. Heartbeats are NOT events (they would
//                 evict the meaningful ones) — they only touch the session
//                 aggregate.
//   - sessions  — per-sid aggregate: first/last activity and seconds spent
//                 per page, derived purely from the server clock.
//
// Persisted to a JSON file (no database, per project constraints) with the
// same debounced atomic writer the retrieval log uses.

import fs from "node:fs";
import path from "node:path";
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

const MAX_EVENTS = 10000;
const MAX_SESSIONS = 2000;
const MAX_SUMMARY_CHARS = 500;
const MAX_RESPONSE_CHARS = 4000;
/** A heartbeat/page event within this window counts as continuous activity. */
const ACTIVITY_WINDOW_MS = 90 * 1000;
/** Cap on distinct page keys per session — page is a client-sent string, so
 * without a cap one authenticated user could grow a session record without
 * bound. Overflow time buckets into "other". */
const MAX_PAGES_PER_SESSION = 50;

const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "observatory.json");

let events: ObservatoryEventRecord[] = [];
let sessions: Record<string, ObservatorySessionRecord> = {};
let counter = 0;

{
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as {
      events?: ObservatoryEventRecord[];
      sessions?: Record<string, ObservatorySessionRecord>;
      counter?: number;
    };
    if (Array.isArray(parsed.events)) events = parsed.events.slice(-MAX_EVENTS);
    if (parsed.sessions && typeof parsed.sessions === "object") sessions = parsed.sessions;
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
      fs.writeFileSync(tmp, JSON.stringify({ events, sessions, counter }), "utf8");
      fs.renameSync(tmp, STORE_FILE);
    } catch (err) {
      logger.error({ err }, "observatory: persist failed — audit events remain in memory only");
    }
  }, 500);
  persistTimer.unref?.();
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
  schedulePersist();
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
  events.push({
    id: `obs-${Date.now()}-${counter}`,
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
  if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
  touchSession(input.identity, input.page ?? null);
  if (input.kind === "logout") {
    const s = sessions[input.identity.sid];
    if (s) s.endedTs = new Date().toISOString();
  }
  schedulePersist();
}

// ---------------------------------------------------------------------------
// Read side (Observatory panel)

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

export function getObservatoryOverview(includeLyzr: boolean): ObservatoryUserSummary[] {
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
  for (const s of Object.values(sessions)) {
    if (!includeLyzr && s.team === "lyzr") continue;
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
  for (const e of events) {
    if (!includeLyzr && e.team === "lyzr") continue;
    const u = ensure(e.email, e.team);
    if (e.kind === "ask") u.askCount += 1;
    else if (e.kind === "generate") u.generateCount += 1;
    else if (e.kind === "export" || e.kind === "download") u.exportCount += 1;
    else if (e.kind === "ingest") u.ingestCount += 1;
    else if (e.kind === "config_change") u.changeCount += 1;
    else if (e.kind === "page_view") u.pageViewCount += 1;
    if (e.status === "permission_blocked") u.blockedCount += 1;
    if (!u.lastSeenTs || e.ts > u.lastSeenTs) u.lastSeenTs = e.ts;
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
  return [...byEmail.values()].sort((a, b) => (b.lastSeenTs ?? "").localeCompare(a.lastSeenTs ?? ""));
}

export function getObservatorySessions(email: string): ObservatorySessionRecord[] {
  return Object.values(sessions)
    .filter((s) => s.email === email)
    .sort((a, b) => b.firstSeenTs.localeCompare(a.firstSeenTs));
}

export interface ObservatoryEventsQuery {
  email?: string | null;
  sid?: string | null;
  kind?: ObservatoryEventKind | null;
  limit?: number;
  offset?: number;
}

export function queryObservatoryEvents(q: ObservatoryEventsQuery): {
  total: number;
  items: ObservatoryEventRecord[];
} {
  let filtered = [...events].reverse();
  if (q.email) filtered = filtered.filter((e) => e.email === q.email);
  if (q.sid) filtered = filtered.filter((e) => e.sid === q.sid);
  if (q.kind) filtered = filtered.filter((e) => e.kind === q.kind);
  const total = filtered.length;
  const offset = Math.max(q.offset ?? 0, 0);
  const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);
  return { total, items: filtered.slice(offset, offset + limit) };
}
