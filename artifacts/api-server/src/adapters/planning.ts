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
  EXTERNAL_SIGNALS,
  PLANNING_TODAY,
  type PlanningEvent,
} from "../data/planning";
import { allPlanningEvents, findPlanningEvent } from "../data/planningStore";

// A persona's governance scope: an event is only revealed when it is within the
// persona's clearance AND within the persona's area. Anything outside either
// boundary is redacted to a busy/blocked stub BEFORE it leaves the adapter.
export interface PersonaScope {
  clearance: Clearance;
  // null = cross-area super user: not area-scoped, sees every area.
  area: Area | null;
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
  type?: string;
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
    (scope.area === null || ev.area === scope.area)
  );
}

function matchesFacets(ev: PlanningEvent, f: EventFilters): boolean {
  if (f.area && ev.area !== f.area) return false;
  if (f.market && ev.market !== f.market) return false;
  if (f.brand && ev.brand !== f.brand) return false;
  if (f.axis && ev.axisId !== f.axis) return false;
  if (f.type && ev.type !== f.type) return false;
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
  return allPlanningEvents().filter((e) => accessible(e, scope) && matchesFacets(e, f));
}

// ---------------------------------------------------------------------------
// Public: list events (permission-redacted)
// ---------------------------------------------------------------------------

export function listEvents(scope: PersonaScope, f: EventFilters): EventView[] {
  const scoped = allPlanningEvents().filter((e) => matchesFacets(e, f));
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
  const ev = findPlanningEvent(id);
  if (!ev) return null;
  if (!accessible(ev, scope)) {
    return { event: redact(ev), conflictsWith: [] };
  }
  const others = allPlanningEvents().filter(
    (o) =>
      o.id !== ev.id &&
      accessible(o, scope) &&
      o.market === ev.market &&
      rangesOverlap(ev.startDate, ev.endDate, o.startDate, o.endDate),
  );
  const conflictIds = conflictEventIds(allPlanningEvents().filter((e) => accessible(e, scope)));
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
interface DelayRisk {
  eventId: string;
  title: string;
  date: string;
  level: "medium" | "high";
  note: string;
}
interface Predictions {
  workloadPeriods: WorkloadPeriod[];
  suggestedDates: SuggestedDate[];
  futureConflicts: FutureConflict[];
  signalWarnings: SignalWarning[];
  delayRisks: DelayRisk[];
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

  // Delay prediction — transparent, history-style heuristics: an activity is
  // flagged when it is already marked at risk, or when its owner has another
  // activity that ends 1 day or less before it starts (no slack to absorb a
  // slip). Deterministic; framed as suggestions.
  const delayRisks: DelayRisk[] = [];
  for (const ev of events) {
    if (ev.status === "done" || ev.endDate < anchor) continue;
    if (ev.status === "at_risk") {
      delayRisks.push({
        eventId: ev.id,
        title: ev.title,
        date: ev.startDate,
        level: "high",
        note: `"${ev.title}" is already marked at risk — a delay is likely; downstream activity in ${ev.market} should be checked.`,
      });
      continue;
    }
    const tightPredecessor = events.find(
      (o) =>
        o.id !== ev.id &&
        o.owner === ev.owner &&
        o.endDate <= ev.startDate &&
        daysBetween(o.endDate, ev.startDate) <= 1 &&
        o.status !== "done",
    );
    if (tightPredecessor) {
      delayRisks.push({
        eventId: ev.id,
        title: ev.title,
        date: ev.startDate,
        level: "medium",
        note: `"${ev.title}" starts ${daysBetween(tightPredecessor.endDate, ev.startDate)} day(s) after "${tightPredecessor.title}" ends for the same owner (${ev.owner}) — no slack if the earlier activity slips.`,
      });
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

  return { workloadPeriods, suggestedDates, futureConflicts, signalWarnings, delayRisks, cascade };
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
  return allPlanningEvents().filter((e) => accessible(e, scope));
}

// Whether a persona may act on (create/edit/move) an event with the given
// governance attributes. Same fail-closed rule as visibility: within clearance
// AND within area. Exposed for the mutation routes.
export function canActOn(
  scope: PersonaScope,
  attrs: { confidentiality: Clearance; area: Area },
): boolean {
  return (
    CLEARANCE_RANK[attrs.confidentiality] <= CLEARANCE_RANK[scope.clearance] &&
    (scope.area === null || attrs.area === scope.area)
  );
}

export function accessibleEvent(id: string, scope: PersonaScope): PlanningEvent | null {
  const ev = findPlanningEvent(id);
  if (!ev) return null;
  return accessible(ev, scope) ? ev : null;
}

// Events matching a query (market/brand/axis/type/date words) among permitted.
export function selectRelevantEvents(
  scope: PersonaScope,
  question: string,
  limit = 6,
): { permitted: PlanningEvent[]; blocked: PlanningEvent[] } {
  const q = question.toLowerCase();
  const scored = allPlanningEvents().map((ev) => {
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

// ---------------------------------------------------------------------------
// What-if cascade simulation: move one permitted event to a new start date and
// report, deterministically, what the move would resolve and what it would
// newly disturb — without changing anything.
// ---------------------------------------------------------------------------

export interface MoveSimulation {
  eventId: string;
  eventTitle: string;
  fromStart: string;
  fromEnd: string;
  toStart: string;
  toEnd: string;
  resolved: { eventId: string; title: string; note: string }[];
  newConflicts: { eventId: string; title: string; note: string }[];
  nearMisses: { eventId: string; title: string; note: string }[];
  signalWarnings: { signalId: string; title: string; date: string; note: string }[];
  verdict: string;
}

export function simulateMove(
  scope: PersonaScope,
  eventId: string,
  toStart: string,
): MoveSimulation | null {
  const ev = accessibleEvent(eventId, scope);
  if (!ev) return null;
  const duration = daysBetween(ev.startDate, ev.endDate);
  const toEnd = addDays(toStart, duration);
  const others = permittedEvents(scope).filter(
    (o) => o.id !== ev.id && o.market === ev.market,
  );

  const overlapsNow = others.filter((o) =>
    rangesOverlap(ev.startDate, ev.endDate, o.startDate, o.endDate),
  );
  const overlapsAfter = others.filter((o) =>
    rangesOverlap(toStart, toEnd, o.startDate, o.endDate),
  );
  const afterIds = new Set(overlapsAfter.map((o) => o.id));

  const resolved = overlapsNow
    .filter((o) => !afterIds.has(o.id))
    .map((o) => ({
      eventId: o.id,
      title: o.title,
      note: `The current overlap with "${o.title}" (${fmt(o.startDate)}) would be cleared.`,
    }));
  const newConflicts = overlapsAfter
    .filter((o) => !overlapsNow.some((n) => n.id === o.id))
    .map((o) => ({
      eventId: o.id,
      title: o.title,
      note: `The new dates would overlap "${o.title}" (${fmt(o.startDate)}${o.endDate !== o.startDate ? `–${fmt(o.endDate)}` : ""}) in ${ev.market}.`,
    }));
  const nearMisses = others
    .filter((o) => !afterIds.has(o.id))
    .filter((o) => {
      const gap = o.startDate > toEnd ? daysBetween(toEnd, o.startDate) : daysBetween(o.endDate, toStart);
      return gap >= 0 && gap <= NEAR_MISS_DAYS;
    })
    .map((o) => ({
      eventId: o.id,
      title: o.title,
      note: `"${o.title}" (${fmt(o.startDate)}) would sit within ${NEAR_MISS_DAYS} days of the new dates — tight if either slips.`,
    }));
  const signalWarnings = EXTERNAL_SIGNALS.filter(
    (s) => s.market === ev.market || s.market === "Group" || ev.market === "Group",
  )
    .filter((s) => Math.abs(daysBetween(toStart, s.date)) <= SIGNAL_WINDOW_DAYS)
    .map((s) => ({
      signalId: s.id,
      title: s.title,
      date: s.date,
      note: `The new date lands near "${s.title}" (${fmt(s.date)}) — the two could compete for attention.`,
    }));

  const verdict =
    newConflicts.length > 0
      ? `Moving "${ev.title}" to ${fmt(toStart)} would create ${newConflicts.length} new overlap${newConflicts.length === 1 ? "" : "s"} — worth reconsidering the date.`
      : resolved.length > 0
        ? `Moving "${ev.title}" to ${fmt(toStart)} would clear ${resolved.length} existing overlap${resolved.length === 1 ? "" : "s"}${nearMisses.length > 0 ? `, though ${nearMisses.length} nearby activit${nearMisses.length === 1 ? "y sits" : "ies sit"} close` : ""}.`
        : nearMisses.length > 0 || signalWarnings.length > 0
          ? `Moving "${ev.title}" to ${fmt(toStart)} creates no hard overlap, but the window is tight — check the nearby items below.`
          : `Moving "${ev.title}" to ${fmt(toStart)} looks clean: no overlaps, near misses or external signals detected in ${ev.market}.`;

  return {
    eventId: ev.id,
    eventTitle: ev.title,
    fromStart: ev.startDate,
    fromEnd: ev.endDate,
    toStart,
    toEnd,
    resolved,
    newConflicts,
    nearMisses,
    signalWarnings,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Alerts: deterministic per-owner records for upcoming milestones, detected
// conflicts and plan deviations, over the persona's permitted events only.
// ---------------------------------------------------------------------------

export interface AlertRecord {
  id: string;
  kind: "milestone" | "conflict" | "deviation";
  owner: string;
  eventId: string;
  eventTitle: string;
  date: string;
  severity: "info" | "warning";
  note: string;
}

const MILESTONE_HORIZON_DAYS = 7;

export function buildAlerts(scope: PersonaScope): AlertRecord[] {
  const events = permittedEvents(scope);
  const insights = analyze(scope, {});
  const alerts: AlertRecord[] = [];

  for (const ev of events) {
    const lead = daysBetween(PLANNING_TODAY, ev.startDate);
    if (lead >= 0 && lead <= MILESTONE_HORIZON_DAYS && ev.status !== "done") {
      alerts.push({
        id: `alert-milestone-${ev.id}`,
        kind: "milestone",
        owner: ev.owner,
        eventId: ev.id,
        eventTitle: ev.title,
        date: ev.startDate,
        severity: "info",
        note: `"${ev.title}" starts ${lead === 0 ? "today" : `in ${lead} day${lead === 1 ? "" : "s"}`} (${fmt(ev.startDate)}) — reminder for ${ev.owner}.`,
      });
    }
  }

  for (const c of insights.conflicts) {
    for (const e of c.events) {
      const full = events.find((x) => x.id === e.id);
      if (!full) continue;
      alerts.push({
        id: `alert-conflict-${c.id}-${e.id}`,
        kind: "conflict",
        owner: full.owner,
        eventId: e.id,
        eventTitle: e.title,
        date: c.date,
        severity: "warning",
        note: c.suggestion,
      });
    }
  }

  for (const d of insights.predictions.delayRisks) {
    const full = events.find((x) => x.id === d.eventId);
    if (!full) continue;
    alerts.push({
      id: `alert-deviation-${d.eventId}`,
      kind: "deviation",
      owner: full.owner,
      eventId: d.eventId,
      eventTitle: d.title,
      date: d.date,
      severity: "warning",
      note: d.note,
    });
  }

  return alerts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export { PLANNING_TODAY, fmt as formatPlanningDate };
