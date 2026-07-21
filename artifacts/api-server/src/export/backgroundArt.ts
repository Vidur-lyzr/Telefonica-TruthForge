// Full-bleed background art plates for the dark "benchmark" visual style —
// deep-navy bases with subtle blue washes, rendered once per variant to PNG
// via resvg and reused by every interpreter (identical pixels in PPTX, PDF
// and preview).
//
// SVG gradients are allowed HERE: the no-gradient rule is charts/graphs
// specific — backgrounds are explicitly outside it (see task/user rules).

import { Resvg } from "@resvg/resvg-js";

export type BackgroundVariant = "wash" | "panel" | "cover";

const W = 1920;
const H = 1080;

// Deterministic PRNG (mulberry32) so the cover particle field never changes
// between renders or environments.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAVY_DEEP = "#031A34";
const NAVY = "#0B2739";
const BLUE = "#0066FF";
const BLUE_SOFT = "#19A1E6";

function defsBlock(): string {
  return `<defs>
    <radialGradient id="glowTR" cx="82%" cy="12%" r="75%">
      <stop offset="0%" stop-color="${BLUE}" stop-opacity="0.34"/>
      <stop offset="45%" stop-color="${BLUE}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${BLUE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBL" cx="8%" cy="95%" r="70%">
      <stop offset="0%" stop-color="${BLUE_SOFT}" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="${BLUE_SOFT}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${BLUE_SOFT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="base" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
  </defs>`;
}

function diagonalHairlines(count: number, opacity: number): string {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const off = -H + (i * (W + H)) / (count - 1);
    lines.push(
      `<line x1="${off}" y1="${H}" x2="${off + H}" y2="0" stroke="${BLUE_SOFT}" stroke-opacity="${opacity}" stroke-width="1"/>`,
    );
  }
  return lines.join("");
}

function particleField(seed: number, n: number): string {
  const rnd = mulberry32(seed);
  const dots: string[] = [];
  // Particles cluster along a diagonal band from bottom-left to top-right,
  // denser and larger near the top-right — echo of the CMD brand art.
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rnd(), 0.65);
    const x = W * (0.25 + 0.78 * t + (rnd() - 0.5) * 0.28);
    const y = H * (0.85 - 0.8 * t + (rnd() - 0.5) * 0.34);
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const r = 1.2 + rnd() * (2.2 + 6 * t);
    const o = 0.08 + rnd() * (0.1 + 0.4 * t);
    const c = rnd() < 0.72 ? BLUE : BLUE_SOFT;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" fill-opacity="${o.toFixed(2)}"/>`);
  }
  return dots.join("");
}

function svgFor(variant: BackgroundVariant): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    defsBlock(),
    `<rect width="${W}" height="${H}" fill="url(#base)"/>`,
  ];
  if (variant === "panel") {
    // Quietest plate: content slides — faint corner glows only.
    parts.push(`<rect width="${W}" height="${H}" fill="url(#glowTR)" opacity="0.55"/>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#glowBL)" opacity="0.6"/>`);
  } else if (variant === "wash") {
    parts.push(`<rect width="${W}" height="${H}" fill="url(#glowTR)"/>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#glowBL)"/>`);
    parts.push(diagonalHairlines(26, 0.045));
  } else {
    // cover: wash plus the deterministic particle band for section covers.
    parts.push(`<rect width="${W}" height="${H}" fill="url(#glowTR)"/>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#glowBL)"/>`);
    parts.push(diagonalHairlines(18, 0.05));
    parts.push(particleField(20250721, 340));
  }
  parts.push(`</svg>`);
  return parts.join("");
}

const cache = new Map<BackgroundVariant, Buffer>();

/** Rendered 1920x1080 background plate for the given variant (cached). */
export function backgroundPng(variant: BackgroundVariant): Buffer {
  const hit = cache.get(variant);
  if (hit) return hit;
  const png = Buffer.from(
    new Resvg(svgFor(variant), {
      fitTo: { mode: "width", value: W },
      font: { loadSystemFonts: false },
    })
      .render()
      .asPng(),
  );
  cache.set(variant, png);
  return png;
}
