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

export interface TaxonomyVersion {
  version: number; // v5, v6, ... (seed corpus is v4)
  createdAt: string;
  actor: string;
  note: string;
  axisEdit: AxisEdit | null;
  overrides: DocRetagOverride[];
}

interface GovernanceFile {
  versions: TaxonomyVersion[];
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
    JSON.stringify({ versions } satisfies GovernanceFile, null, 2),
    "utf8",
  );
}

// Mutates metadata only: axis labels on AXES, axisIds/topics on DOCS.
function applyVersionToCorpus(v: TaxonomyVersion): number {
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

// Boot: re-apply every persisted version, in order, to the in-memory corpus.
{
  const file = loadFile();
  versions = file.versions.sort((a, b) => a.version - b.version);
  for (const v of versions) applyVersionToCorpus(v);
}

export function currentTaxonomyVersion(): number {
  return versions.length > 0 ? versions[versions.length - 1].version : SEED_VERSION;
}

export function listTaxonomyVersions(): TaxonomyVersion[] {
  return [...versions].sort((a, b) => b.version - a.version);
}

function pushAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `audit-gov-${Date.now()}-${AUDIT_LOG.length}`,
    timestamp: new Date().toISOString(),
  };
  AUDIT_LOG.push(full);
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
