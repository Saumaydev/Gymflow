import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, CalendarClock, Check, Dumbbell, Sparkles, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTrainerDashboard, listNotifications } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, MetricCard, PastelCard, Pill, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { MiniChart } from "@/components/ui/charts";
import { formatDate, formatTime } from "@/lib/format";
import { ACCENT } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function TrainerDashboard() {
  const user = await requireRole("TRAINER");
  if (!user.trainer) notFound();
  const [data, notifications] = await Promise.all([
    getTrainerDashboard(user.gymId, user.trainer.id, user.id),
    listNotifications(user.gymId),
  ]);

  const { stats, roster, weekTrend, own } = data;
  const todayIso = new Date().toISOString().slice(0, 10);
  const presentToday = roster.filter((member) => member.present_today);
  const pending = roster.filter((member) => !member.present_today);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ghost-muted">{user.gym.name} · {user.trainer.trainerCode}</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-ghost sm:text-[34px]">
            Hello {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-[13.5px] text-ghost-dim">Good morning! {presentToday.length} of your members are already in today.</p>
        </div>
        <Link href="/trainer/members" className="inline-flex h-11 items-center gap-2 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink">
          <Users size={15} /> My members
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard accent="cyan" label="Assigned Members" value={String(stats.assigned)} caption="Active coaching roster" icon={<Users size={16} />} href="/trainer/members" />
        <MetricCard accent="sage" label="Checked In" value={String(stats.checked_in)} caption="Today" icon={<Check size={16} />} href="/trainer/attendance" />
        <MetricCard accent="lavender" label="Attendance" value={`${stats.rate}%`} caption="Your own punctuality" icon={<Activity size={16} />} href="/trainer/attendance" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <PastelCard accent="lavender" hero>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Today’s floor</p>
              <p className="gf-num mt-3 text-[40px] font-semibold leading-none">
                {presentToday.length}
                <span className="text-[18px] font-medium text-pastel-ink/50">/{roster.length}</span>
              </p>
              <p className="mt-2 text-[12.5px] font-semibold text-pastel-ink/60">members checked in</p>
            </div>
            <div className="text-right">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Next session block</p>
              <p className="mt-1 text-[15px] font-semibold">6 AM – 2 PM shift</p>
              <p className="mt-1 text-[11.5px] text-pastel-ink/60">Peak 6–8 PM</p>
            </div>
          </div>
          <div className="mt-6">
            <ProgressBar value={roster.length ? (presentToday.length / roster.length) * 100 : 0} accent="rgba(24,24,28,.78)" track="rgba(24,24,28,.12)" height={10} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Present", value: stats.present },
              { label: "Late", value: stats.late },
              { label: "Absent", value: stats.absent },
            ].map((stat) => (
              <div key={stat.label} className="rounded-card bg-white/60 px-2 py-3">
                <p className="gf-num text-[16px] font-semibold">{stat.value}</p>
                <p className="text-[10.5px] font-semibold text-pastel-ink/55">{stat.label}</p>
              </div>
            ))}
          </div>
        </PastelCard>

        <DarkPanel>
          <SectionHeading title="Roster activity" caption="Last 14 days" />
          <div className="mt-5 h-32">
            <MiniChart data={weekTrend.map((day) => day.visits)} accent={ACCENT.cyan} height={128} />
          </div>
          <div className="mt-5 grid gap-4">
            <KeyValue label="Sessions this fortnight" value={String(weekTrend.reduce((sum, day) => sum + day.visits, 0))} mono />
            <KeyValue label="Specialisation" value={user.trainer.specialization ?? "Coach"} />
            <KeyValue label="Experience" value={`${user.trainer.experienceYears} years`} />
          </div>
        </DarkPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <DarkPanel className="xl:col-span-2">
          <SectionHeading
            title="Member status"
            caption="Who is in and who is missing"
            action={
              <Link href="/trainer/members" className="text-[12px] font-semibold text-ghost-dim hover:text-ghost">
                Manage
              </Link>
            }
          />
          <ul className="mt-4 space-y-2.5">
            {roster.slice(0, 10).map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                <div className="flex items-center gap-3">
                  <IconTile accent={member.present_today ? "sage" : "lavender"} size="sm">
                    <Users size={14} />
                  </IconTile>
                  <div>
                    <p className="text-[13px] font-semibold text-ghost">{member.name}</p>
                    <p className="text-[11px] text-ghost-muted">
                      {member.member_code} · {member.plan_name ?? "—"} · {member.visits} visits
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {member.amount_due > 0 ? <Pill tone="warning">₹{member.amount_due} due</Pill> : null}
                  <Pill tone={member.present_today ? "positive" : "neutral"}>
                    {member.present_today ? "✓ Present" : "○ Not checked in"}
                  </Pill>
                </div>
              </li>
            ))}
          </ul>
        </DarkPanel>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Your attendance" caption="Own check-ins" />
            <ul className="mt-4 space-y-2.5">
              {own.slice(0, 6).map((row) => (
                <li key={row.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ghost-dim">{formatDate(row.date)}</span>
                  <span className="text-ghost-muted">
                    {row.checkIn ? formatTime(row.checkIn) : "—"} → {row.checkOut ? formatTime(row.checkOut) : "—"}
                  </span>
                  <Pill tone={row.status === "LATE" ? "warning" : "positive"}>{row.status}</Pill>
                </li>
              ))}
              {!own.length ? <li className="text-[12.5px] text-ghost-muted">No check-ins recorded.</li> : null}
            </ul>
            <Link href="/trainer/attendance" className="mt-4 inline-flex h-10 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[12px] font-semibold text-ghost-dim hover:bg-white/10">
              <CalendarClock size={14} /> Attendance log
            </Link>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Gym announcements" caption="Latest from the front desk" />
            <ul className="mt-4 space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <li key={notification.id} className="rounded-card border border-white/7 bg-white/4 p-4">
                  <p className="text-[12.5px] font-semibold text-ghost">{notification.title}</p>
                  <p className="mt-1 text-[11.5px] text-ghost-muted">{notification.message.slice(0, 120)}</p>
                  <p className="mt-2 text-[11px] text-ghost-muted">{formatDate(notification.createdAt)}</p>
                </li>
              ))}
            </ul>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Coaching checklist" caption="Suggested focus" />
            <ul className="mt-4 space-y-2.5">
              {[
                { icon: Dumbbell, text: "Review programming for members with under 8 visits this month." },
                { icon: Sparkles, text: `${pending.length} members have not checked in today — nudge them.` },
                { icon: Activity, text: "Log your own check-out to keep attendance accurate." },
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3 rounded-card border border-white/7 bg-white/4 p-4">
                  <IconTile accent="cream" size="sm">
                    <item.icon size={14} />
                  </IconTile>
                  <p className="text-[11.5px] text-ghost-muted">{item.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-ghost-muted">Today is {formatDate(todayIso)}</p>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
