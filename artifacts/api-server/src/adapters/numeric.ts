// numeric.query — Lyzr-named numeric/metric adapter.
// Backed natively by a curated table of governed metrics. A real Lyzr numeric
// tool can be swapped in behind this same interface later.

import {
  NUMERIC_FACTS,
  NUMERIC_SERIES,
  type NumericFact,
  type NumericSeries,
} from "../data/corpus";
import { tokenize } from "./text";

function scoreFact(
  fact: { keywords: string[]; period: string },
  qTerms: Set<string>,
  rawText: string,
): number {
  let score = 0;
  for (const kw of fact.keywords) {
    if (rawText.includes(kw)) score += 2;
    for (const t of tokenize(kw)) if (qTerms.has(t)) score += 1;
  }
  if (rawText.includes(fact.period.toLowerCase())) score += 1;
  return score;
}

export function query(question: string): NumericFact | null {
  const qTerms = new Set(tokenize(question));
  const rawText = question.toLowerCase();

  let best: { fact: NumericFact; score: number } | null = null;
  for (const fact of NUMERIC_FACTS) {
    const score = scoreFact(fact, qTerms, rawText);
    if (score > 0 && (!best || score > best.score)) best = { fact, score };
  }
  return best ? best.fact : null;
}

// Return every numeric fact that matches the query, most relevant first.
// Used by the Generate engine to surface all figures relevant to a brief.
export function queryAll(question: string): NumericFact[] {
  const qTerms = new Set(tokenize(question));
  const rawText = question.toLowerCase();
  return NUMERIC_FACTS.map((fact) => ({
    fact,
    score: scoreFact(fact, qTerms, rawText),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.fact);
}

// Return every time-series that matches the query, most relevant first, for
// chart-from-data. Access control is applied by the caller against docId.
export function querySeries(question: string): NumericSeries[] {
  const qTerms = new Set(tokenize(question));
  const rawText = question.toLowerCase();
  return NUMERIC_SERIES.map((series) => ({
    series,
    score: scoreFact(series, qTerms, rawText),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.series);
}
