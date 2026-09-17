import { notFound } from "next/navigation";
import { Activity, Flame, Timer } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMemberProfile } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, MetricCard, PastelCard, Pill, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { CircularGauge } from "@/components/ui/charts";
import { formatDate, formatTime } from "@/lib/format";
import { ACCENT } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function MemberAttendancePage() {
  const user = await requireRole("MEMBER");
  if (!user.member) notFound();
  const profile = await getMemberProfile(user.gymId, user.member.id);
  if (!profile) notFound();

  const { visits, attendanceRate, visitsLast30 } = profile;
  const visitMap = new Map(visits.map((visit) => [visit.date, visit]));
  const todayIso = new Date().toISOString().slice(0, 10);
  const streak = (() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      if (visitMap.has(day.toISOString().slice(0, 10))) count += 1;
      else if (i > 0) break;
    }
    return count;
  })();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Your attendance</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Check-ins, streaks and the days you showed up</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <PastelCard accent="cyan" hero className="flex flex-col items-center gap-5 py-8">
          <CircularGauge value={attendanceRate} size={196} stroke={16} accent="rgba(24,24,28,.78)" trackColor="rgba(24,24,28,.12)" />
          <div className="text-center">
            <p className="text-[13px] font-semibold text-pastel-ink/60">Monthly consistency</p>
            <p className="mt-1 text-[12.5px] text-pastel-ink/60">
              {visitsLast30} visits across 22 active days
            </p>
          </div>
        </PastelCard>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard accent="lavender" label="Visits" value={String(visits.length)} caption="Total logged sessions" icon={<Activity size={16} />} />
            <MetricCard accent="cream" label="Streak" value={`${streak}d`} caption="Consecutive days" icon={<Flame size={16} />} />
            <MetricCard accent="blush" label="Preferred slot" value="6–8 PM" caption="Based on check-in times" icon={<Timer size={16} />} />
          </div>

          <DarkPanel>
            <SectionHeading title="Check-in trail" caption="Most recent visits with method and duration" />
            <ul className="mt-4 space-y-2.5">
              {visits.slice(0, 8).map((visit) => {
                const inAt = visit.checkIn ? new Date(visit.checkIn).getTime() : Number.NaN;
                const outAt = visit.checkOut ? new Date(visit.checkOut).getTime() : Number.NaN;
                const duration = Number.isFinite(inAt) && Number.isFinite(outAt) ? Math.max(0, Math.round((outAt - inAt) / 60000)) : null;
                return (
                  <li key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <IconTile accent="sage" size="sm">
                        <Activity size={14} />
                      </IconTile>
                      <div>
                        <p className="text-[12.5px] font-semibold text-ghost">{formatDate(visit.date)}</p>
                        <p className="text-[11px] text-ghost-muted">
                          In {visit.checkIn ? formatTime(visit.checkIn) : "—"} · Out {visit.checkOut ? formatTime(visit.checkOut) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {duration ? <Pill tone="neutral">{duration} min</Pill> : null}
                      <StatusDot status={visit.status === "LATE" ? "EXPIRING" : "ACTIVE"} label={visit.method} />
                    </div>
                  </li>
                );
              })}
              {!visits.length ? <li className="text-[12.5px] text-ghost-muted">No check-ins yet — scan in at the entrance.</li> : null}
            </ul>
          </DarkPanel>
        </div>
      </div>

      <DarkPanel>
        <SectionHeading title="30 day calendar" caption="Pastel blocks mark the days you trained" />
        <div className="mt-5 grid grid-cols-7 gap-2 sm:grid-cols-10">
          {Array.from({ length: 30 }, (_, index) => {
            const day = new Date();
            day.setDate(day.getDate() - (29 - index));
            const key = day.toISOString().slice(0, 10);
            const visit = visitMap.get(key);
            return (
              <div
                key={key}
                className={`rounded-card p-2.5 text-center transition ${
                  visit
                    ? "bg-pastel-cyan text-pastel-ink"
                    : key === todayIso
                      ? "border border-accent-blue/50 bg-accent-blue/10 text-ghost"
                      : "border border-white/7 bg-white/4 text-ghost-muted"
                }`}
              >
                <p className="gf-num text-[13px] font-semibold">{day.getDate()}</p>
                <p className="text-[9.5px]">{visit ? "✓" : "—"}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <KeyValue label="Visits in 30 days" value={visitsLast30} mono />
          <KeyValue label="Consistency" value={`${attendanceRate}%`} mono />
          <KeyValue label="Membership" value={profile.current?.planName ?? "—"} />
        </div>
        <p className="mt-4 text-[11.5px] text-ghost-muted">
          Gym opens {user.gym.openingHours ?? "5:30 AM – 10:30 PM"} · show your check-in QR at the entrance or use app check-in.
        </p>
      </DarkPanel>
    </div>
  );
}
