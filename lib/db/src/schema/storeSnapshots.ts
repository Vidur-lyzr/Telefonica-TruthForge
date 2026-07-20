import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Generic JSONB snapshot persistence for the low-churn admin stores
 * (generate, governance, kpi, planning, quality, source-sync, template
 * overrides, usage meter). One row per store, last-writer-wins — admin
 * edits are rare and single-writer in practice. Append-heavy or
 * enforcement-critical data (observatory, retrieval log, user usage)
 * gets real row-per-record tables instead.
 */
export const storeSnapshots = pgTable("store_snapshots", {
  storeName: text("store_name").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StoreSnapshot = typeof storeSnapshots.$inferSelect;
