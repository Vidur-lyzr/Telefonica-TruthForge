---
name: Coverage-ratio query dilution
description: Why refine/chat wording must not be folded into a coverage-gated retrieval query
---

Rule: text that is not about the topic (refine instructions, chat phrasing, UI wording) must never be concatenated into a retrieval query whose relevance gate is a coverage ratio (matchedMass / queryIdfMass).

**Why:** coverage divides matched idf mass by TOTAL query idf mass. Instruction words ("make this more concise") add idf mass no chunk can match, inflating the denominator and starving every chunk below COVERAGE_MIN — a valid refine of a drafted document flipped to no_evidence.

**How to apply:** keep the coverage-gated query strictly topical (topic, sources, KPI names, axes). If instruction keywords should be able to pull in new material ("add the dividend figure"), run a SEPARATE retrieval pass with the instruction alone, gate those chunks by coverage against the instruction query itself, and merge deduped results. All merged chunks still flow through the same clearance + destination filters downstream.
