import type { Request, Response, NextFunction } from "express";
import type { SessionPayload } from "../lib/session";

// Observatory gate: only lyzr-team sessions may read audit data. This is a
// SERVER decision on the verified session cookie — hiding the nav item on
// the client is cosmetic, this middleware is the boundary.
export function requireLyzr(req: Request, res: Response, next: NextFunction): void {
  const session = (req as Request & { session?: SessionPayload }).session;
  if (!session || session.team !== "lyzr") {
    res.status(403).json({ error: "Observatory access is restricted.", code: "forbidden" });
    return;
  }
  next();
}
