// Runtime platform-user store (G1 + I2).
//
// The seed PLATFORM_USERS list from corpus.ts is only the FIRST-BOOT snapshot:
// once .data/platform-users.json exists, that file is authoritative — creates,
// permission changes and removals all persist there and survive a restart,
// exactly like the governance taxonomy versions. Every mutation is recorded in
// the real server audit trail by the routes (never client-side).
//
// I2 — profile composition: a user holds one or more profiles (profileIds).
// The effective capability level is the per-capability MAXIMUM across held
// profiles; `profileId` is kept as the primary profile (profileIds[0]) for
// display back-compat.

import fs from "node:fs";
import path from "node:path";
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

const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "platform-users.json");

interface UsersFile {
  users: ManagedUser[];
}

// Older snapshots (or hand-edited files) may miss profileIds — normalize so
// every runtime user always satisfies the contract.
function normalize(u: PlatformUser & { profileIds?: ProfileId[] }): ManagedUser {
  const profileIds =
    Array.isArray(u.profileIds) && u.profileIds.length > 0 ? [...u.profileIds] : [u.profileId];
  return { ...u, profileIds, profileId: profileIds[0] };
}

function loadUsers(): ManagedUser[] {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as UsersFile;
    if (Array.isArray(parsed.users)) return parsed.users.map(normalize);
  } catch {
    // First boot or unreadable file — seed from the corpus snapshot.
  }
  return PLATFORM_USERS.map(normalize);
}

let users: ManagedUser[] = loadUsers();

function persist(): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify({ users } satisfies UsersFile, null, 2), "utf8");
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
  persist();
  return removed;
}
