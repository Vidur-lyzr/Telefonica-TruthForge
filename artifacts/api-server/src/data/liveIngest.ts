// Turns reviewer-accepted live public mentions into governed B-category
// corpus documents. Each accepted candidate becomes one document with full
// provenance metadata (source format, connector, frequency) and the
// ingest-filter lineage that let it through the pre-ingest gate, plus a
// single chunk that is embedded once and upserted to the vector index.

import { DOCS, type CorpusDoc, type IngestSentiment } from "./corpus";
import { registerDocInIndex } from "../adapters/kb";
import {
  isQdrantConfigured,
  ensureLiveFieldIndex,
  scrollLivePayloads,
} from "../adapters/qdrant";
import type { LiveCandidate, LiveIngestFilter } from "../adapters/perplexity";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function currentQuarter(): string {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
}

export interface CreatedLiveDoc {
  doc: CorpusDoc;
  chunkIds: string[];
}

export function createLiveDocs(
  accepted: LiveCandidate[],
  filter: LiveIngestFilter,
): CreatedLiveDoc[] {
  const created: CreatedLiveDoc[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const c of accepted) {
    const base = `doc-live-${slugify(c.title)}`;
    let id = base;
    let n = 2;
    while (DOCS.some((d) => d.id === id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    const chunkId = `${id}-c1`;
    const doc: CorpusDoc = {
      id,
      category: "B",
      title: c.title,
      country: "Group",
      brand: "Telefónica",
      entity: c.source,
      quarter: currentQuarter(),
      type: "Press coverage",
      confidentiality: "public",
      owner: "Media monitoring",
      validity: "approved",
      validUntil: null,
      language: "en",
      topics: c.matchedTerms.map((t) => t.toLowerCase()),
      axisIds: [],
      areas: [],
      sourceFormat: "Web article",
      connector: "Perplexity live capture",
      frequency: "near-real-time",
      ingestFilter: {
        keywords: filter.keywords,
        competitors: filter.competitors,
        executives: filter.executives,
        topics: filter.topics,
        sentiment: c.sentiment as IngestSentiment,
      },
      summary: `${c.source}${c.date ? ` (${c.date})` : ""} — ${c.excerpt.slice(0, 200)}${c.excerpt.length > 200 ? "…" : ""} Captured live on ${today} via the pre-ingest filter.`,
      chunks: [
        {
          id: chunkId,
          heading: c.title,
          breadcrumb: `${c.source} > Live capture`,
          text: `${c.excerpt}${c.url ? ` Source: ${c.url}` : ""}`,
        },
      ],
    };
    DOCS.push(doc);
    registerDocInIndex(doc);
    created.push({ doc, chunkIds: [chunkId] });
  }
  return created;
}
interface HydrateLogger {
  info: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

// On boot, rebuild live-ingested docs from the persistent Qdrant payloads so
// a restart never orphans indexed points: the in-memory corpus and the vector
// index stay consistent, and previously ingested B docs remain citable.
export async function hydrateLiveDocs(log: HydrateLogger): Promise<void> {
  if (!isQdrantConfigured()) return;
  try {
    await ensureLiveFieldIndex();
    const payloads = await scrollLivePayloads();
    const byDocId = new Map<string, CorpusDoc>();
    for (const p of payloads) {
      const raw = p.liveDoc;
      if (typeof raw !== "object" || raw === null) continue;
      const doc = raw as CorpusDoc;
      if (typeof doc.id !== "string" || !doc.id.startsWith("doc-live-")) continue;
      if (!Array.isArray(doc.chunks) || doc.chunks.length === 0) continue;
      byDocId.set(doc.id, doc);
    }
    let restored = 0;
    for (const doc of byDocId.values()) {
      if (DOCS.some((d) => d.id === doc.id)) continue;
      DOCS.push(doc);
      registerDocInIndex(doc);
      restored += 1;
    }
    if (restored > 0) {
      log.info({ restored }, "live ingest: restored live documents from Qdrant payloads");
    }
  } catch (err) {
    log.error({ err }, "live ingest: hydration from Qdrant failed — live docs from previous sessions are unavailable until re-ingested");
  }
}
