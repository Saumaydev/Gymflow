import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gyms, members, trainers, users, type Gym, type Member, type Trainer } from "@/db/schema";
import { sessionCookie, signSession, verifyPassword, verifySessionToken, type SessionPayload } from "./crypto";
import { ensureBootstrap } from "./bootstrap";

export type SessionRole = SessionPayload["role"];

export type CurrentUser = {
  id: number;
  gymId: number;
  role: SessionRole;
  name: string;
  email: string;
  phone: string | null;
  profileImage: string | null;
  gym: Gym;
  member: Member | null;
  trainer: Trainer | null;
};

export function homeFor(role: SessionRole): string {
  if (role === "ADMIN") return "/admin";
  if (role === "TRAINER") return "/trainer";
  return "/member";
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(sessionCookie.name)?.value);
}

/**
 * Loads the authenticated user together with their role profile and gym.
 * Wrapped in React `cache` so a layout + page render resolves it exactly once per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const payload = await getSessionPayload();
  if (!payload) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, payload.uid), eq(users.status, "ACTIVE")))
    .limit(1);
  if (!user) return null;

  const [gym] = await db.select().from(gyms).where(eq(gyms.id, user.gymId)).limit(1);
  if (!gym) return null;

  const [memberRow, trainerRow] = await Promise.all([
    user.role === "MEMBER"
      ? db.select().from(members).where(eq(members.userId, user.id)).limit(1).then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    user.role === "TRAINER"
      ? db.select().from(trainers).where(eq(trainers.userId, user.id)).limit(1).then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    id: user.id,
    gymId: user.gymId,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage,
    gym,
    member: memberRow,
    trainer: trainerRow,
  };
});

export async function requireRole<R extends SessionRole>(...roles: R[]): Promise<CurrentUser> {
  await ensureBootstrap();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role as R)) redirect(homeFor(user.role));
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}

/** Verifies credentials and returns the signed session payload. */
export async function authenticate(email: string, password: string): Promise<SessionPayload | null> {
  await ensureBootstrap();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  if (!user || user.status !== "ACTIVE") return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  return {
    uid: user.id,
    role: user.role,
    gymId: user.gymId,
    name: user.name,
    exp: Date.now() + sessionCookie.maxAge * 1000,
  };
}

export function buildSessionCookie(payload: SessionPayload) {
  return {
    name: sessionCookie.name,
    value: signSession(payload),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookie.maxAge,
  };
}

export function clearedSessionCookie() {
  return {
    name: sessionCookie.name,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

/** Authorises an admin-only API call, returning a JSON error when denied. */
export async function guardAdmin(): Promise<{ user: CurrentUser } | { error: Response }> {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  if (user.role !== "ADMIN") return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

/** Records the last sign-in without blocking the response path. */
export async function touchLastLogin(userId: number) {
  void db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId))
    .catch(() => undefined);
}
