// Visual-deck slot-filling pass — the SECOND model call for the "visualdeck"
// shape. The first pass composes the governed, cited text document exactly
// like every other shape; this pass only REARRANGES that already-governed
// content into coded slide layouts. It never retrieves, never sees anything
// the text pass did not, and never invents facts: every slide is validated
// against its layout's strict Zod schema and an invalid result degrades to
// the text-first deck, never to an overflowing design.

import { z } from "zod/v4";
import { meteredCreate } from "./metering";
import {
  visualLayoutCatalogue,
  getVisualLayout,
  type VisualSlideInput,
} from "../export/visualLayouts";
import { listBrandImages } from "../data/imageLibraryStore";
import { retrieveGoverned, resolveDoc, type RetrievedChunk } from "../adapters/kb";
import { isQuotaError } from "../data/userUsage";
import { CLEARANCE_RANK, type Clearance, type Area } from "../data/corpus";
import type { GeneratedDraft } from "./generateAgent";

// Same model as the composition pass — slot filling under hard character
// limits is a precision task and this is the product's core output.
const MODEL = "claude-opus-4-8";
const MAX_SLIDES = 16;

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Slot text is display copy: source markers belong to the text document and
// the auto-appended evidence page, never inside a slide design. Stripping
// happens BEFORE schema validation so character limits apply to what is
// actually rendered.
function stripMarkers(text: string): string {
  return text
    .replace(/\[[^\]]*?S\s*\d+[^\]]*?\]/gi, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function sanitizeSlots(value: unknown): unknown {
  if (typeof value === "string") return stripMarkers(value);
  if (Array.isArray(value)) return value.map(sanitizeSlots);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeSlots(v);
    }
    return out;
  }
  return value;
}

interface ValidationOutcome {
  valid: VisualSlideInput[];
  errors: string[];
}

function validateCandidates(
  candidate: unknown,
  allowedIds: Set<string> | null,
): ValidationOutcome {
  const valid: VisualSlideInput[] = [];
  const errors: string[] = [];
  const root = candidate as { slides?: unknown } | null;
  const arr = Array.isArray(root?.slides) ? (root.slides as unknown[]) : null;
  if (!arr || arr.length === 0) {
    return { valid, errors: ['the response must be {"slides": [...]} with at least one slide'] };
  }
  arr.slice(0, MAX_SLIDES).forEach((item, i) => {
    const slide = item as { layoutId?: unknown; slots?: unknown };
    const layoutId = typeof slide?.layoutId === "string" ? slide.layoutId : "";
    const layout = getVisualLayout(layoutId);
    if (!layout) {
      errors.push(`slide ${i + 1}: unknown layoutId "${layoutId || "(missing)"}"`);
      return;
    }
    if (allowedIds && !allowedIds.has(layout.id)) {
      errors.push(
        `slide ${i + 1}: layout "${layout.id}" is not in the author's selection — use only the layouts in the catalogue`,
      );
      return;
    }
    const slots = sanitizeSlots(slide.slots ?? {});
    const parsed = layout.schema.safeParse(slots);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 3)
        .map((iss) => `${iss.path.join(".") || "slots"} — ${iss.message}`)
        .join("; ");
      errors.push(`slide ${i + 1} (${layout.id}): ${issues}`);
      return;
    }
    valid.push({ layoutId: layout.id, slots: parsed.data });
  });
  return { valid, errors };
}

function catalogueBlock(hasCharts: boolean, allowedIds: Set<string> | null): string {
  return visualLayoutCatalogue()
    .filter((l) => hasCharts || !l.wantsChart)
    .filter((l) => !allowedIds || allowedIds.has(l.id))
    .map((l) => {
      const layout = getVisualLayout(l.id);
      let schemaDoc = "";
      try {
        if (layout) {
          const js = z.toJSONSchema(layout.schema, { io: "input" });
          delete (js as Record<string, unknown>)["$schema"];
          schemaDoc = JSON.stringify(js);
        }
      } catch {
        schemaDoc = "(see purpose for slot constraints)";
      }
      const imgs = l.imageSlots.length
        ? `\n  Image slots: ${l.imageSlots.map((s) => `${s.slot}${s.required ? " (required)" : ""} — ${s.hint}`).join(" | ")}`
        : "";
      const chart = l.wantsChart
        ? `\n  Chart slot: set "chartId" to one of the governed chart series ids listed below.`
        : "";
      return `### ${l.id} — ${l.name}\n  ${l.purpose}\n  Slots JSON schema: ${schemaDoc}${imgs}${chart}`;
    })
    .join("\n\n");
}

function documentBlock(draft: GeneratedDraft): string {
  const sections = draft.sections
    .map((s) => `[${s.kind}] ${s.heading}\n${s.body}`)
    .join("\n\n");
  const charts = draft.charts.length
    ? draft.charts
        .map(
          (c) =>
            `- chartId "${c.id}": ${c.title} (${c.unit || "no unit"}, ${c.points.length} points: ${c.points
              .map((p) => `${p.label}=${p.value}`)
              .join(", ")})`,
        )
        .join("\n")
    : "None — do not use chart-bearing layouts.";
  const tables = draft.tables.length
    ? draft.tables
        .map(
          (t) =>
            `- ${t.title} (${t.unit || "no unit"}; source: ${t.source})\n  columns: ${t.columns.join(" | ")}\n  rows: ${t.rows
              .map((r) => r.join(" | "))
              .join(" / ")}`,
        )
        .join("\n")
    : "None.";
  return `Title: ${draft.title}
Umbrella message: ${draft.umbrella ?? "(none)"}

Sections:
${sections}

Governed chart series available:
${charts}

Governed data tables available (for the results-table layout):
${tables}`;
}

function imageBlock(): string {
  const images = listBrandImages();
  if (images.length === 0) return "The image library is empty — leave optional image slots out and expect honest fallbacks for required ones.";
  return images
    .map((img) => `- ${img.id} — ${img.label} (tags: ${img.tags.join(", ")})`)
    .join("\n");
}

/**
 * Arrange an already-composed governed draft into validated visual slides.
 * Returns null when no valid deck could be produced — the caller keeps the
 * text-first document, which is always a safe, honest fallback.
 */
export async function fillVisualSlides(
  draft: GeneratedDraft,
  language: string,
  log: Logger,
  preferredLayoutIds?: string[] | null,
): Promise<VisualSlideInput[] | null> {
  const hasCharts = draft.charts.length > 0;

  // Author-selected layouts: restrict the catalogue the composer sees to the
  // selection. The structural cover and closing layouts stay available so the
  // deck frame is never broken. Ids were validated against the pool at the
  // route; anything unknown here (e.g. a layout retired since the draft was
  // created) is dropped rather than guessed. Empty selection = full pool.
  const knownIds = new Set(visualLayoutCatalogue().map((l) => l.id));
  const picked = (preferredLayoutIds ?? []).filter((id) => knownIds.has(id));
  const allowedIds =
    picked.length > 0 ? new Set([...picked, "photo-cover", "closing"]) : null;
  if ((preferredLayoutIds?.length ?? 0) > 0) {
    log.info(
      { picked, dropped: (preferredLayoutIds ?? []).filter((id) => !knownIds.has(id)) },
      "visual slides: composing with author-selected layouts",
    );
  }

  const system = [
    "You are the visual-deck composer of Telefónica's Hub SSoT.",
    "You receive a finished, governed, cited document and a catalogue of coded slide layouts.",
    "Your ONLY job is to arrange the document's existing content into slides: pick layouts, fill their slots.",
    "NEVER invent a fact, figure, name or claim that is not in the document. Condensing and rephrasing existing content is allowed; adding content is not.",
    "NEVER include source markers like [S1] in slot text — the evidence page is appended automatically.",
    "Respect every character limit in the slot schemas strictly; write shorter rather than truncating mid-thought.",
    "Image slots take an id from the approved image library only, chosen by matching tags to the slide's content.",
    "No emoji. No superlatives that are not in the document. Sentence case for titles except where a schema implies a label.",
    `Slide text must be written in the same language as the document (${language}).`,
    'Return ONLY a single JSON object: {"slides": [{"layoutId": string, "slots": object}, ...]} — no prose around it.',
  ].join(" ");

  const user = `Compose a visual deck of 8 to ${Math.min(12, MAX_SLIDES)} slides from this document.

Deck structure rules:
- Slide 1 MUST be "photo-cover". The last slide MUST be "closing".
${
  allowedIds
    ? `- The author hand-picked the layouts for this deck. Use ONLY the layouts in the catalogue below — build the substance of the deck from the author's picks, reusing a layout across several slides where it fits. Do not ask for layouts that are not listed.
- Use each layout's purpose line to decide where it fits. Never use a chart layout when no chart series is listed.`
    : `- Use "agenda" early when the deck has 3+ themes; use "section-divider" to open each major theme.
- Prefer content-bearing layouts (news-card, photo-split, kpi-stats, stat-tiles, big-number, icon-cards, numbered-pillars, list-bars, two-column-compare, timeline, flow-steps, kpi-table, map-highlight, branded-content, photo-statement, results-table${hasCharts ? ", campaign-metrics" : ""}) for the substance; do not pad with dividers.
- Vary the visual register across the deck: mix icon/card layouts, figure layouts and photo layouts rather than repeating one family.
- Every deck MUST carry the full visual language, content permitting: at least one figure-led slide (stat-tiles, big-number, kpi-stats or kpi-table) whenever the document contains numbers, at least one icon/card slide (icon-cards, numbered-pillars, list-bars or flow-steps) for pillars, takeaways or processes, and "map-highlight" whenever the document discusses markets, countries or regions. Skip a family only when the document truly has no content for it.${hasCharts ? '\n- On campaign-metrics, set "chartKind" when the data shape is clear: "waterfall" for a bridge of deltas to a total, "gauge" for a single share-of-target percentage, otherwise leave it "auto".' : ""}
- Use each layout's purpose line to decide where it fits. Never use a chart layout when no chart series is listed.`
}

Layout catalogue:
${catalogueBlock(hasCharts, allowedIds)}

Approved brand image library (use these ids only):
${imageBlock()}

Document:
${documentBlock(draft)}`;

  let raw = "";
  try {
    const message = await meteredCreate("generate", {
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    });
    raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    log.error({ err }, "visual slides: slot-filling model call failed");
    return null;
  }

  let outcome = validateCandidates(extractJson(raw), allowedIds);

  // Condense-retry once: send the validation errors back and ask for a fully
  // corrected deck. Valid slides must be returned unchanged.
  if (outcome.errors.length > 0) {
    log.warn(
      { errors: outcome.errors, valid: outcome.valid.length },
      "visual slides: first pass had invalid slides; retrying once",
    );
    const correction = `Some slides failed validation:
${outcome.errors.map((e) => `- ${e}`).join("\n")}

Return the COMPLETE corrected {"slides": [...]} JSON again. Keep the slides that were valid exactly as they were; fix only the listed problems — condense text to fit the character limits (rewrite shorter, never cut mid-word), correct slot names to match the schema exactly, and only use layout ids from the catalogue and image ids from the library.`;
    try {
      const message = await meteredCreate("generate", {
        model: MODEL,
        max_tokens: 8192,
        system,
        messages: [
          { role: "user", content: user },
          { role: "assistant", content: raw },
          { role: "user", content: correction },
        ],
      });
      const raw2 = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const second = validateCandidates(extractJson(raw2), allowedIds);
      // Take the better of the two attempts — a failed retry must never
      // discard a partially-usable first pass.
      if (second.valid.length >= outcome.valid.length) outcome = second;
    } catch (err) {
      log.error({ err }, "visual slides: retry model call failed; using first-pass valid slides");
    }
  }

  if (outcome.valid.length === 0) {
    log.warn(
      { errors: outcome.errors },
      "visual slides: no valid slides after retry; falling back to the text-first deck",
    );
    return null;
  }
  if (outcome.errors.length > 0) {
    log.warn(
      { dropped: outcome.errors.length, kept: outcome.valid.length, errors: outcome.errors },
      "visual slides: dropping slides that failed validation after retry",
    );
  }
  log.info({ slides: outcome.valid.length }, "visual slides: slot-filling pass complete");
  return outcome.valid;
}

// ============================================================================
// Chaptered multi-pass composition (extended / full deck lengths)
// ============================================================================
// A long deck cannot come from one slot-filling call: the model saturates well
// before 40 slides and the single text pass only carries ~8 sources. Instead:
//
//  1. An OUTLINE pass plans 4-7 chapters (title + its own retrieval query).
//  2. Each chapter runs its OWN governed, coverage-gated retrieval (the same
//     dual filter as the body pass: persona clearance AND destination rank),
//     then its own slide batch call grounded in the chapter's permitted chunks
//     plus the base document. A chapter with no permitted evidence SHRINKS or
//     is dropped honestly — never padded.
//  3. The deck frame (cover, agenda, per-chapter dividers, closing) is
//     assembled deterministically and validated against the layout schemas.
//
// Every model call goes through meteredCreate; every retrieval is audited.

export type DeckLength = "standard" | "extended" | "full";

export interface DeckChapterReport {
  title: string;
  query: string;
  plannedSlides: number;
  slideStart: number;
  slideCount: number;
  note?: string | null;
}

export interface DeckReport {
  requestedLength: string;
  targetMin: number;
  targetMax: number;
  plannedSlides: number;
  actualSlides: number;
  chapters: DeckChapterReport[];
  note?: string | null;
}

export interface ChapterContext {
  clearance: Clearance;
  bodyRank: number;
  area: Area | null;
  auditId: string;
  onProgress?: (progress: string) => void;
}

export interface ChapteredDeckResult {
  slides: VisualSlideInput[];
  report: DeckReport;
  // Chapter-retrieval chunks that actually grounded produced slides; the
  // caller appends citations for their documents so the evidence page covers
  // the whole deck, not just the base text pass.
  usedChunks: RetrievedChunk[];
}

const COVERAGE_MIN = 0.33;
const FRAME_IDS = new Set(["photo-cover", "closing", "agenda", "section-divider"]);

const DECK_TARGETS: Record<
  "extended" | "full",
  { min: number; max: number; chaptersMin: number; chaptersMax: number; perChapterMin: number; perChapterMax: number }
> = {
  extended: { min: 25, max: 35, chaptersMin: 4, chaptersMax: 6, perChapterMin: 4, perChapterMax: 6 },
  full: { min: 40, max: 60, chaptersMin: 6, chaptersMax: 7, perChapterMin: 5, perChapterMax: 8 },
};

const FRAME_TEXT: Record<string, { agenda: string; closing: string; source: string }> = {
  en: { agenda: "Agenda", closing: "Thank you", source: "Source" },
  es: { agenda: "Agenda", closing: "Gracias", source: "Fuente" },
  de: { agenda: "Agenda", closing: "Vielen Dank", source: "Quelle" },
  pt: { agenda: "Agenda", closing: "Obrigado", source: "Fonte" },
};

function frameText(language: string) {
  return FRAME_TEXT[language] ?? FRAME_TEXT.en;
}

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).trim()}…`.slice(0, max);
}

// Deterministic frame slides, each validated against its layout schema so the
// frame can never overflow the design. A frame slide that fails validation is
// dropped (logged) rather than shipped broken.
function frameSlide(
  layoutId: string,
  slots: Record<string, unknown>,
  log: Logger,
): VisualSlideInput | null {
  const layout = getVisualLayout(layoutId);
  if (!layout) return null;
  const parsed = layout.schema.safeParse(slots);
  if (!parsed.success) {
    log.warn(
      { layoutId, issues: parsed.error.issues.slice(0, 3) },
      "visual slides: deterministic frame slide failed validation; dropping",
    );
    return null;
  }
  return { layoutId, slots: parsed.data };
}

function pickCoverImageId(): string | null {
  const images = listBrandImages();
  if (images.length === 0) return null;
  const tagged = images.find((img) =>
    img.tags.some((t) => /cover|city|network|hero/i.test(t)),
  );
  return (tagged ?? images[0]).id;
}

interface PlannedChapter {
  title: string;
  query: string;
  plannedSlides: number;
}

// ---- Outline pass -----------------------------------------------------------
// Plans the chapter structure from the governed base document. The model sees
// only already-permitted content; queries it proposes are then themselves
// dual-filtered at retrieval time, so a bad query can only find LESS, never
// more, than governance allows.
async function planChapters(
  draft: GeneratedDraft,
  deckLength: "extended" | "full",
  language: string,
  log: Logger,
): Promise<PlannedChapter[] | null> {
  const t = DECK_TARGETS[deckLength];
  const system = [
    "You are the deck-outline planner of Telefónica's Hub SSoT.",
    "You receive a finished, governed, cited document and plan the chapter structure of a long visual deck built strictly from governed material.",
    "Chapters must be grounded in the document's actual themes — never invent a chapter the document and its topic do not support.",
    `Each chapter needs a short retrieval query (5-12 words, in the document's language) that a search over the governed corpus can use to find more approved material for that chapter. Make queries specific and content-bearing, not generic.`,
    `Write chapter titles in the same language as the document (${language}); at most 60 characters each.`,
    'Return ONLY one JSON object: {"chapters": [{"title": string, "query": string, "slides": number}, ...]} — no prose.',
  ].join(" ");
  const user = `Plan ${t.chaptersMin} to ${t.chaptersMax} chapters for a ${deckLength} visual deck (${t.min}-${t.max} slides total). Each chapter should target ${t.perChapterMin} to ${t.perChapterMax} content slides ("slides" field).

Document:
${documentBlock(draft)}`;
  try {
    const message = await meteredCreate("generate", {
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
    });
    const raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const parsed = extractJson(raw) as { chapters?: unknown } | null;
    const arr = Array.isArray(parsed?.chapters) ? (parsed.chapters as unknown[]) : null;
    if (!arr || arr.length === 0) return null;
    const chapters: PlannedChapter[] = [];
    for (const item of arr.slice(0, t.chaptersMax)) {
      const c = item as { title?: unknown; query?: unknown; slides?: unknown };
      const title = typeof c.title === "string" ? clip(c.title, 60) : "";
      const query = typeof c.query === "string" ? c.query.trim() : "";
      if (!title || !query) continue;
      const slides = Math.max(
        t.perChapterMin,
        Math.min(t.perChapterMax, Math.round(Number(c.slides) || t.perChapterMin)),
      );
      chapters.push({ title, query, plannedSlides: slides });
    }
    return chapters.length >= 2 ? chapters : null;
  } catch (err) {
    log.error({ err }, "visual slides: chapter outline call failed");
    return null;
  }
}

// ---- Per-chapter governed retrieval ------------------------------------------
// Each chapter query gets its OWN coverage-gated pass (coverage is a ratio over
// query idf mass — folding queries together would starve all of them). The
// dual filter applies exactly as in the body pass: persona accessibility AND
// destination rank, fail closed on unknown docs.
async function retrieveChapterChunks(
  query: string,
  ctx: ChapterContext,
): Promise<RetrievedChunk[]> {
  const res = await retrieveGoverned({
    question: query,
    clearance: ctx.clearance,
    area: ctx.area,
    topK: 8,
    audit: { id: ctx.auditId },
  });
  return res.chunks
    .filter((c) => c.coverage >= COVERAGE_MIN && c.accessible)
    .filter(
      (c) =>
        CLEARANCE_RANK[
          (resolveDoc(c.docId)?.confidentiality ?? "off_the_record") as Clearance
        ] <= ctx.bodyRank,
    )
    .slice(0, 6);
}

// Layout-variety check: a chapter that repeats one layout more than three
// times in a row reads as filler; surface it as a validation error so the
// condense-retry pass rebalances the batch.
function varietyErrors(slides: VisualSlideInput[]): string[] {
  const errors: string[] = [];
  let run = 1;
  for (let i = 1; i < slides.length; i++) {
    if (slides[i].layoutId === slides[i - 1].layoutId) {
      run += 1;
      if (run === 4) {
        errors.push(
          `slides ${i - 2}-${i + 1}: layout "${slides[i].layoutId}" is used ${run}+ times in a row — vary the layouts (max 2 consecutive slides of the same layout)`,
        );
      }
    } else {
      run = 1;
    }
  }
  return errors;
}

// ---- Per-chapter slide batch ---------------------------------------------------
async function fillChapterSlides(
  draft: GeneratedDraft,
  chapter: PlannedChapter,
  chunks: RetrievedChunk[],
  language: string,
  log: Logger,
  allowedIds: Set<string> | null,
  refineInstruction?: string | null,
): Promise<VisualSlideInput[] | null> {
  const hasCharts = draft.charts.length > 0;
  const ft = frameText(language);
  const contentAllowed = allowedIds
    ? new Set([...allowedIds].filter((id) => !FRAME_IDS.has(id)))
    : null;
  const evidence =
    chunks.length > 0
      ? chunks
          .map((c) => {
            const doc = resolveDoc(c.docId);
            return `[${doc?.title ?? c.docId}${doc?.quarter ? `, ${doc.quarter}` : ""}] ${c.breadcrumb}\n${c.text}`;
          })
          .join("\n\n")
      : "None beyond the base document — build only what the base document itself supports for this chapter, and produce FEWER slides if the material is thin.";
  const system = [
    "You are the visual-deck composer of Telefónica's Hub SSoT, filling ONE CHAPTER of a long deck.",
    "You receive the deck's base document, this chapter's additional governed evidence, and a catalogue of coded slide layouts.",
    "Build slides ONLY from the base document and the chapter evidence provided. NEVER invent a fact, figure, name or claim. Condensing and rephrasing is allowed; adding content is not.",
    "If the material only supports fewer slides than asked, return fewer slides — an honest short chapter beats a padded one.",
    "NEVER include source markers like [S1] in slot text.",
    `Where a layout schema has an optional "sourceLine" slot, set it to "${ft.source}: <document title>, <version>" using the bracketed titles of the evidence blocks (or the base document's cited sources); omit it when a slide summarises many sources.`,
    "Do not use cover, closing, agenda or section-divider layouts — the deck frame is assembled separately.",
    "Vary layouts: never use the same layout more than 2 slides in a row.",
    "Respect every character limit in the slot schemas strictly; write shorter rather than truncating mid-thought.",
    "Image slots take an id from the approved image library only, chosen by matching tags to the slide's content.",
    "No emoji. No superlatives that are not in the material. Sentence case for titles except where a schema implies a label.",
    `Slide text must be written in the same language as the document (${language}).`,
    'Return ONLY a single JSON object: {"slides": [{"layoutId": string, "slots": object}, ...]} — no prose around it.',
  ].join(" ");
  const user = `Chapter: "${chapter.title}"
Compose ${Math.max(2, chapter.plannedSlides - 1)} to ${chapter.plannedSlides} content slides for this chapter.${
    refineInstruction
      ? `\n\nREFINE request — rebuild this chapter applying the instruction: "${refineInstruction}". Keep everything else grounded exactly as before.`
      : ""
  }

Layout catalogue (content layouts only):
${catalogueBlock(hasCharts, contentAllowed).replace(/### (photo-cover|closing|agenda|section-divider)[\s\S]*?(?=\n\n### |$)/g, "").trim()}

Approved brand image library (use these ids only):
${imageBlock()}

Chapter evidence (governed, permitted):
${evidence}

Base document:
${documentBlock(draft)}`;

  let raw = "";
  try {
    const message = await meteredCreate("generate", {
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    });
    raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    log.error({ err, chapter: chapter.title }, "visual slides: chapter batch call failed");
    throw err;
  }

  const frameFilter = (o: ValidationOutcome): ValidationOutcome => {
    const kept = o.valid.filter((s) => !FRAME_IDS.has(s.layoutId));
    return { valid: kept, errors: o.errors };
  };
  let outcome = frameFilter(validateCandidates(extractJson(raw), contentAllowed));
  const allErrors = [...outcome.errors, ...varietyErrors(outcome.valid)];

  if (allErrors.length > 0) {
    log.warn(
      { chapter: chapter.title, errors: allErrors, valid: outcome.valid.length },
      "visual slides: chapter batch had issues; retrying once",
    );
    const correction = `Some slides failed validation:
${allErrors.map((e) => `- ${e}`).join("\n")}

Return the COMPLETE corrected {"slides": [...]} JSON again. Keep the slides that were valid exactly as they were; fix only the listed problems — condense text to fit the character limits, correct slot names to match the schema exactly, vary the layouts, and only use layout ids from the catalogue and image ids from the library.`;
    try {
      const message = await meteredCreate("generate", {
        model: MODEL,
        max_tokens: 8192,
        system,
        messages: [
          { role: "user", content: user },
          { role: "assistant", content: raw },
          { role: "user", content: correction },
        ],
      });
      const raw2 = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const second = frameFilter(validateCandidates(extractJson(raw2), contentAllowed));
      if (second.valid.length >= outcome.valid.length) outcome = second;
    } catch (err) {
      log.error(
        { err, chapter: chapter.title },
        "visual slides: chapter retry failed; using first-pass valid slides",
      );
    }
  }

  if (outcome.valid.length === 0) return null;
  return outcome.valid.slice(0, DECK_TARGETS.full.perChapterMax);
}

// ---- Deterministic frame assembly ---------------------------------------------
function assembleDeck(
  draft: GeneratedDraft,
  language: string,
  log: Logger,
  chapters: { plan: PlannedChapter; slides: VisualSlideInput[]; note: string | null }[],
): { slides: VisualSlideInput[]; chapterReports: DeckChapterReport[] } {
  const ft = frameText(language);
  const slides: VisualSlideInput[] = [];
  const chapterReports: DeckChapterReport[] = [];

  const coverImageId = pickCoverImageId();
  if (coverImageId) {
    const cover = frameSlide(
      "photo-cover",
      {
        kicker: "Telefónica",
        title: clip(draft.title, 90),
        subtitle: clip(draft.umbrella ?? draft.params.topic, 120),
        imageId: coverImageId,
      },
      log,
    );
    if (cover) slides.push(cover);
  }

  const kept = chapters.filter((c) => c.slides.length > 0);
  if (kept.length >= 3) {
    const agendaSlide = frameSlide(
      "agenda",
      { title: ft.agenda, items: kept.slice(0, 7).map((c) => clip(c.plan.title, 70)) },
      log,
    );
    if (agendaSlide) slides.push(agendaSlide);
  }

  kept.forEach((c, i) => {
    const start = slides.length;
    const divider = frameSlide(
      "section-divider",
      { number: String(i + 1).padStart(2, "0"), title: clip(c.plan.title, 60) },
      log,
    );
    if (divider) slides.push(divider);
    slides.push(...c.slides);
    chapterReports.push({
      title: c.plan.title,
      query: c.plan.query,
      plannedSlides: c.plan.plannedSlides,
      slideStart: start,
      slideCount: slides.length - start,
      note: c.note,
    });
  });

  // Dropped chapters keep a zero-span entry so the report explains them.
  for (const c of chapters.filter((x) => x.slides.length === 0)) {
    chapterReports.push({
      title: c.plan.title,
      query: c.plan.query,
      plannedSlides: c.plan.plannedSlides,
      slideStart: -1,
      slideCount: 0,
      note: c.note,
    });
  }

  const closingSlide = frameSlide(
    "closing",
    { headline: ft.closing, subline: clip(draft.title, 120) },
    log,
  );
  if (closingSlide) slides.push(closingSlide);

  return { slides, chapterReports };
}

function buildReportNote(
  deckLength: "extended" | "full",
  actual: number,
  targetMin: number,
  chapterReports: DeckChapterReport[],
): string | null {
  if (actual >= targetMin) return null;
  const dropped = chapterReports.filter((c) => c.slideCount === 0);
  const thin = chapterReports.filter(
    (c) => c.slideCount > 0 && c.slideCount - 1 < c.plannedSlides,
  );
  const parts: string[] = [
    `The permitted corpus could not support the requested ${deckLength} length; the deck was honestly shortened to ${actual} slides instead of being padded.`,
  ];
  if (dropped.length > 0) {
    parts.push(
      `Dropped for lack of permitted evidence: ${dropped.map((c) => `"${c.title}"`).join(", ")}.`,
    );
  }
  if (thin.length > 0) {
    parts.push(
      `Shorter than planned: ${thin.map((c) => `"${c.title}"`).join(", ")}.`,
    );
  }
  return parts.join(" ");
}

/**
 * Chaptered multi-pass deck composition for extended/full deck lengths.
 * Returns null when no usable deck could be produced — the caller falls back
 * to the single-pass fill (and ultimately the text-first document).
 */
export async function fillVisualDeckChaptered(
  draft: GeneratedDraft,
  deckLength: "extended" | "full",
  language: string,
  log: Logger,
  preferredLayoutIds: string[] | null,
  ctx: ChapterContext,
): Promise<ChapteredDeckResult | null> {
  const t = DECK_TARGETS[deckLength];
  const knownIds = new Set(visualLayoutCatalogue().map((l) => l.id));
  const picked = (preferredLayoutIds ?? []).filter((id) => knownIds.has(id));
  const allowedIds =
    picked.length > 0 ? new Set([...picked, "photo-cover", "closing", "agenda", "section-divider"]) : null;

  ctx.onProgress?.("Planning chapters");
  const plan = await planChapters(draft, deckLength, language, log);
  if (!plan) {
    log.warn({ deckLength }, "visual slides: chapter outline failed; falling back to single pass");
    return null;
  }

  const usedChunks = new Map<string, RetrievedChunk>();
  const chapters: { plan: PlannedChapter; slides: VisualSlideInput[]; note: string | null }[] = [];

  for (const [i, chapter] of plan.entries()) {
    ctx.onProgress?.(`Chapter ${i + 1} of ${plan.length} — ${chapter.title}`);
    let chunks: RetrievedChunk[] = [];
    try {
      chunks = await retrieveChapterChunks(chapter.query, ctx);
    } catch (err) {
      log.warn({ err, chapter: chapter.title }, "visual slides: chapter retrieval failed; using base document only");
    }
    let slides: VisualSlideInput[] | null = null;
    try {
      slides = await fillChapterSlides(draft, chapter, chunks, language, log, allowedIds);
    } catch (err) {
      // Quota refusals must propagate to the route (metering chokepoint);
      // any other model failure shrinks the deck honestly instead.
      if (isQuotaError(err)) throw err;
      slides = null;
    }
    if (!slides) {
      chapters.push({
        plan: chapter,
        slides: [],
        note: "No valid slides could be grounded in permitted material for this chapter.",
      });
      continue;
    }
    if (slides.length > 0) {
      for (const c of chunks) usedChunks.set(c.chunkId, c);
    }
    const note =
      slides.length < chapter.plannedSlides - 1
        ? `Permitted coverage supported ${slides.length} of the ${chapter.plannedSlides} planned slides.`
        : null;
    chapters.push({ plan: chapter, slides, note });
  }

  if (!chapters.some((c) => c.slides.length > 0)) {
    log.warn({ deckLength }, "visual slides: every chapter came back empty; falling back to single pass");
    return null;
  }

  const { slides, chapterReports } = assembleDeck(draft, language, log, chapters);
  const plannedSlides =
    3 + plan.length + plan.reduce((sum, c) => sum + c.plannedSlides, 0);
  const report: DeckReport = {
    requestedLength: deckLength,
    targetMin: t.min,
    targetMax: t.max,
    plannedSlides,
    actualSlides: slides.length,
    chapters: chapterReports,
    note: buildReportNote(deckLength, slides.length, t.min, chapterReports),
  };
  log.info(
    { deckLength, chapters: plan.length, slides: slides.length },
    "visual slides: chaptered composition complete",
  );
  return { slides, report, usedChunks: [...usedChunks.values()] };
}

// ---- Chapter-scoped refine ------------------------------------------------------
// A refine of a chaptered deck re-fills ONLY the chapter the instruction
// targets (picked by token overlap against chapter titles/queries), splices
// the new batch into the existing deck and rebuilds the agenda + divider
// numbering — instead of re-running the whole multi-pass pipeline.
function tokenSet(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).filter(
      (w) => w.length > 2,
    ),
  );
}

function pickTargetChapter(
  report: DeckReport,
  instruction: string,
  selection: string | null,
): number {
  const q = tokenSet(`${instruction} ${selection ?? ""}`);
  let best = 0;
  let bestScore = -1;
  report.chapters.forEach((c, i) => {
    if (c.slideCount === 0) return;
    const ct = tokenSet(`${c.title} ${c.query}`);
    let score = 0;
    for (const w of q) if (ct.has(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

export async function refineChapteredDeck(
  draft: GeneratedDraft,
  baseSlides: VisualSlideInput[],
  baseReport: DeckReport,
  instruction: string,
  selection: string | null,
  language: string,
  log: Logger,
  preferredLayoutIds: string[] | null,
  ctx: ChapterContext,
): Promise<ChapteredDeckResult | null> {
  const idx = pickTargetChapter(baseReport, instruction, selection);
  const target = baseReport.chapters[idx];
  if (!target || target.slideCount === 0) return null;

  ctx.onProgress?.(`Refining chapter — ${target.title}`);
  const knownIds = new Set(visualLayoutCatalogue().map((l) => l.id));
  const picked = (preferredLayoutIds ?? []).filter((id) => knownIds.has(id));
  const allowedIds =
    picked.length > 0 ? new Set([...picked, "photo-cover", "closing", "agenda", "section-divider"]) : null;

  let chunks: RetrievedChunk[] = [];
  try {
    // The refine instruction gets its own gated pass alongside the chapter's
    // stored query — never folded together (coverage is a ratio).
    const [byQuery, byInstruction] = await Promise.all([
      retrieveChapterChunks(target.query, ctx),
      retrieveChapterChunks(instruction, ctx),
    ]);
    const seen = new Set<string>();
    for (const c of [...byQuery, ...byInstruction]) {
      if (!seen.has(c.chunkId)) {
        seen.add(c.chunkId);
        chunks.push(c);
      }
    }
    chunks = chunks.slice(0, 6);
  } catch (err) {
    log.warn({ err }, "visual slides: chapter refine retrieval failed; using base document only");
  }

  const chapterPlan: PlannedChapter = {
    title: target.title,
    query: target.query,
    plannedSlides: target.plannedSlides,
  };
  let newSlides: VisualSlideInput[] | null = null;
  try {
    newSlides = await fillChapterSlides(
      draft,
      chapterPlan,
      chunks,
      language,
      log,
      allowedIds,
      instruction,
    );
  } catch (err) {
    if (isQuotaError(err)) throw err;
    newSlides = null;
  }
  if (!newSlides || newSlides.length === 0) return null;

  // Splice: replace the target chapter's content slides (keep its divider,
  // which sits at slideStart) and rebuild the spans of every later chapter.
  const before = baseSlides.slice(0, target.slideStart + 1);
  const after = baseSlides.slice(target.slideStart + target.slideCount);
  const slides = [...before, ...newSlides, ...after];
  const delta = newSlides.length + 1 - target.slideCount;

  const chapters = baseReport.chapters.map((c, i) => {
    if (i === idx) {
      return {
        ...c,
        slideCount: newSlides.length + 1,
        note:
          newSlides.length < c.plannedSlides - 1
            ? `Permitted coverage supported ${newSlides.length} of the ${c.plannedSlides} planned slides.`
            : null,
      };
    }
    if (c.slideStart > target.slideStart) {
      return { ...c, slideStart: c.slideStart + delta };
    }
    return c;
  });

  const report: DeckReport = {
    ...baseReport,
    actualSlides: slides.length,
    chapters,
    note: buildReportNote(
      baseReport.requestedLength as "extended" | "full",
      slides.length,
      baseReport.targetMin,
      chapters,
    ),
  };
  log.info(
    { chapter: target.title, slides: slides.length },
    "visual slides: chapter-scoped refine complete",
  );
  return { slides, report, usedChunks: chunks };
}
