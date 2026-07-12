// Seed the Qdrant collection from the governed corpus.
//
// Embeds every chunk ONCE (dense via Qdrant Cloud Inference, sparse via the
// deterministic multilingual BM25 encoder) and upserts with the full two-layer
// taxonomy payload. Point ids are stable hashes of chunk ids, so re-running
// upserts in place — idempotent. Taxonomy re-tagging never touches this
// script: it is a `set_payload` operation at runtime.

import { DOCS } from "../data/corpus";
// Side-effect import: replays previously applied source-sync deltas onto DOCS
// at module init, so a reseed writes post-delta governance labels, never the
// original seed labels.
import "../data/sourceSync";
import { currentTaxonomyVersion } from "../data/governance";
import {
  ensureCollection,
  upsertChunks,
  collectionStatus,
  isQdrantConfigured,
  type UpsertChunk,
} from "../adapters/qdrant";

const BATCH = 32;

async function main() {
  if (!isQdrantConfigured()) {
    throw new Error("QDRANT_URL / QDRANT_API_KEY are not configured");
  }
  await ensureCollection();
  const version = currentTaxonomyVersion();

  const all: UpsertChunk[] = [];
  for (const doc of DOCS) {
    for (const chunk of doc.chunks) {
      all.push({
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
        },
      });
    }
  }

  process.stdout.write(`Seeding ${all.length} chunks from ${DOCS.length} docs (taxonomy v${version})\n`);
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    await upsertChunks(batch);
    process.stdout.write(`  upserted ${Math.min(i + BATCH, all.length)}/${all.length}\n`);
  }
  const status = await collectionStatus();
  process.stdout.write(`Done. Collection has ${status.pointsCount} points (status: ${status.status}).\n`);
}

main().catch((err) => {
  process.stderr.write(`Seed failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
