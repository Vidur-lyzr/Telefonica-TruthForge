// Pipeline asset writes — thumbnails, previews and harvested image bytes go
// to object storage under a per-job prefix; the job snapshot stores only the
// returned /objects/... path (served back through the guarded asset route).

import { objectStorageClient } from "../../lib/objectStorage";

function parsePrivateDir(): { bucketName: string; prefix: string } {
  const dir = process.env.PRIVATE_OBJECT_DIR ?? "";
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR is not set — object storage is required for deck extraction.");
  }
  const parts = (dir.startsWith("/") ? dir.slice(1) : dir).split("/").filter(Boolean);
  if (parts.length < 1) throw new Error("PRIVATE_OBJECT_DIR is malformed.");
  return { bucketName: parts[0]!, prefix: parts.slice(1).join("/") };
}

export async function saveDeckAsset(
  jobId: string,
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  const { bucketName, prefix } = parsePrivateDir();
  const entityId = `deck-intake/${jobId}/${key}`;
  const objectName = prefix ? `${prefix}/${entityId}` : entityId;
  await objectStorageClient
    .bucket(bucketName)
    .file(objectName)
    .save(bytes, {
      contentType,
      resumable: false,
      metadata: { cacheControl: "private, max-age=3600" },
    });
  return `/objects/${entityId}`;
}
