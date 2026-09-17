import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { members, trainerMembers, trainers } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { sanitize, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

/** Trainer ↔ member assignment (PRD §43). */
export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const action = sanitize(body.action) || "assign";
  const trainerId = toInt(body.trainerId, 0);
  const memberId = toInt(body.memberId, 0);
  if (!trainerId || !memberId) return Response.json({ error: "Trainer and member are required." }, { status: 400 });

  const [trainer] = await db
    .select({ id: trainers.id, name: trainers.name })
    .from(trainers)
    .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, user.gymId)))
    .limit(1);
  const [member] = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.gymId, user.gymId)))
    .limit(1);
  if (!trainer || !member) return Response.json({ error: "Trainer or member not found." }, { status: 404 });

  const existing = await db
    .select()
    .from(trainerMembers)
    .where(and(eq(trainerMembers.memberId, memberId), eq(trainerMembers.status, "ACTIVE")));

  for (const row of existing) {
    const shouldEnd = action === "remove" ? row.trainerId === trainerId : true;
    if (shouldEnd) {
      await db
        .update(trainerMembers)
        .set({ status: "REMOVED", endedAt: new Date() })
        .where(eq(trainerMembers.id, row.id));
    }
  }

  if (action === "assign") {
    await db.insert(trainerMembers).values({ gymId: user.gymId, trainerId, memberId, status: "ACTIVE" });
  }

  await writeAudit({
    gymId: user.gymId,
    userId: user.id,
    action: action === "assign" ? "ASSIGN_TRAINER" : "UNASSIGN_TRAINER",
    entityType: "TRAINER_MEMBER",
    entityId: memberId,
    oldValue: { trainer: existing[0]?.trainerId ?? null },
    newValue: { trainer: action === "assign" ? trainer.name : null, member: member.name },
  });

  return Response.json({ ok: true });
}
