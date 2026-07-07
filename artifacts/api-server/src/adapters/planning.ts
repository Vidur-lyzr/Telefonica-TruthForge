// planning.orchestrate — Lyzr-named native planning adapter.
// Backed natively by the synthetic planning dataset. It returns permission-
// filtered calendar events, detects conflicts and activity gaps, and computes
// transparent heuristic predictions. A real Lyzr planning tool could be swapped
// in behind this same interface later.
//
// Governance rule (mirrors kb.retrieve): events above the persona's clearance
// are redacted to a "busy/blocked" stub BEFORE they leave this adapter, and all
// conflict/gap/prediction reasoning runs only over permitted events.

import { CLEARANCE_RANK, type Clearance, type Area } from "../data/corpus";
import {
  PLANNING_EVENTS,
  EXTERNAL_SIGNALS,
  PLANNING_TODAY,
  getPlanningEvent,
  type PlanningEvent,
} from "../data/planning";

// A persona's governance scope: an event is only revealed when it is within the
// persona's clearance AND within the persona's area. Anything outside either
// boundary is redacted to a busy/blocked stub BEFORE it leaves the adapter.
export interface PersonaScope {
  clearance: Clearance;
  area: Area;
}

const GAP_MIN_DAYS = 4;
const WORKLOAD_MIN = 3;
const SIGNAL_WINDOW_DAYS = 2;
const NEAR_MISS_DAYS = 3;

export interface EventFilters {
  from?: string;
  to?: string;
  area?: string;
  market?: string;
  brand?: string;
  axis?: string;
}

export interface EventView {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  area: string;
  type: string;
  status: string;
  owner: string;
  axisId: string;
  market: string;
  brand: string;
  source: string;
  confidentiality: string;
  restricted: boolean;
  conflict: boolean;
  description: string;
}

export interface EventLite {
  id: string;
  title: string;
  type: string;
  area: string;
  market: string;
  brand: string;
}

// ---------------------------------------------------------------------------
// Date helpers (dates are YYYY-MM-DD, which sort lexicographically)
// ---------------------------------------------------------------------------

function toDate(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(s: string, n: number): string {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}
function rangesOverlap(aS: string, aE: string, bS: string, bE: string): boolean {
  return aS <= bE && bS <= aE;
}
function inRange(evS: string, evE: string, from?: string, to?: string): boolean {
  if (from && evE < from) return false;
  if (to && evS > to) return false;
  return true;
}
function weekStart(s: string): string {
  const d = toDate(s);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return iso(d);
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmt(s: string): string {
  const d = toDate(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// ---------------------------------------------------------------------------
// Permission + filtering
// ---------------------------------------------------------------------------

function accessible(ev: PlanningEvent, scope: PersonaScope): boolean {
  return (
    CLEARANCE_RANK[ev.confidentiality] <= CLEARANCE_RANK[scope.clearance] &&
    ev.area === scope.area
  );
}

function matchesFacets(ev: PlanningEvent, f: EventFilters): boolean {
  if (f.area && ev.area !== f.area) return false;
  if (f.market && ev.market !== f.market) return false;
  if (f.brand && ev.brand !== f.brand) return false;
  if (f.axis && ev.axisId !== f.axis) return false;
  return inRange(ev.startDate, ev.endDate, f.from, f.to);
}

function redact(ev: PlanningEvent): EventView {
  return {
    id: ev.id,
    title: "Restricted activity",
    startDate: ev.startDate,
    endDate: ev.endDate,
    area: "",
    type: "event",
    status: "planned",
    owner: "",
    axisId: "",
    market: "",
    brand: "",
    source: "",
    confidentiality: ev.confidentiality,
    restricted: true,
    conflict: false,
    description: "",
  };
}

function reveal(ev: PlanningEvent, conflict: boolean): EventView {
  return {
    id: ev.id,
    title: ev.title,
    startDate: ev.startDate,
    endDate: ev.endDate,
    area: ev.area,
    type: ev.type,
    status: ev.status,
    owner: ev.owner,
    axisId: ev.axisId,
    market: ev.market,
    brand: ev.brand,
    source: ev.source,
    confidentiality: ev.confidentiality,
    restricted: false,
    conflict,
    description: ev.description,
  };
}

function lite(ev: PlanningEvent): EventLite {
  return { id: ev.id, title: ev.title, type: ev.type, area: ev.area, market: ev.market, brand: ev.brand };
}

// The set of permitted events matching the facets — the basis for all analysis.
function permittedInScope(scope: PersonaScope, f: EventFilters): PlanningEvent[] {
  return PLANNING_EVENTS.filter((e) => accessible(e, scope) && matchesFacets(e, f));
}

// ---------------------------------------------------------------------------
// Public: list events (permission-redacted)
// ---------------------------------------------------------------------------

export function listEvents(scope: PersonaScope, f: EventFilters): EventView[] {
  const scoped = PLANNING_EVENTS.filter((e) => matchesFacets(e, f));
  const conflictIds = conflictEventIds(permittedInScope(scope, f));
  return scoped
    .map((ev) =>
      accessible(ev, scope) ? reveal(ev, conflictIds.has(ev.id)) : redact(ev),
    )
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
}

export function getEventDetail(
  id: string,
  scope: PersonaScope,
): { event: EventView; conflictsWith: EventLite[] } | null {
  const ev = getPlanningEvent(id);
  if (!ev) return null;
  if (!accessible(ev, scope)) {
    return { event: redact(ev), conflictsWith: [] };
  }
  const others = PLANNING_EVENTS.filter(
    (o) =>
      o.id !== ev.id &&
      accessible(o, scope) &&
      o.market === ev.market &&
      rangesOverlap(ev.startDate, ev.endDate, o.startDate, o.endDate),
  );
  const conflictIds = conflictEventIds(PLANNING_EVENTS.filter((e) => accessible(e, scope)));
  return { event: reveal(ev, conflictIds.has(ev.id)), conflictsWith: others.map(lite) };
}

// ---------------------------------------------------------------------------
// Conflict detection (same market + overlapping dates, clustered)
// ---------------------------------------------------------------------------

interface Conflict {
  id: string;
  date: string;
  market: string;
  severity: string;
  eventIds: string[];
  events: EventLite[];
  suggestion: string;
}

function clusterMarket(events: PlanningEvent[]): PlanningEvent[][] {
  const sorted = [...events].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const clusters: PlanningEvent[][] = [];
  for (const ev of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && last.some((e) => rangesOverlap(e.startDate, e.endDate, ev.startDate, ev.endDate))) {
      last.push(ev);
    } else {
      clusters.push([ev]);
    }
  }
  return clusters;
}

function detectConflicts(events: PlanningEvent[]): Conflict[] {
  const byMarket = new Map<string, PlanningEvent[]>();
  for (const ev of events) {
    const list = byMarket.get(ev.market) ?? [];
    list.push(ev);
    byMarket.set(ev.market, list);
  }
  const conflicts: Conflict[] = [];
  for (const [market, list] of byMarket) {
    for (const cluster of clusterMarket(list)) {
      if (cluster.length < 2) continue;
      const sorted = [...cluster].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
      const earliest = sorted[0];
      const later = sorted[sorted.length - 1];
      const clearBy = addDays(earliest.endDate, 1);
      conflicts.push({
        id: `conflict-${cluster.map((e) => e.id).join("-")}`,
        date: earliest.startDate,
        market,
        severity: cluster.length > 2 ? "high" : "medium",
        eventIds: cluster.map((e) => e.id),
        events: cluster.map(lite),
        suggestion: `"${later.title}" overlaps "${earliest.title}" in ${market}. Worth checking whether "${later.title}" could move to on or after ${fmt(clearBy)} to give each activity clear air.`,
      });
    }
  }
  return conflicts.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function conflictEventIds(events: PlanningEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const c of detectConflicts(events)) for (const id of c.eventIds) ids.add(id);
  return ids;
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

interface Gap {
  start: string;
  end: string;
  days: number;
  note: string;
}

function detectGaps(events: PlanningEvent[], from?: string, to?: string): Gap[] {
  if (events.length === 0) return [];
  const covered = new Set<string>();
  let minDay = events[0].startDate;
  let maxDay = events[0].endDate;
  for (const ev of events) {
    if (ev.startDate < minDay) minDay = ev.startDate;
    if (ev.endDate > maxDay) maxDay = ev.endDate;
    for (let d = ev.startDate; d <= ev.endDate; d = addDays(d, 1)) covered.add(d);
  }
  const rangeStart = from && from > minDay ? from : minDay;
  const rangeEnd = to && to < maxDay ? to : maxDay;
  const gaps: Gap[] = [];
  let run: string[] = [];
  for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
    if (covered.has(d)) {
      if (run.length >= GAP_MIN_DAYS) {
        const start = run[0];
        const end = run[run.length - 1];
        gaps.push({ start, end, days: run.length, note: `No planned activity from ${fmt(start)} to ${fmt(end)} (${run.length} days) — a quiet window worth using or protecting.` });
      }
      run = [];
    } else {
      run.push(d);
    }
  }
  return gaps;
}

// ---------------------------------------------------------------------------
// Predictions (transparent heuristics, all framed as suggestions)
// ---------------------------------------------------------------------------

interface WorkloadPeriod { id: string; label: string; count: number; note: string; }
interface SuggestedDate { date: string; note: string; }
interface FutureConflict { id: string; market: string; date: string; note: string; }
interface SignalWarning { id: string; date: string; market: string; note: string; }
interface Cascade {
  eventId: string;
  eventTitle: string;
  fromDate: string;
  toDate: string;
  note: string;
  shifts: { eventId: string; title: string; note: string }[];
}
interface Predictions {
  workloadPeriods: WorkloadPeriod[];
  suggestedDates: SuggestedDate[];
  futureConflicts: FutureConflict[];
  signalWarnings: SignalWarning[];
  cascade: Cascade | null;
}

function computePredictions(
  events: PlanningEvent[],
  conflicts: Conflict[],
  from?: string,
  to?: string,
): Predictions {
  const anchor = PLANNING_TODAY;

  // Workload-heavy weeks
  const weekCounts = new Map<string, number>();
  for (const ev of events) {
    const w = weekStart(ev.startDate);
    weekCounts.set(w, (weekCounts.get(w) ?? 0) + 1);
  }
  const workloadPeriods: WorkloadPeriod[] = [...weekCounts.entries()]
    .filter(([, c]) => c >= WORKLOAD_MIN)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([w, c]) => ({
      id: `workload-${w}`,
      label: `Week of ${fmt(w)}`,
      count: c,
      note: `${c} activities land in the week of ${fmt(w)} — worth checking the team has capacity.`,
    }));

  // Suggested quiet dates (weekdays with no activity, in the forward horizon)
  const covered = new Set<string>();
  for (const ev of events) for (let d = ev.startDate; d <= ev.endDate; d = addDays(d, 1)) covered.add(d);
  const horizonStart = from && from > anchor ? from : anchor;
  const horizonEnd = to ?? addDays(anchor, 21);
  const suggestedDates: SuggestedDate[] = [];
  for (let d = horizonStart; d <= horizonEnd && suggestedDates.length < 2; d = addDays(d, 1)) {
    const dow = toDate(d).getUTCDay();
    if (dow === 0 || dow === 6) continue; // weekdays only
    if (covered.has(d)) continue;
    if (covered.has(addDays(d, -1)) || covered.has(addDays(d, 1))) continue; // clear air
    suggestedDates.push({ date: d, note: `${fmt(d)} looks like a clear window — a candidate date if you need to place a new activity.` });
  }

  // Near-miss future conflicts (same market, close but not overlapping)
  const futureConflicts: FutureConflict[] = [];
  const seenPairs = new Set<string>();
  const byMarket = new Map<string, PlanningEvent[]>();
  for (const ev of events) {
    const list = byMarket.get(ev.market) ?? [];
    list.push(ev);
    byMarket.set(ev.market, list);
  }
  for (const [market, list] of byMarket) {
    const sorted = [...list].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) continue; // already a hard conflict
      const gap = daysBetween(a.endDate, b.startDate);
      if (gap >= 0 && gap <= NEAR_MISS_DAYS) {
        const key = `${a.id}-${b.id}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        futureConflicts.push({
          id: `near-${key}`,
          market,
          date: b.startDate,
          note: `"${a.title}" and "${b.title}" sit ${gap} day${gap === 1 ? "" : "s"} apart in ${market} — a tight window that could clash if either slips.`,
        });
      }
    }
  }

  // External-signal timing warnings
  const signalWarnings: SignalWarning[] = [];
  for (const ev of events) {
    for (const sig of EXTERNAL_SIGNALS) {
      if (sig.market !== ev.market && sig.market !== "Group" && ev.market !== "Group") continue;
      const near = Math.abs(daysBetween(ev.startDate, sig.date));
      if (near <= SIGNAL_WINDOW_DAYS) {
        signalWarnings.push({
          id: `signal-${ev.id}-${sig.id}`,
          date: sig.date,
          market: ev.market,
          note: `"${ev.title}" is close to "${sig.title}" on ${fmt(sig.date)} — worth checking the timing so the two do not compete for attention.`,
        });
      }
    }
  }

  // Cascade preview for the first conflict
  let cascade: Cascade | null = null;
  const first = conflicts[0];
  if (first) {
    const clusterEvents = first.eventIds
      .map((id) => events.find((e) => e.id === id))
      .filter((e): e is PlanningEvent => Boolean(e))
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    const earliest = clusterEvents[0];
    const mover = clusterEvents[clusterEvents.length - 1];
    const toDateStr = addDays(earliest.endDate, 1);
    const shifts = events
      .filter(
        (e) =>
          e.id !== mover.id &&
          e.market === mover.market &&
          Math.abs(daysBetween(toDateStr, e.startDate)) <= NEAR_MISS_DAYS,
      )
      .map((e) => ({
        eventId: e.id,
        title: e.title,
        note: `moving "${mover.title}" to ${fmt(toDateStr)} would place it near "${e.title}" (${fmt(e.startDate)}).`,
      }));
    cascade = {
      eventId: mover.id,
      eventTitle: mover.title,
      fromDate: mover.startDate,
      toDate: toDateStr,
      note:
        shifts.length === 0
          ? `Moving "${mover.title}" to ${fmt(toDateStr)} would clear the ${first.market} conflict with no knock-on clashes.`
          : `Moving "${mover.title}" to ${fmt(toDateStr)} clears the ${first.market} conflict but would sit close to ${shifts.length} other ${shifts.length === 1 ? "activity" : "activities"} — worth checking.`,
      shifts,
    };
  }

  return { workloadPeriods, suggestedDates, futureConflicts, signalWarnings, cascade };
}

// ---------------------------------------------------------------------------
// Public: full insight bundle for a range
// ---------------------------------------------------------------------------

export interface Insights {
  conflicts: Conflict[];
  gaps: Gap[];
  predictions: Predictions;
  signals: {
    id: string;
    title: string;
    date: string;
    kind: string;
    market: string;
    description: string;
  }[];
}

export function analyze(scope: PersonaScope, f: EventFilters): Insights {
  const events = permittedInScope(scope, f);
  const conflicts = detectConflicts(events);
  const gaps = detectGaps(events, f.from, f.to);
  const predictions = computePredictions(events, conflicts, f.from, f.to);
  const signals = EXTERNAL_SIGNALS.filter((s) => inRange(s.date, s.date, f.from, f.to)).map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    kind: s.kind,
    market: s.market,
    description: s.description,
  }));
  return { conflicts, gaps, predictions, signals };
}

// ---------------------------------------------------------------------------
// Helpers for the planning agent (language layer)
// ---------------------------------------------------------------------------

export function permittedEvents(scope: PersonaScope): PlanningEvent[] {
  return PLANNING_EVENTS.filter((e) => accessible(e, scope));
}

// Events matching a query (market/brand/axis/type/date words) among permitted.
export function selectRelevantEvents(
  scope: PersonaScope,
  question: string,
  limit = 6,
): { permitted: PlanningEvent[]; blocked: PlanningEvent[] } {
  const q = question.toLowerCase();
  const scored = PLANNING_EVENTS.map((ev) => {
    let score = 0;
    const hay = `${ev.title} ${ev.market} ${ev.brand} ${ev.type} ${ev.area} ${ev.description} ${ev.owner}`.toLowerCase();
    for (const token of q.split(/[^a-z0-9]+/).filter((t) => t.length > 2)) {
      if (hay.includes(token)) score += 1;
    }
    return { ev, score };
  }).filter((s) => s.score > 0);

  const blocked = scored.filter((s) => !accessible(s.ev, scope)).map((s) => s.ev);
  const permitted = scored
    .filter((s) => accessible(s.ev, scope))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.ev);
  return { permitted, blocked };
}

export function forecastWindow(scope: PersonaScope, days = 10): {
  from: string;
  to: string;
  events: PlanningEvent[];
  insights: Insights;
} {
  const from = PLANNING_TODAY;
  const to = addDays(PLANNING_TODAY, days);
  const events = permittedEvents(scope).filter((e) => inRange(e.startDate, e.endDate, from, to));
  const insights = analyze(scope, { from, to });
  return { from, to, events, insights };
}

export { PLANNING_TODAY, fmt as formatPlanningDate };
