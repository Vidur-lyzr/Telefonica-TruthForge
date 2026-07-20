// Usage context — threads the acting session identity from the auth
// middleware into the metering chokepoint via AsyncLocalStorage, so every
// Claude call is attributed to the signed-in user without changing the
// signature of every agent function. Identity comes exclusively from the
// verified session cookie (requireAuth), never from the client body.

import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";
import type { SessionPayload } from "./session";

export interface ActingUser {
  email: string;
  team: string;
}

const storage = new AsyncLocalStorage<ActingUser>();

export function getActingUser(): ActingUser | null {
  return storage.getStore() ?? null;
}

/** Express middleware: runs the rest of the request inside the usage context. */
export function usageContext(req: Request, _res: Response, next: NextFunction): void {
  const session = (req as Request & { session?: SessionPayload }).session;
  if (!session) {
    next();
    return;
  }
  storage.run({ email: session.email, team: session.team }, next);
}
