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
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
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

  if (ext === "txt") {
    return { text: buffer.toString("utf8"), sourceFormat: "Plain text" };
  }
  if (ext === "md" || ext === "markdown") {
    return { text: buffer.toString("utf8"), sourceFormat: "Markdown" };
  }

  throw new UploadError(
    "unsupported_type",
    "Unsupported file type — upload a PDF, Word (.docx), plain text or Markdown file.",
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

function isHeadingLine(p: string): boolean {
  if (/^#{1,6}\s+\S/.test(p)) return true;
  return p.length <= 80 && p.split(/\s+/).length <= 12 && !/[.!?,;:]$/.test(p);
}

export function chunkUploadText(docId: string, title: string, text: string): Chunk[] {
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
    if (isHeadingLine(p) && p !== title) {
      flush();
      heading = p.replace(/^#{1,6}\s+/, "");
      continue;
    }
    parts.push(p);
    length += p.length;
    if (length >= CHUNK_TARGET) flush();
  }
  flush();
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

  const chunks = chunkUploadText(id, input.title, input.text);
  if (chunks.length === 0) {
    throw new UploadError(
      "empty_extraction",
      "No readable text could be extracted from this file.",
      422,
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const topics = [...new Set(tokenize(input.title))].slice(0, 8);
  const preview = input.text.replace(/\s+/g, " ").trim().slice(0, 180);

  const doc: CorpusDoc = {
    id,
    category: "A",
    title: input.title,
    country: input.country,
    brand: input.brand,
    entity: input.owner,
    quarter: currentQuarter(),
    type: "Uploaded document",
    confidentiality: input.confidentiality,
    owner: input.owner,
    validity: "approved",
    validUntil: null,
    language: input.language,
    topics,
    axisIds: [],
    areas: input.area ? [input.area] : [],
    sourceFormat: input.sourceFormat,
    connector: "Manual upload",
    frequency: "ad hoc",
    summary: `${preview}${input.text.length > 180 ? "…" : ""} Uploaded manually on ${today} from ${input.filename} (${input.sourceFormat}).`,
    chunks,
  };

  return { doc, chunks };
}
