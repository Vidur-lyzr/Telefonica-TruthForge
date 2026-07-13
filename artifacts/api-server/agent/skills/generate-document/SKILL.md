---
name: generate-document
description: User asks to write/draft/make a talking-points doc, press release, Q&A, deck, or report. Resolves parameters and hands off to the doc-gen Superflow via invoke_superflow — never composes the final document itself.
confidence: 0.68
usage_count: 5
success_count: 3
failure_count: 2
negative_examples:
  - 'Superflow refused with no_evidence: no approved, permitted source in the governed corpus covers Q3 2026 brand strategy specifically. Sources provided are historic, adjacent, or off-topic relative to that brief.'
  - 'Superflow refused: no approved, permitted source in the governed corpus covers the CEO keynote at MWC Barcelona 2026. The three sources provided in the conversation were not sufficient to satisfy the Superflow''s governed retrieval validation.'
---

# SKILL: generate-document
The bridge from conversation to the deterministic doc-gen Superflow. You do NOT
compose the document yourself — you resolve parameters and hand off, then report
progress and where the draft lands.

## Trigger
"Write / draft / make a talking-points doc, press release, Q&A, deck, or report."
Also reached when answer-cited offers "export to report".

## Procedure

1. **Resolve scope** (as always — done for you before you run).

2. **Extract the Superflow input** from natural language. Required fields:
   ```
   { doc_type:  talking_points | press_release | qa | multiformat,
     audience:  internal | external,
     topic:     string,
     axes:      string[],            // from the 5 axes
     language:  es | en | de | pt,
     confidentiality: public | private | confidential,   // destination
     format:    ["docx"|"pptx"|"pdf"|"txt"|"md"] }
   ```
   If a REQUIRED field is missing and not inferable, ask exactly ONE clarifying
   question (audience and language are the usual gaps). Do not present a form wall.

   **Pack requests** ("press release with Q&A messaging", "the full pack",
   "all formats"): pick `doc_type: multiformat` for press+Q&A+messaging sets,
   and list every requested format in `format`. One invocation covers the whole
   pack — never invoke the Superflow once per format.

3. **Enforce the audience rule at handoff.** If `audience = external`, the
   destination filter is public/approved — flag anything else before invoking.

4. **Invoke** `invoke_superflow` with name `document-generation` and the input above.
   The Superflow runs synchronously: governed retrieval (seeded with this
   conversation's cited sources, re-validated against the user's clearance),
   composition, Brand Guardian, then registration of the finished draft. The
   tool result tells you what actually happened:
   - Draft ready → a file card appears in the chat with the offered formats
     (individually downloadable and as a ZIP pack). Report title and formats.
   - Guardian block → the document is registered but downloads are locked;
     report the Guardian's reason honestly.
   - No evidence / permission blocked → no file exists; relay the refusal
     reason. Never claim a file was produced.

5. **Never bypass the approval gate.** If the user says "publish", route into the
   approval-gated path; publication happens only post-approval.

## What you must NOT do
- Do not compose the final document token-by-token yourself and skip the Superflow —
  that loses determinism, Brand Guardian, and exactly-once.
- Do not set up recurring schedules from chat — that is backend configuration.
- Do not invent figures; the Superflow's retrieval supplies them, cited.
