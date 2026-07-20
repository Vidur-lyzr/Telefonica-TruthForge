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
 * F3 retrieval audit log — one row per governed retrieval turn. The
 * per-engine events (query, filter expression, chunk hits with scores)
 * stay as a JSONB array: they are written once at turn time and always
 * read whole, never queried per-hit.
 */
export const retrievalLog = pgTable(
  "retrieval_log",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    id: text("id").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    surface: text("surface").notNull(),
    roleId: text("role_id"),
    roleLabel: text("role_label"),
    clearance: text("clearance").notNull(),
    area: text("area"),
    status: text("status"),
    events: jsonb("events")
      .$type<
        Array<{
          engine: "qdrant" | "native";
          query: string;
          filterExpr: string;
          hits: Array<{ chunkId: string; docId: string; score: number; accessible: boolean }>;
        }>
      >()
      .notNull(),
  },
  (t) => [
    uniqueIndex("retrieval_log_id_idx").on(t.id),
    index("retrieval_log_ts_idx").on(t.ts),
    index("retrieval_log_role_idx").on(t.roleId),
  ],
);

export type RetrievalLogRow = typeof retrievalLog.$inferSelect;
