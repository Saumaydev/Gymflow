import type { ReactNode } from "react";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { rows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const unread = await rows<{ c: number }>(
    sql`select count(*)::int as c from notification_recipients where user_id = ${admin.id} and read_at is null`,
  );

  return (
    <AppShell
      user={{
        name: admin.name,
        email: admin.email,
        role: "ADMIN",
        gymName: admin.gym.name,
        avatarUrl: admin.profileImage,
        subtitle: `${admin.gym.expiringThresholdDays}-day expiry alerts · ${admin.gym.inactivityDays}-day inactivity watch`,
      }}
      unread={unread[0]?.c ?? 0}
      notificationHref="/admin/communication"
    >
      {children}
    </AppShell>
  );
}
