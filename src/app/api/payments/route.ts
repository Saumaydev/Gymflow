import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { members, payments, subscriptions } from "@/db/schema";
import { getCurrentUser, guardAdmin } from "@/lib/auth";
import { applyPaymentToSubscription, nextReceiptNumber, sanitize, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const subscriptionId = toInt(body.subscriptionId, 0);
  const memberId = toInt(body.memberId, 0);
  const amount = toInt(body.amount, 0);
  const method = (sanitize(body.method) || "UPI") as "UPI" | "CASH" | "CARD" | "NETBANKING" | "OTHER";
  const notes = sanitize(body.notes);
  const paymentDateRaw = sanitize(body.paymentDate);

  if (amount <= 0) return Response.json({ error: "Enter an amount greater than zero." }, { status: 400 });
  if (!memberId) return Response.json({ error: "Select a member." }, { status: 400 });

  const [member] = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.gymId, user.gymId)))
    .limit(1);
  if (!member) return Response.json({ error: "Member not found in this gym." }, { status: 404 });

  let targetSubscriptionId = subscriptionId || null;
  if (!targetSubscriptionId) {
    const [active] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.memberId, member.id), eq(subscriptions.gymId, user.gymId)))
      .orderBy(subscriptions.endDate)
      .limit(1);
    targetSubscriptionId = active?.id ?? null;
  }

  const receiptNumber = await nextReceiptNumber();
  const [payment] = await db
    .insert(payments)
    .values({
      gymId: user.gymId,
      memberId: member.id,
      subscriptionId: targetSubscriptionId,
      amount,
      method,
      paymentDate: paymentDateRaw ? new Date(paymentDateRaw) : new Date(),
      receiptNumber,
      notes: notes || "Membership payment",
      createdBy: user.id,
    })
    .returning();

  let state: string | null = null;
  if (targetSubscriptionId) {
    const applied = await applyPaymentToSubscription(targetSubscriptionId, amount);
    state = applied?.state ?? null;
  }

  await writeAudit({
    gymId: user.gymId,
    userId: user.id,
    action: "RECORD_PAYMENT",
    entityType: "PAYMENT",
    entityId: payment.id,
    newValue: { amount, method, receiptNumber, member: member.name },
  });

  return Response.json({ ok: true, paymentId: payment.id, receiptNumber, state });
}

/** Member self-service: read own payments. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (user.role !== "MEMBER" || !user.member) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const list = await db
    .select()
    .from(payments)
    .where(and(eq(payments.gymId, user.gymId), eq(payments.memberId, user.member.id)))
    .orderBy(payments.paymentDate);
  return Response.json({ ok: true, payments: list });
}
