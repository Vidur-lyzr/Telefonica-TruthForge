// L1 — golden-set evaluation runner. Replays every golden question through
// the REAL Ask agent (no mocks, no shortcut path) and scores the outcome, so
// the weekly scorecard measures exactly the pipeline users talk to:
// governance filtering, retrieval, status decision, composition, citations.
//
// Runs are asynchronous (the route returns 202 and the client polls): a full
// run makes ~23 model calls and takes minutes. A small worker pool keeps
// concurrency at 2 so an eval never starves interactive Ask traffic.
//
// Grounding check: a cited document must appear in the turn's own audited
// retrieval hits (F3 log). A citation outside the audited retrieval is a
// fabricated source — that is the hallucination signal, measured against the
// audit trail rather than the model's self-report.

import { runAskAgent } from "./askAgent";
import { logger } from "../lib/logger";
import { GOLDEN_QUESTIONS, type GoldenQuestion } from "../data/goldenSet";
import { ROLES } from "../data/corpus";
import { getRetrievalAuditEntry } from "../data/retrievalLog";
import {
  createRun,
  appendRunResult,
  completeRun,
  failRun,
  hasRunningRun,
  claimScheduledEval,
  type EvalResultRow,
  type EvalTrigger,
} from "../data/qualityStore";

export class EvalRunInFlightError extends Error {
  constructor() {
    super("An evaluation run is already in flight. Wait for it to finish before starting another.");
    this.name = "EvalRunInFlightError";
  }
}

const CONCURRENCY = 2;

/**
 * Start a golden-set evaluation run. Returns the run id immediately; the run
 * itself executes in the background and is observed by polling the run.
 * Throws EvalRunInFlightError when another run is still running — two
 * concurrent evals would double the model spend and skew each other's
 * latency percentiles.
 */
export function startEvalRun(
  trigger: EvalTrigger,
  reevalOfFeedbackId: string | null = null,
): string {
  if (hasRunningRun()) throw new EvalRunInFlightError();
  const run = createRun(trigger, GOLDEN_QUESTIONS.length, reevalOfFeedbackId);
  logger.info(
    { runId: run.id, trigger, goldens: GOLDEN_QUESTIONS.length, reevalOfFeedbackId },
    "eval runner: run started",
  );
  void executeRun(run.id).catch((err) => {
    logger.error({ err, runId: run.id }, "eval runner: run failed");
    failRun(run.id, err instanceof Error ? err.message : "Evaluation run failed unexpectedly.");
  });
  return run.id;
}

async function executeRun(runId: string): Promise<void> {
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < GOLDEN_QUESTIONS.length) {
      const golden = GOLDEN_QUESTIONS[cursor];
      cursor += 1;
      const row = await evaluateGolden(golden);
      appendRunResult(runId, row);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const run = completeRun(runId);
  logger.info(
    { runId, metrics: run?.metrics ?? null },
    "eval runner: run completed",
  );
}

async function evaluateGolden(golden: GoldenQuestion): Promise<EvalResultRow> {
  const role = ROLES.find((r) => r.id === golden.roleId);
  const startedAt = Date.now();
  try {
    const result = await runAskAgent(
      {
        question: golden.question,
        area: role?.area ?? "",
        roleId: golden.roleId,
        lang: golden.lang,
      },
      logger,
    );
    const latencyMs = Date.now() - startedAt;

    const citedDocIds = [...new Set(result.citations.map((c) => c.docId))];
    const statusOk = result.status === golden.expectedStatus;

    // Answered goldens must cite at least one of the documents the corpus
    // genuinely answers from — right status with wrong evidence is a fail.
    let expectedDocCited: boolean | null = null;
    if (golden.expectedStatus === "answered" && (golden.expectedDocIds?.length ?? 0) > 0) {
      expectedDocCited =
        result.status === "answered" &&
        (golden.expectedDocIds as string[]).some((id) => citedDocIds.includes(id));
    }

    let historicOk: boolean | null = null;
    if (golden.expectHistoric) historicOk = result.historic === true;

    // Grounding against the turn's own audited retrieval (F3). When the audit
    // entry is unavailable (no retrieval happened, or the rolling log evicted
    // it), grounding is not provable either way — we do NOT count that as a
    // hallucination, so the metric never accuses without evidence.
    const citationsTotal = result.citations.length;
    let citationsGrounded = citationsTotal;
    let ungroundedCitation = false;
    const auditId = result.auditId ?? null;
    if (citationsTotal > 0 && auditId) {
      const trace = getRetrievalAuditEntry(auditId);
      if (trace) {
        const retrievedDocIds = new Set(
          trace.events.flatMap((e) => e.hits.filter((h) => h.accessible).map((h) => h.docId)),
        );
        citationsGrounded = result.citations.filter((c) => retrievedDocIds.has(c.docId)).length;
        ungroundedCitation = citationsGrounded < citationsTotal;
      }
    }

    // Hallucination means fabricated evidence: a citation outside the turn's
    // own audited retrieval. A wrong status (answering where the golden
    // expected a refusal) is an accuracy failure, NOT a fabrication — the
    // answer may be honestly grounded in permitted material even when the
    // golden's expectation disagrees. Conflating the two inflates the
    // hallucination rate with rows that never invented a source.
    const hallucinated = ungroundedCitation;

    const pass =
      statusOk && expectedDocCited !== false && historicOk !== false && !hallucinated;

    return {
      goldenId: golden.id,
      question: golden.question,
      roleId: golden.roleId,
      lang: golden.lang,
      expectedStatus: golden.expectedStatus,
      actualStatus: result.status,
      citedDocIds,
      expectedDocCited,
      historicOk,
      citationsTotal,
      citationsGrounded,
      hallucinated,
      pass,
      latencyMs,
      error: null,
    };
  } catch (err) {
    // An errored golden is a failed golden — but an infrastructure error is
    // not a hallucination, so it degrades accuracy without polluting the
    // fabrication metric.
    logger.error({ err, goldenId: golden.id }, "eval runner: golden errored");
    return {
      goldenId: golden.id,
      question: golden.question,
      roleId: golden.roleId,
      lang: golden.lang,
      expectedStatus: golden.expectedStatus,
      actualStatus: null,
      citedDocIds: [],
      expectedDocCited: null,
      historicOk: null,
      citationsTotal: 0,
      citationsGrounded: 0,
      hallucinated: false,
      pass: false,
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : "Golden evaluation failed.",
    };
  }
}

/**
 * Fire the weekly scheduled evaluation when its slot has passed. The slot is
 * claimed BEFORE the run starts (mark-before-run), so a crash mid-run cannot
 * double-fire the same week. Called from the scheduler tick and lazily from
 * the runs listing, so the weekly eval catches up even if the server slept
 * through Monday 07:00.
 */
export function maybeStartScheduledEval(): void {
  if (!claimScheduledEval()) return;
  try {
    const runId = startEvalRun("scheduled");
    logger.info({ runId }, "eval runner: weekly scheduled eval fired");
  } catch (err) {
    if (err instanceof EvalRunInFlightError) {
      // The slot was consumed while another run was in flight: skip this
      // week's automatic run rather than queueing behind an unknown wait.
      logger.warn("eval runner: weekly slot skipped — another run in flight");
      return;
    }
    logger.error({ err }, "eval runner: weekly scheduled eval failed to start");
  }
}
