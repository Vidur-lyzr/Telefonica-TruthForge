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
} from "@workspace/api-zod";
import { ROLES } from "../data/corpus";
import { PLANNING_SOURCES, PLANNING_TODAY } from "../data/planning";
import {
  listEvents,
  getEventDetail,
  analyze,
  type EventFilters,
  type PersonaScope,
} from "../adapters/planning";
import { runPlanningAsk, runPlanningForecast } from "../agent/planningAgent";

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
  const { roleId, from, to, area, market, brand, axis } = parsed.data;
  const filters: EventFilters = { from, to, area, market, brand, axis };
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
  const { roleId, from, to, area, market, brand, axis } = parsed.data;
  const filters: EventFilters = { from, to, area, market, brand, axis };
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
