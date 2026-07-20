---
name: Metering chokepoint coverage
description: Quota/attribution gates must cover every model-call path, including agent-runtime paths that estimate tokens.
---

Per-user quota gating and usage attribution live in the metered Anthropic wrappers, but not every model call goes through them: agent-runtime paths (gitagent) call the model internally and record only an estimated global usage figure afterwards.

**Why:** A quota of 0 still produced answered responses because the primary Ask path ran via the agent runtime, bypassing the pre-model gate — and the estimated usage went to the global meter only, never the user ledger. AsyncLocalStorage was fine; the chokepoint just wasn't on that path.

**How to apply:** When adding any per-call gate (quota, governance, attribution), grep for ALL model entry points — metered wrappers AND `runAgent`/direct `recordUsage` callers — and gate each explicitly. In degradation `catch` blocks, re-throw quota errors before falling back to a direct model call, or the refusal silently turns into a second model attempt.
