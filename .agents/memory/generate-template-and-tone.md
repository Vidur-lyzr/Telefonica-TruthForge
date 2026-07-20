---
name: Generate templateId & editable tone wiring
description: Two easy-to-miss wiring points in the Generate/Brand flow
---

- The UI generate flow uses the JOB path `/generate/jobs`, not `/generate`. Any new GenerateInput field (e.g. templateId) AND any per-request side effect (audit/observe, quotas) must be threaded into BOTH the sync route and the job route's detached closure, or the feature silently no-ops for real users. This trap has bitten twice.
  **Why:** direct `/generate` curl tests pass while the actual UI (job-based) drops the field/side effect. Calling observe(req, ...) after the 202 response inside the job closure is safe — it only reads req.session, which stays referenced.
- Editable Brand tone only affects composition if generateAgent reads `getTonePrinciples()` from toneStore, NOT the static `TONE_PRINCIPLES` export from brandRoom.
  **Why:** toneStore holds live edits; the static array is just the seed default.
