// Usage meter — file-backed, per-module counters of the Hub's own agent calls.
//
// Every Claude call the platform makes (Ask, Generate, KPIs, Planning, Wiki,
// Data curation) is recorded here with real token counts where the API reports
// them, or a character-based estimate (chars / 4) for runtimes that do not.
// The Administration cost model reads these counters to ground its usage
// block in the app's real consumption instead of invented figures.
//
// State is held in memory for sync reads and write-through persisted to the
// store_snapshots table so counters survive autoscale instance recycling.

import { logger } from "../lib/logger";
import { loadSnapshot, createSnapshotWriter } from "./dbSnapshot";

export type UsageModule =
  | "ask"
  | "generate"
  | "kpis"
  | "planning"
  | "wiki"
  | "data"
  | "brand";

export interface ModuleUsage {
  module: UsageModule;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  lastCallAt: string | null;
}

const MODULES: UsageModule[] = ["ask", "generate", "kpis", "planning", "wiki", "data", "brand"];

const STORE_NAME = "usage-meter";

interface PersistedState {
  since: string;
  modules: Partial<Record<UsageModule, Omit<ModuleUsage, "module">>>;
}

let since = new Date().toISOString();
const counters = new Map<UsageModule, Omit<ModuleUsage, "module">>();

function emptyCounter(): Omit<ModuleUsage, "module"> {
  return { calls: 0, inputTokens: 0, outputTokens: 0, lastCallAt: null };
}

const writer = createSnapshotWriter(STORE_NAME, (): PersistedState => ({
  since,
  modules: Object.fromEntries(counters) as PersistedState["modules"],
}));

export async function initUsageMeter(): Promise<void> {
  try {
    const raw = await loadSnapshot<Partial<PersistedState>>(STORE_NAME);
    if (!raw) return;
    if (typeof raw.since === "string") since = raw.since;
    for (const m of MODULES) {
      const c = raw.modules?.[m];
      if (c) {
        counters.set(m, {
          calls: c.calls ?? 0,
          inputTokens: c.inputTokens ?? 0,
          outputTokens: c.outputTokens ?? 0,
          lastCallAt: c.lastCallAt ?? null,
        });
      }
    }
    logger.info({ modules: counters.size }, "usage meter loaded from database");
  } catch (err) {
    logger.error({ err }, "usage meter could not be loaded; starting empty");
    counters.clear();
  }
}

function persist(): void {
  writer.schedule();
}

// Rough token estimate for text the API did not meter (about 4 chars/token).
export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

export function recordUsage(
  module: UsageModule,
  inputTokens: number,
  outputTokens: number,
): void {
  const c = counters.get(module) ?? emptyCounter();
  c.calls += 1;
  c.inputTokens += Math.max(0, Math.round(inputTokens));
  c.outputTokens += Math.max(0, Math.round(outputTokens));
  c.lastCallAt = new Date().toISOString();
  counters.set(module, c);
  persist();
}

export function getUsage(): { since: string; modules: ModuleUsage[] } {
  return {
    since,
    modules: MODULES.map((m) => ({
      module: m,
      ...(counters.get(m) ?? emptyCounter()),
    })),
  };
}
