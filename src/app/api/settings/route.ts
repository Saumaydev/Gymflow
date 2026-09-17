import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gyms, users } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { sanitize, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

/** Gym profile, plan of operation and reminder configuration (PRD §75). */
export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const section = sanitize(body.section) || "gym";

  if (section === "security") {
    const current = sanitize(body.currentPassword);
    const next = sanitize(body.newPassword);
    if (next.length < 8) return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    const [account] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!account || !verifyPassword(current, account.passwordHash)) {
      return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    }
    await db.update(users).set({ passwordHash: hashPassword(next), updatedAt: new Date() }).where(eq(users.id, user.id));
    await writeAudit({ gymId: user.gymId, userId: user.id, action: "UPDATE", entityType: "USER_SECURITY", entityId: user.id });
    return Response.json({ ok: true, message: "Password updated." });
  }

  const reminderRaw = sanitize(body.reminderDays);
  const reminderDays = reminderRaw
    ? reminderRaw
        .split(",")
        .map((v) => Number.parseInt(v.trim(), 10))
        .filter((v) => Number.isFinite(v) && v > 0)
    : undefined;

  await db
    .update(gyms)
    .set({
      name: sanitize(body.name) || undefined,
      tagline: sanitize(body.tagline) || undefined,
      phone: sanitize(body.phone) || undefined,
      email: sanitize(body.email) || undefined,
      address: sanitize(body.address) || undefined,
      logoText: sanitize(body.logoText).slice(0, 4) || undefined,
      openingHours: sanitize(body.openingHours) || undefined,
      inactivityDays: body.inactivityDays !== undefined ? Math.max(1, toInt(body.inactivityDays, 14)) : undefined,
      expiringThresholdDays: body.expiringThresholdDays !== undefined ? Math.max(1, toInt(body.expiringThresholdDays, 7)) : undefined,
      reminderDays: reminderDays && reminderDays.length ? reminderDays.sort((a, b) => b - a) : undefined,
    })
    .where(eq(gyms.id, user.gymId));

  await writeAudit({ gymId: user.gymId, userId: user.id, action: "UPDATE", entityType: "GYM", entityId: user.gymId, newValue: { section } });
  return Response.json({ ok: true, message: "Settings saved." });
}
