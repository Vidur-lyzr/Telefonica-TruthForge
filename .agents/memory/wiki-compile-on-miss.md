---
name: Wiki compile-on-miss governance
description: Governance rules for LLM-compiled wiki pages created on demand from raw corpus retrieval.
---

Compile-on-miss files a new wiki page when no compiled page answers a question (no scored match, or the compose model returns an insufficiency sentinel while some permitted page matched).

Rules that must hold:

- Refusals come first: blocked-only raw matches return permission_blocked and no permitted matches return no_evidence BEFORE any model call, carrying only classification labels, never snippets or titles.
- Each scope compiles its own page from must-filtered retrieval. A public persona asking a question already answered by a private compiled page gets a separate public page built only from public sources — this is correct per-scope behavior, not duplication to "fix".
- Page confidentiality = MAX clearance over ALL chunks shown to the compile model (not just cited ones); uncited content can bleed into prose.
- **Why (area symmetry):** the page's area scope derives from its sourceDocIds' area union, so any area-scoped doc SHOWN to the model must join sourceDocIds even if uncited — otherwise the page is scoped wider than the material that shaped it.
- **Why (slug collision):** page ids come from model-chosen title slugs, so two scopes can collide. Never reuse a colliding page without a page-access check — that presents a locked page as open in wikiLinks/compiledPage. On inaccessible collision, mint a scope-suffixed id instead.
- In-flight compile dedupe must key on clearance|area|topic so concurrent callers in different scopes never share a compile promise.

**How to apply:** any new side channel that surfaces compiled pages (links, chips, graph nodes, exports) must gate through the shared page-access resolver, and any new on-demand compile surface must inherit all of the above.
