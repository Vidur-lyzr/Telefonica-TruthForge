---
name: Large-file wiring delegation
description: Why mechanical edit passes over very large files should be done directly, not delegated
---

Mechanical, repetitive edit passes (e.g. i18n string wiring) across a very large single file (3,000+ lines) repeatedly time out delegated subagents, even when the scope is narrowed to one section per subagent. Each timeout leaves valid partial progress but wastes a full subagent round.

**Why:** Subagents re-read large context and verify incrementally; on a 3k+ line page the read/verify overhead exceeds the timeout budget before the edits finish. Direct batched edits by the main agent (many small string replacements per response, one typecheck at the end) complete the same work quickly.

**How to apply:** Delegate authoring of new content (dictionaries, corpus entries) freely, but keep mechanical wiring inside huge existing files as direct edits. Batch many independent replacements per turn and verify once with typecheck, not per edit.
