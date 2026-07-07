---
name: api-server restart required for new routes
description: Why new API routes 404 even when typecheck passes and workflows are "running".
---

The api-server dev workflow runs `build && start` (a one-shot build, NOT a watcher). New or changed backend routes do NOT hot-reload.

**Symptom:** a newly added endpoint returns 404 while old endpoints still 200, typecheck passes, and the workflow shows as running. Easy to misread as a routing/path-mismatch bug.

**Fix:** restart the workflow. The correct workflow name is the full id form `artifacts/api-server: API Server` (not just "API Server" — the short name fails with RUN_COMMAND_NOT_FOUND).

**Why it matters:** frontend (hub-ssot) uses Vite HMR and auto-reloads, so the two halves drift — the UI has the new client but the server is stale until restarted.
