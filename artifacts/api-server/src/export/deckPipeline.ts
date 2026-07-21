// Master-deck extraction pipeline — orchestration shell. Owns the job status
// machine (parsing → clustering → proposing → ready) and all failure
// handling; the PPTX engine lives in ./deckExtract.
//
// Runs fire-and-forget from the intake route: the caller gets the job id
// immediately and polls. Every transition lands in the job store (and its
// DB snapshot), so the UI always sees the latest honest state.

import { logger } from "../lib/logger";
import { getDeckJob, updateDeckJob, type DeckIntakeJob } from "../data/deckIntakeStore";
import { ObjectStorageService } from "../lib/objectStorage";
import { compileExtractedLayout } from "./extractedLayouts";
import { type ComposeCtx } from "./visualLayouts";
import { DeckExtractionError } from "./deckExtract/errors";
import {
  emptyParsedDeck,
  mergeIntoDeck,
  parsePptxPart,
  type ParsedDeck,
} from "./deckExtract/pptxParse";
import { clusterSlides } from "./deckExtract/cluster";
import { proposeLayout } from "./deckExtract/propose";
import { renderOpsPng, renderWireframePng } from "./deckExtract/opsSvg";
import { collectHarvestCandidates, type HarvestCandidate } from "./deckExtract/harvest";
import { parsePdfPartMedia } from "./deckExtract/pdfHarvest";
import { saveDeckAsset } from "./deckExtract/assets";

export { DeckExtractionError } from "./deckExtract/errors";

const storage = new ObjectStorageService();

/** Families beyond this are not proposed — review fatigue beats completeness. */
const MAX_FAMILIES = 12;

/** Let the event loop breathe between CPU-heavy renders so polls stay live. */
function breathe(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function setProgress(jobId: string, progress: string): void {
  updateDeckJob(jobId, (j) => {
    j.progress = progress;
  });
}

// Placeholder copy for rendered proposal previews — neutral, obviously
// synthetic, and within every slot's own limits.
function buildSampleSlots(
  spec: NonNullable<ReturnType<typeof proposeLayout>>["spec"],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const slot of spec.slots) {
    if (slot.kind === "text") {
      const base =
        slot.key === "title"
          ? "Sample headline for this layout"
          : slot.key === "subtitle"
            ? "Supporting subtitle copy"
            : "Placeholder body copy showing how text sits in this frame.";
      out[slot.key] = base.slice(0, Math.max(8, slot.maxChars)).trim();
    } else if (slot.kind === "bullets") {
      const items = ["First supporting point", "Second supporting point", "Third supporting point"]
        .slice(0, Math.min(3, slot.maxItems))
        .map((s) => s.slice(0, slot.maxCharsPerItem));
      out[slot.key] = items;
    } else {
      out[slot.key] = "placeholder";
    }
  }
  return out;
}

/** Download one uploaded part back from object storage. */
async function downloadPart(
  jobId: string,
  part: DeckIntakeJob["parts"][number],
): Promise<Buffer> {
  try {
    const file = await storage.getObjectEntityFile(part.objectPath);
    const [buf] = await file.download();
    return buf;
  } catch (err) {
    logger.error({ err, jobId, objectPath: part.objectPath }, "deck-pipeline: part download failed");
    throw new DeckExtractionError(
      `The uploaded file "${part.filename}" could not be read back from storage — upload the deck again.`,
    );
  }
}

/** Persist harvest candidates as job assets and build the harvest queue. */
async function saveHarvest(
  jobId: string,
  candidates: HarvestCandidate[],
  assets: Record<string, string>,
): Promise<DeckIntakeJob["harvest"]> {
  const harvest: DeckIntakeJob["harvest"] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    try {
      assets[c.assetKey] = await saveDeckAsset(jobId, c.assetKey, c.bytes, c.contentType);
    } catch (err) {
      logger.error({ err, jobId, key: c.assetKey }, "deck-pipeline: harvest asset save failed");
      continue;
    }
    harvest.push({
      id: `hv-${i + 1}`,
      key: c.assetKey,
      filename: c.filename,
      contentType: c.contentType,
      width: c.width,
      height: c.height,
      bytes: c.bytes.length,
      sourceSlide: c.sourceSlide,
      suggestedLabel: c.suggestedLabel,
      suggestedTags: c.suggestedTags,
      status: "pending",
    });
    if (i % 4 === 3) await breathe();
  }
  return harvest;
}

// PDF fallback: harvest-only. PDFs carry no reusable layout semantics, so no
// families are ever proposed — embedded raster images go straight to the
// harvest queue and the summary says so explicitly.
async function extractPdfDeck(jobId: string): Promise<void> {
  const job = getDeckJob(jobId);
  if (!job) throw new DeckExtractionError("The extraction job no longer exists.");

  const deck = emptyParsedDeck();
  let pageCount = 0;
  for (let i = 0; i < job.parts.length; i++) {
    const part = job.parts[i]!;
    setProgress(
      jobId,
      job.parts.length === 1
        ? "Scanning the PDF for embedded images"
        : `Scanning for images — part ${i + 1} of ${job.parts.length}`,
    );
    const bytes = await downloadPart(jobId, part);
    let result;
    try {
      result = await parsePdfPartMedia(bytes, `p${i + 1}`, pageCount);
    } catch (err) {
      logger.error({ err, jobId, filename: part.filename }, "deck-pipeline: pdf parse failed");
      throw new DeckExtractionError(
        `The file "${part.filename}" could not be read as a PDF — check the file and upload again.`,
      );
    }
    deck.media.push(...result.media);
    pageCount += result.pageCount;
    if (result.notes.length > 0) {
      logger.info({ jobId, notes: result.notes }, "deck-pipeline: pdf harvest notes");
    }
    await breathe();
  }

  if (pageCount === 0) {
    throw new DeckExtractionError("No pages could be read from the uploaded PDF.");
  }
  updateDeckJob(jobId, (j) => {
    j.slideCount = pageCount;
  });

  setProgress(jobId, "Collecting images for the harvest queue");
  const { candidates, notes: harvestNotes } = collectHarvestCandidates(deck, job.deckName);
  const assets: Record<string, string> = {};
  const harvest = await saveHarvest(jobId, candidates, assets);
  if (harvestNotes.length > 0) {
    logger.info({ jobId, notes: harvestNotes }, "deck-pipeline: harvest notes");
  }

  const summaryBits: string[] = [
    `${pageCount} PDF page${pageCount === 1 ? "" : "s"} scanned`,
    `${harvest.length} image${harvest.length === 1 ? "" : "s"} harvested`,
    "layout extraction needs the .pptx master",
  ];
  updateDeckJob(jobId, (j) => {
    j.status = "ready";
    j.progress = summaryBits.join(" · ");
    j.families = [];
    j.harvest = harvest;
    j.assets = assets;
  });
  logger.info(
    { jobId, pages: pageCount, harvest: harvest.length },
    "deck-pipeline: pdf harvest complete",
  );
}

async function extractDeck(jobId: string): Promise<void> {
  const job = getDeckJob(jobId);
  if (!job) throw new DeckExtractionError("The extraction job no longer exists.");

  if (job.kind === "pdf") {
    await extractPdfDeck(jobId);
    return;
  }

  // ---- Parse every part -----------------------------------------------------
  const deck: ParsedDeck = emptyParsedDeck();
  for (let i = 0; i < job.parts.length; i++) {
    const part = job.parts[i]!;
    setProgress(
      jobId,
      job.parts.length === 1
        ? "Reading slides from the uploaded deck"
        : `Reading slides — part ${i + 1} of ${job.parts.length}`,
    );
    const bytes = await downloadPart(jobId, part);
    const parsed = await parsePptxPart(bytes, deck.slides.length, part.filename, `p${i + 1}`);
    mergeIntoDeck(deck, parsed);
    await breathe();
  }

  if (deck.slides.length === 0) {
    throw new DeckExtractionError("No slides could be read from the uploaded parts.");
  }
  updateDeckJob(jobId, (j) => {
    j.slideCount = deck.slides.length;
  });

  // ---- Cluster ---------------------------------------------------------------
  updateDeckJob(jobId, (j) => {
    j.status = "clustering";
    j.progress = `Grouping ${deck.slides.length} slides into layout families`;
  });
  await breathe();
  const clusters = clusterSlides(deck.slides);
  const kept = clusters.slice(0, MAX_FAMILIES);

  // ---- Propose + render -------------------------------------------------------
  updateDeckJob(jobId, (j) => {
    j.status = "proposing";
    j.progress = "Drafting layout proposals";
  });

  const families: DeckIntakeJob["families"] = [];
  const assets: Record<string, string> = {};
  let familyIdx = 0;
  for (const cluster of kept) {
    const proposal = proposeLayout(cluster, job.deckName, familyIdx);
    if (!proposal) {
      logger.info(
        { jobId, slides: cluster.slideIndexes.length, label: cluster.label },
        "deck-pipeline: family skipped (no usable text content)",
      );
      continue;
    }
    setProgress(jobId, `Rendering proposals — family ${familyIdx + 1}`);

    const famId = `fam-${familyIdx + 1}`;
    const thumbKey = `thumb-${famId}.png`;
    const previewKey = `preview-${famId}.png`;

    try {
      const thumbPng = renderWireframePng(cluster.representative);
      assets[thumbKey] = await saveDeckAsset(jobId, thumbKey, thumbPng, "image/png");
    } catch (err) {
      logger.error({ err, jobId, famId }, "deck-pipeline: wireframe render failed");
    }
    await breathe();
    try {
      const def = compileExtractedLayout(proposal.spec);
      const sample = buildSampleSlots(proposal.spec);
      const ctx: ComposeCtx = {
        images: Object.fromEntries(def.imageSlots.map((s) => [s.slot, null])),
        footerLabel: "Brand Room",
        confidentiality: "Internal use",
        generatedAt: new Date().toISOString(),
      };
      const ops = def.compose(def.schema.parse(sample), ctx);
      const previewPng = renderOpsPng(ops);
      assets[previewKey] = await saveDeckAsset(jobId, previewKey, previewPng, "image/png");
    } catch (err) {
      logger.error({ err, jobId, famId }, "deck-pipeline: proposal preview render failed");
    }
    await breathe();

    const globalNotes: string[] = [];
    if (deck.dropped.tables > 0 || deck.dropped.charts > 0) {
      globalNotes.push(
        `${deck.dropped.tables + deck.dropped.charts} table/chart frames in the deck cannot be extracted as layout slots.`,
      );
    }

    families.push({
      id: famId,
      label: cluster.label,
      slideIndexes: cluster.slideIndexes,
      ...(assets[thumbKey] ? { thumbKey } : {}),
      ...(assets[previewKey] ? { previewKey } : {}),
      proposal: proposal.spec,
      confidenceNotes: [...proposal.notes, ...globalNotes].slice(0, 20),
      status: "pending",
    });
    familyIdx += 1;
  }

  if (clusters.length > MAX_FAMILIES) {
    logger.info(
      { jobId, total: clusters.length, kept: MAX_FAMILIES },
      "deck-pipeline: family list truncated",
    );
  }

  // ---- Harvest ---------------------------------------------------------------
  setProgress(jobId, "Collecting images for the harvest queue");
  const { candidates, notes: harvestNotes } = collectHarvestCandidates(deck, job.deckName);
  const harvest = await saveHarvest(jobId, candidates, assets);
  if (harvestNotes.length > 0) {
    logger.info({ jobId, notes: harvestNotes }, "deck-pipeline: harvest notes");
  }

  // ---- Done ------------------------------------------------------------------
  const summaryBits: string[] = [
    `${deck.slides.length} slide${deck.slides.length === 1 ? "" : "s"} analysed`,
    `${families.length} layout famil${families.length === 1 ? "y" : "ies"} proposed`,
    `${harvest.length} image${harvest.length === 1 ? "" : "s"} harvested`,
  ];
  updateDeckJob(jobId, (j) => {
    j.status = "ready";
    j.progress = summaryBits.join(" · ");
    j.families = families;
    j.harvest = harvest;
    j.assets = assets;
  });
  logger.info(
    { jobId, slides: deck.slides.length, families: families.length, harvest: harvest.length },
    "deck-pipeline: extraction complete",
  );
}

export async function runDeckPipeline(jobId: string): Promise<void> {
  const job = getDeckJob(jobId);
  if (!job) {
    logger.error({ jobId }, "deck-pipeline: job vanished before start");
    return;
  }
  try {
    updateDeckJob(jobId, (j) => {
      j.status = "parsing";
      j.progress = "Reading slides from the uploaded parts";
    });
    await extractDeck(jobId);
  } catch (err) {
    const message =
      err instanceof DeckExtractionError
        ? err.message
        : "Extraction failed unexpectedly — see the server log.";
    if (!(err instanceof DeckExtractionError)) {
      logger.error({ err, jobId }, "deck-pipeline: unexpected failure");
    }
    try {
      updateDeckJob(jobId, (j) => {
        j.status = "failed";
        j.error = message;
        j.progress = "Failed";
      });
    } catch (storeErr) {
      logger.error({ err: storeErr, jobId }, "deck-pipeline: failure could not be recorded");
    }
  }
}
