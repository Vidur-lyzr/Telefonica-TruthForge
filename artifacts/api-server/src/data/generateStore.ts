// File-backed store for the Generate engine: saved document versions (with
// full tags and a version chain), scheduled-document definitions and the human
// review inbox.
//
// State is held in memory for speed and write-through persisted to the
// store_snapshots table on every mutation, so saved versions, schedules,
// review items and the scheduled-draft lineage survive autoscale instance
// recycling. Generation jobs are deliberately NOT persisted — they are
// transient progress trackers for in-flight requests.

import { createHash } from "node:crypto";
import { logger } from "../lib/logger";
import { loadSnapshot, createSnapshotWriter } from "./dbSnapshot";
import type { GeneratedDraft, GenerationStage } from "../agent/generateAgent";
import { GENERATE_STORE_SEED } from "./seed/generateSeed";

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
  // Wall-clock run time (HH:mm, server-local) the scheduler aligns runs to.
  // Null for schedules created before time-of-day existed: they keep the
  // legacy fixed-interval behaviour.
  timeOfDay: string | null;
  ownerRoleId: string;
  ownerLabel: string;
  reviewFolder: string;
  createdAt: string;
  lastRunAt: string | null;
  // When the server-side scheduler will fire this schedule next. Always
  // derived from (lastRunAt ?? createdAt) + frequency interval.
  nextRunAt: string | null;
}

const FREQUENCY_MS: Record<ScheduleFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export function computeNextRunAt(
  frequency: ScheduleFrequency,
  from: string,
  timeOfDay?: string | null,
): string {
  const parsed = Date.parse(from);
  const base = new Date(Number.isNaN(parsed) ? Date.now() : parsed);
  const match = timeOfDay ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeOfDay) : null;
  if (!match) {
    // Legacy interval behaviour for schedules without a time of day.
    const interval = FREQUENCY_MS[frequency] ?? FREQUENCY_MS.weekly;
    return new Date(base.getTime() + interval).toISOString();
  }
  // Align the next run to the requested wall-clock time (server-local).
  // Daily: the next occurrence of HH:mm after `from`. Weekly: 7 days on at
  // HH:mm. Monthly: same day next month at HH:mm (calendar month, not 30d).
  const next = new Date(base);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (frequency === "daily") {
    if (next.getTime() <= base.getTime()) next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    // Same day next month, clamped to that month's last day so Jan 31
    // becomes Feb 28/29 rather than overflowing into March.
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  }
  return next.toISOString();
}

// A simulated Teams/email delivery to the schedule owner, recorded when a
// scheduled run lands a draft in the review inbox. No real message is sent.
export interface DeliveryRecord {
  id: string;
  channel: "teams" | "email";
  recipientRoleId: string;
  recipientLabel: string;
  scheduleId: string;
  scheduleName: string;
  reviewItemId: string;
  reviewFolder: string;
  subject: string;
  message: string;
  createdAt: string;
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

// D4 — record of an approved review item published back into the governed
// corpus as a category-E document. Server-authoritative: the publish gate
// consults THIS registry (never a client flag) to refuse double publication
// and to resolve which earlier publication a new version supersedes.
export interface PublicationRecord {
  id: string;
  reviewItemId: string;
  scheduleId: string;
  docId: string;
  version: number;
  contentHash: string;
  publishedAt: string;
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

const STORE_NAME = "generate-store";

interface PersistedState {
  savedVersions: SavedVersion[];
  schedules: Schedule[];
  reviewInbox: ReviewItem[];
  scheduledDraftIndex: Record<string, string>;
  editorialReviews?: EditorialReview[];
  notifications?: NotificationRecord[];
  deliveries?: DeliveryRecord[];
  publications?: PublicationRecord[];
  idCounter: number;
}

let savedVersions: SavedVersion[] = [];
let schedules: Schedule[] = [];
let reviewInbox: ReviewItem[] = [];
let editorialReviews: EditorialReview[] = [];
let notifications: NotificationRecord[] = [];
let deliveries: DeliveryRecord[] = [];
let publications: PublicationRecord[] = [];
// Server-authoritative lineage for every draft produced by a schedule. Keyed by
// BOTH the draft id AND the content hash, so a caller cannot escape the gate by
// mutating the client-supplied draft.id: the content hash still resolves to the
// review item. The save/version/export gates consult THIS, never the
// client-submitted draft.origin/approved fields.
let scheduledDraftIndex = new Map<string, string>();
let idCounter = 0;

function applyState(raw: Partial<PersistedState>): void {
  savedVersions = Array.isArray(raw.savedVersions) ? raw.savedVersions : [];
  schedules = Array.isArray(raw.schedules) ? raw.schedules : [];
  reviewInbox = Array.isArray(raw.reviewInbox) ? raw.reviewInbox : [];
  scheduledDraftIndex = new Map(Object.entries(raw.scheduledDraftIndex ?? {}));
  editorialReviews = Array.isArray(raw.editorialReviews) ? raw.editorialReviews : [];
  notifications = Array.isArray(raw.notifications) ? raw.notifications : [];
  deliveries = Array.isArray(raw.deliveries) ? raw.deliveries : [];
  publications = Array.isArray(raw.publications) ? raw.publications : [];
  for (const s of schedules) {
    if (typeof s.timeOfDay !== "string") s.timeOfDay = null;
    if (!s.nextRunAt) {
      s.nextRunAt = computeNextRunAt(s.frequency, s.lastRunAt ?? s.createdAt, s.timeOfDay);
    }
  }
  idCounter = typeof raw.idCounter === "number" ? raw.idCounter : 0;
}

export async function initGenerateStore(): Promise<void> {
  try {
    const raw = await loadSnapshot<Partial<PersistedState>>(STORE_NAME);
    if (raw) {
      // applyState performs the schedule migrations (timeOfDay, nextRunAt)
      // for snapshots persisted by older builds.
      applyState(raw);
      logger.info(
        {
          versions: savedVersions.length,
          schedules: schedules.length,
          reviewItems: reviewInbox.length,
        },
        "generate store loaded from database",
      );
      return;
    }
    // Fresh database: seed the store from the committed demo snapshot and
    // persist it so the Generate module (Review inbox, Scheduled, Versions)
    // is populated out of the box instead of empty.
    applyState(GENERATE_STORE_SEED as unknown as Partial<PersistedState>);
    logger.info(
      {
        versions: savedVersions.length,
        schedules: schedules.length,
        reviewItems: reviewInbox.length,
      },
      "generate store seeded from committed demo snapshot",
    );
    persist();
  } catch (err) {
    logger.error({ err }, "generate store could not be loaded; starting empty");
    savedVersions = [];
    schedules = [];
    reviewInbox = [];
    scheduledDraftIndex = new Map();
    editorialReviews = [];
    notifications = [];
    deliveries = [];
    publications = [];
  }
}

const writer = createSnapshotWriter(STORE_NAME, (): PersistedState => ({
  savedVersions,
  schedules,
  reviewInbox,
  scheduledDraftIndex: Object.fromEntries(scheduledDraftIndex),
  editorialReviews,
  notifications,
  deliveries,
  publications,
  idCounter,
}));

function persist(): void {
  writer.schedule();
}

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
    // Tables are governed content too: a table edit must void a scheduled
    // approval / editorial review just like a prose edit would.
    tables: (draft.tables ?? []).map((tbl) => ({
      title: tbl.title,
      unit: tbl.unit,
      citationId: tbl.citationId ?? null,
      columns: tbl.columns,
      rows: tbl.rows,
    })),
  });
  return createHash("sha256").update(payload).digest("hex");
}

// ---- Publications (D4 write-back) -------------------------------------------

export function findPublicationByReviewItem(
  reviewItemId: string,
): PublicationRecord | undefined {
  return publications.find((p) => p.reviewItemId === reviewItemId);
}

export function findLatestPublicationForSchedule(
  scheduleId: string,
): PublicationRecord | undefined {
  return [...publications]
    .filter((p) => p.scheduleId === scheduleId)
    .sort((a, b) => b.version - a.version)[0];
}

export function listPublications(): PublicationRecord[] {
  return [...publications].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function addPublication(
  rec: Omit<PublicationRecord, "id" | "publishedAt">,
): PublicationRecord {
  idCounter += 1;
  const record: PublicationRecord = {
    ...rec,
    id: `pub-${idCounter}`,
    publishedAt: new Date().toISOString(),
  };
  publications.push(record);
  persist();
  return record;
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

// ---- Simulated deliveries -------------------------------------------------------

export function addDelivery(
  input: Omit<DeliveryRecord, "id" | "createdAt">,
): DeliveryRecord {
  const record: DeliveryRecord = {
    ...input,
    id: nextId("dlv"),
    createdAt: new Date().toISOString(),
  };
  deliveries.unshift(record);
  if (deliveries.length > 200) deliveries.length = 200;
  persist();
  return record;
}

export function listDeliveries(): DeliveryRecord[] {
  return deliveries;
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
  input: Omit<Schedule, "id" | "createdAt" | "lastRunAt" | "nextRunAt">,
): Schedule {
  const createdAt = new Date().toISOString();
  const record: Schedule = {
    ...input,
    id: nextId("sch"),
    createdAt,
    lastRunAt: null,
    nextRunAt: computeNextRunAt(input.frequency, createdAt, input.timeOfDay),
  };
  schedules.push(record);
  persist();
  return record;
}

export function removeSchedule(id: string): boolean {
  const before = schedules.length;
  schedules = schedules.filter((s) => s.id !== id);
  if (schedules.length !== before) {
    persist();
    return true;
  }
  return false;
}

export function markScheduleRun(id: string): void {
  const s = schedules.find((x) => x.id === id);
  if (s) {
    s.lastRunAt = new Date().toISOString();
    s.nextRunAt = computeNextRunAt(s.frequency, s.lastRunAt, s.timeOfDay);
    persist();
  }
}

// Schedules whose nextRunAt is due (fail closed: missing nextRunAt is not due;
// the load migration always backfills it).
export function listDueSchedules(now: Date = new Date()): Schedule[] {
  return schedules.filter(
    (s) => s.nextRunAt !== null && Date.parse(s.nextRunAt) <= now.getTime(),
  );
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
  /** Machine-readable refusal code (e.g. quota_exceeded), when applicable. */
  errorCode: string | null;
  /** Human-readable sub-progress within the stage (e.g. "Chapter 2 of 6 — ..."). */
  progress: string | null;
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
    errorCode: null,
    progress: null,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): GenerationJob | undefined {
  return jobs.get(id);
}

export function setJobStage(
  id: string,
  stage: GenerationStage,
  progress?: string | null,
): void {
  const job = jobs.get(id);
  if (job && job.status === "running") {
    job.stage = stage;
    job.progress = progress ?? null;
  }
}

export function completeJob(id: string, draft: GeneratedDraft): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "done";
  job.stage = "done";
  job.progress = null;
  job.draft = draft;
}

export function failJob(id: string, error: string, errorCode?: string): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "error";
  job.error = error;
  job.errorCode = errorCode ?? null;
}
