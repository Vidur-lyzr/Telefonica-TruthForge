---
name: Structured upload chunking
description: Slide/spreadsheet extraction must bypass the prose heading heuristic in the upload chunker or every line is misread as a heading and dropped.
---

The upload chunker's prose heuristic treats any short line without terminal punctuation as a heading. Slide bullets and spreadsheet rows are almost always exactly that, so a .pptx/.xlsx extraction fed through the prose path yields ZERO chunks (`empty_extraction`) even though the text passed the min-length gate.

**Why:** heading lines are consumed as section titles, not content — a document made entirely of "headings" produces no chunk bodies.

**How to apply:** structured extractors (slides, spreadsheets — anything that already knows its own sections) must emit explicit `## heading` markers and set a `structured` flag so the chunker honours ONLY markdown-style headings for them. Keep a safety-net: if chunking yields nothing while paragraphs exist, fold everything into one chunk instead of refusing the ingest. The prose path (pdf/docx/txt/md) must keep the heuristic unchanged.
