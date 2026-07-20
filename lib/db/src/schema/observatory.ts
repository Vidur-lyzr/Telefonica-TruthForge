import {
  pgTable,
  text,
  jsonb,
  timestamp,
  bigserial,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Observatory audit events — append-only, one row per platform event
 * (login/logout/page_view/ask/generate/export/download/ingest/config_change).
 * Row-per-event so no audit record is ever lost to snapshot races across
 * autoscale instances. `id` is the application-level event id ("obs-...");
 * `seq` gives a stable global order for pagination.
 */
export const observatoryEvents = pgTable(
  "observatory_events",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    id: text("id").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    sid: text("sid").notNull(),
    email: text("email").notNull(),
    team: text("team").notNull(),
    kind: text("kind").notNull(),
    page: text("page"),
    roleId: text("role_id"),
    roleLabel: text("role_label"),
    summary: text("summary"),
    response: text("response"),
    status: text("status"),
    docIds: jsonb("doc_ids").$type<string[]>().notNull(),
    retrievalAuditId: text("retrieval_audit_id"),
    detail: jsonb("detail").$type<Record<string, string> | null>(),
  },
  (t) => [
    uniqueIndex("observatory_events_id_idx").on(t.id),
    index("observatory_events_ts_idx").on(t.ts),
    index("observatory_events_email_idx").on(t.email),
    index("observatory_events_kind_idx").on(t.kind),
  ],
);

/**
 * Observatory sessions — per-sid aggregate (first/last activity, active
 * seconds per page). Upserted on heartbeat via the debounced flush queue.
 */
export const observatorySessions = pgTable(
  "observatory_sessions",
  {
    sid: text("sid").primaryKey(),
    email: text("email").notNull(),
    team: text("team").notNull(),
    firstSeenTs: timestamp("first_seen_ts", { withTimezone: true }).notNull(),
    lastSeenTs: timestamp("last_seen_ts", { withTimezone: true }).notNull(),
    secondsByPage: jsonb("seconds_by_page").$type<Record<string, number>>().notNull(),
    pagesVisited: jsonb("pages_visited").$type<string[]>().notNull(),
    lastPage: text("last_page"),
    endedTs: timestamp("ended_ts", { withTimezone: true }),
  },
  (t) => [
    index("observatory_sessions_email_idx").on(t.email),
    index("observatory_sessions_last_seen_idx").on(t.lastSeenTs),
  ],
);

export type ObservatoryEventRow = typeof observatoryEvents.$inferSelect;
export type ObservatorySessionRow = typeof observatorySessions.$inferSelect;
