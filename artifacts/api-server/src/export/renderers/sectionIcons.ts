// Built-in line icons for longform forecast section headings (Previsiones).
// Eight simple stroke icons drawn on a 24x24 viewbox, rasterized to PNG via
// resvg so the pdf (pdfkit) and docx (ImageRun) renderers share one source.
// Icon choice is keyword-matched against the section heading, with a neutral
// fallback — an unmatched heading still gets an honest generic mark.

import { Resvg } from "@resvg/resvg-js";

export type SectionIconName =
  | "star"
  | "newspaper"
  | "mic"
  | "building"
  | "award"
  | "users"
  | "share"
  | "dots";

// Stroke path data per icon (24x24 viewbox, 2px stroke, round caps/joins).
const ICON_PATHS: Record<SectionIconName, string[]> = {
  star: [
    "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3z",
  ],
  newspaper: [
    "M4 5h13v14H6a2 2 0 0 1-2-2V5z",
    "M17 8h3v9a2 2 0 0 1-2 2h-1",
    "M7 9h7",
    "M7 12.5h7",
    "M7 16h4.5",
  ],
  mic: [
    "M12 4a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0v-5A2.5 2.5 0 0 1 12 4z",
    "M6.5 11.5a5.5 5.5 0 0 0 11 0",
    "M12 17v3",
    "M9 20h6",
  ],
  building: [
    "M5 20V6l7-3 7 3v14",
    "M3 20h18",
    "M9 9h1.5M13.5 9H15M9 12.5h1.5M13.5 12.5H15",
    "M10.5 20v-3.5h3V20",
  ],
  award: [
    "M12 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10z",
    "M9 12.8L7.5 20l4.5-2.4L16.5 20 15 12.8",
  ],
  users: [
    "M9 6.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
    "M3.5 19a5.5 5.5 0 0 1 11 0",
    "M15.5 7a2.7 2.7 0 1 1 0 5.4",
    "M16.5 13.9a5 5 0 0 1 4 4.9",
  ],
  share: [
    "M17 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
    "M7 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
    "M17 14.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
    "M9.2 10.9l5.6-3M9.2 13.1l5.6 3",
  ],
  dots: [
    "M5 12h.01M12 12h.01M19 12h.01",
  ],
};

// Keyword → icon routing for section headings (Spanish and English forms).
const ICON_KEYWORDS: [RegExp, SectionIconName][] = [
  [/destacad|highlight|flagship/i, "star"],
  [/prensa|press|nota/i, "newspaper"],
  [/medio|media|briefing|entrevista|interview/i, "mic"],
  [/institucion|government|regulator|public sector/i, "building"],
  [/patrocin|sponsor|activaci/i, "award"],
  [/interna|internal|employee|empleado/i, "users"],
  [/rrss|social|web|digital/i, "share"],
];

export function iconForHeading(heading: string): SectionIconName {
  for (const [pattern, name] of ICON_KEYWORDS) {
    if (pattern.test(heading)) return name;
  }
  return "dots";
}

function iconSvg(name: SectionIconName, color: string, sizePx: number): string {
  const paths = ICON_PATHS[name]
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24">${paths}</svg>`;
}

// Rasterized-PNG cache: icons repeat across sections, pages and exports.
const pngCache = new Map<string, Buffer>();

export function sectionIconPng(name: SectionIconName, color: string, sizePx: number): Buffer {
  const key = `${name}:${color}:${sizePx}`;
  const hit = pngCache.get(key);
  if (hit) return hit;
  const png = Buffer.from(
    new Resvg(iconSvg(name, color, sizePx), {
      fitTo: { mode: "width", value: sizePx },
    })
      .render()
      .asPng(),
  );
  pngCache.set(key, png);
  return png;
}
