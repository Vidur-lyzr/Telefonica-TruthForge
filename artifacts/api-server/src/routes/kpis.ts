import { Router, type IRouter } from "express";
import {
  QueryKpisBody,
  QueryKpisResponse,
  AskKpisBody,
  AskKpisResponse,
  GetKpiDetailBody,
  GetKpiDetailResponse,
} from "@workspace/api-zod";
import { listKpis, getKpiDetail } from "../adapters/kpi";
import { runKpiAgent } from "../agent/kpiAgent";
import { ROLES, type Clearance, type Area, type KpiPeriodType } from "../data/corpus";

const router: IRouter = Router();

function clearanceForRole(roleId: string): { clearance: Clearance; area: Area } {
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  return { clearance: role.clearance, area: role.area };
}

router.post("/kpis/query", async (req, res) => {
  const parsed = QueryKpisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const { clearance } = clearanceForRole(parsed.data.roleId);
    const result = listKpis({
      clearance,
      area: parsed.data.area as Area,
      period: parsed.data.period as KpiPeriodType,
      axisId: parsed.data.axisId ?? undefined,
      market: parsed.data.market ?? undefined,
      brand: parsed.data.brand ?? undefined,
      source: parsed.data.source ?? undefined,
      initiativeType: parsed.data.initiativeType ?? undefined,
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
  try {
    const { clearance } = clearanceForRole(parsed.data.roleId);
    const detail = getKpiDetail(parsed.data.id, {
      clearance,
      area: parsed.data.area as Area,
      period: parsed.data.period as KpiPeriodType,
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

export default router;
