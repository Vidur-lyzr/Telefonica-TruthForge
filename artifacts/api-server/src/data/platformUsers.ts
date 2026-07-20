// Runtime platform-user store (G1 + I2).
//
// The seed PLATFORM_USERS list from corpus.ts is only the FIRST-BOOT snapshot:
// once the platform_users table has rows, the database is authoritative —
// creates, permission changes and removals all persist there and survive
// restarts AND republishes, exactly like the governance taxonomy versions.
// Every mutation is recorded in the real server audit trail by the routes
// (never client-side).
//
// The API stays synchronous (the directory is read on hot request paths):
// the in-memory list is the working copy, loaded once at boot
// (initPlatformUsers, before listen), and every mutation write-through
// persists via a debounced serialized flush that upserts current rows and
// deletes removed ones.
//
// I2 — profile composition: a user holds one or more profiles (profileIds).
// The effective capability level is the per-capability MAXIMUM across held
// profiles; `profileId` is kept as the primary profile (profileIds[0]) for
// display back-compat.

import { db, platformUsers } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  PLATFORM_USERS,
  type Area,
  type Clearance,
  type PlatformUser,
  type ProfileId,
} from "./corpus";

export interface ManagedUser extends PlatformUser {
  profileIds: ProfileId[];
}

export const VALID_AREAS: readonly Area[] = ["Comunicación", "Marca", "Gabinete"];
export const VALID_CLEARANCES: readonly Clearance[] = [
  "public",
  "private",
  "confidential",
  "off_the_record",
];
export const VALID_PROFILE_IDS: readonly ProfileId[] = [
  "superadmin",
  "admin",
  "editor",
  "user",
  "auditor",
];

// Older snapshots (or hand-edited records) may miss profileIds — normalize so
// every runtime user always satisfies the contract.
function normalize(u: PlatformUser & { profileIds?: ProfileId[] }): ManagedUser {
  const profileIds =
    Array.isArray(u.profileIds) && u.profileIds.length > 0 ? [...u.profileIds] : [u.profileId];
  return { ...u, profileIds, profileId: profileIds[0] };
}

let users: ManagedUser[] = PLATFORM_USERS.map(normalize);

/**
 * Loads the managed-user directory from the database — call once at boot,
 * before listen. An empty table means first boot: seed from the corpus
 * snapshot and persist it, so the seed is written exactly once.
 */
export async function initPlatformUsers(): Promise<void> {
  try {
    const rows = await db.select({ data: platformUsers.data }).from(platformUsers);
    if (rows.length > 0) {
      users = rows.map((r) => normalize(r.data as PlatformUser & { profileIds?: ProfileId[] }));
      logger.info({ users: users.length }, "platform users loaded from db");
      return;
    }
    users = PLATFORM_USERS.map(normalize);
    await flushWrite();
    logger.info({ users: users.length }, "platform users seeded from corpus");
  } catch (err) {
    // Fail soft to the seed directory — the server must come up.
    logger.error({ err }, "platform users load failed — using corpus seed in memory");
    users = PLATFORM_USERS.map(normalize);
  }
}

// Debounced serialized flush: upsert every current user; deletions are
// tracked explicitly and deleted BY ID ONLY — never a whole-set "delete
// everything not in my memory" sweep, so a stale autoscale instance can
// never destroy user rows created by another instance.
let flushTimer: NodeJS.Timeout | null = null;
let inFlight: Promise<void> | null = null;
let dirty = false;
const removedIds = new Set<string>();

async function flushWrite(): Promise<void> {
  do {
    dirty = false;
    const toRemove = [...removedIds];
    removedIds.clear();
    try {
      const snapshot = users.map((u) => ({ ...u, profileIds: [...u.profileIds] }));
      if (snapshot.length > 0) {
        await db
          .insert(platformUsers)
          .values(
            snapshot.map((u) => ({
              id: u.id,
              email: u.email.trim().toLowerCase(),
              data: u,
              updatedAt: new Date(),
            })),
          )
          .onConflictDoUpdate({
            target: platformUsers.id,
            set: {
              email: sql`excluded.email`,
              data: sql`excluded.data`,
              updatedAt: sql`excluded.updated_at`,
            },
          });
      }
      if (toRemove.length > 0) {
        await db.delete(platformUsers).where(inArray(platformUsers.id, toRemove));
      }
    } catch (err) {
      logger.error({ err }, "platform users persist failed — state remains in memory only");
      for (const id of toRemove) removedIds.add(id);
      dirty = true;
      break;
    }
  } while (dirty);
  inFlight = null;
}

function persist(): void {
  if (inFlight) {
    dirty = true;
    return;
  }
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    inFlight = flushWrite();
  }, 500);
  flushTimer.unref?.();
}

export function listManagedUsers(): ManagedUser[] {
  return users;
}

export function getManagedUser(id: string): ManagedUser | null {
  return users.find((u) => u.id === id) ?? null;
}

export function findManagedUserByEmail(email: string): ManagedUser | null {
  const needle = email.trim().toLowerCase();
  return users.find((u) => u.email.trim().toLowerCase() === needle) ?? null;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function uniqueId(name: string): string {
  const base = `user-${slugify(name) || "unnamed"}`;
  if (!users.some((u) => u.id === base)) return base;
  let n = 2;
  while (users.some((u) => u.id === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export interface CreateManagedUserInput {
  name: string;
  email: string;
  area: Area;
  profileIds: ProfileId[];
  clearance: Clearance;
}

export function createManagedUser(input: CreateManagedUserInput): ManagedUser {
  const user = normalize({
    id: uniqueId(input.name),
    name: input.name.trim(),
    email: input.email.trim(),
    area: input.area,
    profileId: input.profileIds[0],
    profileIds: input.profileIds,
    clearance: input.clearance,
  });
  users.push(user);
  persist();
  return user;
}

export interface UpdateManagedUserInput {
  name?: string;
  email?: string;
  area?: Area;
  profileIds?: ProfileId[];
  clearance?: Clearance;
}

export function updateManagedUser(id: string, patch: UpdateManagedUserInput): ManagedUser | null {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const current = users[idx];
  const next = normalize({
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    email: patch.email !== undefined ? patch.email.trim() : current.email,
    area: patch.area ?? current.area,
    profileIds: patch.profileIds ?? current.profileIds,
    profileId: (patch.profileIds ?? current.profileIds)[0],
    clearance: patch.clearance ?? current.clearance,
  });
  users[idx] = next;
  persist();
  return next;
}

export function removeManagedUser(id: string): ManagedUser | null {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const [removed] = users.splice(idx, 1);
  removedIds.add(removed.id);
  persist();
  return removed;
}
