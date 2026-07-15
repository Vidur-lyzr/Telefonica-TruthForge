// Persisted, governed edits of the corporate export templates.
//
// The base templates in export/exportTemplates.ts are the corporate standard
// and are NEVER mutated. An override stores only the editable surface (name,
// description, design spec, block labels/notes); the effective template is a
// clone-merge computed at call time. Structure is fixed: block kinds, order
// and count, formats and accepted shapes cannot be changed by an edit.
//
// Every consumer of a template (export, preview, PNG page previews, ask-chat
// exports, generation) resolves templates through this module, so a saved
// edit immediately governs all future documents until it is reset.

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "../lib/logger";
import {
  EXPORT_TEMPLATES,
  getExportTemplate,
  defaultTemplateForShape,
  type ExportTemplate,
  type TemplateDesign,
} from "../export/exportTemplates";

const STORE_PATH = join(process.cwd(), ".data", "template-overrides.json");

// ---- Types -----------------------------------------------------------------

export interface TemplateBlockEdit {
  kind: string;
  label: string;
  note?: string | null;
}

export interface TemplateEdit {
  name?: string;
  description?: string;
  design?: TemplateDesign;
  blocks?: TemplateBlockEdit[];
}

// The API-facing template: the (possibly overridden) template plus the
// customisation flag and a monotonic revision used to bust cached previews.
export interface ExportTemplateView extends ExportTemplate {
  customized: boolean;
  rev: number;
}

export class TemplateEditError extends Error {
  readonly code = "invalid_template_edit";
  constructor(message: string) {
    super(message);
    this.name = "TemplateEditError";
  }
}

// ---- State + persistence ----------------------------------------------------

let overrides: Record<string, TemplateEdit> = {};
let revs: Record<string, number> = {};

function persist(): void {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify({ overrides, revs }), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (err) {
    logger.error({ err }, "template-overrides: persist failed");
  }
}

function load(): void {
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as {
      overrides?: Record<string, TemplateEdit>;
      revs?: Record<string, number>;
    };
    revs = raw.revs && typeof raw.revs === "object" ? raw.revs : {};
    const stored = raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {};
    // Fail-soft: drop overrides whose base template no longer exists or whose
    // stored edit no longer validates against the current base structure.
    overrides = {};
    for (const [id, edit] of Object.entries(stored)) {
      const base = getExportTemplate(id);
      if (!base) continue;
      try {
        validateTemplateEdit(base, edit);
        overrides[id] = edit;
      } catch (err) {
        logger.warn({ templateId: id, err }, "template-overrides: dropping stale override");
      }
    }
    logger.info(
      { overrides: Object.keys(overrides).length },
      "template-overrides: loaded",
    );
  } catch (err) {
    logger.error({ err }, "template-overrides: load failed — starting clean");
    overrides = {};
    revs = {};
  }
}

// ---- Validation + merge -------------------------------------------------------

function assertLen(value: string, min: number, max: number, field: string): void {
  const len = value.trim().length;
  if (len < min || len > max) {
    throw new TemplateEditError(
      `${field} must be between ${min} and ${max} characters.`,
    );
  }
}

export function validateTemplateEdit(base: ExportTemplate, edit: TemplateEdit): void {
  if (edit.name !== undefined) assertLen(edit.name, 1, 80, "Template name");
  if (edit.description !== undefined) assertLen(edit.description, 0, 300, "Description");
  if (edit.design) {
    assertLen(edit.design.footerLabel, 1, 120, "Footer label");
    assertLen(edit.design.tone, 1, 300, "Tone guidance");
  }
  if (edit.blocks) {
    if (edit.blocks.length !== base.blocks.length) {
      throw new TemplateEditError(
        "The template structure is fixed — blocks cannot be added or removed.",
      );
    }
    edit.blocks.forEach((b, i) => {
      const baseBlock = base.blocks[i];
      if (b.kind !== baseBlock.kind) {
        throw new TemplateEditError(
          "The template structure is fixed — block kinds and order cannot change.",
        );
      }
      assertLen(b.label, 1, 80, `Label of the "${baseBlock.label}" block`);
      if (b.note != null) assertLen(b.note, 0, 240, "Block note");
    });
  }
}

export function applyTemplateEdit(base: ExportTemplate, edit: TemplateEdit): ExportTemplate {
  return {
    ...base,
    name: edit.name !== undefined ? edit.name.trim() : base.name,
    description: edit.description !== undefined ? edit.description.trim() : base.description,
    design: edit.design ? { ...edit.design } : { ...base.design },
    blocks: base.blocks.map((baseBlock, i) => {
      const eb = edit.blocks?.[i];
      if (!eb) return { ...baseBlock };
      const note = eb.note != null && eb.note.trim().length > 0 ? eb.note.trim() : undefined;
      // Kind always comes from the base — structure is not editable.
      return { kind: baseBlock.kind, label: eb.label.trim(), ...(note ? { note } : {}) };
    }),
  };
}

// ---- Effective template resolution --------------------------------------------

function decorate(base: ExportTemplate): ExportTemplateView {
  const edit = overrides[base.id];
  const merged = edit ? applyTemplateEdit(base, edit) : base;
  return { ...merged, customized: Boolean(edit), rev: revs[base.id] ?? 0 };
}

export function effectiveTemplates(): ExportTemplateView[] {
  return EXPORT_TEMPLATES.map(decorate);
}

export function effectiveTemplate(id: string): ExportTemplateView | undefined {
  const base = getExportTemplate(id);
  return base ? decorate(base) : undefined;
}

// Default template for a draft shape, with any saved edit applied.
export function effectiveDefaultTemplateForShape(shape: string): ExportTemplateView {
  return decorate(defaultTemplateForShape(shape));
}

export function templateRev(id: string): number {
  return revs[id] ?? 0;
}

// ---- Mutations -----------------------------------------------------------------

export function saveTemplateOverride(id: string, edit: TemplateEdit): ExportTemplateView {
  const base = getExportTemplate(id);
  if (!base) throw new TemplateEditError("Unknown export template.");
  validateTemplateEdit(base, edit);
  overrides[id] = edit;
  revs[id] = (revs[id] ?? 0) + 1;
  persist();
  return decorate(base);
}

export function resetTemplateOverride(id: string): ExportTemplateView {
  const base = getExportTemplate(id);
  if (!base) throw new TemplateEditError("Unknown export template.");
  if (overrides[id]) {
    delete overrides[id];
    revs[id] = (revs[id] ?? 0) + 1;
    persist();
  }
  return decorate(base);
}

load();
