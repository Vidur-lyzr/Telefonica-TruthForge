import { Router, type IRouter } from "express";
import {
  ListAdminProfilesResponse,
  ListPlatformUsersResponse,
  ListScheduledDocumentsResponse,
  ListAuditEntriesResponse,
  GetUserVisibilityMatrixResponse,
  GetUsageMeterResponse,
} from "@workspace/api-zod";
import { getUsage } from "../data/usageMeter";
import {
  ADMIN_PROFILES,
  PLATFORM_USERS,
  SCHEDULED_DOCS,
  AUDIT_LOG,
  DOCS,
  getDoc,
  resolveScheduleStatus,
} from "../data/corpus";
import { resolveDocAccess } from "../data/governance";

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

// Per-user document visibility matrix. Every row is resolved by the SAME
// access engine retrieval uses — this page is an inspection of the real rule,
// not a parallel implementation of it.
router.get("/admin/visibility/:userId", (req, res) => {
  const user = PLATFORM_USERS.find((u) => u.id === req.params.userId);
  if (!user) {
    res.status(404).json({ error: "Unknown user" });
    return;
  }
  const rows = DOCS.map((d) => {
    const access = resolveDocAccess(
      { confidentiality: d.confidentiality, areas: d.areas },
      { area: user.area, clearance: user.clearance },
    );
    const explanation = access.accessible
      ? `Visible: "${d.confidentiality}" is within the ${user.clearance} tier and the document is in scope for ${user.area}.`
      : access.blockedBy === "clearance"
        ? `Blocked by confidentiality: the document is "${d.confidentiality}", above the user's "${user.clearance}" tier.`
        : `Blocked by area: the document is scoped to ${d.areas.join(" / ")}, and the user belongs to ${user.area}.`;
    return {
      docId: d.id,
      title: d.title,
      type: d.type,
      confidentiality: d.confidentiality,
      areas: d.areas,
      visible: access.accessible,
      blockedBy: access.blockedBy,
      explanation,
    };
  });
  res.json(
    GetUserVisibilityMatrixResponse.parse({
      user,
      visibleCount: rows.filter((r) => r.visible).length,
      totalCount: rows.length,
      rows,
    }),
  );
});

// Real usage counters of the platform's own agent calls — the cost model's
// usage block is grounded in these, not in invented consumption figures.
router.get("/admin/usage", (_req, res) => {
  const usage = getUsage();
  const totals = usage.modules.reduce(
    (acc, m) => ({
      calls: acc.calls + m.calls,
      inputTokens: acc.inputTokens + m.inputTokens,
      outputTokens: acc.outputTokens + m.outputTokens,
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0 },
  );
  res.json(GetUsageMeterResponse.parse({ ...usage, totals }));
});

router.get("/admin/audit", (_req, res) => {
  const items = [...AUDIT_LOG].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
  res.json(ListAuditEntriesResponse.parse(items));
});

export default router;
