---
name: Guardian template disclaimers on compose paths
description: Every path that composes a GeneratedDraft must attach template-required disclaimers, or the draft is permanently unapprovable.
---

Rule: any code path that builds a `GeneratedDraft` (not just the main Generate engine) must attach the template-required disclaimers at compose time — resolve `getTemplate(draft.shape)?.requiredDisclaimerIds` and map them to `{id, name, text}`.

**Why:** the Brand Guardian resolves the template by `draft.shape` and hard-blocks approval when a required disclaimer is missing. A side compose path (the scheduled planning forecast) hardcoded `disclaimers: []`, so every scheduled forecast landed in the review folder permanently unapprovable: guardian block → approve 409 → version/export 409. Nothing surfaced the cause until the approve attempt.

**How to apply:** when adding a new draft-producing feature, mirror the Generate engine's disclaimer attachment; use a single shared `shape` const for the template lookup and the draft's `shape`/`params.shape` fields so they cannot drift. The guardian must stay a pure checker — never make it self-heal missing disclaimers. Note: `hashDraftContent` does not cover disclaimers, so lineage hashes survive disclaimer backfills; stripping is still blocked because approve and export re-run the guardian server-side.
