// Renders the two PC2 requirements-adherence workflow diagrams as SVG + PNG.
// Run: node scripts/src/renderRequirementDiagrams.mjs
// Fonts: expects Hanken Grotesk static TTFs in /tmp/fonts (downloaded from Google Fonts).

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(
  path.resolve(process.cwd(), "artifacts/api-server/package.json"),
);
const { Resvg } = require("@resvg/resvg-js");

const OUT_DIR = path.resolve(process.cwd(), "exports/diagrams");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Telefónica palette (mirrors Mística Telefónica skin tokens) ─────────────
const C = {
  navy: "#031A34",
  navySoft: "#0B2739",
  textSecondary: "#6E7894",
  brand: "#0066FF",
  brandLight: "#99C2FF",
  brandLow: "#E5F0FF",
  border: "#DDDDDD",
  white: "#FFFFFF",
  bg: "#FFFFFF",
  laneTargetFill: "#031A34",
  success: "#008535",
  error: "#D73241",
  neutral: "#6E7894",
};

const FONT = "Hanken Grotesk";

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Greedy word wrap using an approximate average glyph width.
function wrap(text, size, maxW, factor) {
  const f = factor ?? 0.53;
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  const w = (s) => s.length * size * f;
  for (const word of words) {
    const t = cur ? `${cur} ${word}` : word;
    if (w(t) <= maxW) cur = t;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function textLines(x, y, lines, { size, weight, fill, lh, ls }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lh}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${ls ? ` letter-spacing="${ls}"` : ""}>${esc(line)}</text>`,
    )
    .join("\n");
}

// ── Layout constants ─────────────────────────────────────────────────────────
const W = 2520;
const MARGIN = 70;
const GUTTER_X = 240; // left gutter for rotated swimlane labels
const N_COLS = 5;
const COL_GAP = 64;
const COL_W = Math.floor((W - GUTTER_X - MARGIN - (N_COLS - 1) * COL_GAP) / N_COLS);
const PAD = 24;
const INNER_W = COL_W - 2 * PAD;

const BODY_SIZE = 15.5;
const BODY_LH = 22;
const TITLE_SIZE = 18;
const TITLE_LH = 24;
const CHIP_ROW_H = 34;

// Measure content height of a box: title + body + optional chip rows.
function boxContent(stagePart) {
  const titleLines = wrap(stagePart.title, TITLE_SIZE, INNER_W, 0.55);
  const bodyLines = stagePart.body
    ? wrap(stagePart.body, BODY_SIZE, INNER_W, 0.53)
    : [];
  const chipRows = stagePart.chips ? stagePart.chips.length : 0;
  const outcomeRows = stagePart.outcomes ? stagePart.outcomes.length : 0;
  const h =
    titleLines.length * TITLE_LH +
    (bodyLines.length ? 10 + bodyLines.length * BODY_LH : 0) +
    (chipRows ? 14 + chipRows * CHIP_ROW_H : 0) +
    (outcomeRows ? 14 + outcomeRows * CHIP_ROW_H : 0);
  return { titleLines, bodyLines, h };
}

function drawBox(x, y, h, stagePart, variant) {
  const isTarget = variant === "target";
  const fill = isTarget ? C.laneTargetFill : C.white;
  const stroke = isTarget ? C.laneTargetFill : C.border;
  const titleFill = isTarget ? C.white : C.brand;
  const bodyFill = isTarget ? "rgba(255,255,255,0.82)" : C.navy;
  const { titleLines, bodyLines } = boxContent(stagePart);
  let svg = `<rect x="${x}" y="${y}" width="${COL_W}" height="${h}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  let cy = y + PAD + TITLE_SIZE;
  // requirement tag (target boxes only)
  if (isTarget && stagePart.tag) {
    svg += `<text x="${x + PAD}" y="${cy - 2}" font-family="${FONT}" font-size="11.5" font-weight="700" letter-spacing="1.6" fill="${C.brandLight}">${esc(stagePart.tag.toUpperCase())}</text>`;
    cy += 22;
  }
  svg += textLines(x + PAD, cy, titleLines, {
    size: TITLE_SIZE,
    weight: 700,
    fill: titleFill,
    lh: TITLE_LH,
  });
  cy += (titleLines.length - 1) * TITLE_LH;
  if (bodyLines.length) {
    cy += 10 + BODY_LH;
    svg += textLines(x + PAD, cy, bodyLines, {
      size: BODY_SIZE,
      weight: 400,
      fill: bodyFill,
      lh: BODY_LH,
    });
    cy += (bodyLines.length - 1) * BODY_LH;
  }
  if (stagePart.chips) {
    cy += 16;
    stagePart.chips.forEach((chip, i) => {
      const ry = cy + i * CHIP_ROW_H;
      const circleFill = isTarget ? C.brand : C.brandLow;
      const numFill = isTarget ? C.white : C.brand;
      const txtFill = isTarget ? "rgba(255,255,255,0.9)" : C.navy;
      svg += `<circle cx="${x + PAD + 11}" cy="${ry + 4}" r="11" fill="${circleFill}"/>`;
      svg += `<text x="${x + PAD + 11}" y="${ry + 8.5}" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="700" fill="${numFill}">${i + 1}</text>`;
      const lines = wrap(chip, 14.5, INNER_W - 34, 0.53).slice(0, 2);
      svg += textLines(x + PAD + 32, ry + 4 + (lines.length > 1 ? -6 : 4), lines, {
        size: 14.5,
        weight: 500,
        fill: txtFill,
        lh: 18,
      });
    });
    cy += stagePart.chips.length * CHIP_ROW_H;
  }
  if (stagePart.outcomes) {
    cy += 16;
    stagePart.outcomes.forEach((o, i) => {
      const ry = cy + i * CHIP_ROW_H;
      const pillW = o.label.length * 8.4 + 26;
      svg += `<rect x="${x + PAD}" y="${ry - 12}" width="${pillW}" height="25" rx="12.5" fill="${o.color}" fill-opacity="0.12" stroke="${o.color}" stroke-width="1.2"/>`;
      svg += `<text x="${x + PAD + 13}" y="${ry + 5}" font-family="${FONT}" font-size="13.5" font-weight="600" fill="${o.color}">${esc(o.label)}</text>`;
      if (o.note) {
        svg += `<text x="${x + PAD + pillW + 12}" y="${ry + 5}" font-family="${FONT}" font-size="13.5" font-weight="400" fill="${C.textSecondary}">${esc(o.note)}</text>`;
      }
    });
  }
  return svg;
}

function hArrow(x1, x2, y, color) {
  const head = 9;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2 - head}" y2="${y}" stroke="${color}" stroke-width="2.5"/>` +
    `<path d="M ${x2 - head} ${y - 6.5} L ${x2} ${y} L ${x2 - head} ${y + 6.5} Z" fill="${color}"/>`
  );
}

function mapsToConnector(cx, y1, y2) {
  const midY = (y1 + y2) / 2;
  const label = "maps to";
  const pillW = label.length * 7.6 + 24;
  return (
    `<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2}" stroke="${C.brand}" stroke-width="2" stroke-dasharray="5 5"/>` +
    `<path d="M ${cx - 5.5} ${y2 - 8} L ${cx} ${y2} L ${cx + 5.5} ${y2 - 8} Z" fill="${C.brand}"/>` +
    `<rect x="${cx - pillW / 2}" y="${midY - 13}" width="${pillW}" height="26" rx="13" fill="${C.white}" stroke="${C.brand}" stroke-width="1.3"/>` +
    `<text x="${cx}" y="${midY + 4.5}" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="600" fill="${C.brand}">${label}</text>`
  );
}

// Rotated swimlane label in the left gutter, vertically centred on the lane.
function laneLabel(laneY, laneH, label, sub) {
  const cx = MARGIN + 26;
  const cy = laneY + laneH / 2;
  let svg = `<line x1="${MARGIN + 66}" y1="${laneY + 6}" x2="${MARGIN + 66}" y2="${laneY + laneH - 6}" stroke="${C.border}" stroke-width="2"/>`;
  svg += `<text transform="rotate(-90 ${cx} ${cy})" x="${cx}" y="${cy}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="800" letter-spacing="2.4" fill="${C.navy}">${esc(label.toUpperCase())}</text>`;
  if (sub) {
    svg += `<text transform="rotate(-90 ${cx + 26} ${cy})" x="${cx + 26}" y="${cy}" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="400" fill="${C.textSecondary}">${esc(sub)}</text>`;
  }
  return svg;
}

function renderDiagram(spec) {
  const { header, title, subtitle, stages, legend, footer } = spec;

  // Lane heights = max content height across stages + padding.
  const targetH =
    Math.max(...stages.map((s) => boxContent(s.target).h)) + 2 * PAD + 22; // +tag row
  const demoH = Math.max(...stages.map((s) => boxContent(s.demo).h)) + 2 * PAD;

  const yTitle = 96;
  const ySubtitle = yTitle + 46;
  const subtitleLines = wrap(subtitle, 19, W - 2 * MARGIN, 0.52);
  const yLane1 = ySubtitle + subtitleLines.length * 27 + 44;
  const yConnTop = yLane1 + targetH;
  const CONN_GAP = 86;
  const yLane2 = yConnTop + CONN_GAP;
  const yLegend = yLane2 + demoH + 64;
  const legendRows = legend.length;
  const LEGEND_ROW_H = 40;
  const yFooter = yLegend + 34 + legendRows * LEGEND_ROW_H + 18;
  const H = yFooter + 40;

  let svg = "";
  svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="${C.bg}"/>`;
  // Header rule + eyebrow
  svg += `<rect x="${MARGIN}" y="${yTitle - 52}" width="56" height="6" rx="3" fill="${C.brand}"/>`;
  svg += `<text x="${MARGIN}" y="${yTitle - 20}" font-family="${FONT}" font-size="15" font-weight="700" letter-spacing="2.4" fill="${C.brand}">${esc(header.toUpperCase())}</text>`;
  svg += `<text x="${MARGIN}" y="${yTitle + 22}" font-family="${FONT}" font-size="38" font-weight="800" fill="${C.navy}">${esc(title)}</text>`;
  svg += textLines(MARGIN, ySubtitle + 20, subtitleLines, {
    size: 19,
    weight: 400,
    fill: C.textSecondary,
    lh: 27,
  });

  svg += laneLabel(yLane1, targetH, "RFP target", "what PC2 requires");
  svg += laneLabel(yLane2, demoH, "Hub SSoT demo", "current implementation");

  stages.forEach((stage, i) => {
    const x = GUTTER_X + i * (COL_W + COL_GAP);
    svg += drawBox(x, yLane1, targetH, { ...stage.target, tag: stage.label }, "target");
    svg += drawBox(x, yLane2, demoH, stage.demo, "demo");
    // horizontal arrows
    if (i < stages.length - 1) {
      const ax1 = x + COL_W + 8;
      const ax2 = x + COL_W + COL_GAP - 8;
      svg += hArrow(ax1, ax2, yLane1 + targetH / 2, C.brand);
      svg += hArrow(ax1, ax2, yLane2 + demoH / 2, "#9AA6B8");
    }
    // maps-to connector
    svg += mapsToConnector(x + COL_W / 2, yLane1 + targetH + 6, yLane2 - 6);
  });

  // Legend / mapping strip
  svg += `<rect x="${MARGIN}" y="${yLegend - 26}" width="${W - 2 * MARGIN}" height="${34 + legendRows * LEGEND_ROW_H}" rx="16" fill="${C.brandLow}"/>`;
  svg += `<text x="${MARGIN + PAD}" y="${yLegend + 4}" font-family="${FONT}" font-size="13" font-weight="800" letter-spacing="2" fill="${C.brand}">TARGET ↔ DEMO MAPPING</text>`;
  const legendColW = (W - 2 * MARGIN - 2 * PAD) / 2;
  legend.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = MARGIN + PAD + col * legendColW;
    const ly = yLegend + 34 + row * LEGEND_ROW_H;
    svg += `<rect x="${lx}" y="${ly - 10}" width="10" height="10" rx="2.5" fill="${C.brand}"/>`;
    svg += `<text x="${lx + 22}" y="${ly}" font-family="${FONT}" font-size="15.5" font-weight="500" fill="${C.navy}">${esc(item)}</text>`;
  });

  svg += `<text x="${MARGIN}" y="${yFooter}" font-family="${FONT}" font-size="13.5" font-weight="400" fill="${C.textSecondary}">${esc(footer)}</text>`;
  svg += `<text x="${W - MARGIN}" y="${yFooter}" text-anchor="end" font-family="${FONT}" font-size="13.5" font-weight="700" fill="${C.brand}">Telefónica · Hub SSoT</text>`;

  // fix legend row count when odd
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${svg}\n</svg>`;
}

// ── Diagram 1 — Access rights (early-binding access control) ────────────────
const diagram1 = {
  header: "PC2 · Access rights",
  title: "Access rights — early-binding access control",
  subtitle:
    "Access = the intersection of two axes (user axis × document axis), applied at index / retrieval time — never filtered by the agent or the LLM. If a user lacks permission, a chunk never enters the model context.",
  stages: [
    {
      label: "User axis",
      target: {
        title: "Entra ID groups",
        body: "The user's area and profile (Communication, Brand, Cabinet plus subgroups) come from directory group membership.",
      },
      demo: {
        title: "Personas / roles",
        body: "The persona's roleId resolves to area + clearance, e.g. Communications Director maps to Comunicación with confidential clearance.",
      },
    },
    {
      label: "Document axis",
      target: {
        title: "Sensitivity labels (Purview / MIP)",
        body: "Each document carries a confidentiality level inherited from the Microsoft source: public, private or confidential, plus group.",
      },
      demo: {
        title: "Corpus confidentiality labels",
        body: "Every governed document is labelled public, private, confidential or off_the_record, and carries its area scope (Comunicación, Marca, Gabinete).",
      },
    },
    {
      label: "Early binding",
      target: {
        title: "Intersection inside the index query",
        body: "Both axes intersect at retrieval time: permissions are part of the search itself, not a post-filter applied by the agent.",
      },
      demo: {
        title: "Filters inside the vector search",
        body: "Clearance and area become payload must-filters injected into the Qdrant hybrid query (dense + sparse, RRF fusion) — the governance filter is the query.",
      },
    },
    {
      label: "No context entry",
      target: {
        title: "Unpermitted chunks never reach the model",
        body: "Even if retrieval finds a chunk, without permission it does not enter the context. The agent / LLM never decides or filters.",
      },
      demo: {
        title: "Blocked hits are ids only",
        body: "Unpermitted chunks are never returned by the search. A blocked-side probe yields ids only — used solely to label a refusal, never snippets — and a live-label re-check fails closed.",
      },
    },
    {
      label: "Governed outcome",
      target: {
        title: "Answer or honest refusal",
        body: "The user receives evidence they are permitted to see, or an explicit refusal — decided upstream of the model.",
      },
      demo: {
        title: "Decision before any model call",
        body: "Refusals return before any Claude call and carry no snippets — only a classification label.",
        outcomes: [
          { label: "answered", color: C.success, note: "cited, permitted evidence" },
          { label: "permission_blocked", color: C.error, note: "no model call" },
          { label: "no_evidence", color: C.neutral, note: "no model call" },
        ],
      },
    },
  ],
  legend: [
    "Entra ID groups ↔ demo personas / roles (roleId → area + clearance)",
    "Purview / MIP sensitivity labels ↔ corpus levels public · private · confidential · off_the_record",
    "ACL enforced in the search index ↔ clearance + area payload filters inside the Qdrant query",
    "\u201CThe agent/LLM never filters\u201D ↔ permission_blocked / no_evidence returned before the Claude call",
  ],
  footer:
    "Every demo component corresponds to an actual code path in the Hub SSoT implementation (governance resolver, governed retrieval front door, ask agent).",
};

// ── Diagram 2 — Taxonomy / tagging as configuration, not code ───────────────
const diagram2 = {
  header: "PC2 · Taxonomy / tagging",
  title: "Taxonomy and tagging — configuration, not code",
  subtitle:
    "Two taxonomy layers, versioned as configuration and applied after embedding. Embeddings are taxonomy-agnostic, so re-tagging never requires re-ingestion, re-embedding, redeployment — or IT.",
  stages: [
    {
      label: "Two layers",
      target: {
        title: "Deterministic + derived",
        body: "Deterministic: what the document IS — market, brand, owner, confidentiality, validity. Derived: what it SAYS — plan axes, topics, entities; the layer that changes with strategy.",
      },
      demo: {
        title: "Document metadata",
        body: "Deterministic fields live on every governed doc (country, brand, owner, confidentiality, validity). Derived tags are axisIds + topics — the part a re-tag rewrites.",
      },
    },
    {
      label: "Tags as configuration",
      target: {
        title: "Versioned metadata, applied after embedding",
        body: "Tags don't live in the code: they are configuration, versioned, applied after embedding. Embeddings are calculated once and stay agnostic to the taxonomy.",
      },
      demo: {
        title: "Versioned taxonomy store",
        body: "Taxonomy versions are governance configuration (seed corpus = v4; each applied edit creates v5, v6, …) with actor, note and audit trail. Chunks and vectors stay untouched.",
      },
    },
    {
      label: "Governed re-tag flow",
      target: {
        title: "Strategy edited from a governance panel",
        chips: [
          "Editing — the strategy change",
          "Mapping table of affected documents",
          "Assisted zero-shot re-classification",
          "Human validation",
        ],
      },
      demo: {
        title: "The same four steps in the demo",
        chips: [
          "Axis edit in the governance panel",
          "Candidate mapping table per axis",
          "Claude-assisted re-tag proposals",
          "Human accepts / rejects each proposal",
        ],
      },
    },
    {
      label: "Metadata-only update",
      target: {
        title: "No re-ingestion · no re-embedding · no redeploy · no IT",
        body: "Re-tagging existing data is a back-end metadata operation — nothing is re-ingested, re-embedded or redeployed.",
      },
      demo: {
        title: "Payload update in the vector store",
        body: "Accepted re-tags become set_payload updates on axisIds, topics and taxonomyVersion in Qdrant — vectors are never recomputed. The index commits first; only then is the version committed locally.",
      },
    },
    {
      label: "Governed truth",
      target: {
        title: "A governance operation, not a technical project",
        body: "Changing the strategy is a configuration change, validated by humans — not a redeployment or an IT project.",
      },
      demo: {
        title: "Human validation is the gate",
        body: "The agent can propose re-tags, but only human-accepted decisions become overrides in a committed taxonomy version — with an audit entry recording what was applied and what was rejected.",
      },
    },
  ],
  legend: [
    "Governance panel ↔ demo taxonomy panel (axis edit, proposal review, apply)",
    "Assisted zero-shot re-classification ↔ Claude-assisted re-tag proposals over the candidate mapping",
    "Tags applied after embedding ↔ Qdrant set_payload on axisIds / topics — vectors untouched",
    "Versioned taxonomy rollout ↔ taxonomy vN commit, persisted and re-applied at boot, with audit entry",
  ],
  footer:
    "Every demo component corresponds to an actual code path in the Hub SSoT implementation (governance engine, re-tag agent, vector-store payload updates).",
};

// ── Render ───────────────────────────────────────────────────────────────────
const fontFiles = fs
  .readdirSync("/tmp/fonts")
  .filter((f) => /^HankenGrotesk-\d+\.ttf$/.test(f))
  .map((f) => path.join("/tmp/fonts", f));
// Glyph fallback for arrows (U+2194, U+2192) missing from Hanken Grotesk.
for (const f of [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]) {
  if (fs.existsSync(f)) fontFiles.push(f);
}

function renderToFiles(spec, baseName) {
  const svg = renderDiagram(spec);
  fs.writeFileSync(path.join(OUT_DIR, `${baseName}.svg`), svg, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 3600 },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT },
    background: "#FFFFFF",
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(OUT_DIR, `${baseName}.png`), png);
  console.log(`${baseName}: svg + png written (${(png.length / 1024 / 1024).toFixed(1)} MB png)`);
}

renderToFiles(diagram1, "access-rights-early-binding");
renderToFiles(diagram2, "taxonomy-as-configuration");
