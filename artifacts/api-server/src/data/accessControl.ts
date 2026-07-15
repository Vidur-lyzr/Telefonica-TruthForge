import type { Request, Response } from "express";
import { ROLES, type Role, type ProfileId } from "./corpus";

/**
 * Source-of-truth capability matrix for the five platform profiles.
 *
 * The matrix mirrors, cell by cell, the governance table provided by the
 * client (5 profiles x 9 capabilities, each Full / Partial / None):
 *
 *   - full     -> "completo"
 *   - partial  -> "parcial / segun sub-perfil": the capability is bounded by
 *                 the persona's own sub-profile — their area (domain) and
 *                 clearance. What "partial" means per capability is written
 *                 next to each row below.
 *   - none     -> "sin acceso": the server refuses with 403 capability_blocked.
 *
 * Profile is deliberately ORTHOGONAL to clearance: a persona may hold full
 * clearance for reading (data visibility) while having a "user" profile with
 * no management capabilities at all.
 */

export type CapabilityId =
  | "configure_backend" // 1. Configure backend (sources, agents, models)
  | "manage_data_center" // 2. Manage Data Center: connections & taxonomy SCHEMA
  | "ingest_documents" // 3. Document ingestion + assign/edit metadata
  | "manage_brand_room" // 4. Manage Brand Room
  | "manage_access_control" // 5. Manage access control
  | "manage_users_roles" // 6. Manage users and roles
  | "use_modules" // 7. Use / generate in the four workspace modules
  | "approve_sensitive" // 8. Approve / publish sensitive outputs
  | "view_audit"; // 9. View audit (logs, traceability)

export type CapabilityLevel = "full" | "partial" | "none";

/** Matrix row order, exactly as in the source-of-truth table. */
export const CAPABILITY_IDS: readonly CapabilityId[] = [
  "configure_backend",
  "manage_data_center",
  "ingest_documents",
  "manage_brand_room",
  "manage_access_control",
  "manage_users_roles",
  "use_modules",
  "approve_sensitive",
  "view_audit",
];

/**
 * Partial semantics, per capability (documented once, enforced at each guard):
 *
 * 2. manage_data_center  admin partial   = may apply document re-tagging for
 *    the working set, but structural taxonomy ops (axis rename/split/merge)
 *    and rollback are Superadmin-only, as is running a batch source sync.
 *    Source labels may only be changed on documents in the admin's own area.
 * 3. ingest_documents    editor partial  = may upload and edit metadata only
 *    for documents scoped to their own area.
 * 4. manage_brand_room   admin partial   = only the admin whose domain is
 *    Marca may mutate the Brand Room (guardian skill, template overrides).
 * 5/6. access control & users  admin partial = sees/administers only the
 *    users of their own area.
 * 7. use_modules         editor/user partial = the existing sub-profile
 *    scoping (area + clearance) applied inside retrieval — unchanged.
 * 8. approve_sensitive   editor partial  = may approve/publish only outputs
 *    bounded by their own clearance and area (nothing cited above their tier).
 * 9. view_audit          admin partial   = audit/retrieval entries related to
 *    their own area only.
 */
export const CAPABILITY_MATRIX: Record<
  ProfileId,
  Record<CapabilityId, CapabilityLevel>
> = {
  superadmin: {
    configure_backend: "full",
    manage_data_center: "full",
    ingest_documents: "full",
    manage_brand_room: "full",
    manage_access_control: "full",
    manage_users_roles: "full",
    use_modules: "full",
    approve_sensitive: "full",
    view_audit: "full",
  },
  admin: {
    configure_backend: "none",
    manage_data_center: "partial",
    ingest_documents: "full",
    manage_brand_room: "partial",
    manage_access_control: "partial",
    manage_users_roles: "partial",
    use_modules: "full",
    approve_sensitive: "full",
    view_audit: "partial",
  },
  editor: {
    configure_backend: "none",
    manage_data_center: "none",
    ingest_documents: "partial",
    manage_brand_room: "none",
    manage_access_control: "none",
    manage_users_roles: "none",
    use_modules: "partial",
    approve_sensitive: "partial",
    view_audit: "none",
  },
  user: {
    configure_backend: "none",
    manage_data_center: "none",
    ingest_documents: "none",
    manage_brand_room: "none",
    manage_access_control: "none",
    manage_users_roles: "none",
    use_modules: "partial",
    approve_sensitive: "none",
    view_audit: "none",
  },
  auditor: {
    configure_backend: "none",
    manage_data_center: "none",
    ingest_documents: "none",
    manage_brand_room: "none",
    manage_access_control: "none",
    manage_users_roles: "none",
    use_modules: "none",
    approve_sensitive: "none",
    view_audit: "full",
  },
};

export const PROFILE_LABELS: Record<ProfileId, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  editor: "Editor/Reviewer",
  user: "User",
  auditor: "Auditor",
};

export function roleById(roleId: string | null | undefined): Role | undefined {
  if (!roleId) return undefined;
  return ROLES.find((r) => r.id === roleId);
}

export function capabilityLevel(
  profileId: ProfileId,
  capability: CapabilityId,
): CapabilityLevel {
  return CAPABILITY_MATRIX[profileId][capability];
}

export function capabilitiesOf(
  profileId: ProfileId,
): Record<CapabilityId, CapabilityLevel> {
  return CAPABILITY_MATRIX[profileId];
}

export interface CapabilityGrant {
  role: Role;
  level: "full" | "partial";
}

export type CapabilityCheck =
  | ({ ok: true } & CapabilityGrant)
  | {
      ok: false;
      status: number;
      body: {
        error: string;
        code: "invalid_role" | "capability_blocked";
        capability?: CapabilityId;
        profile?: ProfileId;
      };
    };

/**
 * Pure capability check: resolves the persona, looks the capability up in the
 * matrix and compares against the minimum level. Never touches Express.
 */
export function checkCapability(
  roleId: string | null | undefined,
  capability: CapabilityId,
  min: "partial" | "full" = "partial",
): CapabilityCheck {
  const role = roleById(roleId);
  if (!role) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Unknown persona. Provide a valid roleId.",
        code: "invalid_role",
      },
    };
  }
  const level = capabilityLevel(role.profileId, capability);
  const sufficient = level === "full" || (level === "partial" && min === "partial");
  if (!sufficient) {
    return {
      ok: false,
      status: 403,
      body: {
        error: `This action requires the "${capability}" capability${min === "full" ? " at full level" : ""}. The ${PROFILE_LABELS[role.profileId]} profile does not include it.`,
        code: "capability_blocked",
        capability,
        profile: role.profileId,
      },
    };
  }
  return { ok: true, role, level };
}

/**
 * Express-friendly guard for the top of gated handlers. Reads the persona
 * from `roleId` in the query string (GETs) or the JSON body (POSTs) — an
 * explicit `roleId` argument wins when the caller has already parsed it.
 * On failure it writes the 400/403 response and returns null.
 */
export function requireCapability(
  req: Request,
  res: Response,
  capability: CapabilityId,
  min: "partial" | "full" = "partial",
  explicitRoleId?: string,
): CapabilityGrant | null {
  const raw =
    explicitRoleId ??
    (typeof req.query.roleId === "string" ? req.query.roleId : undefined) ??
    (typeof (req.body as Record<string, unknown> | undefined)?.roleId === "string"
      ? ((req.body as Record<string, unknown>).roleId as string)
      : undefined);
  const check = checkCapability(raw, capability, min);
  if (!check.ok) {
    res.status(check.status).json(check.body);
    return null;
  }
  return { role: check.role, level: check.level };
}
