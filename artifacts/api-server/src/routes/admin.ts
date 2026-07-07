import { Router, type IRouter } from "express";
import {
  ListAdminProfilesResponse,
  ListPlatformUsersResponse,
  ListScheduledDocumentsResponse,
  ListAuditEntriesResponse,
} from "@workspace/api-zod";
import {
  ADMIN_PROFILES,
  PLATFORM_USERS,
  SCHEDULED_DOCS,
  AUDIT_LOG,
  getDoc,
  resolveScheduleStatus,
} from "../data/corpus";

const router: IRouter = Router();

router.get("/admin/profiles", (_req, res) => {
  res.json(ListAdminProfilesResponse.parse(ADMIN_PROFILES));
});

router.get("/admin/users", (_req, res) => {
  res.json(ListPlatformUsersResponse.parse(PLATFORM_USERS));
});

router.get("/admin/schedules", (_req, res) => {
  const items = SCHEDULED_DOCS.map((s) => ({
    ...s,
    status: resolveScheduleStatus(s),
    sourceTitle: s.sourceDocId ? (getDoc(s.sourceDocId)?.title ?? null) : null,
  }));
  res.json(ListScheduledDocumentsResponse.parse(items));
});

router.get("/admin/audit", (_req, res) => {
  const items = [...AUDIT_LOG].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
  res.json(ListAuditEntriesResponse.parse(items));
});

export default router;
