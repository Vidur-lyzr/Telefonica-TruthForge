---
name: OpenAPI path vs server route mismatch → silent empty UI
description: A generated-client URL is driven by the OpenAPI *path*, not the operationId; a path/route mismatch 404s silently and yields undefined data.
---

Symptom that is easy to misread as a timing/render bug: a list/table renders empty in the UI, but hitting the endpoint with `curl` returns 200 with real data, and there is NO JS error in the browser console.

**Why:** Orval generates each fetch URL from the OpenAPI **path**, not the operationId. If the spec's path for an operation differs from the Express route the server actually mounts, the generated client requests a URL the server does not serve → 404 → the React Query hook's `data` stays `undefined` → `data?.map(...)` renders nothing. `curl` against the *correct* server path still works, which is misleading. Sibling endpoints that happen to have matching paths (e.g. stats, detail-by-id) render fine, making the failure look data-specific.

**How to apply:** When one query renders empty but its curl works, check the generated client's URL (e.g. `getXxxUrl()` in the generated api file) against the server route — do not just curl the server path. Fix by aligning the OpenAPI path to the server route (or vice-versa) and re-running codegen. Prefer changing the spec to match an already-working, RESTfully-consistent server route (collection `/documents` alongside item `/documents/{id}`) so no backend change is needed. operationIds unchanged means `lib/api-zod` needs no regen.
