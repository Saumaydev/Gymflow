import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendance, members, trainers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { toISODate, today } from "@/lib/format";
import { sanitize, toInt, writeAudit } from "@/lib/actions";
import { parseScannedCode } from "@/lib/qr";

export const dynamic = "force-dynamic";

/** Marks a member or trainer check-in. Admin + trainer allowed. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const mode = sanitize(body.mode) || "manual";
  const iso = toISODate(today());

  if (user.role === "MEMBER") {
    // Members may self check-in through the app / QR scanner.
    if (!user.member) return Response.json({ error: "Forbidden" }, { status: 403 });
    const existing = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(and(eq(attendance.memberId, user.member.id), eq(attendance.date, iso)))
      .limit(1);
    if (existing.length) {
      return Response.json({ error: "You have already checked in today." }, { status: 409 });
    }
    await db.insert(attendance).values({
      gymId: user.gymId,
      userId: user.id,
      memberId: user.member.id,
      date: iso,
      checkIn: new Date(),
      status: "PRESENT",
      method: "APP",
    });
    return Response.json({ ok: true, name: user.name, time: new Date().toISOString(), method: "APP" });
  }

  if (user.role !== "ADMIN" && user.role !== "TRAINER") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // QR path — resolve by member code, then by numeric id.
  if (mode === "qr") {
    // Tolerates raw codes, the `GYMFLOW:` payload embedded in the QR and deep links.
    const code = parseScannedCode(sanitize(body.code));
    if (!code) return Response.json({ error: "Scan or type a member code." }, { status: 400 });
    const [member] = await db
      .select({ id: members.id, name: members.name, memberCode: members.memberCode, userId: members.userId })
      .from(members)
      .where(and(eq(members.gymId, user.gymId), sql`upper(${members.memberCode}) = ${code}`))
      .limit(1);
    if (!member) return Response.json({ error: `No member found for ${code}.` }, { status: 404 });

    const existing = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(and(eq(attendance.memberId, member.id), eq(attendance.date, iso)))
      .limit(1);
    if (existing.length) {
      return Response.json({ error: `${member.name} is already checked in today.` }, { status: 409 });
    }

    // Trainers may only check in members on their own roster.
    if (user.role === "TRAINER" && user.trainer) {
      const roster = await db.execute(
        sql`select 1 from trainer_members tm where tm.trainer_id = ${user.trainer.id} and tm.member_id = ${member.id} and tm.status = 'ACTIVE' limit 1`,
      );
      const rowsPresent = (roster as unknown as { rows: unknown[] }).rows.length > 0;
      if (!rowsPresent) {
        return Response.json({ error: `${member.name} is not on your assigned roster.` }, { status: 403 });
      }
    }

    await db.insert(attendance).values({
      gymId: user.gymId,
      userId: member.userId,
      memberId: member.id,
      date: iso,
      checkIn: new Date(),
      status: "PRESENT",
      method: "QR",
    });
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "CHECK_IN",
      entityType: "ATTENDANCE",
      entityId: member.id,
      newValue: { member: member.name, method: "QR" },
    });
    return Response.json({ ok: true, name: member.name, code: member.memberCode, time: new Date().toISOString(), method: "QR" });
  }

  const memberId = toInt(body.memberId, 0);
  const trainerId = toInt(body.trainerId, 0);
  const status = (sanitize(body.status) || "PRESENT") as "PRESENT" | "ABSENT" | "LATE";
  const method = (sanitize(body.method) || "MANUAL") as "MANUAL" | "QR" | "APP";

  if (memberId) {
    const [member] = await db
      .select({ id: members.id, name: members.name, userId: members.userId })
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.gymId, user.gymId)))
      .limit(1);
    if (!member) return Response.json({ error: "Member not found." }, { status: 404 });
    if (user.role === "TRAINER" && user.trainer) {
      const roster = await db.execute(
        sql`select 1 from trainer_members tm where tm.trainer_id = ${user.trainer.id} and tm.member_id = ${member.id} and tm.status = 'ACTIVE' limit 1`,
      );
      if (!(roster as unknown as { rows: unknown[] }).rows.length) {
        return Response.json({ error: `${member.name} is not on your assigned roster.` }, { status: 403 });
      }
    }
    const existing = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(and(eq(attendance.memberId, member.id), eq(attendance.date, iso)))
      .limit(1);
    if (existing.length) {
      await db.update(attendance).set({ status, method }).where(eq(attendance.id, existing[0].id));
      return Response.json({ ok: true, name: member.name, updated: true });
    }
    await db.insert(attendance).values({
      gymId: user.gymId,
      userId: member.userId,
      memberId: member.id,
      date: iso,
      checkIn: new Date(),
      status,
      method,
    });
    return Response.json({ ok: true, name: member.name });
  }

  if (trainerId) {
    const [trainer] = await db
      .select({ id: trainers.id, name: trainers.name, userId: trainers.userId })
      .from(trainers)
      .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, user.gymId)))
      .limit(1);
    if (!trainer) return Response.json({ error: "Trainer not found." }, { status: 404 });
    await db.insert(attendance).values({
      gymId: user.gymId,
      userId: trainer.userId,
      trainerId: trainer.id,
      date: iso,
      checkIn: new Date(),
      status,
      method,
    });
    return Response.json({ ok: true, name: trainer.name });
  }

  return Response.json({ error: "Provide a member code, member or trainer." }, { status: 400 });
}

/** Check-out support. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const attendanceId = toInt(body.attendanceId, 0);
  if (!attendanceId) return Response.json({ error: "attendanceId required" }, { status: 400 });

  const [row] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.id, attendanceId), eq(attendance.gymId, user.gymId)))
    .limit(1);
  if (!row) return Response.json({ error: "Attendance record not found" }, { status: 404 });
  if (user.role === "MEMBER" && row.userId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.update(attendance).set({ checkOut: new Date() }).where(eq(attendance.id, attendanceId));
  return Response.json({ ok: true });
}
