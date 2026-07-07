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
  KPIS,
  KPI_MENTIONS,
  CLEARANCE_RANK,
  getDoc,
  getKpiById,
  getObjective,
  type Clearance,
  type Area,
  type KpiDefinition,
  type KpiPeriodType,
  type KpiDirection,
} from "../data/corpus";

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
}

export interface KpiQueryOptions {
  clearance: Clearance;
  area: Area;
  period: KpiPeriodType;
  axisId?: string;
  market?: string;
  brand?: string;
  source?: string;
  initiativeType?: string;
}

export interface KpiQueryResult {
  kpis: KpiCard[];
  facets: KpiFacets;
}

const axisById = new Map(AXES.map((a) => [a.id, a]));

// Effective clearance a KPI requires: the stricter of its own confidentiality
// and the confidentiality of any internal source document it blends. This is the
// fail-closed rule — a KPI can never be softer than the evidence behind it.
function requiredRank(kpi: KpiDefinition): number {
  let rank = CLEARANCE_RANK[kpi.confidentiality];
  for (const s of kpi.sources) {
    if (s.kind === "internal" && s.docId) {
      const doc = getDoc(s.docId);
      if (doc) rank = Math.max(rank, CLEARANCE_RANK[doc.confidentiality]);
    }
  }
  return rank;
}

function isVisible(kpi: KpiDefinition, clearance: Clearance, area: Area): boolean {
  return requiredRank(kpi) <= CLEARANCE_RANK[clearance] && kpi.areas.includes(area);
}

function attainment(current: number, target: number, direction: KpiDirection): number {
  if (direction === "lower-better") {
    return current === 0 ? 2 : target / current;
  }
  return target === 0 ? 0 : current / target;
}

function statusFor(att: number): "on-track" | "amber" | "off-track" {
  if (att >= 1) return "on-track";
  if (att >= 0.92) return "amber";
  return "off-track";
}

function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function buildSources(kpi: KpiDefinition, clearance: Clearance): KpiSource[] {
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

function buildBlend(kpi: KpiDefinition): string {
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

function buildForecast(
  kpi: KpiDefinition,
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
    ? `On ${trend}, this lands near ${projected}${unit} by ${periodWord(period)}-end — short of the ${kpi.target}${unit} target.`
    : `On ${trend}, this holds around ${projected}${unit} by ${periodWord(period)}-end, at or above the ${kpi.target}${unit} target.`;
  return {
    projected,
    target: kpi.target,
    note,
    deviationRisk,
    confidence: round(Math.max(0.5, kpi.confidence - 0.05), 2),
  };
}

function computeCard(
  kpi: KpiDefinition,
  period: KpiPeriodType,
  clearance: Clearance,
): KpiCard {
  const series = kpi.series[period];
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
    periodType: period,
    current,
    target: kpi.target,
    direction: kpi.direction,
    progress,
    status: statusFor(att),
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
    forecast: buildForecast(kpi, series, period),
  };
}

export function listKpis(opts: KpiQueryOptions): KpiQueryResult {
  const visible = KPIS.filter((k) => isVisible(k, opts.clearance, opts.area));

  const facets: KpiFacets = {
    axes: dedupeAxes(visible.map((k) => k.axisId)),
    markets: unique(visible.map((k) => k.market)),
    brands: unique(visible.map((k) => k.brand)),
    sources: unique(visible.flatMap((k) => k.sources.map((s) => s.label))),
    initiativeTypes: unique(visible.map((k) => k.initiativeType)),
  };

  const filtered = visible.filter((k) => {
    if (opts.axisId && k.axisId !== opts.axisId) return false;
    if (opts.market && k.market !== opts.market) return false;
    if (opts.brand && k.brand !== opts.brand) return false;
    if (opts.initiativeType && k.initiativeType !== opts.initiativeType) return false;
    if (opts.source && !k.sources.some((s) => s.label === opts.source)) return false;
    return true;
  });

  const kpis = filtered.map((k) => computeCard(k, opts.period, opts.clearance));
  return { kpis, facets };
}

export function getKpiDetail(
  id: string,
  opts: { clearance: Clearance; area: Area; period: KpiPeriodType },
): KpiDetail | null {
  const kpi = getKpiById(id);
  if (!kpi || !isVisible(kpi, opts.clearance, opts.area)) return null;
  const card = computeCard(kpi, opts.period, opts.clearance);
  const series: KpiTimePoint[] = kpi.series[opts.period].map((value, i) => ({
    period: periodLabel(opts.period, i),
    value,
  }));
  return { kpi: card, series, breakdowns: kpi.breakdowns };
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
  area: Area,
): KpiEvidenceItem[] {
  const roleRank = CLEARANCE_RANK[clearance];
  const requested = kpiIds
    .map((id) => getKpiById(id))
    .filter((k): k is KpiDefinition => Boolean(k) && isVisible(k as KpiDefinition, clearance, area));
  const scope = requested.length > 0
    ? requested
    : KPIS.filter((k) => isVisible(k, clearance, area));
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

function periodLabel(period: KpiPeriodType, index: number): string {
  const prefix = period === "week" ? "W" : period === "month" ? "M" : "Q";
  return `${prefix}${index + 1}`;
}
