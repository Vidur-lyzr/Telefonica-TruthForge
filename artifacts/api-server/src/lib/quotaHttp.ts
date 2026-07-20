// Shared HTTP mapping for quota refusals. The metering chokepoint throws
// QuotaExceededError BEFORE any Claude call; model-backed routes call this
// first in their catch blocks so the client gets a machine-readable 429
// instead of a generic 500 — same pattern as the other refusal codes.

import type { Response } from "express";
import { isQuotaError } from "../data/userUsage";

export function respondIfQuotaError(err: unknown, res: Response): boolean {
  if (!isQuotaError(err)) return false;
  res.status(429).json({ error: err.message, code: err.code });
  return true;
}
