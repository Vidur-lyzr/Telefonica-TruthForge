---
name: pptxgenjs under tsx
description: pptxgenjs (and similar CJS-only packages) need createRequire when run via tsx ESM scripts
---

# pptxgenjs is CJS — tsx's ESM loader does not surface its default export

`import PptxGenJS from "pptxgenjs"` under a tsx-run script yields a module namespace object, not the constructor — `new PptxGenJS()` fails at runtime while typecheck passes.

**Why:** pptxgenjs ships CJS only; tsx's ESM interop wraps it so the constructor sits behind `.default` inconsistently.

**How to apply:** in tsx scripts, load it via `createRequire(import.meta.url)` and cast: `const PptxGenJS = require("pptxgenjs") as typeof import("pptxgenjs").default;`. Same pattern applies to other CJS-only packages (pdfkit already uses it).
