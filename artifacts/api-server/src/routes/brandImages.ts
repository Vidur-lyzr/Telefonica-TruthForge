// Brand image library routes. Browsing is open to any authenticated user;
// every mutation is Brand-Room-gated (manage_brand_room, and a partial/admin
// grant must belong to the Marca area) and audited as a config change.
//
// Uploads follow the presigned-URL flow: the client PUTs bytes straight to
// object storage, then /confirm makes the server fetch the object, verify it
// really is a PNG/JPEG and probe its pixel dimensions BEFORE the image becomes
// selectable by the generate agent. Nothing unverified enters the library.

import { Router, type IRouter, type Request, type Response } from "express";
import { imageSize } from "image-size";
import {
  GetBrandImagesResponse,
  RequestBrandImageUploadUrlBody,
  RequestBrandImageUploadUrlResponse,
  ConfirmBrandImageBody,
  ConfirmBrandImageResponse,
  UpdateBrandImageBody,
  UpdateBrandImageResponse,
  DeleteBrandImageBody,
  DeleteBrandImageResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { fetchObjectBytes, evictObjectBytes } from "../lib/imageBytes";
import {
  listBrandImages,
  libraryTags,
  getBrandImage,
  registerBrandImage,
  updateBrandImage,
  deleteBrandImage,
  ImageLibraryError,
} from "../data/imageLibraryStore";
import { requireCapability, type CapabilityGrant } from "../data/accessControl";
import { observe } from "../lib/observe";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

// Same bounding as the Brand Room: partial (admin) grants must be Marca-area.
function requireImageAdmin(
  req: Request,
  res: Response,
  roleId: string,
): CapabilityGrant | null {
  const grant = requireCapability(req, res, "manage_brand_room", "partial", roleId);
  if (!grant) return null;
  if (grant.level === "partial" && grant.role.area !== "Marca") {
    res.status(403).json({
      error: "Only the Brand-area (Marca) admin can manage the image library.",
      code: "capability_blocked",
      capability: "manage_brand_room",
      profile: grant.role.profileId,
    });
    return null;
  }
  return grant;
}

function sendImageError(res: Response, err: unknown): boolean {
  if (err instanceof ImageLibraryError) {
    res.status(400).json({ error: err.message, code: err.code });
    return true;
  }
  return false;
}

router.get("/brand/images", (_req, res) => {
  res.json(
    GetBrandImagesResponse.parse({ images: listBrandImages(), tags: libraryTags() }),
  );
});

router.post("/brand/images/upload-url", async (req, res) => {
  const parsed = RequestBrandImageUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  if (!requireImageAdmin(req, res, parsed.data.roleId)) return;
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json(RequestBrandImageUploadUrlResponse.parse({ uploadURL, objectPath }));
  } catch (err) {
    req.log.error({ err }, "brand-images: upload URL generation failed");
    res.status(500).json({ error: "Failed to generate an upload URL." });
  }
});

router.post("/brand/images/confirm", async (req, res) => {
  const parsed = ConfirmBrandImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireImageAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  const { objectPath, filename, label, tags } = parsed.data;

  let bytes: Buffer;
  try {
    const file = await storage.getObjectEntityFile(objectPath);
    [bytes] = await file.download();
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(400).json({
        error: "No uploaded file was found at that path — upload it first.",
        code: "upload_missing",
      });
      return;
    }
    req.log.error({ err }, "brand-images: uploaded object fetch failed");
    res.status(500).json({ error: "Could not read the uploaded file." });
    return;
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    res.status(400).json({
      error: "Image is larger than 15 MB — upload a smaller file.",
      code: "image_too_large",
    });
    return;
  }

  let width = 0;
  let height = 0;
  let contentType = "";
  try {
    const dims = imageSize(bytes);
    if (dims.type === "png") contentType = "image/png";
    else if (dims.type === "jpg") contentType = "image/jpeg";
    width = dims.width;
    height = dims.height;
  } catch {
    // fall through to the shared rejection below
  }
  if (!contentType) {
    res.status(400).json({
      error: "The uploaded file is not a valid PNG or JPEG image.",
      code: "unsupported_content_type",
    });
    return;
  }

  try {
    const rec = registerBrandImage({
      objectPath,
      filename,
      contentType,
      width,
      height,
      label,
      tags,
      uploadedBy: grant.role.name,
    });
    req.log.info({ imageId: rec.id, tags: rec.tags }, "brand-images: image registered");
    observe(req, {
      kind: "config_change",
      page: "/brand",
      roleId: grant.role.id,
      roleLabel: grant.role.name,
      summary: `Added brand image "${rec.label}"`,
      status: "applied",
      detail: {
        change: "brand_image_added",
        image: rec.label,
        tags: rec.tags.join(", "),
        dimensions: `${rec.width}x${rec.height}`,
      },
    });
    res.json(ConfirmBrandImageResponse.parse(rec));
  } catch (err) {
    if (!sendImageError(res, err)) {
      req.log.error({ err }, "brand-images: register failed");
      res.status(500).json({ error: "Failed to register the image." });
    }
  }
});

router.post("/brand/images/update", (req, res) => {
  const parsed = UpdateBrandImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireImageAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  try {
    const rec = updateBrandImage(parsed.data.id, {
      label: parsed.data.label,
      tags: parsed.data.tags,
    });
    observe(req, {
      kind: "config_change",
      page: "/brand",
      roleId: grant.role.id,
      roleLabel: grant.role.name,
      summary: `Updated brand image "${rec.label}"`,
      status: "applied",
      detail: { change: "brand_image_updated", image: rec.label, tags: rec.tags.join(", ") },
    });
    res.json(UpdateBrandImageResponse.parse(rec));
  } catch (err) {
    if (!sendImageError(res, err)) {
      req.log.error({ err }, "brand-images: update failed");
      res.status(500).json({ error: "Failed to update the image." });
    }
  }
});

router.post("/brand/images/delete", async (req, res) => {
  const parsed = DeleteBrandImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const grant = requireImageAdmin(req, res, parsed.data.roleId);
  if (!grant) return;
  try {
    const rec = deleteBrandImage(parsed.data.id);
    evictObjectBytes(rec.objectPath);
    // Best-effort removal of the underlying object; the record is already
    // gone, so a failed GCS delete only leaves an orphaned blob.
    try {
      const file = await storage.getObjectEntityFile(rec.objectPath);
      await file.delete();
    } catch (err) {
      req.log.warn({ err, objectPath: rec.objectPath }, "brand-images: blob delete failed");
    }
    observe(req, {
      kind: "config_change",
      page: "/brand",
      roleId: grant.role.id,
      roleLabel: grant.role.name,
      summary: `Removed brand image "${rec.label}"`,
      status: "applied",
      detail: { change: "brand_image_removed", image: rec.label },
    });
    res.json(DeleteBrandImageResponse.parse({ ok: true, id: rec.id }));
  } catch (err) {
    if (!sendImageError(res, err)) {
      req.log.error({ err }, "brand-images: delete failed");
      res.status(500).json({ error: "Failed to delete the image." });
    }
  }
});

router.get("/brand/images/content", async (req, res) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const rec = id ? getBrandImage(id) : undefined;
  if (!rec) {
    res.status(404).json({ error: "Unknown image." });
    return;
  }
  const bytes = await fetchObjectBytes(rec.objectPath);
  if (!bytes) {
    res.status(404).json({ error: "Image bytes are no longer available." });
    return;
  }
  res.setHeader("Content-Type", rec.contentType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(bytes);
});

export default router;
