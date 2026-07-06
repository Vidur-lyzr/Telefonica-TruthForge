// kg.traverse — Lyzr-named knowledge-graph adapter.
// Backed natively by a small in-memory entity graph. A real Lyzr Knowledge Graph
// can be swapped in behind this same interface later.

import { GRAPH_NODES, GRAPH_EDGES, type GraphKind } from "../data/corpus";
import { tokenize } from "./text";

export interface TraversedEntity {
  id: string;
  name: string;
  kind: GraphKind;
  relation?: string;
}

export function traverse(question: string, limit = 4): TraversedEntity[] {
  const qTerms = new Set(tokenize(question));
  const rawText = question.toLowerCase();

  const seeds = GRAPH_NODES.filter((node) =>
    node.keywords.some(
      (kw) => rawText.includes(kw) || tokenize(kw).some((t) => qTerms.has(t)),
    ),
  );
  if (seeds.length === 0) return [];

  const results = new Map<string, TraversedEntity>();
  for (const seed of seeds) {
    if (!results.has(seed.id)) {
      results.set(seed.id, { id: seed.id, name: seed.name, kind: seed.kind });
    }
    for (const edge of GRAPH_EDGES) {
      if (edge.from === seed.id) {
        const target = GRAPH_NODES.find((n) => n.id === edge.to);
        if (target && !results.has(target.id)) {
          results.set(target.id, {
            id: target.id,
            name: target.name,
            kind: target.kind,
            relation: `${seed.name} ${edge.relation} ${target.name}`,
          });
        }
      }
    }
  }

  return Array.from(results.values()).slice(0, limit);
}
