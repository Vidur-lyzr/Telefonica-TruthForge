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
  AGENT_REPO_ROLE_IDS,
} from "../data/corpus";
import {
  AGENT_DIR,
  DISALLOWED_TOOLS,
} from "../agent/gitagentRuntime";
import { describeGovernedTools } from "../agent/askAgent";
import { resolveDocAccess } from "../data/governance";
import { queryRetrievalLog } from "../data/retrievalLog";
import {
  getSourceSyncState,
  setSourceLabel,
  runBatchSync,
  isValidClearance,
} from "../data/sourceSync";
import { requireCapability, capabilitiesOf } from "../data/accessControl";
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
  const users =
    grant.level === "partial" && grant.role.area
      ? PLATFORM_USERS.filter((u) => u.area === grant.role.area)
      : PLATFORM_USERS;
  res.json(ListPlatformUsersResponse.parse(users));
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
  const user = PLATFORM_USERS.find((u) => u.id === String(req.query.userId ?? ""));
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

// Partial view_audit (admin): an entry is visible when its actor belongs to
// the admin's area, when the entry text names that area, or when it is a
// system-initiated event (scheduled runs) — those concern every domain.
function auditEntryVisibleToArea(
  entry: { actor: string; target: string; detail: string },
  area: string,
): boolean {
  const actorRole = ROLES.find((r) => r.name === entry.actor);
  if (actorRole?.area === area) return true;
  const actorUser = PLATFORM_USERS.find((u) => u.name === entry.actor);
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
router.get("/admin/retrieval-log", (req, res) => {
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
  const page = queryRetrievalLog({ docId, roleId, limit, offset, allowedRoleIds });
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
