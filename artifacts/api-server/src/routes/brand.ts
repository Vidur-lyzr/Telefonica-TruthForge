import { Router, type IRouter } from "express";
import {
  GetBrandTemplatesResponse,
  GetBrandToneResponse,
  GetBrandResourcesResponse,
  CheckBrandTextBody,
  CheckBrandTextResponse,
} from "@workspace/api-zod";
import {
  accessibleTemplates,
  accessibleResources,
  brandTone,
} from "../data/brandRoom";
import { checkBrandText } from "../agent/brandGuardian";

const router: IRouter = Router();

function roleIdParam(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

router.get("/brand/templates", (req, res) => {
  const view = accessibleTemplates(roleIdParam(req.query.roleId));
  res.json(GetBrandTemplatesResponse.parse(view));
});

router.get("/brand/tone", (_req, res) => {
  res.json(GetBrandToneResponse.parse(brandTone()));
});

router.get("/brand/resources", (req, res) => {
  const view = accessibleResources(roleIdParam(req.query.roleId));
  res.json(GetBrandResourcesResponse.parse(view));
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

export default router;
