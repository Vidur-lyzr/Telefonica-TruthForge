---
name: Coverage-ratio query dilution
description: Why refine/chat wording must not be folded into a coverage-gated retrieval query
---

Rule: text that is not about the topic (refine instructions, chat phrasing, UI wording) must never be concatenated into a retrieval query whose relevance gate is a coverage ratio (matchedMass / queryIdfMass).

**Why:** coverage divides matched idf mass by TOTAL query idf mass. Instruction words ("make this more concise") add idf mass no chunk can match, inflating the denominator and starving every chunk below COVERAGE_MIN — a valid refine of a drafted document flipped to no_evidence.

**How to apply:** keep the coverage-gated query strictly topical (topic, sources, axes). If instruction keywords should be able to pull in new material ("add the dividend figure"), run a SEPARATE retrieval pass with the instruction alone, gate those chunks by coverage against the instruction query itself, and merge deduped results. All merged chunks still flow through the same clearance + destination filters downstream.

Dilution also happens BETWEEN topical texts: folding many KPI names into one query (or onto a UI-generated summary topic) starves all of them — the KPI-report handoff flipped to no_evidence this way. Each name needs its own gated pass.

Structural corollary: when an entity carries a declared source docId (KPI → source doc, Ask answer → cited doc), do not depend on text retrieval to surface that doc at all. Hand the docId over structurally (chunksForDoc-style lookup, coverage exempt), and let the unchanged persona + destination gates downstream decide access. Coverage is a RELEVANCE gate, never a governance gate — bypassing it for id-linked evidence is safe; bypassing clearance never is.
