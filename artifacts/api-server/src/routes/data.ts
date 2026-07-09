import { Router, type IRouter } from "express";
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
  isQdrantConfigured,
  upsertChunks,
  collectionStatus,
  type UpsertChunk,
} from "../adapters/qdrant";
import { currentTaxonomyVersion } from "../data/governance";

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

export default router;
