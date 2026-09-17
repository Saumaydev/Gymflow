import { notFound } from "next/navigation";
import { Activity, Clock, UserCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTrainerDashboard } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, MetricCard, PastelCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { BarChart, CircularGauge } from "@/components/ui/charts";
import { MarkAttendancePanel } from "@/components/admin/forms";
import { formatDate, formatTime } from "@/lib/format";
import { ACCENT } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function TrainerAttendancePage() {
  const user = await requireRole("TRAINER");
  if (!user.trainer) notFound();
  const data = await getTrainerDashboard(user.gymId, user.trainer.id, user.id);
  const { stats, weekTrend, own, roster } = data;

  const hours = own.map((row) => {
    const inAt = row.checkIn ? new Date(row.checkIn).getTime() : Number.NaN;
    const outAt = row.checkOut ? new Date(row.checkOut).getTime() : Number.NaN;
    return Number.isFinite(inAt) && Number.isFinite(outAt) ? Math.max(0, (outAt - inAt) / 3_600_000) : 0;
  });
  const averageHours = hours.length ? hours.reduce((sum, value) => sum + value, 0) / hours.length : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Attendance</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Your own log and today’s roster check-ins</p>
        </div>
        <MarkAttendancePanel
          label="Scan a member pass"
          fullScreenHref="/trainer/attendance/station"
          members={roster.map((member) => ({ id: member.id, name: member.name, memberCode: member.member_code }))}
          trainers={[{ id: user.trainer.id, name: user.name }]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard accent="cyan" label="Present" value={String(stats.present)} caption="Days in 30" icon={<UserCheck size={16} />} />
        <MetricCard accent="lavender" label="Late" value={String(stats.late)} caption="Days logged late" icon={<Clock size={16} />} />
        <MetricCard accent="cream" label="Attendance" value={`${stats.rate}%`} caption="Punctuality score" icon={<Activity size={16} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <PastelCard accent="cyan" hero className="flex flex-col items-center gap-5 py-8">
          <CircularGauge value={stats.rate} size={190} stroke={16} accent="rgba(24,24,28,.78)" trackColor="rgba(24,24,28,.12)" />
          <div className="text-center">
            <p className="text-[13px] font-semibold text-pastel-ink/60">
              {stats.present} present · {stats.absent} absent · {stats.late} late
            </p>
            <p className="mt-1 text-[12px] text-pastel-ink/55">Average shift {averageHours.toFixed(1)} hours</p>
          </div>
        </PastelCard>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Roster sessions" caption="Your members’ check-ins over 14 days" />
            <div className="mt-6">
              <BarChart data={weekTrend.map((day) => ({ label: day.day.slice(8), value: day.visits }))} accent={ACCENT.cyan} height={180} />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Own check-ins" caption="Most recent first" />
            <ul className="mt-4 space-y-2.5">
              {own.slice(0, 10).map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IconTile accent="sage" size="sm">
                      <Clock size={14} />
                    </IconTile>
                    <div>
                      <p className="text-[12.5px] font-semibold text-ghost">{formatDate(row.date)}</p>
                      <p className="text-[11px] text-ghost-muted">
                        In {row.checkIn ? formatTime(row.checkIn) : "—"} · Out {row.checkOut ? formatTime(row.checkOut) : "—"}
                      </p>
                    </div>
                  </div>
                  <Pill tone={row.status === "LATE" ? "warning" : "positive"}>{row.status}</Pill>
                </li>
              ))}
              {!own.length ? <li className="text-[12.5px] text-ghost-muted">No attendance logged for you yet.</li> : null}
            </ul>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Members on your roster today" caption={`${stats.checked_in} checked in of ${stats.assigned}`} />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {roster.slice(0, 12).map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-card border border-white/7 bg-white/4 px-4 py-2.5">
                  <span className="truncate text-[12.5px] text-ghost">{member.name}</span>
                  <Pill tone={member.present_today ? "positive" : "neutral"}>{member.present_today ? "✓" : "○"}</Pill>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <KeyValue label="Shift" value="6 AM – 2 PM" />
              <KeyValue label="Sessions scheduled" value={String(stats.assigned)} mono />
            </div>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
