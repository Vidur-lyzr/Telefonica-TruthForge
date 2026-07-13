---
name: Stale generated API client after task merges
description: When an externally merged task changes openapi.yaml, the Orval-generated client may be stale; re-run codegen instead of editing frontend types.
---

Rule: if a leaf artifact typecheck suddenly fails with missing exports from `@workspace/api-client-react` (TS2305/TS2724) or properties missing on generated types (TS2339) in files you did not touch, first check whether `lib/api-spec/openapi.yaml` contains the referenced schema/operation — if it does, run `pnpm --filter @workspace/api-spec run codegen` and re-typecheck.

**Why:** A task-agent merge brought spec changes whose generated output was stale in the main environment; the errors looked like broken frontend code but were fixed entirely by regenerating the client.

**How to apply:** After any external task merge touching the OpenAPI spec, or on unexplained generated-type errors, regenerate before editing code. Codegen needs no follow-up `typecheck:libs`.
