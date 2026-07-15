# Hub SSoT — RFP Compliance Report

**Telefónica Single Source of Truth · Requirement-by-requirement status**
Date: 15 July 2026 · Scope: all requirements in sections A–L and all critical points CP-01–CP-29 (Block B)

---

## How to read this report

Each requirement is assessed against what the platform does **today**, honestly. The status column uses the RFP's own S/P/N convention:

| Status | Meaning |
| --- | --- |
| **S** | Fully demonstrated — working in the platform right now, you can experience it end to end |
| **P** | Partially demonstrated — the pattern and UX are working, but part of it is simulated (e.g. a connector) or demo-tier |
| **N** | Not in the demo — either a contractual/vendor matter or not yet built |

Three demo-tier caveats apply throughout and are called out where relevant:

1. **Hosting** — the demo runs on Replit, not on Telefónica's Azure tenant. The stack (Node/Express, static React, Qdrant Cloud vector DB, LLM via API) is standard and portable.
2. **Identity** — personas (Elena Ruiz, Carmen Vega, Lucía Navarro, etc.) are selected in the UI, not authenticated via Entra ID. Everything downstream of persona selection (permission filtering, refusals, audit) is real and server-enforced.
3. **Connectors** — SharePoint, Asana, Excel, social listening are represented by realistic simulations with the full governance flow; live acquisition via Perplexity and manual upload are real.

**Score summary (sections A–L, 47 requirements):** 33 S · 11 P · 3 N. The three N items are all in section L (evaluation and feedback loop) — this is the single biggest build gap and is the top recommendation below.

---

## A · Architecture & platform

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| A1 | Deployable on Telefónica's certified corporate Azure | **P** | Not experienceable in the demo (runs on Replit). Admin → Agent shows the backend's introspectable architecture. | The stack is Azure-portable by design: stateless Node API, static frontend, managed vector DB, API-based LLM. **Improvement:** produce an Azure reference architecture (App Service/AKS + Azure AI Search or Qdrant on AKS + Entra ID) and a containerized build. |
| A2 | Open, flexible architecture (not a closed single-vendor solution) | **S** | Admin → Agent tab: inspect the agent's tools, knowledge files and orchestration. The retrieval, graph, numeric and text engines sit behind vendor-neutral adapter interfaces. | The entire backend is behind Lyzr-shaped adapter interfaces, so the engine can be swapped (Lyzr, Azure AI Search, other) without touching agents, routes or UI. The OpenAPI contract is the source of truth. |
| A3 | Multi-LLM orchestration; best model per task ("LLM integrator") | **P** | Ask a question → composed by Claude. KPIs → alerts and forecasts are deterministic engines (no LLM). Ask about recent market news → Perplexity Sonar is used as a live web tool. | Task-based routing exists (composition LLM, live-web model, deterministic math for numbers — numbers are never left to an LLM). What's missing is a config-driven model registry to swap models per task. **Improvement:** add a model-routing config surface in Admin. |
| A4 | Scalable and extensible in functionality | **S** | The platform grew from a chat demo to eight modules (Ask, Generate, KPIs, Planning, Wiki, Data Center, Brand, Admin) on one contract-first architecture; the corpus grew to 156 documents with no redesign. | Modular monorepo, contract-first API, adapter seams. Scale-out of the vector store is delegated to Qdrant Cloud (managed). |
| A5 | Closed circuit: the AI is not trained on Telefónica's data | **S** | Every answer is retrieval-grounded at request time — delete a document from the Data Center and it immediately stops being citable. Nothing is fine-tuned. | The platform never trains or fine-tunes on corpus data; models are called via API with retrieved context only. The contractual no-train guarantee from the LLM vendor is CP-02 (vendor matter). |
| A6 | Cloud operation with availability / capacity / security / continuity | **P** | Vector store runs on Qdrant Cloud (managed, replicated). The app itself is demo-tier hosting. | **Improvement:** production deployment with SLOs, health probes, backup/restore runbook — pairs with A1. |
| A7 | Multi-language: ES · EN · DE · PT-Brazil (ingest and generate) | **S** | Switch the UI language (top bar) between EN/ES/DE/PT — the entire product is localized. Ask a question in German about a Spanish document: retrieval crosses languages and the answer comes back in German. | Cross-language retrieval uses a curated multilingual synonym tokenizer (accent-folded) plus dense semantic vectors; refusal messages are localized in all four languages; the corpus itself is mixed-language. |

## B · SSoT agent (conversational)

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| B1 | Conversational chatbot over any ingested data | **S** | Ask page: ask anything over the 156-document governed corpus. Upload a document in Data Center → it is askable within seconds. | Conversation memory is persona-scoped: switching to a lower-clearance persona never inherits a higher-clearance conversation. |
| B2 | Hybrid retrieval (keyword + semantic + re-ranking) | **S** | Ask a keyword-heavy question (exact metric names) and a paraphrased conceptual one — both land on the right sources. Admin → Retrieval log shows the hybrid engine, scores and filters per query. | Dense semantic vectors (MiniLM, Qdrant Cloud) + sparse BM25 keyword scoring, fused with Reciprocal Rank Fusion, then gated by a query-coverage relevance check that blocks red-herring matches. **Improvement:** an optional cross-encoder re-ranking stage for long-tail precision. |
| B3 | Grounding + mandatory source citation with traceability | **S** | Every answer carries numbered citation chips. Click one: document, exact location (e.g. "slide 4"), verbatim snippet, confidence, confidentiality, validity and version. | Full traceability: Admin → Retrieval log records who asked what, under which persona and clearance, which chunks were retrieved, and whether access was permitted or blocked. Hallucinated citation markers are stripped and renumbered server-side, so chips never desync. |
| B4 | Answers aligned to the 5 axes; do not invent when there is no evidence | **S** | Every answer is tagged with the strategic axes of its cited sources. Ask something the corpus cannot support (e.g. an invented product): you get an explicit "no evidence" refusal — before any model is even called. | The no-evidence decision is deterministic and precedes the LLM, so the model never gets the chance to invent. Conflicting sources produce an explicit "conflict" state showing both figures. |
| B5 | Answer filtered by the user's permissions and confidentiality | **S** | Switch persona to Elena Ruiz (Press, public clearance) and ask about confidential financials → "permission blocked", with zero content leaked. Switch to Carmen Vega (confidential clearance) → full answer. | Clearance and area filters are injected **inside the vector-store query**: unpermitted chunks never leave the database and never reach the model. This is the strongest possible enforcement point. Persona selection itself is demo-tier (see caveat 2); wire-up to Entra ID is the production step. |

## C · Document generation

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| C1 | Talking points, press releases, Q&A, dossiers, conclusions | **S** | Generate page: pick a shape — Messaging house, Talking points, Press release, Q&A / holding lines, Dossier/report, KPI report, 10-day forecast — and a topic; the draft is composed from governed, cited evidence. | Q&A drafts include internal-only spokesperson guidance that is automatically stripped from external exports. |
| C2 | Multi-format: PPT, Word, charts | **S** | Open a draft → Export: DOCX, PPTX, PDF (plus MD/TXT), or a ZIP pack of all formats. KPI-bearing documents include deterministic charts (line/bar/stacked) and governed data tables. | Charts are rendered from governed numeric data by a deterministic engine — never drawn by the LLM — so figures cannot be invented. |
| C3 | On-brand: corporate templates + brand guidelines | **S** | Generate any draft: the Brand Guardian gate flags unapproved superlatives ("European leader"), missing mandatory disclaimers, emoji, shouted headings and non-European spelling. Brand page: edit export templates in a live WYSIWYG editor. | Template structure is corporate-fixed; labels, notes and visual design are editable by brand owners. |
| C4 | No limit on the number of documents | **S** | Generate as many drafts as you like; Admin → Usage shows token consumption per module. | No product cap. Production cost control is a pricing question (CP-18). |
| C5 | Scheduled reports (forecasts, weekly and half-yearly summaries) | **S** | Admin → Schedules: create a daily/weekly/monthly recurring document. Runs land in Generate → Review Inbox and **cannot be exported or saved until a human approves**. | Approval is bound to a content hash server-side: any edit after approval voids it. Half-yearly cadence can be added trivially to the frequency options. |
| C6 | Outputs focused on the 5 axes | **S** | When generating, scope the draft to one or more strategic axes; evidence retrieval is filtered by axis and the draft is structured per axis. | |
| C7 | Content forecasts for the next 10 days | **S** | Generate → 10-day forecast (or Planning → Forecast): a day-by-day outlook built from the planning calendar, with detected conflicts, risks, signals and prepared lines for each upcoming event. | |

## D · KPIs

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| D1 | KPI / objectives tracking dashboard | **S** | KPIs page: cards with current value, target, progress %, variation, sparkline, linked objective; deterministic alerts (amber/critical/forecast) with admin-configurable thresholds. | Alert delivery to Teams/Email is recorded but simulated (no live Teams webhook in the demo). |
| D2 | Filters (topic, date…) | **S** | KPIs page: filter by strategic axis, market, brand, source, initiative type and objective; periods week/month/quarter or a custom date range. | |
| D3 | Cross-referencing ingested + external info (social media, news) | **P** | Open a KPI's evidence panel: internal governed sources side by side with external mentions. Ask the KPI assistant about recent market context → live web results via Perplexity, clearly labelled as ungoverned external material. | Live news/web acquisition is real (Perplexity, with a relevance filter before ingest). The social-listening feed itself is synthetic. **Improvement:** connect a real social listening source (e.g. Talkwalker API) through the existing filter-before-ingest gate. |

## E · Planning

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| E1 | Integrated Communications + Brand calendar | **S** | Planning page: one calendar across Comunicación, Marca and Gabinete — campaigns, milestones, events, publications — in month/week/day views, permission-filtered per persona. | |
| E2 | Integration of heterogeneous sources (Excel, Asana…) | **P** | Planning → Sources: Asana, Excel, Google Calendar, Jira, Confluence connectors shown with sync state and provenance per event. | Connectors are read-only simulations demonstrating the full governance flow. **Improvement:** implement one real connector first (Asana API is the natural candidate) — the internal contract is already in place. |
| E3 | Predictive capability | **S** | Planning → Predictions: heavy-workload periods, suggested quiet windows for new activity, upcoming near-miss conflicts, delay-risk flags. Drag/move an event → a what-if simulation reports resolved conflicts, newly created conflicts and near-misses **before** you commit. | This, plus the 10-day forecast (C7), covers CP-27 fully. |

## F · Data centre / Metadata space

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| F1 | Review / modify sources and connections | **S** | Data Center → Sources: live (Perplexity), manual (upload) and planned connections with status; per-document lineage from source file through every pipeline stage. | |
| F2 | AI metadata + information-specialist review (human-in-the-loop) | **S** | Data Center → Ingestion: 7-stage pipeline (intake → extract → classify → govern → chunk → embed → validate). AI-proposed metadata lands in the Validation queue for human review; documents with missing mandatory metadata are held in Quarantine and cannot progress. | Conflict flags (e.g. figures disagreeing with an existing source) are raised at validation time, before the document can pollute answers. |
| F3 | SLA per document / data item to keep it up to date | **S** | Data Center → Governance → Freshness: every document has a review SLA (e.g. 6-month cycle); overdue documents are listed with owner and days overdue. | **Improvement:** notify owners automatically when a document breaches its SLA (currently visible, not pushed). |

## G · Administration

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| G1 | User and permission management (create / remove / grant / revoke) | **P** | Admin → Users: all users with area, clearance and profile. Admin → Visibility: pick any user and see exactly which documents the real access engine grants them — the definitive permission truth-teller. | Viewing and inspecting is fully live; creating/removing users and granting/revoking rights is not interactive in the demo (in production this belongs to Entra ID anyway). **Improvement:** make user CRUD interactive in the demo so the audit trail ("permission changed") can be triggered live. |
| G2 | Profile management | **S** | Admin → Profiles: Superadmin, Admin, Editor, Audit — each with its capability set; every user card shows profile + area + clearance. | |
| G3 | Scheduling and automation of repetitive content | **S** | Admin → Schedules: create/pause recurring documents (frequency, time, shape, axes, review folder). Runs appear in the Review Inbox for approval. | Same server-authoritative approval gate as C5. |

## H · Brand Room

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| H1 | Brand owners train the agents | **S** | Brand page → Guardian skill: brand owners edit the Brand Guardian's instructions directly (the "agent skill"); the change takes effect on the next generation with no redeploy. | This is genuine agent training-by-configuration, in the owner's hands. |
| H2 | Loading of guidelines, resources, templates and tone of voice | **S** | Brand page: tone-of-voice principles, brand templates (structure) and export templates (visual), editable in a live WYSIWYG editor. | |
| H3 | Brand Guardianship: ensure and correct off-brand outputs | **S** | Generate an off-brand draft (e.g. include "we are the number one operator"): the Guardian flags the unapproved claim, missing disclaimers, emoji, shouted headings, US spellings — and the draft cannot pass approval until corrected. | Detection and blocking are server-side, so they cannot be bypassed from the UI. |

## I · Profiles & confidentiality

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| I1 | Profiles: Superadmin / Admin / Editor / Audit | **S** | Admin → Profiles. All four exist and are assigned to users. | |
| I2 | Profiles that can be combined and unified | **P** | Each persona already combines three dimensions: profile (role) + area + clearance — e.g. Lucía Navarro works cross-area with a super-user profile. | Assigning multiple profiles to one user and unifying them is not exposed as a UI operation. **Improvement:** a profile-composition editor in Admin. |
| I3 | Permissions by area (working across areas by permission) | **S** | Switch personas: Elena (Comunicación only) vs Lucía (cross-area). Ask the same question — retrieval scope changes accordingly; Admin → Visibility shows the exact per-area document sets. | |
| I4 | Public / private / confidential levels (Microsoft labels) | **P** | All four levels (public / private / confidential / off-the-record) are enforced end to end: retrieval, answers, generation, export. Admin → Source sync: change a document's sensitivity label at the "source system" and watch the label propagate to the index (fail-closed). | The levels themselves are fully working; the propagation from Microsoft Purview sensitivity labels is simulated. **Improvement:** real Entra ID + Microsoft Information Protection integration (see CP-14). |
| I5 | Audit: traceability of who uploads / modifies / consults | **S** | Admin → Audit: uploads, permission changes, schedule events. Admin → Retrieval log: every consultation — who, which persona, which chunks, permitted or blocked. Data Center: per-document lineage. Admin → Usage: consumption per module. | Consultation-level audit (retrieval log) is stronger than the requirement asks — it records blocked attempts too. |

## J · Ingestion, sources & formats

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| J1 | Internal sources (Asana, results, People, clients, USP, brand) | **P** | The corpus contains all these source families with realistic provenance (source system, format, owner); Data Center shows each document's origin. | Represented via simulation; live connectors pending (same path as E2). |
| J2 | External sources (social listening, social media, SIC, competitors, sector) | **P** | Data Center → Sources → Live capture: real public-web acquisition via Perplexity, scoped by keywords/competitors/executives. KPI mentions panel shows social/news mentions (synthetic). | Live news capture is real; social-listening platforms are simulated. |
| J3 | API connectors + relevance filter on social media | **P** | Data Center → Live capture: the filter-before-ingest gate is real and demonstrable — irrelevant material is rejected before entering the pipeline, with the rejection visible. | The relevance-filter pattern (the hard part) is proven; specific social APIs are pending. |
| J4 | Word / Excel (structured extraction + versions) / PDF / PPT | **P** | Upload PDF, DOCX, TXT or MD via Data Center → Upload — parsed, chunked, embedded and askable in seconds. The corpus also contains documents whose provenance is "Excel numeric" and "self-explanatory PPT", with structured numeric facts extracted from the Excel-type sources. | Live parsing covers PDF/DOCX/TXT/MD. **Improvement:** add live XLSX (structured table extraction) and PPTX parsers to the upload path — the downstream pipeline already handles their content types. |
| J5 | Manual ingestion of news | **S** | Data Center → Upload (drag-and-drop, with owner, type, topics, axes) or Live capture → review → accept. Either way the item is immediately governed and citable. | |
| J6 | Migration of the current SharePoint SSoT, with no document cap | **P** | Admin → Source sync: simulated SharePoint batch sync with dry-run preview (see exactly what would change before committing) and fail-closed ACL propagation. | The migration mechanics (dry run, label mapping, ACL fail-closed) are demonstrated; connecting a real SharePoint tenant is the production step. No architectural document cap exists. |

## K · Taxonomy & metadata

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| K1 | Taxonomy aligned to the 5 Transform & Grow axes | **S** | The five axes structure everything: answers, generation, KPIs, planning, the Wiki knowledge graph, and Data Center governance. | |
| K2 | Easily adaptable if the axes change | **S** | Data Center → Governance → Reclassification wizard: rename, split or merge axes; apply re-tagging across the corpus **without recomputing a single embedding** (metadata is payload-only); every taxonomy change is versioned with rollback. | This is the platform's direct answer to CP-22 — taxonomy-as-configuration, proven live. |
| K3 | Minimum metadata (country/brand/legal/year-quarter/type/confid./owner/validity) | **S** | Open any document in Data Center: country, brand, quarter, type, confidentiality, owner, validity (plus category). Quarantine enforces these as mandatory. | A dedicated "legal" flag is not a separate field today (confidentiality + type cover most cases). **Improvement:** add an explicit legal-hold/legal-review flag. |
| K4 | Accuracy: if not current, treat as historical | **S** | Ask about a superseded figure: the answer is explicitly labelled as historic, citing the superseded document and pointing to the current version. | Honest-historic is a first-class answer state, not a footnote. |
| K5 | Version control (always the latest valid version) | **S** | Documents carry supersession chains; retrieval prefers the latest valid version; generated documents also save as version chains with tags (see CP-29). | |

## L · Quality & feedback (RAG)

| ID | Requirement | Status | How to experience it | Notes & improvements |
| --- | --- | --- | --- | --- |
| L1 | Weekly evaluation of 50–200 Q (accuracy, citation, hallucination, latency) | **N** | Not in the platform today. | **Top build recommendation.** The ingredients exist (retrieval log, deterministic refusal states, citation verification) — what's missing is the harness: a golden question set, a scheduled batch runner, and a scorecard dashboard (answer accuracy, citation correctness, hallucination rate, latency percentiles). |
| L2 | Feedback: correct / partial / incorrect / fabricated | **N** | Not in the platform today — answers have no feedback buttons. | **Improvement:** add a four-way feedback control on every Ask answer, stored with the full retrieval trace so each report is reproducible. |
| L3 | Error classification + corrective action + re-evaluation | **N** | Not built as a loop. Related pieces exist: conflict detection blocks contradictory answers, and the editor offers "update version" / "resolve conflict" corrective actions on drafts. | **Improvement:** triage queue that turns L2 feedback into classified errors (retrieval miss, stale source, bad citation, model error), links a corrective action, and re-runs the affected golden questions. |
| L4 | Human filter: owner responsible for reviewing the AI Results | **S** | Two live gates: (1) Generate → Review Inbox — no scheduled/generated document can be exported or saved until a named human approves the exact reviewed content; (2) Data Center → Validation queue — no ingested item enters the corpus without human sign-off. | |

---

## Block B · Critical points (CP-01 – CP-29)

Block B is a list of questions **for the platform vendor (Lyzr)**. They split into two kinds: contractual/commercial points that no demo can prove (flagged "vendor question"), and functional capabilities — most of which this platform already demonstrates natively, which materially de-risks the vendor answer: if Lyzr's response on any functional point is weak, the demo proves the capability can live in Telefónica's own experience layer instead.

### Blockers (tender clauses)

| CP | Point | Assessment |
| --- | --- | --- |
| CP-01 | Closed-circuit deployment in Telefónica's Azure | **Vendor question.** What the demo proves: every governance control (permission filtering, refusals, audit, brand gates) is enforced in **our** layer, outside the LLM/vendor, so the sovereignty perimeter does not depend on the vendor's deployment model. |
| CP-02 | Contractual no-train guarantee | **Vendor question.** The demo's design already assumes no training: retrieval-grounded, API-only inference, nothing fine-tuned (see A5). |
| CP-03 | EU data residency | **Vendor question.** Demo note: the vector store region is configurable (Qdrant Cloud); an EU region should be specified for production. |
| CP-04 | IP of results | **Vendor/legal question.** Platform-vs-outputs separation is clean in our architecture: outputs live in Telefónica's repository with full lineage. |
| CP-05 | AI liability / indemnification | **Vendor/legal question.** Not demonstrable in software. |

### Fit with the evaluation grid

| CP | Point | Assessment |
| --- | --- | --- |
| CP-06 | Open architecture / multi-LLM, task-based routing | **Partially demonstrated here** (see A3): different engines per task (composition LLM, live-web model, deterministic numerics), swappable behind adapters. A config-driven model registry is the remaining step. |
| CP-07 | Lock-in / exportability / exit strategy | **Demonstrated by design.** All documents, chunks, metadata and configuration live in inspectable, exportable structures; embeddings use a standard open model (MiniLM) so they are reproducible anywhere; the adapter layer is the exit strategy — the engine can be replaced without touching the product. |
| CP-08 | Client self-sufficiency without Lyzr/Accenture | **Demonstrated.** Sources, taxonomy (reclassification wizard), permissions (admin console) and the Brand Room (guardian training, templates) are all managed in-product by Telefónica roles. |
| CP-09 | UX: is the vendor UI the final look & feel? | **Demonstrated.** This platform **is** the experience layer — built entirely on Telefónica's own Mística design system. Whatever the vendor answers, the final look & feel does not depend on their UI. |

### Functional capabilities to confirm

| CP | Point | Assessment |
| --- | --- | --- |
| CP-10 | Grounding, citation-level traceability, confidence, "no evidence" | **Demonstrated** (B3/B4): per-claim citations with location and snippet, confidence scores, corroboration counts, deterministic no-evidence refusals. |
| CP-11 | Hybrid RAG (keyword + semantic + re-ranking) | **Demonstrated** (B2): dense + BM25 + RRF on Qdrant, coverage gating; engine-agnostic behind the adapter. |
| CP-12 | Connectors (SharePoint, Teams, Asana, Dynamics, SAP, Talkwalker), structured Excel | **Partial** (E2/J1–J4): full governance flow proven with simulated connectors + real manual/live ingestion; real connector implementations are the production step. |
| CP-13 | AI metadata + human-in-the-loop + versioning | **Demonstrated** (F2/K5): pipeline with AI classification, validation queue, quarantine, supersession chains. |
| CP-14 | Granular RBAC + confidentiality levels + Entra ID + MS labels | **Levels and RBAC demonstrated** (B5/I3/I4) with enforcement inside the retrieval query. Entra ID and Microsoft Purview label sync are the production integration (label propagation is simulated today, fail-closed). |
| CP-15 | Native ES/EN/DE/PT in ingestion and generation | **Demonstrated** (A7). |
| CP-16 | On-brand multi-format generation (Word/PPT/PDF + guardrails) | **Demonstrated in our layer** (C2/C3) — which is itself the answer: even if the vendor lacks this, it is already built on top. |
| CP-17 | Evaluation/observability (accuracy, citation, hallucination metrics) | **Not demonstrated** — same gap as L1–L3, the top build priority. Raw observability (retrieval log, usage meter) already exists to feed it. |

### Commercial & maturity

| CP | Point | Assessment |
| --- | --- | --- |
| CP-18 | Pricing model and cost at 50/100/150/200 users | **Vendor question.** The demo's usage meter (tokens per module) is the right instrument for validating any per-token pricing. |
| CP-19 | SOC2 / ISO 27001 / GDPR / IP indemnification | **Vendor question.** |
| CP-20 | SLA 24x7, resolution < 24h | **Vendor/managed-service question.** |
| CP-21 | Enterprise references (telco/regulated) | **Vendor question.** |

### Features to validate (PC2 & PC4)

| CP | Point | Assessment |
| --- | --- | --- |
| CP-22 ⭐ | Re-labelling without re-embeddings; taxonomy-as-configuration | **Fully demonstrated — the star requirement works today.** Tags/metadata live as payload alongside the vectors, never inside them. The reclassification wizard renames/splits/merges axes and re-tags the whole corpus via metadata-only updates — zero re-embedding, zero redeploy, versioned with rollback. Experience it: Data Center → Governance → Reclassification. |
| CP-23 | Canvas-style editing (conversational + inline) | **Demonstrated.** The Governed Canvas offers inline rich-text editing plus block-level conversational refinement ("shorten this", "sharpen tone"), with live corpus-aware suggestions (update version, resolve conflict) — all in Telefónica's own white-label UI. |
| CP-24 | Chart generation from data, inside documents | **Demonstrated** (C2): deterministic chart engine, charts embedded in DOCX/PPTX/PDF exports. |
| CP-25 | Scheduler for recurring documents + review folder before publishing | **Demonstrated** (C5/G3): scheduler + Review Inbox with a server-authoritative approval gate bound to content hash. |
| CP-26 | Embedded conversational window per module | **Demonstrated:** Planning has its own calendar-scoped assistant, KPIs a metrics-scoped assistant, the Wiki a graph search agent, the editor a canvas agent — each scoped to its module's data, alongside the cross-cutting Ask. |
| CP-27 | Predictive & forecasting: (a) KPI projections; (b) planning conflicts + cascade | **Demonstrated:** (a) KPI forecasts project period close from historical series with deviation-risk flags; (b) Planning detects conflicts and simulates the cascade of moving an event before committing (E3). |
| CP-28 | Calendar integration (Asana/Excel) + two-way sync | **Partial:** integration and provenance are demonstrated read-only; write-back to the source system is not implemented. Improvement: pair with the first real connector (E2). |
| CP-29 | Versioned saving with tags for each output | **Demonstrated:** every saved output gets deterministic tags (shape, charts, axes), a version chain with predecessor links, persona-scoped visibility, and export lineage. |

---

## Priority improvements (recommended order)

1. **Build the evaluation & feedback loop (L1, L2, L3, CP-17)** — the only fully missing section. Golden question set (50–200 Q), scheduled batch evaluation scoring accuracy / citation correctness / hallucination / latency, four-way answer feedback, error triage with re-evaluation. Highest RFP impact per unit of effort, and the retrieval log already provides the raw material.
2. **First real connector + two-way sync (E2, J1, J6, CP-12, CP-28)** — implement one live connector end to end (Asana or SharePoint) through the already-proven governance flow, including write-back for calendar items. Converts a whole family of P statuses to S.
3. **Live Excel/PPT parsing in upload (J4)** — add XLSX structured-table extraction and PPTX text extraction to the existing upload pipeline.
4. **Interactive user administration (G1, I2)** — make create/remove/grant/revoke and profile composition operable in the demo, feeding the existing audit trail.
5. **Entra ID + Microsoft sensitivity labels (I4, CP-14)** — replace the demo persona selector with real identity, and the simulated label sync with Purview integration. This is the main step from "demo tier" to "production tier" for governance.
6. **Model-routing configuration (A3, CP-06)** — an Admin surface to assign models per task, defending the "LLM integrator" claim visibly.
7. **Azure reference deployment (A1, A6)** — containerized build, reference architecture on Telefónica's tenant, SLOs and continuity runbook.
8. **Experience polish for the demo script** — a guided "governance tour" (one button that walks a visitor through: blocked answer → persona switch → cited answer → historic answer → conflict) would make the platform's strongest differentiators impossible to miss in a live evaluation.

## Bottom line

Of the 47 functional requirements in sections A–L, 33 are fully demonstrated and working in the platform today, 11 are partially demonstrated (mostly awaiting real connectors or production identity), and only the 3 evaluation-loop requirements are unbuilt. Every one of the eight "features to validate" in Block B (CP-22–CP-29) — including the starred re-labelling-without-re-embeddings question that "decides the viability of taxonomy-as-configuration" — is demonstrated, six of them fully. The platform's distinctive strength versus the RFP is that governance (permissions, refusals, brand gates, approval gates, audit) is enforced server-side in Telefónica's own layer, independent of any vendor decision still pending in Block B.
