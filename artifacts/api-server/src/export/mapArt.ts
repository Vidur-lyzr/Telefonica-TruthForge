// Duotone static region maps for the map-highlight layout. The region set is
// FIXED — the agent must pick from MAP_REGIONS or the slide fails schema
// validation (honest skip, never a guessed map). Silhouettes are stylised
// hand-coded polygons (recognisable, not cartographic), rendered to PNG via
// resvg so every interpreter embeds identical pixels.

import { Resvg } from "@resvg/resvg-js";

export const MAP_REGIONS = [
  "world",
  "europe",
  "spain",
  "brazil",
  "germany",
  "uk",
  "us",
  "china",
  "latam",
] as const;

export type MapRegion = (typeof MAP_REGIONS)[number];

// Each region: paths in a 480x300 viewBox. `hi` paths are drawn in the
// highlight colour, `lo` paths in the muted duotone base.
interface RegionArt {
  lo: string[];
  hi: string[];
}

// Stylised silhouettes. Coordinates are rough by design — the product is a
// duotone brand map, not a geographic atlas.
const REGIONS: Record<MapRegion, RegionArt> = {
  world: {
    lo: [
      // Americas
      "M78 62l30-14 26 4 12 16-8 18-22 8-10 20 8 16-12 26-16 30-12 34-10 18-8-26 4-30-14-22-8-28 10-24-2-22 12-14z",
      // Africa + Europe
      "M232 52l26-10 24 6 10 14-6 12 14 6 10 18-6 26-16 22-8 30-14 12-16-6-10-24-6-28-12-18 4-22 6-20z",
      // Asia + Oceania
      "M310 44l40-10 46 8 22 18-6 22-18 12-8 24-18 8-14-10-18 14-20-6-10-20 6-24-8-18z M382 190l22-6 14 12-10 16-22 2-8-14z",
    ],
    hi: [],
  },
  europe: {
    lo: [
      // Scandinavia
      "M236 26l22-14 20 8-6 24-12 30-16 10-8-22 4-20z",
      // Eastern landmass
      "M300 96l64-14 40 20-12 40-40 26-52 8-24-18 8-34z",
      // British Isles
      "M148 84l16-16 12 8-6 22-14 14-12-6 4-14z",
      // Central/Western Europe
      "M188 118l38-14 42 6 18 22-10 28-30 18-38 4-26-16 2-28z",
    ],
    hi: [
      // Iberia highlighted as the home market
      "M148 196l40-12 28 8 4 20-24 22-34 4-18-20z",
    ],
  },
  spain: {
    lo: [],
    hi: [
      "M96 108l84-30 96 2 76 18 34 26-16 40-48 34-72 22-84-6-52-32-24-40z",
      // Balearics
      "M330 222l22-8 16 10-12 14-22 2z",
    ],
  },
  brazil: {
    lo: [],
    hi: [
      "M170 46l84-16 74 22 48 44 6 52-30 58-52 44-58 12-40-30-22-52-26-48 4-50z",
    ],
  },
  germany: {
    lo: [],
    hi: [
      "M196 34l52-12 44 16 12 34-14 30 18 32-10 42-40 26-52 8-40-24-6-44 14-38-4-40z",
    ],
  },
  uk: {
    lo: [
      // Ireland
      "M118 150l34-22 24 10-8 34-30 24-26-8 2-24z",
    ],
    hi: [
      // Great Britain
      "M226 22l44-12 24 20-14 38 18 30-8 44-26 40-44 18-30-16 12-40-14-34 20-36z",
    ],
  },
  us: {
    lo: [],
    hi: [
      "M52 84l108-24 128 4 96 14 40 28-12 46-52 40-96 22-118-8-70-34-28-46z",
      // Florida hint
      "M336 214l18 26-8 16-16-18z",
    ],
  },
  china: {
    lo: [],
    hi: [
      "M92 96l72-42 96-16 92 22 62 44-8 48-52 46-84 30-90-4-64-38-30-46z",
    ],
  },
  latam: {
    lo: [
      // Central America + Caribbean hint
      "M108 30l52-14 38 10-14 20-38 10-30 12-16-16z",
    ],
    hi: [
      // South America
      "M180 62l70-18 58 26 30 48-6 56-34 62-40 42-34 6-26-40-8-58-22-52 2-48z",
    ],
  },
};

const cache = new Map<string, Buffer>();
const CACHE_MAX = 64;

export function isMapRegion(value: string): value is MapRegion {
  return (MAP_REGIONS as readonly string[]).includes(value);
}

/**
 * Render a duotone region map PNG at the given pixel width (3:5 aspect,
 * 480x300 viewBox). Returns null for an unknown region — honest absence.
 */
export function mapPng(region: string, px: number, baseColor: string, highlightColor: string): Buffer | null {
  if (!isMapRegion(region)) return null;
  const width = Math.max(160, Math.min(2400, Math.round(px)));
  const key = `${region}|${width}|${baseColor}|${highlightColor}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const art = REGIONS[region];
  const lo = art.lo.map((d) => `<path d="${d}" fill="${baseColor}" fill-opacity="0.55"/>`).join("");
  const hi = art.hi
    .map((d) => `<path d="${d}" fill="${highlightColor}" fill-opacity="0.9" stroke="${highlightColor}" stroke-opacity="0.4" stroke-width="3"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">${lo}${hi}</svg>`;
  const png = Buffer.from(
    new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: false } })
      .render()
      .asPng(),
  );
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, png);
  return png;
}
