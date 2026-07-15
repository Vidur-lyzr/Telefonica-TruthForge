import React from "react";
import type { WikiGraph, WikiNode } from "@workspace/api-client-react";
import { skinVars, IconLockClosedRegular } from "@telefonica/mistica";

interface Pos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const WIDTH = 940;
const HEIGHT = 660;
const ALPHA_MIN = 0.012;
const ALPHA_DECAY = 0.99;

const NEUTRAL = skinVars.colors.neutralMedium;
const NAVY = skinVars.colors.textPrimary;
const FIGURE = skinVars.colors.brandHigh;
const EXECUTIVE = skinVars.colors.textLinkBrand;
const PRODUCT = skinVars.colors.brand;
const CITATION = skinVars.colors.brand;
const RELATIONSHIP = skinVars.colors.neutralMedium;
const HISTORIC = skinVars.colors.warning;
const HIGHLIGHT = skinVars.colors.brand;
const SURFACE = skinVars.colors.backgroundContainer;

function radiusFor(kind: string): number {
  switch (kind) {
    case "axis":
      return 26;
    case "compiled_page":
      return 17;
    case "figure":
      return 11;
    case "document":
      return 8;
    default:
      return 11;
  }
}

// color = axis. Nodes carrying an axis are painted in that axis colour; the rest
// fall back to a small neutral palette by kind.
function colorFor(node: WikiNode, axisColors: Map<string, string>): string {
  if (node.locked) return NEUTRAL;
  if (node.axisId && axisColors.has(node.axisId)) {
    return axisColors.get(node.axisId) as string;
  }
  switch (node.kind) {
    case "figure":
      return FIGURE;
    case "executive":
      return EXECUTIVE;
    case "product":
      return PRODUCT;
    case "market":
      return NAVY;
    default:
      return NAVY;
  }
}

// node fill = layer. Compiled/structural layers are filled solid; raw entities
// (market/brand/product/executive) are drawn as outlines so the compiled memory
// reads as "solid" and the raw graph reads as "scaffolding".
function isEntity(kind: string): boolean {
  return (
    kind === "market" ||
    kind === "brand" ||
    kind === "product" ||
    kind === "executive"
  );
}

function isHistoric(node: WikiNode): boolean {
  return node.validity === "historic" || node.validity === "superseded";
}

// Deterministic seeded jitter from the node id, so the initial layout is stable
// across renders and personas instead of shuffling on every mount.
function seeded(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

const edgeKey = (from: string, to: string) => `${from}|${to}`;

export function KnowledgeGraph({
  graph,
  axisColors,
  selectedId,
  highlightIds,
  highlightEdges,
  onSelect,
}: {
  graph: WikiGraph;
  axisColors: Map<string, string>;
  selectedId: string | null;
  highlightIds?: Set<string>;
  // Traversal edges (both directions keyed "from|to") lit up by a chat answer.
  highlightEdges?: Set<string>;
  onSelect: (node: WikiNode) => void;
}) {
  const nodes = graph.nodes;
  const edges = graph.edges;
  const posRef = React.useRef<Map<string, Pos>>(new Map());
  const draggingRef = React.useRef<string | null>(null);
  const panningRef = React.useRef<{ x: number; y: number } | null>(null);
  const movedRef = React.useRef(false);
  const alphaRef = React.useRef(1);
  const rafRef = React.useRef<number | null>(null);
  const runningRef = React.useRef(false);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [, tick] = React.useState(0);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });
  const viewRef = React.useRef(view);
  viewRef.current = view;

  const nodeKey = nodes.map((n) => n.id).join("|");

  // Physics step. Runs only while the simulation is hot; once alpha cools to
  // the floor the loop stops entirely (no idle RAF burn) until reheated.
  const step = React.useCallback(() => {
    const pos = posRef.current;
    const alpha = alphaRef.current;
    const ns = posRef.current;

    const ids = [...ns.keys()];
    for (let i = 0; i < ids.length; i++) {
      const a = pos.get(ids[i]);
      if (!a) continue;
      for (let j = i + 1; j < ids.length; j++) {
        const b = pos.get(ids[j]);
        if (!b) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) d2 = 0.01;
        const d = Math.sqrt(d2);
        const rep = 2600 / d2;
        const fx = (dx / d) * rep;
        const fy = (dy / d) * rep;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    edges.forEach((e) => {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) return;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.01) d = 0.01;
      const target = e.type === "citation" ? 95 : 150;
      const k = 0.03 * (d - target);
      const fx = (dx / d) * k;
      const fy = (dy / d) * k;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    });

    pos.forEach((p, id) => {
      if (draggingRef.current === id) {
        p.vx = 0;
        p.vy = 0;
        return;
      }
      // Soft gravity towards the centre — no hard clamp, panning covers the rest.
      p.vx += (WIDTH / 2 - p.x) * 0.0022;
      p.vy += (HEIGHT / 2 - p.y) * 0.0022;
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx * alpha;
      p.y += p.vy * alpha;
    });

    alphaRef.current = alpha * ALPHA_DECAY;
    tick((v) => (v + 1) % 1_000_000);

    if (alphaRef.current <= ALPHA_MIN && draggingRef.current === null) {
      // Fully cooled: stop the loop.
      runningRef.current = false;
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey]);

  const reheat = React.useCallback(
    (alpha = 0.5) => {
      alphaRef.current = Math.max(alphaRef.current, alpha);
      if (!runningRef.current) {
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(step);
      }
    },
    [step],
  );

  // Seeded initial layout whenever the node set changes; reheats the sim.
  React.useEffect(() => {
    const prev = posRef.current;
    const next = new Map<string, Pos>();
    nodes.forEach((n, i) => {
      const kept = prev.get(n.id);
      if (kept) {
        // Keep settled positions across filter changes for continuity.
        next.set(n.id, kept);
        return;
      }
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const ring = n.kind === "axis" ? 130 : 250;
      next.set(n.id, {
        x: WIDTH / 2 + Math.cos(angle) * ring + (seeded(n.id) - 0.5) * 60,
        y: HEIGHT / 2 + Math.sin(angle) * ring + (seeded(`${n.id}#y`) - 0.5) * 60,
        vx: 0,
        vy: 0,
      });
    });
    posRef.current = next;
    alphaRef.current = 1;
    reheat(1);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, reheat]);

  // Wheel zoom needs a non-passive listener so preventDefault works; zoom is
  // anchored on the cursor. Page scroll elsewhere is untouched.
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * WIDTH;
      const sy = ((e.clientY - rect.top) / rect.height) * HEIGHT;
      setView((v) => {
        const k = Math.min(4, Math.max(0.4, v.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        // Keep the graph point under the cursor fixed while zooming.
        const gx = (sx - v.x) / v.k;
        const gy = (sy - v.y) / v.k;
        return { k, x: sx - gx * k, y: sy - gy * k };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const toSvg = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * WIDTH;
    const sy = ((clientY - rect.top) / rect.height) * HEIGHT;
    const v = viewRef.current;
    return { x: (sx - v.x) / v.k, y: (sy - v.y) / v.k };
  };

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = id;
    movedRef.current = false;
    reheat(0.5);
  };

  const handleBackgroundDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    panningRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const id = draggingRef.current;
    if (id) {
      const p = toSvg(e.clientX, e.clientY);
      if (!p) return;
      const node = posRef.current.get(id);
      if (!node) return;
      movedRef.current = true;
      node.x = p.x;
      node.y = p.y;
      node.vx = 0;
      node.vy = 0;
      reheat(0.3);
      return;
    }
    const pan = panningRef.current;
    if (pan) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - pan.x) / rect.width) * WIDTH;
      const dy = ((e.clientY - pan.y) / rect.height) * HEIGHT;
      panningRef.current = { x: e.clientX, y: e.clientY };
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };

  const endPointer = () => {
    if (draggingRef.current !== null) {
      draggingRef.current = null;
      reheat(0.2);
    }
    panningRef.current = null;
  };

  const handlePointerUp = (node: WikiNode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (draggingRef.current === node.id && !movedRef.current) {
      onSelect(node);
    }
    endPointer();
  };

  const pos = posRef.current;
  const adjacency = new Set<string>();
  if (selectedId) {
    edges.forEach((e) => {
      if (e.from === selectedId) adjacency.add(e.to);
      if (e.to === selectedId) adjacency.add(e.from);
    });
  }

  const focusId = hoverId ?? selectedId;
  const hasTraversal = !!highlightEdges && highlightEdges.size > 0;
  // Progressive labels: zooming in reveals figure/document/entity names.
  const labelZoom = view.k >= 1.35;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "100%", userSelect: "none", display: "block" }}
      onPointerDown={handleBackgroundDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerLeave={endPointer}
    >
      <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
        <g>
          {edges.map((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const traversed =
              hasTraversal &&
              (highlightEdges.has(edgeKey(e.from, e.to)) ||
                highlightEdges.has(edgeKey(e.to, e.from)));
            const active =
              traversed || (!!focusId && (e.from === focusId || e.to === focusId));
            const showRelation =
              (active || view.k >= 1.6) && !!e.relation && e.type === "relationship";
            const showConfidence =
              active && e.type === "citation" && typeof e.confidence === "number";
            const baseOpacity = e.type === "citation" ? 0.35 : 0.22;
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={traversed ? HIGHLIGHT : e.type === "citation" ? CITATION : RELATIONSHIP}
                  strokeWidth={traversed ? 2.5 : active ? 2 : 1}
                  strokeOpacity={
                    traversed
                      ? 0.85
                      : hasTraversal
                        ? 0.08
                        : focusId
                          ? active
                            ? 0.75
                            : 0.07
                          : baseOpacity
                  }
                  strokeDasharray={e.type === "relationship" ? "4 4" : undefined}
                />
                {showRelation && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 4}
                    textAnchor="middle"
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      fill: traversed ? HIGHLIGHT : NAVY,
                      opacity: traversed || active ? 0.9 : 0.55,
                      pointerEvents: "none",
                    }}
                  >
                    {e.relation}
                  </text>
                )}
                {showConfidence && (
                  <g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}>
                    <rect
                      x={-15}
                      y={-8}
                      width={30}
                      height={16}
                      rx={8}
                      fill={SURFACE}
                      stroke={CITATION}
                      strokeWidth={1}
                      opacity={0.95}
                    />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fill: CITATION,
                        pointerEvents: "none",
                      }}
                    >
                      {(e.confidence as number).toFixed(2)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
        <g>
          {nodes.map((n) => {
            const p = pos.get(n.id);
            if (!p) return null;
            const r = radiusFor(n.kind);
            const color = colorFor(n, axisColors);
            const isSel = selectedId === n.id;
            const isHighlighted = highlightIds?.has(n.id) ?? false;
            const dimmed = hasTraversal
              ? !isHighlighted && !isSel
              : selectedId
                ? !isSel && !adjacency.has(n.id)
                : false;
            const entity = isEntity(n.kind) && !n.locked;
            const showLabel =
              n.kind === "axis" ||
              n.kind === "compiled_page" ||
              isSel ||
              isHighlighted ||
              hoverId === n.id ||
              labelZoom;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1, touchAction: "none" }}
                onPointerDown={handlePointerDown(n.id)}
                onPointerUp={handlePointerUp(n)}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId((h) => (h === n.id ? null : h))}
              >
                {n.refined && !n.locked && (
                  <circle r={r + 6} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5}>
                    <animate
                      attributeName="opacity"
                      values="0.5;0.15;0.5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {isHighlighted && !isSel && (
                  <circle r={r + 8} fill="none" stroke={HIGHLIGHT} strokeWidth={2.5} opacity={0.7}>
                    <animate
                      attributeName="opacity"
                      values="0.7;0.2;0.7"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {isHistoric(n) && (
                  <circle
                    r={r + 4}
                    fill="none"
                    stroke={HISTORIC}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  r={r}
                  fill={entity ? SURFACE : color}
                  fillOpacity={
                    entity ? 1 : n.kind === "document" ? 0.85 : n.locked ? 0.5 : 1
                  }
                  stroke={isSel ? NAVY : entity ? color : SURFACE}
                  strokeWidth={isSel ? 3 : entity ? 2.5 : 1.5}
                />
                {n.locked && (
                  <foreignObject x={-7} y={-7} width={14} height={14}>
                    <IconLockClosedRegular size={14} color={skinVars.colors.inverse} />
                  </foreignObject>
                )}
                {showLabel && (
                  <text
                    x={0}
                    y={r + 13}
                    textAnchor="middle"
                    style={{
                      fontSize: n.kind === "axis" ? 13 : 11,
                      fontWeight: n.kind === "axis" ? 700 : 500,
                      fill: NAVY,
                      pointerEvents: "none",
                    }}
                  >
                    {n.name.length > 26 ? `${n.name.slice(0, 24)}…` : n.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
