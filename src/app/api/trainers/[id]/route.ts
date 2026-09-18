import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trainerContracts, trainers, users } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { encryptSecret, generateTempPassword, hashPassword } from "@/lib/crypto";
import { sanitize, toInt, writeAudit } from "@/lib/actions";
import { deleteTrainerPermanently, setTrainerActive, updateAvatar } from "@/lib/lifecycle";
import { parseScannedCode } from "@/lib/qr";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadTrainer(gymId: number, trainerId: number) {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(and(eq(trainers.gymId, gymId), eq(trainers.id, trainerId)))
    .limit(1);
  return trainer ?? null;
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const { id } = await params;
  const trainerId = Number.parseInt(id, 10);
  if (!Number.isFinite(trainerId)) return Response.json({ error: "Invalid trainer id" }, { status: 400 });

  const trainer = await loadTrainer(user.gymId, trainerId);
  if (!trainer) return Response.json({ error: "Trainer not found in this gym." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = sanitize(body.action);

  if (action === "deactivate" || action === "activate") {
    const result = await setTrainerActive(user.gymId, trainerId, action === "activate");
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: action === "activate" ? "ACTIVATE_TRAINER" : "DEACTIVATE_TRAINER",
      entityType: "TRAINER",
      entityId: trainerId,
      oldValue: { status: result.previous },
      newValue: { status: result.status },
    });
    return Response.json({ ok: true, status: result.status });
  }

  if (action === "avatar") {
    const url = sanitize(body.url);
    if (!url) {
      // Empty value clears the photo everywhere it is rendered.
      await updateAvatar(user.gymId, { kind: "trainer", id: trainerId }, "");
      await writeAudit({
        gymId: user.gymId,
        userId: user.id,
        action: "CLEAR_PHOTO",
        entityType: "TRAINER",
        entityId: trainerId,
      });
      return Response.json({ ok: true, url: null });
    }
    await updateAvatar(user.gymId, { kind: "trainer", id: trainerId }, url);
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE_PHOTO",
      entityType: "TRAINER",
      entityId: trainerId,
      newValue: { url },
    });
    return Response.json({ ok: true, url });
  }

  if (action === "reset-password") {
    const next = generateTempPassword();
    await db
      .update(users)
      .set({ passwordHash: hashPassword(next), passwordEnc: encryptSecret(next), updatedAt: new Date() })
      .where(eq(users.id, trainer.userId));
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "RESET_TRAINER_PASSWORD",
      entityType: "TRAINER",
      entityId: trainerId,
    });
    return Response.json({ ok: true, password: next });
  }

  if (action === "contract") {
    const [existing] = await db
      .select({ id: trainerContracts.id })
      .from(trainerContracts)
      .where(eq(trainerContracts.trainerId, trainerId))
      .limit(1);
    const values = {
      employmentType: sanitize(body.employmentType) || "FULL_TIME",
      salary: Math.max(0, toInt(body.salary, 0)),
      commissionPct: Math.max(0, toInt(body.commissionPct, 0)),
      workingHours: sanitize(body.workingHours) || "6 AM – 2 PM",
      contractEnd: sanitize(body.contractEnd) || null,
    };
    if (existing) {
      await db.update(trainerContracts).set(values).where(eq(trainerContracts.id, existing.id));
    } else {
      await db.insert(trainerContracts).values({ gymId: user.gymId, trainerId, joiningDate: trainer.joiningDate, ...values });
    }
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "TRAINER_CONTRACT",
      entityId: trainerId,
      newValue: values,
    });
    return Response.json({ ok: true });
  }

  if (action === "update") {
    const name = sanitize(body.name);
    if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
    const phone = sanitize(body.phone);
    await db
      .update(trainers)
      .set({
        name,
        phone: phone || null,
        specialization: sanitize(body.specialization) || null,
        experienceYears: Math.max(0, toInt(body.experienceYears, trainer.experienceYears)),
        bio: sanitize(body.bio) || null,
      })
      .where(eq(trainers.id, trainerId));
    await db.update(users).set({ name, phone: phone || null, updatedAt: new Date() }).where(eq(users.id, trainer.userId));
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "TRAINER",
      entityId: trainerId,
      oldValue: { name: trainer.name },
      newValue: { name },
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unsupported action." }, { status: 400 });
}

export async function DELETE(request: Request, { params }: Params) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const { id } = await params;
  const trainerId = Number.parseInt(id, 10);
  if (!Number.isFinite(trainerId)) return Response.json({ error: "Invalid trainer id" }, { status: 400 });

  const trainer = await loadTrainer(user.gymId, trainerId);
  if (!trainer) return Response.json({ error: "Trainer not found in this gym." }, { status: 404 });

  const url = new URL(request.url);
  const confirmation = parseScannedCode(url.searchParams.get("confirm") ?? "");
  if (confirmation !== trainer.trainerCode.toUpperCase()) {
    return Response.json({ error: "Type the trainer code to confirm permanent deletion." }, { status: 400 });
  }

  const removed = await deleteTrainerPermanently(user.gymId, trainerId);
  await writeAudit({
    gymId: user.gymId,
    userId: user.id,
    action: "DELETE_TRAINER",
    entityType: "TRAINER",
    entityId: trainerId,
    oldValue: { name: removed.name, trainerCode: removed.trainerCode },
  });
  return Response.json({ ok: true, deleted: removed.trainerCode });
}
