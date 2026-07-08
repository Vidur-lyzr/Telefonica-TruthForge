// kpiStore — versioned, admin-configurable KPI definitions + threshold alerts.
//
// The corpus seeds the baseline definitions (version 1, source "seed"). Admin
// edits never mutate the seed: each save appends a new immutable version and
// the panel always renders the latest version. New KPIs created by an admin
// get a deterministic synthetic series derived from their id and target, so
// the calculation engine stays fully non-LLM and reproducible.
//
// Alerts are computed deterministically from the effective definitions
// (threshold breach or forecast deviation) and recorded per owner with a
// simulated Teams/email delivery trail. Acknowledgements persist.
//
// Persistence mirrors generateStore: one JSON snapshot written atomically on
// every mutation; corrupt or missing files fail soft to an empty overlay.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "../lib/logger";
import {
  KPIS,
  OBJECTIVES,
  getDoc,
  type Area,
  type Clearance,
  type InitiativeType,
  type KpiDefinition,
  type KpiDirection,
  type KpiPeriodType,
} from "./corpus";

// ---- Types -------------------------------------------------------------------

export interface KpiThresholds {
  // Attainment ratios (current/target adjusted for direction) below which the
  // KPI turns amber / critical. Seed defaults keep the historic behaviour.
  amberBelow: number;
  criticalBelow: number;
}

export interface KpiSourceConfig {
  id: string;
  label: string;
  kind: "internal" | "external";
  weight: number;
  docId: string | null;
  note: string | null;
  conflict: boolean;
}

// One immutable version of a KPI definition.
export interface KpiDefinitionVersion {
  version: number;
  editedBy: string;
  editedAt: string;
  changeNote: string;
  name: string;
  description: string;
  unit: string;
  objectiveId: string;
  axisId: string;
  market: string;
  brand: string;
  initiativeType: InitiativeType;
  confidentiality: Clearance;
  areas: Area[];
  direction: KpiDirection;
  target: number;
  thresholds: KpiThresholds;
  owner: string;
  sources: KpiSourceConfig[];
}

export interface KpiDefinitionRecord {
  id: string;
  seeded: boolean;
  latestVersion: number;
  versions: KpiDefinitionVersion[];
}

export interface KpiAlertRecord {
  id: string;
  kpiId: string;
  kpiName: string;
  severity: "amber" | "critical" | "forecast";
  owner: string;
  channel: string;
  message: string;
  confidentiality: Clearance;
  areas: Area[];
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

// The effective definition the calc engine consumes: latest version fields
// plus the (seed or synthetic) series and breakdowns.
export interface EffectiveKpiDefinition extends KpiDefinition {
  thresholds: KpiThresholds;
  owner: string;
  definitionVersion: number;
}

export const DEFAULT_THRESHOLDS: KpiThresholds = { amberBelow: 1, criticalBelow: 0.92 };

// ---- Persistence ---------------------------------------------------------------

const STORE_PATH = join(process.cwd(), ".data", "kpi-store.json");

interface PersistedState {
  records: KpiDefinitionRecord[];
  alerts: KpiAlertRecord[];
  idCounter: number;
}

let records: KpiDefinitionRecord[] = [];
let alerts: KpiAlertRecord[] = [];
let idCounter = 0;

function load(): void {
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<PersistedState>;
    records = Array.isArray(raw.records) ? raw.records : [];
    alerts = Array.isArray(raw.alerts) ? raw.alerts : [];
    idCounter = typeof raw.idCounter === "number" ? raw.idCounter : 0;
    logger.info(
      { definitions: records.length, alerts: alerts.length },
      "kpi store loaded from disk",
    );
  } catch (err) {
    logger.error({ err }, "kpi store could not be loaded; starting from seed only");
    records = [];
    alerts = [];
  }
}

function persist(): void {
  try {
    const state: PersistedState = { records, alerts, idCounter };
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(state), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (err) {
    logger.error({ err }, "kpi store could not be persisted");
  }
}

load();

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// ---- Seed baseline ---------------------------------------------------------------

// Default owner: the owner of the heaviest internal source document, else the
// desk that owns the objective's area.
function seedOwner(kpi: KpiDefinition): string {
  const internal = kpi.sources
    .filter((s) => s.kind === "internal" && s.docId)
    .sort((a, b) => b.weight - a.weight);
  for (const s of internal) {
    const doc = s.docId ? getDoc(s.docId) : undefined;
    if (doc?.owner) return doc.owner;
  }
  const objective = OBJECTIVES.find((o) => o.id === kpi.objectiveId);
  return objective ? `${objective.area} insights desk` : "Comms insights desk";
}

function seedVersion(kpi: KpiDefinition): KpiDefinitionVersion {
  return {
    version: 1,
    editedBy: "Seed configuration",
    editedAt: "2026-01-05T09:00:00.000Z",
    changeNote: "Baseline definition from the governed corpus.",
    name: kpi.name,
    description: kpi.description,
    unit: kpi.unit,
    objectiveId: kpi.objectiveId,
    axisId: kpi.axisId,
    market: kpi.market,
    brand: kpi.brand,
    initiativeType: kpi.initiativeType,
    confidentiality: kpi.confidentiality,
    areas: [...kpi.areas],
    direction: kpi.direction,
    target: kpi.target,
    thresholds: { ...DEFAULT_THRESHOLDS },
    owner: seedOwner(kpi),
    sources: kpi.sources.map((s) => ({
      id: s.id,
      label: s.label,
      kind: s.kind,
      weight: s.weight,
      docId: s.docId ?? null,
      note: s.note ?? null,
      conflict: Boolean(s.conflict),
    })),
  };
}

function recordFor(kpiId: string): KpiDefinitionRecord | undefined {
  return records.find((r) => r.id === kpiId);
}

function seedRecord(kpi: KpiDefinition): KpiDefinitionRecord {
  return { id: kpi.id, seeded: true, latestVersion: 1, versions: [seedVersion(kpi)] };
}

// All definition records: overlays where they exist, seed baselines otherwise.
export function listKpiDefinitionRecords(): KpiDefinitionRecord[] {
  const out: KpiDefinitionRecord[] = [];
  for (const kpi of KPIS) {
    out.push(recordFor(kpi.id) ?? seedRecord(kpi));
  }
  for (const r of records) {
    if (!KPIS.some((k) => k.id === r.id)) out.push(r);
  }
  return out;
}

export function getKpiDefinitionRecord(id: string): KpiDefinitionRecord | undefined {
  const overlay = recordFor(id);
  if (overlay) return overlay;
  const seed = KPIS.find((k) => k.id === id);
  return seed ? seedRecord(seed) : undefined;
}

// ---- Synthetic series for admin-created KPIs -------------------------------------

// Deterministic pseudo-random series seeded from the KPI id, trending toward
// (but not exactly at) the target so status/forecast remain interesting.
function syntheticSeries(id: string, target: number, direction: KpiDirection): Record<KpiPeriodType, number[]> {
  const digest = createHash("sha256").update(id).digest();
  const build = (n: number, offset: number): number[] => {
    const start = direction === "higher-better" ? target * 0.78 : target * 1.25;
    const end = target * (direction === "higher-better" ? 0.9 + (digest[offset] % 20) / 100 : 1.1 - (digest[offset] % 20) / 100);
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 1 : i / (n - 1);
      const base = start + (end - start) * t;
      const wobble = ((digest[(offset + i + 1) % digest.length] % 11) - 5) / 100;
      out.push(Math.round(base * (1 + wobble) * 10) / 10);
    }
    return out;
  };
  return { week: build(8, 0), month: build(6, 9), quarter: build(4, 17) };
}

function syntheticBreakdowns(target: number): KpiDefinition["breakdowns"] {
  const markets = ["Spain", "Germany", "Brazil", "United Kingdom"];
  return [
    {
      dimension: "Market",
      points: markets.map((label, i) => ({
        label,
        value: Math.round(target * (1.15 - i * 0.13) * 10) / 10,
      })),
    },
  ];
}

// ---- Effective definitions (what the calc engine consumes) ------------------------

export function listEffectiveKpiDefinitions(): EffectiveKpiDefinition[] {
  return listKpiDefinitionRecords().map((record) => {
    const latest = record.versions[record.versions.length - 1];
    const seed = KPIS.find((k) => k.id === record.id);
    const series = seed
      ? seed.series
      : syntheticSeries(record.id, latest.target, latest.direction);
    const breakdowns = seed ? seed.breakdowns : syntheticBreakdowns(latest.target);
    return {
      id: record.id,
      objectiveId: latest.objectiveId,
      name: latest.name,
      description: latest.description,
      unit: latest.unit,
      axisId: latest.axisId,
      market: latest.market,
      brand: latest.brand,
      initiativeType: latest.initiativeType,
      confidentiality: latest.confidentiality,
      areas: latest.areas,
      direction: latest.direction,
      target: latest.target,
      confidence: seed?.confidence ?? 0.8,
      sources: latest.sources.map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        weight: s.weight,
        docId: s.docId ?? undefined,
        note: s.note ?? undefined,
        conflict: s.conflict,
      })),
      series,
      breakdowns,
      thresholds: latest.thresholds,
      owner: latest.owner,
      definitionVersion: latest.version,
    };
  });
}

export function getEffectiveKpiDefinition(id: string): EffectiveKpiDefinition | undefined {
  return listEffectiveKpiDefinitions().find((k) => k.id === id);
}

// ---- Upsert (new version) ---------------------------------------------------------

export interface KpiDefinitionInput {
  id?: string;
  name: string;
  description: string;
  unit: string;
  objectiveId: string;
  axisId: string;
  market: string;
  brand: string;
  initiativeType: InitiativeType;
  confidentiality: Clearance;
  areas: Area[];
  direction: KpiDirection;
  target: number;
  thresholds: KpiThresholds;
  owner: string;
  sources: KpiSourceConfig[];
  editedBy: string;
  changeNote: string;
}

export function upsertKpiDefinition(input: KpiDefinitionInput): KpiDefinitionRecord {
  const now = new Date().toISOString();
  const makeVersion = (version: number): KpiDefinitionVersion => ({
    version,
    editedBy: input.editedBy,
    editedAt: now,
    changeNote: input.changeNote,
    name: input.name,
    description: input.description,
    unit: input.unit,
    objectiveId: input.objectiveId,
    axisId: input.axisId,
    market: input.market,
    brand: input.brand,
    initiativeType: input.initiativeType,
    confidentiality: input.confidentiality,
    areas: input.areas,
    direction: input.direction,
    target: input.target,
    thresholds: input.thresholds,
    owner: input.owner,
    sources: input.sources,
  });

  if (input.id) {
    let record = recordFor(input.id);
    if (!record) {
      const seed = KPIS.find((k) => k.id === input.id);
      if (!seed) throw new Error(`Unknown KPI definition: ${input.id}`);
      record = seedRecord(seed);
      records.push(record);
    }
    const version = record.latestVersion + 1;
    record.versions.push(makeVersion(version));
    record.latestVersion = version;
    persist();
    return record;
  }

  const id = nextId("kpi-custom");
  const record: KpiDefinitionRecord = {
    id,
    seeded: false,
    latestVersion: 1,
    versions: [makeVersion(1)],
  };
  records.push(record);
  persist();
  return record;
}

// ---- Alerts -----------------------------------------------------------------------

// Recompute the open alert set from the effective definitions. Deterministic:
// an alert exists while the condition holds; acknowledgements survive
// recomputation (keyed by kpiId + severity).
export function syncAlerts(
  compute: (def: EffectiveKpiDefinition) => {
    severity: "amber" | "critical" | "forecast";
    message: string;
  }[],
): KpiAlertRecord[] {
  const defs = listEffectiveKpiDefinitions();
  const next: KpiAlertRecord[] = [];
  for (const def of defs) {
    for (const found of compute(def)) {
      const existing = alerts.find(
        (a) => a.kpiId === def.id && a.severity === found.severity,
      );
      if (existing) {
        existing.message = found.message;
        existing.kpiName = def.name;
        existing.owner = def.owner;
        existing.confidentiality = def.confidentiality;
        existing.areas = [...def.areas];
        next.push(existing);
      } else {
        next.push({
          id: nextId("alert"),
          kpiId: def.id,
          kpiName: def.name,
          severity: found.severity,
          owner: def.owner,
          channel:
            found.severity === "critical"
              ? "Teams + email (simulated)"
              : "Teams (simulated)",
          message: found.message,
          confidentiality: def.confidentiality,
          areas: [...def.areas],
          createdAt: new Date().toISOString(),
          acknowledged: false,
          acknowledgedBy: null,
          acknowledgedAt: null,
        });
      }
    }
  }
  alerts = next;
  persist();
  return alerts;
}

export function listAlerts(): KpiAlertRecord[] {
  return alerts;
}

export function acknowledgeAlert(id: string, by: string): KpiAlertRecord | undefined {
  const alert = alerts.find((a) => a.id === id);
  if (!alert) return undefined;
  alert.acknowledged = true;
  alert.acknowledgedBy = by;
  alert.acknowledgedAt = new Date().toISOString();
  persist();
  return alert;
}
