---
name: Ask language control
description: How answer-language selection works without touching governance, and the casing boundary between UI and API language codes.
---

Rule: the Ask `lang` parameter must stay presentation-only — one instruction
sentence in the compose prompts plus a deterministic localized REFUSAL_COPY
lookup. Refusal statuses are decided before any model call and never gain
content from localization.

**Why:** localizing refusals via the model would require sending blocked
context to it, breaking the "no snippet ever reaches the model on a block"
invariant.

**How to apply:** any new user-facing deterministic string (refusals, notes)
gets a 4-language copy map with `en` fallback, never a model call. Watch the
casing boundary: global UI lang codes are uppercase (`"ES"|"EN"|"DE"|"PT"`),
API and per-page copy keys are lowercase — always convert at the boundary
(`apiLang()` / `.toLowerCase()`), never mix.
