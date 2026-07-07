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

export function KnowledgeGraph({
  graph,
  axisColors,
  selectedId,
  highlightIds,
  onSelect,
}: {
  graph: WikiGraph;
  axisColors: Map<string, string>;
  selectedId: string | null;
  highlightIds?: Set<string>;
  onSelect: (node: WikiNode) => void;
}) {
  const nodes = graph.nodes;
  const edges = graph.edges;
  const posRef = React.useRef<Map<string, Pos>>(new Map());
  const draggingRef = React.useRef<string | null>(null);
  const movedRef = React.useRef(false);
  const alphaRef = React.useRef(1);
  const rafRef = React.useRef<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [, tick] = React.useState(0);
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  const nodeKey = nodes.map((n) => n.id).join("|");

  React.useEffect(() => {
    const next = new Map<string, Pos>();
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const ring = n.kind === "axis" ? 130 : 250;
      next.set(n.id, {
        x: WIDTH / 2 + Math.cos(angle) * ring + (Math.random() - 0.5) * 60,
        y: HEIGHT / 2 + Math.sin(angle) * ring + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
      });
    });
    posRef.current = next;
    alphaRef.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey]);

  React.useEffect(() => {
    const step = () => {
      const pos = posRef.current;
      const alpha = alphaRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const a = pos.get(nodes[i].id);
        if (!a) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = pos.get(nodes[j].id);
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
        p.vx += (WIDTH / 2 - p.x) * 0.0022;
        p.vy += (HEIGHT / 2 - p.y) * 0.0022;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx * alpha;
        p.y += p.vy * alpha;
        p.x = Math.max(30, Math.min(WIDTH - 30, p.x));
        p.y = Math.max(30, Math.min(HEIGHT - 30, p.y));
      });

      alphaRef.current = Math.max(0.015, alpha * 0.994);
      tick((v) => (v + 1) % 1_000_000);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey]);

  const toSvg = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = id;
    movedRef.current = false;
    alphaRef.current = Math.max(alphaRef.current, 0.5);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const id = draggingRef.current;
    if (!id) return;
    const p = toSvg(e.clientX, e.clientY);
    if (!p) return;
    const node = posRef.current.get(id);
    if (!node) return;
    movedRef.current = true;
    node.x = p.x;
    node.y = p.y;
    node.vx = 0;
    node.vy = 0;
  };

  const handlePointerUp = (node: WikiNode) => () => {
    if (draggingRef.current === node.id && !movedRef.current) {
      onSelect(node);
    }
    draggingRef.current = null;
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

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "100%", touchAction: "none", userSelect: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={() => {
        draggingRef.current = null;
      }}
    >
      <g>
        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const active = !!focusId && (e.from === focusId || e.to === focusId);
          const showConfidence =
            active && e.type === "citation" && typeof e.confidence === "number";
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.type === "citation" ? CITATION : RELATIONSHIP}
                strokeWidth={active ? 2 : 1}
                strokeOpacity={
                  focusId
                    ? active
                      ? 0.75
                      : 0.07
                    : e.type === "citation"
                      ? 0.35
                      : 0.22
                }
                strokeDasharray={e.type === "relationship" ? "4 4" : undefined}
              />
              {showConfidence && (
                <g
                  transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}
                >
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
          const dimmed = selectedId ? !isSel && !adjacency.has(n.id) : false;
          const entity = isEntity(n.kind) && !n.locked;
          const showLabel =
            n.kind === "axis" ||
            n.kind === "compiled_page" ||
            isSel ||
            isHighlighted ||
            hoverId === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1 }}
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
    </svg>
  );
}
