---
name: Server bundling natives
description: Which packages must be externalized in the api-server esbuild bundle and why.
---
Rule: any package that loads a native `.node` binding (e.g. `@resvg/resvg-js`) or reads data files relative to its own package dir (e.g. `pdfkit` reading `.afm` font metrics) must be added to `external` in `artifacts/api-server/build.mjs`. `docx` and `pptxgenjs` are pure JS and bundle fine.

**Why:** esbuild has no loader for `.node` files and inlining breaks file-relative `__dirname` reads — the dev workflow (`build && start`) fails at build time.

**How to apply:** if the API Server workflow fails with "No loader is configured for .node files" or missing font data at runtime, externalize the package (safe: it is a runtime dependency, node_modules is present in prod).
