---
name: Chaptered visual-deck composition
description: Lessons from multi-pass long-deck generation (outline → per-chapter retrieval/batches → frame assembly) and chapter-scoped refine
---

# Chaptered deck composition

- Long visual decks compose in passes: outline pass plans chapters, each chapter gets its own governed retrieval (coverage-gated, fail-closed on rank) and its own model batch; a deterministic frame (cover, agenda when >=3 chapters, section dividers, closing) is assembled outside the model.
- **Why:** a single model call cannot ground 40-60 slides; per-chapter retrieval keeps governance filters and coverage gating meaningful, and keeping the frame deterministic prevents hallucinated structure and keeps agenda/dividers in sync with actual chapters.
- **How to apply:** citation numbering must continue across chapters (S-numbers appended per chapter, then renumbered contiguously). Chapter-scoped refine must splice ONLY the target chapter's slide range back into the deck and leave the frame + other chapters byte-identical — verify by diffing slide JSON signatures. Report honest shrink via a deck report note; quota errors inside a chapter loop must re-throw, not degrade silently.
- Job progress is a plain server-composed string ("Chapter i of N — title") surfaced raw in the UI under the current pipeline step; no client-side formatting or enum.
