import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt, no plaintext ever stored)                 */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Readable one-time password handed to a newly registered member/trainer. */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `gf-${body.slice(0, 5)}-${body.slice(5)}`;
}

/* ------------------------------------------------------------------ */
/* HMAC signed session tokens                                          */
/* ------------------------------------------------------------------ */

export type SessionPayload = {
  uid: number;
  role: "ADMIN" | "TRAINER" | "MEMBER";
  gymId: number;
  name: string;
  exp: number;
};

const SESSION_COOKIE = "gf_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || "gymflow-local-session-secret";
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signSession(payload: SessionPayload): string {
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload?.uid || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  maxAge: SESSION_TTL_MS / 1000,
  options: {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  },
};
