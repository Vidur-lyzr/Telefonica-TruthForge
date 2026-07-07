---
name: Ask conflict vs corroboration tuning
description: How the governed Ask agent separates a conflict beat from a corroboration beat over the same corpus, and where corroboration/low-confidence counts come from.
---

# Conflict vs corroboration in the Ask agent

The same superseded doc (an internal "approved messaging" pack whose figure
disagrees with the published results) must:
- trigger a **conflict** when the user asks *about that messaging*, and
- stay silent (answer = clean **corroboration**) when the user asks for the
  defensible/public figure.

**Rules that make this deterministic:**
- A doc may only *trigger* a conflict if it ranks among the **top-2 permitted
  relevant sources** (permitted list is score-sorted). A superseded doc that only
  grazes the coverage floor (shares generic tokens like "figure"/"group") must not
  derail an otherwise-corroborated answer.
- **Why:** without the top-2 gate, a marginal superseded match turns every
  revenue question into a conflict.

- **Corroboration** counts every doc the persona may read (clearance-filtered)
  that asserts the same value+period — scanned over the whole corpus, NOT just the
  retrieved chunks — excluding `historic`/`superseded` docs. Report only when >= 2.
- **Why:** corroboration is a property of the governed corpus, not of what
  retrieval happened to surface; keying it off retrieved chunks made it flap to
  null when only one source cleared the coverage floor.

- **Low-confidence** keys off **distinct cited docs**, not the pre-model
  relevant-chunk count. One review-validity doc contributing several chunks still
  counts as a single source. Fires when the lone cited doc is `review` or expired.

**How to apply:** when adding demo docs/beats, tune chunk wording so the intended
trigger doc is the top hit for its beat's query and a non-trigger for others
(e.g. messaging pack uses "top-line", not "revenue"). Verify each beat by curl
against `localhost:80/api/ask`.
