import Link from "next/link";
import { Activity, Clock, Download, Fingerprint, QrCode, UserCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAttendanceOverview, membersForPicker, trainersForPicker } from "@/lib/queries";
import { DarkPanel, EmptyState, GlassLink, IconTile, KeyValue, MetricCard, Pill, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { BarChart, CircularGauge, DonutChart } from "@/components/ui/charts";
import { MarkAttendancePanel } from "@/components/admin/forms";
import { formatTime, inr, num } from "@/lib/format";
import { ACCENT, pastelFor, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const admin = await requireAdmin();
  const [overview, members, trainers] = await Promise.all([
    getAttendanceOverview(admin.gymId),
    membersForPicker(admin.gymId),
    trainersForPicker(admin.gymId),
  ]);

  const notCheckedIn = Math.max(0, overview.active - overview.presentToday);
  const maxVisits = Math.max(1, ...overview.calendar.map((day) => day.visits));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Attendance</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Member and trainer check-ins · QR, app and manual entry</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/reports"
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost-dim hover:bg-white/10"
          >
            <Download size={15} /> Reports
          </Link>
          <GlassLink href="/admin/attendance/station" target="_blank" rel="noreferrer">
            <QrCode size={15} /> Entrance station
          </GlassLink>
          <MarkAttendancePanel
            label="Scan a pass"
            members={members.map((m) => ({ id: m.id, name: m.name, memberCode: m.code }))}
            trainers={trainers.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <DarkPanel elevated className="flex flex-col items-center justify-center gap-6 py-8">
          <SectionHeading className="w-full" title="Today’s attendance" caption={`${overview.presentToday} present · ${notCheckedIn} not checked in`} />
          <CircularGauge value={overview.rate} size={208} stroke={16} accent={ACCENT.cyan} trackColor="rgba(255,255,255,.08)" textColor="#F7F7F4" sublabel={`${overview.presentToday} / ${overview.roster} members`} />
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <div className="rounded-card bg-pastel-sage p-4 text-pastel-ink">
              <p className="text-[11.5px] font-semibold text-pastel-ink/60">Present</p>
              <p className="gf-num mt-1 text-[20px] font-semibold">{num(overview.presentToday)}</p>
            </div>
            <div className="rounded-card bg-pastel-blush p-4 text-pastel-ink">
              <p className="text-[11.5px] font-semibold text-pastel-ink/60">Not in yet</p>
              <p className="gf-num mt-1 text-[20px] font-semibold">{num(notCheckedIn)}</p>
            </div>
            <div className="rounded-card bg-pastel-lavender p-4 text-pastel-ink">
              <p className="text-[11.5px] font-semibold text-pastel-ink/60">Peak</p>
              <p className="mt-1 text-[15px] font-semibold">6–8 PM</p>
            </div>
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard accent="cyan" label="Visits (30 days)" value={num(overview.calendar.reduce((sum, day) => sum + day.visits, 0))} caption="Total check-ins" icon={<Activity size={16} />} />
            <MetricCard accent="lavender" label="Daily average" value={String(Math.round(overview.calendar.reduce((sum, day) => sum + day.visits, 0) / 30))} caption="Per day" icon={<Clock size={16} />} />
            <MetricCard accent="cream" label="QR share" value={`${Math.round(((overview.methodMix.find((m) => m.method === "QR")?.c ?? 0) / Math.max(1, overview.methodMix.reduce((sum, m) => sum + m.c, 0))) * 100)}%`} caption="Entrance scanner" icon={<QrCode size={16} />} />
          </div>

          <DarkPanel>
            <SectionHeading title="30 day calendar" caption="Visits per day — deeper pastels mean busier days" />
            <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-10">
              {overview.calendar.map((day) => {
                const intensity = day.visits / maxVisits;
                return (
                  <div
                    key={day.date}
                    className="rounded-card border border-white/7 p-2 text-center"
                    style={{
                      background: `rgba(201, 237, 240, ${0.08 + intensity * 0.7})`,
                      color: intensity > 0.5 ? "#18181C" : "#A6A6AE",
                    }}
                    title={`${day.date}: ${day.visits} visits`}
                  >
                    <p className="gf-num text-[13px] font-semibold">{day.date.slice(8)}</p>
                    <p className="text-[9.5px]">{day.visits}</p>
                  </div>
                );
              })}
            </div>
          </DarkPanel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <DarkPanel>
          <SectionHeading title="Peak hours" caption="Check-in distribution across the day" />
          <div className="mt-6">
            <BarChart
              data={overview.peak.map((hour) => ({ label: `${hour.hour}h`, value: hour.value }))}
              accent={ACCENT.purple}
              height={190}
              formatValue={(value) => `${value} visits`}
            />
          </div>
        </DarkPanel>
        <DarkPanel>
          <SectionHeading title="Check-in methods" caption="QR, app and manual entry" />
          <div className="mt-5">
            <DonutChart
              data={overview.methodMix.map((row, index) => ({ label: row.method, value: row.c, accent: pastelFor(index) as PastelKey }))}
              centerValue={num(overview.methodMix.reduce((sum, row) => sum + row.c, 0))}
              centerLabel="30 days"
              size={158}
              thickness={16}
            />
          </div>
        </DarkPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <DarkPanel>
          <SectionHeading title="Live feed" caption="Today’s most recent check-ins" />
          <ul className="mt-4 space-y-2.5">
            {overview.liveFeed.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3">
                <IconTile accent="sage" size="sm">
                  <Fingerprint size={14} />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ghost">{entry.name}</p>
                  <p className="text-[11px] text-ghost-muted">
                    {entry.member_code} · {entry.method}
                  </p>
                </div>
                <span className="text-[11.5px] text-ghost-dim">{entry.checkIn ? formatTime(entry.checkIn) : "—"}</span>
              </li>
            ))}
            {!overview.liveFeed.length ? <li className="text-[12.5px] text-ghost-muted">No check-ins yet.</li> : null}
          </ul>
        </DarkPanel>

        <DarkPanel>
          <SectionHeading title="Most consistent members" caption="Visits in the last 30 days" />
          <ul className="mt-4 space-y-3">
            {overview.topVisitors.map((visitor) => (
              <li key={visitor.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="truncate text-ghost-dim">
                    {visitor.name} <span className="text-ghost-muted">· {visitor.plan_name ?? "—"}</span>
                  </span>
                  <span className="gf-num font-semibold text-ghost">{visitor.visits}</span>
                </div>
                <ProgressBar value={(visitor.visits / 30) * 100} accent={ACCENT.green} track="rgba(255,255,255,.08)" height={6} />
              </li>
            ))}
            {!overview.topVisitors.length ? <li className="text-[12.5px] text-ghost-muted">No visits recorded.</li> : null}
          </ul>
        </DarkPanel>

        <DarkPanel>
          <SectionHeading title="Trainer punctuality" caption="Last 30 days" />
          <ul className="mt-4 space-y-3">
            {overview.trainerAttendance.map((trainer) => (
              <li key={trainer.id} className="flex items-center gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                <IconTile accent="lavender" size="sm">
                  <UserCheck size={14} />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ghost">{trainer.name}</p>
                  <p className="text-[11px] text-ghost-muted">
                    {trainer.present} present · {trainer.late} late
                  </p>
                </div>
                <Pill tone={trainer.rate >= 90 ? "positive" : "warning"}>{trainer.rate}%</Pill>
              </li>
            ))}
          </ul>
        </DarkPanel>
      </div>

      <DarkPanel className="relative overflow-hidden">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-cyan/10 blur-2xl" aria-hidden="true" />
        <SectionHeading title="QR check-in station" caption="Entrance tablet mode — dark screen with a glowing scanner" />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative flex h-[260px] flex-col items-center justify-center gap-4 rounded-hero border border-accent-cyan/25 bg-black/45">
            <span className="absolute inset-8 rounded-card border border-dashed border-accent-cyan/30" />
            <span className="relative flex h-24 w-24 animate-[pulse-ring_2s_ease-out_infinite] items-center justify-center rounded-full bg-accent-cyan/15 text-accent-cyan">
              <QrCode size={42} strokeWidth={1.2} />
            </span>
            <p className="text-[12px] text-ghost-dim">Point your member QR at the scanner</p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <p className="text-[13px] text-ghost-dim">
              Members scan once and the check-in is written instantly with method <span className="text-ghost">QR</span>, status and
              timestamp — the camera keeps running so the queue never waits. Duplicate scans for the same day are blocked
              automatically.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <KeyValue label="Success state" value="Welcome back, Rahul" />
              <KeyValue label="Receipts" value={inr(0)} mono />
              <KeyValue label="Modes" value="QR · App · Manual" />
            </div>
            <div className="flex flex-wrap gap-3">
              <MarkAttendancePanel label="Scan here" members={members.map((m) => ({ id: m.id, name: m.name, memberCode: m.code }))} trainers={trainers.map((t) => ({ id: t.id, name: t.name }))} />
              <GlassLink href="/admin/attendance/station" target="_blank" rel="noreferrer">
                Full-screen station
              </GlassLink>
            </div>
          </div>
        </div>
      </DarkPanel>

      {!overview.calendar.length ? <EmptyState icon={<Activity size={22} />} title="No attendance yet" message="Check-ins will appear here as members arrive." /> : null}
    </div>
  );
}
