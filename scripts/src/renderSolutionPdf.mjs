// Renders docs/GOVERNED_RAG_SOLUTION.md as a presentation-ready PDF using
// pdfkit (from the api-server workspace package) and the Hanken Grotesk fonts
// in /tmp/fonts. Diagram images resolve relative to the markdown file.
// Run: node scripts/src/renderSolutionPdf.mjs

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(
  path.resolve(process.cwd(), "artifacts/api-server/package.json"),
);
const PDFDocument = require("pdfkit");

// Minimal PNG dimension reader (IHDR width/height at bytes 16-23).
function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const MD_FILE = path.resolve(process.cwd(), "docs/GOVERNED_RAG_SOLUTION.md");
const OUT_FILE = path.resolve(
  process.cwd(),
  "exports/hub-ssot-governed-rag-solution.pdf",
);
const MD_DIR = path.dirname(MD_FILE);

const C = {
  navy: "#031A34",
  textSecondary: "#6E7894",
  brand: "#0066FF",
  brandLow: "#E5F0FF",
  border: "#DDDDDD",
  white: "#FFFFFF",
};

const F = {
  regular: "/tmp/fonts/HankenGrotesk-400.ttf",
  medium: "/tmp/fonts/HankenGrotesk-500.ttf",
  semibold: "/tmp/fonts/HankenGrotesk-600.ttf",
  bold: "/tmp/fonts/HankenGrotesk-700.ttf",
  extrabold: "/tmp/fonts/HankenGrotesk-800.ttf",
};

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN = 54;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const BOTTOM = PAGE_H - 64;

const doc = new PDFDocument({
  size: "A4",
  margins: { top: MARGIN, bottom: 12, left: MARGIN, right: MARGIN },
  autoFirstPage: false,
  info: {
    Title: "Hub SSoT — How the Governed-RAG Problem Is Solved End to End",
    Author: "Telefónica · Hub SSoT",
  },
});
doc.registerFont("regular", F.regular);
doc.registerFont("medium", F.medium);
doc.registerFont("semibold", F.semibold);
doc.registerFont("bold", F.bold);
doc.registerFont("extrabold", F.extrabold);

doc.pipe(fs.createWriteStream(OUT_FILE));

let pageNum = 0;
function footer() {
  const y = PAGE_H - 40;
  doc.save();
  doc
    .font("bold")
    .fontSize(8)
    .fillColor(C.brand)
    .text("Telefónica · Hub SSoT", MARGIN, y, { lineBreak: false });
  doc
    .font("regular")
    .fontSize(8)
    .fillColor(C.textSecondary)
    .text(String(pageNum), MARGIN, y, {
      width: CONTENT_W,
      align: "right",
      lineBreak: false,
    });
  doc.restore();
}
function addPage() {
  doc.addPage();
  pageNum += 1;
  footer();
  doc.x = MARGIN;
  doc.y = MARGIN;
}
function ensure(h) {
  if (doc.y + h > BOTTOM) addPage();
}

// ── Inline markdown: **bold**, `code`, [text](url) → segments ───────────────
function inlineSegments(text) {
  const segs = [];
  let rest = text;
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/;
  while (rest.length) {
    const m = rest.match(re);
    if (!m) {
      segs.push({ t: rest, style: "regular" });
      break;
    }
    if (m.index > 0) segs.push({ t: rest.slice(0, m.index), style: "regular" });
    const tok = m[0];
    if (tok.startsWith("**"))
      segs.push({
        t: tok.slice(2, -2).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
        style: "bold",
      });
    else if (tok.startsWith("`")) segs.push({ t: tok.slice(1, -1), style: "code" });
    else {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      segs.push({ t: lm[1], style: "link" });
    }
    rest = rest.slice(m.index + tok.length);
  }
  return segs;
}

function drawInline(segs, x, width, opts = {}) {
  const size = opts.size ?? 10;
  const lineGap = opts.lineGap ?? 2.6;
  const color = opts.color ?? C.navy;
  doc.x = x;
  segs.forEach((s, i) => {
    const last = i === segs.length - 1;
    const font =
      s.style === "bold" ? "bold" : s.style === "code" ? "semibold" : "regular";
    const fill = s.style === "code" ? C.brand : s.style === "link" ? C.brand : color;
    doc
      .font(font)
      .fontSize(s.style === "code" ? size - 0.5 : size)
      .fillColor(fill)
      .text(s.t, { width, continued: !last, lineGap, underline: s.style === "link" });
  });
  doc.x = MARGIN;
}

function measureInline(segs, width, size = 10, lineGap = 2.6) {
  // Approximate: measure as a single regular-font string.
  const joined = segs.map((s) => s.t).join("");
  doc.font("regular").fontSize(size);
  return doc.heightOfString(joined, { width, lineGap }) + 2;
}

// ── Block renderers ──────────────────────────────────────────────────────────
function h1(text) {
  ensure(90);
  doc.rect(MARGIN, doc.y + 2, 34, 4).fill(C.brand);
  doc.y += 16;
  doc.font("extrabold").fontSize(20).fillColor(C.navy).text(text, MARGIN, doc.y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  doc.y += 8;
}

function h2(text) {
  ensure(60);
  doc.y += 10;
  doc.font("extrabold").fontSize(14.5).fillColor(C.navy).text(text, MARGIN, doc.y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  doc.y += 6;
}

function paragraph(text, opts = {}) {
  const segs = inlineSegments(text);
  ensure(Math.min(measureInline(segs, CONTENT_W), 120));
  drawInline(segs, MARGIN, CONTENT_W, opts);
  doc.y += opts.after ?? 7;
}

function bullet(text, ordered, idx, indent = 0) {
  const bx = MARGIN + 6 + indent;
  const tx = bx + 14;
  const w = CONTENT_W - (tx - MARGIN);
  const segs = inlineSegments(text);
  ensure(Math.min(measureInline(segs, w), 120));
  const y0 = doc.y;
  if (ordered) {
    doc.font("bold").fontSize(10).fillColor(C.brand).text(`${idx}.`, bx - 2, y0, {
      lineBreak: false,
    });
  } else {
    doc.rect(bx, y0 + 4.2, 4.5, 4.5).fill(C.brand);
  }
  doc.y = y0;
  drawInline(segs, tx, w);
  doc.y += 4.5;
}

function blockquote(text) {
  const segs = inlineSegments(text);
  const w = CONTENT_W - 36;
  const h = measureInline(segs, w, 11, 3.2) + 24;
  ensure(h + 10);
  const y0 = doc.y;
  doc.roundedRect(MARGIN, y0, CONTENT_W, h, 8).fill(C.brandLow);
  doc.rect(MARGIN, y0 + 8, 3.5, h - 16).fill(C.brand);
  doc.y = y0 + 12;
  doc.x = MARGIN + 20;
  const drawSegs = segs.map((s) => ({ ...s }));
  drawSegs.forEach((s, i) => {
    const last = i === drawSegs.length - 1;
    doc
      .font(s.style === "bold" ? "bold" : "medium")
      .fontSize(11)
      .fillColor(C.navy)
      .text(s.t, MARGIN + 20, undefined, { width: w, continued: !last, lineGap: 3.2 });
  });
  doc.y = y0 + h + 12;
  doc.x = MARGIN;
}

function hr() {
  ensure(24);
  doc.y += 6;
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_W - MARGIN, doc.y)
    .lineWidth(0.7)
    .strokeColor(C.border)
    .stroke();
  doc.y += 12;
}

function image(alt, rel) {
  const file = path.resolve(MD_DIR, rel);
  if (!fs.existsSync(file)) {
    paragraph(`(missing image: ${rel})`);
    return;
  }
  const dim = pngSize(fs.readFileSync(file));
  const w = CONTENT_W;
  const h = (dim.height / dim.width) * w;
  ensure(h + 30);
  doc.image(file, MARGIN, doc.y, { width: w });
  doc.y += h + 4;
  doc
    .font("medium")
    .fontSize(8)
    .fillColor(C.textSecondary)
    .text(alt, MARGIN, doc.y, { width: CONTENT_W, align: "center" });
  doc.y += 12;
}

function stripInline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function table(rows) {
  const header = rows[0];
  const body = rows.slice(2); // skip separator row
  const nCols = header.length;
  const colW = CONTENT_W / nCols;
  const cellPad = 6;

  const rowHeight = (cells, font, size) => {
    let h = 0;
    for (const cell of cells) {
      doc.font(font).fontSize(size);
      h = Math.max(
        h,
        doc.heightOfString(stripInline(cell), { width: colW - 2 * cellPad, lineGap: 1.6 }),
      );
    }
    return h + 2 * cellPad;
  };

  const drawRow = (cells, y, hRow, isHeader, zebra) => {
    if (isHeader) {
      doc.rect(MARGIN, y, CONTENT_W, hRow).fill(C.navy);
    } else if (zebra) {
      doc.rect(MARGIN, y, CONTENT_W, hRow).fill("#F5F8FC");
    }
    cells.forEach((cell, i) => {
      doc
        .font(isHeader ? "bold" : "regular")
        .fontSize(isHeader ? 8.6 : 8.8)
        .fillColor(isHeader ? C.white : C.navy)
        .text(stripInline(cell), MARGIN + i * colW + cellPad, y + cellPad, {
          width: colW - 2 * cellPad,
          lineGap: 1.6,
        });
    });
    doc
      .moveTo(MARGIN, y + hRow)
      .lineTo(MARGIN + CONTENT_W, y + hRow)
      .lineWidth(0.5)
      .strokeColor(C.border)
      .stroke();
  };

  const hHead = rowHeight(header, "bold", 8.6);
  ensure(hHead + 40);
  doc.y += 4;
  let y = doc.y;
  drawRow(header, y, hHead, true, false);
  y += hHead;
  body.forEach((cells, r) => {
    const hRow = rowHeight(cells, "regular", 8.8);
    if (y + hRow > BOTTOM) {
      doc.y = y;
      addPage();
      y = doc.y;
      drawRow(header, y, hHead, true, false);
      y += hHead;
    }
    drawRow(cells, y, hRow, false, r % 2 === 1);
    y += hRow;
  });
  doc.y = y + 10;
  doc.x = MARGIN;
}

// ── Parse the markdown into blocks ───────────────────────────────────────────
const raw = fs.readFileSync(MD_FILE, "utf8");
const lines = raw.split("\n");
const blocks = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (/^\s*$/.test(line)) {
    i += 1;
    continue;
  }
  if (line.startsWith("# ")) {
    blocks.push({ kind: "h1", text: line.slice(2).trim() });
    i += 1;
  } else if (line.startsWith("## ")) {
    blocks.push({ kind: "h2", text: line.slice(3).trim() });
    i += 1;
  } else if (/^---\s*$/.test(line)) {
    blocks.push({ kind: "hr" });
    i += 1;
  } else if (line.startsWith("> ")) {
    const parts = [];
    while (i < lines.length && lines[i].startsWith(">")) {
      parts.push(lines[i].replace(/^>\s?/, "").trim());
      i += 1;
    }
    blocks.push({ kind: "quote", text: parts.filter(Boolean).join(" ") });
  } else if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) {
    const m = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    blocks.push({ kind: "image", alt: m[1], src: m[2] });
    i += 1;
  } else if (line.startsWith("|")) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith("|")) {
      rows.push(
        lines[i]
          .replace(/^\|/, "")
          .replace(/\|\s*$/, "")
          .split("|")
          .map((c) => c.trim()),
      );
      i += 1;
    }
    blocks.push({ kind: "table", rows });
  } else if (/^(-|\d+\.)\s+/.test(line)) {
    const items = [];
    while (i < lines.length && /^(-|\d+\.)\s+/.test(lines[i])) {
      const ordered = /^\d+\./.test(lines[i]);
      let text = lines[i].replace(/^(-|\d+\.)\s+/, "");
      i += 1;
      // continuation lines (indented)
      while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*(-|\d+\.)\s/.test(lines[i])) {
        text += " " + lines[i].trim();
        i += 1;
      }
      items.push({ text, ordered });
    }
    blocks.push({ kind: "list", items });
  } else {
    let text = line.trim();
    i += 1;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#|-|\d+\.|\||>|!\[|---)/.test(lines[i].trim())
    ) {
      text += " " + lines[i].trim();
      i += 1;
    }
    blocks.push({ kind: "p", text });
  }
}

// ── Render ───────────────────────────────────────────────────────────────────
addPage();

// Cover strip
doc.rect(0, 0, PAGE_W, 6).fill(C.brand);
doc.y = MARGIN + 6;
doc
  .font("bold")
  .fontSize(9)
  .fillColor(C.brand)
  .text("TELEFÓNICA · HUB SSOT · GOVERNED RAG", MARGIN, doc.y, {
    characterSpacing: 1.6,
  });
doc.y += 10;

let ordinal = 0;
for (const b of blocks) {
  switch (b.kind) {
    case "h1":
      h1(b.text);
      break;
    case "h2":
      h2(b.text);
      break;
    case "hr":
      hr();
      break;
    case "quote":
      blockquote(b.text);
      break;
    case "image":
      image(b.alt, b.src);
      break;
    case "table":
      table(b.rows);
      break;
    case "list":
      ordinal = 0;
      for (const item of b.items) {
        ordinal += 1;
        bullet(item.text, item.ordered, ordinal);
      }
      doc.y += 4;
      break;
    case "p":
      paragraph(b.text);
      break;
  }
}

doc.end();
console.log(`PDF written: ${path.relative(process.cwd(), OUT_FILE)}`);
