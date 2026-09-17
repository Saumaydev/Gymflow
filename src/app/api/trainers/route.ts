import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trainerContracts, trainers, users } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { generateTempPassword, hashPassword } from "@/lib/crypto";
import { toISODate, today } from "@/lib/format";
import { sanitize, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const name = sanitize(body.name);
  const email = sanitize(body.email).toLowerCase();
  const phone = sanitize(body.phone);
  if (!name || !email) return Response.json({ error: "Name and email are required." }, { status: 400 });

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return Response.json({ error: "That email already has an account." }, { status: 409 });

  const password = sanitize(body.password) || generateTempPassword();
  const [createdUser] = await db
    .insert(users)
    .values({ gymId: user.gymId, role: "TRAINER", name, email, phone: phone || null, passwordHash: hashPassword(password) })
    .returning();

  const code = `TR${2000 + createdUser.id}`;
  const joiningDate = sanitize(body.joiningDate) || toISODate(today());

  const [trainer] = await db
    .insert(trainers)
    .values({
      gymId: user.gymId,
      userId: createdUser.id,
      trainerCode: code,
      name,
      phone: phone || null,
      email,
      specialization: sanitize(body.specialization) || "Strength Coach",
      experienceYears: Math.max(0, toInt(body.experienceYears, 1)),
      bio: sanitize(body.bio) || null,
      joiningDate,
    })
    .returning();

  await db.insert(trainerContracts).values({
    gymId: user.gymId,
    trainerId: trainer.id,
    employmentType: sanitize(body.employmentType) || "FULL_TIME",
    salary: Math.max(0, toInt(body.salary, 30000)),
    commissionPct: Math.max(0, toInt(body.commissionPct, 10)),
    joiningDate,
    contractEnd: sanitize(body.contractEnd) || null,
    workingHours: sanitize(body.workingHours) || "6 AM – 2 PM",
    status: "ACTIVE",
  });

  await writeAudit({
    gymId: user.gymId,
    userId: user.id,
    action: "CREATE",
    entityType: "TRAINER",
    entityId: trainer.id,
    newValue: { name, code, email },
  });

  return Response.json({ ok: true, trainer: { id: trainer.id, name, code, email, password } });
}
