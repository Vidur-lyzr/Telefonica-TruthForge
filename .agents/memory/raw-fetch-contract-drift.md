---
name: Raw fetch call sites drift from the contract
description: Multipart/raw fetch() call sites bypass Orval typecheck; audit them whenever a guarded endpoint gains a required param.
---

Rule: whenever a server route gains a new required input (e.g. a required `roleId` for a capability guard), typecheck only catches call sites that go through the generated Orval hooks. Any raw `fetch()` call site — especially multipart FormData uploads, which cannot use the generated client — silently keeps sending the old shape and breaks at runtime for every persona.

**Why:** the roles/access rebuild added `requireCapability(..., "ingest_documents", ...)` to the upload route; the upload drawer builds FormData by hand and never sent `roleId`, so manual upload 400'd for everyone. Full typecheck passed. Only an architect review + live curl caught it.

**How to apply:** after adding required params to any endpoint, grep the frontend for `fetch(` (and `EventSource(`/SSE URLs) that hit that route and update them by hand; verify with a live curl of the exact shape the UI sends. Also: capability gating must cover EVERY module route group — the wiki routes were missed because they had their own local subject resolver; when adding a cross-cutting guard, grep all `routes/*.ts` for handlers that resolve a persona without calling the shared guard.
