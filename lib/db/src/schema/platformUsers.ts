import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Admin-managed platform users (G1 + I2). One row per user; the full
 * ManagedUser record (name, area, clearance, profileIds...) lives in
 * `data` — the API server owns that shape and validates it with Zod.
 * Seeded from the corpus snapshot on first boot (empty table).
 */
export const platformUsers = pgTable(
  "platform_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    data: jsonb("data").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("platform_users_email_idx").on(t.email)],
);

export type PlatformUserRow = typeof platformUsers.$inferSelect;
