// Curated line-icon set for visual slide layouts — the benchmark deck's
// "icon card" vocabulary. Every icon is hand-drawn stroke art on a 24x24
// grid, rendered deterministically to PNG via resvg (same engine as every
// other slide asset, so PPTX / PDF / preview pixels match).
//
// Governance rule (same as brand images): an unknown icon name renders
// NOTHING — honest absence, never a substituted icon.

import { Resvg } from "@resvg/resvg-js";

// Inner SVG markup per icon. Stroke colour is the token %C%, replaced at
// render time. All icons: stroke-width 1.8, round caps/joins, fill none
// unless the shape needs a filled dot.
const S = `fill="none" stroke="%C%" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
const DOT = (cx: number, cy: number, r = 1.3) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="%C%"/>`;

const ICONS: Record<string, string> = {
  network: `<circle cx="12" cy="12" r="2.2" ${S}/><circle cx="4.5" cy="5" r="1.8" ${S}/><circle cx="19.5" cy="5" r="1.8" ${S}/><circle cx="4.5" cy="19" r="1.8" ${S}/><circle cx="19.5" cy="19" r="1.8" ${S}/><path d="M10.4 10.6 6 6.4M13.6 10.6 18 6.4M10.4 13.4 6 17.6M13.6 13.4 18 17.6" ${S}/>`,
  globe: `<circle cx="12" cy="12" r="9" ${S}/><path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9S14.8 18.4 12 21M12 3C9.2 5.6 7.8 8.6 7.8 12s1.4 6.4 4.2 9" ${S}/>`,
  shield: `<path d="M12 3l7.5 2.8v5.4c0 4.6-3 8.1-7.5 9.8-4.5-1.7-7.5-5.2-7.5-9.8V5.8L12 3z" ${S}/><path d="M8.8 12l2.2 2.2 4.2-4.4" ${S}/>`,
  cloud: `<path d="M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 8.6 4.2 4.2 0 0 1 16.8 18H7z" ${S}/>`,
  chip: `<rect x="7" y="7" width="10" height="10" rx="1.5" ${S}/><rect x="10" y="10" width="4" height="4" ${S}/><path d="M9 7V4M12 7V4M15 7V4M9 20v-3M12 20v-3M15 20v-3M7 9H4M7 12H4M7 15H4M20 9h-3M20 12h-3M20 15h-3" ${S}/>`,
  growth: `<path d="M4 20V4" ${S}/><path d="M4 20h16" ${S}/><path d="M7 15l4-4 3 2.5L19 8" ${S}/><path d="M19 12V8h-4" ${S}/>`,
  people: `<circle cx="9" cy="8.5" r="3" ${S}/><path d="M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" ${S}/><circle cx="16.5" cy="9.5" r="2.4" ${S}/><path d="M15.8 14.6c2.4.2 4.2 1.8 4.7 4.4" ${S}/>`,
  person: `<circle cx="12" cy="8" r="3.4" ${S}/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" ${S}/>`,
  handshake: `<path d="M2.5 7.5h4l3-1.5c1-.5 2-.5 3 0l1 .5" ${S}/><path d="M21.5 7.5h-4l-3.5 3.2a1.35 1.35 0 0 1-2-1.8l2.5-2.4" ${S}/><path d="M6.5 7.5v6.5l4.2 3.6c.9.8 2 .8 2.8.1l4-3.7V7.5" ${S}/><path d="M9.5 15.5l1.6 1.4M12 13.8l1.6 1.4" ${S}/>`,
  building: `<rect x="5" y="4" width="10" height="16" ${S}/><path d="M15 9h4v11h-4M5 20h16" ${S}/><path d="M8 8h2M8 12h2M8 16h2M12 8h0M12 12h0M12 16h0" ${S}/>`,
  device: `<rect x="7.5" y="3" width="9" height="18" rx="2" ${S}/><path d="M10.5 5.2h3" ${S}/>${DOT(12, 18.4)}`,
  euro: `<path d="M17 6.5A6.5 6.5 0 0 0 6.8 12 6.5 6.5 0 0 0 17 17.5" ${S}/><path d="M4.5 10.3h8M4.5 13.7h7" ${S}/>`,
  calendar: `<rect x="4" y="5.5" width="16" height="14.5" rx="1.5" ${S}/><path d="M4 10h16M8 3.5v4M16 3.5v4" ${S}/>${DOT(8.5, 14)}${DOT(12, 14)}${DOT(15.5, 14)}`,
  document: `<path d="M6.5 3h7L18.5 8v13h-12V3z" ${S}/><path d="M13.5 3v5h5" ${S}/><path d="M9 12.5h6M9 16h6" ${S}/>`,
  check: `<circle cx="12" cy="12" r="9" ${S}/><path d="M7.8 12.2l2.8 2.8 5.6-6" ${S}/>`,
  target: `<circle cx="12" cy="12" r="8.5" ${S}/><circle cx="12" cy="12" r="4.8" ${S}/>${DOT(12, 12, 1.6)}`,
  lightbulb: `<path d="M9 18v-2.2c-2-1.2-3.2-3.1-3.2-5.4A6.2 6.2 0 0 1 12 4.2a6.2 6.2 0 0 1 6.2 6.2c0 2.3-1.2 4.2-3.2 5.4V18H9z" ${S}/><path d="M9.5 21h5" ${S}/>`,
  pin: `<path d="M12 21s-6.8-6-6.8-11A6.8 6.8 0 0 1 12 3.2 6.8 6.8 0 0 1 18.8 10c0 5-6.8 11-6.8 11z" ${S}/><circle cx="12" cy="10" r="2.4" ${S}/>`,
  antenna: `<path d="M12 21V9.5" ${S}/>${DOT(12, 7.8, 1.7)}<path d="M7.8 3.8a8 8 0 0 0 0 8M16.2 3.8a8 8 0 0 1 0 8M5.2 1.8a11.5 11.5 0 0 0 0 12M18.8 1.8a11.5 11.5 0 0 1 0 12" ${S}/>`,
  satellite: `<rect x="9.6" y="9.6" width="4.8" height="4.8" rx="0.8" transform="rotate(45 12 12)" ${S}/><path d="M5 3.5 8.8 7.3M19 20.5l-3.8-3.8" ${S}/><path d="M3 8.5 8.5 3M15.5 21 21 15.5" ${S}/><path d="M16.8 7.2a4.5 4.5 0 0 1 0 0" ${S}/>`,
  factory: `<path d="M4 20V9l5 3.5V9l5 3.5V6.5h6V20H4z" ${S}/><path d="M8 16.5h2M13 16.5h2" ${S}/>`,
  leaf: `<path d="M6 18C6 9.5 12 5 20 5c0 8.5-4.5 13.5-13 13.5" ${S}/><path d="M4 21c3-6 7-10 12-12" ${S}/>`,
  scale: `<path d="M12 4v16M5 20h14" ${S}/><path d="M12 6l-6 2M12 6l6 2" ${S}/><path d="M3.2 13.5 6 8l2.8 5.5a3 3 0 0 1-5.6 0zM15.2 13.5 18 8l2.8 5.5a3 3 0 0 1-5.6 0z" ${S}/>`,
  lock: `<rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" ${S}/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ${S}/>${DOT(12, 15.2, 1.4)}`,
  star: `<path d="M12 3.6l2.5 5.2 5.7.7-4.2 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.2-4 5.7-.7L12 3.6z" ${S}/>`,
  "arrow-up": `<path d="M12 20V5M6 11l6-6 6 6" ${S}/>`,
  "arrow-right": `<path d="M4 12h15M13 6l6 6-6 6" ${S}/>`,
  "arrow-down": `<path d="M12 4v15M6 13l6 6 6-6" ${S}/>`,
  rocket: `<path d="M12 16c-3.5-2.5-4.5-8 0-12.5C16.5 8 15.5 13.5 12 16z" ${S}/><path d="M12 16v4" ${S}/><path d="M9 13.5c-2 .3-3.2 1.6-3.8 3.8 2.2-.6 3.5-.6 3.8-1.3M15 13.5c2 .3 3.2 1.6 3.8 3.8-2.2-.6-3.5-.6-3.8-1.3" ${S}/><circle cx="12" cy="8.6" r="1.5" ${S}/>`,
  gear: `<circle cx="12" cy="12" r="3" ${S}/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" ${S}/>`,
  wifi: `<path d="M2.5 9a14.5 14.5 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.5 16a5.5 5.5 0 0 1 7 0" ${S}/>${DOT(12, 19.2, 1.5)}`,
  database: `<ellipse cx="12" cy="5.5" rx="7.5" ry="2.7" ${S}/><path d="M4.5 5.5v13c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7v-13" ${S}/><path d="M4.5 12c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7" ${S}/>`,
  server: `<rect x="4" y="4" width="16" height="6.5" rx="1.2" ${S}/><rect x="4" y="13.5" width="16" height="6.5" rx="1.2" ${S}/>${DOT(7.2, 7.2)}${DOT(7.2, 16.8)}<path d="M13 7.2h4M13 16.8h4" ${S}/>`,
  link: `<path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.24 4.24 0 0 0-6-6l-1.2 1.2" ${S}/><path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.24 4.24 0 0 0 6 6l1.2-1.2" ${S}/>`,
  bolt: `<path d="M13 2.5 5 13.5h6L11 21.5l8-11h-6l0-8z" ${S}/>`,
  heart: `<path d="M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7.6 4.4 4.4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" ${S}/>`,
  eye: `<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" ${S}/><circle cx="12" cy="12" r="2.8" ${S}/>`,
  search: `<circle cx="10.5" cy="10.5" r="6.5" ${S}/><path d="M15.3 15.3 21 21" ${S}/>`,
  warning: `<path d="M12 3.5 22 20H2L12 3.5z" ${S}/><path d="M12 9.5v5" ${S}/>${DOT(12, 17.2, 1.2)}`,
  flag: `<path d="M5 21V4" ${S}/><path d="M5 5c4-2 7 2 12 0v8c-5 2-8-2-12 0" ${S}/>`,
  layers: `<path d="M12 3.5 21 8.5 12 13.5 3 8.5 12 3.5z" ${S}/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5" ${S}/>`,
  home: `<path d="M4 11 12 4l8 7" ${S}/><path d="M6 9.5V20h12V9.5" ${S}/><path d="M10 20v-5h4v5" ${S}/>`,
  tv: `<rect x="3" y="6" width="18" height="12" rx="1.5" ${S}/><path d="M9 21h6M8 3l4 3 4-3" ${S}/>`,
  headset: `<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" ${S}/><rect x="3.5" y="13" width="4" height="6" rx="1.5" ${S}/><rect x="16.5" y="13" width="4" height="6" rx="1.5" ${S}/><path d="M18.5 19v1a2.5 2.5 0 0 1-2.5 2.5h-2.5" ${S}/>`,
  wrench: `<path d="M14.5 6.5a4.5 4.5 0 0 1 5.4-1.1l-3.2 3.2 2.7 2.7 3.2-3.2a4.5 4.5 0 0 1-6 5.6L8 22.3a2 2 0 0 1-2.8-2.8l8.6-8.6a4.5 4.5 0 0 1 .7-4.4z" transform="scale(0.85) translate(1.8 1.2)" ${S}/>`,
};

export const ICON_NAMES = Object.keys(ICONS).sort();

// Loose aliasing so semantically-equivalent agent picks resolve without ever
// substituting a DIFFERENT concept: aliases map to the same idea only.
const ALIASES: Record<string, string> = {
  security: "shield",
  ai: "chip",
  chart: "growth",
  "chart-up": "growth",
  talent: "people",
  team: "people",
  user: "person",
  customer: "person",
  partnership: "handshake",
  office: "building",
  city: "building",
  phone: "device",
  mobile: "device",
  money: "euro",
  revenue: "euro",
  date: "calendar",
  report: "document",
  file: "document",
  done: "check",
  goal: "target",
  idea: "lightbulb",
  innovation: "lightbulb",
  location: "pin",
  "map-pin": "pin",
  tower: "antenna",
  "5g": "antenna",
  sustainability: "leaf",
  green: "leaf",
  regulation: "scale",
  legal: "scale",
  privacy: "lock",
  quality: "star",
  launch: "rocket",
  settings: "gear",
  connectivity: "wifi",
  data: "database",
  infrastructure: "server",
  energy: "bolt",
  speed: "bolt",
  health: "heart",
  vision: "eye",
  risk: "warning",
  milestone: "flag",
  platform: "layers",
  stack: "layers",
  household: "home",
  media: "tv",
  entertainment: "tv",
  support: "headset",
  service: "headset",
  tools: "wrench",
  fiber: "link",
  fibre: "link",
};

/** Resolve an agent-supplied icon name to a canonical icon id, or null. */
export function resolveIconName(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (ICONS[key]) return key;
  const alias = ALIASES[key];
  return alias && ICONS[alias] ? alias : null;
}

const cache = new Map<string, Buffer>();
const CACHE_MAX = 256;

/**
 * Render an icon to a square PNG at `px` pixels in the given colour.
 * Returns null for an unknown icon — the caller renders honest absence.
 */
export function iconPng(name: string, px: number, color: string): Buffer | null {
  const id = resolveIconName(name);
  if (!id) return null;
  const size = Math.max(16, Math.min(512, Math.round(px)));
  const key = `${id}|${size}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const body = ICONS[id].replace(/%C%/g, color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${body}</svg>`;
  const png = Buffer.from(
    new Resvg(svg, { fitTo: { mode: "width", value: size }, font: { loadSystemFonts: false } })
      .render()
      .asPng(),
  );
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, png);
  return png;
}
