---
name: Honest fallbacks for agent-supplied governed refs
description: How to resolve model-chosen ids (chartId, imageId) against governed content at render time.
---

Rule: when a model-filled slot references governed content by id (chart series, brand image), an unresolvable id must render an honest absence (fallback rect / no chart), never silently substitute a different governed item (e.g. `charts[0]`). Defaulting deterministically when NO id was given is fine; substituting when a WRONG id was given is not.

**Why:** a slide silently showing a different governed chart than the agent intended breaks the platform's honesty guarantees the same way a hallucinated citation would — reviewers can't tell the substitution happened. Flagged by architect review of the visual deck engine.

**How to apply:** any render-time resolver that maps agent-output ids to server-side governed objects: branch on "id absent" (deterministic default OK) vs "id present but unmatched" (honest empty fallback).
