# Hub SSoT

A governed, agentic Single Source of Truth for Telefónica's Communication & Brand teams. Users ask questions in natural language and get answers that are always backed by cited evidence from a governed knowledge core — or an honest "no evidence", "permission blocked", or "historic source" response when a confident, permitted answer is not possible.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/<slug> run typecheck` — typecheck a single package (prefer over `build`, which needs workflow-provided env)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Workflows (start/restart via the workflows tooling, not root `pnpm dev`):
  - `artifacts/api-server: API Server`
  - `artifacts/hub-ssot: web`
- Required env: `ANTHROPIC_*` is provided by the Replit Anthropic integration (no key handling needed). No database is used.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (async handlers; `req.log`, never `console.log`)
- Frontend: React + Vite, official Mística React library (@telefonica/mistica, Telefónica skin) — no Tailwind/shadcn/lucide; all styling via skinVars tokens
- Answer composition: Claude (`claude-sonnet-4-6`) via the Replit Anthropic integration
- Retrieval: Qdrant Cloud hybrid (dense all-MiniLM-L6-v2 384-d via Cloud Inference + sparse BM25, RRF fusion, collection `hub_ssot_chunks`) with governance must-filters inside the query; native TF-IDF/BM25 engine is a dev-only fallback when Qdrant is unconfigured. All agents retrieve via `retrieveGoverned` in `adapters/kb.ts` — never call the native `retrieve` directly from agents. Re-seed with `pnpm --filter @workspace/api-server run qdrant:seed` after corpus changes (idempotent). No SQL database.
- Validation: Zod (`zod/v4`); API codegen via Orval from the OpenAPI spec

## Where things live

- Contract: `lib/api-spec/openapi.yaml` (source of truth); generated Zod in `lib/api-zod`, React Query hooks in `lib/api-client-react`. Do not change OpenAPI `info.title` (drives generated filenames).
- Backend (`artifacts/api-server/src`):
  - `data/corpus.ts` — all seed data: docs, chunks, axes, roles/clearances, numeric facts, graph, suggestions
  - `adapters/` — Lyzr-named interfaces over the native engine: `kb` (retrieve), `kg` (traverse), `numeric` (query), `text` (tokenize/idf)
  - `agent/askAgent.ts` — orchestration: permission-filtered retrieval, status decision, Claude composition, citation numbering
  - `routes/ask.ts`, `routes/knowledge.ts`, `routes/index.ts`
- Frontend (`artifacts/hub-ssot/src`): `index.css` holds the Telefónica design tokens; `DESIGN_SYSTEM.md` documents them.
- Anthropic client: `lib/integrations-anthropic-ai` (client only, no DB schema).

## Architecture decisions

- Governance is enforced by filtering retrieved chunks by the persona's clearance BEFORE any chunk reaches the model. `permission_blocked` and `no_evidence` return before any Claude call and carry no snippets — only a classification label.
- Relevance uses a query-idf-COVERAGE ratio (`COVERAGE_MIN`), not an absolute BM25 threshold, so generic brand words ("Telefónica") or stray verbs ("strategy") cannot make an unrelated public doc look like an answer. See `.agents/memory/`.
- Numeric-fact confidentiality fails closed: a metric whose source doc is missing is treated as inaccessible.
- Citation markers are parsed with a regex that handles composite markers (`[S1, S2]`) and strips stray/hallucinated markers, then renumbered contiguously so text markers and citation chips never desync.
- The backend is native (local retrieval + Claude) behind Lyzr-named adapter interfaces so a real Lyzr backend can be swapped in later without touching the agent or routes.
- Persona/clearance is client-asserted (demo-tier persona filter), not a real auth boundary.
- Platform access is gated by a native email+password login: allowlisted users (scrypt hashes in `data/authUsers.ts`, no plaintext), shared password for exact lyzr.ai/lyzr.com domains, HMAC-signed httpOnly session cookie (SESSION_SECRET, 24h TTL, TOKEN_VERSION bump = global revocation), login rate limiting, dummy scrypt on unknown emails to prevent timing enumeration. All /api routes except /healthz and /auth/* require a session. Frontend gate: `components/auth-gate.tsx`.

## Product

- Ask: natural-language questions answered over the governed corpus with real citations, numeric facts, and honest no-evidence / permission-blocked / historic states.
- Data: browse the corpus (docs, chunks, axes) that backs answers.
- Observatory: Lyzr-team-only audit panel (`/observatory`) tracking every user's logins, page visits and time-on-page (sid in session token, 90s activity-window attribution to the previous page), ask turns (question + exact response + persona + governance status + citations), generations (full draft body + refine turns), exports, Data Center ingestion (searches, accepted docs, uploads — kind `ingest`) and governance/admin changes (user CRUD, source labels, axes, retagging, rollbacks — kind `config_change`). Server-gated by `requireLyzr` (403 code:"forbidden"); nav item is cosmetic. Store: `data/observatoryStore.ts`, persisted to `.data/observatory.json` (instance-local — audit history does not survive redeploys).
- Other Workspace/Knowledge/Backend pages are elegant "in development" stubs.

## User preferences

- The Telefónica design system must be applied exactly as specified — do not deviate.
- No emojis anywhere in the product or code.
- No database.
- No gradient fills in charts/graphs — never reintroduce gradient area fills. Approved sparkline style (Mística data-card look): solid 2px status-color line, flat uniform-alpha tint underneath (applyAlpha 0.1), dot on the latest value, padded Y domain so trends are readable.

## Gotchas

- Do not run `pnpm dev` at the workspace root; use the per-artifact workflows.
- Verify with `typecheck`, not `build`, from bash.
- After changing `lib/*`, run `pnpm run typecheck:libs` before leaf artifact checks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
