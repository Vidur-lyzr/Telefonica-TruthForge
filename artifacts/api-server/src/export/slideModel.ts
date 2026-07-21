// Shared slide decomposition for the .pptx renderer AND its WYSIWYG preview.
// Both consumers iterate exactly this sequence, so the preview can never show
// a different slide order, split or content than the real download. Any change
// to how a deck is split into slides belongs HERE, never in a renderer.

import type { ExportDocumentModel } from "./exportService";
import type { RenderedChart } from "./chartEngine";
import type { VisualSlideModel } from "./visualLayouts";

export const SPOKESPERSON_PER_SLIDE = 2;

export type SlideSpec =
  | { kind: "title" }
  | { kind: "visual"; slide: VisualSlideModel }
  | { kind: "umbrella"; text: string }
  | { kind: "section"; heading: string; body: string; internalOnly: boolean }
  | {
      kind: "qa";
      index: number;
      total: number;
      question: string;
      answer: string;
      sourcesLine: string;
      note: string | null;
    }
  | {
      kind: "spokesperson";
      batch: { question: string; guidance: string; doNotSay: string | null }[];
    }
  | { kind: "chart"; chart: RenderedChart }
  | {
      kind: "table";
      title: string;
      sourceLine: string;
      columns: string[];
      rows: string[][];
    }
  | { kind: "citations" }
  | { kind: "disclaimers" };

// Provenance line under a Q&A answer — identical wording in every format.
export function qaSourcesLine(item: ExportDocumentModel["qa"][number]): string {
  return item.provenance.length > 0
    ? `Sources: ${item.provenance
        .map((p) => [p.docTitle, p.version, p.owner].filter(Boolean).join(" · "))
        .join(" | ")}`
    : "Not covered by approved material — no governed source backs this answer.";
}

export function tableSourceLine(table: ExportDocumentModel["tables"][number]): string {
  return `Source: ${table.source}${table.citationId ? ` · cited [${table.citationId}]` : ""}`;
}

export function buildSlides(model: ExportDocumentModel): SlideSpec[] {
  // A visual deck replaces the text-first slide pipeline entirely: the agent
  // composed every content slide (including the cover) as a coded layout. Only
  // the governed provenance slides (citations, disclaimers) are appended — a
  // visual deck never ships without its evidence.
  if (model.visualSlides.length > 0) {
    const slides: SlideSpec[] = model.visualSlides.map((slide) => ({ kind: "visual" as const, slide }));
    if (model.citations.length > 0) slides.push({ kind: "citations" });
    if (model.disclaimers.length > 0) slides.push({ kind: "disclaimers" });
    return slides;
  }

  const slides: SlideSpec[] = [{ kind: "title" }];

  if (model.umbrella) {
    slides.push({ kind: "umbrella", text: model.umbrella });
  }

  // The raw Q&A section is skipped when the structured Q&A block is present —
  // it is rendered as styled per-question slides below, never as an
  // unformatted text blob.
  for (const section of model.sections) {
    if (section.isQa && model.qa.length > 0) continue;
    slides.push({
      kind: "section",
      heading: section.heading,
      body: section.body,
      internalOnly: section.internalOnly,
    });
  }

  if (model.qa.length > 0) {
    model.qa.forEach((item, index) => {
      slides.push({
        kind: "qa",
        index,
        total: model.qa.length,
        question: item.question,
        answer: item.answer,
        sourcesLine: qaSourcesLine(item),
        note: item.note,
      });
    });
  }

  if (model.spokesperson.length > 0) {
    for (let i = 0; i < model.spokesperson.length; i += SPOKESPERSON_PER_SLIDE) {
      slides.push({
        kind: "spokesperson",
        batch: model.spokesperson
          .slice(i, i + SPOKESPERSON_PER_SLIDE)
          .map((s) => ({ question: s.question, guidance: s.guidance, doNotSay: s.doNotSay })),
      });
    }
  }

  for (const chart of model.charts) {
    slides.push({ kind: "chart", chart });
  }

  for (const table of model.tables) {
    slides.push({
      kind: "table",
      title: table.title,
      sourceLine: tableSourceLine(table),
      columns: table.columns,
      rows: table.rows,
    });
  }

  if (model.citations.length > 0) slides.push({ kind: "citations" });
  if (model.disclaimers.length > 0) slides.push({ kind: "disclaimers" });

  return slides;
}
