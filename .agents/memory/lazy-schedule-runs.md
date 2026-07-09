---
name: Lazy recurring-schedule runs
description: Pattern for recurring forecast/report schedules without a daemon — lazy due-run on read, mark-before-compose, compose-before-persist on create.
---

Recurring schedules in this no-daemon demo run lazily when their list endpoint is read.

**Rules:**
- Mark the schedule as run (lastRunAt) BEFORE composing on the lazy due-run path, so concurrent/repeated reads cannot trigger run storms.
- On CREATE, compose the first occurrence BEFORE persisting the schedule; otherwise a failed compose leaves a schedule with lastRunAt=null that silently waits a full interval, breaking the "runs immediately" promise.
- Never fall back unknown roleIds to ROLES[0] — reject with 400 `unknown_role`. Silent fallback created/cancelled schedules under the wrong persona.

**Why:** Architect review caught both the persona-fallback scoping defect and the non-atomic create during Case 5 recurring forecasts.

**How to apply:** Any future recurring/scheduled feature (KPI digests, brand reports) sharing the generateStore schedule registry.
