---
name: Streamdown in a no-Tailwind Mística app
description: How to render markdown answers with streamdown when Tailwind is banned and custom citation links are needed
---

Rule: when using `streamdown` for answer markdown, custom in-text interaction links must use hash hrefs (`#cite-S1`), never custom protocols (`cite:S1`), and typography must come from our own `.answer-markdown` CSS in `index.css`.

**Why:** streamdown pipes all links through `rehype-harden`, which blocks non-standard protocols and rewrites them into "children + [blocked]" text — a custom `urlTransform` does NOT bypass it. Hash-only fragments are explicitly allowed. Streamdown's own styles are Tailwind utility classes, which never apply in this repo (no Tailwind), so output is unstyled without our wrapper CSS.

**How to apply:** preprocess citation markers `[S1]`/`[S1, S2]` into `[S1](#cite-S1)` markdown links (regex must skip real links via `(?!\()`), then intercept in `components={{ a }}` and render a chip; wrap `<Streamdown>` in `<div className="answer-markdown">`.
