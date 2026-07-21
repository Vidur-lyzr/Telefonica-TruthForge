// Master-deck intake jobs — the working state of the deck-to-layout
// extraction pipeline. Each job tracks uploaded deck parts through
// parsing → clustering → proposing → ready, carrying the proposed layout
// families (draft ExtractedLayoutSpecs awaiting admin review) and the image
// harvest queue. Approval itself lives in extractedLayoutStore / the brand
// image library — this store only records what was proposed and decided.
//
// Low churn (a handful of jobs, admin-driven) → JSONB snapshot persistence
// like the other admin stores. Jobs interrupted by a restart can never
// resume (the pipeline holds no durable cursor), so boot marks any
// non-terminal job failed rather than leaving it stuck "parsing" forever.

import { logger } from "../lib/logger";
import { loadSnapshot, createSnapshotWriter } from "./dbSnapshot";
import type { ExtractedLayoutSpec } from "../export/extractedLayouts";

const STORE_NAME = "deck-intake";
const INSTANCE_TAG = Math.random().toString(36).slice(2, 8);
let counter = 0;

/** Jobs kept in the list — oldest terminal jobs beyond this are pruned. */
const MAX_JOBS = 40;

export type DeckJobStatus =
  | "uploaded"
  | "parsing"
  | "clustering"
  | "proposing"
  | "ready"
  | "failed";

export type DeckJobKind = "pptx" | "pdf";

export interface DeckPart {
  objectPath: string;
  filename: string;
  bytes: number;
}

export interface LayoutFamily {
  id: string;
  label: string;
  slideIndexes: number[];
  thumbKey?: string;
  previewKey?: string;
  proposal: ExtractedLayoutSpec;
  confidenceNotes: string[];
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedAt?: string;
  rejectReason?: string;
  layoutId?: string;
}

export interface HarvestItem {
  id: string;
  key: string;
  filename: string;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
  sourceSlide: number;
  suggestedLabel: string;
  suggestedTags: string[];
  status: "pending" | "added" | "dismissed";
  imageId?: string;
}

export interface DeckIntakeJob {
  id: string;
  deckName: string;
  kind: DeckJobKind;
  parts: DeckPart[];
  status: DeckJobStatus;
  progress: string;
  slideCount?: number;
  createdBy: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  families: LayoutFamily[];
  harvest: HarvestItem[];
  /** Pipeline-produced object-storage assets, addressed by server-assigned key. */
  assets: Record<string, string>;
}

export class DeckIntakeError extends Error {
  readonly code: string;
  constructor(message: string, code = "deck_intake_error") {
    super(message);
    this.name = "DeckIntakeError";
    this.code = code;
  }
}

let jobs: Record<string, DeckIntakeJob> = {};

const writer = createSnapshotWriter(STORE_NAME, () => ({ jobs }));

const TERMINAL: readonly DeckJobStatus[] = ["ready", "failed"];

export async function initDeckIntake(): Promise<void> {
  try {
    const raw = await loadSnapshot<{ jobs?: Record<string, DeckIntakeJob> }>(STORE_NAME);
    jobs = {};
    let interrupted = 0;
    for (const [id, job] of Object.entries(raw?.jobs ?? {})) {
      if (!job || typeof job !== "object" || typeof job.id !== "string") continue;
      const rec: DeckIntakeJob = {
        ...job,
        families: Array.isArray(job.families) ? job.families : [],
        harvest: Array.isArray(job.harvest) ? job.harvest : [],
        parts: Array.isArray(job.parts) ? job.parts : [],
        assets: job.assets && typeof job.assets === "object" ? job.assets : {},
      };
      // A pipeline run cannot survive a restart — no worker is going to pick
      // the job back up, so surface that honestly instead of a stuck spinner.
      if (!TERMINAL.includes(rec.status)) {
        rec.status = "failed";
        rec.error = "Interrupted by a server restart before extraction finished — upload the deck again.";
        rec.progress = "Interrupted by a server restart";
        rec.updatedAt = new Date().toISOString();
        interrupted += 1;
      }
      jobs[id] = rec;
    }
    if (interrupted > 0) writer.schedule();
    logger.info(
      { jobs: Object.keys(jobs).length, interrupted },
      "deck-intake: loaded",
    );
  } catch (err) {
    logger.error({ err }, "deck-intake: load failed — starting empty");
    jobs = {};
  }
}

/** Await any pending snapshot write (tests/scripts only). */
export async function flushDeckIntake(): Promise<void> {
  await writer.flush();
}

// ---- Reads --------------------------------------------------------------------

export function listDeckJobs(): DeckIntakeJob[] {
  return Object.values(jobs).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDeckJob(id: string): DeckIntakeJob | undefined {
  return jobs[id];
}

// ---- Mutations ------------------------------------------------------------------

export interface CreateDeckJobInput {
  deckName: string;
  kind: DeckJobKind;
  parts: DeckPart[];
  createdBy: string;
  roleId: string;
}

export function createDeckJob(input: CreateDeckJobInput): DeckIntakeJob {
  counter += 1;
  const now = new Date().toISOString();
  const job: DeckIntakeJob = {
    id: `mdj-${Date.now()}-${INSTANCE_TAG}-${counter}`,
    deckName: input.deckName,
    kind: input.kind,
    parts: input.parts,
    status: "uploaded",
    progress: "Upload verified — queued for extraction",
    createdBy: input.createdBy,
    roleId: input.roleId,
    createdAt: now,
    updatedAt: now,
    families: [],
    harvest: [],
    assets: {},
  };
  jobs[job.id] = job;
  prune();
  writer.schedule();
  return job;
}

/**
 * Apply a mutation to one job. The mutator edits the record in place; the
 * store bumps updatedAt and schedules a flush. Throws on unknown ids.
 */
export function updateDeckJob(
  id: string,
  mutate: (job: DeckIntakeJob) => void,
): DeckIntakeJob {
  const job = jobs[id];
  if (!job) throw new DeckIntakeError("Unknown extraction job.", "unknown_job");
  mutate(job);
  job.updatedAt = new Date().toISOString();
  writer.schedule();
  return job;
}

function prune(): void {
  const all = listDeckJobs();
  if (all.length <= MAX_JOBS) return;
  for (const job of all.slice(MAX_JOBS)) {
    if (TERMINAL.includes(job.status)) delete jobs[job.id];
  }
}
