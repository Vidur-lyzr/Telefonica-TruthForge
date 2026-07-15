---
name: Eval golden calibration
description: Golden-set expectations must be recalibrated when corpus changes alter refusal behavior; hallucination metric = ungrounded citations only.
---

# Golden-set calibration vs corpus changes

Rule 1: When the corpus gains public "graze" docs adjacent to confidential topics, questions that previously hit `permission_blocked` legitimately flip to `answered` (grounded in permitted public material). Golden expectations authored against the old corpus become stale — recalibrate them by live replay, and pin the observed grounded citations as `expectedDocIds`. Keep at least a couple of hard-block goldens whose topics have NO public graze coverage so the refusal path stays under measurement.

**Why:** A weekly eval showed 66.7% accuracy / 29% "hallucination" after a parallel corpus expansion. Replay proved every "failure" was an honest, fully-grounded public answer — a golden-staleness problem, not a governance leak. The hard-block path still worked (pointed questions with no public counterpart still blocked).

**How to apply:** After any corpus expansion, replay failing goldens through the real ask endpoint before assuming an agent regression. Grounding (citations ⊆ audited permitted hits) distinguishes honest recalibration candidates from real leaks.

Rule 2: "Hallucination" in an eval must mean fabricated evidence — a citation outside the row's own audited retrieval — never "answered when the golden expected a refusal". Refusal misses are accuracy failures; conflating them inflates the hallucination rate with rows that never invented a source.

**Why:** The initial metric definition mixed both, producing a misleading 29% hallucination rate when true fabrication was ~2%.

**How to apply:** Keep status-mismatch and grounding as separate signals in eval grading; only grounding feeds the hallucination metric.
