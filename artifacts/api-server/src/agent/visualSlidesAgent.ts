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
- Prefer content-bearing layouts (news-card, photo-split, kpi-stats, branded-content, results-table${hasCharts ? ", campaign-metrics" : ""}) for the substance; do not pad with dividers.
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
