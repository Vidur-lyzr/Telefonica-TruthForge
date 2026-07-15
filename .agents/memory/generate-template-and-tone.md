---
name: Generate templateId & editable tone wiring
description: Two easy-to-miss wiring points in the Generate/Brand flow
---

- The UI generate flow uses the JOB path `/generate/jobs`, not `/generate`. Any new GenerateInput field (e.g. templateId) must be threaded into BOTH route handlers' `input` objects or the feature silently no-ops for real users.
  **Why:** direct `/generate` curl tests pass while the actual UI (job-based) drops the field.
- Editable Brand tone only affects composition if generateAgent reads `getTonePrinciples()` from toneStore, NOT the static `TONE_PRINCIPLES` export from brandRoom.
  **Why:** toneStore holds live edits; the static array is just the seed default.
