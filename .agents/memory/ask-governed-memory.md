---
name: Ask governed multi-turn memory
description: How client-side conversation memory stays inside persona/clearance boundaries in the Ask assistant.
---

# Governed conversation memory must be persona-scoped

The Ask assistant keeps conversation history client-side (localStorage, no DB).
Memory must never grant a persona access a fresh query wouldn't.

**Rules:**
- Conversations are stored as persona-scoped **sessions** (each carries its
  `roleId`), not one flat thread. The History control lists and resumes prior
  sessions for the *current* persona only.
- On persona switch, the active conversation is re-selected to one belonging to
  the new persona (or a clean slate) — a session from another persona is never
  left active or resumable.
- History sent to the model is re-filtered to turns whose `roleId` matches the
  current persona, as a hard guard on top of session scoping.
- Slow async completions must not leak across boundaries: persona switch aborts
  any in-flight ask run (and closes the document workspace panel), and any
  auto-open/auto-focus side effect fired after an await must first re-check —
  via a ref — that its conversation is still the one on screen. A captured
  `convoId` alone is stale by completion time.

**Why:** an earlier version persisted a single unscoped thread and replayed prior
assistant answers verbatim; switching to a lower-clearance persona would carry a
higher-clearance answer into the new model context — a governance leak flagged in
code review.

**How to apply:** any client-persisted chat memory in this app must be keyed by
persona and re-validated against the current persona before it enters a request.
Bump the storage key version when the stored shape changes so legacy unscoped
state is ignored, not replayed.
