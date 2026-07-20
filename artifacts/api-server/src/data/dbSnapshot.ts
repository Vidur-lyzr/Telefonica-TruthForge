// Shared Postgres JSONB snapshot persistence for the low-churn stores.
//
// Replaces the per-store .data/*.json file writers: each store keeps its
// synchronous in-memory API, loads its snapshot ONCE at boot (initStores in
// index.ts, before the server starts listening), and write-through persists
// via a debounced, serialized UPSERT into the store_snapshots table. This is
// what makes admin state survive autoscale instance recycling and republish.
//
// Semantics per store row are last-writer-wins — acceptable for these stores
// because they are admin-edited, low-frequency and effectively single-writer.
// Append-heavy or enforcement-critical data (observatory events, retrieval
// log, user usage ledger) does NOT go through here; those have real
// row-per-record tables so concurrent instances can never lose records.

import { db, storeSnapshots } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function loadSnapshot<T>(storeName: string): Promise<T | null> {
  const rows = await db
    .select({ data: storeSnapshots.data })
    .from(storeSnapshots)
    .where(eq(storeSnapshots.storeName, storeName))
    .limit(1);
  return rows.length > 0 ? (rows[0].data as T) : null;
}

export async function saveSnapshot(storeName: string, data: unknown): Promise<void> {
  await db
    .insert(storeSnapshots)
    .values({ storeName, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: storeSnapshots.storeName,
      set: { data: sql`excluded.data`, updatedAt: sql`excluded.updated_at` },
    });
}

export interface SnapshotWriter {
  /** Debounced write-through; safe to call from sync store mutators. */
  schedule(): void;
  /** Await any pending write (used by tests/shutdown; never on hot paths). */
  flush(): Promise<void>;
}

/**
 * Debounced, serialized writer: at most one in-flight UPSERT per store; a
 * mutation during a write marks the state dirty and triggers one more pass.
 * The state is captured via getState() at WRITE time, so the latest
 * in-memory state always wins over intermediate mutations.
 */
export function createSnapshotWriter(
  storeName: string,
  getState: () => unknown,
  debounceMs = 500,
): SnapshotWriter {
  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<void> | null = null;
  let dirty = false;

  async function write(): Promise<void> {
    do {
      dirty = false;
      try {
        await saveSnapshot(storeName, getState());
      } catch (err) {
        logger.error(
          { err, storeName },
          "store snapshot persist failed — state remains in memory only",
        );
        break;
      }
    } while (dirty);
    inFlight = null;
  }

  function schedule(): void {
    if (inFlight) {
      dirty = true;
      return;
    }
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      inFlight = write();
    }, debounceMs);
    timer.unref?.();
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      inFlight = write();
    }
    while (inFlight) {
      await inFlight;
    }
  }

  return { schedule, flush };
}
