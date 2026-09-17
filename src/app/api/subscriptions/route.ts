import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, membershipPlans, subscriptions } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { addDays, toISODate, today } from "@/lib/format";
import { planEndDate, sanitize, subscriptionStatusFor, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

/** Subscription lifecycle actions (PRD §39). */
export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const action = sanitize(body.action);
  const subscriptionId = toInt(body.subscriptionId, 0);
  if (!subscriptionId) return Response.json({ error: "subscriptionId required" }, { status: 400 });

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.gymId, user.gymId)))
    .limit(1);
  if (!sub) return Response.json({ error: "Subscription not found." }, { status: 404 });

  if (action === "renew" || action === "upgrade" || action === "downgrade") {
    const planId = toInt(body.planId, sub.planId);
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, user.gymId)))
      .limit(1);
    if (!plan) return Response.json({ error: "Plan not found." }, { status: 404 });

    const startDate = toISODate(today());
    const endDate = planEndDate(startDate, plan.durationDays);
    const discount = Math.max(0, toInt(body.discount, 0));
    const total = Math.max(0, plan.price - discount);
    const paid = Math.max(0, Math.min(total, toInt(body.paid, 0)));

    const [created] = await db
      .insert(subscriptions)
      .values({
        gymId: user.gymId,
        memberId: sub.memberId,
        planId: plan.id,
        startDate,
        endDate,
        price: plan.price,
        discount,
        amountPaid: paid,
        amountDue: total - paid,
        status: subscriptionStatusFor({ startDate, endDate, amountPaid: paid, amountDue: total - paid }),
        renewedFromId: sub.id,
      })
      .returning({ id: subscriptions.id });

    await db.insert(invoices).values({
      gymId: user.gymId,
      memberId: sub.memberId,
      subscriptionId: created.id,
      invoiceNumber: `INV-${9000 + created.id}`,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: total - paid,
      status: total - paid === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
      dueDate: endDate,
    });

    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: action.toUpperCase(),
      entityType: "SUBSCRIPTION",
      entityId: created.id,
      oldValue: { plan: sub.planId, endDate: sub.endDate },
      newValue: { plan: plan.name, endDate, paid },
    });

    return Response.json({ ok: true, subscriptionId: created.id, endDate, status: "ACTIVE" });
  }

  if (action === "extend") {
    const days = Math.max(1, toInt(body.days, 7));
    const base = new Date(`${sub.endDate}T12:00:00Z`) > today() ? new Date(`${sub.endDate}T12:00:00Z`) : today();
    const endDate = toISODate(addDays(base, days));
    const status = subscriptionStatusFor({
      startDate: sub.startDate,
      endDate,
      amountPaid: sub.amountPaid,
      amountDue: sub.amountDue,
    });
    await db.update(subscriptions).set({ endDate, status }).where(eq(subscriptions.id, sub.id));
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "EXTEND",
      entityType: "SUBSCRIPTION",
      entityId: sub.id,
      oldValue: { endDate: sub.endDate },
      newValue: { endDate, days },
    });
    return Response.json({ ok: true, endDate, status });
  }

  if (action === "cancel") {
    await db.update(subscriptions).set({ status: "CANCELLED" }).where(eq(subscriptions.id, sub.id));
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "CANCEL",
      entityType: "SUBSCRIPTION",
      entityId: sub.id,
      oldValue: { status: sub.status },
      newValue: { status: "CANCELLED" },
    });
    return Response.json({ ok: true, status: "CANCELLED" });
  }

  return Response.json({ error: "Unsupported action." }, { status: 400 });
}
