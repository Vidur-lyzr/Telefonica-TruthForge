import { Router, type IRouter } from "express";
import {
  GenerateBody,
  GenerateResponse,
  RefineDocumentBody,
  RefineDocumentResponse,
  CheckDocumentBody,
  CheckDocumentResponse,
  ListShapesResponse,
  ListAssetsResponse,
  ListSchedulesResponse,
  CreateScheduleBody,
  CreateScheduleResponse,
  RunScheduleResponse,
  ListReviewItemsResponse,
  ApproveReviewItemBody,
  ApproveReviewItemResponse,
  ListVersionsResponse,
  SaveVersionBody,
  SaveVersionResponse,
  StartGenerateJobBody,
  StartRefineJobBody,
  GetGenerationJobResponse,
  ExportDocumentBody,
  ExportDocumentPackBody,
  ExportDocumentPreviewBody,
  ExportDocumentPreviewResponse,
  RecordEditorialReviewBody,
  RecordEditorialReviewResponse,
  SuggestTemplateBody,
  SuggestTemplateResponse,
  GetBriefExamplesResponse,
  BriefChatBody,
  BriefChatResponse,
  ListNotificationsResponse,
  MarkNotificationsReadResponse,
  ListDeliveriesResponse,
  PublishReviewItemResponse,
  CanvasSuggestionsBody,
  CanvasSuggestionsResponse,
  CanvasEditBlockBody,
  CanvasEditBlockResponse,
  ListCanvasEditsResponse,
  RunScheduleBody,
  PublishReviewItemBody,
  GetVisualLayoutPoolResponse,
} from "@workspace/api-zod";
import { publishApprovedDraft, PublishRefusedError } from "../data/publishBack";
import {
  exportDraft,
  exportPack,
  ExportRefusedError,
  type ExportDestination,
} from "../export/exportService";
import type { ExportFormat } from "../export/exportTemplates";
import { renderExportPreview, type PreviewFormat } from "../export/previewService";
import { listVisualLayoutPool, renderLayoutSamplePng } from "../export/layoutPool";
import {
  runGenerateAgent,
  refineDraft,
  type GeneratedDraft,
} from "../agent/generateAgent";
import { suggestTemplate, captureBrief } from "../agent/briefAgent";
import { listBriefExamples, type ExampleLang } from "../agent/briefExamples";
import { runScheduleNow, ScheduleRunInProgressError } from "../agent/scheduleRunner";
import {
  editCanvasBlock,
  suggestionsForBlock,
  addDisclaimerToDraft,
  listCanvasEditAudit,
  BlockLockedError,
} from "../agent/canvasAgent";
import { runBrandGuardian } from "../agent/brandGuardian";
import { ROLES, CLEARANCE_RANK, getDoc, type Clearance, type Role } from "../data/corpus";
import { requireCapability } from "../data/accessControl";
import { isQuotaError } from "../data/userUsage";
import { respondIfQuotaError } from "../lib/quotaHttp";
import { observe } from "../lib/observe";
import {
  TEMPLATES,
  APPROVED_CLAIMS,
  APPROVED_QUOTES,
  BOILERPLATES,
  DISCLAIMERS,
  GLOSSARY,
} from "../data/assets";
import {
  listSchedules,
  getSchedule,
  createSchedule,
  listReviewItems,
  getReviewItem,
  approveReviewItem,
  listVersions,
  saveVersion,
  registerScheduledDraft,
  findScheduledReviewItemId,
  hashDraftContent,
  touchReviewItem,
  recordEditorialReview,
  addNotification,
  listNotifications,
  listDeliveries,
  markNotificationsRead,
  createJob,
  getJob,
  setJobStage,
  completeJob,
  failJob,
  findPublicationByReviewItem,
} from "../data/generateStore";

const router: IRouter = Router();

function roleLabel(roleId: string): string {
  return ROLES.find((r) => r.id === roleId)?.label ?? roleId;
}

// Flattens the generated draft into the text the user actually sees, so the
// Observatory records the real artefact — not just its title.
function draftBodyText(draft: GeneratedDraft): string {
  return draft.sections
    .map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body))
    .join("\n\n");
}

// Partial approve_sensitive (editor) bound: every source the draft cites must
// sit at or below the approver's own clearance. Re-derived from the SERVER
// corpus per docId — the client-supplied confidentiality labels on the draft
// are never trusted. A citation whose doc is unknown fails closed.
function citationsWithinClearance(
  citations: { docId: string }[] | undefined,
  role: Role,
): boolean {
  const cap = CLEARANCE_RANK[role.clearance];
  return (citations ?? []).every((c) => {
    const doc = getDoc(c.docId);
    if (!doc) return false;
    return CLEARANCE_RANK[doc.confidentiality as Clearance] <= cap;
  });
}

function refuseAboveClearance(res: Parameters<typeof requireCapability>[1], role: Role): void {
  res.status(403).json({
    error: `This draft cites sources above your clearance ("${role.clearance}"). An editor may only approve or publish outputs bounded by their own clearance.`,
    code: "capability_blocked",
    capability: "approve_sensitive",
    profile: role.profileId,
  });
}

router.post("/generate", async (req, res) => {
  const parsed = GenerateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireCapability(req, res, "use_modules", "partial", parsed.data.roleId)) return;
  try {
    const result = await runGenerateAgent(
      {
        shape: parsed.data.shape as "messaging" | "press" | "multiformat" | "visualdeck",
        topic: parsed.data.topic,
        roleId: parsed.data.roleId,
        audience: parsed.data.audience as "internal" | "external",
        templateId: parsed.data.templateId ?? null,
        language: parsed.data.language,
        confidentiality: parsed.data.confidentiality,
        format: parsed.data.format,
        axisIds: parsed.data.axisIds,
        spokesperson: parsed.data.spokesperson ?? null,
        eventDate: parsed.data.eventDate ?? null,
        kpiContext: parsed.data.kpiContext ?? null,
        askContext: parsed.data.askContext ?? null,
        attachments: parsed.data.attachments ?? null,
      },
      req.log,
    );
    observe(req, {
      kind: "generate",
      page: "/generate",
      roleId: parsed.data.roleId,
      summary: `${result.title} — ${parsed.data.topic}`,
      response: draftBodyText(result),
      status: result.status,
      docIds: [...new Set(result.citations.map((c) => c.docId))],
      detail: {
        draftId: result.id,
        shape: parsed.data.shape,
        audience: parsed.data.audience,
        language: result.language,
        guardian: result.guardian.status,
      },
    });
    res.json(GenerateResponse.parse(result));
  } catch (err) {
    if (respondIfQuotaError(err, res)) return;
    req.log.error({ err }, "generate route failed");
    res.status(500).json({ error: "The Hub could not generate this document." });
  }
});

router.post("/generate/refine", async (req, res) => {
  const parsed = RefineDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireCapability(req, res, "use_modules", "partial", parsed.data.roleId)) return;
  try {
    const result = await refineDraft(
      {
        draft: parsed.data.draft as unknown as GeneratedDraft,
        instruction: parsed.data.instruction,
        roleId: parsed.data.roleId,
        selection: parsed.data.selection ?? null,
      },
      req.log,
    );
    observe(req, {
      kind: "generate",
      page: "/generate",
      roleId: parsed.data.roleId,
      summary: `${result.title} — refine: ${parsed.data.instruction}`,
      response: draftBodyText(result),
      status: result.status,
      docIds: [...new Set(result.citations.map((c) => c.docId))],
      detail: {
        draftId: result.id,
        action: "refine",
        language: result.language,
        guardian: result.guardian.status,
      },
    });
    res.json(RefineDocumentResponse.parse(result));
  } catch (err) {
    if (respondIfQuotaError(err, res)) return;
    req.log.error({ err }, "refine route failed");
    res.status(500).json({ error: "The Hub could not refine this document." });
  }
});

router.post("/generate/check", async (req, res) => {
  const parsed = CheckDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const guardian = runBrandGuardian(parsed.data.draft as unknown as GeneratedDraft);
    res.json(CheckDocumentResponse.parse(guardian));
  } catch (err) {
    if (respondIfQuotaError(err, res)) return;
    req.log.error({ err }, "check route failed");
    res.status(500).json({ error: "The Brand Guardian could not check this document." });
  }
});

router.get("/generate/shapes", async (_req, res) => {
  const shapes = TEMPLATES.map((t) => ({
    id: t.id,
    shape: t.shape,
    name: t.name,
    description: t.description,
    sections: t.sections.map((s) => ({
      key: s.key,
      label: s.label,
      kind: s.kind,
      perAxis: Boolean(s.perAxis),
    })),
  }));
  res.json(ListShapesResponse.parse(shapes));
});

router.get("/generate/assets", async (_req, res) => {
  const assets = {
    claims: APPROVED_CLAIMS.map((c) => ({
      id: c.id,
      text: c.text,
      confidentiality: c.confidentiality,
      validity: c.validity,
      note: c.note ?? null,
    })),
    quotes: APPROVED_QUOTES.map((q) => ({
      id: q.id,
      text: q.text,
      attribution: q.attribution,
      confidentiality: q.confidentiality,
      validity: q.validity,
    })),
    boilerplates: BOILERPLATES.map((b) => ({
      id: b.id,
      name: b.name,
      text: b.text,
      confidentiality: b.confidentiality,
      validity: b.validity,
    })),
    disclaimers: DISCLAIMERS.map((d) => ({
      id: d.id,
      name: d.name,
      text: d.text,
      appliesTo: d.appliesTo,
    })),
    glossary: GLOSSARY.map((g) => ({ id: g.id, term: g.term, definition: g.definition })),
  };
  res.json(ListAssetsResponse.parse(assets));
});

// The visual layout pool — every slide layout the deck composer can pick
// from, coded and extracted alike. Read-only; nothing here is confidential
// (layouts are structure, not content).
router.get("/generate/visual-layouts", (_req, res) => {
  res.json(GetVisualLayoutPoolResponse.parse({ layouts: listVisualLayoutPool() }));
});

// Deterministic sample-slide rendering of one pool layout, drawn by the
// same compose + PNG engine the real deck exports use.
router.get("/generate/visual-layout-preview", (req, res) => {
  const layoutId = typeof req.query.layoutId === "string" ? req.query.layoutId : "";
  if (!layoutId) {
    res.status(400).json({ error: "layoutId is required" });
    return;
  }
  let png: Buffer | null;
  try {
    png = renderLayoutSamplePng(layoutId);
  } catch (err) {
    req.log.error({ err, layoutId }, "layout-pool: sample render failed");
    res.status(500).json({ error: "The layout preview could not be rendered." });
    return;
  }
  if (!png) {
    res.status(404).json({ error: "Unknown layout" });
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(png);
});

router.get("/generate/schedules", async (_req, res) => {
  res.json(ListSchedulesResponse.parse(listSchedules()));
});

router.post("/generate/canvas/suggestions", async (req, res) => {
  const parsed = CanvasSuggestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const suggestions = suggestionsForBlock(
      parsed.data.draft as unknown as GeneratedDraft,
      parsed.data.sectionId,
    );
    res.json(CanvasSuggestionsResponse.parse({ suggestions }));
  } catch (err) {
    if (respondIfQuotaError(err, res)) return;
    req.log.error({ err }, "canvas suggestions route failed");
    res.status(500).json({ error: "Could not derive suggestions for this block." });
  }
});

router.post("/generate/canvas/edit", async (req, res) => {
  const parsed = CanvasEditBlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireCapability(req, res, "use_modules", "partial", parsed.data.roleId)) return;
  const draft = parsed.data.draft as unknown as GeneratedDraft;
  try {
    // Deterministic disclaimer insertion — no model, no retrieval.
    const discMatch = /^__add_disclaimer:(.+)$/.exec(parsed.data.instruction.trim());
    if (discMatch) {
      const updated = addDisclaimerToDraft(draft, discMatch[1]);
      res.json(
        CanvasEditBlockResponse.parse({
          status: updated ? "applied" : "no_change",
          draft: updated ?? draft,
          section: null,
          guardian: updated?.guardian ?? null,
          note: updated ? null : "That disclaimer is already present in the draft.",
        }),
      );
      return;
    }
    const outcome = await editCanvasBlock(
      {
        draft,
        sectionId: parsed.data.sectionId,
        instruction: parsed.data.instruction,
        roleId: parsed.data.roleId,
      },
      req.log,
    );
    res.json(CanvasEditBlockResponse.parse(outcome));
  } catch (err) {
    if (err instanceof BlockLockedError) {
      res.status(409).json({ error: err.message, code: "block_locked" });
      return;
    }
    if (respondIfQuotaError(err, res)) return;
    req.log.error({ err }, "canvas edit route failed");
    res.status(500).json({ error: "The Hub could not edit this block." });
  }
});

router.get("/generate/canvas/audit", async (_req, res) => {
  res.json(ListCanvasEditsResponse.parse({ items: listCanvasEditAudit() }));
});

router.post("/generate/schedules", async (req, res) => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  // Creating a recurring run that lands in the review inbox is a sensitive-
  // output action. Partial (editor): the schedule's confidentiality tier must
  // sit at or below the editor's own clearance.
  const grant = requireCapability(req, res, "approve_sensitive", "partial", d.ownerRoleId);
  if (!grant) return;
  const tier = (d.confidentiality ?? "private") as Clearance;
  if (
    grant.level === "partial" &&
    (CLEARANCE_RANK[tier] ?? CLEARANCE_RANK.off_the_record) >
      CLEARANCE_RANK[grant.role.clearance]
  ) {
    res.status(403).json({
      error: `An editor may only schedule outputs at or below their own clearance ("${grant.role.clearance}").`,
      code: "capability_blocked",
      capability: "approve_sensitive",
      profile: grant.role.profileId,
    });
    return;
  }
  const schedule = createSchedule({
    name: d.name,
    shape: d.shape,
    topic: d.topic,
    queries: (d.queries ?? []).map((q) => q.trim()).filter(Boolean),
    axisIds: d.axisIds ?? [],
    language: d.language ?? "en",
    audience: (d.audience as "internal" | "external") ?? "internal",
    confidentiality: d.confidentiality ?? "private",
    frequency: (d.frequency as "daily" | "weekly" | "monthly") ?? "weekly",
    timeOfDay: d.timeOfDay ?? null,
    ownerRoleId: d.ownerRoleId,
    ownerLabel: roleLabel(d.ownerRoleId),
    reviewFolder: d.reviewFolder ?? "Review inbox",
  });
  res.json(CreateScheduleResponse.parse(schedule));
});

router.post("/generate/schedules/:id/run", async (req, res) => {
  const parsedRun = RunScheduleBody.safeParse(req.body);
  if (!parsedRun.success) {
    res.status(400).json({ error: "Invalid request", details: parsedRun.error.issues });
    return;
  }
  if (!requireCapability(req, res, "approve_sensitive", "partial", parsedRun.data.roleId)) {
    return;
  }
  const schedule = getSchedule(req.params.id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found." });
    return;
  }
  try {
    // Same pipeline the automatic scheduler uses — provenance stamping,
    // lineage registration, notification and simulated deliveries included.
    const item = await runScheduleNow(schedule, req.log);
    res.json(RunScheduleResponse.parse(item));
  } catch (err) {
    if (err instanceof ScheduleRunInProgressError) {
      res.status(409).json({ error: err.message, code: "run_in_progress" });
      return;
    }
    req.log.error({ err }, "run schedule failed");
    res.status(500).json({ error: "The scheduled run could not complete." });
  }
});

router.get("/generate/inbox", async (_req, res) => {
  res.json(ListReviewItemsResponse.parse(listReviewItems()));
});

router.post("/generate/inbox/:id/approve", async (req, res) => {
  const parsed = ApproveReviewItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const approveGrant = requireCapability(
    req,
    res,
    "approve_sensitive",
    "partial",
    parsed.data.roleId,
  );
  if (!approveGrant) return;
  const item = getReviewItem(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Review item not found." });
    return;
  }
  const draft = parsed.data.draft as unknown as GeneratedDraft;
  if (
    approveGrant.level === "partial" &&
    !citationsWithinClearance(draft.citations, approveGrant.role)
  ) {
    refuseAboveClearance(res, approveGrant.role);
    return;
  }
  const guardian = runBrandGuardian(draft);
  if (guardian.status !== "pass") {
    res
      .status(409)
      .json({ error: "The Brand Guardian must pass before this item can be approved." });
    return;
  }
  // Approval is the ONLY place a scheduled draft becomes exportable/versionable.
  const approved = approveReviewItem(item.id, {
    ...draft,
    guardian,
    origin: "scheduled",
    reviewItemId: item.id,
    approved: true,
  });
  // Bind the approved content hash (and any post-review id) to the lineage too,
  // so the save/version gate resolves this item even if the human edited during
  // review before approving.
  if (approved) {
    registerScheduledDraft([approved.draft.id, hashDraftContent(approved.draft)], item.id);
    addNotification({
      kind: "review_approved",
      reviewItemId: item.id,
      reviewFolder: approved.reviewFolder,
      ownerRoleId: approved.ownerRoleId,
      ownerLabel: approved.ownerLabel,
      message: `"${approved.draft.title}" was approved in "${approved.reviewFolder}" and can now be saved and exported.`,
    });
  }
  res.json(ApproveReviewItemResponse.parse(approved));
});

// D4 — publish an APPROVED review item back into the governed corpus as a
// versioned category-E document. Every gate here is server-authoritative:
// the item's own status, its approval-time content hash, and the server-side
// publications registry. No client-supplied flag is consulted.
const publishInFlight = new Set<string>();

router.post("/generate/inbox/:id/publish", async (req, res) => {
  const parsedPublish = PublishReviewItemBody.safeParse(req.body);
  if (!parsedPublish.success) {
    res.status(400).json({ error: "Invalid request", details: parsedPublish.error.issues });
    return;
  }
  const publishGrant = requireCapability(
    req,
    res,
    "approve_sensitive",
    "partial",
    parsedPublish.data.roleId,
  );
  if (!publishGrant) return;
  const item = getReviewItem(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Review item not found.", code: "not_found" });
    return;
  }
  // Partial bound is checked against the SERVER-stored draft, not the request.
  if (
    publishGrant.level === "partial" &&
    !citationsWithinClearance(item.draft.citations, publishGrant.role)
  ) {
    refuseAboveClearance(res, publishGrant.role);
    return;
  }
  // Concurrent double-fire guard: the already_published check below reads the
  // registry before the awaited upsert writes it, so two simultaneous requests
  // could both pass. One publish per item at a time.
  if (publishInFlight.has(item.id)) {
    res.status(409).json({
      error: "This draft is already being published. Wait for the current publish to finish.",
      code: "publish_in_progress",
    });
    return;
  }
  if (item.status !== "approved" || !item.approvedHash) {
    res.status(409).json({
      error: "Only approved drafts can be published to the knowledge core. Approve this item first.",
      code: "not_approved",
    });
    return;
  }
  // The approval hash binds publication to the exact content a human reviewed.
  // Any divergence (e.g. a stale or mutated store state) voids the approval.
  if (hashDraftContent(item.draft) !== item.approvedHash) {
    res.status(409).json({
      error: "The draft content no longer matches what was approved. It must be re-approved before publishing.",
      code: "content_changed",
    });
    return;
  }
  const existing = findPublicationByReviewItem(item.id);
  if (existing) {
    res.status(409).json({
      error: `This approved draft was already published as ${existing.docId} (v${existing.version}). Run the schedule again and approve a new draft to publish an update.`,
      code: "already_published",
    });
    return;
  }
  publishInFlight.add(item.id);
  try {
    const result = await publishApprovedDraft(item);
    req.log.info(
      {
        reviewItemId: item.id,
        docId: result.docId,
        version: result.version,
        superseded: result.supersededDocId,
      },
      "write-back: approved draft published to corpus",
    );
    res.json(PublishReviewItemResponse.parse(result));
  } catch (err) {
    if (err instanceof PublishRefusedError) {
      res.status(409).json({ error: err.message, code: err.code });
      return;
    }
    req.log.error({ err, reviewItemId: item.id }, "write-back: publish failed");
    res.status(500).json({
      error: "The draft could not be published to the knowledge core. Nothing was written.",
      code: "publish_failed",
    });
  } finally {
    publishInFlight.delete(item.id);
  }
});

router.get("/generate/versions", async (req, res) => {
  const roleId = typeof req.query.roleId === "string" ? req.query.roleId : undefined;
  if (roleId === undefined) {
    res.json(ListVersionsResponse.parse(listVersions()));
    return;
  }
  // Persona-scoped listing — fail closed. An unknown persona gets a 400, not
  // an empty (or worse, unscoped) list. Scoping is by the persona that
  // authored the underlying draft, so a lower-clearance persona can never
  // reopen a version generated under a higher clearance.
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    res.status(400).json({ error: "Unknown roleId" });
    return;
  }
  const scoped = listVersions().filter((v) => v.draft.params.roleId === roleId);
  res.json(ListVersionsResponse.parse(scoped));
});

router.post("/generate/versions", async (req, res) => {
  const parsed = SaveVersionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const draft = parsed.data.draft as unknown as GeneratedDraft;
  // Scheduled human-approval gate — SERVER-AUTHORITATIVE. Whether a draft is
  // scheduled is decided by the server's lineage index (keyed on the draft id),
  // never by the client-submitted draft.origin/approved flags (which are UX hints
  // and can be tampered with). A scheduled draft may only be versioned when its
  // linked review item is approved AND the submitted content still matches the
  // exact content that was approved (hash bind) — so any post-approval edit voids
  // approval until it is re-reviewed.
  const submittedHash = hashDraftContent(draft);
  const scheduledReviewItemId = findScheduledReviewItemId([draft.id, submittedHash]);
  if (scheduledReviewItemId) {
    const item = getReviewItem(scheduledReviewItemId);
    if (
      !item ||
      item.status !== "approved" ||
      item.approvedHash === null ||
      item.approvedHash !== submittedHash
    ) {
      res.status(409).json({
        error:
          "Scheduled documents must be approved in the review inbox before a version can be saved, and the content must match the approved version.",
      });
      return;
    }
  }
  const guardian = runBrandGuardian(draft);
  if (guardian.status !== "pass") {
    res
      .status(409)
      .json({ error: "The Brand Guardian must pass before a version can be saved." });
    return;
  }
  const owner = ROLES.find((r) => r.id === draft.params.roleId);
  const record = saveVersion({
    title: draft.title,
    shape: draft.shape,
    language: draft.language,
    audience: draft.audience,
    confidentiality: draft.confidentiality,
    savedBy: parsed.data.savedBy,
    governance: {
      confidentiality: draft.confidentiality,
      validity: "approved",
      owner: owner?.label ?? draft.params.roleId,
    },
    draft: { ...draft, guardian },
  });
  res.json(SaveVersionResponse.parse(record));
});

router.post("/generate/export", async (req, res) => {
  const parsed = ExportDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const draft = parsed.data.draft as unknown as GeneratedDraft;
  const format = parsed.data.format as ExportFormat;
  const destination = (parsed.data.destination as ExportDestination | undefined) ?? "internal";
  try {
    const result = await exportDraft(draft, format, destination, parsed.data.templateId ?? null);
    req.log.info(
      {
        format,
        destination,
        templateId: result.templateId,
        charts: result.chartCount,
        bytes: result.buffer.length,
      },
      "document exported",
    );
    observe(req, {
      kind: "export",
      page: "/generate",
      summary: draft.title,
      docIds: [draft.id],
      detail: { format, destination, source: "generate" },
    });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    if (err instanceof ExportRefusedError) {
      const status = err.code === "not_exportable" ? 400 : 409;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    req.log.error({ err }, "export route failed");
    res.status(500).json({ error: "The Hub could not export this document." });
  }
});

// ZIP bundle of several formats of the same governed draft. Every gate a
// single-format export runs is re-run per rendered file inside exportPack.
router.post("/generate/export/pack", async (req, res) => {
  const parsed = ExportDocumentPackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const draft = parsed.data.draft as unknown as GeneratedDraft;
  const formats = (parsed.data.formats ?? []) as ExportFormat[];
  const destination = (parsed.data.destination as ExportDestination | undefined) ?? "internal";
  try {
    const result = await exportPack(draft, formats, destination, parsed.data.templateId ?? null);
    req.log.info(
      { formats, destination, templateId: result.templateId, bytes: result.buffer.length },
      "document pack exported",
    );
    observe(req, {
      kind: "export",
      page: "/generate",
      summary: draft.title,
      docIds: [draft.id],
      detail: { format: formats.join(","), destination, source: "generate_pack" },
    });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    if (err instanceof ExportRefusedError) {
      const status = err.code === "not_exportable" ? 400 : 409;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    req.log.error({ err }, "export pack route failed");
    res.status(500).json({ error: "The Hub could not export this document pack." });
  }
});

// WYSIWYG export preview: renders what the download WOULD produce as an
// inline PDF. Content gates (confidentiality, exportability, template/format)
// refuse exactly like a real export; release gates (guardian, approval,
// editorial review) never block the preview but their live status is always
// returned so the UI can show which of them would block the download.
router.post("/generate/export-preview", async (req, res) => {
  const parsed = ExportDocumentPreviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const draft = parsed.data.draft as unknown as GeneratedDraft;
  const format = parsed.data.format as PreviewFormat;
  const destination = (parsed.data.destination as ExportDestination | undefined) ?? "internal";
  try {
    const result = await renderExportPreview(draft, format, destination, parsed.data.templateId ?? null);
    req.log.info(
      {
        format,
        destination,
        status: result.status,
        exact: result.exact,
        templateId: result.templateId,
        refusedCode: result.refusedCode,
        bytes: result.pdfBase64 ? result.pdfBase64.length : 0,
      },
      "export preview rendered",
    );
    res.json(ExportDocumentPreviewResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "export preview route failed");
    res.status(500).json({ error: "The Hub could not render this preview." });
  }
});

// ---- Editorial review (press releases) --------------------------------------
// Mandatory human sign-off before a press release can be exported. The review
// is bound server-side to the exact content hash, so any later edit voids it.

router.post("/generate/editorial-review", async (req, res) => {
  const parsed = RecordEditorialReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const draft = parsed.data.draft as unknown as GeneratedDraft;
  if (draft.shape !== "press") {
    res.status(409).json({ error: "Editorial review applies to press releases only." });
    return;
  }
  if (draft.status !== "drafted") {
    res.status(409).json({ error: "Only a drafted document can be reviewed." });
    return;
  }
  const guardian = runBrandGuardian(draft);
  if (guardian.status !== "pass") {
    res
      .status(409)
      .json({ error: "The Brand Guardian must pass before the editorial review can be recorded." });
    return;
  }
  const review = recordEditorialReview(draft, parsed.data.reviewedBy);
  req.log.info({ draftId: draft.id, reviewedBy: parsed.data.reviewedBy }, "editorial review recorded");
  res.json(
    RecordEditorialReviewResponse.parse({
      id: review.id,
      draftId: review.draftId,
      title: review.title,
      reviewedBy: review.reviewedBy,
      reviewedAt: review.reviewedAt,
    }),
  );
});

// ---- Brief helpers -----------------------------------------------------------

router.post("/generate/suggest-template", async (req, res) => {
  const parsed = SuggestTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  // The evidence check runs at the persona's clearance so the suggestion is
  // honest about what a draft could actually cite. Unknown roleIds are
  // rejected — never silently downgraded to a different persona.
  let clearance: Clearance = "public";
  if (parsed.data.roleId !== undefined) {
    const role = ROLES.find((r) => r.id === parsed.data.roleId);
    if (!role) {
      res.status(400).json({ error: "Unknown roleId" });
      return;
    }
    clearance = role.clearance;
  }
  try {
    const suggestion = await suggestTemplate(parsed.data.description, clearance, req.log);
    res.json(SuggestTemplateResponse.parse(suggestion));
  } catch (err) {
    req.log.error({ err }, "suggest-template route failed");
    res.status(500).json({ error: "The Hub could not suggest a template." });
  }
});

router.get("/generate/brief-examples", async (req, res) => {
  const roleId = typeof req.query.roleId === "string" ? req.query.roleId : undefined;
  if (!roleId) {
    res.status(400).json({ error: "roleId is required" });
    return;
  }
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    res.status(400).json({ error: "Unknown roleId" });
    return;
  }
  const langRaw = typeof req.query.lang === "string" ? req.query.lang.toLowerCase() : "en";
  const lang: ExampleLang = (["en", "es", "de", "pt"] as const).includes(
    langRaw as ExampleLang,
  )
    ? (langRaw as ExampleLang)
    : "en";
  try {
    const examples = await listBriefExamples(role.clearance, lang, req.log);
    res.json(GetBriefExamplesResponse.parse({ examples }));
  } catch (err) {
    req.log.error({ err }, "brief-examples route failed");
    res.status(500).json({ error: "The Hub could not load example briefs." });
  }
});

router.post("/generate/brief-chat", async (req, res) => {
  const parsed = BriefChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const result = await captureBrief(parsed.data.turns, req.log);
    res.json(BriefChatResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "brief-chat route failed");
    res.status(500).json({ error: "The Hub could not process the brief conversation." });
  }
});

// ---- Simulated deliveries (Teams / email hand-off records) ----------------------

router.get("/generate/deliveries", async (_req, res) => {
  res.json(ListDeliveriesResponse.parse(listDeliveries()));
});

// ---- Notifications -------------------------------------------------------------

router.get("/generate/notifications", async (_req, res) => {
  res.json(ListNotificationsResponse.parse(listNotifications()));
});

router.post("/generate/notifications", async (_req, res) => {
  markNotificationsRead();
  res.json(MarkNotificationsReadResponse.parse(listNotifications()));
});

// ---- Observable, staged jobs -----------------------------------------------
// These start the SAME governed pipelines as /generate and /generate/refine but
// return a job immediately so the client can poll and watch the real backend
// phases (retrieving -> composing -> guardian -> done) rather than guess on a
// timer. The synchronous endpoints above remain for back-compat and curl.

router.post("/generate/jobs", async (req, res) => {
  const parsed = StartGenerateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireCapability(req, res, "use_modules", "partial", parsed.data.roleId)) return;
  const job = createJob("generate");
  const input = {
    shape: parsed.data.shape as "messaging" | "press" | "multiformat" | "visualdeck",
    topic: parsed.data.topic,
    roleId: parsed.data.roleId,
    audience: parsed.data.audience as "internal" | "external",
    templateId: parsed.data.templateId ?? null,
    language: parsed.data.language,
    confidentiality: parsed.data.confidentiality,
    format: parsed.data.format,
    axisIds: parsed.data.axisIds,
    spokesperson: parsed.data.spokesperson ?? null,
    eventDate: parsed.data.eventDate ?? null,
    kpiContext: parsed.data.kpiContext ?? null,
    askContext: parsed.data.askContext ?? null,
    attachments: parsed.data.attachments ?? null,
  };
  const log = req.log;
  void (async () => {
    try {
      const draft = await runGenerateAgent(input, log, (stage) => setJobStage(job.id, stage));
      completeJob(job.id, draft);
      observe(req, {
        kind: "generate",
        page: "/generate",
        roleId: input.roleId,
        summary: `${draft.title} — ${input.topic}`,
        response: draftBodyText(draft),
        status: draft.status,
        docIds: [...new Set(draft.citations.map((c) => c.docId))],
        detail: {
          draftId: draft.id,
          shape: input.shape,
          audience: input.audience,
          language: draft.language,
          guardian: draft.guardian.status,
        },
      });
    } catch (err) {
      if (isQuotaError(err)) {
        failJob(job.id, err.message, err.code);
        return;
      }
      log.error({ err }, "generate job failed");
      failJob(job.id, "The Hub could not generate this document.");
    }
  })();
  res.status(202).json(GetGenerationJobResponse.parse(getJob(job.id)));
});

router.post("/generate/refine/jobs", async (req, res) => {
  const parsed = StartRefineJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireCapability(req, res, "use_modules", "partial", parsed.data.roleId)) return;
  const job = createJob("refine");
  const input = {
    draft: parsed.data.draft as unknown as GeneratedDraft,
    instruction: parsed.data.instruction,
    roleId: parsed.data.roleId,
    selection: parsed.data.selection ?? null,
  };
  const log = req.log;
  void (async () => {
    try {
      const draft = await refineDraft(input, log, (stage) => setJobStage(job.id, stage));
      completeJob(job.id, draft);
      observe(req, {
        kind: "generate",
        page: "/generate",
        roleId: input.roleId,
        summary: `${draft.title} — refine: ${input.instruction}`,
        response: draftBodyText(draft),
        status: draft.status,
        docIds: [...new Set(draft.citations.map((c) => c.docId))],
        detail: {
          draftId: draft.id,
          action: "refine",
          language: draft.language,
          guardian: draft.guardian.status,
        },
      });
    } catch (err) {
      if (isQuotaError(err)) {
        failJob(job.id, err.message, err.code);
        return;
      }
      log.error({ err }, "refine job failed");
      failJob(job.id, "The Hub could not refine this document.");
    }
  })();
  res.status(202).json(GetGenerationJobResponse.parse(getJob(job.id)));
});

router.get("/generate/jobs/:id", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  res.json(GetGenerationJobResponse.parse(job));
});

export default router;
