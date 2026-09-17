import type { ReactNode } from "react";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { rows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("MEMBER");
  const unread = await rows<{ c: number }>(
    sql`select count(*)::int as c from notification_recipients where user_id = ${user.id} and read_at is null`,
  );

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: "MEMBER",
        gymName: user.gym.name,
        subtitle: `Member ${user.member?.memberCode ?? ""} · membership updates land here first`,
      }}
      unread={unread[0]?.c ?? 0}
      notificationHref="/member/notifications"
    >
      {children}
    </AppShell>
  );
}
