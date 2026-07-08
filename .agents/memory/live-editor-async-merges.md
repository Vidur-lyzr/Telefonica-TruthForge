---
name: Live-editor async merges
description: Preventing stale async responses from clobbering newer edits in an always-live editor
---

Rule: when an always-live editor triggers async work (guardian recheck, autosave, validation), the response must be MERGED into current state with a functional setState, guarded by an id + body-signature comparison captured at issue time. Never `setState({ ...capturedSnapshot, extra })`.

**Why:** debounced checks can overlap; a slow earlier response carrying an old draft snapshot would replace state and silently revert text the user typed after the check was issued (architect flagged this as a blocking data-loss race).

**How to apply:** compute `issuedSignature = JSON.stringify([id, ...bodies])` when firing; in onSuccess use `setState(curr => curr && curr.id===id && sig(curr)===issuedSignature ? {...curr, verdict} : curr)`. Also gate the debounce effect on the mutation's isPending so checks serialize.
