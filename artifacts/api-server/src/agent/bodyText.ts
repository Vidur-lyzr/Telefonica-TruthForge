// Section bodies are rendered by a rich-text editor that supports prose,
// "-" bullet lists, **bold** / *italic* and [S#] citation chips — nothing
// else. Models occasionally draw "charts" as ASCII art: pipe-character
// tables wrapped in ``` fences, horizontal rules, stray backticks. None of
// that renders. This sanitiser converts pipe tables into clean bullet lines
// and strips the constructs the editor cannot show, so every draft body is
// presentable regardless of what the model emitted.

const FENCE_RE = /^`{3,}/;
const HR_RE = /^(-{3,}|_{3,}|\*{3,})$/;
// A row of a drawn table: cells separated by pipes. Require a spaced pipe or
// a leading/trailing pipe so ordinary prose containing "|" is left alone.
const PIPE_ROW_RE = /(^\|)|(\|$)|( \| )/;
// The dashes-only divider row under a drawn table header.
const SEPARATOR_ROW_RE = /^[\s|:\-–—]+$/;

function splitCells(row: string): string[] {
  return row
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.replace(/^[\s•·]+/, "").replace(/^-\s+/, "").trim())
    .filter((cell) => cell.length > 0);
}

export function sanitizeSectionBody(input: string): string {
  const out: string[] = [];
  let pipeRows: string[] = [];
  let sawSeparator = false;

  const flushPipeBlock = () => {
    if (pipeRows.length === 0) return;
    // A lone pipe line with no separator row is treated as ordinary prose —
    // only grouped rows (or a header + divider) are a drawn table.
    if (pipeRows.length < 2 && !sawSeparator) {
      out.push(...pipeRows);
    } else {
      const rows = pipeRows.map(splitCells).filter((cells) => cells.length > 0);
      // When a separator row was present the first row is a header
      // ("Indicator | Approved status") — the bullets are self-describing,
      // so the header is dropped.
      const dataRows = sawSeparator && rows.length > 1 ? rows.slice(1) : rows;
      for (const cells of dataRows) {
        if (cells.length === 1) out.push(`- ${cells[0]}`);
        else out.push(`- **${cells[0]}** — ${cells.slice(1).join(" · ")}`);
      }
    }
    pipeRows = [];
    sawSeparator = false;
  };

  for (const line of input.split("\n")) {
    const trimmed = line.trim();
    if (FENCE_RE.test(trimmed)) continue;
    if (HR_RE.test(trimmed)) continue;
    if (trimmed.includes("|") && SEPARATOR_ROW_RE.test(trimmed)) {
      if (pipeRows.length > 0) sawSeparator = true;
      continue;
    }
    if (PIPE_ROW_RE.test(trimmed) && trimmed !== "|") {
      pipeRows.push(line.replace(/`/g, ""));
      continue;
    }
    flushPipeBlock();
    out.push(line.replace(/`/g, ""));
  }
  flushPipeBlock();

  // Collapse runs of blank lines the removals may have left behind.
  const collapsed: string[] = [];
  let blanks = 0;
  for (const line of out) {
    if (line.trim() === "") {
      blanks += 1;
      if (blanks > 1) continue;
    } else {
      blanks = 0;
    }
    collapsed.push(line);
  }
  return collapsed.join("\n").trim();
}
