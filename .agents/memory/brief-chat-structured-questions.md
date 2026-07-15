---
name: Brief-chat structured questions
description: Keeping model extraction, server option metadata, and chat UI in lockstep for guided-brief chats
---

Two rules for any chat flow where the model extracts fields and the server attaches structured answer options (radio/checkbox) to its questions:

1. **The extraction prompt's enum must list every option the UI offers.**
   **Why:** The Generate guided chat offered an "Off the record" radio, but the model's JSON schema only allowed public|private|confidential — the selection silently coerced or nulled, and a null on a non-skippable field re-triggered the same question (re-ask loop).
   **How to apply:** Whenever server-side question metadata (option values) changes, update the model's "Return ONLY JSON" enum in the same edit.

2. **Guard model-proposed next-questions server-side against already-filled fields.**
   **Why:** The model would ask for confidentiality even when an external audience had already forced it to public. Client-side fixes can't help — the guard belongs where the question is built.
   **How to apply:** Before accepting the model's nextField, check both "already asked" (regex over assistant turns, multilingual) and "already filled" (field non-empty); fall back to a deterministic next-gap question otherwise.
