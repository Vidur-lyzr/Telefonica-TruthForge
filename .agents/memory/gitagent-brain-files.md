---
name: GitAgent brain-file YAML pitfalls
description: Frontmatter rules for agent skills; a single bad SKILL.md silently kills every gitagent run
---

Rule: SKILL.md frontmatter must be strictly valid YAML. A description that begins with a double quote but contains further text after the closing quote (e.g. `description: "What's scheduled..." — reads the graph`) is a YAML parse error.

**Why:** The SDK loads all skill frontmatter at run start; one bad file fails the entire `query()` run, and the ask route then falls back to the direct-model path — answers still appear, but with zero token streaming and no skill loading, which looks like a streaming bug rather than a YAML bug.

**How to apply:** Keep skill descriptions as plain unquoted scalars with no leading quote character. If a gitagent run streams steps but zero token deltas, check the server log for "gitagent run failed ... bad indentation" before debugging SSE code.
