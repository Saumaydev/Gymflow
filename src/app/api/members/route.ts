import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, members, membershipPlans, payments, subscriptions, trainerMembers, trainers, users } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { generateTempPassword, hashPassword } from "@/lib/crypto";
import { toISODate, today } from "@/lib/format";
import { nextMemberCode, nextReceiptNumber, planEndDate, sanitize, subscriptionStatusFor, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const name = sanitize(body.name);
  const phone = sanitize(body.phone);
  const email = sanitize(body.email).toLowerCase();
  const planId = toInt(body.planId, 0);
  if (!name || !email || !planId) {
    return Response.json({ error: "Name, email and a membership plan are required." }, { status: 400 });
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return Response.json({ error: "That email already has an account." }, { status: 409 });

  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, user.gymId)))
    .limit(1);
  if (!plan) return Response.json({ error: "Membership plan not found." }, { status: 404 });

  const password = sanitize(body.password) || generateTempPassword();
  const discount = Math.max(0, toInt(body.discount, 0));
  const total = Math.max(0, plan.price - discount);
  const paid = Math.max(0, Math.min(total, toInt(body.paid, 0)));
  const due = Math.max(0, total - paid);
  const startDate = sanitize(body.startDate) || toISODate(today());
  const endDate = planEndDate(startDate, plan.durationDays);
  const memberCode = await nextMemberCode();

  const [createdUser] = await db
    .insert(users)
    .values({
      gymId: user.gymId,
      role: "MEMBER",
      name,
      email,
      phone: phone || null,
      passwordHash: hashPassword(password),
    })
    .returning();

  const [member] = await db
    .insert(members)
    .values({
      gymId: user.gymId,
      userId: createdUser.id,
      memberCode,
      name,
      phone: phone || null,
      email,
      dob: sanitize(body.dob) || null,
      gender: sanitize(body.gender) || null,
      address: sanitize(body.address) || null,
      emergencyContact: sanitize(body.emergencyContact) || null,
      joiningDate: startDate,
      status: "ACTIVE",
    })
    .returning();

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      gymId: user.gymId,
      memberId: member.id,
      planId: plan.id,
      startDate,
      endDate,
      price: plan.price,
      discount,
      amountPaid: paid,
      amountDue: due,
      status: subscriptionStatusFor({ startDate, endDate, amountPaid: paid, amountDue: due }),
    })
    .returning();

  await db.insert(invoices).values({
    gymId: user.gymId,
    memberId: member.id,
    subscriptionId: subscription.id,
    invoiceNumber: `INV-${9000 + subscription.id}`,
    totalAmount: total,
    paidAmount: paid,
    dueAmount: due,
    status: due === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
    dueDate: endDate,
  });

  let receiptNumber: string | null = null;
  if (paid > 0) {
    receiptNumber = await nextReceiptNumber();
    await db.insert(payments).values({
      gymId: user.gymId,
      memberId: member.id,
      subscriptionId: subscription.id,
      amount: paid,
      method: (sanitize(body.method) || "UPI") as "UPI" | "CASH" | "CARD" | "NETBANKING" | "OTHER",
      paymentDate: new Date(),
      receiptNumber,
      notes: sanitize(body.notes) || "Initial membership payment",
      createdBy: user.id,
    });
  }

  const trainerId = toInt(body.trainerId, 0);
  if (trainerId) {
    const [trainer] = await db
      .select({ id: trainers.id })
      .from(trainers)
      .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, user.gymId)))
      .limit(1);
    if (trainer) {
      await db.insert(trainerMembers).values({ gymId: user.gymId, trainerId: trainer.id, memberId: member.id, status: "ACTIVE" });
    }
  }

  await writeAudit({
    gymId: user.gymId,
    userId: user.id,
    action: "CREATE",
    entityType: "MEMBER",
    entityId: member.id,
    newValue: { name, memberCode, plan: plan.name, paid, due },
  });

  return Response.json({
    ok: true,
    member: { id: member.id, name: member.name, memberCode, email, password, plan: plan.name, paid, due },
    receiptNumber,
  });
}
