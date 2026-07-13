---
name: Ask document-request routing
description: Why chat document generation needs its own router intent and a router-resolved topic, separate from in-chat report mode.
---

# Ask document-request routing

Rule: turns asking for a downloadable deliverable (talking points doc, press release, Q&A, deck, or naming file formats) must route to a dedicated `document_request` intent whose compose prompt instructs the model to call the doc-gen Superflow tool — never reuse `report_request`.

**Why:** report mode's compose instruction explicitly forbids the Superflow (to keep in-chat reports in-chat), so lumping document asks into it makes the file pipeline unreachable: the model obediently writes the document in chat and no file card ever appears.

**How to apply:** a `documentish` wording check forces such turns through the router even when raw wording passes the coverage gate; a report classification that names file formats is upgraded to document mode; and the Superflow bridge must receive the ROUTER-resolved topical query as the topic — passing the raw question (or model-echoed wording like "as docx and pdf") dilutes the generate pipeline's coverage-gated retrieval into a false no_evidence (see coverage-ratio-dilution).
