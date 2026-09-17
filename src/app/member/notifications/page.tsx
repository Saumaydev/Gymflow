import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getMemberNotifications } from "@/lib/queries";
import { NotificationList } from "@/components/member/NotificationList";
import { DarkPanel, SectionHeading } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function MemberNotificationsPage() {
  const user = await requireRole("MEMBER");
  if (!user.member) notFound();
  const notifications = await getMemberNotifications(user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Notifications</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Membership reminders, payments, holidays and gym announcements</p>
      </div>

      <NotificationList items={notifications} />

      <DarkPanel>
        <SectionHeading title="Automated reminders" caption="Expiry nudges sent to you automatically" />
        <div className="mt-4 flex flex-wrap gap-2">
          {(user.gym.reminderDays ?? [30, 15, 7, 3, 1]).map((day) => (
            <span key={day} className="rounded-pill border border-white/8 bg-white/5 px-3 py-1.5 text-[11.5px] text-ghost-dim">
              {day} days before expiry
            </span>
          ))}
        </div>
      </DarkPanel>
    </div>
  );
}
