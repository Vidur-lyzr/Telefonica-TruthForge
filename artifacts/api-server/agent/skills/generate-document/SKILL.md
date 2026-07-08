---
name: generate-document
description: User asks to write/draft/make a talking-points doc, press release, Q&A, deck, or report. Resolves parameters and hands off to the doc-gen Superflow via invoke_superflow — never composes the final document itself.
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
     format:    ["docx"|"pptx"|"pdf"] }
   ```
   If a REQUIRED field is missing and not inferable, ask exactly ONE clarifying
   question (audience and language are the usual gaps). Do not present a form wall.

3. **Enforce the audience rule at handoff.** If `audience = external`, the
   destination filter is public/approved — flag anything else before invoking.

4. **Invoke** `invoke_superflow` with name `document-generation` and the input above.
   Report the run id and where the draft will land. For scheduled/sensitive runs the
   Superflow routes to Wait-for-Approval; say "queued → review folder" and stop.

5. **Never bypass the approval gate.** If the user says "publish", route into the
   approval-gated path; publication happens only post-approval.

## What you must NOT do
- Do not compose the final document token-by-token yourself and skip the Superflow —
  that loses determinism, Brand Guardian, and exactly-once.
- Do not set up recurring schedules from chat — that is backend configuration.
- Do not invent figures; the Superflow's retrieval supplies them, cited.
