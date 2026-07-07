// In-memory demo store for the Generate engine: saved document versions,
// scheduled-document definitions and the human review inbox.
//
// No database is used (project constraint). All state here is process-local and
// resets when the server restarts. The UI surfaces this limitation where
// relevant so nothing implies durable persistence.

import { createHash } from "node:crypto";
import type { GeneratedDraft, GenerationStage } from "../agent/generateAgent";

export interface SavedVersion {
  id: string;
  version: number;
  title: string;
  shape: string;
  language: string;
  audience: string;
  confidentiality: string;
  savedAt: string;
  savedBy: string;
  // 3-layer governance tags captured at save time.
  governance: {
    confidentiality: string;
    validity: string;
    owner: string;
  };
  draft: GeneratedDraft;
}

export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface Schedule {
  id: string;
  name: string;
  shape: string;
  topic: string;
  // Governed source/query presets the recurring run always retrieves against,
  // in addition to the free-text topic.
  queries: string[];
  axisIds: string[];
  language: string;
  audience: "internal" | "external";
  confidentiality: string;
  frequency: ScheduleFrequency;
  ownerRoleId: string;
  ownerLabel: string;
  reviewFolder: string;
  createdAt: string;
  lastRunAt: string | null;
}

export type ReviewStatus = "pending" | "approved";

export interface ReviewItem {
  id: string;
  scheduleId: string;
  scheduleName: string;
  reviewFolder: string;
  ownerRoleId: string;
  ownerLabel: string;
  status: ReviewStatus;
  createdAt: string;
  approvedAt: string | null;
  draft: GeneratedDraft;
  // Content hash captured at approval time. A scheduled draft may only be
  // versioned/exported when the submitted content still matches this hash, so
  // any post-approval edit voids approval until it is re-reviewed. Internal
  // only — not exposed through the API schema.
  approvedHash: string | null;
}

const savedVersions: SavedVersion[] = [];
const schedules: Schedule[] = [];
const reviewInbox: ReviewItem[] = [];
// Server-authoritative lineage for every draft produced by a schedule. Keyed by
// BOTH the draft id AND the content hash, so a caller cannot escape the gate by
// mutating the client-supplied draft.id: the content hash still resolves to the
// review item. The save/version gate consults THIS, never the client-submitted
// draft.origin/approved fields (which are UX hints and can be tampered with).
const scheduledDraftIndex = new Map<string, string>();

// Deterministic hash of the governed CONTENT of a draft (ignores volatile fields
// like guardian verdict and provenance flags), used to bind an approval to the
// exact content that a human reviewed.
export function hashDraftContent(draft: GeneratedDraft): string {
  const payload = JSON.stringify({
    title: draft.title,
    umbrella: draft.umbrella ?? null,
    sections: draft.sections.map((s) => ({
      kind: s.kind,
      heading: s.heading,
      axisId: s.axisId ?? null,
      body: s.body,
      internalOnly: s.internalOnly,
    })),
    citations: draft.citations.map((c) => c.id).sort(),
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function registerScheduledDraft(keys: string[], reviewItemId: string): void {
  for (const key of keys) {
    if (key) scheduledDraftIndex.set(key, reviewItemId);
  }
}

export function findScheduledReviewItemId(keys: string[]): string | undefined {
  for (const key of keys) {
    const id = scheduledDraftIndex.get(key);
    if (id) return id;
  }
  return undefined;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

// ---- Saved versions ----------------------------------------------------------

export function listVersions(): SavedVersion[] {
  return [...savedVersions].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function saveVersion(
  input: Omit<SavedVersion, "id" | "version" | "savedAt">,
): SavedVersion {
  const priorForTitle = savedVersions.filter((v) => v.title === input.title).length;
  const record: SavedVersion = {
    ...input,
    id: nextId("ver"),
    version: priorForTitle + 1,
    savedAt: new Date().toISOString(),
  };
  savedVersions.push(record);
  return record;
}

// ---- Schedules ---------------------------------------------------------------

export function listSchedules(): Schedule[] {
  return [...schedules].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getSchedule(id: string): Schedule | undefined {
  return schedules.find((s) => s.id === id);
}

export function createSchedule(
  input: Omit<Schedule, "id" | "createdAt" | "lastRunAt">,
): Schedule {
  const record: Schedule = {
    ...input,
    id: nextId("sch"),
    createdAt: new Date().toISOString(),
    lastRunAt: null,
  };
  schedules.push(record);
  return record;
}

export function markScheduleRun(id: string): void {
  const s = schedules.find((x) => x.id === id);
  if (s) s.lastRunAt = new Date().toISOString();
}

// ---- Review inbox ------------------------------------------------------------

export function listReviewItems(): ReviewItem[] {
  return [...reviewInbox].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getReviewItem(id: string): ReviewItem | undefined {
  return reviewInbox.find((r) => r.id === id);
}

export function addReviewItem(
  input: Omit<ReviewItem, "id" | "status" | "createdAt" | "approvedAt" | "approvedHash">,
): ReviewItem {
  const record: ReviewItem = {
    ...input,
    id: nextId("rev"),
    status: "pending",
    createdAt: new Date().toISOString(),
    approvedAt: null,
    approvedHash: null,
  };
  reviewInbox.push(record);
  return record;
}

export function approveReviewItem(
  id: string,
  draft: GeneratedDraft,
): ReviewItem | undefined {
  const item = reviewInbox.find((r) => r.id === id);
  if (!item) return undefined;
  item.status = "approved";
  item.approvedAt = new Date().toISOString();
  item.draft = draft;
  item.approvedHash = hashDraftContent(draft);
  return item;
}

// ---- Generation jobs ---------------------------------------------------------
// The compose pipeline runs a real sequence of governed phases (retrieval ->
// composing -> guardian). A job records the phase the server is ACTUALLY in so
// the client can watch true backend progress by polling, instead of guessing on
// a timer. In-memory only, like the rest of this store.

export type JobStatus = "running" | "done" | "error";

export interface GenerationJob {
  id: string;
  mode: "generate" | "refine";
  stage: GenerationStage;
  status: JobStatus;
  draft: GeneratedDraft | null;
  error: string | null;
  createdAt: string;
}

const jobs = new Map<string, GenerationJob>();

export function createJob(mode: "generate" | "refine"): GenerationJob {
  const job: GenerationJob = {
    id: nextId("job"),
    mode,
    stage: "retrieving",
    status: "running",
    draft: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): GenerationJob | undefined {
  return jobs.get(id);
}

export function setJobStage(id: string, stage: GenerationStage): void {
  const job = jobs.get(id);
  if (job && job.status === "running") job.stage = stage;
}

export function completeJob(id: string, draft: GeneratedDraft): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "done";
  job.stage = "done";
  job.draft = draft;
}

export function failJob(id: string, error: string): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "error";
  job.error = error;
}
