# RAG Requirements Coverage — Hub SSoT vs the RFP Synthesis (PC2–PC5)

This document maps every RAG-related requirement in the RFP synthesis ("SSoT
Critical Points & Solution") to what the Hub SSoT demo actually implements
today. It covers two perspectives per the synthesis structure:

- **RAG technology** — retrieval, indexing, access control, taxonomy, honesty.
- **Application layer** — the five user journeys (PC4), data universe (PC3),
  and cost model (PC5) that sit on top of retrieval.

**Status legend**

| Status | Meaning |
| --- | --- |
| Covered | Implemented for real in the demo; behaviour is verifiable in the product. |
| Simulated | Implemented with the correct behaviour and interfaces, but the external system (Entra ID, Purview, Asana, ...) is faithfully simulated because no live connection exists. |
| Partial | Implemented, but with a stated limitation. |
| Gap | Not implemented; a plan is stated. |

---

## 1. PC2 — Access rights and taxonomy governance (RAG-tech core)

### 1.1 Access rights

| # | Requirement (from synthesis) | Status | How it is solved |
| --- | --- | --- | --- |
| A1 | Access = intersection of user axis (area/profile) × document axis (confidentiality), applied at index/retrieval time (early binding), never by the agent | Covered | A single resolver (`resolveDocAccess`, area × clearance) is the only access decision point. Clearance and area are injected as `must` filters into the Qdrant query itself; a chunk the persona cannot read never enters the candidate set, so it can never reach the model. |
| A2 | The LLM never filters, decides access, or sees blocked content | Covered | `permission_blocked` and `no_evidence` are decided deterministically *before* any model call and carry no snippets — only a classification label. Verified: a blocked question returns the refusal with zero citations and no model invocation. |
| A3 | User axis from Entra ID groups (area/profile with subgroups) | Simulated | Personas carry an Entra-ID-shaped group model (area + clearance rank). The persona is client-asserted — a demo-tier selector, not a real auth boundary. Production plan: Azure AD / Entra ID group claims resolved server-side per request; the resolver interface does not change. |
| A4 | Document axis from sensitivity labels (Purview/MIP), inherited from source | Simulated | Documents carry the RFP confidentiality vocabulary (`public / private / confidential / off_the_record`) with Purview/MIP-style inherited-label provenance shown in the Data drawer, and a source-sync job that propagates label changes (ACL delta sync). Production plan: read real MIP labels via Microsoft Graph during ingestion; same payload fields. |
| A5 | Honest attribution of *why* something is blocked | Covered | Blocks name the blocking axis (clearance, area, or both) and suggest a cleared persona — without revealing content. |
| A6 | Side channels must not leak (numeric facts, conflicts, corroboration, graph) | Covered | Every side channel goes through the same area+clearance resolver as retrieval. Numeric facts fail closed: a metric whose source document is missing is treated as inaccessible. |

### 1.2 Taxonomy / tagging

| # | Requirement | Status | How it is solved |
| --- | --- | --- | --- |
| T1 | Two-layer taxonomy: deterministic metadata + derived/semantic tags | Covered | Deterministic layer: country, brand, legal entity, year/quarter, doc type, confidentiality, owner, validity. Derived layer: strategic-axis assignments and topics. Both live as Qdrant point payloads. |
| T2 | Tags as versioned configuration, applied after embedding | Covered | Taxonomy versions are persisted configuration with an active pointer. Embeddings are computed once and are taxonomy-agnostic. |
| T3 | Re-tagging without re-embedding or redeploy | Covered | The governance panel runs the full loop: strategy edit → mapping → model-assisted re-classification proposals → human validation → apply. Applying is a metadata-only payload update on existing points — no re-embedding, no redeploy. The event log records "metadata only — no re-embedding". |
| T4 | Validity filter and conflict handling | Covered | Expired documents are hard-dropped at rerank; superseded documents answer with an explicit `historic` flag. Two permitted top sources that contradict each other on the same metric+period return a `conflict` status surfacing both — never a silent reconciliation. |

### 1.3 Retrieval quality (RAG-tech, implied by "reliable cited answers")

| # | Requirement | Status | How it is solved |
| --- | --- | --- | --- |
| R1 | Hybrid retrieval | Covered | Qdrant dense (semantic) + sparse BM25 vectors fused with Reciprocal Rank Fusion, with a native TF-IDF/BM25 fallback engine behind the same interface. |
| R2 | Answers only when evidence genuinely supports them | Covered | A coverage gate (`COVERAGE_MIN = 0.33` of the query's IDF mass) prevents generic brand words from making an unrelated document look like an answer. Below the gate → honest `no_evidence`. |
| R3 | Citation on every claim | Covered | Every claim carries an `[S#]` marker bound to a citation object (document, version, date, owner, confidentiality). Markers are parsed (including composites like `[S1, S2]`), stray/hallucinated markers stripped, then renumbered contiguously so text and citation chips never desync. |
| R4 | Retrieval auditability | Covered | Every retrieval writes an audit record (query, persona, filters, outcome classification) surfaced in Admin — the F3 retrieval log. |
| R5 | Conversation memory that respects governance | Covered | Sessions are persona-scoped; history is filtered by the current role so a lower-clearance persona never inherits a higher-clearance conversation. Permission is re-resolved on every turn. |
| R6 | Working documents (attachments) vs governed evidence | Covered | An attached document is session context only — never cited as `[S]`, never enters the corpus unless explicitly ingested through quarantine. |

---

## 2. PC3 — Data tree (corpus and ingestion)

| # | Requirement | Status | How it is solved |
| --- | --- | --- | --- |
| D1 | Category A (internal): calendars/milestones, quarterly results, HR/people, customer, research, USPs, ~48h talking points, brand guidelines | Covered | The synthetic corpus implements the full A tree with correct frequency, format, connector provenance and confidentiality per the synthesis Detail A table. |
| D2 | Category B (external): social listening, press, competitors, market/regulatory signals | Covered / Simulated | B-channel documents exist with connector provenance and pre-ingest relevance filters (keywords, competitors, executives, topics, sentiment) modelled per source. A live Perplexity-backed external-signal channel feeds the Radar. Live Asana/social APIs are simulated connectors. |
| D3 | Category C formats: Word / Excel / PPT / PDF / API / manual / SharePoint dump | Partial | Formats are represented as structured metadata + extracted content (the state a real parser would produce). Real binary parsing of Office files is not in the demo. Plan: ingestion workers (e.g. unstructured/Tika-class parsing) per format at the connector boundary; downstream pipeline unchanged. |
| D4 | Mandatory metadata (country, brand, legal entity, year/quarter, doc type, confidentiality, owner, validity) | Covered | Every document carries the full D schema; the Data Center corpus browser exposes it. |
| D5 | Category E: outputs the SSoT itself generates become governed documents | Covered | Saved/approved generated documents are written back into the corpus as governed E-category docs with lineage to their source documents, and their confidentiality is clamped to the most restrictive lineage source (missing source → `off_the_record`, fail closed). |
| D6 | Multi-language corpus (ES/EN/DE/PT) | Covered | The corpus is genuinely multilingual across all four languages with a validated distribution. |
| D7 | Manual ingestion (upload/URL) with governance | Covered | Ask attachments can be explicitly ingested; ingestion passes through a quarantine and validation queue (the Documentalist Desk) before entering the corpus. |
| D8 | Continuous sync with sources; label/ACL changes propagate | Simulated | A source-sync job simulates delta sync: label changes at the "source" propagate to payloads and are visible in provenance. Production plan: scheduled Graph/SharePoint delta queries driving the same payload-update path. |

---

## 3. PC4 — The five user journeys (application layer over RAG)

### 3.0 Cross-cutting navigation and chat

| # | Requirement | Status | How it is solved |
| --- | --- | --- | --- |
| X1 | HOME highlighting the 4 apps + cross-cutting conversational chat over all data | Covered | Home is a persona-aware front door with a hero ask bar; Ask is the cross-cutting agent. |
| X2 | Chat at two levels: global and embedded per module | Covered | Ask (global), KPI chat, and Planning chat all run the same governed pipeline with module scoping. |
| X3 | Canvas-style editing: chat plus direct inline editing | Covered | Generate offers section-level inline editing plus chat refinement; refine instructions are kept out of the retrieval coverage gate (separate gated pass) so chat wording cannot dilute relevance. |
| X4 | Multi-format export with corporate templates | Covered | Server-side authoritative DOCX / PPTX / PDF export; export re-validates brand rules and destination gates and re-derives citation confidentiality from the server corpus — client labels are never trusted. |
| X5 | Versioned saving with tags | Covered | Drafts save as versions with tags; scheduled documents bind export to a server-side approved content hash. |

### 3.1–3.5 The five cases

| Case | Requirement highlights | Status | How it is solved |
| --- | --- | --- | --- |
| 1 — Talking points | Dual filter (persona clearance AND destination confidentiality); citations with doc, version, date, owner; tone by audience; disclaimers; guardrails | Covered | Destination gate caps ALL retrieval (body and guidance) to the destination level before the model; visible exclusion notices; Brand Guardian enforces hard rules (no emoji, no unapproved superlatives, required disclaimers). |
| 2 — Press release + Q&A | Boilerplate and approved-quotes library; per-answer citations; internal notes that never export | Covered | Approved building blocks are governed corpus documents; each Q&A answer is individually cited; internal notes are structurally excluded from every export path. |
| 3 — Multi-format doc | Template library + natural-language template suggestion; permissions resolved BEFORE retrieval; hybrid RAG with data-level citation; charts generated from governed data; scheduler with review folder and approval | Covered | Template suggestion from an NL description; chart engine renders from cited numeric facts; scheduler routes to a review inbox; approval is server-authoritative (review item keyed by draft id AND content hash). |
| 4 — KPI tracking | Admin-configurable KPI definitions (versioned); combinable filters; drill-down with citation; embedded chat; forecast; threshold alerts; export via Case 3 | Covered | Versioned KPI definition store with append-only versions; deterministic calc engine over internal + external signals; per-owner deviation alerts with a notification trail; explicit forecast phrasing. |
| 5 — Predictive planning | Unified calendar over heterogeneous sources; conflict/overlap and gap detection; delay prediction; what-if simulation; event editing with sync-back; 10-day forecast via the document engine | Covered / Partial | Mutable planning overlay store, conflict and gap detection, delay-risk prediction, what-if cascade simulation, alerts, forecast into the review folder. Sync-back to the source system is simulated (`pending_confirmation` records); a real bidirectional Asana/calendar sync is a production item — flagged "to confirm" in the RFP itself. |

---

## 4. PC5 — Cost model

| # | Requirement | Status | How it is solved |
| --- | --- | --- | --- |
| C1 | Three cost blocks: one-time implementation, platform licence by seat bracket, usage/token consumption by seat bracket (50/100/150/200) | Covered | An interactive Admin cost configurator with a live seat selector and editable assumptions. Figures are labelled illustrative (the RFP marks real pricing as pending). |
| C2 | Usage grounded in real consumption | Covered | Server-side usage metering records real model token usage per module (ask, generate, KPIs, planning, wiki, data); the usage block of the cost model is driven by these measurements. |

---

## 5. Languages (cross-cutting requirement)

The corpus, users and outputs span ES / EN / DE / PT. Both levels the
requirement demands are implemented:

| # | Requirement | Status | How it is solved |
| --- | --- | --- | --- |
| L1 | Cross-language retrieval: a question in one language finds evidence in another | Covered / Partial | Two mechanisms: (1) dense semantic vectors are naturally cross-lingual; (2) the sparse/BM25 side uses a deterministic multilingual tokenizer — accent folding, ß normalisation, multilingual stopwords, and a curated ES/DE/PT→EN synonym map for high-value domain terms. The synonym map is curated, not a full translation layer; unusual vocabulary outside it relies on the dense side alone. Plan: grow the map from retrieval-log misses; optionally add query translation at the adapter boundary. |
| L2 | Product-level language selection | Covered | A global language selector in the top bar (Español / English / Deutsch / Português). It initialises from the browser language and drives the app shell (navigation, top bar, Ask header), the Home front door, and the default document language in Generate. |
| L3 | Answer language control | Covered | The Ask contract carries the selected language end-to-end (`lang` on the API). The agent composes its answer in the selected language regardless of the question's language, keeping proper nouns, document titles and citation markers intact. Deterministic refusal answers (`no_evidence`, `permission_blocked`) are served from localised copy in all four languages — they never touch the model. |
| L4 | Language-aware generation | Covered | Generate produces documents in any of the four languages; the brief's language defaults to the product language. |
| L5 | Full UI localisation of every page | Partial | The app shell, Home and Ask chrome are localised. Deep in-page copy (Data Center tables, Admin panels, the technical `permissionNote` detail) remains English. Plan: extend the same chrome dictionary progressively; all strings already flow through components, so this is mechanical work, not architecture. |

---

## 6. Honest gap register and plan

The demo's architecture was deliberately built so each simulated boundary can
be replaced without touching the agent, routes or UI:

| Gap | Today | Production plan |
| --- | --- | --- |
| Entra ID identity | Persona selector, client-asserted (demo tier) | Server-side Entra ID group claims per request feeding the same `resolveDocAccess` resolver. No change to retrieval or agent code. |
| Purview/MIP labels | Simulated inherited-label provenance + delta sync | Read real MIP labels via Microsoft Graph at ingestion; identical payload fields. |
| Live connectors (Asana, SharePoint, social listening) | Faithful simulations with correct provenance, frequency and pre-ingest filters; live Perplexity external-signal channel | Connector workers writing into the existing quarantine → validation → corpus path. |
| Office binary parsing | Structured extracted-content representation | Format parsers at the connector boundary; downstream pipeline unchanged. |
| Multi-LLM on Telefónica Azure | Claude behind Lyzr-named adapter interfaces (`kb`, `kg`, `numeric`, `text`) | Swap the adapter implementation to Lyzr / Azure OpenAI; the agent and routes are already engine-agnostic. A sync script that pushes the corpus to a Lyzr KB already exists (needs `LYZR_API_KEY` / `LYZR_RAG_ID`). |
| Bidirectional calendar sync | One-way + simulated sync-back with `pending_confirmation` | Real write-back through the Asana/calendar connector; the RFP itself marks this "to confirm". |
| Cross-language sparse matching | Curated synonym map + cross-lingual dense vectors | Grow the map from retrieval-log misses; optionally query translation in the tokenizer adapter. |
| Full UI localisation | Shell + Home + Ask chrome in 4 languages | Extend the existing chrome dictionary page by page. |

**Why the gaps are safe to state:** every governance behaviour the RFP scores
— early binding, no LLM filtering, taxonomy-as-configuration, citation
integrity, honest refusals, fail-closed confidentiality — is real in the demo,
not mocked. What is simulated is only the *external plumbing* (identity
provider, label source, connectors), each isolated behind an interface that a
production integration slots into.
