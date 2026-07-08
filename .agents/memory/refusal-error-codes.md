---
name: Refusal error codes
description: Governance refusals need machine-readable codes in the API error body, not just messages.
---

Rule: when a server-side governance gate refuses an action (e.g. press export without editorial review), the error response must include a machine-readable `code` field (`{ error, code }`), and the OpenAPI ErrorResponse schema must declare it.

**Why:** the frontend keys specific remediation UX (resetting local review state, targeted guidance) on the code. A route that maps a typed refusal error to `{ error: message }` only silently breaks that path — the review flow appeared to work but the specialised handling never triggered until an architect review caught it.

**How to apply:** whenever adding a new refusal path, thread `err.code` through the route's error response, keep the code enum documented in the spec, and give the frontend a message-substring fallback in case the code is absent.
