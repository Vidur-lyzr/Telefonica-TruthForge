---
name: Multilingual retrieval via synonym canonicalisation
description: How cross-language (EN/ES/DE/PT) Ask retrieval works without translation, and its risks.
---

Cross-language retrieval in the local TF-IDF/BM25 engine is achieved deterministically in the tokenizer, not with machine translation:

1. Accent-fold first (NFD strip + ß→ss), then stopword-filter with all four languages' lists, then map through a curated synonym table that normalises high-value domain terms to a canonical English token (e.g. ingresos/umsatz/receita → revenue), then light plural stemming.
2. Docs also carry bilingual topic keywords, which land in the same haystack.

**Why:** a Spanish question must find evidence in an English/German doc while keeping the query-idf-coverage relevance rule intact; translation services would be non-deterministic and break the honest no_evidence behaviour.

**How to apply:** when adding corpus languages or domain vocabulary, extend the STOPWORDS + SYNONYMS in `adapters/text.ts` (keys must be post-accent-fold lowercase). Watch for false-positive collisions: short natural-language words that are domain terms in another language (e.g. Spanish "red" → network) — only map terms that are unambiguous in this corpus, and add a negative-control question when in doubt.
