// kpi — Lyzr-named KPI / objective-tracking adapter.
// Backed natively by the synthetic corpus (objectives, KPI definitions, external
// mentions). A real Lyzr metrics/objective service can be swapped in behind this
// same interface later.
//
// Governance rules enforced here:
//  - A KPI is only visible when the persona's clearance AND area allow it.
//  - Fail closed: a composite whose internal source document is above the
//    persona's clearance is treated as inaccessible, so the KPI is hidden — its
//    evidence is never leaked through a blended headline figure.

import {
  AXES,
  KPI_MENTIONS,
  CLEARANCE_RANK,
  getDoc,
  getObjective,
  type Clearance,
  type Area,
  type KpiPeriodType,
  type KpiDirection,
} from "../data/corpus";
import {
  listEffectiveKpiDefinitions,
  getEffectiveKpiDefinition,
  syncAlerts,
  type EffectiveKpiDefinition,
  type KpiThresholds,
  type KpiAlertRecord,
} from "../data/kpiStore";

export interface KpiSource {
  id: string;
  label: string;
  kind: "internal" | "external";
  weight: number;
  docId: string | null;
  docTitle: string | null;
  sourceLoc: string | null;
  snippet: string | null;
  version: string | null;
  owner: string | null;
  confidentiality: string | null;
  validity: string | null;
  confidence: number;
  conflict: boolean;
  accessible: boolean;
}

export interface KpiForecast {
  projected: number;
  target: number;
  note: string;
  deviationRisk: boolean;
  confidence: number;
}

export interface KpiCard {
  id: string;
  objectiveId: string;
  objectiveName: string;
  name: string;
  description: string;
  unit: string;
  axisId: string;
  axisName: string;
  axisColor: string;
  market: string;
  brand: string;
  initiativeType: string;
  confidentiality: string;
  periodType: KpiPeriodType;
  current: number;
  target: number;
  direction: KpiDirection;
  progress: number;
  status: "on-track" | "amber" | "off-track";
  variation: number;
  variationPct: number;
  spark: number[];
  composite: boolean;
  blend: string;
  confidence: number;
  validity: string;
  historic: boolean;
  conflict: boolean;
  sources: KpiSource[];
  forecast: KpiForecast;
  owner: string;
  thresholds: KpiThresholds;
  definitionVersion: number;
}

export interface KpiTimePoint {
  period: string;
  value: number;
}

export interface KpiBreakdownGroup {
  dimension: string;
  points: { label: string; value: number }[];
}

export interface KpiDetail {
  kpi: KpiCard;
  series: KpiTimePoint[];
  breakdowns: KpiBreakdownGroup[];
}

export interface KpiFacets {
  axes: { id: string; name: string; color: string }[];
  markets: string[];
  brands: string[];
  sources: string[];
  initiativeTypes: string[];
  objectives: { id: string; name: string }[];
}

// A custom reporting window. Series points carry no explicit dates in the
// synthetic corpus, so each point of a period series is anchored as a trailing
// period ending today (the last point is the current week/month/quarter). A
// custom range selects the points whose anchored date falls inside [from, to].
export interface KpiRange {
  from: Date;
  to: Date;
}

export interface KpiQueryOptions {
  clearance: Clearance;
  area: Area | null;
  period: KpiPeriodType;
  range?: KpiRange | null;
  axisId?: string;
  market?: string;
  brand?: string;
  source?: string;
  initiativeType?: string;
  objectiveId?: string;
}

export interface KpiQueryResult {
  kpis: KpiCard[];
  facets: KpiFacets;
}

const axisById = new Map(AXES.map((a) => [a.id, a]));

// Effective clearance a KPI requires: the stricter of its own confidentiality
// and the confidentiality of any internal source document it blends. This is the
// fail-closed rule — a KPI can never be softer than the evidence behind it.
function requiredRank(kpi: EffectiveKpiDefinition): number {
  let rank = CLEARANCE_RANK[kpi.confidentiality];
  for (const s of kpi.sources) {
    if (s.kind === "internal" && s.docId) {
      const doc = getDoc(s.docId);
      if (doc) rank = Math.max(rank, CLEARANCE_RANK[doc.confidentiality]);
    }
  }
  return rank;
}

function isVisible(kpi: EffectiveKpiDefinition, clearance: Clearance, area: Area | null): boolean {
  // A null area means the persona is cross-area (super user): only clearance gates.
  return (
    requiredRank(kpi) <= CLEARANCE_RANK[clearance] &&
    (area === null || kpi.areas.includes(area))
  );
}

function attainment(current: number, target: number, direction: KpiDirection): number {
  if (direction === "lower-better") {
    return current === 0 ? 2 : target / current;
  }
  return target === 0 ? 0 : current / target;
}

// Status is driven by the definition's own configured thresholds — an admin
// can tighten or relax them per KPI without touching the engine.
function statusFor(att: number, thresholds: KpiThresholds): "on-track" | "amber" | "off-track" {
  if (att >= thresholds.amberBelow) return "on-track";
  if (att >= thresholds.criticalBelow) return "amber";
  return "off-track";
}

function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function buildSources(kpi: EffectiveKpiDefinition, clearance: Clearance): KpiSource[] {
  const roleRank = CLEARANCE_RANK[clearance];
  return kpi.sources.map((s) => {
    if (s.kind === "internal" && s.docId) {
      const doc = getDoc(s.docId);
      const chunk = doc?.chunks[0];
      const accessible = doc
        ? CLEARANCE_RANK[doc.confidentiality] <= roleRank
        : false;
      return {
        id: s.id,
        label: s.label,
        kind: "internal" as const,
        weight: s.weight,
        docId: s.docId,
        docTitle: doc?.title ?? s.label,
        sourceLoc: chunk?.breadcrumb ?? doc?.title ?? null,
        snippet: accessible ? chunk?.text ?? doc?.summary ?? null : null,
        version: doc?.quarter ?? null,
        owner: doc?.owner ?? null,
        confidentiality: doc?.confidentiality ?? null,
        validity: doc?.validity ?? null,
        confidence: kpi.confidence,
        conflict: Boolean(s.conflict),
        accessible,
      };
    }
    return {
      id: s.id,
      label: s.label,
      kind: "external" as const,
      weight: s.weight,
      docId: null,
      docTitle: s.label,
      sourceLoc: `External signal · ${s.label}`,
      snippet: s.note ?? `External signal contributed by ${s.label}.`,
      version: null,
      owner: s.label,
      confidentiality: "public",
      validity: "approved",
      confidence: kpi.confidence,
      conflict: Boolean(s.conflict),
      accessible: true,
    };
  });
}

function buildBlend(kpi: EffectiveKpiDefinition): string {
  const parts: string[] = [];
  if (kpi.sources.some((s) => s.kind === "internal")) parts.push("internal");
  for (const s of kpi.sources) {
    if (s.kind === "external" && !parts.includes(s.label)) parts.push(s.label);
  }
  return `${parts.join(" + ")} · ${kpi.confidence.toFixed(2)}`;
}

function periodWord(period: KpiPeriodType): string {
  return period;
}

// ---- Custom range resolution --------------------------------------------------

interface DatedPoint {
  date: Date;
  label: string;
  value: number;
}

// Pick the finest granularity whose series can meaningfully cover the span.
function rangeGranularity(range: KpiRange): KpiPeriodType {
  const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  if (days <= 120) return "week";
  if (days <= 740) return "month";
  return "quarter";
}

function pointDate(granularity: KpiPeriodType, n: number, i: number): Date {
  const now = new Date();
  const back = n - 1 - i;
  if (granularity === "week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - back * 7);
    return d;
  }
  if (granularity === "month") {
    return new Date(now.getFullYear(), now.getMonth() - back, 15);
  }
  const qMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), qMonth - back * 3, 15);
}

function pointLabel(granularity: KpiPeriodType, date: Date): string {
  if (granularity === "week") {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  if (granularity === "month") {
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

function seriesInRange(
  kpi: EffectiveKpiDefinition,
  range: KpiRange,
): { granularity: KpiPeriodType; points: DatedPoint[] } {
  const granularity = rangeGranularity(range);
  const base = kpi.series[granularity];
  const n = base.length;
  const points: DatedPoint[] = [];
  for (let i = 0; i < n; i++) {
    const date = pointDate(granularity, n, i);
    if (date >= range.from && date <= range.to) {
      points.push({ date, label: pointLabel(granularity, date), value: base[i] });
    }
  }
  return { granularity, points };
}

function rangeForecast(kpi: EffectiveKpiDefinition, series: number[]): KpiForecast {
  const n = series.length;
  if (n < 2) {
    const current = round(series[n - 1] ?? 0);
    return {
      projected: current,
      target: kpi.target,
      note:
        n === 0
          ? "No governed data points fall inside the selected range, so there is no history to project from."
          : "The selected range holds a single data point — not enough history to project a trajectory. Widen the range for a forecast.",
      deviationRisk: false,
      confidence: round(Math.max(0.5, kpi.confidence - 0.15), 2),
    };
  }
  const current = series[n - 1] ?? 0;
  const k = Math.min(3, n - 1);
  const slope = k > 0 ? (current - series[n - 1 - k]) / k : 0;
  const projected = round(current + slope * 3);
  const att = attainment(projected, kpi.target, kpi.direction);
  const deviationRisk = att < 0.98;
  const unit = kpi.unit;
  const trend =
    slope > 0.05 ? "the trend inside the selected range" : slope < -0.05 ? "the decline inside the selected range" : "the flat trend inside the selected range";
  const note = deviationRisk
    ? `Projecting forward from the selected range you land at ${projected}${unit} vs the ${kpi.target}${unit} target — deviation risk on ${trend}.`
    : `Projecting forward from the selected range you land at ${projected}${unit} vs the ${kpi.target}${unit} target — on course given ${trend}.`;
  return {
    projected,
    target: kpi.target,
    note,
    deviationRisk,
    confidence: round(Math.max(0.5, kpi.confidence - 0.05), 2),
  };
}

function buildForecast(
  kpi: EffectiveKpiDefinition,
  series: number[],
  period: KpiPeriodType,
): KpiForecast {
  const n = series.length;
  const current = series[n - 1] ?? 0;
  const k = Math.min(3, n - 1);
  const slope = k > 0 ? (current - series[n - 1 - k]) / k : 0;
  const horizon = 3;
  const projected = round(current + slope * horizon);
  const att = attainment(projected, kpi.target, kpi.direction);
  const deviationRisk = att < 0.98;
  const unit = kpi.unit;
  const trend =
    slope > 0.05 ? "the current upward trend" : slope < -0.05 ? "the current decline" : "the current flat trend";
  const note = deviationRisk
    ? `At this rate you close ${periodWord(period)}-end at ${projected}${unit} vs the ${kpi.target}${unit} target — deviation risk on ${trend}.`
    : `At this rate you close ${periodWord(period)}-end at ${projected}${unit} vs the ${kpi.target}${unit} target — on course given ${trend}.`;
  return {
    projected,
    target: kpi.target,
    note,
    deviationRisk,
    confidence: round(Math.max(0.5, kpi.confidence - 0.05), 2),
  };
}

function computeCard(
  kpi: EffectiveKpiDefinition,
  period: KpiPeriodType,
  clearance: Clearance,
  range?: KpiRange | null,
): KpiCard {
  const ranged = range ? seriesInRange(kpi, range) : null;
  const effectivePeriod = ranged ? ranged.granularity : period;
  const series = ranged ? ranged.points.map((p) => p.value) : kpi.series[period];
  const n = series.length;
  const current = round(series[n - 1] ?? 0);
  const prior = series[n - 2] ?? current;
  const variation = round(current - prior);
  const variationPct = prior !== 0 ? round((current - prior) / Math.abs(prior) * 100) : 0;
  const att = attainment(current, kpi.target, kpi.direction);
  const progress = round(att * 100);
  const sources = buildSources(kpi, clearance);
  const historicSource = kpi.sources.some((s) => {
    if (s.kind !== "internal" || !s.docId) return false;
    const doc = getDoc(s.docId);
    return doc?.validity === "historic" || doc?.validity === "superseded";
  });
  const axis = axisById.get(kpi.axisId);
  const objective = getObjective(kpi.objectiveId);
  return {
    id: kpi.id,
    objectiveId: kpi.objectiveId,
    objectiveName: objective?.name ?? "",
    name: kpi.name,
    description: kpi.description,
    unit: kpi.unit,
    axisId: kpi.axisId,
    axisName: axis?.name ?? "",
    axisColor: axis?.color ?? "#0066FF",
    market: kpi.market,
    brand: kpi.brand,
    initiativeType: kpi.initiativeType,
    confidentiality: kpi.confidentiality,
    periodType: effectivePeriod,
    current,
    target: kpi.target,
    direction: kpi.direction,
    progress,
    status: statusFor(att, kpi.thresholds),
    variation,
    variationPct,
    spark: series,
    composite: kpi.sources.length > 1,
    blend: buildBlend(kpi),
    confidence: kpi.confidence,
    validity: historicSource ? "historic" : "approved",
    historic: historicSource,
    conflict: kpi.sources.some((s) => Boolean(s.conflict)),
    sources,
    forecast: ranged ? rangeForecast(kpi, series) : buildForecast(kpi, series, period),
    owner: kpi.owner,
    thresholds: kpi.thresholds,
    definitionVersion: kpi.definitionVersion,
  };
}

export function listKpis(opts: KpiQueryOptions): KpiQueryResult {
  const visible = listEffectiveKpiDefinitions().filter((k) =>
    isVisible(k, opts.clearance, opts.area),
  );

  const facets: KpiFacets = {
    axes: dedupeAxes(visible.map((k) => k.axisId)),
    markets: unique(visible.map((k) => k.market)),
    brands: unique(visible.map((k) => k.brand)),
    sources: unique(visible.flatMap((k) => k.sources.map((s) => s.label))),
    initiativeTypes: unique(visible.map((k) => k.initiativeType)),
    objectives: dedupeObjectives(visible.map((k) => k.objectiveId)),
  };

  const filtered = visible.filter((k) => {
    if (opts.axisId && k.axisId !== opts.axisId) return false;
    if (opts.market && k.market !== opts.market) return false;
    if (opts.brand && k.brand !== opts.brand) return false;
    if (opts.initiativeType && k.initiativeType !== opts.initiativeType) return false;
    if (opts.source && !k.sources.some((s) => s.label === opts.source)) return false;
    if (opts.objectiveId && k.objectiveId !== opts.objectiveId) return false;
    return true;
  });

  const kpis = filtered.map((k) => computeCard(k, opts.period, opts.clearance, opts.range));
  return { kpis, facets };
}

export function getKpiDetail(
  id: string,
  opts: { clearance: Clearance; area: Area | null; period: KpiPeriodType; range?: KpiRange | null },
): KpiDetail | null {
  const kpi = getEffectiveKpiDefinition(id);
  if (!kpi || !isVisible(kpi, opts.clearance, opts.area)) return null;
  const card = computeCard(kpi, opts.period, opts.clearance, opts.range);
  if (opts.range) {
    const { granularity, points } = seriesInRange(kpi, opts.range);
    const series: KpiTimePoint[] = points.map((p) => ({ period: p.label, value: p.value }));
    // Breakdowns are shares of the headline figure; rescale them so they sum
    // toward the range's closing value instead of the full-series close.
    const fullSeries = kpi.series[granularity];
    const fullCurrent = fullSeries[fullSeries.length - 1] ?? 0;
    const rangeCurrent = points[points.length - 1]?.value ?? 0;
    const ratio = fullCurrent !== 0 ? rangeCurrent / fullCurrent : 0;
    const breakdowns = kpi.breakdowns.map((g) => ({
      dimension: g.dimension,
      points: g.points.map((p) => ({ label: p.label, value: round(p.value * ratio) })),
    }));
    return { kpi: card, series, breakdowns };
  }
  const series: KpiTimePoint[] = kpi.series[opts.period].map((value, i) => ({
    period: periodLabel(opts.period, i),
    value,
  }));
  return { kpi: card, series, breakdowns: kpi.breakdowns };
}

// Structured, clearance-filtered data context for the KPI-scoped chat: the full
// computed card (figures, status, variation, forecast) plus trend series and
// dimension breakdowns for every KPI in scope that the persona may see. This is
// assembled server-side from the corpus — client-supplied kpiIds only narrow the
// scope, never widen it past the persona's clearance/area.
export function getKpiChatData(
  kpiIds: string[],
  clearance: Clearance,
  area: Area | null,
  period: KpiPeriodType,
  range?: KpiRange | null,
): KpiDetail[] {
  const all = listEffectiveKpiDefinitions();
  const requested = kpiIds
    .map((id) => all.find((k) => k.id === id))
    .filter(
      (k): k is EffectiveKpiDefinition =>
        Boolean(k) && isVisible(k as EffectiveKpiDefinition, clearance, area),
    );
  const scope =
    requested.length > 0 ? requested : all.filter((k) => isVisible(k, clearance, area));
  return scope
    .map((k) => getKpiDetail(k.id, { clearance, area, period, range }))
    .filter((d): d is KpiDetail => d !== null);
}

// Evidence pool for the KPI-scoped chat: internal source-document chunks plus
// external mentions, restricted to the KPIs the persona can actually see.
export interface KpiEvidenceItem {
  refId: string;
  kind: "internal" | "external";
  title: string;
  breadcrumb: string;
  text: string;
  confidentiality: Clearance;
  accessible: boolean;
  version: string;
  owner: string;
  validity: string;
  validUntil: string | null;
  country: string | null;
  brand: string | null;
  axisIds: string[];
}

export function getKpiChatEvidence(
  kpiIds: string[],
  clearance: Clearance,
  area: Area | null,
): KpiEvidenceItem[] {
  const roleRank = CLEARANCE_RANK[clearance];
  const all = listEffectiveKpiDefinitions();
  const requested = kpiIds
    .map((id) => all.find((k) => k.id === id))
    .filter(
      (k): k is EffectiveKpiDefinition => Boolean(k) && isVisible(k as EffectiveKpiDefinition, clearance, area),
    );
  const scope = requested.length > 0
    ? requested
    : all.filter((k) => isVisible(k, clearance, area));
  const scopeIds = new Set(scope.map((k) => k.id));

  const items: KpiEvidenceItem[] = [];
  const seenChunks = new Set<string>();

  for (const kpi of scope) {
    for (const s of kpi.sources) {
      if (s.kind !== "internal" || !s.docId) continue;
      const doc = getDoc(s.docId);
      if (!doc) continue;
      for (const chunk of doc.chunks) {
        if (seenChunks.has(chunk.id)) continue;
        seenChunks.add(chunk.id);
        items.push({
          refId: doc.id,
          kind: "internal",
          title: doc.title,
          breadcrumb: chunk.breadcrumb,
          text: chunk.text,
          confidentiality: doc.confidentiality,
          accessible: CLEARANCE_RANK[doc.confidentiality] <= roleRank,
          version: doc.quarter,
          owner: doc.owner,
          validity: doc.validity,
          validUntil: doc.validUntil,
          country: doc.country,
          brand: doc.brand,
          axisIds: doc.axisIds,
        });
      }
    }
  }

  for (const m of KPI_MENTIONS) {
    if (!m.kpiIds.some((id) => scopeIds.has(id))) continue;
    items.push({
      refId: m.id,
      kind: "external",
      title: m.source,
      breadcrumb: `External signal · ${m.market} · ${m.date}`,
      text: m.text,
      confidentiality: m.confidentiality,
      accessible: CLEARANCE_RANK[m.confidentiality] <= roleRank,
      version: m.date,
      owner: m.source,
      validity: "approved",
      validUntil: null,
      country: m.market,
      brand: null,
      axisIds: [],
    });
  }

  return items;
}

// ---- Threshold / deviation alerts --------------------------------------------
// Deterministic, non-LLM: recomputed from the effective definitions' latest
// month attainment and forecast. Recorded per owner with a simulated
// Teams/email delivery channel; acknowledgements persist in the kpi store.

export function computeAndListAlerts(clearance: Clearance, area: Area | null): KpiAlertRecord[] {
  const synced = syncAlerts((def) => {
    const series = def.series.month;
    const current = series[series.length - 1] ?? 0;
    const att = attainment(current, def.target, def.direction);
    const found: { severity: "amber" | "critical" | "forecast"; message: string }[] = [];
    if (att < def.thresholds.criticalBelow) {
      found.push({
        severity: "critical",
        message: `${def.name} is at ${round(current)}${def.unit} against a ${def.target}${def.unit} target — below the critical threshold (${Math.round(def.thresholds.criticalBelow * 100)}% attainment). Owner notified.`,
      });
    } else if (att < def.thresholds.amberBelow) {
      found.push({
        severity: "amber",
        message: `${def.name} is at ${round(current)}${def.unit} against a ${def.target}${def.unit} target — below the amber threshold (${Math.round(def.thresholds.amberBelow * 100)}% attainment). Owner notified.`,
      });
    }
    const forecast = buildForecast(def, series, "month");
    if (forecast.deviationRisk && att >= def.thresholds.criticalBelow) {
      found.push({ severity: "forecast", message: `${def.name}: ${forecast.note}` });
    }
    return found;
  });

  // Fail closed: a persona only sees alerts for KPIs it could open itself.
  const visibleIds = new Set(
    listEffectiveKpiDefinitions()
      .filter((k) => isVisible(k, clearance, area))
      .map((k) => k.id),
  );
  return synced.filter((a) => visibleIds.has(a.kpiId));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function dedupeAxes(axisIds: string[]): { id: string; name: string; color: string }[] {
  const ids = Array.from(new Set(axisIds));
  return ids
    .map((id) => axisById.get(id))
    .filter((a): a is (typeof AXES)[number] => Boolean(a))
    .map((a) => ({ id: a.id, name: a.name, color: a.color }));
}

function dedupeObjectives(objectiveIds: string[]): { id: string; name: string }[] {
  const ids = Array.from(new Set(objectiveIds));
  return ids.map((id) => ({ id, name: getObjective(id)?.name ?? id }));
}

function periodLabel(period: KpiPeriodType, index: number): string {
  const prefix = period === "week" ? "W" : period === "month" ? "M" : "Q";
  return `${prefix}${index + 1}`;
}
