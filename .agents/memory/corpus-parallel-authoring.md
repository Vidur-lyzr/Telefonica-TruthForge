---
name: Corpus parallel authoring
description: How to scale the synthetic corpus safely with parallel subagents
---
Rule: when bulk-authoring synthetic corpus content, give each parallel author its own file under `data/expansion/` and a unique doc-id prefix (doc-a-/doc-b-/doc-e-), with a shared authoring brief; merge via spread into DOCS; never let authors touch corpus.ts.
**Why:** three subagents authored ~93 docs concurrently with zero id collisions or merge conflicts; a shared brief kept assertions consistent (group-revenue Q1 2026 = €8,127M must never be contradicted accidentally).
**How to apply:** any future corpus growth or supporting-layer expansion; after merging, sanity-check for duplicate doc/chunk ids and dangling docId refs in NUMERIC_FACTS/SERIES, DOC_LINEAGE, KPI_MENTIONS, RADAR_EVENTS, graph figure nodes.
Densification variant: to add chunks to EXISTING docs collision-free, use a chunk overlay — per-author files exporting `Record<docId, Chunk[]>` merged by appending at load time, with new ids suffixed `#dN` so original `#N` ids (citations, lineage) are never touched. One doc per batch only; the merge throws on cross-batch duplicates.
Chunk render conventions: pipe-lines (`| a | b |`, first row = header, no dash row) render as tables in the doc viewer; PPT docs get "Slide N of M" labels derived from sourceFormat, not stored per chunk.
Also: `artifacts/api-server/agent/.gitagent/` files are the ask-agent's self-mutating runtime state — they show as modified after any ask run; incidental, not a change to review.
