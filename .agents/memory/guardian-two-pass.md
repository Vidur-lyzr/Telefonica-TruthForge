---
name: Guardian two-pass agent design
description: How the Brand Guardian merges a deterministic rule pass with an LLM review without letting the model weaken governance
---

# Guardian two-pass agent design

The rule: when an LLM review is layered onto a deterministic checker, the deterministic findings and the block/pass status must be computed outside the model and never be suppressible by it. The model only ADDS findings; merged status is recomputed from the merged error count.

**Why:** the skill document steering the model pass is user-editable, so a hostile or sloppy skill must at worst produce spurious or muted model findings — never a governance bypass.

**How to apply:** any agent that wraps a hard-rule validator (guardian, export gates). Also: have the model return verbatim quotes, map them to character spans with indexOf plus a per-quote cursor (repeated quotes advance past the previous match); unmatched quotes keep the finding with location null rather than dropping it. When model output is structured JSON, stream step milestones only — never raw tokens.
