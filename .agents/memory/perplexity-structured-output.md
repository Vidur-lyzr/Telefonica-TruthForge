---
name: Perplexity sonar structured output
description: sonar ignores prose "return only JSON" instructions — enforce response_format json_schema and keep a search_results metadata fallback.
---

**Rule:** When asking Perplexity `sonar` for machine-readable results, never rely on a system-prompt "return ONLY a JSON array" instruction. Enforce the shape with `response_format: { type: "json_schema", json_schema: { schema: {...} } }`, and fall back to the API's top-level `search_results` metadata (title/url/date/snippet) when the model content is still unusable.

**Why:** sonar answers prose questions in markdown with `[1][2]` citation markers even when told to emit only JSON. A "find the first `[` and last `]`" slice-parser then grabs the span between citation markers, `JSON.parse` fails, and the caller silently gets zero results — no error, no log, tool looks like it "found nothing" while it actually ran fine.

**How to apply:** Any Perplexity chat-completions call whose output feeds parsing (web-search tools, ingest filters). Wrap the array in an object property (e.g. `{ results: [...] }`) since json_schema roots want an object; sanitise excerpts before they reach any model context that uses citation markers.
