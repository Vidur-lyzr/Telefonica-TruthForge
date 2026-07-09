---
name: Live-ingest persistence and integrity
description: How live-captured docs stay consistent across restarts and why accept must bind to server-issued candidates.
---

- **Rule 1:** any doc ingested at runtime into the in-memory corpus must also be durable in Qdrant: store the full doc JSON in the point payload (`live: true`, `liveDoc`) and hydrate DOCS + the kb chunk registry from a payload scroll at boot. Otherwise a restart orphans the points and fail-closed retrieval silently drops them (no citations, no answer).
- **Rule 2:** ingestion accept endpoints must take server-issued candidate ids only, resolved against a TTL'd server-side cache of the last search results — never client-supplied content — or arbitrary text can be injected past the pre-ingest filter gate.
- **Rule 3:** governance mutations that mirror to Qdrant must update Qdrant FIRST with the would-be next version, and only then commit the local taxonomy version, so an index failure cannot create split-brain state.
- **Why:** all three were architect-review failures on the first pass of the Qdrant live-capture work.
- **How to apply:** any future runtime-ingestion channel or index-mirroring mutation in this app must follow the same hydrate-at-boot, server-authoritative-accept, index-first-commit pattern.
