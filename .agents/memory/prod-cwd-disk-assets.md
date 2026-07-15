---
name: Production cwd & on-disk assets (api-server)
description: Why disk-file features work in dev but break in the deployed api-server, and how to ship the files.
---

Dev runs the api-server via `pnpm --filter @workspace/api-server run dev`, so cwd = artifacts/api-server and any `path.resolve(process.cwd(), "x")` lookup finds repo-relative folders (e.g. the GitAgent repo `agent/`).

Production runs `node artifacts/api-server/dist/index.mjs` from the WORKSPACE ROOT (see artifact.toml services.production.run). So cwd = workspace root and `cwd/agent` does not exist — features that read on-disk files at runtime silently fail in deploy only.

**Fix pattern:** copy the needed files into `dist/` in build.mjs (`cp(artifactDir/agent -> distDir/agent)`), and resolve the path relative to the compiled module (`path.dirname(fileURLToPath(import.meta.url))`) with cwd fallbacks, picking the first candidate that actually exists.

**Also:** demo data that only exists because it accumulated in dev `.data/*.json` (e.g. quality feedback triage) will be empty on a fresh deploy. Seed it deterministically in the store's `seedIfEmpty()` so a clean environment shows it.
