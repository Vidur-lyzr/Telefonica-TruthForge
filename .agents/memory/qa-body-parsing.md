---
name: Q&A body parsing tolerance
description: Parsers of model-shaped Q&A text must tolerate missing "A:" prefixes; silent fallbacks hide governance features.
---

The Q&A section of a press draft is stored as plain text and parsed into
question/answer pairs by twin parsers (server agent + client editor page).

**Rule:** any parser of model-formatted text with a silent fallback must be
tested against the model's actual output shapes, not just the canonical one.
Claude frequently emits `**Q: question?**` followed directly by answer prose
with no `A:` prefix. A parser that requires an explicit `A:` line returns zero
pairs, the canonicalization step silently skips, and everything downstream
(per-answer provenance, internal-note attachment/stripping, structured export
blocks) quietly degrades to raw-text rendering — no error anywhere.

**Why:** this exact failure shipped invisibly: guardian passed, exports
returned 200, but Q&A exports had no provenance and internal notes never
appeared. It was only caught by asserting on the *content* of a live export.

**How to apply:** when a governed feature depends on parsing model output,
either canonicalize at compose time and assert pairs > 0 for Q&A-format
drafts, or keep the parser tolerant (question "looks complete" → next
non-marker line starts the answer). Keep the server and client parser copies
byte-identical. Related: section HEADINGS can carry citation markers too
(press headline) — any marker scan/renumber pass must include headings, then
strip markers from display text while folding ids into citationIds.
