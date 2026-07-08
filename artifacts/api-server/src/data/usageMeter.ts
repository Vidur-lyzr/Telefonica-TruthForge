// Usage meter — file-backed, per-module counters of the Hub's own agent calls.
//
// Every Claude call the platform makes (Ask, Generate, KPIs, Planning, Wiki,
// Data curation) is recorded here with real token counts where the API reports
// them, or a character-based estimate (chars / 4) for runtimes that do not.
// The Administration cost model reads these counters to ground its usage
// block in the app's real consumption instead of invented figures.
//
// No database is used (project constraint): state is held in memory and
// persisted as a JSON snapshot on every record, mirroring planningStore.

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "../lib/logger";

export type UsageModule =
  | "ask"
  | "generate"
  | "kpis"
  | "planning"
  | "wiki"
  | "data";

export interface ModuleUsage {
  module: UsageModule;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  lastCallAt: string | null;
}

const MODULES: UsageModule[] = ["ask", "generate", "kpis", "planning", "wiki", "data"];

const STORE_PATH = join(process.cwd(), ".data", "usage-meter.json");

interface PersistedState {
  since: string;
  modules: Partial<Record<UsageModule, Omit<ModuleUsage, "module">>>;
}

let since = new Date().toISOString();
const counters = new Map<UsageModule, Omit<ModuleUsage, "module">>();

function emptyCounter(): Omit<ModuleUsage, "module"> {
  return { calls: 0, inputTokens: 0, outputTokens: 0, lastCallAt: null };
}

function load(): void {
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<PersistedState>;
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
    logger.info({ modules: counters.size }, "usage meter loaded from disk");
  } catch (err) {
    logger.error({ err }, "usage meter could not be loaded; starting empty");
    counters.clear();
  }
}

function persist(): void {
  try {
    const state: PersistedState = {
      since,
      modules: Object.fromEntries(counters) as PersistedState["modules"],
    };
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(state), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (err) {
    logger.error({ err }, "usage meter could not be persisted");
  }
}

load();

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
