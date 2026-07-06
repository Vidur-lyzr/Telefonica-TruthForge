// numeric.query — Lyzr-named numeric/metric adapter.
// Backed natively by a curated table of governed metrics. A real Lyzr numeric
// tool can be swapped in behind this same interface later.

import { NUMERIC_FACTS, type NumericFact } from "../data/corpus";
import { tokenize } from "./text";

export function query(question: string): NumericFact | null {
  const qTerms = new Set(tokenize(question));
  const rawText = question.toLowerCase();

  let best: { fact: NumericFact; score: number } | null = null;
  for (const fact of NUMERIC_FACTS) {
    let score = 0;
    for (const kw of fact.keywords) {
      if (rawText.includes(kw)) score += 2;
      for (const t of tokenize(kw)) if (qTerms.has(t)) score += 1;
    }
    if (rawText.includes(fact.period.toLowerCase())) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { fact, score };
  }
  return best ? best.fact : null;
}
