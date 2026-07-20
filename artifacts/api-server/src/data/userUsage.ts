// Per-user usage attribution & quotas — DB-authoritative.
//
// Every metered Claude call is recorded here against the acting session's
// email (threaded through the usage context, never client-asserted) with the
// module and real input/output token counts, as one usage_ledger ROW in
// Postgres. Enforcement is PRE-MODEL: the metering chokepoint asks this store
// before any Claude call and refuses with a machine-readable code when the
// period allowance is spent. Because the gate SUMs the ledger table directly,
// enforcement is correct across autoscale instances — a call recorded on one
// instance immediately counts against the quota seen by every other.
//
// The monthly rollover is purely logical: rows carry a "YYYY-MM" period
// column and every read scopes to the current period, so a new month starts
// at zero without deleting history. Allocation overrides live in the
// usage_allocations table and survive rollovers, exactly as before.
//
// The existing per-module counters (usageMeter.ts) are untouched — the cost
// model keeps reading those.

import { db, usageLedger, usageAllocations } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import type { UsageModule } from "./usageMeter";

export const DEFAULT_MONTHLY_TOKEN_QUOTA = 500_000;
/** Fraction of the allocation at which the near-limit (amber) warning fires. */
export const QUOTA_WARNING_RATIO = 0.8;

/** Detail view cap — the DB keeps full history; reads stay bounded. */
const MAX_LEDGER_ENTRIES = 5000;

export interface UsageLedgerEntry {
  id: string;
  ts: string;
  email: string;
  module: UsageModule;
  inputTokens: number;
  outputTokens: number;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class QuotaExceededError extends Error {
  readonly code = "quota_exceeded";
  readonly email: string;
  constructor(email: string, used: number, allocation: number) {
    super(
      `Monthly token quota exhausted (${used.toLocaleString("en-US")} of ${allocation.toLocaleString("en-US")} tokens used). Ask an administrator to raise the allocation or wait for the next period.`,
    );
    this.name = "QuotaExceededError";
    this.email = email;
  }
}

export function isQuotaError(err: unknown): err is QuotaExceededError {
  return err instanceof QuotaExceededError;
}

interface PeriodAggregate {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  lastActivityAt: string | null;
}

async function aggregateFor(key: string, period: string): Promise<PeriodAggregate> {
  const rows = await db
    .select({
      inputTokens: sql<number>`coalesce(sum(${usageLedger.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${usageLedger.outputTokens}), 0)::int`,
      calls: sql<number>`count(*)::int`,
      lastActivityAt: sql<string | null>`max(${usageLedger.ts})`,
    })
    .from(usageLedger)
    .where(and(eq(usageLedger.email, key), eq(usageLedger.period, period)));
  const r = rows[0];
  return {
    inputTokens: r?.inputTokens ?? 0,
    outputTokens: r?.outputTokens ?? 0,
    calls: r?.calls ?? 0,
    lastActivityAt: r?.lastActivityAt ? new Date(r.lastActivityAt).toISOString() : null,
  };
}

async function allocationRow(key: string): Promise<number | null> {
  const rows = await db
    .select({ tokens: usageAllocations.tokens })
    .from(usageAllocations)
    .where(eq(usageAllocations.email, key))
    .limit(1);
  return rows.length > 0 ? rows[0].tokens : null;
}

export async function getAllocation(email: string): Promise<number> {
  return (await allocationRow(normalizeEmail(email))) ?? DEFAULT_MONTHLY_TOKEN_QUOTA;
}

/** Throws QuotaExceededError when the acting user's period allowance is spent. */
export async function enforceQuota(email: string): Promise<void> {
  const key = normalizeEmail(email);
  const [agg, allocation] = await Promise.all([
    aggregateFor(key, currentPeriod()),
    getAllocation(key),
  ]);
  const used = agg.inputTokens + agg.outputTokens;
  if (used >= allocation) {
    throw new QuotaExceededError(key, used, allocation);
  }
}

export async function recordUserUsage(
  email: string,
  module: UsageModule,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  await db.insert(usageLedger).values({
    period: currentPeriod(),
    email: normalizeEmail(email),
    module,
    inputTokens: Math.max(0, Math.round(inputTokens)),
    outputTokens: Math.max(0, Math.round(outputTokens)),
  });
}

export type QuotaState = "ok" | "warning" | "exceeded";

export interface UserQuotaSummary {
  email: string;
  allocation: number;
  usedTokens: number;
  remainingTokens: number;
  usedInputTokens: number;
  usedOutputTokens: number;
  calls: number;
  quotaState: QuotaState;
  isDefaultAllocation: boolean;
  lastActivityAt: string | null;
}

export async function summarizeUser(email: string): Promise<UserQuotaSummary> {
  const key = normalizeEmail(email);
  const [agg, override] = await Promise.all([
    aggregateFor(key, currentPeriod()),
    allocationRow(key),
  ]);
  const allocation = override ?? DEFAULT_MONTHLY_TOKEN_QUOTA;
  const used = agg.inputTokens + agg.outputTokens;
  const quotaState: QuotaState =
    used >= allocation ? "exceeded" : used >= allocation * QUOTA_WARNING_RATIO ? "warning" : "ok";
  return {
    email: key,
    allocation,
    usedTokens: used,
    remainingTokens: Math.max(0, allocation - used),
    usedInputTokens: agg.inputTokens,
    usedOutputTokens: agg.outputTokens,
    calls: agg.calls,
    quotaState,
    isDefaultAllocation: override === null,
    lastActivityAt: agg.lastActivityAt,
  };
}

export function getUsagePeriod(): string {
  return currentPeriod();
}

/** Every email with an allocation override or traced usage this period. */
export async function tracedEmails(): Promise<string[]> {
  const [used, allocated] = await Promise.all([
    db
      .selectDistinct({ email: usageLedger.email })
      .from(usageLedger)
      .where(eq(usageLedger.period, currentPeriod())),
    db.select({ email: usageAllocations.email }).from(usageAllocations),
  ]);
  return [...new Set([...allocated.map((r) => r.email), ...used.map((r) => r.email)])];
}

export interface UserModuleBreakdown {
  module: UsageModule;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export async function getUserLedger(email: string): Promise<{
  entries: UsageLedgerEntry[];
  byModule: UserModuleBreakdown[];
}> {
  const key = normalizeEmail(email);
  const rows = await db
    .select()
    .from(usageLedger)
    .where(and(eq(usageLedger.email, key), eq(usageLedger.period, currentPeriod())))
    .orderBy(desc(usageLedger.ts), desc(usageLedger.id))
    .limit(MAX_LEDGER_ENTRIES);
  const entries: UsageLedgerEntry[] = rows.map((r) => ({
    id: `uu-${r.id}`,
    ts: r.ts.toISOString(),
    email: r.email,
    module: r.module as UsageModule,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
  }));
  const map = new Map<UsageModule, UserModuleBreakdown>();
  for (const e of entries) {
    const b = map.get(e.module) ?? {
      module: e.module,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    b.calls += 1;
    b.inputTokens += e.inputTokens;
    b.outputTokens += e.outputTokens;
    map.set(e.module, b);
  }
  const byModule = [...map.values()].sort(
    (a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens),
  );
  return { entries, byModule };
}

export interface AllocationChange {
  email: string;
  previous: number;
  next: number;
}

export async function setAllocation(email: string, tokens: number): Promise<AllocationChange> {
  const key = normalizeEmail(email);
  const previous = await getAllocation(key);
  const next = Math.max(0, Math.round(tokens));
  await db
    .insert(usageAllocations)
    .values({ email: key, tokens: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: usageAllocations.email,
      set: { tokens: sql`excluded.tokens`, updatedAt: sql`excluded.updated_at` },
    });
  return { email: key, previous, next };
}

export interface UsageReset {
  email: string;
  clearedTokens: number;
  clearedCalls: number;
}

/** Clears the user's current-period usage — deletes their period ledger rows. */
export async function resetUserUsage(email: string): Promise<UsageReset> {
  const key = normalizeEmail(email);
  const agg = await aggregateFor(key, currentPeriod());
  await db
    .delete(usageLedger)
    .where(and(eq(usageLedger.email, key), eq(usageLedger.period, currentPeriod())));
  return {
    email: key,
    clearedTokens: agg.inputTokens + agg.outputTokens,
    clearedCalls: agg.calls,
  };
}
