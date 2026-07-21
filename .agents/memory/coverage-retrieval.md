---
name: Coverage-based retrieval relevance
description: Why Hub SSoT ranks retrieval relevance by query-idf coverage instead of an absolute BM25 score, and the constraints that keeps.
---

# Coverage-based retrieval relevance

Relevance for the Ask agent is decided by a query-idf-**coverage** ratio
(matched idf mass / total query idf mass), gated by `COVERAGE_MIN`, NOT by an
absolute BM25 score threshold.

**Why:** With an absolute BM25 threshold, generic high-frequency-in-corpus words
that still carry some score — "Telefónica", "strategy" — let an unrelated public
document clear the bar and get returned as an "answer". That broke the two hero
governance demos: a `no_evidence` question (consumer quantum computing) and a
`permission_blocked` question (acquisitions for a low-clearance persona) both
wrongly returned `answered`. Coverage fixes this because a question about an
absent topic has most of its idf mass in absent terms, so coverage stays low.

**How to apply:**
- The `kb` adapter returns per-chunk `coverage`; the agent filters on
  `coverage >= COVERAGE_MIN`. Keep that contract if you refactor either side.
- Do NOT "fix recall" by capping absent-term idf in the denominator — that
  directly weakens the `no_evidence` guarantee (absent specific terms are exactly
  what should drive coverage down). Instead widen the stopword list to drop
  conversational filler ("please", "tell", "current", ...) which is the safe way
  to protect recall on verbose/chatty questions without letting red herrings in.
- Governance is enforced by filtering chunks by persona clearance BEFORE the
  model sees them; `permission_blocked`/`no_evidence` return before any Claude
  call and must never carry snippet text (only the classification label).
- **Tiny/scoped pools are different from the global Ask corpus.** The KPI-scoped
  chat retrieves from just the evidence behind the KPIs in view (often a handful
  of items). There, the query-idf-coverage *ratio* over-triggers `no_evidence`:
  absent query terms ("brand", "declining") dominate a small denominator, so an
  obviously on-topic question scores below `COVERAGE_MIN`. For scoped pools use a
  simple **term-presence** on-topic gate (fraction of distinct query content
  terms that appear anywhere in the pool vocabulary) to decide answered-vs-
  no_evidence, and keep idf only for ranking the items you cite. Off-topic
  questions (e.g. bitcoin price) still have ~0 terms in the pool, so
  `no_evidence` is preserved. Do NOT reuse the Ask agent's idf-mass coverage gate
  verbatim for a scoped pool.
- **Verbose-brief segment rescue (Generate) is deliberate, not a regression.**
  Long multi-clause briefs dilute coverage (every extra clause adds idf mass to
  the denominator), so honest topics failed `no_evidence`. The generate agent
  therefore runs a rescue ONLY when no chunk cleared `COVERAGE_MIN` and the
  topic is >=9 words: it splits the topic into short segments and retrieves per
  segment, gating each segment on its own coverage. A 2-word segment reaching
  coverage 1.0 is expected there — do not "fix" it by tightening the segment
  gate. The rescue changes relevance only; rescued chunks flow through the same
  clearance/accessible/destination-cap filters as every other retrieval pass,
  and off-corpus verbose briefs still return `no_evidence` (verified).
