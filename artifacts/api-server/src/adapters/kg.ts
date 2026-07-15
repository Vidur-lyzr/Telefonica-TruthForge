// kg — Lyzr-named knowledge-graph adapter.
// Backed natively by a small in-memory entity graph plus the compiled/document
// layers. A real Lyzr Knowledge Graph can be swapped in behind this interface.

import {
  GRAPH_NODES,
  GRAPH_EDGES,
  AXES,
  DOCS,
  COMPILED_PAGES,
  type GraphKind,
  type GraphEdge,
  type Clearance,
  type Validity,
} from "../data/corpus";
import {
  isDocAccessible,
  resolvePageAccess,
  type AccessSubject,
} from "../data/governance";
import { tokenize } from "./text";

export interface TraversedEntity {
  id: string;
  name: string;
  kind: GraphKind;
  relation?: string;
}

// Combined lookup of entity nodes + axes, used both by traverse (Ask's related
// entities) and by the wiki-graph builder.
const AXIS_NODES = AXES.map((a) => ({
  id: a.id,
  name: a.name,
  kind: "axis" as GraphKind,
  axisId: a.id,
  keywords: [] as string[],
}));
const ENTITY_LOOKUP = new Map(
  [...GRAPH_NODES, ...AXIS_NODES].map((n) => [n.id, n]),
);

export function traverse(question: string, limit = 4): TraversedEntity[] {
  const qTerms = new Set(tokenize(question));
  const rawText = question.toLowerCase();

  const seeds = GRAPH_NODES.filter(
    (node) =>
      (node.kind === "market" ||
        node.kind === "brand" ||
        node.kind === "executive" ||
        node.kind === "product") &&
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
        const target = ENTITY_LOOKUP.get(edge.to);
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

// ---------------------------------------------------------------------------
// Wiki map graph — assembled from axes, compiled pages, documents and entities,
// then permission-filtered by the active persona clearance. Locked nodes are
// surfaced as existence-only (name and contents hidden) so the shape of the
// knowledge stays visible without leaking governed material.
// ---------------------------------------------------------------------------

export interface WikiFigureSource {
  docId: string;
  docTitle: string;
  confidence: number;
  locked: boolean;
}

export interface WikiGraphNode {
  id: string;
  name: string;
  kind: GraphKind;
  axisId: string | null;
  confidentiality: Clearance | null;
  validity: Validity | null;
  /** Market / country the underlying material belongs to (map filter). */
  market: string | null;
  /** Brand the underlying material belongs to (map filter). */
  brand: string | null;
  /** Language of the underlying material (map filter). */
  language: string | null;
  locked: boolean;
  refined: boolean;
  pageId: string | null;
  docId: string | null;
  figure: {
    value: string;
    unit: string;
    period: string;
    /** Governed sources that agree on this measurement, with confidence. */
    sources: WikiFigureSource[];
  } | null;
}

export interface WikiGraphEdge {
  from: string;
  to: string;
  type: "citation" | "relationship";
  relation: string;
  confidence: number | null;
}

export interface WikiGraph {
  nodes: WikiGraphNode[];
  edges: WikiGraphEdge[];
}

export function buildWikiGraph(subject: AccessSubject): WikiGraph {
  // Full governance intersection (area × clearance) via the shared resolver —
  // never a clearance-rank-only check. Fails closed.
  const docAccessible = (d: { confidentiality: Clearance; areas: import("../data/corpus").Area[] }) =>
    isDocAccessible(d, subject);
  const docById = new Map(DOCS.map((d) => [d.id, d]));

  const nodes: WikiGraphNode[] = [];
  const present = new Set<string>();

  const push = (n: WikiGraphNode) => {
    if (present.has(n.id)) return;
    present.add(n.id);
    nodes.push(n);
  };

  // Locked node → keep existence + kind + required clearance, hide the rest.
  // Filter attributes are also cleared so restricted material cannot be
  // fingerprinted through the market/brand/language facets.
  const lock = (base: WikiGraphNode): WikiGraphNode => ({
    ...base,
    name: "Restricted material",
    locked: true,
    validity: null,
    refined: false,
    market: null,
    brand: null,
    language: null,
    figure: null,
  });

  // Axes — always visible anchors (structural, no facet attributes).
  for (const a of AXES) {
    push({
      id: a.id,
      name: a.name,
      kind: "axis",
      axisId: a.id,
      confidentiality: "public",
      validity: "approved",
      market: null,
      brand: null,
      language: null,
      locked: false,
      refined: false,
      pageId: null,
      docId: null,
      figure: null,
    });
  }

  // Compiled pages — facets inherited from their primary governed source.
  for (const p of COMPILED_PAGES) {
    const srcDoc = p.sourceDocIds.map((id) => docById.get(id)).find(Boolean) ?? null;
    const base: WikiGraphNode = {
      id: p.nodeId,
      name: p.title,
      kind: "compiled_page",
      axisId: p.axisId,
      confidentiality: p.confidentiality,
      validity: p.validity,
      market: srcDoc?.country ?? null,
      brand: srcDoc?.brand ?? null,
      language: srcDoc?.language ?? null,
      locked: false,
      refined: p.refined,
      pageId: p.id,
      docId: null,
      figure: null,
    };
    push(resolvePageAccess(p, subject).accessible ? base : lock(base));
  }

  // Documents.
  for (const d of DOCS) {
    const base: WikiGraphNode = {
      id: `doc-node:${d.id}`,
      name: d.title,
      kind: "document",
      axisId: d.axisIds[0] ?? null,
      confidentiality: d.confidentiality,
      validity: d.validity,
      market: d.country,
      brand: d.brand,
      language: d.language,
      locked: false,
      refined: false,
      pageId: null,
      docId: d.id,
      figure: null,
    };
    push(docAccessible(d) ? base : lock(base));
  }

  // Entities (markets, brands, products, executives, figures).
  for (const e of GRAPH_NODES) {
    // Figures fail closed on their source document's clearance.
    // Fail closed: a figure whose source document is missing is inaccessible.
    const figDoc = e.figure ? docById.get(e.figure.docId) ?? null : null;
    const figAccessible = e.figure
      ? figDoc != null && docAccessible(figDoc)
      : true;
    const base: WikiGraphNode = {
      id: e.id,
      name: e.name,
      kind: e.kind,
      axisId: e.axisId ?? null,
      confidentiality: e.confidentiality ?? null,
      validity: e.validity ?? null,
      market: e.kind === "market" ? e.name : figDoc?.country ?? null,
      brand: e.kind === "brand" ? e.name : figDoc?.brand ?? null,
      language: figDoc?.language ?? null,
      locked: false,
      refined: false,
      pageId: null,
      docId: null,
      figure: e.figure
        ? {
            value: e.figure.value,
            unit: e.figure.unit,
            period: e.figure.period,
            sources: figDoc
              ? [
                  {
                    docId: figDoc.id,
                    docTitle: figDoc.title,
                    confidence: 0.95,
                    locked: false,
                  },
                ]
              : [],
          }
        : null,
    };
    push(figAccessible ? base : lock(base));
  }

  // ---- Edges ----
  const rawEdges: WikiGraphEdge[] = [];

  // Page → axis (defends) and page → source docs (cites, solid).
  for (const p of COMPILED_PAGES) {
    rawEdges.push({
      from: p.nodeId,
      to: p.axisId,
      type: "relationship",
      relation: "defends",
      confidence: null,
    });
    for (const docId of p.sourceDocIds) {
      rawEdges.push({
        from: p.nodeId,
        to: `doc-node:${docId}`,
        type: "citation",
        relation: "cites",
        confidence: 0.92,
      });
    }
  }

  // Document → axis (classified under, dashed).
  for (const d of DOCS) {
    for (const axisId of d.axisIds) {
      rawEdges.push({
        from: `doc-node:${d.id}`,
        to: axisId,
        type: "relationship",
        relation: "classified under",
        confidence: null,
      });
    }
  }

  // Figure → source document (measured in, solid).
  for (const e of GRAPH_NODES) {
    if (e.figure) {
      rawEdges.push({
        from: e.id,
        to: `doc-node:${e.figure.docId}`,
        type: "citation",
        relation: "measured in",
        confidence: 0.95,
      });
    }
  }

  // Entity relationships.
  for (const edge of GRAPH_EDGES as GraphEdge[]) {
    rawEdges.push({
      from: edge.from,
      to: edge.to,
      type: edge.type,
      relation: edge.relation,
      confidence: edge.confidence ?? null,
    });
  }

  // Keep only edges whose endpoints both exist as nodes.
  const edges = rawEdges.filter((e) => present.has(e.from) && present.has(e.to));

  return { nodes, edges };
}
