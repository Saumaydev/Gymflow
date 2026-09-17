import { db } from "@/db";
import { events, holidays, notifications, notificationRecipients, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { guardAdmin } from "@/lib/auth";
import { sanitize, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

/** Creates holidays and events; both notify the community (PRD §54-§55). */
export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const kind = sanitize(body.kind) || "holiday";
  const title = sanitize(body.title);
  const date = sanitize(body.date);
  const description = sanitize(body.description);
  if (!title || !date) return Response.json({ error: "Title and date are required." }, { status: 400 });

  if (kind === "event") {
    const [created] = await db
      .insert(events)
      .values({
        gymId: user.gymId,
        title,
        date,
        description: description || null,
        eventType: sanitize(body.eventType) || "WORKSHOP",
        capacity: toInt(body.capacity, 0),
      })
      .returning({ id: events.id });

    const [note] = await db
      .insert(notifications)
      .values({ gymId: user.gymId, title: `New event: ${title}`, message: description || `Scheduled for ${date}.`, type: "EVENT", audience: "EVERYONE", createdBy: user.id })
      .returning({ id: notifications.id });
    const recipients = await db.select({ id: users.id }).from(users).where(eq(users.gymId, user.gymId));
    if (recipients.length) {
      await db.insert(notificationRecipients).values(recipients.map((r) => ({ notificationId: note.id, userId: r.id })));
    }
    await writeAudit({ gymId: user.gymId, userId: user.id, action: "CREATE", entityType: "EVENT", entityId: created.id, newValue: { title, date } });
    return Response.json({ ok: true, id: created.id, kind: "event" });
  }

  const [created] = await db
    .insert(holidays)
    .values({ gymId: user.gymId, title, date, description: description || null, createdBy: user.id })
    .returning({ id: holidays.id });

  const [note] = await db
    .insert(notifications)
    .values({
      gymId: user.gymId,
      title: `Gym holiday — ${title}`,
      message: description || `The gym will remain closed on ${date}.`,
      type: "HOLIDAY",
      audience: "EVERYONE",
      createdBy: user.id,
    })
    .returning({ id: notifications.id });

  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.gymId, user.gymId)));
  if (recipients.length) {
    await db.insert(notificationRecipients).values(recipients.map((r) => ({ notificationId: note.id, userId: r.id })));
  }

  await writeAudit({ gymId: user.gymId, userId: user.id, action: "CREATE", entityType: "HOLIDAY", entityId: created.id, newValue: { title, date } });
  return Response.json({ ok: true, id: created.id, kind: "holiday" });
}
