// Quality & feedback subsystem routes.
//
// L1 — golden-set evaluation: run history + scorecard (view_audit), manual
//      run start (approve_sensitive full, 202 + poll).
// L2 — answer feedback: any module user records a four-way verdict; the exact
//      retrieval trace is snapshotted at feedback time so the report stays
//      reproducible after the rolling audit log evicts the entry.
// L3 — triage: classify (error class + corrective action) and close the loop
//      with a linked re-evaluation run (approve_sensitive full).

import { Router, type IRouter } from "express";
import {
  SubmitQualityFeedbackBody,
  SubmitQualityFeedbackResponse,
  ListQualityFeedbackQueryParams,
  ListQualityFeedbackResponse,
  GetQualityFeedbackItemQueryParams,
  GetQualityFeedbackItemResponse,
  ListQualityGoldensQueryParams,
  ListQualityGoldensResponse,
  ListQualityRunsQueryParams,
  ListQualityRunsResponse,
  StartQualityRunBody,
  StartQualityRunResponse,
  GetQualityRunQueryParams,
  GetQualityRunResponse,
  ClassifyQualityFeedbackBody,
  ClassifyQualityFeedbackResponse,
  StartQualityReevalBody,
  StartQualityReevalResponse,
} from "@workspace/api-zod";
import { requireCapability } from "../data/accessControl";
import { getRetrievalAuditEntry } from "../data/retrievalLog";
import {
  listGoldens,
  listRuns,
  getRun,
  hasRunningRun,
  getNextEvalAt,
  addFeedback,
  listFeedback,
  getFeedback,
  classifyFeedback,
  attachReevalRun,
  type FeedbackVerdict,
  type TriageErrorClass,
} from "../data/qualityStore";
import {
  startEvalRun,
  maybeStartScheduledEval,
  EvalRunInFlightError,
} from "../agent/evalRunner";

const router: IRouter = Router();

const VERDICTS: readonly FeedbackVerdict[] = ["correct", "partial", "incorrect", "fabricated"];
const ERROR_CLASSES: readonly TriageErrorClass[] = [
  "retrieval_miss",
  "stale_source",
  "bad_citation",
  "model_error",
  "permission_gap",
  "not_an_error",
];

// L2 — record a verdict on an Ask answer. Any persona who can use the
// modules can report; the trace snapshot rides along when the turn had one.
router.post("/quality/feedback", (req, res) => {
  const parsed = SubmitQualityFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const body = parsed.data;
  if (!VERDICTS.includes(body.verdict as FeedbackVerdict)) {
    res.status(400).json({
      error: `Unknown verdict "${body.verdict}". Expected one of: ${VERDICTS.join(", ")}.`,
      code: "invalid_body",
    });
    return;
  }
  if (!requireCapability(req, res, "use_modules", "partial", body.roleId)) return;
  const auditId = body.auditId ?? null;
  const entry = addFeedback({
    verdict: body.verdict as FeedbackVerdict,
    note: body.note ?? null,
    question: body.question,
    answerPreview: body.answer,
    answerStatus: body.status,
    citedDocIds: body.citedDocIds ?? [],
    roleId: body.roleId,
    lang: body.lang ?? null,
    auditId,
    // Snapshot NOW — the rolling F3 log evicts old entries, the report must not.
    retrievalTrace: auditId ? (getRetrievalAuditEntry(auditId) ?? null) : null,
  });
  req.log.info(
    { feedbackId: entry.id, verdict: entry.verdict, roleId: entry.roleId, auditId },
    "quality: feedback recorded",
  );
  res.json(SubmitQualityFeedbackResponse.parse(entry));
});

// L3 — the triage queue. Traces are omitted here; fetch one item for the trace.
router.get("/quality/feedback", (req, res) => {
  const parsed = ListQualityFeedbackQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters.", code: "invalid_query" });
    return;
  }
  if (!requireCapability(req, res, "view_audit", "partial", parsed.data.viewerRoleId)) return;
  const items = listFeedback();
  res.json(ListQualityFeedbackResponse.parse({ total: items.length, items }));
});

router.get("/quality/feedback-item", (req, res) => {
  const parsed = GetQualityFeedbackItemQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters.", code: "invalid_query" });
    return;
  }
  if (!requireCapability(req, res, "view_audit", "partial", parsed.data.viewerRoleId)) return;
  const entry = getFeedback(parsed.data.feedbackId);
  if (!entry) {
    res.status(404).json({ error: "Unknown feedback id.", code: "not_found" });
    return;
  }
  res.json(GetQualityFeedbackItemResponse.parse(entry));
});

// L1 — the golden set itself, for the scorecard's coverage browser.
router.get("/quality/goldens", (req, res) => {
  const parsed = ListQualityGoldensQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters.", code: "invalid_query" });
    return;
  }
  if (!requireCapability(req, res, "view_audit", "partial", parsed.data.viewerRoleId)) return;
  const items = listGoldens();
  res.json(ListQualityGoldensResponse.parse({ total: items.length, items }));
});

// L1 — run history + weekly anchor. Listing also lazily catches up the weekly
// schedule, so the Monday eval fires even if no scheduler tick saw the slot.
router.get("/quality/runs", (req, res) => {
  const parsed = ListQualityRunsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters.", code: "invalid_query" });
    return;
  }
  if (!requireCapability(req, res, "view_audit", "partial", parsed.data.viewerRoleId)) return;
  maybeStartScheduledEval();
  res.json(
    ListQualityRunsResponse.parse({
      nextEvalAt: getNextEvalAt(),
      running: hasRunningRun(),
      items: listRuns(),
    }),
  );
});

router.get("/quality/run", (req, res) => {
  const parsed = GetQualityRunQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters.", code: "invalid_query" });
    return;
  }
  if (!requireCapability(req, res, "view_audit", "partial", parsed.data.viewerRoleId)) return;
  const run = getRun(parsed.data.runId);
  if (!run) {
    res.status(404).json({ error: "Unknown run id.", code: "not_found" });
    return;
  }
  res.json(GetQualityRunResponse.parse(run));
});

// L1 — start a manual evaluation run. Full-level approvers only: a run spends
// ~23 model calls, so kicking one off is a sensitive, budgeted action.
router.post("/quality/runs", (req, res) => {
  const parsed = StartQualityRunBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  if (!requireCapability(req, res, "approve_sensitive", "full", parsed.data.roleId)) return;
  try {
    const runId = startEvalRun("manual");
    res.status(202).json(StartQualityRunResponse.parse({ runId }));
  } catch (err) {
    if (err instanceof EvalRunInFlightError) {
      res.status(409).json({ error: err.message, code: "run_in_flight" });
      return;
    }
    throw err;
  }
});

// L3 — classify a feedback item: error class + corrective action.
router.post("/quality/feedback/classify", (req, res) => {
  const parsed = ClassifyQualityFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const body = parsed.data;
  if (!ERROR_CLASSES.includes(body.errorClass as TriageErrorClass)) {
    res.status(400).json({
      error: `Unknown error class "${body.errorClass}". Expected one of: ${ERROR_CLASSES.join(", ")}.`,
      code: "invalid_body",
    });
    return;
  }
  if (body.correctiveAction.trim().length === 0) {
    res.status(400).json({
      error: "A corrective action is required — the triage trail must say what was done.",
      code: "invalid_body",
    });
    return;
  }
  if (!requireCapability(req, res, "approve_sensitive", "full", body.roleId)) return;
  const entry = classifyFeedback(
    body.feedbackId,
    body.errorClass as TriageErrorClass,
    body.correctiveAction.trim(),
    body.roleId,
  );
  if (!entry) {
    res.status(404).json({ error: "Unknown feedback id.", code: "not_found" });
    return;
  }
  req.log.info(
    { feedbackId: entry.id, errorClass: body.errorClass, roleId: body.roleId },
    "quality: feedback classified",
  );
  res.json(ClassifyQualityFeedbackResponse.parse(entry));
});

// L3 — close the loop: launch a re-evaluation run bound to a classified item.
// When the run completes, the store marks the item resolved.
router.post("/quality/reeval", (req, res) => {
  const parsed = StartQualityReevalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const body = parsed.data;
  if (!requireCapability(req, res, "approve_sensitive", "full", body.roleId)) return;
  const entry = getFeedback(body.feedbackId);
  if (!entry) {
    res.status(404).json({ error: "Unknown feedback id.", code: "not_found" });
    return;
  }
  if (entry.triage.state !== "classified") {
    res.status(409).json({
      error:
        entry.triage.state === "resolved"
          ? "This feedback item is already resolved."
          : "Classify the feedback item (error class + corrective action) before re-evaluating.",
      code: "not_classified",
    });
    return;
  }
  try {
    const runId = startEvalRun("reeval", entry.id);
    attachReevalRun(entry.id, runId);
    req.log.info(
      { feedbackId: entry.id, runId, roleId: body.roleId },
      "quality: re-evaluation run started",
    );
    res.status(202).json(StartQualityReevalResponse.parse({ runId }));
  } catch (err) {
    if (err instanceof EvalRunInFlightError) {
      res.status(409).json({ error: err.message, code: "run_in_flight" });
      return;
    }
    throw err;
  }
});

export default router;
