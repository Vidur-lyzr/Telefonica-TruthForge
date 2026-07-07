---
name: Generate scheduled human-approval gate
description: Scheduled drafts need a SERVER-AUTHORITATIVE approve step bound to content, not client flags or client draft id.
---

Drafts produced by a schedule must not be exportable or versionable until a human approves them in the review inbox, and this must be enforced without trusting anything the client sends — not `origin`/`approved`, and not the draft id.

**Why:** Code review rejected two successive fixes. First fix trusted client `draft.origin`/`draft.approved` (flip to manual -> bypass). Second fix keyed the gate on `draft.id` from the request body, but `draft.id` is client-mutable (clone the draft, change the id -> treated as manual -> bypass). The scheduled-approval gate is a real governance control even though persona/clearance is client-asserted demo-tier.

**How to apply:**
- Keep a server-side lineage index that maps BOTH the draft id AND a content hash to the review item, populated when a schedule runs (and again at approval). The save/version gate resolves "is this scheduled?" by looking up `draft.id` OR `hashDraftContent(draft)` in that index — so mutating the id cannot escape the gate because the content hash still resolves.
- Bind approval to exact content: at approval store the approved content hash on the review item; save/version requires the linked item `approved` AND `hashDraftContent(submitted) === approvedHash`. Any post-approval edit or refine (which preserves the draft id) changes the hash and voids approval until re-review. Editing content AND changing the id makes it genuinely new manual authorship (equivalent to retyping) — acceptable.
- Content hash must exclude volatile fields (guardian verdict, origin/approved/reviewItemId) so an approval matches the saved draft.
- Export is client-only (`window.print`) so the UI gate is best-effort; the enforceable server gate is save/version. "Guardian pass" alone is never sufficient for a scheduled draft.
