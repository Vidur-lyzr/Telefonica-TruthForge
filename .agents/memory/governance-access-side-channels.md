---
name: Governance access side channels
description: Every Ask-flow side channel must use the shared area+clearance resolver, not rank-only checks.
---

The rule: any path that can surface governed content or facts (retrieval, numeric facts, adjacent datum, corroboration counts, conflict targets, agent tools) must gate access through the single `resolveDocAccess` resolver (area AND clearance), never a clearance-rank-only comparison.

**Why:** A code review found rank-only checks in numeric/conflict side channels that let out-of-area facts reach the model and user output — a governance-invariant violation even though the main retrieval path was correct.

**How to apply:** When adding any new Ask-agent helper or tool that touches docs/facts, wire it to the shared `canReadDoc` predicate (or `resolveDocAccess` directly). Conflict detection intentionally allows an accessible-but-not-retrieved target doc; that is documented, not a bug.

Also: taxonomy is runtime state persisted to `.data/governance.json` (gitignored, cwd-relative to api-server); deleting the file resets to the seed taxonomy (v4).
