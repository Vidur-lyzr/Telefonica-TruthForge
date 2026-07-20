import fs from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import YAML from "yaml";
import {
  GetAgentOverviewResponse,
  GetAgentToolsResponse,
  ListAgentFilesResponse,
  GetAgentFileResponse,
} from "@workspace/api-zod";
import {
  ListAdminProfilesResponse,
  ListPlatformUsersResponse,
  CreatePlatformUserBody,
  CreatePlatformUserResponse,
  UpdatePlatformUserBody,
  UpdatePlatformUserResponse,
  RemovePlatformUserBody,
  RemovePlatformUserResponse,
  ListScheduledDocumentsResponse,
  ListAuditEntriesResponse,
  GetUserVisibilityMatrixResponse,
  GetUsageMeterResponse,
  ListRetrievalLogQueryParams,
  ListRetrievalLogResponse,
  GetSourceSyncStateResponse,
  SetSourceLabelBody,
  SetSourceLabelResponse,
  RunSourceSyncResponse,
  ListUserUsageResponse,
  GetUserUsageDetailResponse,
  SetUserAllocationBody,
  SetUserAllocationResponse,
  ResetUserUsageBody,
  ResetUserUsageResponse,
  GetMyUsageResponse,
} from "@workspace/api-zod";
import { getUsage } from "../data/usageMeter";
import {
  DEFAULT_MONTHLY_TOKEN_QUOTA,
  QUOTA_WARNING_RATIO,
  getUsagePeriod,
  tracedEmails,
  summarizeUser,
  getUserLedger,
  setAllocation,
  resetUserUsage as resetUserUsageStore,
} from "../data/userUsage";
import { getActingUser } from "../lib/usageContext";
import {
  ADMIN_PROFILES,
  SCHEDULED_DOCS,
  AUDIT_LOG,
  DOCS,
  getDoc,
  resolveScheduleStatus,
  AGENT_REPO_ROLE_IDS,
  type Area,
  type Clearance,
  type ProfileId,
} from "../data/corpus";
import {
  listManagedUsers,
  getManagedUser,
  findManagedUserByEmail,
  createManagedUser,
  updateManagedUser,
  removeManagedUser,
  VALID_AREAS,
  VALID_CLEARANCES,
  VALID_PROFILE_IDS,
} from "../data/platformUsers";
import {
  AGENT_DIR,
  DISALLOWED_TOOLS,
} from "../agent/gitagentRuntime";
import { describeGovernedTools } from "../agent/askAgent";
import { resolveDocAccess, recordAudit } from "../data/governance";
import { observe } from "../lib/observe";
import { queryRetrievalLog } from "../data/retrievalLog";
import {
  getSourceSyncState,
  setSourceLabel,
  runBatchSync,
  isValidClearance,
} from "../data/sourceSync";
import {
  requireCapability,
  capabilitiesOf,
  PROFILE_LABELS,
  type CapabilityGrant,
} from "../data/accessControl";
import { ROLES } from "../data/corpus";

const router: IRouter = Router();

// The static capability matrix is not gated: every persona may see WHAT the
// profiles are — governance transparency — they just cannot exercise them.
router.get("/admin/profiles", (_req, res) => {
  const items = ADMIN_PROFILES.map((p) => ({
    ...p,
    capabilities: capabilitiesOf(p.id),
  }));
  res.json(ListAdminProfilesResponse.parse(items));
});

router.get("/admin/users", (req, res) => {
  const grant = requireCapability(req, res, "manage_users_roles");
  if (!grant) return;
  // Partial (admin): only the users of the admin's own area.
  const all = listManagedUsers();
  const users =
    grant.level === "partial" && grant.role.area
      ? all.filter((u) => u.area === grant.role.area)
      : all;
  res.json(ListPlatformUsersResponse.parse(users));
});

// ---------------------------------------------------------------------------
// G1 + I2 — interactive user administration. All three mutations are
// body-based POSTs (roleId rides in the body), persist to the runtime user
// store, and feed the REAL persisted audit trail — the same one the taxonomy
// governance writes to.
// ---------------------------------------------------------------------------

const CLEARANCE_TITLES: Record<Clearance, string> = {
  public: "Public",
  private: "Private",
  confidential: "Confidential",
  off_the_record: "Off the record",
};

interface ValidatedUserFields {
  area: Area;
  clearance: Clearance;
  profileIds: ProfileId[];
}

// Validates the enum-ish fields against the allowed lists. Writes the 400 and
// returns null when something is off.
function validateUserFields(
  res: import("express").Response,
  fields: { area: string; clearance: string; profileIds: string[] },
): ValidatedUserFields | null {
  if (!VALID_AREAS.includes(fields.area as Area)) {
    res.status(400).json({
      error: `Unknown area "${fields.area}". Expected one of: ${VALID_AREAS.join(", ")}.`,
      code: "invalid_body",
    });
    return null;
  }
  if (!VALID_CLEARANCES.includes(fields.clearance as Clearance)) {
    res.status(400).json({
      error: `Unknown clearance "${fields.clearance}". Expected one of: ${VALID_CLEARANCES.join(", ")}.`,
      code: "invalid_body",
    });
    return null;
  }
  const bad = fields.profileIds.find((p) => !VALID_PROFILE_IDS.includes(p as ProfileId));
  if (bad !== undefined || fields.profileIds.length === 0) {
    res.status(400).json({
      error:
        fields.profileIds.length === 0
          ? "At least one profile is required."
          : `Unknown profile "${bad}". Expected one of: ${VALID_PROFILE_IDS.join(", ")}.`,
      code: "invalid_body",
    });
    return null;
  }
  return {
    area: fields.area as Area,
    clearance: fields.clearance as Clearance,
    profileIds: [...new Set(fields.profileIds)] as ProfileId[],
  };
}

// Partial (admin) rule shared by all three mutations: a domain admin may only
// touch users of their own area. Writes the 403 and returns false when blocked.
function requireAreaScope(
  res: import("express").Response,
  grant: CapabilityGrant,
  targetArea: Area,
  action: string,
): boolean {
  // A partial grant without an area is a misconfigured persona — fail closed
  // rather than silently granting cross-area scope.
  if (grant.level === "partial" && !grant.role.area) {
    res.status(403).json({
      error: "Your admin scope has no area assigned — user management is blocked.",
      code: "area_blocked",
      capability: "manage_users_roles",
      profile: grant.role.profileId,
    });
    return false;
  }
  if (grant.level === "partial" && grant.role.area && targetArea !== grant.role.area) {
    res.status(403).json({
      error: `As a domain admin for ${grant.role.area}, you can only ${action} users of ${grant.role.area}.`,
      code: "area_blocked",
      capability: "manage_users_roles",
      profile: grant.role.profileId,
    });
    return false;
  }
  return true;
}

function profileSummary(profileIds: ProfileId[]): string {
  return profileIds.map((p) => PROFILE_LABELS[p]).join(" + ");
}

router.post("/admin/users", (req, res) => {
  const parsed = CreatePlatformUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const body = parsed.data;
  const grant = requireCapability(req, res, "manage_users_roles", "partial", body.roleId);
  if (!grant) return;
  const name = body.name.trim();
  const email = body.email.trim();
  if (name.length === 0 || email.length === 0) {
    res.status(400).json({ error: "Name and email are required.", code: "invalid_body" });
    return;
  }
  const fields = validateUserFields(res, body);
  if (!fields) return;
  if (!requireAreaScope(res, grant, fields.area, "register")) return;
  if (findManagedUserByEmail(email)) {
    res.status(409).json({
      error: `A user with the email ${email} already exists.`,
      code: "duplicate_email",
    });
    return;
  }
  const user = createManagedUser({ name, email, ...fields });
  recordAudit({
    actor: grant.role.name,
    action: "Registered user",
    target: user.name,
    kind: "user",
    detail: `New ${profileSummary(user.profileIds)} in ${user.area} with ${CLEARANCE_TITLES[user.clearance]} clearance.`,
  });
  req.log.info({ userId: user.id, actor: grant.role.id }, "admin: user registered");
  observe(req, {
    kind: "config_change",
    page: "/admin",
    roleId: grant.role.id,
    roleLabel: grant.role.name,
    summary: `Registered user ${user.name} (${user.email})`,
    status: "applied",
    detail: {
      change: "user_registered",
      area: user.area,
      profiles: profileSummary(user.profileIds),
      clearance: CLEARANCE_TITLES[user.clearance],
    },
  });
  res.json(CreatePlatformUserResponse.parse(user));
});

router.post("/admin/users/update", (req, res) => {
  const parsed = UpdatePlatformUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const body = parsed.data;
  const grant = requireCapability(req, res, "manage_users_roles", "partial", body.roleId);
  if (!grant) return;
  const current = getManagedUser(body.userId);
  if (!current) {
    res.status(404).json({ error: "Unknown user id.", code: "not_found" });
    return;
  }
  if (
    (body.name !== undefined && body.name.trim().length === 0) ||
    (body.email !== undefined && body.email.trim().length === 0)
  ) {
    res.status(400).json({ error: "Name and email cannot be empty.", code: "invalid_body" });
    return;
  }
  const fields = validateUserFields(res, {
    area: body.area ?? current.area,
    clearance: body.clearance ?? current.clearance,
    profileIds: body.profileIds ?? current.profileIds,
  });
  if (!fields) return;
  // Domain admins are bounded by their area on BOTH ends: they cannot touch a
  // user of another area, and cannot move one of theirs out of it.
  if (!requireAreaScope(res, grant, current.area, "update")) return;
  if (!requireAreaScope(res, grant, fields.area, "move")) return;
  if (body.email !== undefined) {
    const existing = findManagedUserByEmail(body.email);
    if (existing && existing.id !== current.id) {
      res.status(409).json({
        error: `A user with the email ${body.email.trim()} already exists.`,
        code: "duplicate_email",
      });
      return;
    }
  }
  const user = updateManagedUser(current.id, {
    name: body.name,
    email: body.email,
    ...fields,
  });
  if (!user) {
    res.status(404).json({ error: "Unknown user id.", code: "not_found" });
    return;
  }
  recordAudit({
    actor: grant.role.name,
    action: "Permission change",
    target: user.name,
    kind: "permission",
    detail: `Set ${user.area} · ${profileSummary(user.profileIds)} · ${CLEARANCE_TITLES[user.clearance]} clearance.`,
  });
  req.log.info({ userId: user.id, actor: grant.role.id }, "admin: user updated");
  observe(req, {
    kind: "config_change",
    page: "/admin",
    roleId: grant.role.id,
    roleLabel: grant.role.name,
    summary: `Permission change — ${user.name}: ${user.area} · ${profileSummary(user.profileIds)} · ${CLEARANCE_TITLES[user.clearance]} clearance`,
    status: "applied",
    detail: {
      change: "user_updated",
      area: user.area,
      profiles: profileSummary(user.profileIds),
      clearance: CLEARANCE_TITLES[user.clearance],
    },
  });
  res.json(UpdatePlatformUserResponse.parse(user));
});

router.post("/admin/users/remove", (req, res) => {
  const parsed = RemovePlatformUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const body = parsed.data;
  const grant = requireCapability(req, res, "manage_users_roles", "partial", body.roleId);
  if (!grant) return;
  const current = getManagedUser(body.userId);
  if (!current) {
    res.status(404).json({ error: "Unknown user id.", code: "not_found" });
    return;
  }
  if (!requireAreaScope(res, grant, current.area, "remove")) return;
  const removed = removeManagedUser(current.id);
  if (!removed) {
    res.status(404).json({ error: "Unknown user id.", code: "not_found" });
    return;
  }
  recordAudit({
    actor: grant.role.name,
    action: "User removed",
    target: removed.name,
    kind: "user",
    detail: `Removed ${removed.email} (${removed.area}, ${profileSummary(removed.profileIds)}).`,
  });
  req.log.info({ userId: removed.id, actor: grant.role.id }, "admin: user removed");
  observe(req, {
    kind: "config_change",
    page: "/admin",
    roleId: grant.role.id,
    roleLabel: grant.role.name,
    summary: `User removed — ${removed.name} (${removed.email})`,
    status: "applied",
    detail: {
      change: "user_removed",
      area: removed.area,
      profiles: profileSummary(removed.profileIds),
    },
  });
  res.json(RemovePlatformUserResponse.parse(removed));
});

router.get("/admin/schedules", (req, res) => {
  if (!requireCapability(req, res, "ingest_documents")) return;
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
router.get("/admin/visibility", (req, res) => {
  const grant = requireCapability(req, res, "manage_access_control");
  if (!grant) return;
  const user = getManagedUser(String(req.query.userId ?? ""));
  if (!user) {
    res.status(404).json({ error: "Unknown user" });
    return;
  }
  // Partial (admin): may only inspect users of their own area.
  if (grant.level === "partial" && grant.role.area && user.area !== grant.role.area) {
    res.status(403).json({
      error: `As a domain admin for ${grant.role.area}, you can only inspect the visibility of ${grant.role.area} users.`,
      code: "capability_blocked",
      capability: "manage_access_control",
      profile: grant.role.profileId,
    });
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
// Usage is traceability, so it rides on the view_audit capability.
router.get("/admin/usage", (req, res) => {
  if (!requireCapability(req, res, "view_audit")) return;
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

// ---------------------------------------------------------------------------
// Per-user usage & quotas. Every metered model call is attributed to the
// signed-in user (verified session email, threaded via the usage context) and
// gated by a monthly token allocation BEFORE the model runs. Reads ride on
// view_audit (traceability); allocation edits and resets require
// manage_users_roles and land in the same persisted audit trail as the other
// user-administration mutations.
// ---------------------------------------------------------------------------

async function userQuotaRow(email: string) {
  const summary = await summarizeUser(email);
  const managed = findManagedUserByEmail(email);
  return {
    ...summary,
    managed: managed !== null,
    name: managed?.name ?? null,
  };
}

router.get("/admin/usage/users", async (req, res) => {
  if (!requireCapability(req, res, "view_audit")) return;
  // Show every managed user (even without traced usage yet) plus any traced
  // email outside the directory, flagged unmanaged.
  const emails = new Set<string>(await tracedEmails());
  for (const u of listManagedUsers()) emails.add(u.email.trim().toLowerCase());
  const users = (await Promise.all([...emails].map(userQuotaRow)))
    .sort((a, b) => b.usedTokens - a.usedTokens || a.email.localeCompare(b.email));
  res.json(
    ListUserUsageResponse.parse({
      period: getUsagePeriod(),
      defaultAllocation: DEFAULT_MONTHLY_TOKEN_QUOTA,
      warningRatio: QUOTA_WARNING_RATIO,
      users,
    }),
  );
});

router.get("/admin/usage/users/detail", async (req, res) => {
  if (!requireCapability(req, res, "view_audit")) return;
  const email = typeof req.query.email === "string" ? req.query.email : "";
  if (!email) {
    res.status(400).json({ error: "Missing email." });
    return;
  }
  const { entries, byModule } = await getUserLedger(email);
  res.json(
    GetUserUsageDetailResponse.parse({
      period: getUsagePeriod(),
      summary: await userQuotaRow(email),
      byModule,
      entries: entries.map(({ id, ts, module, inputTokens, outputTokens }) => ({
        id,
        ts,
        module,
        inputTokens,
        outputTokens,
      })),
    }),
  );
});

router.post("/admin/usage/allocation", async (req, res) => {
  const parsed = SetUserAllocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const grant = requireCapability(req, res, "manage_users_roles", "partial", parsed.data.roleId);
  if (!grant) return;
  const change = await setAllocation(parsed.data.email, parsed.data.allocation);
  recordAudit({
    actor: grant.role.name,
    action: "Quota allocation change",
    target: change.email,
    kind: "permission",
    detail: `Monthly token allocation set to ${change.next.toLocaleString("en-US")} (was ${change.previous.toLocaleString("en-US")}).`,
  });
  req.log.info(
    { email: change.email, previous: change.previous, next: change.next, actor: grant.role.id },
    "admin: user allocation changed",
  );
  res.json(SetUserAllocationResponse.parse(await userQuotaRow(change.email)));
});

router.post("/admin/usage/reset", async (req, res) => {
  const parsed = ResetUserUsageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const grant = requireCapability(req, res, "manage_users_roles", "partial", parsed.data.roleId);
  if (!grant) return;
  const result = await resetUserUsageStore(parsed.data.email);
  recordAudit({
    actor: grant.role.name,
    action: "Usage reset",
    target: result.email,
    kind: "permission",
    detail: `Current-period usage cleared (${result.clearedTokens.toLocaleString("en-US")} tokens across ${result.clearedCalls} calls).`,
  });
  req.log.info(
    { email: result.email, clearedTokens: result.clearedTokens, actor: grant.role.id },
    "admin: user usage reset",
  );
  res.json(ResetUserUsageResponse.parse(await userQuotaRow(result.email)));
});

// The signed-in user's own quota status — identity from the verified session
// only, so the frontend can surface the near-limit warning without any admin
// capability.
router.get("/usage/me", async (req, res) => {
  const acting = getActingUser();
  if (!acting) {
    res.status(401).json({ error: "No session." });
    return;
  }
  const s = await summarizeUser(acting.email);
  res.json(
    GetMyUsageResponse.parse({
      email: s.email,
      period: getUsagePeriod(),
      allocation: s.allocation,
      usedTokens: s.usedTokens,
      remainingTokens: s.remainingTokens,
      quotaState: s.quotaState,
      warningRatio: QUOTA_WARNING_RATIO,
    }),
  );
});

// Partial view_audit (admin): an entry is visible when its actor belongs to
// the admin's area, when the entry text names that area, or when it is a
// system-initiated event (scheduled runs) — those concern every domain.
function auditEntryVisibleToArea(
  entry: { actor: string; target: string; detail: string },
  area: string,
): boolean {
  const actorRole = ROLES.find((r) => r.name === entry.actor);
  if (actorRole?.area === area) return true;
  const actorUser = listManagedUsers().find((u) => u.name === entry.actor);
  if (actorUser?.area === area) return true;
  if (`${entry.target} ${entry.detail}`.includes(area)) return true;
  return entry.actor === "System";
}

router.get("/admin/audit", (req, res) => {
  const grant = requireCapability(req, res, "view_audit");
  if (!grant) return;
  let items = [...AUDIT_LOG].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
  if (grant.level === "partial" && grant.role.area) {
    const area = grant.role.area;
    items = items.filter((e) => auditEntryVisibleToArea(e, area));
  }
  res.json(ListAuditEntriesResponse.parse(items));
});

// F3 — retrieval audit log: who retrieved which chunks under which filter.
// Ids and scores only, never chunk text. Filterable by document and persona.
router.get("/admin/retrieval-log", async (req, res) => {
  const parsed = ListRetrievalLogQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query parameters.",
      code: "invalid_query",
    });
    return;
  }
  const { viewerRoleId, docId, roleId, limit, offset } = parsed.data;
  const grant = requireCapability(req, res, "view_audit", "partial", viewerRoleId);
  if (!grant) return;
  // Partial view_audit (admin): only retrievals made by personas of their area.
  const allowedRoleIds =
    grant.level === "partial" && grant.role.area
      ? ROLES.filter((r) => r.area === grant.role.area).map((r) => r.id)
      : undefined;
  const page = await queryRetrievalLog({ docId, roleId, limit, offset, allowedRoleIds });
  res.json(ListRetrievalLogResponse.parse(page));
});

// D5 — simulated source-system sync. Viewing and label changes ride on the
// manage_data_center capability; the batch run is Superadmin-only (full).
router.get("/admin/source-sync", (req, res) => {
  if (!requireCapability(req, res, "manage_data_center")) return;
  res.json(GetSourceSyncStateResponse.parse(getSourceSyncState()));
});

router.post("/admin/source-sync/label", async (req, res) => {
  const parsed = SetSourceLabelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", code: "invalid_body" });
    return;
  }
  const { docId, confidentiality, actor, roleId } = parsed.data;
  const grant = requireCapability(req, res, "manage_data_center", "partial", roleId);
  if (!grant) return;
  if (!isValidClearance(confidentiality)) {
    res.status(400).json({
      error: `"${confidentiality}" is not a valid confidentiality label.`,
      code: "invalid_label",
    });
    return;
  }
  // Partial (admin): labels may only be changed on documents of their area.
  if (grant.level === "partial" && grant.role.area) {
    const doc = getDoc(docId);
    if (doc && !doc.areas.includes(grant.role.area)) {
      res.status(403).json({
        error: `As a domain admin for ${grant.role.area}, you can only change labels on ${grant.role.area} documents.`,
        code: "capability_blocked",
        capability: "manage_data_center",
        profile: grant.role.profileId,
      });
      return;
    }
  }
  const result = await setSourceLabel(
    docId,
    confidentiality,
    actor?.trim() || grant.role.name,
  );
  if (!result.ok) {
    const status = result.code === "unknown_document" ? 404 : 409;
    res.status(status).json({ error: result.error, code: result.code });
    return;
  }
  req.log.info(
    { docId, to: confidentiality, kind: result.delta?.kind },
    "source-sync: label changed",
  );
  observe(req, {
    kind: "config_change",
    page: "/admin",
    roleId: grant.role.id,
    roleLabel: grant.role.name,
    summary: `Source label change — ${getDoc(docId)?.title ?? docId} → ${confidentiality}`,
    status: "applied",
    docIds: [docId],
    detail: { change: "source_label", to: confidentiality },
  });
  res.json(SetSourceLabelResponse.parse(getSourceSyncState()));
});

router.post("/admin/source-sync/run", async (req, res) => {
  const grant = requireCapability(req, res, "manage_data_center", "full");
  if (!grant) return;
  const { run } = await runBatchSync(grant.role.name);
  req.log.info(
    { runId: run.id, applied: run.appliedCount },
    "source-sync: batch run",
  );
  observe(req, {
    kind: "config_change",
    page: "/admin",
    roleId: grant.role.id,
    roleLabel: grant.role.name,
    summary: `Source sync batch run — ${run.appliedCount} label change(s) applied`,
    status: "applied",
    detail: { change: "source_sync_run", runId: run.id, applied: String(run.appliedCount) },
  });
  res.json(RunSourceSyncResponse.parse(getSourceSyncState()));
});

// ---------------------------------------------------------------------------
// Agent transparency endpoints. Everything below is read AT REQUEST TIME from
// the real GitAgent repo on disk (agent.yaml, SKILLS.md, .gitagent/state.json)
// and from the same tool factory the ask pipeline binds per run — nothing is
// a hardcoded parallel copy.
// ---------------------------------------------------------------------------

// Only these extensions are listable/readable from the agent repo.
const AGENT_FILE_EXTENSIONS = new Set([".md", ".yaml", ".yml", ".json"]);
const AGENT_FILE_MAX_CHARS = 60_000;

interface AgentYaml {
  spec_version?: string;
  name?: string;
  version?: string;
  description?: string;
  model?: {
    preferred?: string;
    constraints?: { temperature?: number; max_tokens?: number };
  };
  tools?: string[];
  skills?: string[];
  runtime?: { max_turns?: number; timeout?: number };
  metadata?: {
    permission_binding?: string;
    citation_required?: boolean;
    honest_states?: string;
    trace?: string;
  };
}

function readAgentYaml(): AgentYaml {
  const raw = fs.readFileSync(path.join(AGENT_DIR, "agent.yaml"), "utf8");
  return YAML.parse(raw) as AgentYaml;
}

// Pull the "Load when the user…" routing hints out of the real SKILLS.md
// catalog table, keyed by skill id.
function readSkillCatalogHints(): Map<string, string> {
  const hints = new Map<string, string>();
  let raw = "";
  try {
    raw = fs.readFileSync(path.join(AGENT_DIR, "skills", "SKILLS.md"), "utf8");
  } catch {
    return hints;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|/);
    if (m) hints.set(m[1].trim(), m[2].trim());
  }
  return hints;
}

function listAgentRepoFiles(): { path: string; size: number }[] {
  const out: { path: string; size: number }[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      // lstat-based: symlinks are never followed, in or out of the repo.
      let st: fs.Stats;
      try {
        st = fs.lstatSync(full);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!st.isFile()) continue;
      if (!AGENT_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      out.push({
        path: path.relative(AGENT_DIR, full).split(path.sep).join("/"),
        size: st.size,
      });
    }
  };
  walk(AGENT_DIR);
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

router.get("/admin/agent/overview", (req, res) => {
  if (!requireCapability(req, res, "configure_backend")) return;
  try {
    const y = readAgentYaml();
    const hints = readSkillCatalogHints();
    let session: { sessionId: string; startedAt: string } | null = null;
    try {
      const state = JSON.parse(
        fs.readFileSync(path.join(AGENT_DIR, ".gitagent", "state.json"), "utf8"),
      ) as { session_id?: string; started_at?: string };
      if (state.session_id && state.started_at) {
        session = { sessionId: state.session_id, startedAt: state.started_at };
      }
    } catch {
      session = null;
    }
    const overview = {
      name: y.name ?? "unknown",
      version: y.version ?? "0.0.0",
      specVersion: y.spec_version ?? "unknown",
      description: y.description ?? "",
      model: {
        preferred: y.model?.preferred ?? "unknown",
        temperature: y.model?.constraints?.temperature ?? 0,
        maxTokens: y.model?.constraints?.max_tokens ?? 0,
      },
      runtime: {
        maxTurns: y.runtime?.max_turns ?? 0,
        timeoutSeconds: y.runtime?.timeout ?? 0,
        disallowedTools: [...DISALLOWED_TOOLS],
        permissionBinding: y.metadata?.permission_binding ?? "unknown",
        citationRequired: y.metadata?.citation_required ?? false,
        honestStates: (y.metadata?.honest_states ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        trace: y.metadata?.trace ?? "unknown",
      },
      skills: (y.skills ?? []).map((id) => ({
        id,
        loadWhen: hints.get(id) ?? null,
        bodyPath: `skills/${id}/SKILL.md`,
      })),
      brainDir: `${path.relative(process.cwd(), AGENT_DIR) || "agent"}/`,
      session,
    };
    res.json(GetAgentOverviewResponse.parse(overview));
  } catch (err) {
    req.log.error({ err }, "admin: agent overview failed");
    res.status(500).json({ error: "Could not read the agent repo." });
  }
});

router.get("/admin/agent/tools", (req, res) => {
  if (!requireCapability(req, res, "configure_backend")) return;
  try {
    const y = readAgentYaml();
    const declared = (y.tools ?? []).map((name) => ({
      name,
      description:
        name === "read"
          ? "Read files from the agent repo (skill bodies, knowledge, memory). Declared in agent.yaml; bodies lazy-load on demand."
          : "Declared in agent.yaml.",
      origin: "declared",
    }));
    const injected = describeGovernedTools().map((t) => ({
      name: t.name,
      description: t.description,
      origin: "injected",
      inputSchema: t.inputSchema,
    }));
    res.json(GetAgentToolsResponse.parse({ tools: [...declared, ...injected] }));
  } catch (err) {
    req.log.error({ err }, "admin: agent tools failed");
    res.status(500).json({ error: "Could not read the agent tool catalog." });
  }
});

router.get("/admin/agent/files", (req, res) => {
  if (!requireCapability(req, res, "configure_backend")) return;
  try {
    res.json(
      ListAgentFilesResponse.parse({
        rootLabel: `${path.relative(process.cwd(), AGENT_DIR) || "agent"}/`,
        files: listAgentRepoFiles(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "admin: agent files failed");
    res.status(500).json({ error: "Could not list the agent repo." });
  }
});

router.get("/admin/agent/file", (req, res) => {
  const roleId = String(req.query.roleId ?? "");
  const rel = String(req.query.path ?? "");
  if (!AGENT_REPO_ROLE_IDS.has(roleId)) {
    res.status(403).json({
      error:
        "Reading the agent repo is restricted to super-user personas. Switch to a platform-owner persona to inspect the agent's brain files.",
      code: "agent_repo_restricted",
    });
    return;
  }
  // Path safety: relative, normalised, resolved inside AGENT_DIR, no symlinks,
  // whitelisted extension, size-capped.
  if (!rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) {
    res.status(404).json({ error: "File not found.", code: "agent_file_not_found" });
    return;
  }
  const full = path.resolve(AGENT_DIR, rel);
  if (full !== AGENT_DIR && !full.startsWith(AGENT_DIR + path.sep)) {
    res.status(404).json({ error: "File not found.", code: "agent_file_not_found" });
    return;
  }
  if (!AGENT_FILE_EXTENSIONS.has(path.extname(full).toLowerCase())) {
    res.status(404).json({ error: "File not found.", code: "agent_file_not_found" });
    return;
  }
  let st: fs.Stats;
  try {
    st = fs.lstatSync(full);
  } catch {
    res.status(404).json({ error: "File not found.", code: "agent_file_not_found" });
    return;
  }
  if (st.isSymbolicLink() || !st.isFile()) {
    res.status(404).json({ error: "File not found.", code: "agent_file_not_found" });
    return;
  }
  const raw = fs.readFileSync(full, "utf8");
  const truncated = raw.length > AGENT_FILE_MAX_CHARS;
  req.log.info({ roleId, path: rel, truncated }, "admin: agent file read");
  res.json(
    GetAgentFileResponse.parse({
      path: rel.split(path.sep).join("/"),
      size: st.size,
      content: truncated ? raw.slice(0, AGENT_FILE_MAX_CHARS) : raw,
      truncated,
    }),
  );
});

export default router;
