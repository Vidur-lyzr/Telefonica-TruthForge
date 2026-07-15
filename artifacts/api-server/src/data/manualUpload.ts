// Manual document upload — the real intake path for documentalist files.
// A file arrives as bytes, its text is genuinely extracted (PDF via pdf.js,
// .docx via the package's own document.xml, plain text / Markdown as-is),
// split into governed chunks, and registered as an A-category corpus
// document. The caller (routes/data.ts) upserts the chunks into the vector
// index FIRST and only then commits the document to the in-memory corpus,
// so an index failure can never create a doc that silently dies on restart.

import JSZip from "jszip";
import {
  DOCS,
  type Area,
  type Chunk,
  type Clearance,
  type CorpusDoc,
} from "./corpus";
import { tokenize } from "../adapters/text";

export class UploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface ExtractedUpload {
  text: string;
  sourceFormat: string;
  /**
   * True for formats whose extraction already emits explicit `## heading`
   * markers (slides, spreadsheets). The chunker then only honours those
   * markers — the prose heuristic ("short line without terminal punctuation
   * is a heading") would otherwise classify every terse slide bullet or
   * spreadsheet row as a heading and drop it.
   */
  structured?: boolean;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

// ── PowerPoint (.pptx) ───────────────────────────────────────────────────────
// A .pptx is a zip whose slide XML lives at ppt/slides/slideN.xml. Slides are
// numbered in the filename, not sorted lexically, so slide10 must not fall
// between slide1 and slide2 — we sort on the numeric suffix. Each slide's text
// lives in <a:t> runs; the runs are joined and prefixed with a "Slide N"
// heading so the presentation's structure survives into the chunk registry.
async function extractPptxText(zip: JSZip): Promise<string> {
  const slideFiles = Object.keys(zip.files)
    .map((name) => {
      const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
      return match ? { name, index: Number(match[1]) } : null;
    })
    .filter((entry): entry is { name: string; index: number } => entry !== null)
    .sort((a, b) => a.index - b.index);

  const blocks: string[] = [];
  for (const { name, index } of slideFiles) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    const runs = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((m) =>
      decodeXmlEntities(m[1]),
    );
    const slideText = runs.join(" ").replace(/\s+/g, " ").trim();
    blocks.push(`## Slide ${index}`);
    if (slideText) blocks.push(slideText);
  }
  return blocks.join("\n\n");
}

// ── Excel (.xlsx) ────────────────────────────────────────────────────────────
// A .xlsx is a zip. Cell text is deduplicated into xl/sharedStrings.xml and
// referenced by index; xl/workbook.xml names the sheets and points (via
// xl/_rels/workbook.xml.rels) at each worksheet XML. Cells carry an r="A1"
// reference, so we map them by that reference rather than by document position
// — sparse rows keep their columns aligned. The first row of each sheet is
// treated as headers, later rows become "Header: value; …" paragraphs, and the
// sheet name becomes a heading.

interface XlsxCell {
  col: string;
  colIdx: number;
  text: string;
}

function colIndex(letters: string): number {
  let n = 0;
  for (let i = 0; i < letters.length; i += 1) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n;
}

function parseSharedStrings(xml: string): string[] {
  const result: string[] = [];
  for (const si of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [...si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
    result.push(decodeXmlEntities(parts.join("")));
  }
  return result;
}

function parseWorkbookSheets(xml: string): { name: string; rid: string }[] {
  return [...xml.matchAll(/<sheet\b[^>]*>/g)].map((m) => {
    const tag = m[0];
    const name = /name="([^"]*)"/.exec(tag)?.[1] ?? "Sheet";
    const rid = /r:id="([^"]*)"/.exec(tag)?.[1] ?? "";
    return { name: decodeXmlEntities(name), rid };
  });
}

function parseWorkbookRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    const id = /Id="([^"]*)"/.exec(tag)?.[1];
    const target = /Target="([^"]*)"/.exec(tag)?.[1];
    if (id && target) map.set(id, target);
  }
  return map;
}

function resolveWorksheetPath(target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  return `xl/${target.replace(/^\.\//, "")}`;
}

function xlsxCellText(
  t: string,
  inner: string | undefined,
  shared: string[],
): string {
  if (!inner) return "";
  if (t === "s") {
    const idx = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    if (idx == null) return "";
    return shared[Number(idx)] ?? "";
  }
  if (t === "inlineStr") {
    const parts = [...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
    return decodeXmlEntities(parts.join(""));
  }
  const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
  if (v == null) return "";
  if (t === "b") return v === "1" ? "TRUE" : "FALSE";
  return decodeXmlEntities(v);
}

function parseWorksheetRows(xml: string, shared: string[]): XlsxCell[][] {
  const byRow = new Map<number, XlsxCell[]>();
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let match: RegExpExecArray | null;
  while ((match = cellRe.exec(xml))) {
    const attrs = match[1] ?? "";
    const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
    if (!ref) continue;
    const col = ref[1];
    const rowNum = Number(ref[2]);
    const t = /\bt="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const text = xlsxCellText(t, match[2], shared);
    const list = byRow.get(rowNum) ?? [];
    list.push({ col, colIdx: colIndex(col), text });
    byRow.set(rowNum, list);
  }
  return [...byRow.keys()]
    .sort((a, b) => a - b)
    .map((n) => (byRow.get(n) as XlsxCell[]).sort((a, b) => a.colIdx - b.colIdx));
}

async function extractXlsxText(zip: JSZip): Promise<string> {
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  if (!workbookXml) return "";
  const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const shared = sharedXml ? parseSharedStrings(sharedXml) : [];
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  const rels = relsXml ? parseWorkbookRels(relsXml) : new Map<string, string>();

  const blocks: string[] = [];
  for (const sheet of parseWorkbookSheets(workbookXml)) {
    const target = rels.get(sheet.rid);
    const sheetXml = target
      ? await zip.file(resolveWorksheetPath(target))?.async("string")
      : undefined;
    if (!sheetXml) continue;
    const rows = parseWorksheetRows(sheetXml, shared);
    if (rows.length === 0) continue;
    blocks.push(`## ${sheet.name}`);
    const [headerRow, ...dataRows] = rows;
    if (dataRows.length === 0) {
      const joined = headerRow.map((c) => c.text).filter(Boolean).join("; ");
      if (joined) blocks.push(joined);
      continue;
    }
    const headers = new Map<number, string>();
    for (const cell of headerRow) {
      if (cell.text) headers.set(cell.colIdx, cell.text);
    }
    for (const row of dataRows) {
      const parts = row
        .filter((c) => c.text)
        .map((c) => `${headers.get(c.colIdx) ?? c.col}: ${c.text}`);
      if (parts.length > 0) blocks.push(parts.join("; "));
    }
  }
  return blocks.join("\n\n");
}

export async function extractUploadText(
  filename: string,
  buffer: Buffer,
): Promise<ExtractedUpload> {
  const ext = (filename.toLowerCase().split(".").pop() ?? "").trim();

  if (ext === "pdf") {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return { text, sourceFormat: "PDF" };
    } catch {
      throw new UploadError(
        "unreadable_pdf",
        "The PDF could not be read — the file appears to be corrupt or is not a valid PDF.",
        422,
      );
    }
  }

  if (ext === "docx") {
    let xml: string | undefined;
    try {
      const zip = await JSZip.loadAsync(buffer);
      xml = await zip.file("word/document.xml")?.async("string");
    } catch {
      xml = undefined;
    }
    if (!xml) {
      throw new UploadError(
        "unreadable_docx",
        "The Word file could not be read — it does not contain a document body.",
        422,
      );
    }
    const text = decodeXmlEntities(
      xml
        .replace(/<w:tab[^>]*\/>/g, " ")
        .replace(/<w:br[^>]*\/>/g, "\n")
        .replace(/<\/w:p>/g, "\n\n")
        .replace(/<[^>]+>/g, ""),
    );
    return { text, sourceFormat: "Word document" };
  }

  if (ext === "pptx") {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const text = await extractPptxText(zip);
      return { text, sourceFormat: "PowerPoint presentation", structured: true };
    } catch {
      throw new UploadError(
        "unreadable_pptx",
        "The PowerPoint file could not be read — it does not appear to be a valid .pptx presentation.",
        422,
      );
    }
  }

  if (ext === "xlsx") {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const text = await extractXlsxText(zip);
      return { text, sourceFormat: "Excel spreadsheet", structured: true };
    } catch {
      throw new UploadError(
        "unreadable_xlsx",
        "The Excel file could not be read — it does not appear to be a valid .xlsx workbook.",
        422,
      );
    }
  }

  if (ext === "txt") {
    return { text: buffer.toString("utf8"), sourceFormat: "Plain text" };
  }
  if (ext === "md" || ext === "markdown") {
    return { text: buffer.toString("utf8"), sourceFormat: "Markdown" };
  }

  throw new UploadError(
    "unsupported_type",
    "Unsupported file type — upload a PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), plain text or Markdown file.",
    415,
  );
}

// ── Chunking ─────────────────────────────────────────────────────────────────
// Paragraph-grouping chunker: consecutive paragraphs are packed into chunks of
// roughly CHUNK_TARGET characters. A short line without terminal punctuation
// (or a Markdown heading) starts a new chunk and becomes its heading, so the
// document's own structure survives into the chunk registry.

const CHUNK_TARGET = 1100;
const MAX_CHUNKS = 80;

function isHeadingLine(p: string, structured: boolean): boolean {
  if (/^#{1,6}\s+\S/.test(p)) return true;
  if (structured) return false;
  return p.length <= 80 && p.split(/\s+/).length <= 12 && !/[.!?,;:]$/.test(p);
}

export function chunkUploadText(
  docId: string,
  title: string,
  text: string,
  structured = false,
): Chunk[] {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const chunks: Chunk[] = [];
  let heading = title;
  let parts: string[] = [];
  let length = 0;

  const flush = () => {
    if (parts.length === 0) return;
    const n = chunks.length + 1;
    chunks.push({
      id: `${docId}-c${n}`,
      heading,
      breadcrumb: `${title} > ${heading}`,
      text: parts.join(" "),
    });
    parts = [];
    length = 0;
  };

  for (const p of paragraphs) {
    if (chunks.length >= MAX_CHUNKS) {
      // Bound the chunk count for very large files: fold the remainder into
      // the final chunk rather than dropping it.
      chunks[chunks.length - 1].text += ` ${p}`;
      continue;
    }
    if (isHeadingLine(p, structured) && p !== title) {
      flush();
      heading = p.replace(/^#{1,6}\s+/, "");
      continue;
    }
    parts.push(p);
    length += p.length;
    if (length >= CHUNK_TARGET) flush();
  }
  flush();
  if (chunks.length === 0 && paragraphs.length > 0) {
    // Safety net: a document made entirely of short heading-like lines (terse
    // slide bullets, sparse spreadsheet rows) must still ingest — fold all
    // paragraphs into a single chunk rather than returning nothing.
    chunks.push({
      id: `${docId}-c1`,
      heading: title,
      breadcrumb: `${title} > ${title}`,
      text: paragraphs.map((p) => p.replace(/^#{1,6}\s+/, "")).join(" "),
    });
  }
  return chunks;
}

// ── Document assembly ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function currentQuarter(): string {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
}

export interface BuildUploadDocInput {
  title: string;
  owner: string;
  country: string;
  brand: string;
  confidentiality: Clearance;
  area: Area | null;
  language: string;
  filename: string;
  text: string;
  sourceFormat: string;
  /** Uploader-chosen type label; falls back to "Uploaded document". */
  docType?: string;
  /** Uploader-chosen topic tags; falls back to title-derived tokens. */
  topics?: string[];
  /** Validated strategic axis ids (route checks them against AXES). */
  axisIds?: string[];
  /** See ExtractedUpload.structured — headings come only from `##` markers. */
  structured?: boolean;
}

export interface BuiltUploadDoc {
  doc: CorpusDoc;
  chunks: Chunk[];
}

// Builds the governed document WITHOUT committing it to the corpus — the
// route upserts to the vector index first and only then calls commitUploadDoc,
// so a failed index write leaves no half-ingested state behind.
export function buildUploadDoc(input: BuildUploadDocInput): BuiltUploadDoc {
  const base = `doc-live-upload-${slugify(input.title)}`;
  let id = base;
  let n = 2;
  while (DOCS.some((d) => d.id === id)) {
    id = `${base}-${n}`;
    n += 1;
  }

  const chunks = chunkUploadText(id, input.title, input.text, input.structured ?? false);
  if (chunks.length === 0) {
    throw new UploadError(
      "empty_extraction",
      "No readable text could be extracted from this file.",
      422,
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const chosenTopics = (input.topics ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  const topics =
    chosenTopics.length > 0
      ? [...new Set(chosenTopics)].slice(0, 12)
      : [...new Set(tokenize(input.title))].slice(0, 8);
  const preview = input.text.replace(/\s+/g, " ").trim().slice(0, 180);

  const doc: CorpusDoc = {
    id,
    category: "A",
    title: input.title,
    country: input.country,
    brand: input.brand,
    entity: input.owner,
    quarter: currentQuarter(),
    type: input.docType?.trim() || "Uploaded document",
    confidentiality: input.confidentiality,
    owner: input.owner,
    validity: "approved",
    validUntil: null,
    language: input.language,
    topics,
    axisIds: [...new Set(input.axisIds ?? [])],
    areas: input.area ? [input.area] : [],
    sourceFormat: input.sourceFormat,
    connector: "Manual upload",
    frequency: "ad hoc",
    summary: `${preview}${input.text.length > 180 ? "…" : ""} Uploaded manually on ${today} from ${input.filename} (${input.sourceFormat}).`,
    chunks,
  };

  return { doc, chunks };
}
