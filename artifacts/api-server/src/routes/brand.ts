import { Router, type IRouter } from "express";
import {
  GetBrandTemplatesResponse,
  GetBrandTemplateResponse,
  GetBrandToneResponse,
  GetBrandResourcesResponse,
  GetExportTemplatesResponse,
  CheckBrandTextBody,
  CheckBrandTextResponse,
  GetBrandSkillResponse,
  UpdateBrandSkillBody,
  UpdateBrandSkillResponse,
  ResetBrandSkillResponse,
} from "@workspace/api-zod";
import { EXPORT_TEMPLATES } from "../export/exportTemplates";
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

const router: IRouter = Router();

function roleIdParam(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
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

router.get("/brand/resources", (req, res) => {
  const view = accessibleResources(roleIdParam(req.query.roleId));
  res.json(GetBrandResourcesResponse.parse(view));
});

router.get("/brand/export-templates", (_req, res) => {
  res.json(GetExportTemplatesResponse.parse(EXPORT_TEMPLATES));
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
  const skill = updateBrandSkill(parsed.data.content);
  req.log.info({ version: skill.version }, "brand guardian skill updated");
  res.json(UpdateBrandSkillResponse.parse(skill));
});

router.post("/brand/skill/reset", (req, res) => {
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
