// Thin bridge between Express requests and the Observatory store: pulls the
// authenticated session identity off the request (attached by requireAuth)
// and records events against it. Capture is server-side only — the client
// never supplies its own identity.

import type { Request } from "express";
import type { SessionPayload } from "./session";
import {
  recordObservatoryEvent,
  recordHeartbeat,
  type RecordEventInput,
  type SessionIdentity,
} from "../data/observatoryStore";

export function identityOf(req: Request): SessionIdentity | null {
  const session = (req as Request & { session?: SessionPayload }).session;
  if (!session) return null;
  return { sid: session.sid, email: session.email, team: session.team };
}

export function observe(req: Request, input: Omit<RecordEventInput, "identity">): void {
  const identity = identityOf(req);
  if (!identity) return;
  recordObservatoryEvent({ identity, ...input });
}

export function observeHeartbeat(req: Request, page: string | null): void {
  const identity = identityOf(req);
  if (!identity) return;
  recordHeartbeat(identity, page);
}
