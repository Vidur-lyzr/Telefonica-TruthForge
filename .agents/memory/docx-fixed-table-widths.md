---
name: DOCX fixed table widths
description: Why docx-library tables must use FIXED layout with explicit DXA widths on grid AND cells.
---

# DOCX fixed table widths

A `docx` table declared only with `WidthType.PERCENTAGE` (no `columnWidths`, no per-cell widths) renders fine in desktop Word but collapses to one-character-wide columns (vertical letter-per-line text) in other viewers (Preview/Quick Look, Google Docs, Pages).

**Why:** those viewers ignore percentage-only tables without a column grid and fall back to minimal content width per column.

**How to apply:** every table must set all three together: `layout: TableLayoutType.FIXED`, `columnWidths: [...]` in DXA, and an explicit `width: { size, type: WidthType.DXA }` on every `TableCell`. Compute the widths deterministically from weights so they sum exactly to the section content width (floor each, add the remainder to the last column). The shared allocator lives in the export theme module — use it, never ad-hoc percentages.
