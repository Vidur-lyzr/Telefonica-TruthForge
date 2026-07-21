// Audit copies of exported files. Every successful export (Generate and Ask
// document downloads) stores the exact rendered bytes in object storage under
// audit-exports/<uuid>; the observatory export event carries the asset id so
// audit-team users can download the very file the user received. Storage
// failures never block the user's export — the event then carries metadata
// only and the audit UI shows no file link.

import { randomUUID } from "crypto";
import { Readable } from "stream";
import { objectStorageClient } from "../lib/objectStorage";

function parsePrivateDir(): { bucketName: string; prefix: string } {
  const dir = process.env.PRIVATE_OBJECT_DIR ?? "";
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR is not set — object storage is required for audit export copies.");
  }
  const parts = (dir.startsWith("/") ? dir.slice(1) : dir).split("/").filter(Boolean);
  if (parts.length < 1) throw new Error("PRIVATE_OBJECT_DIR is malformed.");
  return { bucketName: parts[0]!, prefix: parts.slice(1).join("/") };
}

const ASSET_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function objectNameFor(assetId: string): { bucketName: string; objectName: string } {
  const { bucketName, prefix } = parsePrivateDir();
  const entityId = `audit-exports/${assetId}`;
  return { bucketName, objectName: prefix ? `${prefix}/${entityId}` : entityId };
}

/** Stores an audit copy of an exported file; returns the asset id. */
export async function saveAuditExportAsset(
  bytes: Buffer,
  contentType: string,
  filename: string,
): Promise<string> {
  const assetId = randomUUID();
  const { bucketName, objectName } = objectNameFor(assetId);
  const safeName = filename.replace(/["\\\r\n]/g, "_");
  await objectStorageClient
    .bucket(bucketName)
    .file(objectName)
    .save(bytes, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=0",
        contentDisposition: `attachment; filename="${safeName}"`,
      },
    });
  return assetId;
}

export interface AuditExportAsset {
  stream: Readable;
  contentType: string;
  contentDisposition: string;
  size: number | null;
}

/** Returns the stored audit copy, or null when the id is unknown/invalid. */
export async function getAuditExportAsset(assetId: string): Promise<AuditExportAsset | null> {
  if (!ASSET_ID_RE.test(assetId)) return null;
  const { bucketName, objectName } = objectNameFor(assetId);
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [metadata] = await file.getMetadata();
  return {
    stream: file.createReadStream(),
    contentType: (metadata.contentType as string) || "application/octet-stream",
    contentDisposition:
      (metadata.contentDisposition as string) || `attachment; filename="export-${assetId}"`,
    size: metadata.size ? Number(metadata.size) : null,
  };
}
