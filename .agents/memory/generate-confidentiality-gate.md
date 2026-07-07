---
name: Generate external-audience confidentiality gate
description: External audience must cap EVERY retrieval (body AND spokesperson guidance) to public before the model.
---

The Generate engine's external-audience gate must apply to *all* retrieval that feeds the model prompt, not just body sources.

**Why:** A first pass gated body chunks to public for external audiences but still fetched internal spokesperson/holding-line guidance under the raw persona clearance and injected it into the prompt. That let confidential/internal/off-record material reach the model on external runs — the highest-severity failure for this governance product. Code review rejected it.

**How to apply:** Derive one `bodyClearance` (external -> public, else persona clearance) and use it for BOTH body retrieval and guidance retrieval. Any new source type added to the prompt must also be gated by `bodyClearance`. Verify by confirming internal-only specifics (e.g. disposal sequencing detail) never appear in an external draft — a crude word match on the topic term is a false positive because the user's topic itself can contain the sensitive noun.
