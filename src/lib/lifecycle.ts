import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendance,
  invoices,
  members,
  notificationRecipients,
  payments,
  subscriptions,
  trainerContracts,
  trainerMembers,
  trainers,
  users,
} from "@/db/schema";
import { storagePathFromUrl, isManagedUrl, deleteImage } from "./storage";

/** Deactivate / reactivate a member: blocks sign-in and flips the roster status. */
export async function setMemberActive(gymId: number, memberId: number, active: boolean) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.gymId, gymId), eq(members.id, memberId)))
    .limit(1);
  if (!member) throw new Error("Member not found in this gym.");

  const now = new Date();
  await db
    .update(members)
    .set({ status: active ? "ACTIVE" : "INACTIVE" })
    .where(eq(members.id, memberId));
  await db
    .update(users)
    .set({ status: active ? "ACTIVE" : "INACTIVE", deactivatedAt: active ? null : now, updatedAt: now })
    .where(eq(users.id, member.userId));

  if (!active) {
    // End active coaching assignments so the roster stays accurate.
    await db
      .update(trainerMembers)
      .set({ status: "ENDED", endedAt: now })
      .where(and(eq(trainerMembers.memberId, memberId), eq(trainerMembers.status, "ACTIVE")));
  }

  return { previous: member.status, status: active ? "ACTIVE" : "INACTIVE" };
}

/** Permanently removes a member and every record that belongs to them. */
export async function deleteMemberPermanently(gymId: number, memberId: number) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.gymId, gymId), eq(members.id, memberId)))
    .limit(1);
  if (!member) throw new Error("Member not found in this gym.");

  const [user] = await db.select().from(users).where(eq(users.id, member.userId)).limit(1);

  await db.transaction(async (tx) => {
    await tx.delete(notificationRecipients).where(eq(notificationRecipients.userId, member.userId));
    await tx.delete(attendance).where(eq(attendance.memberId, memberId));
    await tx.delete(payments).where(eq(payments.memberId, memberId));
    await tx.delete(invoices).where(eq(invoices.memberId, memberId));
    await tx.delete(subscriptions).where(eq(subscriptions.memberId, memberId));
    await tx.delete(trainerMembers).where(eq(trainerMembers.memberId, memberId));
    await tx.delete(members).where(eq(members.id, memberId));
    if (user) await tx.delete(users).where(eq(users.id, member.userId));
  });

  const photo = member.profileImage ?? user?.profileImage ?? null;
  if (photo && isManagedUrl(photo)) await deleteImage(storagePathFromUrl(photo));

  return { name: member.name, memberCode: member.memberCode };
}

/** Deactivate / reactivate a trainer; blocks sign-in and ends roster assignments. */
export async function setTrainerActive(gymId: number, trainerId: number, active: boolean) {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(and(eq(trainers.gymId, gymId), eq(trainers.id, trainerId)))
    .limit(1);
  if (!trainer) throw new Error("Trainer not found in this gym.");

  const now = new Date();
  await db.update(trainers).set({ status: active ? "ACTIVE" : "INACTIVE" }).where(eq(trainers.id, trainerId));
  await db
    .update(users)
    .set({ status: active ? "ACTIVE" : "INACTIVE", deactivatedAt: active ? null : now, updatedAt: now })
    .where(eq(users.id, trainer.userId));

  if (!active) {
    await db
      .update(trainerMembers)
      .set({ status: "ENDED", endedAt: now })
      .where(and(eq(trainerMembers.trainerId, trainerId), eq(trainerMembers.status, "ACTIVE")));
  }

  return { previous: trainer.status, status: active ? "ACTIVE" : "INACTIVE" };
}

/** Permanently removes a trainer. Members are only unassigned, never deleted. */
export async function deleteTrainerPermanently(gymId: number, trainerId: number) {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(and(eq(trainers.gymId, gymId), eq(trainers.id, trainerId)))
    .limit(1);
  if (!trainer) throw new Error("Trainer not found in this gym.");

  const [user] = await db.select().from(users).where(eq(users.id, trainer.userId)).limit(1);

  await db.transaction(async (tx) => {
    await tx.delete(notificationRecipients).where(eq(notificationRecipients.userId, trainer.userId));
    await tx.delete(attendance).where(eq(attendance.trainerId, trainerId));
    await tx.delete(trainerMembers).where(eq(trainerMembers.trainerId, trainerId));
    await tx.delete(trainerContracts).where(eq(trainerContracts.trainerId, trainerId));
    await tx.delete(trainers).where(eq(trainers.id, trainerId));
    if (user) await tx.delete(users).where(eq(users.id, trainer.userId));
  });

  const photo = trainer.profileImage ?? user?.profileImage ?? null;
  if (photo && isManagedUrl(photo)) await deleteImage(storagePathFromUrl(photo));

  return { name: trainer.name, trainerCode: trainer.trainerCode };
}

/** Updates the profile photo on all three records that can render an avatar. */
export async function updateAvatar(
  gymId: number,
  target: { kind: "member" | "trainer"; id: number },
  url: string,
) {
  const next = url.trim() ? url : null;
  if (target.kind === "member") {
    const [member] = await db
      .select({ id: members.id, userId: members.userId, profileImage: members.profileImage })
      .from(members)
      .where(and(eq(members.gymId, gymId), eq(members.id, target.id)))
      .limit(1);
    if (!member) throw new Error("Member not found in this gym.");
    await db.update(members).set({ profileImage: next }).where(eq(members.id, member.id));
    await db.update(users).set({ profileImage: next, updatedAt: new Date() }).where(eq(users.id, member.userId));
    if (next && member.profileImage && isManagedUrl(member.profileImage)) {
      await deleteImage(storagePathFromUrl(member.profileImage));
    }
    return { name: "member" };
  }

  const [trainer] = await db
    .select({ id: trainers.id, userId: trainers.userId, profileImage: trainers.profileImage })
    .from(trainers)
    .where(and(eq(trainers.gymId, gymId), eq(trainers.id, target.id)))
    .limit(1);
  if (!trainer) throw new Error("Trainer not found in this gym.");
  await db.update(trainers).set({ profileImage: next }).where(eq(trainers.id, trainer.id));
  await db.update(users).set({ profileImage: next, updatedAt: new Date() }).where(eq(users.id, trainer.userId));
  if (next && trainer.profileImage && isManagedUrl(trainer.profileImage)) {
    await deleteImage(storagePathFromUrl(trainer.profileImage));
  }
  return { name: "trainer" };
}
