---
name: Section-body ASCII-art sanitiser
description: Why generated document bodies are sanitised at three layers and the pipe-table detection pitfalls
---

Document section bodies render through a restricted rich-text subset (H2/H3, '-' bullets, bold/italic, [S#] chips). The model sometimes draws ASCII "charts" — pipe-column rows inside ``` fences with dash divider rows — which that renderer cannot display.

**Rule:** defend at three layers, all required:
1. Prompt hardening (never draw charts/tables in text) — reduces but does not eliminate.
2. Server-side sanitiser on every path that writes a body (compose AND block-edit), applied BEFORE citation extraction, brand checks, and no-change comparisons so downstream verdicts bind to the stored text.
3. Client-side pre-pass in the text→doc parser for legacy bodies generated before the sanitiser existed.

**Pitfalls found the hard way:**
- A dash divider row like `-----|-----` has no spaced pipe, so a "pipe row" regex requiring `^\|`, `\|$`, or ` | ` misses it — test for a pipe plus dashes/colons-only content separately.
- A single prose line containing " | " is NOT a table. Only convert grouped runs (≥2 consecutive pipe rows) or header+divider pairs; otherwise legit prose gets mangled into bullets.
- When stripping bullet markers from converted cells, `/^[-\s]+/` eats the minus of negative numbers ("-3.2%"); strip `-` only when followed by whitespace.

**How to apply:** any new agent path that writes or rewrites a section body must run the shared sanitiser; any new renderer with a restricted markup subset needs an equivalent defensive pre-pass.
