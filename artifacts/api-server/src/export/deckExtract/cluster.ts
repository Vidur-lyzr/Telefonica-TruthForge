// Slide clustering — groups parsed slides into layout families by geometric
// similarity. Two slides belong together when their shape sets (same kind,
// similar frames) overlap strongly: greedy same-kind matching scored by
// intersection-over-union, normalised by total shape count.

import type { ParsedSlide, ParsedShape, Box } from "./pptxParse";

/** Minimum pairwise similarity for two slides to share a family. */
const SIM_MIN = 0.55;
/** A shape pair below this IoU is not considered a match at all. */
const IOU_MIN = 0.3;

export interface SlideCluster {
  slideIndexes: number[];
  representative: ParsedSlide;
  label: string;
}

function shapeBox(s: ParsedShape): Box {
  if (s.kind === "line") return { x: s.x, y: s.y, w: s.w, h: 0.1 };
  return { x: s.x, y: s.y, w: s.w, h: s.h };
}

function iou(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  if (inter <= 0) return 0;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function similarity(a: ParsedSlide, b: ParsedSlide): number {
  const na = a.shapes.length;
  const nb = b.shapes.length;
  if (na === 0 && nb === 0) return 1;
  if (na === 0 || nb === 0) return 0;
  const used = new Set<number>();
  let sum = 0;
  for (const sa of a.shapes) {
    let bestIdx = -1;
    let best = 0;
    for (let j = 0; j < b.shapes.length; j++) {
      if (used.has(j)) continue;
      const sb = b.shapes[j]!;
      if (sb.kind !== sa.kind) continue;
      const score = iou(shapeBox(sa), shapeBox(sb));
      if (score > best) {
        best = score;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0 && best >= IOU_MIN) {
      used.add(bestIdx);
      sum += best;
    }
  }
  return (2 * sum) / (na + nb);
}

function buildLabel(slide: ParsedSlide): string {
  const texts = slide.shapes.filter((s): s is Extract<ParsedShape, { kind: "text" }> => s.kind === "text");
  const images = slide.shapes.filter((s) => s.kind === "image").length;
  const titleIdx = texts.findIndex(
    (t) => t.phType === "title" || t.phType === "ctrTitle" || t.sizePt >= 24,
  );
  const bullets = texts.filter((t, i) => i !== titleIdx && t.bulleted).length;
  const plain = texts.length - (titleIdx >= 0 ? 1 : 0) - bullets;

  const parts: string[] = [];
  if (titleIdx >= 0) parts.push("Title");
  if (bullets === 1) parts.push("bullet list");
  else if (bullets > 1) parts.push(`${bullets} bullet lists`);
  if (plain === 1) parts.push("text block");
  else if (plain > 1) parts.push(`${plain} text blocks`);
  if (images === 1) parts.push("image");
  else if (images > 1) parts.push(`${images} images`);
  if (parts.length === 0) return "Background-only slide";
  const label = parts.join(" + ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function clusterSlides(slides: ParsedSlide[]): SlideCluster[] {
  const usable = slides.filter((s) => s.shapes.length > 0);
  if (usable.length === 0) return [];

  // Union-find over pairwise similarity.
  const parent = usable.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  // Cache pairwise similarities for representative selection.
  const sims = new Map<string, number>();
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const s = similarity(usable[i]!, usable[j]!);
      sims.set(`${i}:${j}`, s);
      if (s >= SIM_MIN) union(i, j);
    }
  }
  const pairSim = (i: number, j: number): number =>
    i === j ? 1 : sims.get(i < j ? `${i}:${j}` : `${j}:${i}`) ?? 0;

  const groups = new Map<number, number[]>();
  for (let i = 0; i < usable.length; i++) {
    const root = find(i);
    const list = groups.get(root);
    if (list) list.push(i);
    else groups.set(root, [i]);
  }

  const clusters: SlideCluster[] = [];
  for (const members of groups.values()) {
    // Representative: the member most similar to the rest of its family.
    let best = members[0]!;
    let bestScore = -1;
    for (const i of members) {
      let score = 0;
      for (const j of members) score += pairSim(i, j);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    const rep = usable[best]!;
    clusters.push({
      slideIndexes: members.map((i) => usable[i]!.index).sort((a, b) => a - b),
      representative: rep,
      label: buildLabel(rep),
    });
  }

  // Largest families first — those are the ones worth reviewing.
  clusters.sort((a, b) => b.slideIndexes.length - a.slideIndexes.length);
  return clusters;
}
