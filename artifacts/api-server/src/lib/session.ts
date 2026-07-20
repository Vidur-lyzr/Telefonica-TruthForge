import crypto from "crypto";

const SESSION_COOKIE = "hub_ssot_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Bump to invalidate every outstanding session (global revocation switch).
const TOKEN_VERSION = 1;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

export interface SessionPayload {
  email: string;
  team: string;
  exp: number;
  v: number;
  /** Session id — groups observatory events into a single sitting. */
  sid: string;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(email: string, team: string): string {
  const payload: SessionPayload = {
    email,
    team,
    exp: Date.now() + SESSION_TTL_MS,
    v: TOKEN_VERSION,
    sid: `s-${crypto.randomBytes(8).toString("hex")}`,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (payload.v !== TOKEN_VERSION) return null;
    if (Date.now() > payload.exp) return null;
    if (typeof payload.sid !== "string" || !payload.sid) {
      // Token minted before session ids existed: derive a stable synthetic id
      // so its events still group into one sitting until the token expires.
      payload.sid = `legacy-${crypto
        .createHash("sha256")
        .update(`${payload.email}:${payload.exp}`)
        .digest("hex")
        .slice(0, 16)}`;
    }
    return payload;
  } catch {
    return null;
  }
}

export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export function verifyScryptHash(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const expected = Buffer.from(parts[2]!, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length, { N: 16384, r: 8, p: 1 });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
