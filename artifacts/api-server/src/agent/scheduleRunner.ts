// Shared scheduled-run pipeline + the automatic server-side scheduler.
//
// runScheduleNow is the ONE pipeline for a scheduled document run — used both
// by the manual "run now" route and by the timer below — so provenance
// stamping, lineage registration, notifications and simulated deliveries can
// never drift between the two paths.
//
// The scheduler is a simple in-process timer (no DB, project constraint):
// every tick it fires schedules whose nextRunAt is due. An in-flight set
// guards against double-firing (timer + manual run, or a slow run spanning
// two ticks). nextRunAt is recomputed from the run time by markScheduleRun.

import { runGenerateAgent } from "./generateAgent";
import { logger } from "../lib/logger";
import {
  markScheduleRun,
  addReviewItem,
  registerScheduledDraft,
  hashDraftContent,
  touchReviewItem,
  addNotification,
  addDelivery,
  listDueSchedules,
  type Schedule,
  type ReviewItem,
} from "../data/generateStore";

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

export class ScheduleRunInProgressError extends Error {
  constructor(scheduleName: string) {
    super(`"${scheduleName}" is already running. Wait for the current run to finish.`);
    this.name = "ScheduleRunInProgressError";
  }
}

const inFlight = new Set<string>();

export async function runScheduleNow(
  schedule: Schedule,
  log: Logger,
): Promise<ReviewItem> {
  if (inFlight.has(schedule.id)) {
    throw new ScheduleRunInProgressError(schedule.name);
  }
  inFlight.add(schedule.id);
  try {
    const draft = await runGenerateAgent(
      {
        shape: schedule.shape as "messaging" | "press" | "multiformat",
        topic: schedule.topic,
        roleId: schedule.ownerRoleId,
        audience: schedule.audience,
        language: schedule.language,
        confidentiality: schedule.confidentiality,
        axisIds: schedule.axisIds,
        sourceQueries: schedule.queries,
      },
      log,
    );
    markScheduleRun(schedule.id);
    const item = addReviewItem({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      reviewFolder: schedule.reviewFolder,
      ownerRoleId: schedule.ownerRoleId,
      ownerLabel: schedule.ownerLabel,
      draft,
    });
    // Stamp scheduled provenance so this draft cannot be exported or versioned
    // until it is approved in the review inbox. item.draft is the stored ref.
    item.draft.origin = "scheduled";
    item.draft.reviewItemId = item.id;
    item.draft.approved = false;
    // Server-authoritative lineage: bind this draft's id AND content hash to its
    // review item so the save/version gate never has to trust client-submitted
    // provenance — mutating draft.id cannot escape the gate.
    registerScheduledDraft([item.draft.id, hashDraftContent(item.draft)], item.id);
    // The provenance stamps above mutated the stored item after addReviewItem
    // persisted it — write the snapshot again so they survive a restart.
    touchReviewItem(item.id);
    addNotification({
      kind: "scheduled_draft_ready",
      reviewItemId: item.id,
      reviewFolder: schedule.reviewFolder,
      ownerRoleId: schedule.ownerRoleId,
      ownerLabel: schedule.ownerLabel,
      message: `"${schedule.name}" produced a new draft in "${schedule.reviewFolder}" and is waiting for review.`,
    });
    // Simulated Teams + email hand-off to the schedule owner. No real message
    // leaves the Hub — these records make the delivery auditable in the UI.
    addDelivery({
      channel: "teams",
      recipientRoleId: schedule.ownerRoleId,
      recipientLabel: schedule.ownerLabel,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      reviewItemId: item.id,
      reviewFolder: schedule.reviewFolder,
      subject: `Scheduled draft ready: ${schedule.name}`,
      message: `Hub SSoT: "${schedule.name}" produced a new draft ("${draft.title}") and placed it in "${schedule.reviewFolder}". It is waiting for your review before it can be saved or exported.`,
    });
    addDelivery({
      channel: "email",
      recipientRoleId: schedule.ownerRoleId,
      recipientLabel: schedule.ownerLabel,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      reviewItemId: item.id,
      reviewFolder: schedule.reviewFolder,
      subject: `[Hub SSoT] Review requested — ${schedule.name}`,
      message: `A scheduled run of "${schedule.name}" produced the draft "${draft.title}" in "${schedule.reviewFolder}". Open the review inbox to approve or edit it. Scheduled documents cannot be saved or exported until approved.`,
    });
    return item;
  } finally {
    inFlight.delete(schedule.id);
  }
}

const TICK_MS = 30_000;
let timer: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    for (const schedule of listDueSchedules()) {
      if (inFlight.has(schedule.id)) continue;
      logger.info(
        { scheduleId: schedule.id, name: schedule.name, nextRunAt: schedule.nextRunAt },
        "scheduler: firing due schedule",
      );
      runScheduleNow(schedule, logger).catch((err) => {
        if (err instanceof ScheduleRunInProgressError) return;
        logger.error({ err, scheduleId: schedule.id }, "scheduler: scheduled run failed");
        // Push nextRunAt forward even on failure so a permanently broken
        // schedule cannot hot-loop the engine every tick.
        markScheduleRun(schedule.id);
      });
    }
  }, TICK_MS);
  timer.unref();
  logger.info({ tickMs: TICK_MS }, "scheduler: started");
}
