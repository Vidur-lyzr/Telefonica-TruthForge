import { Router, type IRouter } from "express";
import {
  GetPlanningOverviewQueryParams,
  GetPlanningOverviewResponse,
  ListPlanningEventsQueryParams,
  ListPlanningEventsResponse,
  GetPlanningEventQueryParams,
  GetPlanningEventResponse,
  GetPlanningInsightsQueryParams,
  GetPlanningInsightsResponse,
  PlanningAskBody,
  PlanningAskResponse,
  PlanningForecastBody,
  PlanningForecastResponse,
  CreatePlanningEventBody,
  CreatePlanningEventResponse,
  UpdatePlanningEventBody,
  UpdatePlanningEventResponse,
  ListPlanningSyncQueryParams,
  ListPlanningSyncResponse,
  SimulatePlanningMoveBody,
  SimulatePlanningMoveResponse,
  ListPlanningAlertsQueryParams,
  ListPlanningAlertsResponse,
  SchedulePlanningForecastBody,
  SchedulePlanningForecastResponse,
  ListPlanningForecastSchedulesQueryParams,
  ListPlanningForecastSchedulesResponse,
  CreatePlanningForecastScheduleBody,
  CreatePlanningForecastScheduleResponse,
  CancelPlanningForecastScheduleBody,
  CancelPlanningForecastScheduleResponse,
} from "@workspace/api-zod";
import { ROLES, type Clearance, type Area } from "../data/corpus";
import { PLANNING_SOURCES, PLANNING_TODAY } from "../data/planning";
import {
  listEvents,
  getEventDetail,
  analyze,
  canActOn,
  accessibleEvent,
  simulateMove,
  buildAlerts,
  type EventFilters,
  type PersonaScope,
} from "../adapters/planning";
import {
  createPlanningEvent,
  updatePlanningEvent,
  listSyncRecords,
  findPlanningEvent,
} from "../data/planningStore";
import {
  runPlanningAsk,
  runPlanningAskAgent,
  runPlanningForecast,
  buildForecastDraft,
} from "../agent/planningAgent";
import {
  addReviewItem,
  addNotification,
  touchReviewItem,
  registerScheduledDraft,
  hashDraftContent,
  listSchedules,
  createSchedule,
  removeSchedule,
  markScheduleRun,
  type Schedule,
  type ScheduleFrequency,
} from "../data/generateStore";
import type { PlanningForecastResult } from "../agent/planningAgent";

const router: IRouter = Router();

// Resolve the persona's governance scope: clearance AND area both bound what the
// persona may see. Enforced server-side before any event leaves the adapter.
function scopeFor(roleId: string): PersonaScope {
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  return { clearance: role.clearance, area: role.area };
}

router.get("/planning/overview", (req, res) => {
  const parsed = GetPlanningOverviewQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const data = GetPlanningOverviewResponse.parse({
    today: PLANNING_TODAY,
    sources: PLANNING_SOURCES,
  });
  res.json(data);
});

router.get("/planning/events", (req, res) => {
  const parsed = ListPlanningEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { roleId, from, to, area, market, brand, axis, type } = parsed.data;
  const filters: EventFilters = { from, to, area, market, brand, axis, type };
  const data = ListPlanningEventsResponse.parse(listEvents(scopeFor(roleId), filters));
  res.json(data);
});

router.get("/planning/event", (req, res) => {
  const parsed = GetPlanningEventQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const detail = getEventDetail(parsed.data.id, scopeFor(parsed.data.roleId));
  if (!detail) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(GetPlanningEventResponse.parse(detail));
});

router.get("/planning/insights", (req, res) => {
  const parsed = GetPlanningInsightsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { roleId, from, to, area, market, brand, axis, type } = parsed.data;
  const filters: EventFilters = { from, to, area, market, brand, axis, type };
  const data = GetPlanningInsightsResponse.parse(analyze(scopeFor(roleId), filters));
  res.json(data);
});

router.post("/planning/ask", async (req, res) => {
  const parsed = PlanningAskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const result = await runPlanningAsk(parsed.data, req.log);
    res.json(PlanningAskResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "planning-ask route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
  }
});

// Streaming variant of /planning/ask: Server-Sent Events with live agent
// steps (scope -> retrieve -> decide/compose) followed by the final result.
// Out of the OpenAPI contract by design, mirroring /brand/guardian/stream.
router.post("/planning/ask/stream", async (req, res) => {
  const parsed = PlanningAskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let closed = false;
  const abort = new AbortController();
  res.on("close", () => {
    closed = true;
    abort.abort();
  });

  const send = (event: string, data: unknown) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await runPlanningAskAgent(
      parsed.data,
      req.log,
      (step) => send("step", step),
      abort.signal,
    );
    send("result", result);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      req.log.info("planning ask stream cancelled: client disconnected");
    } else {
      req.log.error({ err }, "planning ask stream failed");
      send("error", { error: "The calendar agent could not complete this request." });
    }
  } finally {
    send("done", {});
    res.end();
  }
});

// A persona label for sync records — who asked for the change.
function labelFor(roleId: string): string {
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  return role.label;
}

router.post("/planning/events/create", (req, res) => {
  const parsed = CreatePlanningEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { roleId, ...input } = parsed.data;
  const scope = scopeFor(roleId);
  if (
    !canActOn(scope, {
      confidentiality: input.confidentiality as Clearance,
      area: input.area as Area,
    })
  ) {
    res.status(403).json({
      error:
        "You cannot create this activity: it sits outside your clearance or your area. The calendar only accepts changes from people cleared for the activity they are adding.",
    });
    return;
  }
  const { event, sync } = createPlanningEvent(
    {
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      area: input.area as Area,
      type: input.type as "campaign" | "milestone" | "event" | "publication",
      status: "planned",
      owner: input.owner,
      axisId: input.axisId,
      market: input.market,
      brand: input.brand,
      source: input.source,
      confidentiality: input.confidentiality as Clearance,
      description: input.description,
    },
    labelFor(roleId),
  );
  req.log.info({ eventId: event.id, roleId }, "planning event created");
  res.json(
    CreatePlanningEventResponse.parse({
      event: { ...event, restricted: false, conflict: false },
      sync,
    }),
  );
});

router.post("/planning/events/update", (req, res) => {
  const parsed = UpdatePlanningEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { roleId, id, ...patch } = parsed.data;
  const scope = scopeFor(roleId);
  const current = findPlanningEvent(id);
  if (!current) {
    res.status(404).json({ error: "Event not found." });
    return;
  }
  if (!canActOn(scope, { confidentiality: current.confidentiality, area: current.area })) {
    res.status(403).json({
      error:
        "You cannot change this activity: it belongs to another area or sits above your clearance. You can see it, but only its owning team may edit it.",
    });
    return;
  }
  if (patch.startDate && patch.endDate && patch.endDate < patch.startDate) {
    res.status(400).json({ error: "The end date cannot be before the start date." });
    return;
  }
  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as Partial<{
    title: string;
    startDate: string;
    endDate: string;
    owner: string;
    status: "planned" | "in_progress" | "live" | "done" | "at_risk";
    description: string;
  }>;
  if (cleaned.startDate && !cleaned.endDate) {
    // Preserve the activity's duration when only the start moves.
    const duration =
      new Date(current.endDate).getTime() - new Date(current.startDate).getTime();
    cleaned.endDate = new Date(new Date(cleaned.startDate).getTime() + duration)
      .toISOString()
      .slice(0, 10);
  }
  const result = updatePlanningEvent(id, cleaned, labelFor(roleId));
  if (!result) {
    res.status(404).json({ error: "Event not found." });
    return;
  }
  req.log.info({ eventId: id, roleId }, "planning event updated");
  res.json(
    UpdatePlanningEventResponse.parse({
      event: { ...result.event, restricted: false, conflict: false },
      sync: result.sync,
    }),
  );
});

router.get("/planning/sync", (req, res) => {
  const parsed = ListPlanningSyncQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const scope = scopeFor(parsed.data.roleId);
  // Only reveal sync records for events the persona is cleared to see.
  const records = listSyncRecords(parsed.data.eventId).filter((r) =>
    accessibleEvent(r.eventId, scope),
  );
  res.json(ListPlanningSyncResponse.parse(records));
});

router.post("/planning/simulate", (req, res) => {
  const parsed = SimulatePlanningMoveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { roleId, eventId, toStart } = parsed.data;
  const sim = simulateMove(scopeFor(roleId), eventId, toStart);
  if (!sim) {
    res.status(404).json({
      error: "This activity is not available to simulate: it does not exist or sits outside your clearance.",
    });
    return;
  }
  res.json(SimulatePlanningMoveResponse.parse(sim));
});

router.get("/planning/alerts", (req, res) => {
  const parsed = ListPlanningAlertsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  res.json(ListPlanningAlertsResponse.parse(buildAlerts(scopeFor(parsed.data.roleId))));
});

// Land a generated forecast in the owner's review folder with the same
// scheduled provenance discipline as the generate engine: the draft cannot be
// exported or versioned until approved in the review inbox.
function landForecastInReviewFolder(
  forecast: PlanningForecastResult,
  input: { area: string; roleId: string },
  scheduleId: string,
  scheduleName: string,
) {
  const role = ROLES.find((r) => r.id === input.roleId) ?? ROLES[0];
  const draft = buildForecastDraft(forecast, input);
  const item = addReviewItem({
    scheduleId,
    scheduleName,
    reviewFolder: "Planning forecasts",
    ownerRoleId: role.id,
    ownerLabel: role.label,
    draft,
  });
  item.draft.origin = "scheduled";
  item.draft.reviewItemId = item.id;
  item.draft.approved = false;
  registerScheduledDraft([item.draft.id, hashDraftContent(item.draft)], item.id);
  touchReviewItem(item.id);
  addNotification({
    kind: "scheduled_draft_ready",
    reviewItemId: item.id,
    reviewFolder: "Planning forecasts",
    ownerRoleId: role.id,
    ownerLabel: role.label,
    message: `The 10-day planning forecast landed in "Planning forecasts" and is waiting for review.`,
  });
  return item;
}

router.post("/planning/forecast/schedule", async (req, res) => {
  const parsed = SchedulePlanningForecastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const forecast = await runPlanningForecast(parsed.data, req.log);
    const item = landForecastInReviewFolder(
      forecast,
      parsed.data,
      "planning-forecast",
      "Planning forecast (10 days)",
    );
    req.log.info(
      { reviewItemId: item.id, roleId: parsed.data.roleId },
      "planning forecast scheduled to review folder",
    );
    res.json(SchedulePlanningForecastResponse.parse({ reviewItem: item, forecast }));
  } catch (err) {
    req.log.error({ err }, "planning-forecast-schedule route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
  }
});

// ---- Recurring forecast schedules ------------------------------------------
// Recurring schedules are stored in the shared governed schedule registry with
// shape "planning-forecast" so they never collide with Generate's document
// schedules. The persona's area is captured at creation time in `topic`.

const PLANNING_FORECAST_SHAPE = "planning-forecast";
const FREQUENCY_MS: Record<ScheduleFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

function planningSchedulesFor(roleId: string): Schedule[] {
  return listSchedules().filter(
    (s) => s.shape === PLANNING_FORECAST_SHAPE && s.ownerRoleId === roleId,
  );
}

function isDue(s: Schedule): boolean {
  const last = s.lastRunAt ?? s.createdAt;
  return Date.now() - new Date(last).getTime() >= FREQUENCY_MS[s.frequency];
}

// Lazy catch-up: any owned schedule whose interval has elapsed is run when the
// list is read, so recurring drafts keep landing without a resident daemon.
router.get("/planning/forecast/schedules", async (req, res) => {
  const parsed = ListPlanningForecastSchedulesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { roleId } = parsed.data;
  try {
    for (const s of planningSchedulesFor(roleId)) {
      if (!isDue(s)) continue;
      // Mark the run BEFORE composing so a slow/failed compose cannot cause a
      // run storm on every subsequent read.
      markScheduleRun(s.id);
      try {
        const forecast = await runPlanningForecast({ area: s.topic, roleId }, req.log);
        landForecastInReviewFolder(forecast, { area: s.topic, roleId }, s.id, s.name);
        req.log.info({ scheduleId: s.id }, "recurring planning forecast run completed");
      } catch (err) {
        req.log.error({ err, scheduleId: s.id }, "recurring planning forecast run failed");
      }
    }
    res.json(ListPlanningForecastSchedulesResponse.parse(planningSchedulesFor(roleId)));
  } catch (err) {
    req.log.error({ err }, "planning-forecast-schedules route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
  }
});

router.post("/planning/forecast/schedules/create", async (req, res) => {
  const parsed = CreatePlanningForecastScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { area, roleId, frequency } = parsed.data;
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly") {
    res.status(400).json({ error: "Frequency must be daily, weekly or monthly." });
    return;
  }
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    res.status(400).json({ error: "Unknown persona.", code: "unknown_role" });
    return;
  }
  if (planningSchedulesFor(role.id).length > 0) {
    res.status(409).json({
      error: "A recurring forecast schedule already exists for this persona. Cancel it first.",
      code: "schedule_exists",
    });
    return;
  }
  try {
    // Compose the first occurrence BEFORE persisting the schedule, so a failed
    // compose never leaves behind a schedule that skipped its promised first
    // run and would silently wait a full interval.
    const forecast = await runPlanningForecast({ area, roleId: role.id }, req.log);
    const schedule = createSchedule({
      name: `Recurring 10-day forecast (${frequency})`,
      shape: PLANNING_FORECAST_SHAPE,
      topic: area,
      queries: [],
      axisIds: [],
      language: "en",
      audience: "internal",
      confidentiality: "internal",
      timeOfDay: null,
      frequency,
      ownerRoleId: role.id,
      ownerLabel: role.label,
      reviewFolder: "Planning forecasts",
    });
    const item = landForecastInReviewFolder(
      forecast,
      { area, roleId: role.id },
      schedule.id,
      schedule.name,
    );
    markScheduleRun(schedule.id);
    req.log.info(
      { scheduleId: schedule.id, reviewItemId: item.id, frequency },
      "recurring planning forecast schedule created",
    );
    res.json(
      CreatePlanningForecastScheduleResponse.parse({
        schedule: planningSchedulesFor(role.id).find((s) => s.id === schedule.id) ?? schedule,
        reviewItem: item,
        forecast,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "planning-forecast-schedule-create route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
  }
});

router.post("/planning/forecast/schedules/cancel", (req, res) => {
  const parsed = CancelPlanningForecastScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { roleId, scheduleId } = parsed.data;
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    res.status(400).json({ error: "Unknown persona.", code: "unknown_role" });
    return;
  }
  const owned = planningSchedulesFor(role.id).some((s) => s.id === scheduleId);
  if (!owned) {
    res.status(404).json({
      error: "No recurring forecast schedule with that id belongs to this persona.",
      code: "schedule_not_found",
    });
    return;
  }
  removeSchedule(scheduleId);
  req.log.info({ scheduleId }, "recurring planning forecast schedule cancelled");
  res.json(CancelPlanningForecastScheduleResponse.parse({ ok: true }));
});

router.post("/planning/forecast", async (req, res) => {
  const parsed = PlanningForecastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const result = await runPlanningForecast(parsed.data, req.log);
    res.json(PlanningForecastResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "planning-forecast route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
  }
});

export default router;
