import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, invoices, payments, subscriptions } from "@/db/schema";
import { addDays, daysBetween, today } from "./format";

export type SubscriptionStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "CANCELLED" | "COMPLETED";

/** Rules from PRD §103-§104 */
export function subscriptionStatusFor(input: {
  startDate: string;
  endDate: string;
  amountPaid: number;
  amountDue: number;
  thresholdDays?: number;
  cancelled?: boolean;
}): SubscriptionStatus {
  const now = today();
  const start = new Date(`${input.startDate}T12:00:00Z`);
  const end = new Date(`${input.endDate}T12:00:00Z`);
  if (input.cancelled) return "CANCELLED";
  if (end < now) return "EXPIRED";
  const daysLeft = daysBetween(now, end);
  if (daysLeft <= (input.thresholdDays ?? 7)) return "EXPIRING";
  if (start > now) return "ACTIVE";
  return "ACTIVE";
}

export function paymentState(total: number, paid: number): "PAID" | "PARTIAL" | "PENDING" {
  if (paid <= 0) return "PENDING";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}

export async function nextReceiptNumber(): Promise<string> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(payments);
  const seq = 5000 + (row?.count ?? 0) + 1;
  return `GF-${seq}`;
}

export async function nextMemberCode(): Promise<string> {
  const result = await db.execute(sql`select coalesce(max(id), 0)::int as max_id from members`);
  const rows = (result as unknown as { rows: { max_id: number }[] }).rows;
  return `GM${1000 + (rows[0]?.max_id ?? 0) + 1}`;
}

export async function writeAudit(input: {
  gymId: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await db.insert(auditLogs).values({
    gymId: input.gymId,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    oldValue: (input.oldValue ?? null) as never,
    newValue: (input.newValue ?? null) as never,
  });
}

/** Recomputes a subscription + its invoice after a payment is recorded. */
export async function applyPaymentToSubscription(subscriptionId: number, increment: number) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub) return null;
  const total = sub.price - sub.discount;
  const amountPaid = Math.min(total, sub.amountPaid + increment);
  const amountDue = Math.max(0, total - amountPaid);
  const status = subscriptionStatusFor({ startDate: sub.startDate, endDate: sub.endDate, amountPaid, amountDue });

  await db.update(subscriptions).set({ amountPaid, amountDue, status }).where(eq(subscriptions.id, subscriptionId));

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.subscriptionId, subscriptionId), eq(invoices.gymId, sub.gymId)))
    .limit(1);
  const state = paymentState(total, amountPaid);
  if (invoice) {
    await db
      .update(invoices)
      .set({ paidAmount: amountPaid, dueAmount: amountDue, status: amountDue > 0 && new Date(sub.endDate) < today() ? "OVERDUE" : state })
      .where(eq(invoices.id, invoice.id));
  }
  return { subscription: { ...sub, amountPaid, amountDue, status }, state };
}

export function planEndDate(startDate: string, durationDays: number): string {
  const start = new Date(`${startDate}T12:00:00Z`);
  return new Date(addDays(start, durationDays).getTime()).toISOString().slice(0, 10);
}

export function sanitize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toInt(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
