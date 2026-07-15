---
name: Sentinel intent routing for chat agents
description: Chat agents over in-view governed data must let the model judge intent via sentinels, not lexical gates
---

Rule: for a chat agent whose evidence is already scoped and in view (e.g. KPI panel data the user is looking at), never pre-filter questions with lexical gates (domain lexicons, coverage ratios, keyword thresholds). Give the model the permitted evidence and a refusal protocol: it emits a reserved sentinel token (e.g. OFF_TOPIC / NOT_COVERED) as its whole reply when it cannot answer; the server suppresses sentinels from the token stream with a small buffer (buffer/pass/silent) and routes the verdict afterwards (NOT_COVERED with blocked sources present → permission_blocked, else no_evidence).

**Why:** Lexical gates over a small in-view dataset misfire constantly — typos, casual phrasing, and other languages get refused while unrelated queries slip through — and the user perceives this as hardcoded/fake behavior. Coverage gating is for open-corpus retrieval relevance (see coverage-retrieval.md), not for chat intent.

**How to apply:** Keep the pre-model gate only for governance (empty permitted evidence → refuse before any model call, blocked>0 wins). Everything else — greetings, typos, off-topic, capability questions — is the model's judgment via the sentinel protocol. Sentinel strings must be improbable in prose and stripped/suppressed from streamed tokens.
