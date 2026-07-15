---
name: Gitignored .data on deploy
description: Why file-backed JSON stores appear empty on a fresh deployment and how to seed them.
---
File-backed stores (e.g. the Generate store: review inbox, schedules, versions) persist to `.data/*.json`, which is gitignored. A fresh deployment has no `.data`, so the store loads empty — the Review inbox looks broken even for superadmin.

**Why:** `.data` is never committed, so prod starts with no snapshot; the loader returned early when the file was absent.

**How to apply:** Ship a committed seed module (a `.ts` exporting the snapshot object, not raw JSON — bundled reliably by esbuild) and, when the disk file is absent, apply the seed then persist it. Regenerate the seed by snapshotting a good dev `.data` store. Keep the seed's shape aligned with the persisted-state interface.
