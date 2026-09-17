import { db } from "@/db";
import { membershipPlans } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { sanitize, toInt, writeAudit } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const body = (await request.json()) as Record<string, unknown>;
  const name = sanitize(body.name);
  const price = toInt(body.price, 0);
  const durationDays = toInt(body.durationDays, 30);
  if (!name || price <= 0) return Response.json({ error: "Plan name and price are required." }, { status: 400 });

  const features = sanitize(body.features)
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const [plan] = await db
    .insert(membershipPlans)
    .values({
      gymId: user.gymId,
      name,
      description: sanitize(body.description) || null,
      durationDays,
      price,
      features,
      accent: sanitize(body.accent) || "cyan",
      status: "ACTIVE",
    })
    .returning();

  await writeAudit({ gymId: user.gymId, userId: user.id, action: "CREATE", entityType: "MEMBERSHIP_PLAN", entityId: plan.id, newValue: { name, price, durationDays } });
  return Response.json({ ok: true, plan });
}
