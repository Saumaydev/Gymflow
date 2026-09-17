import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { members, notificationRecipients, notifications, users } from "@/db/schema";
import { getCurrentUser, guardAdmin } from "@/lib/auth";
import { sanitize, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

const TYPES = ["ANNOUNCEMENT", "PAYMENT", "MEMBERSHIP", "HOLIDAY", "EMERGENCY", "EVENT", "TRAINER"] as const;
type NotificationType = (typeof TYPES)[number];

export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const title = sanitize(body.title);
  const message = sanitize(body.message);
  const audience = sanitize(body.audience) || "EVERYONE";
  const rawType = sanitize(body.type).toUpperCase() as NotificationType;
  const type = TYPES.includes(rawType) ? rawType : "ANNOUNCEMENT";

  if (!title || !message) return Response.json({ error: "Title and message are required." }, { status: 400 });

  const [created] = await db
    .insert(notifications)
    .values({ gymId: user.gymId, title, message, type, audience, createdBy: user.id })
    .returning({ id: notifications.id });

  const recipients =
    audience === "TRAINERS"
      ? await db.select({ id: users.id }).from(users).where(and(eq(users.gymId, user.gymId), eq(users.role, "TRAINER")))
      : audience === "MEMBERS"
        ? await db.select({ id: users.id }).from(users).where(and(eq(users.gymId, user.gymId), eq(users.role, "MEMBER")))
        : await db.select({ id: users.id }).from(users).where(eq(users.gymId, user.gymId));

  if (recipients.length) {
    await db
      .insert(notificationRecipients)
      .values(recipients.map((r) => ({ notificationId: created.id, userId: r.id })));
  }

  await writeAudit({
    gymId: user.gymId,
    userId: user.id,
    action: "SEND_NOTIFICATION",
    entityType: "NOTIFICATION",
    entityId: created.id,
    newValue: { title, type, audience, recipients: recipients.length },
  });

  return Response.json({ ok: true, id: created.id, recipients: recipients.length });
}

/** Members acknowledge notifications (PRD §53). */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const notificationId = toInt(body.notificationId, 0);

  if (notificationId) {
    await db
      .update(notificationRecipients)
      .set({ readAt: new Date() })
      .where(and(eq(notificationRecipients.notificationId, notificationId), eq(notificationRecipients.userId, user.id)));
  } else {
    await db
      .update(notificationRecipients)
      .set({ readAt: new Date() })
      .where(and(eq(notificationRecipients.userId, user.id), isNull(notificationRecipients.readAt)));
  }
  return Response.json({ ok: true });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const rows = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      type: notifications.type,
      createdAt: notifications.createdAt,
      readAt: notificationRecipients.readAt,
    })
    .from(notificationRecipients)
    .innerJoin(notifications, eq(notifications.id, notificationRecipients.notificationId))
    .where(eq(notificationRecipients.userId, user.id))
    .orderBy(notifications.createdAt);

  return Response.json({ ok: true, notifications: rows, role: user.role });
}
