---
name: API server is build-once, not watch
description: The api-server dev workflow compiles then serves the built output; source/data edits do not hot-reload.
---

# API server does not hot-reload

The `api-server` dev workflow builds the TypeScript and then runs the built
output. Unlike the Vite web artifact (HMR), editing server code or the in-memory
corpus/seed data has **no effect until the workflow is restarted**.

**Why:** debugging wasted time — curl kept returning pre-edit behaviour (new
corpus docs looked "missing", triggering false no_evidence) because the running
process still served the previous build.

**How to apply:** after any edit under `artifacts/api-server/src` (routes, agent,
adapters, `data/corpus.ts`), restart the workflow named exactly
`artifacts/api-server: API Server` before verifying with
`curl localhost:80/api/...`. The web artifact does hot-reload; the API does not.
