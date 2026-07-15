---
name: Qdrant seed parity
description: Index staleness after corpus expansion is silent; verify point count vs corpus chunk count, and keep all agents on the governed front door.
---

Two failure modes found in a "prove the RAG is real" audit:

1. **Silent index staleness.** The Qdrant collection had been seeded before the corpus was expanded (218 points vs 1,279 corpus chunks). Retrieval kept working — over 17% of the knowledge base — with no error anywhere. 
   **Why:** upserts are idempotent and queries succeed regardless of coverage, so nothing fails when the index lags the corpus.
   **How to apply:** after any corpus change, re-run the seeder and verify exact parity: Qdrant `points_count` must equal in-memory total chunk count (seed chunks + live-ingested). Per-category and per-clearance Qdrant `count` calls should reconcile against the corpus breakdown.

2. **Engine drift across surfaces.** New agent surfaces (Generate, canvas editor, model-exposed retrieve tools) had been written against the native `retrieve()` while only Ask used `retrieveGoverned()` (Qdrant). The audit log's per-event `engine` field is the cheap detector: grep recent entries for `engine: "native"` while Qdrant is configured.
   **How to apply:** agents must only call `retrieveGoverned`; the native engine is reserved for the unconfigured-Qdrant dev fallback inside the adapter.
