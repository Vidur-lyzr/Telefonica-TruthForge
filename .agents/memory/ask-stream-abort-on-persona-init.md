---
name: Ask stream aborted on persona init
description: Why the governed assistant hung on "Contacting the governed agent" via the Home handoff, and the effect-ordering trap behind it.
---
Symptom: Ask panel stuck forever on "Contacting the governed agent…". Backend log shows `ask: conversational` then `request aborted` ~5ms later, then `gitagent: run complete` 7s later into a dead SSE connection. curling /api/ask/stream returns a full result, proving the abort is 100% client-side.

Root cause: two effects in ask.tsx both key on `roleId`. `roleId` starts as `""` and settles to a persona asynchronously (once roles load). On the Home `?q=` handoff, when roleId transitions ""→persona: the auto-run effect (declared first) fires and starts the streamed request (stores the AbortController), then the persona-switch abort effect (declared later) fires on the SAME transition and calls `askAbortRef.current?.abort()`, killing the request it just started. Effects run in declaration order, so the abort always wins.

**Why:** the abort effect exists for a real governance reason (switching to a lower-clearance persona must cancel an in-flight higher-clearance run), but "establish persona for the first time" is not a switch.

**How to apply:** gate any `[roleId]`-keyed teardown/abort effect on a real persona-to-persona change — track the previous roleId in a ref and skip when the previous value is empty/unset (or equal). Never abort in-flight work on the initial ""→value establishment. Same trap applies to any effect that both triggers and tears down work off the same async-settling dependency.
