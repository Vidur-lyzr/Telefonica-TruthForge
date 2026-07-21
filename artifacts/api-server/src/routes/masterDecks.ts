// Master-deck intake routes — presigned upload, extraction jobs, proposal
// review and image harvest.
//
// Governance mirrors the rest of the Data Center / Brand Room split:
//   - intake (upload-url, job creation) needs ingest_documents and is
//     audit-logged as an ingest event;
//   - anything that changes live behaviour (approving a layout into the
//     registry, adding harvested images to the brand library) needs
//     manage_brand_room bounded to the Marca area and is audit-logged as a
//     config change.
// Uploaded bytes are verified server-side (size cap + file signature) BEFORE
// a job exists; job assets are addressed by server-assigned keys so the
// asset route can only ever serve files the pipeline itself produced.

import { Router, type IRouter, type Request, type Response } from "express";
import {
  RequestMasterDeckUploadUrlBody,
  RequestMasterDeckUploadUrlResponse,
  ListMasterDeckJobsResponse,
  CreateMasterDeckJobBody,
  CreateMasterDeckJobResponse,
  GetMasterDeckJobResponse,
  ApproveMasterDeckProposalBody,
  ApproveMasterDeckProposalResponse,
  RejectMasterDeckProposalBody,
  RejectMasterDeckProposalResponse,
  ConfirmMasterDeckHarvestItemBody,
  ConfirmMasterDeckHarvestItemResponse,
  DismissMasterDeckHarvestItemBody,
  DismissMasterDeckHarvestItemResponse,
  BulkMasterDeckHarvestBody,
  BulkMasterDeckHarvestResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { fetchObjectBytes } from "../lib/imageBytes";
import {
  listDeckJobs,
  getDeckJob,
  createDeckJob,
  updateDeckJob,
  DeckIntakeError,
  type DeckIntakeJob,
  type DeckPart,
} from "../data/deckIntakeStore";
import { approveExtractedLayout } from "../data/extractedLayoutStore";
import { ExtractedLayoutError } from "../export/extractedLayouts";
import { registerBrandImage, ImageLibraryError } from "../data/imageLibraryStore";
import { runDeckPipeline } from "../export/deckPipeline";
import { slimmingGuidePdf } from "../export/slimmingGuide";
import { requireCapability, type CapabilityGrant } from "../data/accessControl";
import { observe } from "../lib/observe";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const MAX_DECK_BYTES = 100 * 1024 * 1024;

// Same bounding as the Brand Room: partial (admin) grants must be Marca-area.
function requireDeckAdmin(
  req: Request,
  res: Response,
  roleId: string,
): CapabilityGrant | null {
  const grant = requireCapability(req, res, "manage_brand_room", "partial", roleId);
  if (!grant) return null;
  if (grant.level === "partial" && grant.role.area !== "Marca") {
    res.status(403).json({
      error: "Only the Brand-area (Marca) admin can review extracted layouts.",
      code: "capability_blocked",
      capability: "manage_brand_room",
      profile: grant.role.profileId,
    });
    return null;
  }
  return grant;
}

function toJobDto(job: DeckIntakeJob): Record<string, unknown> {
  return {
    id: job.id,
    deckName: job.deckName,
    kind: job.kind,
    status: job.status,
    progress: job.progress,
    slideCount: job.slideCount,
    partCount: job.parts.length,
    createdBy: job.createdBy,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    error: job.error,
    families: job.families,
    harvest: job.harvest,
  };
}

function toSummaryDto(job: DeckIntakeJob): Record<string, unknown> {
  return {
    id: job.id,
    deckName: job.deckName,
    kind: job.kind,
    status: job.status,
    progress: job.progress,
    slideCount: job.slideCount,
    partCount: job.parts.length,
    createdBy: job.createdBy,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    error: job.error,
    familyCount: job.families.length,
    pendingFamilies: job.families.filter((f) => f.status === "pending").length,
    harvestCount: job.harvest.length,
    pendingHarvest: job.harvest.filter((h) => h.status === "pending").length,
  };
}

function sendKnownError(res: Response, err: unknown): boolean {
  if (err instanceof DeckIntakeError || err instanceof ExtractedLayoutError) {
    res.status(400).json({ error: err.message, code: err.code });
    return true;
  }
  if (err instanceof ImageLibraryError) {
    res.status(400).json({ error: err.message, code: err.code });
    return true;
  }
  return false;
}

// ---- Intake ---------------------------------------------------------------------

router.post("/data/master-decks/upload-url", async (req, res) => {
  const parsed = RequestMasterDeckUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  if (!requireCapability(req, res, "ingest_documents", "partial", parsed.data.roleId)) return;
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json(RequestMasterDeckUploadUrlResponse.parse({ uploadURL, objectPath }));
  } catch (err) {
    req.log.error({ err }, "master-decks: upload URL generation failed");
    res.status(500).json({ error: "Failed to generate an upload URL." });
  }
});

const PPTX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // ZIP local file header
const PDF_MAGIC = Buffer.from("%PDF");

router.post("/data/master-decks/jobs", async (req, res) => {
  const parsed = CreateMasterDeckJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireCapability(req, res, "ingest_documents", "partial", parsed.data.roleId);
  if (!grant) return;
  const { deckName, kind, parts } = parsed.data;

  const seen = new Set<string>();
  for (const part of parts) {
    if (seen.has(part.objectPath)) {
      res.status(400).json({
        error: `The same uploaded file was listed twice (${part.filename}).`,
        code: "duplicate_part",
      });
      return;
    }
    seen.add(part.objectPath);
  }

  // Verify every part BEFORE the job exists: it must be present in object
  // storage, under the size cap, and carry the right file signature.
  const verified: DeckPart[] = [];
  for (const part of parts) {
    let size = 0;
    let head: Buffer;
    try {
      const file = await storage.getObjectEntityFile(part.objectPath);
      const [meta] = await file.getMetadata();
      size = Number(meta.size ?? 0);
      const [range] = await file.download({ start: 0, end: 7 });
      head = range;
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        res.status(400).json({
          error: `No uploaded file was found for "${part.filename}" — upload it first.`,
          code: "upload_missing",
        });
        return;
      }
      req.log.error({ err, objectPath: part.objectPath }, "master-decks: part verification failed");
      res.status(500).json({ error: "Could not read an uploaded file." });
      return;
    }
    if (!Number.isFinite(size) || size <= 0) {
      res.status(400).json({
        error: `"${part.filename}" is empty.`,
        code: "empty_part",
      });
      return;
    }
    if (size > MAX_DECK_BYTES) {
      res.status(400).json({
        error: `"${part.filename}" is larger than 100 MB — slim the deck further or split it (see the guide).`,
        code: "part_too_large",
      });
      return;
    }
    const signatureOk =
      kind === "pptx"
        ? head.subarray(0, 4).equals(PPTX_MAGIC)
        : head.subarray(0, 4).equals(PDF_MAGIC);
    if (!signatureOk) {
      res.status(400).json({
        error:
          kind === "pptx"
            ? `"${part.filename}" is not a PowerPoint (.pptx) file.`
            : `"${part.filename}" is not a PDF file.`,
        code: "wrong_signature",
      });
      return;
    }
    verified.push({ objectPath: part.objectPath, filename: part.filename, bytes: size });
  }

  const job = createDeckJob({
    deckName,
    kind,
    parts: verified,
    createdBy: grant.role.name,
    roleId: grant.role.id,
  });
  req.log.info(
    { jobId: job.id, kind, parts: verified.length },
    "master-decks: extraction job created",
  );
  observe(req, {
    kind: "ingest",
    page: "/data",
    roleId: grant.role.id,
    roleLabel: grant.role.name,
    summary: `Master deck intake — "${deckName}" (${verified.length} ${verified.length === 1 ? "part" : "parts"})`,
    status: "queued",
    detail: {
      action: "master_deck_intake",
      format: kind,
      parts: String(verified.length),
      bytes: String(verified.reduce((acc, p) => acc + p.bytes, 0)),
    },
  });
  void runDeckPipeline(job.id).catch((err) => {
    req.log.error({ err, jobId: job.id }, "master-decks: pipeline crashed outside its handler");
  });
  res.json(CreateMasterDeckJobResponse.parse(toJobDto(job)));
});

router.get("/data/master-decks/jobs", (_req, res) => {
  res.json(
    ListMasterDeckJobsResponse.parse({ jobs: listDeckJobs().map(toSummaryDto) }),
  );
});

router.get("/data/master-decks/job", (req, res) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const job = id ? getDeckJob(id) : undefined;
  if (!job) {
    res.status(404).json({ error: "Unknown extraction job.", code: "unknown_job" });
    return;
  }
  res.json(GetMasterDeckJobResponse.parse(toJobDto(job)));
});

// ---- Proposal review ---------------------------------------------------------

router.post("/data/master-decks/proposals/approve", (req, res) => {
  const parsed = ApproveMasterDeckProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireDeckAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  const job = getDeckJob(parsed.data.jobId);
  if (!job) {
    res.status(404).json({ error: "Unknown extraction job.", code: "unknown_job" });
    return;
  }
  const family = job.families.find((f) => f.id === parsed.data.familyId);
  if (!family) {
    res.status(404).json({ error: "Unknown layout family.", code: "unknown_family" });
    return;
  }
  if (family.status !== "pending") {
    res.status(400).json({
      error: `This proposal was already ${family.status}.`,
      code: "already_decided",
    });
    return;
  }
  try {
    const spec = {
      ...family.proposal,
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.purpose ? { purpose: parsed.data.purpose } : {}),
    };
    const rec = approveExtractedLayout({
      spec,
      sourceJobId: job.id,
      approvedBy: grant.role.name,
    });
    const updated = updateDeckJob(job.id, (j) => {
      const f = j.families.find((x) => x.id === family.id);
      if (!f) return;
      f.status = "approved";
      f.decidedBy = grant.role.name;
      f.decidedAt = new Date().toISOString();
      f.layoutId = rec.spec.id;
    });
    req.log.info({ jobId: job.id, layoutId: rec.spec.id }, "master-decks: proposal approved");
    observe(req, {
      kind: "config_change",
      page: "/data",
      roleId: grant.role.id,
      roleLabel: grant.role.name,
      summary: `Approved extracted layout "${rec.spec.name}"`,
      status: "applied",
      detail: {
        change: "extracted_layout_approved",
        layout: rec.spec.id,
        job: job.deckName,
        slots: String(rec.spec.slots.length),
      },
    });
    res.json(
      ApproveMasterDeckProposalResponse.parse({
        job: toJobDto(updated),
        layoutId: rec.spec.id,
      }),
    );
  } catch (err) {
    if (!sendKnownError(res, err)) {
      req.log.error({ err }, "master-decks: approve failed");
      res.status(500).json({ error: "Failed to approve the proposal." });
    }
  }
});

router.post("/data/master-decks/proposals/reject", (req, res) => {
  const parsed = RejectMasterDeckProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireDeckAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  const job = getDeckJob(parsed.data.jobId);
  const family = job?.families.find((f) => f.id === parsed.data.familyId);
  if (!job || !family) {
    res.status(404).json({ error: "Unknown layout family.", code: "unknown_family" });
    return;
  }
  if (family.status !== "pending") {
    res.status(400).json({
      error: `This proposal was already ${family.status}.`,
      code: "already_decided",
    });
    return;
  }
  try {
    const updated = updateDeckJob(job.id, (j) => {
      const f = j.families.find((x) => x.id === family.id);
      if (!f) return;
      f.status = "rejected";
      f.decidedBy = grant.role.name;
      f.decidedAt = new Date().toISOString();
      f.rejectReason = parsed.data.reason;
    });
    observe(req, {
      kind: "config_change",
      page: "/data",
      roleId: grant.role.id,
      roleLabel: grant.role.name,
      summary: `Rejected proposed layout "${family.proposal.name}"`,
      status: "applied",
      detail: {
        change: "extracted_layout_rejected",
        job: job.deckName,
        reason: parsed.data.reason,
      },
    });
    res.json(RejectMasterDeckProposalResponse.parse(toJobDto(updated)));
  } catch (err) {
    if (!sendKnownError(res, err)) {
      req.log.error({ err }, "master-decks: reject failed");
      res.status(500).json({ error: "Failed to reject the proposal." });
    }
  }
});

// ---- Image harvest ------------------------------------------------------------

router.post("/data/master-decks/harvest/confirm", (req, res) => {
  const parsed = ConfirmMasterDeckHarvestItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireDeckAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  const job = getDeckJob(parsed.data.jobId);
  const item = job?.harvest.find((h) => h.id === parsed.data.itemId);
  if (!job || !item) {
    res.status(404).json({ error: "Unknown harvested image.", code: "unknown_item" });
    return;
  }
  if (item.status !== "pending") {
    res.status(400).json({
      error: `This image was already ${item.status === "added" ? "added to the library" : "dismissed"}.`,
      code: "already_decided",
    });
    return;
  }
  const objectPath = job.assets[item.key];
  if (!objectPath) {
    res.status(400).json({
      error: "The harvested image bytes are no longer available.",
      code: "asset_missing",
    });
    return;
  }
  try {
    const image = registerBrandImage({
      objectPath,
      filename: item.filename,
      contentType: item.contentType,
      width: item.width,
      height: item.height,
      label: parsed.data.label,
      tags: parsed.data.tags,
      uploadedBy: grant.role.name,
    });
    const updated = updateDeckJob(job.id, (j) => {
      const h = j.harvest.find((x) => x.id === item.id);
      if (!h) return;
      h.status = "added";
      h.imageId = image.id;
    });
    observe(req, {
      kind: "config_change",
      page: "/data",
      roleId: grant.role.id,
      roleLabel: grant.role.name,
      summary: `Added harvested deck image "${image.label}" to the brand library`,
      status: "applied",
      detail: {
        change: "brand_image_added",
        image: image.label,
        tags: image.tags.join(", "),
        source: `master deck "${job.deckName}", slide ${item.sourceSlide}`,
      },
    });
    res.json(
      ConfirmMasterDeckHarvestItemResponse.parse({ job: toJobDto(updated), image }),
    );
  } catch (err) {
    if (!sendKnownError(res, err)) {
      req.log.error({ err }, "master-decks: harvest confirm failed");
      res.status(500).json({ error: "Failed to add the image to the library." });
    }
  }
});

router.post("/data/master-decks/harvest/dismiss", (req, res) => {
  const parsed = DismissMasterDeckHarvestItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireDeckAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  const job = getDeckJob(parsed.data.jobId);
  const item = job?.harvest.find((h) => h.id === parsed.data.itemId);
  if (!job || !item) {
    res.status(404).json({ error: "Unknown harvested image.", code: "unknown_item" });
    return;
  }
  if (item.status !== "pending") {
    res.status(400).json({
      error: "This image was already decided.",
      code: "already_decided",
    });
    return;
  }
  const updated = updateDeckJob(job.id, (j) => {
    const h = j.harvest.find((x) => x.id === item.id);
    if (h) h.status = "dismissed";
  });
  res.json(DismissMasterDeckHarvestItemResponse.parse(toJobDto(updated)));
});

router.post("/data/master-decks/harvest/bulk", (req, res) => {
  const parsed = BulkMasterDeckHarvestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireDeckAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  const job = getDeckJob(parsed.data.jobId);
  if (!job) {
    res.status(404).json({ error: "Unknown extraction job.", code: "unknown_job" });
    return;
  }
  const pending = job.harvest.filter((h) => h.status === "pending");
  if (pending.length === 0) {
    res.status(400).json({
      error: "There are no pending images left in this job.",
      code: "nothing_pending",
    });
    return;
  }
  const { action } = parsed.data;
  let processed = 0;
  let skipped = 0;
  try {
    const updated = updateDeckJob(job.id, (j) => {
      for (const h of j.harvest) {
        if (h.status !== "pending") continue;
        if (action === "dismiss") {
          h.status = "dismissed";
          processed += 1;
          continue;
        }
        const objectPath = j.assets[h.key];
        if (!objectPath) {
          skipped += 1;
          continue;
        }
        try {
          const image = registerBrandImage({
            objectPath,
            filename: h.filename,
            contentType: h.contentType,
            width: h.width,
            height: h.height,
            label: h.suggestedLabel,
            tags: h.suggestedTags,
            uploadedBy: grant.role.name,
          });
          h.status = "added";
          h.imageId = image.id;
          processed += 1;
        } catch (err) {
          req.log.warn(
            { err, jobId: j.id, itemId: h.id },
            "master-decks: bulk harvest item failed",
          );
          skipped += 1;
        }
      }
    });
    req.log.info(
      { jobId: job.id, action, processed, skipped },
      "master-decks: bulk harvest applied",
    );
    observe(req, {
      kind: "config_change",
      page: "/data",
      roleId: grant.role.id,
      roleLabel: grant.role.name,
      summary:
        action === "confirm"
          ? `Added ${processed} harvested deck images to the brand library`
          : `Dismissed ${processed} harvested deck images`,
      status: "applied",
      detail: {
        change: action === "confirm" ? "brand_images_added_bulk" : "harvest_dismissed_bulk",
        source: `master deck "${job.deckName}"`,
        processed: String(processed),
        skipped: String(skipped),
      },
    });
    res.json(
      BulkMasterDeckHarvestResponse.parse({ job: toJobDto(updated), processed, skipped }),
    );
  } catch (err) {
    if (!sendKnownError(res, err)) {
      req.log.error({ err }, "master-decks: bulk harvest failed");
      res.status(500).json({ error: "Failed to apply the bulk decision." });
    }
  }
});

// ---- Assets & guide -------------------------------------------------------------

router.get("/data/master-decks/asset", async (req, res) => {
  const jobId = typeof req.query.jobId === "string" ? req.query.jobId : "";
  const key = typeof req.query.key === "string" ? req.query.key : "";
  const job = jobId ? getDeckJob(jobId) : undefined;
  const objectPath = job?.assets[key];
  if (!job || !objectPath) {
    res.status(404).json({ error: "Unknown asset." });
    return;
  }
  const bytes = await fetchObjectBytes(objectPath);
  if (!bytes) {
    res.status(404).json({ error: "Asset bytes are no longer available." });
    return;
  }
  const isJpeg = key.endsWith(".jpg") || key.endsWith(".jpeg");
  res.setHeader("Content-Type", isJpeg ? "image/jpeg" : "image/png");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(bytes);
});

router.get("/data/master-decks/guide", async (req, res) => {
  try {
    const pdf = await slimmingGuidePdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="master-deck-slimming-guide.pdf"',
    );
    res.send(pdf);
  } catch (err) {
    req.log.error({ err }, "master-decks: guide render failed");
    res.status(500).json({ error: "Failed to render the guide." });
  }
});

export default router;
