import { notFound } from "next/navigation";
import { Activity, Check, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTrainerDashboard } from "@/lib/queries";
import { Avatar, DarkPanel, EmptyState, IconTile, MetricCard, Pill, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { CheckinStation } from "@/components/admin/CheckinStation";
import { ACCENT } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function TrainerMembersPage() {
  const user = await requireRole("TRAINER");
  if (!user.trainer) notFound();
  const { stats, roster } = await getTrainerDashboard(user.gymId, user.trainer.id, user.id);

  const ordered = [...roster].sort((a, b) => Number(b.present_today) - Number(a.present_today));
  const struggling = roster.filter((member) => member.visits < 8);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">My members</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Assigned roster with attendance health · scan a member QR to check them in</p>
        </div>
        <CheckinStation
          label="Scan & mark"
          fullScreenHref="/trainer/attendance/station"
          members={roster.map((member) => ({ id: member.id, name: member.name, memberCode: member.member_code }))}
          trainers={[{ id: user.trainer.id, name: user.name }]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard accent="cyan" label="Assigned" value={String(stats.assigned)} caption="Active members" icon={<Users size={16} />} />
        <MetricCard accent="sage" label="Present today" value={String(stats.checked_in)} caption="Checked in" icon={<Check size={16} />} />
        <MetricCard accent="blush" label="Need attention" value={String(struggling.length)} caption="Under 8 visits / month" icon={<Activity size={16} />} />
      </div>

      {ordered.length ? (
        <div className="space-y-3">
          {ordered.map((member) => (
            <DarkPanel key={member.id} className="flex flex-wrap items-center gap-4">
              <Avatar
                name={member.name}
                size={44}
                accent="lavender"
                src={member.profile_image}
                subtitle={`${member.member_code} · ${member.plan_name ?? "No plan"}`}
              />
              <div className="min-w-[170px] flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ghost">{member.name}</p>
                <p className="text-[11.5px] text-ghost-muted">
                  {member.member_code} · {member.plan_name ?? "—"}
                </p>
              </div>
              <div className="min-w-[150px]">
                <ProgressBar value={Math.min(100, (member.visits / 22) * 100)} accent={ACCENT.green} track="rgba(255,255,255,.08)" height={6} />
                <p className="mt-1.5 text-[11px] text-ghost-muted">{member.visits} visits in 30 days</p>
              </div>
              {member.amount_due > 0 ? <Pill tone="warning">₹{member.amount_due} due</Pill> : <Pill tone="positive">Paid</Pill>}
              <Pill tone={member.present_today ? "positive" : "neutral"}>{member.present_today ? "✓ Present" : "○ Missing"}</Pill>
            </DarkPanel>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Users size={22} />} title="No members assigned yet" message="Ask the admin desk to assign members to your roster." />
      )}

      <DarkPanel>
        <SectionHeading title="Coaching priorities" caption="Members with the lowest attendance" />
        <ul className="mt-4 space-y-2.5">
          {struggling.slice(0, 6).map((member) => (
            <li key={member.id} className="flex items-center justify-between rounded-card border border-white/7 bg-white/4 px-4 py-3">
              <div className="flex items-center gap-3">
                <IconTile accent="blush" size="sm">
                  <Activity size={14} />
                </IconTile>
                <div>
                  <p className="text-[12.5px] font-semibold text-ghost">{member.name}</p>
                  <p className="text-[11px] text-ghost-muted">Last 30 days · {member.visits} visits</p>
                </div>
              </div>
              <Pill tone="neutral">{member.visits} / 22 visits</Pill>
            </li>
          ))}
          {!struggling.length ? <li className="text-[12.5px] text-ghost-muted">Everyone is training consistently. 🎉</li> : null}
        </ul>
      </DarkPanel>
    </div>
  );
}
