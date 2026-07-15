// Live wiki page store — brain-file persistence for pages the wiki query
// agent compiles on demand (the LLM-wiki "query files back" operation).
//
// Pages compiled at answer time are pushed into the mutable COMPILED_PAGES
// array (the graph, routes and search all iterate it at call time) and
// persisted as JSON files under the agent's brain directory at
// agent/memory/wiki/, alongside a human-readable log.md and index.md so the
// admin Brain viewer shows the wiki growing. On boot they are rehydrated —
// Zod-validated, corrupt files skipped — AFTER live docs, so pages sourced
// from live-ingested documents resolve their area scope (and fail closed
// until then, see resolvePageAccess).

import fs from "node:fs";
import path from "node:path";

import { z } from "zod/v4";

import { AGENT_DIR } from "../agent/gitagentRuntime";
import { COMPILED_PAGES, type CompiledPage } from "./corpus";

const WIKI_DIR = path.join(AGENT_DIR, "memory", "wiki");
const LOG_FILE = path.join(WIKI_DIR, "log.md");
const INDEX_FILE = path.join(WIKI_DIR, "index.md");

export const LIVE_PAGE_PREFIX = "page-live-";

interface StoreLogger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

const pageFileSchema = z.object({
  id: z.string().startsWith(LIVE_PAGE_PREFIX),
  nodeId: z.string().min(1),
  title: z.string().min(1),
  axisId: z.string().min(1),
  confidentiality: z.enum(["public", "private", "confidential", "off_the_record"]),
  validity: z.enum(["approved", "historic", "review", "superseded"]),
  summary: z.string().min(1),
  position: z.string().min(1),
  evidence: z.array(
    z.object({
      marker: z.string(),
      docId: z.string(),
      chunkId: z.string(),
      note: z.string(),
    }),
  ),
  resolvedFacts: z.array(
    z.object({
      id: z.string(),
      claim: z.string(),
      resolvedValue: z.string(),
      supersededValue: z.string(),
      resolution: z.string(),
      currentDocId: z.string(),
      historicDocId: z.string(),
      resolvedBy: z.string(),
      resolvedAt: z.string(),
    }),
  ),
  openItems: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["open", "watch"]),
      text: z.string(),
      owner: z.string(),
    }),
  ),
  relatedPageIds: z.array(z.string()),
  changeLog: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      by: z.string(),
      summary: z.string(),
    }),
  ),
  owners: z.array(z.string()),
  sourceDocIds: z.array(z.string()).min(1),
  lastRefinedBy: z.string(),
  lastRefinedAt: z.string(),
  refined: z.boolean(),
  keywords: z.array(z.string()),
});

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || "topic";
}

// Live pages relate to existing pages structurally; make the link reciprocal
// so the graph shows the connection from both sides (re-applied on hydrate,
// because static pages are rebuilt from source on every boot).
export function repairReciprocalLinks(page: CompiledPage): void {
  for (const rid of page.relatedPageIds) {
    const other = COMPILED_PAGES.find((p) => p.id === rid);
    if (other && !other.relatedPageIds.includes(page.id)) {
      other.relatedPageIds.push(page.id);
    }
  }
}

function rewriteIndexFile(): void {
  const live = COMPILED_PAGES.filter((p) => p.id.startsWith(LIVE_PAGE_PREFIX));
  const lines = [
    "# Live wiki pages",
    "",
    "Pages compiled on demand by the wiki query agent from governed sources.",
    "",
    ...live.map(
      (p) =>
        `- ${p.id}.json — "${p.title}" (${p.confidentiality}, ${p.sourceDocIds.length} sources, compiled ${p.lastRefinedAt})`,
    ),
    "",
  ];
  fs.writeFileSync(INDEX_FILE, lines.join("\n"));
}

// Atomic write (tmp + rename) so a crash mid-write never leaves a corrupt
// page file for the next boot to trip on.
export function persistWikiPage(
  page: CompiledPage,
  question: string,
  log: StoreLogger,
): void {
  try {
    fs.mkdirSync(WIKI_DIR, { recursive: true });
    const file = path.join(WIKI_DIR, `${page.id}.json`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(page, null, 2));
    fs.renameSync(tmp, file);

    const q = question.replace(/\s+/g, " ").trim().slice(0, 160);
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, "# Wiki compile log\n\n");
    }
    fs.appendFileSync(
      LOG_FILE,
      `- ${page.lastRefinedAt} — query op compiled "${page.title}" (${page.id}) from ${page.sourceDocIds.length} governed source(s) for: "${q}"\n`,
    );
    rewriteIndexFile();
    log.info({ pageId: page.id, file }, "wiki-store: live page persisted");
  } catch (err) {
    // Persistence failure must never fail the answer — the page still lives
    // in memory for this process; it just will not survive a restart.
    log.error({ err, pageId: page.id }, "wiki-store: failed to persist live page");
  }
}

// Boot rehydration. Call AFTER hydrateLiveDocs so pages whose sources are
// live-ingested docs can resolve their area scope.
export function hydrateWikiPages(log: StoreLogger): void {
  let files: string[];
  try {
    files = fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return; // directory does not exist yet — nothing compiled so far
  }
  let loaded = 0;
  for (const f of files.sort()) {
    try {
      const raw = fs.readFileSync(path.join(WIKI_DIR, f), "utf8");
      const page: CompiledPage = pageFileSchema.parse(JSON.parse(raw));
      if (COMPILED_PAGES.some((p) => p.id === page.id)) continue;
      COMPILED_PAGES.push(page);
      repairReciprocalLinks(page);
      loaded += 1;
    } catch (err) {
      log.warn({ err, file: f }, "wiki-store: skipping corrupt live page file");
    }
  }
  if (loaded > 0) {
    log.info({ loaded }, "wiki-store: rehydrated live wiki pages");
  }
}
