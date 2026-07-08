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
  runPlanningForecast,
  buildForecastDraft,
} from "../agent/planningAgent";
import {
  addReviewItem,
  addNotification,
  touchReviewItem,
  registerScheduledDraft,
  hashDraftContent,
} from "../data/generateStore";

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

router.post("/planning/forecast/schedule", async (req, res) => {
  const parsed = SchedulePlanningForecastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const forecast = await runPlanningForecast(parsed.data, req.log);
    const role = ROLES.find((r) => r.id === parsed.data.roleId) ?? ROLES[0];
    const draft = buildForecastDraft(forecast, parsed.data);
    const item = addReviewItem({
      scheduleId: "planning-forecast",
      scheduleName: "Planning forecast (10 days)",
      reviewFolder: "Planning forecasts",
      ownerRoleId: role.id,
      ownerLabel: role.label,
      draft,
    });
    // Same scheduled provenance discipline as the generate engine: the draft
    // cannot be exported or versioned until approved in the review inbox.
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
    req.log.info({ reviewItemId: item.id, roleId: role.id }, "planning forecast scheduled to review folder");
    res.json(SchedulePlanningForecastResponse.parse({ reviewItem: item, forecast }));
  } catch (err) {
    req.log.error({ err }, "planning-forecast-schedule route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
  }
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
