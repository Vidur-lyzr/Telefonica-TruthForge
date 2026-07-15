import { Router, type IRouter } from "express";
import multer from "multer";
import {
  ListDataSourcesResponse,
  GetIngestionSnapshotResponse,
  GetRelevanceFilterResponse,
  ListValidationItemsResponse,
  ListDocumentFreshnessResponse,
  LiveIngestSearchBody,
  LiveIngestSearchResponse,
  LiveIngestAcceptBody,
  LiveIngestAcceptResponse,
  ManualUploadResponse,
} from "@workspace/api-zod";
import {
  DATA_SOURCES,
  INGESTION_SNAPSHOT,
  RELEVANCE_FILTER,
  VALIDATION_ITEMS,
  DOC_FRESHNESS,
} from "../data/dataCenter";
import {
  isPerplexityConfigured,
  perplexitySearch,
  type LiveCandidate,
  type LiveIngestFilter,
} from "../adapters/perplexity";
import { createLiveDocs } from "../data/liveIngest";
import {
  extractUploadText,
  buildUploadDoc,
  UploadError,
} from "../data/manualUpload";
import { DOCS, AXES, type Area, type Clearance } from "../data/corpus";
import { registerDocInIndex } from "../adapters/kb";
import {
  isQdrantConfigured,
  upsertChunks,
  collectionStatus,
  type UpsertChunk,
} from "../adapters/qdrant";
import { currentTaxonomyVersion } from "../data/governance";
import { requireCapability } from "../data/accessControl";

const router: IRouter = Router();

// Server-issued candidate cache: accept only references candidates the server
// itself returned from a filtered search, so arbitrary client-supplied text
// can never be injected past the pre-ingest gate. Entries expire after 30 min.
const CANDIDATE_TTL_MS = 30 * 60 * 1000;
const candidateCache = new Map<
  string,
  { candidate: LiveCandidate; filter: LiveIngestFilter; expiresAt: number }
>();

function cacheCandidates(items: LiveCandidate[], filter: LiveIngestFilter): void {
  const now = Date.now();
  for (const [id, entry] of candidateCache) {
    if (entry.expiresAt < now) candidateCache.delete(id);
  }
  const expiresAt = now + CANDIDATE_TTL_MS;
  for (const candidate of items) {
    candidateCache.set(candidate.id, { candidate, filter, expiresAt });
  }
}

router.get("/data/sources", (_req, res) => {
  res.json(ListDataSourcesResponse.parse(DATA_SOURCES));
});

router.get("/data/ingestion", (_req, res) => {
  res.json(GetIngestionSnapshotResponse.parse(INGESTION_SNAPSHOT));
});

router.get("/data/relevance-filter", (_req, res) => {
  res.json(GetRelevanceFilterResponse.parse(RELEVANCE_FILTER));
});

router.get("/data/validation", (_req, res) => {
  res.json(ListValidationItemsResponse.parse(VALIDATION_ITEMS));
});

router.get("/data/freshness", (_req, res) => {
  res.json(ListDocumentFreshnessResponse.parse(DOC_FRESHNESS));
});

router.post("/data/ingest/search", async (req, res) => {
  const parsed = LiveIngestSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireCapability(req, res, "ingest_documents", "partial", parsed.data.roleId)) {
    return;
  }
  if (!isPerplexityConfigured()) {
    res.status(503).json({
      error: "Live capture is not configured.",
      code: "live_capture_unconfigured",
    });
    return;
  }
  const { filter } = parsed.data;
  const termCount =
    filter.keywords.length +
    filter.competitors.length +
    filter.executives.length +
    filter.topics.length;
  if (termCount === 0) {
    res.status(400).json({
      error: "The pre-ingest filter needs at least one term — nothing is captured without a rule.",
      code: "empty_ingest_filter",
    });
    return;
  }
  try {
    const items = await perplexitySearch(filter);
    cacheCandidates(items, filter);
    req.log.info({ termCount, found: items.length }, "live ingest: search completed");
    res.json(LiveIngestSearchResponse.parse({ items, filter }));
  } catch (err) {
    req.log.error({ err }, "live ingest: search failed");
    res.status(502).json({ error: "The live capture search could not be completed." });
  }
});

router.post("/data/ingest/accept", async (req, res) => {
  const parsed = LiveIngestAcceptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  // Partial (editor) may accept: live-captured mentions are public external
  // material, not area-scoped internal documents. The editor's area bound is
  // enforced where area is author-chosen — the manual upload path.
  if (!requireCapability(req, res, "ingest_documents", "partial", parsed.data.roleId)) {
    return;
  }
  const now = Date.now();
  const entries: { candidate: LiveCandidate; filter: LiveIngestFilter }[] = [];
  const unknown: string[] = [];
  for (const id of parsed.data.acceptedIds) {
    const entry = candidateCache.get(id);
    if (!entry || entry.expiresAt < now) {
      unknown.push(id);
    } else {
      entries.push({ candidate: entry.candidate, filter: entry.filter });
    }
  }
  if (unknown.length > 0) {
    res.status(409).json({
      error:
        "Some selected mentions are no longer available for ingestion — run the capture search again and re-select.",
      code: "unknown_candidates",
      details: unknown,
    });
    return;
  }
  try {
    const before = isQdrantConfigured() ? await collectionStatus() : null;
    const filter = entries[0].filter;
    const created = createLiveDocs(
      entries.map(({ candidate }) => candidate),
      filter,
    );
    for (const { candidate } of entries) candidateCache.delete(candidate.id);

    let upserted = 0;
    if (isQdrantConfigured()) {
      const version = currentTaxonomyVersion();
      const chunks: UpsertChunk[] = created.flatMap(({ doc }) =>
        doc.chunks.map((chunk) => ({
          chunkId: chunk.id,
          embedText: `${doc.title} — ${chunk.heading}. ${chunk.text} ${doc.topics.join(" ")}`,
          payload: {
            chunkId: chunk.id,
            docId: doc.id,
            category: doc.category,
            confidentiality: doc.confidentiality,
            areas: doc.areas ?? [],
            country: doc.country,
            brand: doc.brand,
            quarter: doc.quarter,
            type: doc.type,
            validity: doc.validity,
            axisIds: doc.axisIds,
            topics: doc.topics,
            taxonomyVersion: version,
            live: true,
            liveDoc: doc,
          },
        })),
      );
      await upsertChunks(chunks);
      upserted = chunks.length;
    }
    const after = isQdrantConfigured() ? await collectionStatus() : null;

    req.log.info(
      { createdDocs: created.length, upserted },
      "live ingest: accepted mentions ingested as B documents",
    );
    res.json(
      LiveIngestAcceptResponse.parse({
        createdDocs: created.map(({ doc }) => ({ docId: doc.id, title: doc.title })),
        upsertedChunks: upserted,
        pointsBefore: before?.pointsCount ?? 0,
        pointsAfter: after?.pointsCount ?? 0,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "live ingest: accept failed");
    res.status(500).json({ error: "The accepted mentions could not be ingested." });
  }
});

// ── Manual upload — the real file-intake path ────────────────────────────────

const UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES },
}).single("file");

const UPLOAD_CLEARANCES: Clearance[] = [
  "public",
  "private",
  "confidential",
  "off_the_record",
];
const UPLOAD_AREAS: Area[] = ["Comunicación", "Marca", "Gabinete"];
const UPLOAD_LANGUAGES = ["en", "es", "de", "pt"];

router.post(
  "/data/upload",
  (req, res, next) => {
    uploadMiddleware(req, res, (err: unknown) => {
      if (err) {
        const tooLarge =
          typeof err === "object" &&
          err !== null &&
          (err as { code?: string }).code === "LIMIT_FILE_SIZE";
        res.status(tooLarge ? 413 : 400).json({
          error: tooLarge
            ? "The file is too large — the manual upload limit is 15 MB."
            : "The upload could not be read.",
          code: tooLarge ? "file_too_large" : "bad_upload",
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const file = req.file;
    if (!file || file.buffer.length === 0) {
      res.status(400).json({
        error: "No file was attached — pick a PDF, Word, text or Markdown file.",
        code: "missing_file",
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const str = (key: string): string =>
      typeof body[key] === "string" ? (body[key] as string).trim() : "";

    const title = str("title");
    const owner = str("owner");
    const confidentiality = str("confidentiality") as Clearance;
    const areaRaw = str("area");
    const language = str("language") || "en";

    const grant = requireCapability(req, res, "ingest_documents", "partial", str("roleId"));
    if (!grant) return;
    // Partial (editor): uploads must be scoped to the editor's own area —
    // neither cross-area (blank) nor another domain's shelf.
    if (grant.level === "partial" && grant.role.area && areaRaw !== grant.role.area) {
      res.status(403).json({
        error: `As an editor for ${grant.role.area}, you can only ingest documents scoped to ${grant.role.area}.`,
        code: "capability_blocked",
        capability: "ingest_documents",
        profile: grant.role.profileId,
      });
      return;
    }

    if (!title || !owner) {
      res.status(400).json({
        error: "Title and owner are mandatory — nothing enters the pipeline underspecified.",
        code: "missing_metadata",
      });
      return;
    }
    if (!UPLOAD_CLEARANCES.includes(confidentiality)) {
      res.status(400).json({
        error: "A valid confidentiality tier is mandatory.",
        code: "invalid_confidentiality",
      });
      return;
    }
    if (areaRaw !== "" && !UPLOAD_AREAS.includes(areaRaw as Area)) {
      res.status(400).json({ error: "Unknown area.", code: "invalid_area" });
      return;
    }
    if (!UPLOAD_LANGUAGES.includes(language)) {
      res.status(400).json({ error: "Unknown language.", code: "invalid_language" });
      return;
    }

    const docType = str("docType");
    if (docType.length > 60) {
      res.status(400).json({
        error: "The document type label is too long.",
        code: "invalid_doc_type",
      });
      return;
    }
    const topics = str("topics")
      .split(",")
      .map((t) => t.trim().slice(0, 60))
      .filter((t) => t.length > 0)
      .slice(0, 12);
    const axisIds = [
      ...new Set(
        str("axisIds")
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a.length > 0),
      ),
    ];
    const knownAxisIds = new Set(AXES.filter((a) => !a.retired).map((a) => a.id));
    const unknownAxis = axisIds.find((id) => !knownAxisIds.has(id));
    if (unknownAxis) {
      res.status(400).json({
        error: `Unknown strategic axis "${unknownAxis}".`,
        code: "invalid_axis",
      });
      return;
    }

    try {
      const { text, sourceFormat, structured } = await extractUploadText(
        file.originalname,
        file.buffer,
      );
      if (text.replace(/\s+/g, " ").trim().length < 40) {
        res.status(422).json({
          error:
            "No readable text could be extracted from this file — scanned images without a text layer cannot be ingested.",
          code: "empty_extraction",
        });
        return;
      }

      const { doc, chunks } = buildUploadDoc({
        title,
        owner,
        country: str("country") || "Group",
        brand: str("brand") || "Telefónica",
        confidentiality,
        area: areaRaw === "" ? null : (areaRaw as Area),
        language,
        filename: file.originalname,
        text,
        sourceFormat,
        docType,
        topics,
        axisIds,
        structured,
      });

      // Index FIRST, commit to the corpus after: a failed vector write must
      // never leave a doc that answers now but silently dies on restart.
      const before = isQdrantConfigured() ? await collectionStatus() : null;
      let upserted = 0;
      if (isQdrantConfigured()) {
        const version = currentTaxonomyVersion();
        const points: UpsertChunk[] = chunks.map((chunk) => ({
          chunkId: chunk.id,
          embedText: `${doc.title} — ${chunk.heading}. ${chunk.text} ${doc.topics.join(" ")}`,
          payload: {
            chunkId: chunk.id,
            docId: doc.id,
            category: doc.category,
            confidentiality: doc.confidentiality,
            areas: doc.areas ?? [],
            country: doc.country,
            brand: doc.brand,
            quarter: doc.quarter,
            type: doc.type,
            validity: doc.validity,
            axisIds: doc.axisIds,
            topics: doc.topics,
            taxonomyVersion: version,
            live: true,
            liveDoc: doc,
          },
        }));
        await upsertChunks(points);
        upserted = points.length;
      }
      DOCS.push(doc);
      registerDocInIndex(doc);
      const after = isQdrantConfigured() ? await collectionStatus() : null;

      req.log.info(
        {
          docId: doc.id,
          chunks: chunks.length,
          upserted,
          extractedChars: text.length,
          sourceFormat,
        },
        "manual upload: document ingested",
      );
      res.json(
        ManualUploadResponse.parse({
          docId: doc.id,
          title: doc.title,
          chunkCount: chunks.length,
          upsertedChunks: upserted,
          pointsBefore: before?.pointsCount ?? 0,
          pointsAfter: after?.pointsCount ?? 0,
          extractedChars: text.length,
          sourceFormat,
        }),
      );
    } catch (err) {
      if (err instanceof UploadError) {
        res.status(err.status).json({ error: err.message, code: err.code });
        return;
      }
      req.log.error({ err }, "manual upload: ingestion failed");
      res.status(502).json({
        error: "The document could not be ingested into the knowledge core.",
        code: "upload_ingest_failed",
      });
    }
  },
);

export default router;
