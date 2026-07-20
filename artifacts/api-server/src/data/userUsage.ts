// Per-user usage attribution & quotas — file-backed, like the other stores.
//
// Every metered Claude call is recorded here against the acting session's
// email (threaded through the usage context, never client-asserted) with the
// module and real input/output token counts. Alongside the per-call ledger,
// the store keeps monthly allocations: a default quota applies to every
// traced email, admins can override per user, and usage resets when the
// calendar month rolls over. Enforcement is PRE-MODEL: the metering
// chokepoint asks this store before any Claude call and refuses with a
// machine-readable code when the period allowance is spent.
//
// The existing per-module counters (usageMeter.ts) are untouched — the cost
// model keeps reading those.

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "../lib/logger";
import type { UsageModule } from "./usageMeter";

export const DEFAULT_MONTHLY_TOKEN_QUOTA = 500_000;
/** Fraction of the allocation at which the near-limit (amber) warning fires. */
export const QUOTA_WARNING_RATIO = 0.8;

const MAX_LEDGER_ENTRIES = 5000;

const STORE_PATH = join(process.cwd(), ".data", "user-usage.json");

export interface UsageLedgerEntry {
  id: string;
  ts: string;
  email: string;
  module: UsageModule;
  inputTokens: number;
  outputTokens: number;
}

interface UserPeriodUsage {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  lastActivityAt: string | null;
}

interface PersistedState {
  /** Current period, "YYYY-MM". Usage and ledger belong to this period. */
  period: string;
  /** Per-email allocation overrides; absent emails use the default. */
  allocations: Record<string, number>;
  usage: Record<string, UserPeriodUsage>;
  ledger: UsageLedgerEntry[];
  counter: number;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

let state: PersistedState = {
  period: currentPeriod(),
  allocations: {},
  usage: {},
  ledger: [],
  counter: 0,
};

function load(): void {
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<PersistedState>;
    state = {
      period: typeof raw.period === "string" ? raw.period : currentPeriod(),
      allocations:
        raw.allocations && typeof raw.allocations === "object" ? raw.allocations : {},
      usage: raw.usage && typeof raw.usage === "object" ? raw.usage : {},
      ledger: Array.isArray(raw.ledger) ? raw.ledger.slice(-MAX_LEDGER_ENTRIES) : [],
      counter: typeof raw.counter === "number" ? raw.counter : 0,
    };
    logger.info(
      { users: Object.keys(state.usage).length, period: state.period },
      "user usage store loaded from disk",
    );
  } catch (err) {
    logger.error({ err }, "user usage store could not be loaded; starting empty");
  }
}

function persist(): void {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(state), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (err) {
    logger.error({ err }, "user usage store could not be persisted");
  }
}

load();

// Monthly rollover: allocations survive, usage and ledger reset. Checked
// lazily on every read/write — no daemon needed.
function rolloverIfNeeded(): void {
  const now = currentPeriod();
  if (state.period === now) return;
  logger.info({ from: state.period, to: now }, "user usage: monthly period rollover");
  state.period = now;
  state.usage = {};
  state.ledger = [];
  persist();
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

export function getAllocation(email: string): number {
  const key = normalizeEmail(email);
  return state.allocations[key] ?? DEFAULT_MONTHLY_TOKEN_QUOTA;
}

function usedTokens(email: string): number {
  const u = state.usage[normalizeEmail(email)];
  return u ? u.inputTokens + u.outputTokens : 0;
}

/** Throws QuotaExceededError when the acting user's period allowance is spent. */
export function enforceQuota(email: string): void {
  rolloverIfNeeded();
  const used = usedTokens(email);
  const allocation = getAllocation(email);
  if (used >= allocation) {
    throw new QuotaExceededError(normalizeEmail(email), used, allocation);
  }
}

export function recordUserUsage(
  email: string,
  module: UsageModule,
  inputTokens: number,
  outputTokens: number,
): void {
  rolloverIfNeeded();
  const key = normalizeEmail(email);
  const input = Math.max(0, Math.round(inputTokens));
  const output = Math.max(0, Math.round(outputTokens));
  const now = new Date().toISOString();
  const u = state.usage[key] ?? {
    inputTokens: 0,
    outputTokens: 0,
    calls: 0,
    lastActivityAt: null,
  };
  u.inputTokens += input;
  u.outputTokens += output;
  u.calls += 1;
  u.lastActivityAt = now;
  state.usage[key] = u;
  state.counter += 1;
  state.ledger.push({
    id: `uu-${Date.now()}-${state.counter}`,
    ts: now,
    email: key,
    module,
    inputTokens: input,
    outputTokens: output,
  });
  if (state.ledger.length > MAX_LEDGER_ENTRIES) {
    state.ledger = state.ledger.slice(-MAX_LEDGER_ENTRIES);
  }
  persist();
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

export function summarizeUser(email: string): UserQuotaSummary {
  rolloverIfNeeded();
  const key = normalizeEmail(email);
  const u = state.usage[key];
  const allocation = getAllocation(key);
  const used = u ? u.inputTokens + u.outputTokens : 0;
  const quotaState: QuotaState =
    used >= allocation ? "exceeded" : used >= allocation * QUOTA_WARNING_RATIO ? "warning" : "ok";
  return {
    email: key,
    allocation,
    usedTokens: used,
    remainingTokens: Math.max(0, allocation - used),
    usedInputTokens: u?.inputTokens ?? 0,
    usedOutputTokens: u?.outputTokens ?? 0,
    calls: u?.calls ?? 0,
    quotaState,
    isDefaultAllocation: !(key in state.allocations),
    lastActivityAt: u?.lastActivityAt ?? null,
  };
}

export function getUsagePeriod(): string {
  rolloverIfNeeded();
  return state.period;
}

/** Every email with an allocation override or traced usage this period. */
export function tracedEmails(): string[] {
  rolloverIfNeeded();
  return [...new Set([...Object.keys(state.allocations), ...Object.keys(state.usage)])];
}

export interface UserModuleBreakdown {
  module: UsageModule;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export function getUserLedger(email: string): {
  entries: UsageLedgerEntry[];
  byModule: UserModuleBreakdown[];
} {
  rolloverIfNeeded();
  const key = normalizeEmail(email);
  const entries = state.ledger.filter((e) => e.email === key).reverse();
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

export function setAllocation(email: string, tokens: number): AllocationChange {
  rolloverIfNeeded();
  const key = normalizeEmail(email);
  const previous = getAllocation(key);
  state.allocations[key] = Math.max(0, Math.round(tokens));
  persist();
  return { email: key, previous, next: state.allocations[key] };
}

export interface UsageReset {
  email: string;
  clearedTokens: number;
  clearedCalls: number;
}

/** Clears the user's current-period usage and ledger entries. */
export function resetUserUsage(email: string): UsageReset {
  rolloverIfNeeded();
  const key = normalizeEmail(email);
  const u = state.usage[key];
  const clearedTokens = u ? u.inputTokens + u.outputTokens : 0;
  const clearedCalls = u?.calls ?? 0;
  delete state.usage[key];
  state.ledger = state.ledger.filter((e) => e.email !== key);
  persist();
  return { email: key, clearedTokens, clearedCalls };
}
