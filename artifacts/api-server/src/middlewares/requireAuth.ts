import type { Request, Response, NextFunction } from "express";
import { readSessionCookie, verifySessionToken } from "../lib/session";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = verifySessionToken(readSessionCookie(req.headers.cookie));
  if (!session) {
    res.status(401).json({ error: "Not authenticated", code: "unauthenticated" });
    return;
  }
  (req as Request & { session?: typeof session }).session = session;
  next();
}
