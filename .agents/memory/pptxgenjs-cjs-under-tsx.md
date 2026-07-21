---
name: pptxgenjs under tsx
description: pptxgenjs (and similar CJS-only packages) need interop handling when run via tsx ESM scripts; api-server modules also need a __dirname shim under tsx
---

# pptxgenjs is CJS — tsx's ESM loader does not surface its default export

`import PptxGenJS from "pptxgenjs"` under a tsx-run script yields a module namespace object, not the constructor — `new PptxGenJS()` fails at runtime while typecheck passes.

**Why:** pptxgenjs ships CJS only; tsx's ESM interop wraps it so the constructor sits behind `.default` inconsistently.

**How to apply:** the pptx renderer now normalizes at source: keep the default import for its type namespace (`PptxGenJS.Slide` etc.) and construct via `const PptxCtor = (PptxGenJS as any).default ?? PptxGenJS` — works under both the esbuild CJS bundle and tsx. For other CJS-only packages in one-off tsx scripts, `createRequire(import.meta.url)` remains the fallback (pdfkit already uses it).

# tsx harnesses of api-server export modules need a __dirname shim

The brand-assets loader builds its candidate path list with `__dirname`, which exists in the esbuild CJS bundle but not under tsx ESM — importing the module throws immediately.

**How to apply:** in a tsx harness, set `(globalThis as any).__dirname = process.cwd()` BEFORE the app modules load, which requires dynamic `await import(...)` for them (static imports hoist above the shim). The cwd-based asset candidates then resolve.
