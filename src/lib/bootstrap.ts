import { sql } from "drizzle-orm";
import { db } from "@/db";
import { gyms, users } from "@/db/schema";
import { hashPassword } from "./crypto";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "saumaydev@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "1234567890";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Saumay";

let ready = false;
let inflight: Promise<void> | null = null;

/**
 * First-run provisioning: creates the gym workspace and the owner account when the
 * database is empty. Idempotent, advisory-locked and safe to call on every request.
 */
export async function ensureBootstrap(): Promise<void> {
  if (ready) return;
  if (!inflight) inflight = runBootstrap();
  try {
    await inflight;
    ready = true;
  } catch (error) {
    inflight = null;
    throw error;
  }
}

async function runBootstrap(): Promise<void> {
  const existingGym = await db.select({ id: gyms.id }).from(gyms).limit(1);
  if (existingGym.length) {
    await ensureOwnerAccount(existingGym[0].id);
    return;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(551122)`);
    const [gym] = await tx
      .insert(gyms)
      .values({
        name: process.env.GYM_NAME ?? "My Gym",
        tagline: "Strength · Conditioning · Recovery",
        logoText: "GF",
        openingHours: "6:00 AM – 10:00 PM",
        currency: "INR",
        inactivityDays: 14,
        expiringThresholdDays: 7,
        reminderDays: [30, 15, 7, 3, 1],
      })
      .returning({ id: gyms.id });

    await tx.insert(users).values({
      gymId: gym.id,
      role: "ADMIN",
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(ADMIN_PASSWORD),
    });
  });
}

/** Guarantees the owner account exists even if the gym was provisioned earlier. */
async function ensureOwnerAccount(gymId: number) {
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${ADMIN_EMAIL}`)
    .limit(1);
  if (owner) return;

  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.gymId} = ${gymId} and ${users.role} = 'ADMIN'`)
    .limit(1);
  if (admin) {
    await db
      .update(users)
      .set({ email: ADMIN_EMAIL, passwordHash: hashPassword(ADMIN_PASSWORD) })
      .where(sql`${users.id} = ${admin.id}`);
    return;
  }

  await db.insert(users).values({
    gymId,
    role: "ADMIN",
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    passwordHash: hashPassword(ADMIN_PASSWORD),
  });
}

/** Exposed so the login screen can show the configured owner email without leaking the password. */
export function ownerEmail(): string {
  return ADMIN_EMAIL;
}
