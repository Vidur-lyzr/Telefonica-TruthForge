import {
  pgTable,
  text,
  integer,
  timestamp,
  bigserial,
  index,
} from "drizzle-orm/pg-core";

/**
 * Per-user usage ledger — one row per metered Claude call. The quota gate
 * SUMs this table for (email, period) so enforcement is correct across
 * autoscale instances; the monthly rollover is just a new `period` value
 * (no deletes needed).
 */
export const usageLedger = pgTable(
  "usage_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    /** Calendar month "YYYY-MM" the call belongs to. */
    period: text("period").notNull(),
    email: text("email").notNull(),
    module: text("module").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
  },
  (t) => [
    index("usage_ledger_period_email_idx").on(t.period, t.email),
    index("usage_ledger_ts_idx").on(t.ts),
  ],
);

/** Admin per-user monthly allocation overrides; absent rows use the default. */
export const usageAllocations = pgTable("usage_allocations", {
  email: text("email").primaryKey(),
  tokens: integer("tokens").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UsageLedgerRow = typeof usageLedger.$inferSelect;
export type UsageAllocationRow = typeof usageAllocations.$inferSelect;
