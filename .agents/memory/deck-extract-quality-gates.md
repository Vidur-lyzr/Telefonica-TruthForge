---
name: Deck-extraction quality gates
description: Why template extraction must reject content-dense slides and filter decoration after slot selection
---

# Master-deck layout extraction must gate on structure

The rule: never turn a slide cluster into a layout template just because it recurs. Gate first (reject content-dense/no-text representatives), cap slots to a small professional budget, and only append decorative fills/lines AFTER slot selection — keeping just structural furniture (full-width/height bands, large panels, fills backing kept slots, lines underlining kept slots). Name proposals from the KEPT slot structure, never from raw shape counts.

**Why:** the first version copied source geometry verbatim: palette slides became "28 text blocks + 24 images" templates, swatch squares and dangling lines were baked into approved layouts, and composed slides rendered empty fallback boxes for unfillable slots. Shipped garbage to the published app and the user had no delete path.

**How to apply:** any pipeline that converts user-uploaded visual material into reusable templates needs (1) a pre-proposal rejection gate with reasons surfaced in the job summary, (2) hard caps on generated structure, (3) decoration filtered by relationship to kept content, and (4) an audited admin removal route for already-approved junk — compose-time cleanups do not fix layouts approved under an older proposer.
