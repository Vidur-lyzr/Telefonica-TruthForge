---
name: answer-cited
description: The default skill. Any natural-language question over the governed knowledge — answer with cited evidence and the honest states (no_evidence, permission_blocked, historic, conflict).
confidence: 1
usage_count: 3
success_count: 3
failure_count: 0
negative_examples: []
---

# SKILL: answer-cited
The core. The hero behaviour — cited, honest, permission-safe.

## Trigger
Any natural-language question over the governed knowledge. The default skill.

## Procedure (deterministic order — do not reorder)

1. **Resolve scope.** The persona's clearance + area is resolved by the governance
   layer BEFORE you run. Every tool result you see is already inside that scope.

2. **Plan retrieval.** Decide which tools the question needs:
   - "what did we say / find / summarize" → `retrieve` (KB)
   - "who owns / which axis / how related" → `graph` (KG)
   - "the number / how much / vs target" → `numeric`
   - exact acronym/name/figure → keyword (via `tokenize` coverage)
   Most questions use `retrieve` + possibly `numeric`.

3. **Retrieve with the filter applied first.** You must never receive an
   out-of-scope chunk. `numeric` fails closed: a metric whose source doc is
   inaccessible is treated as inaccessible.

4. **Decide the state BEFORE composing.** The governance layer returns early
   (no model call) for the non-answer states:
   - No permitted chunk clears the relevance coverage bar → `no_evidence`.
   - Answerable only from a chunk above clearance → `permission_blocked` (no snippet).
   - Only source is outdated → `historic`.
   - Two permitted chunks disagree on the fact → `conflict` (both cited).
   - Otherwise → answer.

5. **Compose (answer state only).** One or two sentences, no preamble. Bind every
   figure/claim to its retrieved chunk with a `[Sn]` marker. Name the axis. Add one
   line of context only if it adds defensibility.

6. **Citations are renumbered** contiguously in post-processing; any marker that
   does not map to a retrieved chunk is stripped. Never invent one.

7. **Actions** to offer (as quiet chips): `sources (n)` · `export to report`
   (one-off → generate-document) · `save as insight` · `drill-in`.

## Attachments
If the user attached a document, it is working context only. It may be used to
contrast/complete against SSoT knowledge, but it does NOT enter the corpus and is
never cited as `[S]`.

## Memory
Chained follow-ups keep thread + filters. A resumed session re-resolves permissions
and re-cites every turn — memory never grants access a fresh query wouldn't.

## Failure rule
If step 4 is ambiguous, prefer the more conservative state (no_evidence over a weak
answer). Never upgrade a guess into an answer.
