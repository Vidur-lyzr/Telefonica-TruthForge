// Approved extracted layouts — the runtime half of the visual layout
// registry. Every record is an admin-approved ExtractedLayoutSpec produced by
// the master-deck extraction pipeline; on load (and on every mutation) the
// spec is re-validated against the meta-schema and compiled, so a corrupt or
// stale snapshot row can never put a broken layout in front of the agent or
// the renderers — it is dropped with a log line instead.
//
// Low churn, admin-edited → JSONB snapshot persistence like the other admin
// stores. The store registers itself as the dynamic provider behind
// getVisualLayout()/visualLayoutCatalogue(), which consult it at call time.

import { logger } from "../lib/logger";
import { loadSnapshot, createSnapshotWriter } from "./dbSnapshot";
import {
  parseExtractedLayoutSpec,
  compileExtractedLayout,
  ExtractedLayoutError,
  type ExtractedLayoutSpec,
} from "../export/extractedLayouts";
import {
  registerDynamicLayoutProvider,
  type VisualLayoutDef,
} from "../export/visualLayouts";

const STORE_NAME = "extracted-layouts";

export interface ApprovedLayoutRecord {
  spec: ExtractedLayoutSpec;
  /** Intake job the spec came from ("manual" for hand-authored specs). */
  sourceJobId: string;
  approvedBy: string;
  approvedAt: string;
}

let records: Record<string, ApprovedLayoutRecord> = {};
// Compiled defs, rebuilt on every mutation — reads are hot (agent catalogue,
// slide resolution), mutations are rare.
let compiled: VisualLayoutDef[] = [];

const writer = createSnapshotWriter(STORE_NAME, () => ({ records }));

function recompile(): void {
  const out: VisualLayoutDef[] = [];
  for (const rec of Object.values(records)) {
    try {
      out.push(compileExtractedLayout(rec.spec));
    } catch (err) {
      logger.error({ err, layoutId: rec.spec.id }, "extracted-layouts: compile failed — layout skipped");
    }
  }
  compiled = out.sort((a, b) => a.id.localeCompare(b.id));
}

export async function initExtractedLayouts(): Promise<void> {
  // Register the provider unconditionally so approvals made after a failed
  // load still reach the registry.
  registerDynamicLayoutProvider(() => compiled);
  try {
    const raw = await loadSnapshot<{ records?: Record<string, unknown> }>(STORE_NAME);
    records = {};
    let dropped = 0;
    for (const [id, value] of Object.entries(raw?.records ?? {})) {
      const rec = value as Partial<ApprovedLayoutRecord> | null;
      try {
        const spec = parseExtractedLayoutSpec(rec?.spec);
        if (spec.id !== id) throw new ExtractedLayoutError("record key does not match spec id");
        records[id] = {
          spec,
          sourceJobId: typeof rec?.sourceJobId === "string" ? rec.sourceJobId : "manual",
          approvedBy: typeof rec?.approvedBy === "string" ? rec.approvedBy : "unknown",
          approvedAt:
            typeof rec?.approvedAt === "string" ? rec.approvedAt : new Date(0).toISOString(),
        };
      } catch (err) {
        dropped += 1;
        logger.error({ err, layoutId: id }, "extracted-layouts: invalid snapshot record dropped");
      }
    }
    recompile();
    logger.info(
      { layouts: compiled.length, dropped },
      "extracted-layouts: loaded",
    );
  } catch (err) {
    logger.error({ err }, "extracted-layouts: load failed — starting empty");
    records = {};
    recompile();
  }
}

/** Await any pending snapshot write (tests/scripts only). */
export async function flushExtractedLayouts(): Promise<void> {
  await writer.flush();
}

// ---- Reads --------------------------------------------------------------------

export function listApprovedLayouts(): ApprovedLayoutRecord[] {
  return Object.values(records).sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
}

export function getApprovedLayout(id: string): ApprovedLayoutRecord | undefined {
  return records[id];
}

// ---- Mutations ------------------------------------------------------------------

export interface ApproveLayoutInput {
  spec: unknown;
  sourceJobId: string;
  approvedBy: string;
}

/** Validate, compile and register an approved layout. Throws ExtractedLayoutError. */
export function approveExtractedLayout(input: ApproveLayoutInput): ApprovedLayoutRecord {
  const spec = parseExtractedLayoutSpec(input.spec);
  if (records[spec.id]) {
    // Same-job double-approves are rejected upstream by the proposal status
    // guard, so a collision here means a re-uploaded deck produced the same
    // deterministic id. Auto-uniquify instead of dead-ending the reviewer.
    let n = 2;
    while (records[`${spec.id}-${n}`]) n += 1;
    spec.id = `${spec.id}-${n}`;
  }
  // Compile BEFORE committing — a spec that validates but will not compile
  // must never enter the registry.
  compileExtractedLayout(spec);
  const rec: ApprovedLayoutRecord = {
    spec,
    sourceJobId: input.sourceJobId,
    approvedBy: input.approvedBy,
    approvedAt: new Date().toISOString(),
  };
  records[spec.id] = rec;
  recompile();
  writer.schedule();
  return rec;
}

export function removeExtractedLayout(id: string): ApprovedLayoutRecord {
  const rec = records[id];
  if (!rec) throw new ExtractedLayoutError("Unknown extracted layout.", "unknown_layout");
  delete records[id];
  recompile();
  writer.schedule();
  return rec;
}
