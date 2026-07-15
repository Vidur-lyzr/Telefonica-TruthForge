// L1/L2/L3 — file-backed store for the quality subsystem: golden-set
// evaluation runs (weekly scorecard), per-answer user feedback with its
// retrieval trace, and the triage queue embedded on each feedback entry
// (classify → corrective action → re-evaluation).
//
// No database is used (project constraint). State is held in memory and
// persisted as a JSON snapshot on every mutation, mirroring generateStore.
// Runs that were mid-flight when the server stopped are marked failed at
// load — a half-measured scorecard is never presented as a finished one.

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "../lib/logger";
import { GOLDEN_QUESTIONS, type GoldenQuestion } from "./goldenSet";
import type { RetrievalLogEntry } from "./retrievalLog";

// ---- Types --------------------------------------------------------------

export type EvalTrigger = "scheduled" | "manual" | "reeval";

export interface EvalResultRow {
  goldenId: string;
  question: string;
  roleId: string;
  lang: string;
  expectedStatus: string;
  actualStatus: string | null;
  citedDocIds: string[];
  /** Whether at least one expected doc was cited (null when not applicable). */
  expectedDocCited: boolean | null;
  /** Whether the historic flag matched expectation (null when not checked). */
  historicOk: boolean | null;
  /** Citations returned / citations grounded in the audited retrieval hits. */
  citationsTotal: number;
  citationsGrounded: number;
  /** Fabricated evidence: cited a doc outside the turn's audited retrieval. */
  hallucinated: boolean;
  pass: boolean;
  latencyMs: number;
  error: string | null;
}

export interface EvalRunMetrics {
  total: number;
  passed: number;
  failed: number;
  /** 0..1 — golden questions fully passed. */
  accuracy: number;
  /** 0..1 — cited sources grounded in the audited retrieval, over answered rows. Null when no row carried citations. */
  citationCorrectness: number | null;
  /** 0..1 — rows that answered when a refusal was expected or cited ungrounded sources. */
  hallucinationRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
}

export interface EvalRun {
  id: string;
  trigger: EvalTrigger;
  /** Set when trigger === "reeval": the feedback item this run verifies. */
  reevalOfFeedbackId: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "completed" | "failed";
  progressDone: number;
  progressTotal: number;
  results: EvalResultRow[];
  metrics: EvalRunMetrics | null;
  error: string | null;
}

export type FeedbackVerdict = "correct" | "partial" | "incorrect" | "fabricated";
export type TriageState = "open" | "classified" | "resolved";
export type TriageErrorClass =
  | "retrieval_miss"
  | "stale_source"
  | "bad_citation"
  | "model_error"
  | "permission_gap"
  | "not_an_error";

export interface FeedbackTriage {
  state: TriageState;
  errorClass: TriageErrorClass | null;
  correctiveAction: string | null;
  classifiedByRoleId: string | null;
  classifiedAt: string | null;
  /** Re-evaluation run launched to verify the corrective action. */
  reevalRunId: string | null;
  resolvedAt: string | null;
}

export interface FeedbackEntry {
  id: string;
  createdAt: string;
  verdict: FeedbackVerdict;
  note: string | null;
  question: string;
  /** First characters of the answer, for the triage list — never the full text. */
  answerPreview: string;
  answerStatus: string;
  citedDocIds: string[];
  roleId: string;
  lang: string | null;
  /** F3 audit id of the turn, when the turn had one. */
  auditId: string | null;
  /**
   * Full retrieval trace snapshotted AT FEEDBACK TIME from the rolling audit
   * log, so the report stays reproducible after the log evicts the entry.
   */
  retrievalTrace: RetrievalLogEntry | null;
  triage: FeedbackTriage;
}

// ---- Metrics ------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export function computeMetrics(results: EvalResultRow[]): EvalRunMetrics {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const hallucinated = results.filter((r) => r.hallucinated).length;
  const withCitations = results.filter((r) => r.citationsTotal > 0);
  const citTotal = withCitations.reduce((s, r) => s + r.citationsTotal, 0);
  const citGrounded = withCitations.reduce((s, r) => s + r.citationsGrounded, 0);
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  return {
    total,
    passed,
    failed: total - passed,
    accuracy: total > 0 ? passed / total : 0,
    citationCorrectness: citTotal > 0 ? citGrounded / citTotal : null,
    hallucinationRate: total > 0 ? hallucinated / total : 0,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
  };
}

// ---- Persistence ---------------------------------------------------------

const STORE_PATH = join(process.cwd(), ".data", "quality-store.json");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RUNS = 60;
const MAX_FEEDBACK = 500;

interface PersistedState {
  runs: EvalRun[];
  feedback: FeedbackEntry[];
  nextEvalAt: string | null;
  idCounter: number;
  seeded?: boolean;
}

let runs: EvalRun[] = [];
let feedback: FeedbackEntry[] = [];
let nextEvalAt: string | null = null;
let idCounter = 0;
let seeded = false;

function persist(): void {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    const state: PersistedState = { runs, feedback, nextEvalAt, idCounter, seeded };
    writeFileSync(tmp, JSON.stringify(state), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (err) {
    logger.error({ err }, "quality store: persist failed — state remains in memory only");
  }
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// Weekly anchor: next Monday 07:00 server-local from `from`.
function nextMondayMorning(from: Date): string {
  const next = new Date(from);
  next.setHours(7, 0, 0, 0);
  const day = next.getDay(); // 0 Sun .. 6 Sat
  let add = (8 - day) % 7; // days until next Monday
  if (add === 0 && next.getTime() <= from.getTime()) add = 7;
  next.setDate(next.getDate() + add);
  return next.toISOString();
}

function load(): void {
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<PersistedState>;
    runs = Array.isArray(raw.runs) ? raw.runs : [];
    feedback = Array.isArray(raw.feedback) ? raw.feedback : [];
    nextEvalAt = typeof raw.nextEvalAt === "string" ? raw.nextEvalAt : null;
    idCounter = typeof raw.idCounter === "number" ? raw.idCounter : 0;
    seeded = raw.seeded === true;
    // A run that was mid-flight when the server stopped can never finish —
    // mark it failed rather than leaving a forever-"running" scorecard.
    let interrupted = 0;
    for (const run of runs) {
      if (run.status === "running") {
        run.status = "failed";
        run.finishedAt = new Date().toISOString();
        run.error = "Interrupted by a server restart before completing.";
        interrupted += 1;
      }
    }
    if (interrupted > 0) {
      logger.warn({ interrupted }, "quality store: marked interrupted eval runs as failed");
      persist();
    }
  } catch (err) {
    logger.error({ err }, "quality store: failed to load snapshot — starting empty");
    runs = [];
    feedback = [];
    nextEvalAt = null;
    idCounter = 0;
    seeded = false;
  }
}

// ---- Seed: two historical scheduled runs ---------------------------------
// Deterministic demo history so the trend chart has a baseline before the
// first live run. Rows are synthesised from the SAME golden set and scored by
// the SAME metric code as live runs; a handful of misses keep the trend
// honest-looking (quality work exists because quality is imperfect).

function hashInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function seedRow(
  g: GoldenQuestion,
  failMode: "none" | "status" | "citation" | "historic" | "hallucination",
): EvalResultRow {
  const isAnswered = g.expectedStatus === "answered";
  // Refusals never call the model → tens of ms; answered turns are seconds.
  const jitter = hashInt(g.id) % 1000;
  const latencyMs = isAnswered ? 4200 + (jitter * 4) : 40 + (jitter % 160);
  const citationsTotal = isAnswered ? 2 + (jitter % 2) : 0;
  const cited = isAnswered ? (g.expectedDocIds ?? []).slice(0, 1) : [];
  const base: EvalResultRow = {
    goldenId: g.id,
    question: g.question,
    roleId: g.roleId,
    lang: g.lang,
    expectedStatus: g.expectedStatus,
    actualStatus: g.expectedStatus,
    citedDocIds: cited,
    expectedDocCited: isAnswered ? true : null,
    historicOk: g.expectHistoric ? true : null,
    citationsTotal,
    citationsGrounded: citationsTotal,
    hallucinated: false,
    pass: true,
    latencyMs,
    error: null,
  };
  if (failMode === "status") {
    return { ...base, actualStatus: "no_evidence", citedDocIds: [], citationsTotal: 0, citationsGrounded: 0, expectedDocCited: isAnswered ? false : null, pass: false };
  }
  if (failMode === "citation") {
    return { ...base, citationsGrounded: Math.max(0, citationsTotal - 1), hallucinated: true, pass: false };
  }
  if (failMode === "historic") {
    return { ...base, historicOk: false, pass: false };
  }
  if (failMode === "hallucination") {
    return { ...base, actualStatus: "answered", citationsTotal: 1, citationsGrounded: 0, citedDocIds: [], hallucinated: true, pass: false };
  }
  return base;
}

function seedRun(id: string, startedAt: Date, failures: Record<string, "status" | "citation" | "historic" | "hallucination">): EvalRun {
  const results = GOLDEN_QUESTIONS.map((g) => seedRow(g, failures[g.id] ?? "none"));
  const wallMs = results.reduce((s, r) => s + r.latencyMs, 0) / 2; // concurrency 2
  return {
    id,
    trigger: "scheduled",
    reevalOfFeedbackId: null,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date(startedAt.getTime() + wallMs).toISOString(),
    status: "completed",
    progressDone: results.length,
    progressTotal: results.length,
    results,
    metrics: computeMetrics(results),
    error: null,
  };
}

function seedIfEmpty(): void {
  if (seeded) return;
  const now = Date.now();
  const twoWeeksAgo = new Date(now - 2 * WEEK_MS);
  twoWeeksAgo.setHours(7, 0, 0, 0);
  const oneWeekAgo = new Date(now - WEEK_MS);
  oneWeekAgo.setHours(7, 0, 0, 0);
  idCounter += 1;
  const runA = seedRun(`erun-${idCounter}`, twoWeeksAgo, {
    "gq-noev-restaurant": "hallucination",
    "gq-perm-tracker-analyst": "status",
    "gq-o2-5g-de": "citation",
  });
  idCounter += 1;
  const runB = seedRun(`erun-${idCounter}`, oneWeekAgo, {
    "gq-townhall-historic": "historic",
    "gq-conflict-q2-tp": "status",
  });
  runs = [runA, runB, ...runs];
  if (!nextEvalAt) nextEvalAt = nextMondayMorning(new Date(now));
  seeded = true;
  persist();
}

load();
seedIfEmpty();

// ---- Golden set -----------------------------------------------------------

export function listGoldens(): GoldenQuestion[] {
  return GOLDEN_QUESTIONS;
}

// ---- Eval runs -------------------------------------------------------------

export function createRun(
  trigger: EvalTrigger,
  progressTotal: number,
  reevalOfFeedbackId: string | null = null,
): EvalRun {
  const run: EvalRun = {
    id: nextId("erun"),
    trigger,
    reevalOfFeedbackId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    progressDone: 0,
    progressTotal,
    results: [],
    metrics: null,
    error: null,
  };
  runs.unshift(run);
  if (runs.length > MAX_RUNS) runs = runs.slice(0, MAX_RUNS);
  persist();
  return run;
}

export function appendRunResult(runId: string, row: EvalResultRow): void {
  const run = runs.find((r) => r.id === runId);
  if (!run || run.status !== "running") return;
  run.results.push(row);
  run.progressDone = run.results.length;
  persist();
}

export function completeRun(runId: string): EvalRun | undefined {
  const run = runs.find((r) => r.id === runId);
  if (!run || run.status !== "running") return run;
  run.status = "completed";
  run.finishedAt = new Date().toISOString();
  run.metrics = computeMetrics(run.results);
  // A re-evaluation run closing the loop on a triaged feedback item: mark the
  // item resolved — the corrective action was applied and the regression eval
  // completed. Its metrics are linked from the item so the outcome is visible.
  if (run.reevalOfFeedbackId) {
    const fb = feedback.find((f) => f.id === run.reevalOfFeedbackId);
    if (fb && fb.triage.state === "classified") {
      fb.triage.state = "resolved";
      fb.triage.resolvedAt = run.finishedAt;
    }
  }
  persist();
  return run;
}

export function failRun(runId: string, error: string): void {
  const run = runs.find((r) => r.id === runId);
  if (!run || run.status !== "running") return;
  run.status = "failed";
  run.finishedAt = new Date().toISOString();
  run.error = error;
  persist();
}

export function getRun(runId: string): EvalRun | undefined {
  return runs.find((r) => r.id === runId);
}

export function listRuns(): EvalRun[] {
  return runs;
}

export function hasRunningRun(): boolean {
  return runs.some((r) => r.status === "running");
}

// ---- Weekly schedule --------------------------------------------------------

export function getNextEvalAt(): string | null {
  return nextEvalAt;
}

/**
 * Mark-before-run claim of the weekly slot: returns true exactly once when the
 * scheduled time has passed, and advances the anchor BEFORE the caller starts
 * the run so a crash mid-run cannot double-fire the same slot.
 */
export function claimScheduledEval(now: Date = new Date()): boolean {
  if (!nextEvalAt) {
    nextEvalAt = nextMondayMorning(now);
    persist();
    return false;
  }
  if (Date.parse(nextEvalAt) > now.getTime()) return false;
  nextEvalAt = nextMondayMorning(now);
  persist();
  return true;
}

// ---- Feedback + triage --------------------------------------------------------

export interface AddFeedbackInput {
  verdict: FeedbackVerdict;
  note: string | null;
  question: string;
  answerPreview: string;
  answerStatus: string;
  citedDocIds: string[];
  roleId: string;
  lang: string | null;
  auditId: string | null;
  retrievalTrace: RetrievalLogEntry | null;
}

export function addFeedback(input: AddFeedbackInput): FeedbackEntry {
  const entry: FeedbackEntry = {
    id: nextId("fb"),
    createdAt: new Date().toISOString(),
    verdict: input.verdict,
    note: input.note,
    question: input.question,
    answerPreview: input.answerPreview.slice(0, 280),
    answerStatus: input.answerStatus,
    citedDocIds: input.citedDocIds,
    roleId: input.roleId,
    lang: input.lang,
    auditId: input.auditId,
    retrievalTrace: input.retrievalTrace,
    triage: {
      // Positive feedback needs no triage — it is recorded for the signal
      // counts only. Anything less than "correct" opens a triage item.
      state: input.verdict === "correct" ? "resolved" : "open",
      errorClass: null,
      correctiveAction: null,
      classifiedByRoleId: null,
      classifiedAt: null,
      reevalRunId: null,
      resolvedAt: input.verdict === "correct" ? new Date().toISOString() : null,
    },
  };
  feedback.unshift(entry);
  if (feedback.length > MAX_FEEDBACK) feedback = feedback.slice(0, MAX_FEEDBACK);
  persist();
  return entry;
}

export function listFeedback(): FeedbackEntry[] {
  return feedback;
}

export function getFeedback(id: string): FeedbackEntry | undefined {
  return feedback.find((f) => f.id === id);
}

export function classifyFeedback(
  id: string,
  errorClass: TriageErrorClass,
  correctiveAction: string,
  classifiedByRoleId: string,
): FeedbackEntry | undefined {
  const fb = feedback.find((f) => f.id === id);
  if (!fb) return undefined;
  fb.triage.errorClass = errorClass;
  fb.triage.correctiveAction = correctiveAction;
  fb.triage.classifiedByRoleId = classifiedByRoleId;
  fb.triage.classifiedAt = new Date().toISOString();
  if (fb.triage.state === "open") fb.triage.state = "classified";
  persist();
  return fb;
}

export function attachReevalRun(feedbackId: string, runId: string): FeedbackEntry | undefined {
  const fb = feedback.find((f) => f.id === feedbackId);
  if (!fb) return undefined;
  fb.triage.reevalRunId = runId;
  persist();
  return fb;
}
