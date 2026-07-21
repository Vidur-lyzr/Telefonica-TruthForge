import type { Request, Response, NextFunction } from "express";
import type { SessionPayload } from "../lib/session";

// Platform Audit gate: lyzr and accenture team sessions may read audit data.
// This is a SERVER decision on the verified session cookie — hiding the nav
// item on the client is cosmetic, this middleware is the boundary.
const AUDIT_TEAMS = new Set(["lyzr", "accenture"]);

export function requireAuditTeam(req: Request, res: Response, next: NextFunction): void {
  const session = (req as Request & { session?: SessionPayload }).session;
  if (!session || !AUDIT_TEAMS.has(session.team)) {
    res.status(403).json({ error: "Platform Audit access is restricted.", code: "forbidden" });
    return;
  }
  next();
}
