// File-backed store for the Generate engine: saved document versions (with
// full tags and a version chain), scheduled-document definitions and the human
// review inbox.
//
// No database is used (project constraint). State is held in memory for speed
// and persisted as a JSON snapshot on every mutation, so saved versions,
// schedules, review items and the scheduled-draft lineage survive a server
// restart. Generation jobs are deliberately NOT persisted — they are transient
// progress trackers for in-flight requests.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "../lib/logger";
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
  // Previous version of the same document chain (same title), if any.
  previousVersionId: string | null;
  // Full tag set: deterministic tags from the brief plus derived tags from the
  // composed content, so versions are findable and auditable.
  tags: string[];
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

// A recorded editorial review of a press release. Server-authoritative: the
// export gate for press releases consults THIS registry (keyed by content
// hash), never a client-supplied flag. Any edit after review changes the hash
// and voids the review.
export interface EditorialReview {
  id: string;
  contentHash: string;
  draftId: string;
  title: string;
  reviewedBy: string;
  reviewedAt: string;
}

// Notification record for the review-folder flow: a scheduled run landed a
// draft in the owner's folder, or an item was approved.
export interface NotificationRecord {
  id: string;
  kind: "scheduled_draft_ready" | "review_approved";
  reviewItemId: string;
  reviewFolder: string;
  ownerRoleId: string;
  ownerLabel: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// ---- Persistence -------------------------------------------------------------
// A single JSON snapshot, written atomically (temp file + rename) on every
// mutation. Loaded once at module init; corrupt or missing files fail soft to
// an empty store so a bad disk state can never take the API down.

const STORE_PATH = join(process.cwd(), ".data", "generate-store.json");

interface PersistedState {
  savedVersions: SavedVersion[];
  schedules: Schedule[];
  reviewInbox: ReviewItem[];
  scheduledDraftIndex: Record<string, string>;
  editorialReviews?: EditorialReview[];
  notifications?: NotificationRecord[];
  idCounter: number;
}

let savedVersions: SavedVersion[] = [];
let schedules: Schedule[] = [];
let reviewInbox: ReviewItem[] = [];
let editorialReviews: EditorialReview[] = [];
let notifications: NotificationRecord[] = [];
// Server-authoritative lineage for every draft produced by a schedule. Keyed by
// BOTH the draft id AND the content hash, so a caller cannot escape the gate by
// mutating the client-supplied draft.id: the content hash still resolves to the
// review item. The save/version/export gates consult THIS, never the
// client-submitted draft.origin/approved fields.
let scheduledDraftIndex = new Map<string, string>();
let idCounter = 0;

function load(): void {
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<PersistedState>;
    savedVersions = Array.isArray(raw.savedVersions) ? raw.savedVersions : [];
    schedules = Array.isArray(raw.schedules) ? raw.schedules : [];
    reviewInbox = Array.isArray(raw.reviewInbox) ? raw.reviewInbox : [];
    scheduledDraftIndex = new Map(Object.entries(raw.scheduledDraftIndex ?? {}));
    editorialReviews = Array.isArray(raw.editorialReviews) ? raw.editorialReviews : [];
    notifications = Array.isArray(raw.notifications) ? raw.notifications : [];
    idCounter = typeof raw.idCounter === "number" ? raw.idCounter : 0;
    logger.info(
      {
        versions: savedVersions.length,
        schedules: schedules.length,
        reviewItems: reviewInbox.length,
      },
      "generate store loaded from disk",
    );
  } catch (err) {
    logger.error({ err }, "generate store could not be loaded; starting empty");
    savedVersions = [];
    schedules = [];
    reviewInbox = [];
    scheduledDraftIndex = new Map();
    editorialReviews = [];
    notifications = [];
  }
}

function persist(): void {
  try {
    const state: PersistedState = {
      savedVersions,
      schedules,
      reviewInbox,
      scheduledDraftIndex: Object.fromEntries(scheduledDraftIndex),
      editorialReviews,
      notifications,
      idCounter,
    };
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(state), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (err) {
    logger.error({ err }, "generate store could not be persisted");
  }
}

load();

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
  persist();
}

export function findScheduledReviewItemId(keys: string[]): string | undefined {
  for (const key of keys) {
    const id = scheduledDraftIndex.get(key);
    if (id) return id;
  }
  return undefined;
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

// ---- Editorial review registry (press releases) --------------------------------

export function recordEditorialReview(
  draft: GeneratedDraft,
  reviewedBy: string,
): EditorialReview {
  const contentHash = hashDraftContent(draft);
  const existing = editorialReviews.find((r) => r.contentHash === contentHash);
  if (existing) return existing;
  const review: EditorialReview = {
    id: nextId("edrev"),
    contentHash,
    draftId: draft.id,
    title: draft.title,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
  };
  editorialReviews.push(review);
  persist();
  return review;
}

export function findEditorialReview(contentHash: string): EditorialReview | undefined {
  return editorialReviews.find((r) => r.contentHash === contentHash);
}

// ---- Notifications --------------------------------------------------------------

export function addNotification(
  input: Omit<NotificationRecord, "id" | "createdAt" | "read">,
): NotificationRecord {
  const record: NotificationRecord = {
    ...input,
    id: nextId("notif"),
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(record);
  if (notifications.length > 100) notifications.length = 100;
  persist();
  return record;
}

export function listNotifications(): NotificationRecord[] {
  return notifications;
}

export function markNotificationsRead(): void {
  let changed = false;
  for (const n of notifications) {
    if (!n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) persist();
}

// ---- Version tags --------------------------------------------------------------
// Deterministic tags come straight from the brief; derived tags are computed
// from the composed content at save time.

export function buildVersionTags(draft: GeneratedDraft): string[] {
  const tags = new Set<string>();
  // Deterministic (from the brief)
  tags.add(`shape:${draft.shape}`);
  tags.add(`language:${draft.language}`);
  tags.add(`audience:${draft.audience}`);
  tags.add(`confidentiality:${draft.confidentiality}`);
  if (draft.params.format) tags.add(`format:${draft.params.format}`);
  for (const axisId of draft.axisIds) tags.add(`axis:${axisId}`);
  // Derived (from the composed content)
  tags.add(`sources:${draft.citations.length}`);
  if (draft.charts.length > 0) tags.add("has-charts");
  if (draft.spokesperson.length > 0) tags.add("has-spokesperson-notes");
  if (draft.historic) tags.add("historic-sources");
  if (draft.guardian.status === "pass") tags.add("guardian-passed");
  tags.add(`origin:${draft.origin ?? "manual"}`);
  return [...tags];
}

// ---- Saved versions ----------------------------------------------------------

export function listVersions(): SavedVersion[] {
  return [...savedVersions].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function saveVersion(
  input: Omit<SavedVersion, "id" | "version" | "savedAt" | "previousVersionId" | "tags">,
): SavedVersion {
  const chain = savedVersions.filter((v) => v.title === input.title);
  const previous = chain.sort((a, b) => b.version - a.version)[0] ?? null;
  const record: SavedVersion = {
    ...input,
    id: nextId("ver"),
    version: (previous?.version ?? 0) + 1,
    previousVersionId: previous?.id ?? null,
    tags: buildVersionTags(input.draft),
    savedAt: new Date().toISOString(),
  };
  savedVersions.push(record);
  persist();
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
  persist();
  return record;
}

export function markScheduleRun(id: string): void {
  const s = schedules.find((x) => x.id === id);
  if (s) {
    s.lastRunAt = new Date().toISOString();
    persist();
  }
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
  persist();
  return record;
}

// Persist mutations made on a review item's draft by callers that stamp
// provenance after addReviewItem (the run-schedule route mutates item.draft).
export function touchReviewItem(id: string): void {
  if (reviewInbox.some((r) => r.id === id)) persist();
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
  persist();
  return item;
}

// ---- Generation jobs ---------------------------------------------------------
// The compose pipeline runs a real sequence of governed phases (retrieval ->
// composing -> guardian). A job records the phase the server is ACTUALLY in so
// the client can watch true backend progress by polling, instead of guessing on
// a timer. Transient by design — never persisted.

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
