---
name: Q&A internal notes keying
description: How per-answer internal notes stay attached and governed in the Generate Q&A flow.
---

Internal Q&A notes are keyed by the normalized question text, not by section or draft ids.

**Why:** refine regenerates section/draft ids but usually keeps questions, so id-keying would drop every note on refine; question-keying survives it (verified e2e). The tradeoff: rewording a question detaches its note.

**How to apply:**
- The Q&A section body remains the single source of truth (canonical `Q: ...\nA: ...` blocks); the structured editor and export parse the same text so they can never disagree.
- Notes are deliberately excluded from the draft content hash — annotating an answer must NOT void editorial review or scheduled approval.
- Export stripping for external destinations happens server-side in the export model builder (note forced null), so a tampered client payload cannot smuggle notes out.
