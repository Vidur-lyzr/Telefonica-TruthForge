---
name: Deck rebuild asset keys & recovery
description: Rebuilding deck-extraction output — versioned asset keys and rebuilding from failed jobs
---

# Deck rebuild: versioned asset keys and failed-job recovery

Two rules for any re-run of the deck-extraction pipeline over an existing job:

1. **Never overwrite rendered asset keys in place.** The master-decks asset route serves `Cache-Control: private, max-age=3600`, so re-rendered thumbnails/previews written to the SAME keys show stale images for up to an hour. Re-runs must append a fresh suffix to asset keys (e.g. `thumb-fam-1-r<ts36>.png`); old objects stay orphaned in storage, which is harmless.

2. **Allow rebuild on "failed" jobs, not just "ready".** Boot marks any non-terminal job failed ("interrupted by restart — upload again"), but the original .pptx parts are still in object storage. A rebuild guard that only accepts "ready" breaks the no-reupload promise exactly when a crash interrupted the pipeline. Capture prevStatus/prevError before flipping to "parsing" and restore them (not hardcoded "ready") on failure.

**Why:** architect review caught both — a mid-rebuild crash would have permanently downgraded a healthy job, and rebuilt previews would have looked unchanged to the reviewing admin.

**How to apply:** any future pipeline re-run feature (re-harvest, re-extract, re-render) over a persisted job with stored source parts.
