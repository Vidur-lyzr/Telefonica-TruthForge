import { Router, type IRouter } from "express";
import {
  QueryKpisBody,
  QueryKpisResponse,
  AskKpisBody,
  AskKpisResponse,
  GetKpiDetailBody,
  GetKpiDetailResponse,
  ListKpiDefinitionsResponse,
  ListKpiDefinitionOptionsResponse,
  UpsertKpiDefinitionBody,
  UpsertKpiDefinitionResponse,
  ListKpiAlertsBody,
  ListKpiAlertsResponse,
  AcknowledgeKpiAlertBody,
  AcknowledgeKpiAlertResponse,
} from "@workspace/api-zod";
import { listKpis, getKpiDetail, computeAndListAlerts } from "../adapters/kpi";
import { runKpiAgent } from "../agent/kpiAgent";
import {
  ROLES,
  OBJECTIVES,
  AXES,
  KPIS,
  CLEARANCE_RANK,
  type Clearance,
  type Area,
  type KpiPeriodType,
  type InitiativeType,
  type KpiDirection,
} from "../data/corpus";
import {
  listKpiDefinitionRecords,
  upsertKpiDefinition,
  acknowledgeAlert,
  type KpiSourceConfig,
} from "../data/kpiStore";

const router: IRouter = Router();

function clearanceForRole(roleId: string): { clearance: Clearance; area: Area | null } {
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  return { clearance: role.clearance, area: role.area };
}

// Resolves an optional custom from/to range. Returns undefined when no range is
// requested, null when the supplied range is invalid (bad dates or from > to).
function resolveRange(
  rangeFrom?: string | null,
  rangeTo?: string | null,
): { from: Date; to: Date } | null | undefined {
  if (!rangeFrom && !rangeTo) return undefined;
  if (!rangeFrom || !rangeTo) return null;
  const from = new Date(`${rangeFrom}T00:00:00`);
  const to = new Date(`${rangeTo}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
  return { from, to };
}

router.post("/kpis/query", async (req, res) => {
  const parsed = QueryKpisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const range = resolveRange(parsed.data.rangeFrom, parsed.data.rangeTo);
  if (range === null) {
    res.status(400).json({ error: "Invalid custom range: both dates are required and from must not be after to.", code: "invalid_range" });
    return;
  }
  try {
    const { clearance } = clearanceForRole(parsed.data.roleId);
    const result = listKpis({
      clearance,
      area: parsed.data.area as Area,
      period: (parsed.data.period === "custom" ? "month" : parsed.data.period) as KpiPeriodType,
      range,
      axisId: parsed.data.axisId ?? undefined,
      market: parsed.data.market ?? undefined,
      brand: parsed.data.brand ?? undefined,
      source: parsed.data.source ?? undefined,
      initiativeType: parsed.data.initiativeType ?? undefined,
      objectiveId: parsed.data.objectiveId ?? undefined,
    });
    res.json(QueryKpisResponse.parse(result));
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/query route failed");
    res.status(500).json({ error: "The Hub could not load the KPIs." });
    return;
  }
});

router.post("/kpis/detail", async (req, res) => {
  const parsed = GetKpiDetailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const range = resolveRange(parsed.data.rangeFrom, parsed.data.rangeTo);
  if (range === null) {
    res.status(400).json({ error: "Invalid custom range: both dates are required and from must not be after to.", code: "invalid_range" });
    return;
  }
  try {
    const { clearance } = clearanceForRole(parsed.data.roleId);
    const detail = getKpiDetail(parsed.data.id, {
      clearance,
      area: parsed.data.area as Area,
      period: (parsed.data.period === "custom" ? "month" : parsed.data.period) as KpiPeriodType,
      range,
    });
    if (!detail) {
      res.status(403).json({ error: "This KPI is not available for your persona." });
      return;
    }
    res.json(GetKpiDetailResponse.parse(detail));
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/detail route failed");
    res.status(500).json({ error: "The Hub could not load this KPI." });
    return;
  }
});

router.post("/kpis/ask", async (req, res) => {
  const parsed = AskKpisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const result = await runKpiAgent(parsed.data, req.log);
    res.json(AskKpisResponse.parse(result));
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/ask route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
    return;
  }
});

const VALID_AREAS: Area[] = ["Comunicación", "Marca", "Gabinete"];
const VALID_DIRECTIONS: KpiDirection[] = ["higher-better", "lower-better"];
const VALID_INITIATIVE_TYPES: InitiativeType[] = ["reputation", "brand", "campaign"];

router.get("/kpis/definitions", async (req, res) => {
  try {
    res.json(ListKpiDefinitionsResponse.parse(listKpiDefinitionRecords()));
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/definitions route failed");
    res.status(500).json({ error: "The Hub could not load the KPI definitions." });
    return;
  }
});

router.get("/kpis/options", async (req, res) => {
  try {
    const markets = [...new Set(KPIS.map((k) => k.market))].sort();
    const brands = [...new Set(KPIS.map((k) => k.brand))].sort();
    res.json(
      ListKpiDefinitionOptionsResponse.parse({
        objectives: OBJECTIVES.map((o) => ({ id: o.id, name: o.name, area: o.area })),
        axes: AXES.map((a) => ({ id: a.id, name: a.name })),
        markets: markets.includes("Group") ? markets : ["Group", ...markets],
        brands,
        initiativeTypes: VALID_INITIATIVE_TYPES,
        areas: VALID_AREAS,
        directions: VALID_DIRECTIONS,
        confidentialities: Object.keys(CLEARANCE_RANK),
      }),
    );
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/options route failed");
    res.status(500).json({ error: "The Hub could not load the definition options." });
    return;
  }
});

router.post("/kpis/definitions", async (req, res) => {
  const parsed = UpsertKpiDefinitionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", code: "invalid_request", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  if (!OBJECTIVES.some((o) => o.id === d.objectiveId)) {
    res.status(400).json({ error: "Unknown objective.", code: "unknown_objective" });
    return;
  }
  if (!AXES.some((a) => a.id === d.axisId)) {
    res.status(400).json({ error: "Unknown strategic axis.", code: "unknown_axis" });
    return;
  }
  if (!(d.confidentiality in CLEARANCE_RANK)) {
    res.status(400).json({ error: "Unknown confidentiality level.", code: "unknown_confidentiality" });
    return;
  }
  if (!VALID_DIRECTIONS.includes(d.direction as KpiDirection)) {
    res.status(400).json({ error: "Direction must be higher-better or lower-better.", code: "invalid_direction" });
    return;
  }
  if (!VALID_INITIATIVE_TYPES.includes(d.initiativeType as InitiativeType)) {
    res.status(400).json({ error: "Unknown initiative type.", code: "invalid_initiative_type" });
    return;
  }
  const areas = d.areas.filter((a): a is Area => VALID_AREAS.includes(a as Area));
  if (areas.length === 0) {
    res.status(400).json({ error: "At least one valid area is required.", code: "invalid_areas" });
    return;
  }
  if (!(d.target > 0)) {
    res.status(400).json({ error: "Target must be a positive number.", code: "invalid_target" });
    return;
  }
  if (
    !(d.thresholds.criticalBelow > 0) ||
    d.thresholds.criticalBelow > d.thresholds.amberBelow ||
    d.thresholds.amberBelow > 1.5
  ) {
    res.status(400).json({
      error: "Thresholds must satisfy 0 < critical <= amber <= 1.5.",
      code: "invalid_thresholds",
    });
    return;
  }
  try {
    const record = upsertKpiDefinition({
      id: d.id ?? undefined,
      name: d.name.trim(),
      description: d.description.trim(),
      unit: d.unit,
      objectiveId: d.objectiveId,
      axisId: d.axisId,
      market: d.market,
      brand: d.brand,
      initiativeType: d.initiativeType as InitiativeType,
      confidentiality: d.confidentiality as Clearance,
      areas,
      direction: d.direction as KpiDirection,
      target: d.target,
      thresholds: d.thresholds,
      owner: d.owner.trim() || "Comms insights desk",
      sources: d.sources as KpiSourceConfig[],
      editedBy: d.editedBy,
      changeNote: d.changeNote.trim() || "Definition updated.",
    });
    req.log.info({ kpiId: record.id, version: record.latestVersion }, "kpi definition saved");
    res.json(UpsertKpiDefinitionResponse.parse(record));
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/definitions upsert failed");
    res.status(400).json({ error: "The definition could not be saved.", code: "save_failed" });
    return;
  }
});

router.post("/kpis/alerts", async (req, res) => {
  const parsed = ListKpiAlertsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", code: "invalid_request", details: parsed.error.issues });
    return;
  }
  try {
    const { clearance } = clearanceForRole(parsed.data.roleId);
    const alerts = computeAndListAlerts(clearance, parsed.data.area as Area);
    res.json(ListKpiAlertsResponse.parse(alerts));
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/alerts route failed");
    res.status(500).json({ error: "The Hub could not load the alerts." });
    return;
  }
});

router.post("/kpis/alerts/ack", async (req, res) => {
  const parsed = AcknowledgeKpiAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", code: "invalid_request", details: parsed.error.issues });
    return;
  }
  try {
    const { clearance } = clearanceForRole(parsed.data.roleId);
    const role = ROLES.find((r) => r.id === parsed.data.roleId) ?? ROLES[0];
    // Fail closed: only alerts visible to this persona can be acknowledged.
    const visible = computeAndListAlerts(clearance, parsed.data.area as Area);
    if (!visible.some((a) => a.id === parsed.data.id)) {
      res.status(404).json({ error: "This alert is not available for your persona.", code: "not_found" });
      return;
    }
    const alert = acknowledgeAlert(parsed.data.id, role.label);
    if (!alert) {
      res.status(404).json({ error: "This alert no longer exists.", code: "not_found" });
      return;
    }
    res.json(AcknowledgeKpiAlertResponse.parse(alert));
    return;
  } catch (err) {
    req.log.error({ err }, "kpis/alerts/ack route failed");
    res.status(500).json({ error: "The Hub could not acknowledge the alert." });
    return;
  }
});

export default router;
