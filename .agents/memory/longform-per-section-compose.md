---
name: Longform per-section composition
description: How multi-page (Previsiones-style) documents are composed governedly, section by section
---

# Longform per-section composition

Rule: templates flagged `longform` compose ONE model call per template section, each restricted to the sources that section's own governed retrieval pass cleared, numbered against the shared global [S#] source list so citations never desync. Sections with zero permitted evidence are skipped and listed in `draft.note` — the document shrinks honestly, never pads. Refine keeps the single-call path (longform disabled when refining a base draft).

**Why:** a single 16k-token call cannot produce 8–15 dense pages, and per-section retrieval keeps governance filtering per topic instead of one diluted query.

**How to apply:** any new multi-page template: mark `longform: true` on the DocumentTemplate, give each section a `query`/`hint`; per-section fallback on parse failure is extractive (cited excerpts), and quota errors must re-throw (`isQuotaError`) — never swallow them into the extractive fallback.

Gotcha: forecast grammar (`**[date]:**` blocks, `o ` sub-bullets, `IG:`/`TT:` channel lines, ALL-CAPS sub-brand lines) is prompt-encouraged but stochastic — renderers must treat every grammar element as optional.
