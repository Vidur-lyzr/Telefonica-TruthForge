---
name: Wiki graph visual encoding
description: The Map graph must encode color=axis and fill=layer, not color=kind.
---

The Wiki Map (force-directed SVG in the hub-ssot artifact) encodes two orthogonal
dimensions on every node:

- **color = axis**: a node's colour comes from its `axisId` (the axis palette).
  Nodes without an axis fall back to a small per-kind neutral palette.
- **fill = layer**: compiled/structural layers (axis, compiled_page, document,
  figure) are drawn **solid-filled**; raw entities (market, brand, product,
  executive) are drawn as **outlines** (white fill + coloured stroke). Locked
  nodes are slate with a lock glyph regardless of layer.

**Why:** an earlier build coloured nodes by kind, which a review rejected — it
made the compiled memory indistinguishable from the raw graph and hid the axis
dimension. Keeping color and fill as separate encodings lets a viewer read
"which axis" and "compiled vs raw" at the same time.

**How to apply:** if you add a new node kind, decide whether it is compiled
(solid) or raw scaffolding (outline), and let its colour follow `axisId`. Do not
reintroduce color-by-kind.
