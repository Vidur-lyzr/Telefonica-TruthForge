// Renders the four solution-document workflow diagrams as SVG + PNG, visually
// consistent with the two existing PC2 diagrams (renderRequirementDiagrams.mjs).
// Run: node scripts/src/renderSolutionDiagrams.mjs
// Fonts: expects Hanken Grotesk static TTFs in /tmp/fonts.

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
  dark: "#031A34",
  success: "#008535",
  error: "#D73241",
  warning: "#B0740B",
  neutral: "#6E7894",
};

const FONT = "Hanken Grotesk";

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

function textLines(x, y, lines, { size, weight, fill, lh, ls, anchor }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lh}"${anchor ? ` text-anchor="${anchor}"` : ""} font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${ls ? ` letter-spacing="${ls}"` : ""}>${esc(line)}</text>`,
    )
    .join("\n");
}

function header(svgW, headerText, title, subtitle, margin) {
  const yTitle = 96;
  const subtitleLines = wrap(subtitle, 19, svgW - 2 * margin, 0.52);
  let svg = "";
  svg += `<rect x="${margin}" y="${yTitle - 52}" width="56" height="6" rx="3" fill="${C.brand}"/>`;
  svg += `<text x="${margin}" y="${yTitle - 20}" font-family="${FONT}" font-size="15" font-weight="700" letter-spacing="2.4" fill="${C.brand}">${esc(headerText.toUpperCase())}</text>`;
  svg += `<text x="${margin}" y="${yTitle + 22}" font-family="${FONT}" font-size="38" font-weight="800" fill="${C.navy}">${esc(title)}</text>`;
  svg += textLines(margin, yTitle + 66, subtitleLines, {
    size: 19,
    weight: 400,
    fill: C.textSecondary,
    lh: 27,
  });
  return { svg, bottom: yTitle + 46 + subtitleLines.length * 27 + 30 };
}

function footerSvg(svgW, y, footer, margin) {
  return (
    `<text x="${margin}" y="${y}" font-family="${FONT}" font-size="13.5" font-weight="400" fill="${C.textSecondary}">${esc(footer)}</text>` +
    `<text x="${svgW - margin}" y="${y}" text-anchor="end" font-family="${FONT}" font-size="13.5" font-weight="700" fill="${C.brand}">Telefónica · Hub SSoT</text>`
  );
}

function hArrow(x1, x2, y, color) {
  const head = 9;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2 - head}" y2="${y}" stroke="${color}" stroke-width="2.5"/>` +
    `<path d="M ${x2 - head} ${y - 6.5} L ${x2} ${y} L ${x2 - head} ${y + 6.5} Z" fill="${color}"/>`
  );
}

function vArrow(x, y1, y2, color) {
  const head = 9;
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - head}" stroke="${color}" stroke-width="2.5"/>` +
    `<path d="M ${x - 6.5} ${y2 - head} L ${x} ${y2} L ${x + 6.5} ${y2 - head} Z" fill="${color}"/>`
  );
}

// ── Generic stage box (title + tag + body + chips + outcome pills) ──────────
const PAD = 24;
const BODY_SIZE = 15.5;
const BODY_LH = 22;
const TITLE_SIZE = 18;
const TITLE_LH = 24;
const CHIP_ROW_H = 34;

function chipLinesFor(chip, innerW) {
  return wrap(chip, 14.5, innerW - 34, 0.53).slice(0, 3);
}

function boxContent(part, colW) {
  const innerW = colW - 2 * PAD;
  const titleLines = wrap(part.title, TITLE_SIZE, innerW, 0.55);
  const bodyLines = part.body ? wrap(part.body, BODY_SIZE, innerW, 0.53) : [];
  let chipH = 0;
  if (part.chips) {
    for (const chip of part.chips) {
      const n = chipLinesFor(chip, innerW).length;
      chipH += Math.max(CHIP_ROW_H, n * 18 + 14);
    }
    chipH += 14;
  }
  const outcomeRows = part.outcomes ? part.outcomes.length : 0;
  const h =
    (part.tag ? 22 : 0) +
    titleLines.length * TITLE_LH +
    (bodyLines.length ? 10 + bodyLines.length * BODY_LH : 0) +
    chipH +
    (outcomeRows ? 14 + outcomeRows * CHIP_ROW_H : 0);
  return { titleLines, bodyLines, h };
}

function drawBox(x, y, colW, h, part, variant) {
  const isDark = variant === "dark";
  const innerW = colW - 2 * PAD;
  const fill = isDark ? C.dark : C.white;
  const stroke = isDark ? C.dark : C.border;
  const titleFill = isDark ? C.white : C.brand;
  const bodyFill = isDark ? "rgba(255,255,255,0.82)" : C.navy;
  const { titleLines, bodyLines } = boxContent(part, colW);
  let svg = `<rect x="${x}" y="${y}" width="${colW}" height="${h}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  let cy = y + PAD + TITLE_SIZE;
  if (part.tag) {
    svg += `<text x="${x + PAD}" y="${cy - 2}" font-family="${FONT}" font-size="11.5" font-weight="700" letter-spacing="1.6" fill="${isDark ? C.brandLight : C.brand}">${esc(part.tag.toUpperCase())}</text>`;
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
  if (part.chips) {
    cy += 16;
    part.chips.forEach((chip, i) => {
      const lines = chipLinesFor(chip, innerW);
      const rowH = Math.max(CHIP_ROW_H, lines.length * 18 + 14);
      const ry = cy;
      const circleFill = isDark ? C.brand : C.brandLow;
      const numFill = isDark ? C.white : C.brand;
      const txtFill = isDark ? "rgba(255,255,255,0.9)" : C.navy;
      svg += `<circle cx="${x + PAD + 11}" cy="${ry + 4}" r="11" fill="${circleFill}"/>`;
      svg += `<text x="${x + PAD + 11}" y="${ry + 8.5}" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="700" fill="${numFill}">${i + 1}</text>`;
      svg += textLines(x + PAD + 32, ry + 8, lines, {
        size: 14.5,
        weight: 500,
        fill: txtFill,
        lh: 18,
      });
      cy += rowH;
    });
  }
  if (part.outcomes) {
    cy += 16;
    part.outcomes.forEach((o, i) => {
      const ry = cy + i * CHIP_ROW_H;
      const pillW = o.label.length * 8.4 + 26;
      svg += `<rect x="${x + PAD}" y="${ry - 12}" width="${pillW}" height="25" rx="12.5" fill="${o.color}" fill-opacity="0.12" stroke="${o.color}" stroke-width="1.2"/>`;
      svg += `<text x="${x + PAD + 13}" y="${ry + 5}" font-family="${FONT}" font-size="13.5" font-weight="600" fill="${o.color}">${esc(o.label)}</text>`;
      if (o.note) {
        const noteFill = part.tag && false ? C.textSecondary : variant === "dark" ? "rgba(255,255,255,0.75)" : C.textSecondary;
        svg += `<text x="${x + PAD + pillW + 12}" y="${ry + 5}" font-family="${FONT}" font-size="13.5" font-weight="400" fill="${noteFill}">${esc(o.note)}</text>`;
      }
    });
  }
  return svg;
}

// ── Layout 1: single-lane horizontal flow with optional boundary divider ────
function renderFlow(spec) {
  const W = 2520;
  const MARGIN = 70;
  const n = spec.stages.length;
  const COL_GAP = spec.arrows === false ? 44 : 64;
  const colW = Math.floor((W - 2 * MARGIN - (n - 1) * COL_GAP) / n);

  const head = header(W, spec.header, spec.title, spec.subtitle, MARGIN);
  const yLane = head.bottom + (spec.boundary ? 56 : 24);
  const laneH =
    Math.max(...spec.stages.map((s) => boxContent(s, colW).h)) + 2 * PAD;

  let yLegend = yLane + laneH + 64;
  const legendRows = Math.ceil((spec.legend?.length ?? 0) / 2);
  const LEGEND_ROW_H = 40;
  const legendH = spec.legend ? 34 + legendRows * LEGEND_ROW_H : 0;
  const yFooter = yLegend + legendH + 18;
  const H = yFooter + 40;

  let svg = `<rect x="0" y="0" width="${W}" height="${H}" fill="${C.bg}"/>`;
  svg += head.svg;

  spec.stages.forEach((stage, i) => {
    const x = MARGIN + i * (colW + COL_GAP);
    svg += drawBox(x, yLane, colW, laneH, stage, stage.variant ?? "light");
    if (spec.arrows !== false && i < n - 1) {
      svg += hArrow(x + colW + 8, x + colW + COL_GAP - 8, yLane + laneH / 2, C.brand);
    }
  });

  // Boundary divider (e.g. the LLM boundary) between two columns.
  if (spec.boundary) {
    const i = spec.boundary.afterIndex;
    const bx = MARGIN + (i + 1) * (colW + COL_GAP) - COL_GAP / 2;
    svg += `<line x1="${bx}" y1="${yLane - 46}" x2="${bx}" y2="${yLane + laneH + 30}" stroke="${C.error}" stroke-width="2.5" stroke-dasharray="8 7"/>`;
    const label = spec.boundary.label;
    svg += `<text x="${bx}" y="${yLane - 24}" text-anchor="middle" font-family="${FONT}" font-size="14.5" font-weight="800" letter-spacing="1.6" fill="${C.error}">${esc(label.toUpperCase())}</text>`;
    if (spec.boundary.sub) {
      svg += `<text x="${bx}" y="${yLane + laneH + 52}" text-anchor="middle" font-family="${FONT}" font-size="13.5" font-weight="500" fill="${C.error}">${esc(spec.boundary.sub)}</text>`;
      yLegend += 0;
    }
  }

  if (spec.legend) {
    svg += `<rect x="${MARGIN}" y="${yLegend - 26}" width="${W - 2 * MARGIN}" height="${legendH}" rx="16" fill="${C.brandLow}"/>`;
    svg += `<text x="${MARGIN + PAD}" y="${yLegend + 4}" font-family="${FONT}" font-size="13" font-weight="800" letter-spacing="2" fill="${C.brand}">${esc(spec.legendTitle ?? "KEY GUARANTEES")}</text>`;
    const legendColW = (W - 2 * MARGIN - 2 * PAD) / 2;
    spec.legend.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx = MARGIN + PAD + col * legendColW;
      const ly = yLegend + 34 + row * LEGEND_ROW_H;
      svg += `<rect x="${lx}" y="${ly - 10}" width="10" height="10" rx="2.5" fill="${C.brand}"/>`;
      svg += `<text x="${lx + 22}" y="${ly}" font-family="${FONT}" font-size="15.5" font-weight="500" fill="${C.navy}">${esc(item)}</text>`;
    });
  }

  svg += footerSvg(W, yFooter, spec.footer, MARGIN);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${svg}\n</svg>`;
}

// ── Layout 2: vertical decision flow (gate → outcome, else fall through) ────
function renderDecision(spec) {
  const W = 2100;
  const MARGIN = 70;
  const GATE_W = 980;
  const OUT_W = 560;
  const GATE_X = MARGIN + 40;
  const OUT_X = GATE_X + GATE_W + 380;

  const head = header(W, spec.header, spec.title, spec.subtitle, MARGIN);
  let y = head.bottom + 30;

  let svg = "";
  const rows = [];
  for (const row of spec.rows) {
    const gate = boxContent(row.gate, GATE_W);
    const out = boxContent(row.outcome, OUT_W);
    const gateH = gate.h + 2 * PAD;
    const outH = out.h + 2 * PAD;
    const rowH = Math.max(gateH, outH);
    rows.push({ row, y, gateH, outH, rowH });
    y += rowH + 74;
  }
  const last = rows[rows.length - 1];
  const yFooter = last.y + last.rowH + 60;
  const H = yFooter + 40;

  svg = `<rect x="0" y="0" width="${W}" height="${H}" fill="${C.bg}"/>` + head.svg + svg;

  rows.forEach(({ row, y: ry, gateH, outH, rowH }, i) => {
    const gy = ry + (rowH - gateH) / 2;
    const oy = ry + (rowH - outH) / 2;
    svg += drawBox(GATE_X, gy, GATE_W, gateH, row.gate, row.gate.variant ?? "light");
    svg += drawBox(OUT_X, oy, OUT_W, outH, row.outcome, "light");
    // outcome status pill on the connector
    const midY = ry + rowH / 2;
    svg += hArrow(GATE_X + GATE_W + 10, OUT_X - 10, midY, row.color);
    if (row.when) {
      const pillW = row.when.length * 7.4 + 26;
      const px = GATE_X + GATE_W + (OUT_X - GATE_X - GATE_W) / 2 - pillW / 2;
      svg += `<rect x="${px}" y="${midY - 34}" width="${pillW}" height="24" rx="12" fill="${C.white}" stroke="${row.color}" stroke-width="1.3"/>`;
      svg += `<text x="${px + pillW / 2}" y="${midY - 18}" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="600" fill="${row.color}">${esc(row.when)}</text>`;
    }
    if (i < rows.length - 1) {
      const nx = GATE_X + 90;
      const next = rows[i + 1];
      svg += vArrow(nx, ry + rowH + (rowH - gateH) / 2 - (rowH - gateH) / 2, next.y + (next.rowH - next.gateH) / 2, C.brand);
      const lbl = "else";
      svg += `<rect x="${nx + 14}" y="${(ry + rowH + next.y) / 2 - 12}" width="${lbl.length * 8 + 26}" height="24" rx="12" fill="${C.white}" stroke="${C.brand}" stroke-width="1.3"/>`;
      svg += `<text x="${nx + 14 + (lbl.length * 8 + 26) / 2}" y="${(ry + rowH + next.y) / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="600" fill="${C.brand}">${lbl}</text>`;
    }
  });

  svg += footerSvg(W, yFooter, spec.footer, MARGIN);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${svg}\n</svg>`;
}

// ── Diagram A — the complete Ask RAG pipeline ───────────────────────────────
const askPipeline = {
  header: "Hub SSoT · Ask workflow",
  title: "The complete Ask RAG pipeline — question to cited answer",
  subtitle:
    "Every governance decision is made deterministically, in order, BEFORE the model boundary. The LLM only ever composes prose from chunks the persona was already permitted to read — it never filters, never decides access, and never sees blocked content.",
  boundary: {
    afterIndex: 3,
    label: "LLM boundary",
    sub: "No content crosses this line unless the persona is cleared to read it",
  },
  stages: [
    {
      tag: "1 · Identity",
      title: "Persona resolved first",
      body: "The roleId resolves to area + clearance (the user axis). A retrieval audit entry is opened before any data is touched. Permission is re-resolved on every conversation turn.",
      variant: "dark",
    },
    {
      tag: "2 · Governed retrieval",
      title: "Filters inside the search",
      body: "Hybrid retrieval (dense + sparse BM25, RRF fusion) with clearance and area injected as must-filters into the query itself. A blocked-side probe returns ids only — never snippets.",
      variant: "dark",
    },
    {
      tag: "3 · Relevance gate",
      title: "Coverage, not raw score",
      body: "A chunk counts as relevant only if it covers at least 33% of the query's idf mass (COVERAGE_MIN). Generic brand words cannot make an unrelated document look like an answer.",
      variant: "dark",
    },
    {
      tag: "4 · Status decision",
      title: "Deterministic honesty states",
      body: "Decided before any model call, with no snippets attached:",
      outcomes: [
        { label: "no_evidence", color: C.neutral, note: "no model call" },
        { label: "permission_blocked", color: C.error, note: "no model call" },
        { label: "conflict", color: C.warning, note: "no model call" },
        { label: "historic", color: C.warning, note: "flagged, not hidden" },
      ],
      variant: "dark",
    },
    {
      tag: "5 · Composition",
      title: "Claude writes from permitted evidence only",
      body: "The model receives only permitted chunks plus governed side-channel facts (numeric zone, knowledge graph) and must cite every claim with [S#] markers.",
    },
    {
      tag: "6 · Citation integrity + audit",
      title: "Markers verified, audit closed",
      body: "Citation markers are parsed (including composites like [S1, S2]), hallucinated markers stripped, and the rest renumbered contiguously. The audit entry is finalised with the outcome.",
      outcomes: [{ label: "answered", color: C.success, note: "every claim cited and permitted" }],
    },
  ],
  legendTitle: "WHERE EACH GUARANTEE LIVES",
  legend: [
    "Early binding — access filters are part of the vector search, not a post-filter (stage 2)",
    "The LLM never filters — refusals return before the model boundary, with no snippets (stage 4)",
    "No false relevance — the coverage gate starves red-herring matches (stage 3)",
    "Citation integrity — text markers and citation chips can never desync (stage 6)",
  ],
  footer:
    "Each stage is an actual code path: governance resolver, governed retrieval front door, coverage gate, status decision and citation pipeline in the ask agent.",
};

// ── Diagram B — honesty-states decision flow ────────────────────────────────
const honestyDecision = {
  header: "Hub SSoT · Honesty states",
  title: "How the answer status is decided — before composition",
  subtitle:
    "The five states are decided deterministically, in this order, before the model writes a word. Blocked and empty outcomes carry no snippets — only a classification label — so a refusal can never leak the content it refuses to show.",
  rows: [
    {
      color: C.neutral,
      when: "nothing relevant at all",
      gate: {
        tag: "Gate 1",
        title: "Does any material clear the coverage gate?",
        body: "Retrieval candidates must cover at least 33% of the query's idf mass. If nothing does — even among blocked material — there is no evidence at all. A context-aware turn router gives follow-up turns one second chance by re-entering the same governed retrieval with a resolved topical query.",
        variant: "dark",
      },
      outcome: {
        title: "no_evidence",
        body: "An honest empty-handed refusal. No model call, no snippets, localised copy in ES/EN/DE/PT. The Hub never guesses.",
      },
    },
    {
      color: C.error,
      when: "relevant, none permitted",
      gate: {
        tag: "Gate 2",
        title: "Is any relevant material within the persona's clearance and area?",
        body: "Relevant chunks exist, but every one of them is above the persona's clearance or outside its area scope. The block names the failing axis (clearance or area) without revealing anything about the content.",
        variant: "dark",
      },
      outcome: {
        title: "permission_blocked",
        body: "Refused before any model call, with zero citations and zero snippets — only the classification and the blocking axis.",
      },
    },
    {
      color: C.warning,
      when: "top-2 sources disagree",
      gate: {
        tag: "Gate 3",
        title: "Do the top two permitted sources contradict each other?",
        body: "Machine-checkable assertions (same metric + same period, different value) are compared across the top two permitted sources only. A disagreement is surfaced, never silently reconciled.",
        variant: "dark",
      },
      outcome: {
        title: "conflict",
        body: "Both sources are shown side by side with their values, versions and owners, plus a resolution path. No model call.",
      },
    },
    {
      color: C.warning,
      when: "best source superseded",
      gate: {
        tag: "Gate 4",
        title: "Is the best evidence still the current version?",
        body: "Expired documents are hard-dropped at rerank. If the best remaining source has been superseded by a newer version, the answer is still composed — but flagged as historic with a pointer to the current document.",
        variant: "dark",
      },
      outcome: {
        title: "historic",
        body: "An answered response carrying an explicit historic flag, note and pointer — old truth is labelled, never passed off as current.",
      },
    },
    {
      color: C.success,
      when: "clean permitted evidence",
      gate: {
        tag: "Compose",
        title: "Only now does Claude write",
        body: "The model receives only the permitted, current, consistent chunks and must cite every claim. Markers are verified and renumbered after composition; the retrieval audit entry is finalised with the outcome.",
        variant: "dark",
      },
      outcome: {
        title: "answered",
        body: "A cited answer where every claim is bound to a governed source the persona is cleared to read.",
      },
    },
  ],
  footer:
    "Statuses: answered · no_evidence · permission_blocked · conflict · historic — decided deterministically in the ask agent, upstream of composition.",
};

// ── Diagram C — downstream governed flows ───────────────────────────────────
const downstreamFlows = {
  header: "Hub SSoT · Downstream governance",
  title: "The same guarantees downstream — generation, export, review",
  subtitle:
    "Everything built on top of retrieval re-applies the same rules server-side: permissions resolve before retrieval, destination confidentiality caps what the model can see, deterministic rules outrank the model, and approvals are server-authoritative.",
  arrows: false,
  stages: [
    {
      tag: "Generate · audience gate",
      title: "Destination caps retrieval before the model",
      chips: [
        "Audience chosen: internal or external",
        "External caps ALL retrieval — body and guidance — to public before the model",
        "Prior cited docs are re-validated; anything above the gate becomes a visible exclusion",
        "KPI figures are re-derived server-side at the gated clearance",
      ],
      variant: "dark",
    },
    {
      tag: "Brand Guardian · two-pass",
      title: "Deterministic rules outrank the model",
      chips: [
        "Pass 1: deterministic rules (no emoji, uncited figures, unapproved superlatives, required disclaimers)",
        "Error-severity rule hits decide the block status — outside the model",
        "Pass 2: the LLM can only ADD findings against the brand rules",
        "The model can never override a deterministic block",
      ],
      variant: "dark",
    },
    {
      tag: "Scheduled drafts · approval",
      title: "Nothing recurring publishes itself",
      chips: [
        "Scheduled runs compose drafts into a review folder, never publish",
        "Approval is keyed server-side by draft id + content hash",
        "Any edit changes the hash and voids the approval",
        "Client approval flags are never trusted",
      ],
      variant: "dark",
    },
    {
      tag: "Export · final gates",
      title: "The exporter re-checks everything",
      chips: [
        "Guardian re-run at export time — a blocked draft cannot leave",
        "Citation confidentiality re-derived from the server corpus, never from client labels",
        "External destination refused if any cited source is not public",
        "Internal-only sections, spokesperson guidance and Q&A internal notes stripped for external outputs",
      ],
      variant: "dark",
    },
  ],
  legendTitle: "SHARED FOUNDATIONS",
  legend: [
    "One access resolver — every flow decides access through the same area × clearance rule as Ask",
    "Fail closed — a citation whose source document is missing is treated as inaccessible",
    "Server-authoritative — gates re-derive truth from the governed corpus; client labels are never trusted",
    "Generated outputs re-enter the corpus as governed documents, clamped to their most restrictive source",
  ],
  footer:
    "Each column is an actual code path: the generate agent's destination gate, the Brand Guardian two-pass agent, the schedule runner's approval registry and the export service's gate chain.",
};

// ── Diagram D — corpus and indexing ─────────────────────────────────────────
const corpusIndexing = {
  header: "Hub SSoT · Corpus & index",
  title: "Documents to index — embeddings once, tags after",
  subtitle:
    "The index is built so that governance and taxonomy live entirely in metadata. Vectors are computed once and never again: access-label changes and strategy re-tags are payload updates, not re-ingestion, re-embedding or redeployment.",
  stages: [
    {
      tag: "1 · Governed documents",
      title: "The data universe",
      body: "Internal (A), external (B) and SSoT-generated (E) documents, each carrying the full mandatory metadata: country, brand, legal entity, period, type, confidentiality, owner and validity. External sources are filtered before ingestion, never dumped.",
      variant: "dark",
    },
    {
      tag: "2 · Chunks",
      title: "Retrieval units with provenance",
      body: "Each document is split into chunks with a heading and a breadcrumb back to the exact location in the source (document, section, slide), so every citation can point to a real place.",
      variant: "dark",
    },
    {
      tag: "3 · Embeddings — computed once",
      title: "Taxonomy-agnostic vectors",
      body: "Each chunk gets a dense semantic vector and a sparse BM25 vector from the same multilingual tokenizer (accent folding, ES/DE/PT synonym map). Vectors encode only the text — no tags, no labels.",
      variant: "dark",
    },
    {
      tag: "4 · Payload tags — applied after",
      title: "Governance lives in metadata",
      body: "Confidentiality, area scope, axis assignments, topics and the taxonomy version are attached to each point as payload — after embedding. These payload fields are exactly what the early-binding query filters on.",
      variant: "dark",
    },
    {
      tag: "5 · Change = payload update",
      title: "No re-embedding, ever",
      body: "A source label change (sensitivity sync) or a strategy re-tag is a payload-only update on existing points. The index commits first, then the local taxonomy version — vectors are never recomputed.",
      outcomes: [
        { label: "re-tag", color: C.success, note: "metadata only" },
        { label: "label sync", color: C.success, note: "metadata only" },
      ],
      variant: "dark",
    },
  ],
  legendTitle: "WHY THIS SHAPE",
  legend: [
    "Early binding needs labels in the index — payload tags are what the access filters match on",
    "Re-tagging without re-embedding — vectors are agnostic to taxonomy, so strategy changes stay configuration",
    "Live-ingested documents persist their full governed payload, so a restart rebuilds the corpus from the index",
    "One tokenizer at seed and query time — cross-language matching carries into the index unchanged",
  ],
  footer:
    "Each stage is an actual code path: the corpus model, chunk registry, seed pipeline, sparse/dense encoders and the payload-update operations in the vector-store adapter.",
};

// ── Render ───────────────────────────────────────────────────────────────────
const fontFiles = fs
  .readdirSync("/tmp/fonts")
  .filter((f) => /^HankenGrotesk-\d+\.ttf$/.test(f))
  .map((f) => path.join("/tmp/fonts", f));
for (const f of [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]) {
  if (fs.existsSync(f)) fontFiles.push(f);
}

function renderToFiles(svg, baseName) {
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

renderToFiles(renderFlow(askPipeline), "ask-rag-pipeline");
renderToFiles(renderDecision(honestyDecision), "honesty-states-decision");
renderToFiles(renderFlow(downstreamFlows), "downstream-governed-flows");
renderToFiles(renderFlow(corpusIndexing), "corpus-indexing-pipeline");
