import { Router, type IRouter } from "express";
import {
  GetBrandTemplatesResponse,
  GetBrandTemplateResponse,
  GetBrandToneResponse,
  GetBrandResourcesResponse,
  GetExportTemplatesResponse,
  RenderExportTemplateRenditionBody,
  RenderExportTemplateRenditionResponse,
  SaveExportTemplateOverrideBody,
  SaveExportTemplateOverrideResponse,
  CheckBrandTextBody,
  CheckBrandTextResponse,
  GetBrandSkillResponse,
  UpdateBrandSkillBody,
  UpdateBrandSkillResponse,
  ResetBrandSkillResponse,
  UpdateToneOfVoiceBody,
  UpdateToneOfVoiceResponse,
  ResetToneOfVoiceBody,
  ResetToneOfVoiceResponse,
} from "@workspace/api-zod";
import { getExportTemplate } from "../export/exportTemplates";
import { renderTemplatePreview } from "../export/templatePreview";
import { renderTemplateRendition } from "../export/templateRendition";
import {
  effectiveTemplates,
  saveTemplateOverride,
  resetTemplateOverride,
  TemplateEditError,
} from "../data/templateOverrides";
import {
  accessibleTemplates,
  accessibleTemplate,
  accessibleResources,
  brandTone,
} from "../data/brandRoom";
import { checkBrandText } from "../agent/brandGuardian";
import {
  runBrandGuardianAgent,
  type GuardianStreamEvent,
} from "../agent/brandGuardianAgent";
import {
  getBrandSkill,
  updateBrandSkill,
  resetBrandSkill,
} from "../data/brandSkillStore";
import { updateTonePrinciples, resetTonePrinciples } from "../data/toneStore";
import { requireCapability, type CapabilityGrant } from "../data/accessControl";
import type { Request, Response } from "express";
import { ResetBrandSkillBody } from "@workspace/api-zod";

const router: IRouter = Router();

function roleIdParam(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// manage_brand_room guard. Partial (admin) is bounded to the Brand domain:
// only the admin whose area is Marca may mutate the Brand Room.
function requireBrandRoom(
  req: Request,
  res: Response,
  roleId: string,
): CapabilityGrant | null {
  const grant = requireCapability(req, res, "manage_brand_room", "partial", roleId);
  if (!grant) return null;
  if (grant.level === "partial" && grant.role.area !== "Marca") {
    res.status(403).json({
      error: "Only the Brand-area (Marca) admin can manage the Brand Room.",
      code: "capability_blocked",
      capability: "manage_brand_room",
      profile: grant.role.profileId,
    });
    return null;
  }
  return grant;
}

router.get("/brand/templates", (req, res) => {
  const view = accessibleTemplates(roleIdParam(req.query.roleId));
  res.json(GetBrandTemplatesResponse.parse(view));
});

router.get("/brand/template", (req, res) => {
  const templateId = typeof req.query.templateId === "string" ? req.query.templateId : "";
  const view = accessibleTemplate(templateId, roleIdParam(req.query.roleId));
  // Unknown id (exists nowhere, not merely blocked) is a genuine 404.
  if (!view.blocked && view.template === null) {
    res.status(404).json({ error: "Unknown template" });
    return;
  }
  res.json(GetBrandTemplateResponse.parse(view));
});

router.get("/brand/tone", (_req, res) => {
  res.json(GetBrandToneResponse.parse(brandTone()));
});

router.put("/brand/tone", (req, res) => {
  const parsed = UpdateToneOfVoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid tone edit",
      code: "invalid_tone_edit",
      details: parsed.error.issues,
    });
    return;
  }
  if (!requireBrandRoom(req, res, parsed.data.roleId)) return;
  if (parsed.data.principles.length === 0) {
    res.status(400).json({
      error: "At least one tone principle is required.",
      code: "empty_tone_edit",
    });
    return;
  }
  const state = updateTonePrinciples(parsed.data.principles);
  req.log.info({ version: state.version }, "tone of voice updated");
  res.json(UpdateToneOfVoiceResponse.parse(state));
});

router.post("/brand/tone/reset", (req, res) => {
  const parsed = ResetToneOfVoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireBrandRoom(req, res, parsed.data.roleId)) return;
  const state = resetTonePrinciples();
  req.log.info({ version: state.version }, "tone of voice reset to default");
  res.json(ResetToneOfVoiceResponse.parse(state));
});

router.get("/brand/resources", (req, res) => {
  const view = accessibleResources(roleIdParam(req.query.roleId));
  res.json(GetBrandResourcesResponse.parse(view));
});

router.get("/brand/export-templates", (_req, res) => {
  // Effective templates: any saved edit is applied, with customized + rev so
  // the client can flag edited templates and bust cached page previews.
  res.json(GetExportTemplatesResponse.parse(effectiveTemplates()));
});

// Full-document rendition (PDF bytes) of the template's illustrative sample
// through the real export renderers — pdf exact, docx/pptx print renditions.
// Accepts an optional unsaved edit so the editor can live-preview changes.
router.post("/brand/export-template-rendition", async (req, res) => {
  const parsed = RenderExportTemplateRenditionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid rendition request",
      code: "invalid_request",
      details: parsed.error.issues,
    });
    return;
  }
  const { templateId, format, override } = parsed.data;
  try {
    const result = await renderTemplateRendition(templateId, format, override);
    if (!result) {
      res.status(404).json({ error: "Unknown export template", code: "unknown_template" });
      return;
    }
    req.log.info({ templateId, format, override: Boolean(override) }, "template rendition");
    res.json(RenderExportTemplateRenditionResponse.parse(result));
  } catch (err) {
    if (err instanceof TemplateEditError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

// Save or reset a governed edit of an export template. The saved edit becomes
// the effective template for every future export, preview and generation.
router.post("/brand/export-template-override", (req, res) => {
  const parsed = SaveExportTemplateOverrideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid template edit",
      code: "invalid_template_edit",
      details: parsed.error.issues,
    });
    return;
  }
  if (!requireBrandRoom(req, res, parsed.data.roleId)) return;
  const { templateId, reset, edit } = parsed.data;
  if (!getExportTemplate(templateId)) {
    res.status(404).json({ error: "Unknown export template", code: "unknown_template" });
    return;
  }
  if (!reset && (!edit || Object.keys(edit).length === 0)) {
    res.status(400).json({
      error: "No changes supplied — provide an edit or set reset.",
      code: "empty_template_edit",
    });
    return;
  }
  try {
    const template = reset
      ? resetTemplateOverride(templateId)
      : saveTemplateOverride(templateId, edit ?? {});
    req.log.info(
      { templateId, reset: Boolean(reset), rev: template.rev },
      "template override saved",
    );
    res.json(SaveExportTemplateOverrideResponse.parse({ template }));
  } catch (err) {
    if (err instanceof TemplateEditError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

// Deterministic server-rendered page preview (PNG) of an export template.
// Drawn from the same theme tokens, chart engine and brand fonts the real
// exporters use — the preview IS the design of the downloaded document.
router.get("/brand/export-template-preview", (req, res) => {
  const templateId = typeof req.query.templateId === "string" ? req.query.templateId : "";
  const page = req.query.page === "body" ? "body" : req.query.page === "cover" ? "cover" : null;
  if (!templateId || !page) {
    res.status(400).json({ error: "templateId and page (cover|body) are required" });
    return;
  }
  const png = renderTemplatePreview(templateId, page);
  if (!png) {
    res.status(404).json({ error: "Unknown export template" });
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(png);
});

router.post("/brand/check", (req, res) => {
  const parsed = CheckBrandTextBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid check input" });
    return;
  }
  const result = checkBrandText(parsed.data.text);
  res.json(CheckBrandTextResponse.parse(result));
});

router.get("/brand/skill", (_req, res) => {
  res.json(GetBrandSkillResponse.parse(getBrandSkill()));
});

router.put("/brand/skill", (req, res) => {
  const parsed = UpdateBrandSkillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid skill content" });
    return;
  }
  if (!requireBrandRoom(req, res, parsed.data.roleId)) return;
  const skill = updateBrandSkill(parsed.data.content);
  req.log.info({ version: skill.version }, "brand guardian skill updated");
  res.json(UpdateBrandSkillResponse.parse(skill));
});

router.post("/brand/skill/reset", (req, res) => {
  const parsed = ResetBrandSkillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireBrandRoom(req, res, parsed.data.roleId)) return;
  const skill = resetBrandSkill();
  req.log.info({ version: skill.version }, "brand guardian skill reset to default");
  res.json(ResetBrandSkillResponse.parse(skill));
});

// SSE run of the Brand Guardian agent: step events as the run genuinely
// progresses, then a final result event with the full verdict. Mirrors the
// /ask/stream protocol; deliberately outside the OpenAPI contract (SSE).
router.post("/brand/guardian/stream", async (req, res) => {
  const parsed = CheckBrandTextBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid check input" });
    return;
  }
  const text = parsed.data.text.trim();
  if (text.length === 0) {
    res.status(400).json({ error: "Nothing to check" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let closed = false;
  const abort = new AbortController();
  res.on("close", () => {
    closed = true;
    abort.abort();
  });

  const send = (event: string, data: unknown) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const emit = (ev: GuardianStreamEvent) => send("step", ev);

  try {
    const result = await runBrandGuardianAgent(text, req.log, emit, abort.signal);
    send("result", CheckBrandTextResponse.parse(result));
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      req.log.info("guardian stream cancelled: client disconnected");
    } else {
      req.log.error({ err }, "guardian stream failed");
      send("error", { error: "The Brand Guardian could not complete this check." });
    }
  } finally {
    send("done", {});
    res.end();
  }
});

export default router;
