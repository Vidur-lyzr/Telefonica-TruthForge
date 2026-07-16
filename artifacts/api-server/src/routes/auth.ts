import { Router, type IRouter } from "express";
import { LoginBody, LoginResponse, LogoutResponse } from "@workspace/api-zod";
import { findAuthUser, isLyzrEmail, LYZR_PASSWORD_HASH } from "../data/authUsers";
import {
  createSessionToken,
  readSessionCookie,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  verifyScryptHash,
  verifySessionToken,
} from "../lib/session";

const router: IRouter = Router();

// Random throwaway hash used to equalize login timing for unknown emails.
const DUMMY_PASSWORD_HASH =
  "scrypt:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000";

// In-memory rate limiter: max 5 failed attempts per identity per 15 minutes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    failures.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
  if (failures.size > 5000) {
    for (const [k, v] of failures) {
      if (now - v.windowStart > WINDOW_MS) failures.delete(k);
    }
  }
}

router.post("/auth/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Invalid email or password", code: "invalid_credentials" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const ip = req.ip ?? "unknown";
  const limiterKeys = [`e:${email}`, `ip:${ip}`];

  if (limiterKeys.some(isRateLimited)) {
    req.log.warn({ email }, "login rate limited");
    res.status(429).json({
      error: "Too many attempts. Try again in a few minutes.",
      code: "rate_limited",
    });
    return;
  }

  const user = findAuthUser(email);
  let team: string | null = null;
  if (user) {
    if (verifyScryptHash(password, user.passwordHash)) team = user.team;
  } else if (isLyzrEmail(email)) {
    if (verifyScryptHash(password, LYZR_PASSWORD_HASH)) team = "lyzr";
  } else {
    // Unknown identity: burn the same scrypt cost anyway so response timing
    // does not reveal whether an email is on the allowlist.
    verifyScryptHash(password, DUMMY_PASSWORD_HASH);
  }

  if (!team) {
    limiterKeys.forEach(recordFailure);
    req.log.warn({ email }, "login failed");
    res.status(401).json({ error: "Invalid email or password", code: "invalid_credentials" });
    return;
  }

  limiterKeys.forEach((k) => failures.delete(k));
  const token = createSessionToken(email, team);
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  req.log.info({ email, team }, "login succeeded");
  res.json(LoginResponse.parse({ email, team }));
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { ...sessionCookieOptions(), maxAge: undefined });
  res.json(LogoutResponse.parse({ ok: true }));
});

router.get("/auth/me", (req, res) => {
  const session = verifySessionToken(readSessionCookie(req.headers.cookie));
  if (!session) {
    res.status(401).json({ error: "Not authenticated", code: "unauthenticated" });
    return;
  }
  res.json(LoginResponse.parse({ email: session.email, team: session.team }));
});

export default router;
