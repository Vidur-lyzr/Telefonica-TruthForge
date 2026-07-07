// home — front-door aggregation adapter.
// Backed natively by the synthetic corpus + seed activity data. Every accessor
// filters fail-closed by the persona's clearance (an unknown/absent role
// defaults to the least-privileged "public" scope), exactly like retrieval.

import {
  DOCS,
  RADAR_EVENTS,
  KPI_ITEMS,
  PLANNING_EVENTS,
  GENERATE_DRAFTS,
  ROLES,
  getDoc,
  CLEARANCE_RANK,
  type Clearance,
  type Area,
} from "../data/corpus";

export interface RadarItemOut {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  timestamp: string;
  href: string;
  evidenceDocId: string | null;
  evidenceDocTitle: string | null;
  axisId: string | null;
  tone: string | null;
}

export interface HomeCardStatOut {
  app: string;
  value: number;
  caption: string;
  tone: string | null;
  axisId: string | null;
}

export interface HomeSummaryOut {
  generate: HomeCardStatOut;
  kpis: HomeCardStatOut;
  planning: HomeCardStatOut;
  ask: HomeCardStatOut;
}

// Resolve a persona id to a clearance rank. Fail closed: no/unknown role → public.
function rankFor(roleId?: string): number {
  const role = roleId ? ROLES.find((r) => r.id === roleId) : undefined;
  const clearance: Clearance = role?.clearance ?? "public";
  return CLEARANCE_RANK[clearance];
}

// Persona clearance filter (fail-closed) plus an optional area scope. An item
// with no `areas` is treated as cross-area (always in scope); when `area` is
// supplied, area-tagged items must include it to surface — this is what makes
// the front door show the persona's *own* queue rather than everyone's.
function visible<T extends { clearance: Clearance; areas?: Area[] }>(
  items: T[],
  roleId?: string,
  area?: Area,
): T[] {
  const rank = rankFor(roleId);
  return items.filter((i) => {
    if (CLEARANCE_RANK[i.clearance] > rank) return false;
    if (area && i.areas && i.areas.length > 0 && !i.areas.includes(area)) return false;
    return true;
  });
}

// Resolve the effective area scope. An explicit request `area` wins; otherwise
// fall back to the persona's home area so each role sees its own queue.
function areaFor(roleId?: string, area?: Area): Area | undefined {
  if (area) return area;
  const role = roleId ? ROLES.find((r) => r.id === roleId) : undefined;
  return role?.area;
}

// Corpus docs carry `confidentiality` rather than `clearance`. Optionally scope
// to an area (docs are area-tagged); when no area is given, all clearance-visible
// docs count (used by the Data governance view).
function visibleDocs(roleId?: string, area?: Area): typeof DOCS {
  const rank = rankFor(roleId);
  return DOCS.filter((d) => {
    if (CLEARANCE_RANK[d.confidentiality] > rank) return false;
    if (area && d.areas.length > 0 && !d.areas.includes(area)) return false;
    return true;
  });
}

function isoFromHoursAgo(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3600_000).toISOString();
}

export function radarFor(roleId?: string, area?: Area, limit = 8): RadarItemOut[] {
  const scope = areaFor(roleId, area);
  return visible(RADAR_EVENTS, roleId, scope)
    .slice()
    .sort((a, b) => a.hoursAgo - b.hoursAgo)
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      detail: e.detail,
      timestamp: isoFromHoursAgo(e.hoursAgo),
      href: e.href,
      evidenceDocId: e.evidenceDocId,
      evidenceDocTitle: e.evidenceDocId ? getDoc(e.evidenceDocId)?.title ?? null : null,
      axisId: e.axisId,
      tone: e.tone,
    }));
}

export function homeSummaryFor(roleId?: string, area?: Area): HomeSummaryOut {
  const scope = areaFor(roleId, area);

  const drafts = visible(GENERATE_DRAFTS, roleId, scope);
  const draftsInProgress = drafts.filter((d) => d.status === "in_progress");

  const kpis = visible(KPI_ITEMS, roleId, scope);
  const kpiOffTarget = kpis.filter((k) => k.status === "off_target");

  const plans = visible(PLANNING_EVENTS, roleId, scope);
  const plansThisWeek = plans.filter((p) => p.thisWeek);
  const planConflicts = plansThisWeek.filter((p) => p.conflict);

  const askableSources = visibleDocs(roleId, scope).filter(
    (d) => d.validity === "approved",
  );

  return {
    generate: {
      app: "generate",
      value: draftsInProgress.length,
      caption: draftsInProgress.length === 1 ? "draft in progress" : "drafts in progress",
      tone: "default",
      axisId: null,
    },
    kpis: {
      app: "kpis",
      value: kpis.length,
      caption:
        kpiOffTarget.length > 0
          ? `${kpis.length} tracked · ${kpiOffTarget.length} off-target`
          : `${kpis.length} tracked · on target`,
      tone: kpiOffTarget.length > 0 ? "warning" : "default",
      axisId: kpiOffTarget[0]?.axisId ?? null,
    },
    planning: {
      app: "planning",
      value: plansThisWeek.length,
      caption:
        planConflicts.length > 0
          ? `this week · ${planConflicts.length} conflict${planConflicts.length === 1 ? "" : "s"}`
          : "events this week",
      tone: planConflicts.length > 0 ? "warning" : "default",
      axisId: null,
    },
    ask: {
      app: "ask",
      value: askableSources.length,
      caption: askableSources.length === 1 ? "source you can cite" : "sources you can cite",
      tone: "default",
      axisId: null,
    },
  };
}

// Extended corpus stats, optionally scoped to a persona's clearance. When no
// role is supplied, the full governed corpus is reported (the Data governance
// view). Fail-closed applies when a role is present.
export function corpusStatsFor(roleId?: string) {
  const docs = roleId ? visibleDocs(roleId) : DOCS;

  const tally = (fn: (d: (typeof docs)[number]) => string) => {
    const map = new Map<string, number>();
    for (const d of docs) map.set(fn(d), (map.get(fn(d)) ?? 0) + 1);
    return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
  };

  const byAxisMap = new Map<string, number>();
  for (const d of docs)
    for (const a of d.axisIds) byAxisMap.set(a, (byAxisMap.get(a) ?? 0) + 1);

  const approved = docs.filter((d) => d.validity === "approved").length;
  const validatedPercent =
    docs.length > 0 ? Math.round((approved / docs.length) * 100) : 0;

  const visibleKnowledge = visible(
    RADAR_EVENTS.filter((e) => e.kind === "knowledge_event"),
    roleId,
  ).sort((a, b) => a.hoursAgo - b.hoursAgo);
  const lastUpdated = isoFromHoursAgo(visibleKnowledge[0]?.hoursAgo ?? 0);

  return {
    totalDocuments: docs.length,
    totalChunks: docs.reduce((sum, d) => sum + d.chunks.length, 0),
    quarantined: docs.filter(
      (d) => d.validity === "superseded" || d.validity === "review",
    ).length,
    validatedPercent,
    lastUpdated,
    byCountry: tally((d) => d.country),
    byType: tally((d) => d.type),
    byConfidentiality: tally((d) => d.confidentiality),
    byValidity: tally((d) => d.validity),
    byAxis: Array.from(byAxisMap.entries()).map(([axisId, count]) => ({
      axisId,
      count,
    })),
    byLanguage: tally((d) => d.language),
  };
}
