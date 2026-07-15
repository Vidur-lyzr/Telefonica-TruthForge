---
name: Manual upload ingestion
description: Constraints on runtime-uploaded docs entering the governed corpus and vector index
---

Runtime-uploaded documents (Data Center manual upload) join the corpus while the server is running, which crosses two boot-time assumptions:

- **Hydration prefix:** only Qdrant points whose doc id starts with `doc-live-` (with `live: true` + full `liveDoc` payload) are rehydrated into the in-memory corpus on boot. Any new runtime-ingest path must mint ids under that prefix or its docs silently vanish on restart.
- **Sparse BM25 df gap:** the sparse document-frequency table is built once at boot from the seed corpus, so terms unique to runtime-uploaded docs are absent from the sparse side. Dense retrieval covers them (verified: Ask cites uploads immediately), but sparse-only matching on their vocabulary will underperform. Accepted limitation; if it ever matters, rebuild df on ingest.

**Why:** both failure modes are silent — no error, the doc just stops being found (after restart, or via sparse-heavy queries).
**How to apply:** any new endpoint that adds documents at runtime (uploads, connectors, live capture) must upsert with the `doc-live-` prefix/payload contract and be tested across a server restart.
