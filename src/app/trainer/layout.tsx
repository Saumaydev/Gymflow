import type { ReactNode } from "react";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { rows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("TRAINER");
  const unread = await rows<{ c: number }>(
    sql`select count(*)::int as c from notification_recipients where user_id = ${user.id} and read_at is null`,
  );

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: "TRAINER",
        gymName: user.gym.name,
        avatarUrl: user.profileImage,
        subtitle: `${user.trainer?.specialization ?? "Coach"} · ${user.trainer?.experienceYears ?? 0} years on the floor`,
      }}
      unread={unread[0]?.c ?? 0}
      notificationHref="/trainer"
    >
      {children}
    </AppShell>
  );
}
