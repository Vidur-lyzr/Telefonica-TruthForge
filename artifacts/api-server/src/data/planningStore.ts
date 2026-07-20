// File-backed store for the Planning surface: events created or edited in the
// Hub (an overlay over the read-only seed calendar) and the simulated
// bidirectional sync-back records that every mutation produces.
//
// State is held in memory for sync reads and write-through persisted to the
// store_snapshots table so Hub edits survive autoscale instance recycling.
// The sync records are honest about their nature: the Hub simulates writing
// the change back to the origin source (Asana, Excel, ...) and labels every
// record "pending confirmation" — the origin system never actually confirms
// in this demo, per the RFP's to-confirm framing.

import { logger } from "../lib/logger";
import { loadSnapshot, createSnapshotWriter } from "./dbSnapshot";
import {
  PLANNING_EVENTS,
  type PlanningEvent,
} from "./planning";

export type SyncAction = "created" | "updated" | "moved";

export interface SyncRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  source: string; // origin system the change is "written back" to
  action: SyncAction;
  detail: string;
  requestedBy: string; // persona label
  requestedAt: string;
  // Simulated bidirectional sync: the write-back is recorded as sent but the
  // origin system has not confirmed it. Honestly labelled per the RFP.
  status: "pending_confirmation";
}

const STORE_NAME = "planning-store";

interface PersistedState {
  createdEvents: PlanningEvent[];
  // Overrides keyed by event id — full replacement records for edited/moved
  // seed events (or edits over created events).
  overrides: Record<string, PlanningEvent>;
  syncRecords: SyncRecord[];
  idCounter: number;
}

let createdEvents: PlanningEvent[] = [];
let overrides = new Map<string, PlanningEvent>();
let syncRecords: SyncRecord[] = [];
let idCounter = 0;

const writer = createSnapshotWriter(STORE_NAME, (): PersistedState => ({
  createdEvents,
  overrides: Object.fromEntries(overrides),
  syncRecords,
  idCounter,
}));

export async function initPlanningStore(): Promise<void> {
  try {
    const raw = await loadSnapshot<Partial<PersistedState>>(STORE_NAME);
    if (!raw) return;
    createdEvents = Array.isArray(raw.createdEvents) ? raw.createdEvents : [];
    overrides = new Map(Object.entries(raw.overrides ?? {}));
    syncRecords = Array.isArray(raw.syncRecords) ? raw.syncRecords : [];
    idCounter = typeof raw.idCounter === "number" ? raw.idCounter : 0;
    logger.info(
      { created: createdEvents.length, overrides: overrides.size, sync: syncRecords.length },
      "planning store loaded from database",
    );
  } catch (err) {
    logger.error({ err }, "planning store could not be loaded; starting empty");
    createdEvents = [];
    overrides = new Map();
    syncRecords = [];
  }
}

function persist(): void {
  writer.schedule();
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

// The unified event set the whole planning surface reads: seed events with any
// Hub edits applied, plus events created in the Hub.
export function allPlanningEvents(): PlanningEvent[] {
  const seed = PLANNING_EVENTS.map((e) => overrides.get(e.id) ?? e);
  const created = createdEvents.map((e) => overrides.get(e.id) ?? e);
  return [...seed, ...created];
}

export function findPlanningEvent(id: string): PlanningEvent | undefined {
  return allPlanningEvents().find((e) => e.id === id);
}

export function createPlanningEvent(
  input: Omit<PlanningEvent, "id">,
  requestedBy: string,
): { event: PlanningEvent; sync: SyncRecord } {
  const event: PlanningEvent = { ...input, id: nextId("evt-hub") };
  createdEvents.push(event);
  const sync = addSyncRecord({
    eventId: event.id,
    eventTitle: event.title,
    source: event.source,
    action: "created",
    detail: `New ${event.type} "${event.title}" (${event.startDate}${
      event.endDate !== event.startDate ? ` to ${event.endDate}` : ""
    }, ${event.market}) written back to ${event.source}.`,
    requestedBy,
  });
  persist();
  return { event, sync };
}

export function updatePlanningEvent(
  id: string,
  patch: Partial<Omit<PlanningEvent, "id">>,
  requestedBy: string,
): { event: PlanningEvent; sync: SyncRecord } | null {
  const current = findPlanningEvent(id);
  if (!current) return null;
  const next: PlanningEvent = { ...current, ...patch, id };
  overrides.set(id, next);

  const moved =
    patch.startDate !== undefined || patch.endDate !== undefined
      ? current.startDate !== next.startDate || current.endDate !== next.endDate
      : false;
  const action: SyncAction = moved ? "moved" : "updated";
  const detail = moved
    ? `"${next.title}" moved from ${current.startDate}${
        current.endDate !== current.startDate ? `–${current.endDate}` : ""
      } to ${next.startDate}${
        next.endDate !== next.startDate ? `–${next.endDate}` : ""
      }; change written back to ${next.source}.`
    : `"${next.title}" details updated; change written back to ${next.source}.`;

  const sync = addSyncRecord({
    eventId: id,
    eventTitle: next.title,
    source: next.source,
    action,
    detail,
    requestedBy,
  });
  persist();
  return { event: next, sync };
}

function addSyncRecord(
  input: Omit<SyncRecord, "id" | "requestedAt" | "status">,
): SyncRecord {
  const record: SyncRecord = {
    ...input,
    id: nextId("sync"),
    requestedAt: new Date().toISOString(),
    status: "pending_confirmation",
  };
  syncRecords.unshift(record);
  if (syncRecords.length > 200) syncRecords.length = 200;
  return record;
}

export function listSyncRecords(eventId?: string): SyncRecord[] {
  return eventId ? syncRecords.filter((r) => r.eventId === eventId) : syncRecords;
}
