// Governance engine — PC2: taxonomy-as-configuration + access-rights
// intersection. This module is the SINGLE place where "can this persona see
// this document" is decided (area × confidentiality, early binding), and the
// single owner of the versioned taxonomy configuration with its governed
// re-tagging pipeline.
//
// Persistence is a small JSON file (no database, per project constraints):
// applied taxonomy versions survive a restart and are re-applied to the
// in-memory corpus at boot. Applying a version mutates document METADATA only
// (axis mapping, topics, axis labels) — chunks, embeddings and the retrieval
// index are untouched. That is the point: re-tagging is a configuration
// change, not a re-index.

import fs from "node:fs";
import path from "node:path";
import {
  DOCS,
  AXES,
  AUDIT_LOG,
  CLEARANCE_RANK,
  getDoc,
  type Area,
  type Clearance,
  type AuditEntry,
  type StrategicAxis,
} from "./corpus";

// ---------------------------------------------------------------------------
// Access resolver — the one intersection rule every retrieval path must use.
// ---------------------------------------------------------------------------

export type BlockedAxis = "clearance" | "area" | null;

export interface AccessSubject {
  area: Area | null;
  clearance: Clearance;
}

export interface AccessDecision {
  accessible: boolean;
  blockedBy: BlockedAxis;
}

export interface AccessTarget {
  confidentiality: Clearance;
  areas: Area[];
}

// Access = area × confidentiality. Clearance is checked first (it is the
// harder failure and the one the Ask surface explains); then area scope.
// A document with an empty `areas` list is cross-area. A subject with a null
// area (legacy callers) is not area-restricted.
export function resolveDocAccess(
  target: AccessTarget,
  subject: AccessSubject,
): AccessDecision {
  if (CLEARANCE_RANK[target.confidentiality] > CLEARANCE_RANK[subject.clearance]) {
    return { accessible: false, blockedBy: "clearance" };
  }
  if (
    subject.area &&
    target.areas.length > 0 &&
    !target.areas.includes(subject.area)
  ) {
    return { accessible: false, blockedBy: "area" };
  }
  return { accessible: true, blockedBy: null };
}

export function isDocAccessible(target: AccessTarget, subject: AccessSubject): boolean {
  return resolveDocAccess(target, subject).accessible;
}

// Compiled pages carry no `areas` of their own — their area scope is the
// union of their governed sources' areas. An empty union (for a source-less
// page) is cross-area, same as documents with an empty `areas` list.
// FAIL CLOSED: a source doc that cannot be resolved (e.g. a live-ingested
// doc not yet rehydrated at boot, or one that was removed) makes the page's
// area scope unknowable — the page stays locked rather than silently
// widening to cross-area.
export function resolvePageAccess(
  page: { confidentiality: Clearance; sourceDocIds: string[] },
  subject: AccessSubject,
): AccessDecision {
  const areas = new Set<Area>();
  for (const docId of page.sourceDocIds) {
    const doc = getDoc(docId);
    if (!doc) return { accessible: false, blockedBy: "area" };
    for (const a of doc.areas) areas.add(a);
  }
  return resolveDocAccess(
    { confidentiality: page.confidentiality, areas: [...areas] },
    subject,
  );
}

// Resolves a persona/role id to the access subject every wiki/knowledge-graph
// endpoint must gate with. Unknown roles fail closed (null).
export function subjectForRole(
  roles: { id: string; area: Area | null; clearance: Clearance }[],
  roleId: string,
): AccessSubject | null {
  const role = roles.find((r) => r.id === roleId);
  return role ? { area: role.area, clearance: role.clearance } : null;
}

// ---------------------------------------------------------------------------
// Versioned taxonomy configuration store (file-backed, applied in memory).
// ---------------------------------------------------------------------------

export interface DocRetagOverride {
  docId: string;
  axisIds: string[];
  topics: string[];
}

export interface AxisEdit {
  axisId: string;
  name: string;
  description: string | null;
}

// Structural axis-catalogue operation, versioned alongside the doc overrides.
// Axes are NEVER deleted — split creates, merge retires, rollback revives.
export interface AxisOp {
  op: "create" | "retire" | "revive" | "rename";
  axis?: StrategicAxis | null;
  axisId?: string | null;
  name?: string | null;
  description?: string | null;
}

export type TaxonomyVersionKind = "rename" | "split" | "merge" | "rollback";

export interface TaxonomyVersion {
  version: number; // v5, v6, ... (seed corpus is v4)
  createdAt: string;
  actor: string;
  note: string;
  axisEdit: AxisEdit | null;
  overrides: DocRetagOverride[];
  // Optional (older persisted files predate them — all back-compatible).
  kind?: TaxonomyVersionKind;
  rolledBackTo?: number;
  axisOps?: AxisOp[];
}

interface GovernanceFile {
  versions: TaxonomyVersion[];
  audit?: AuditEntry[];
}

const SEED_VERSION = 4; // the synthetic corpus ships classified against v4

const STORE_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "governance.json");

let versions: TaxonomyVersion[] = [];

function loadFile(): GovernanceFile {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as GovernanceFile;
    if (Array.isArray(parsed.versions)) return parsed;
  } catch {
    // First boot or unreadable file — start from the seed taxonomy.
  }
  return { versions: [] };
}

function persist(): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(
    STORE_FILE,
    JSON.stringify({ versions, audit: persistedAudit } satisfies GovernanceFile, null, 2),
    "utf8",
  );
}

// Applies structural axis ops to an axis catalogue (live AXES or a rollback
// simulation clone). Create is idempotent; retire/revive flip the flag only.
function applyAxisOps(axes: StrategicAxis[], ops: AxisOp[]): void {
  for (const op of ops) {
    if (op.op === "create" && op.axis) {
      const existing = axes.find((a) => a.id === op.axis!.id);
      if (existing) {
        existing.name = op.axis.name;
        existing.description = op.axis.description;
        existing.color = op.axis.color;
        existing.retired = false;
      } else {
        axes.push({ ...op.axis, retired: false });
      }
    } else if (op.op === "retire" && op.axisId) {
      const axis = axes.find((a) => a.id === op.axisId);
      if (axis) axis.retired = true;
    } else if (op.op === "revive" && op.axisId) {
      const axis = axes.find((a) => a.id === op.axisId);
      if (axis) axis.retired = false;
    } else if (op.op === "rename" && op.axisId) {
      const axis = axes.find((a) => a.id === op.axisId);
      if (axis) {
        if (op.name) axis.name = op.name;
        if (op.description != null) axis.description = op.description;
      }
    }
  }
}

// Mutates metadata only: axis catalogue entries on AXES, axisIds/topics on
// DOCS. Chunks, embeddings and the retrieval index are untouched.
function applyVersionToCorpus(v: TaxonomyVersion): number {
  if (v.axisOps && v.axisOps.length > 0) applyAxisOps(AXES, v.axisOps);
  if (v.axisEdit) {
    const axis = AXES.find((a) => a.id === v.axisEdit!.axisId);
    if (axis) {
      axis.name = v.axisEdit.name;
      if (v.axisEdit.description) axis.description = v.axisEdit.description;
    }
  }
  let applied = 0;
  for (const o of v.overrides) {
    const doc = getDoc(o.docId);
    if (!doc) continue;
    doc.axisIds = [...o.axisIds];
    doc.topics = [...o.topics];
    applied += 1;
  }
  return applied;
}

// Seed snapshot for rollback — captured BEFORE the boot replay below, so it
// reflects the pristine v4 corpus. Keyed by docId; runtime-ingested (live)
// documents are hydrated later and are deliberately NOT part of the snapshot:
// rollback never touches them.
const SEED_AXES: StrategicAxis[] = AXES.map((a) => ({ ...a }));
const SEED_DOC_TAGS = new Map<string, { axisIds: string[]; topics: string[] }>(
  DOCS.map((d) => [d.id, { axisIds: [...d.axisIds], topics: [...d.topics] }]),
);

// Boot: re-apply every persisted version, in order, to the in-memory corpus,
// and rehydrate persisted governance audit entries into the in-memory log.
let persistedAudit: AuditEntry[] = [];
{
  const file = loadFile();
  versions = file.versions.sort((a, b) => a.version - b.version);
  for (const v of versions) applyVersionToCorpus(v);
  if (Array.isArray(file.audit)) {
    persistedAudit = file.audit;
    AUDIT_LOG.push(...persistedAudit);
  }
}

export function currentTaxonomyVersion(): number {
  return versions.length > 0 ? versions[versions.length - 1].version : SEED_VERSION;
}

export function listTaxonomyVersions(): TaxonomyVersion[] {
  return [...versions].sort((a, b) => b.version - a.version);
}

// Governance audit entries are persisted with the taxonomy versions and
// rehydrated at boot — the audit trail survives a restart, same as the tags.
// Public wrapper so other stores (platform users) can feed the SAME persisted
// audit trail instead of growing a parallel one.
export function recordAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  return pushAudit(entry);
}

function pushAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `audit-gov-${Date.now()}-${AUDIT_LOG.length}`,
    timestamp: new Date().toISOString(),
  };
  AUDIT_LOG.push(full);
  persistedAudit.push(full);
  persist();
  return full;
}

export interface ApplyRetagInput {
  actor: string;
  note: string;
  axisEdit: AxisEdit | null;
  decisions: {
    docId: string;
    accept: boolean;
    axisIds: string[];
    topics: string[];
  }[];
  kind?: TaxonomyVersionKind;
  axisOps?: AxisOp[];
}

export interface ApplyRetagResult {
  version: number;
  appliedCount: number;
  rejectedCount: number;
}

// Human validation is the gate: only accepted decisions become overrides.
export function applyRetag(input: ApplyRetagInput): ApplyRetagResult {
  const accepted = input.decisions.filter((d) => d.accept && getDoc(d.docId));
  const rejected = input.decisions.length - accepted.length;
  const version: TaxonomyVersion = {
    version: currentTaxonomyVersion() + 1,
    createdAt: new Date().toISOString(),
    actor: input.actor,
    note: input.note,
    axisEdit: input.axisEdit,
    overrides: accepted.map((d) => ({
      docId: d.docId,
      axisIds: d.axisIds,
      topics: d.topics,
    })),
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.axisOps && input.axisOps.length > 0 ? { axisOps: input.axisOps } : {}),
  };
  const appliedCount = applyVersionToCorpus(version);
  versions.push(version);
  persist();
  pushAudit({
    actor: input.actor,
    action: "Taxonomy re-classification applied",
    target: input.axisEdit
      ? `Axis "${input.axisEdit.name}"`
      : "Taxonomy configuration",
    kind: "run",
    detail: `Taxonomy v${version.version}: ${appliedCount} document${appliedCount === 1 ? "" : "s"} re-tagged after human validation (${rejected} proposal${rejected === 1 ? "" : "s"} rejected). Metadata only — no re-embedding, no redeploy. ${input.note}`.trim(),
  });
  return { version: version.version, appliedCount, rejectedCount: rejected };
}

// ---------------------------------------------------------------------------
// Rollback — append-only revert to an earlier taxonomy version.
// ---------------------------------------------------------------------------

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export interface RollbackPlan {
  toVersion: number;
  overrides: DocRetagOverride[];
  axisOps: AxisOp[];
  revertedDocs: number;
  axesChanged: number;
}

// PURE simulation: rebuilds the taxonomy state at the target version on
// clones (seed snapshot + replay of versions <= target), then diffs it
// against the live corpus. Nothing is mutated here — the route mirrors the
// plan into Qdrant FIRST and only then commits it locally.
export function planRollback(toVersion: number): RollbackPlan | null {
  const known =
    toVersion === SEED_VERSION || versions.some((v) => v.version === toVersion);
  if (!known || toVersion >= currentTaxonomyVersion()) return null;

  const simAxes = SEED_AXES.map((a) => ({ ...a }));
  const simTags = new Map(
    [...SEED_DOC_TAGS].map(([id, t]) => [
      id,
      { axisIds: [...t.axisIds], topics: [...t.topics] },
    ]),
  );
  for (const v of versions) {
    if (v.version > toVersion) break;
    if (v.axisOps && v.axisOps.length > 0) applyAxisOps(simAxes, v.axisOps);
    if (v.axisEdit) {
      const axis = simAxes.find((a) => a.id === v.axisEdit!.axisId);
      if (axis) {
        axis.name = v.axisEdit.name;
        if (v.axisEdit.description) axis.description = v.axisEdit.description;
      }
    }
    for (const o of v.overrides) {
      if (simTags.has(o.docId)) {
        simTags.set(o.docId, { axisIds: [...o.axisIds], topics: [...o.topics] });
      }
    }
  }

  // Diff docs: only seed-snapshot docs — live-ingested documents are never touched.
  const overrides: DocRetagOverride[] = [];
  for (const [docId, sim] of simTags) {
    const doc = getDoc(docId);
    if (!doc) continue;
    if (!sameStringSet(doc.axisIds, sim.axisIds) || !sameStringSet(doc.topics, sim.topics)) {
      overrides.push({ docId, axisIds: [...sim.axisIds], topics: [...sim.topics] });
    }
  }

  // Diff axes: restore names/descriptions, revive axes retired later, retire
  // axes created after the target version. Never delete.
  const axisOps: AxisOp[] = [];
  for (const cur of AXES) {
    const sim = simAxes.find((a) => a.id === cur.id);
    if (!sim) {
      if (!cur.retired) axisOps.push({ op: "retire", axisId: cur.id });
      continue;
    }
    if (cur.name !== sim.name || cur.description !== sim.description) {
      axisOps.push({
        op: "rename",
        axisId: cur.id,
        name: sim.name,
        description: sim.description,
      });
    }
    if (Boolean(cur.retired) !== Boolean(sim.retired)) {
      axisOps.push({ op: sim.retired ? "retire" : "revive", axisId: cur.id });
    }
  }

  return {
    toVersion,
    overrides,
    axisOps,
    revertedDocs: overrides.length,
    axesChanged: new Set(
      axisOps.map((o) => o.axisId ?? o.axis?.id).filter(Boolean),
    ).size,
  };
}

export interface CommitRollbackResult {
  version: number;
  toVersion: number;
  revertedDocs: number;
  axesChanged: number;
}

// Commits a rollback plan as a NEW version — history is append-only.
export function commitRollback(plan: RollbackPlan, actor: string): CommitRollbackResult {
  const version: TaxonomyVersion = {
    version: currentTaxonomyVersion() + 1,
    createdAt: new Date().toISOString(),
    actor,
    note: `Rollback to taxonomy v${plan.toVersion}`,
    axisEdit: null,
    overrides: plan.overrides,
    kind: "rollback",
    rolledBackTo: plan.toVersion,
    ...(plan.axisOps.length > 0 ? { axisOps: plan.axisOps } : {}),
  };
  const appliedCount = applyVersionToCorpus(version);
  versions.push(version);
  persist();
  pushAudit({
    actor,
    action: "Taxonomy rollback applied",
    target: `Taxonomy v${plan.toVersion}`,
    kind: "run",
    detail: `Taxonomy v${version.version}: rolled back to v${plan.toVersion} — ${appliedCount} document${appliedCount === 1 ? "" : "s"} reverted, ${plan.axesChanged} ax${plan.axesChanged === 1 ? "is" : "es"} restored. Append-only: earlier versions were not rewritten. Metadata only — no re-embedding.`,
  });
  return {
    version: version.version,
    toVersion: plan.toVersion,
    revertedDocs: appliedCount,
    axesChanged: plan.axesChanged,
  };
}

// Axis id/colour helpers for split — new axes get a slug id and a palette
// colour not already used by an active axis. Ids are generated at PROPOSE
// time so the human validates exactly what will be committed.
const AXIS_COLOR_PALETTE = [
  "#0066FF",
  "#59C2C9",
  "#E63780",
  "#EAC344",
  "#5CB615",
  "#A575E0",
  "#FF7F41",
  "#66CCFF",
];

export function makeAxisId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  let id = `ax-${slug || "axis"}`;
  let n = 2;
  while (AXES.some((a) => a.id === id)) {
    id = `ax-${slug}-${n}`;
    n += 1;
  }
  return id;
}

export function pickAxisColor(): string {
  const used = new Set(AXES.filter((a) => !a.retired).map((a) => a.color));
  return (
    AXIS_COLOR_PALETTE.find((c) => !used.has(c)) ??
    AXIS_COLOR_PALETTE[AXES.length % AXIS_COLOR_PALETTE.length]
  );
}

// ---------------------------------------------------------------------------
// Deterministic re-tag proposal fallback (used when the model is unavailable
// and as the candidate set the model refines).
// ---------------------------------------------------------------------------

export interface RetagCandidate {
  docId: string;
  title: string;
  type: string;
  summary: string;
  topics: string[];
  axisIds: string[];
}

export function retagCandidatesForAxis(axisId: string): RetagCandidate[] {
  return DOCS.filter((d) => d.axisIds.includes(axisId)).map((d) => ({
    docId: d.id,
    title: d.title,
    type: d.type,
    summary: d.summary,
    topics: d.topics,
    axisIds: d.axisIds,
  }));
}
