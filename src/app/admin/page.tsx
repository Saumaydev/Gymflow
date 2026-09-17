import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BadgeIndianRupee,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Dumbbell,
  Sparkles,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview, membersForPicker, plansForPicker, trainersForPicker } from "@/lib/queries";
import { DarkPanel, IconTile, MetricCard, PastelCard, Pill, ProgressBar, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { CircularGauge, DonutChart, HorizontalBars, MiniChart, SmoothLineChart } from "@/components/ui/charts";
import { InsightCard, PaymentRow } from "@/components/cards";
import { RecordPaymentForm } from "@/components/admin/forms";
import { ACCENT } from "@/lib/tokens";
import { formatTime, inr, inrCompact, num, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const [overview, members, pendingPlans, trainers] = await Promise.all([
    getAdminOverview(admin.gymId, admin.gym.inactivityDays),
    membersForPicker(admin.gymId),
    plansForPicker(admin.gymId),
    trainersForPicker(admin.gymId),
  ]);

  const delta = overview.revenue30 - overview.revenuePrev30;
  const deltaPct = pct(delta, Math.max(1, overview.revenuePrev30));
  const owedPct = pct(overview.pendingTotal, overview.pendingTotal + overview.revenue30);
  const growthSeries = overview.growth.map((g) => ({ label: g.label, value: g.total }));
  const heroMembers = members.slice(0, 120).map((m) => ({ id: m.id, name: m.name, memberCode: m.code }));

  const salesRows = [
    { label: "Members", value: num(overview.membersActive), caption: "Active this month", icon: <Users size={15} />, accent: "cyan" as const, href: "/admin/members?filter=active" },
    { label: "Attendance", value: num(overview.attendanceToday), caption: "Checked in today", icon: <Activity size={15} />, accent: "sage" as const, href: "/admin/attendance" },
    { label: "Memberships", value: num(overview.membersExpiring), caption: "Expiring in 7 days", icon: <CalendarClock size={15} />, accent: "lavender" as const, href: "/admin/memberships?tab=expiring" },
    { label: "Revenue", value: inrCompact(overview.revenue30), caption: "Last 30 days", icon: <BadgeIndianRupee size={15} />, accent: "cream" as const, href: "/admin/payments" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ghost-muted">{admin.gym.name}</p>
          <h1 className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-ghost sm:text-[38px]">
            Hello {admin.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-[14px] text-ghost-dim">Welcome back! Here’s what’s happening in your gym today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RecordPaymentForm
            members={heroMembers}
            pendingOptions={[]}
          />
          <Link
            href="/admin/members/new"
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost transition hover:bg-white/10"
          >
            <Users size={15} /> Add member
          </Link>
        </div>
      </div>

      {/* Primary metric grid — four pastel floating cards (PRD §20) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="cyan"
          label="Members"
          value={num(overview.membersTotal)}
          caption={`+${overview.newThisMonth} this month`}
          icon={<Users size={16} />}
          hint="Total"
          href="/admin/members"
        />
        <MetricCard
          accent="lavender"
          label="Revenue"
          value={inrCompact(overview.revenue30)}
          caption={delta >= 0 ? `+${inr(delta)} vs previous 30 days` : `−${inr(Math.abs(delta))} vs previous 30 days`}
          icon={<BadgeIndianRupee size={16} />}
          hint="Last 30 days"
          href="/admin/payments"
        />
        <MetricCard
          accent="blush"
          label="Pending"
          value={inrCompact(overview.pendingTotal)}
          caption={`${overview.pendingCount} members carrying balance`}
          icon={<CircleAlert size={16} />}
          hint="Outstanding"
          href="/admin/payments?tab=pending"
        />
        <MetricCard
          accent="cream"
          label="Attendance"
          value={`${overview.attendanceRate}%`}
          caption={`${overview.attendanceToday} members today`}
          icon={<Activity size={16} />}
          hint="Today"
          href="/admin/attendance"
        />
      </div>

      {/* Gym revenue hero + owed gauge */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <DarkPanel elevated className="relative overflow-hidden">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-blue/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <SectionHeading title="Gym Revenue" caption="Rolling 30 day performance across memberships, PT and classes" />
              <p className="gf-num mt-5 text-[38px] font-semibold leading-none tracking-tight text-ghost sm:text-[46px]">
                {inr(overview.revenue30)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${delta >= 0 ? "text-accent-green" : "text-pastel-blush"}`}>
                  <ArrowUpRight size={15} className={delta >= 0 ? "" : "rotate-90"} />
                  {delta >= 0 ? "+" : "−"}
                  {inr(Math.abs(delta))} vs previous 30 days
                </span>
                <span className="text-[12.5px] text-ghost-muted">{inrCompact(overview.collectedToday)} collected today</span>
              </div>
            </div>
            <div className="rounded-card border border-white/8 bg-white/4 px-4 py-3 text-center">
              <p className={`gf-num text-[20px] font-semibold ${deltaPct >= 0 ? "text-accent-green" : "text-pastel-blush"}`}>
                {deltaPct >= 0 ? "+" : ""}
                {deltaPct}%
              </p>
              <p className="mt-0.5 text-[11px] text-ghost-muted">growth</p>
            </div>
          </div>

          <div className="relative mt-6">
            <SmoothLineChart series={overview.revenueSeries} compare={overview.previousSeries} height={210} accent={ACCENT.blue} accentSoft={ACCENT.cyan} />
          </div>

          <div className="relative mt-6 grid gap-6 border-t border-white/6 pt-6 sm:grid-cols-2">
            <div>
              <p className="mb-4 text-[12.5px] font-semibold text-ghost-dim">Revenue breakdown</p>
              <HorizontalBars data={overview.breakdown} formatValue={(value) => inr(value)} />
            </div>
            <div>
              <p className="mb-4 text-[12.5px] font-semibold text-ghost-dim">Payment method mix</p>
              <DonutChart
                data={overview.breakdown.map((b) => ({ label: b.label, value: b.value, accent: b.accent }))}
                centerValue={inrCompact(overview.revenue30)}
                centerLabel="last 30 days"
                size={150}
                thickness={16}
              />
            </div>
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <PastelCard accent="cyan" hero>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Amount Owed</p>
                <p className="gf-num mt-3 text-[34px] font-semibold leading-none">{inr(overview.pendingTotal)}</p>
                <p className="mt-2 text-[12.5px] font-semibold text-pastel-ink/65">
                  {overview.pendingCount} members · {inr(overview.overdueTotal)} overdue
                </p>
              </div>
              <CircularGauge
                value={owedPct}
                size={124}
                stroke={12}
                accent="rgba(24,24,28,.78)"
                trackColor="rgba(24,24,28,.12)"
                centerValue={`${owedPct}%`}
                label="of billings"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/admin/payments?tab=pending"
                className="inline-flex h-10 items-center rounded-pill bg-white/70 px-4 text-[12px] font-bold uppercase tracking-wide"
              >
                View payments
              </Link>
              <Link
                href="/admin/communication?new=1"
                className="inline-flex h-10 items-center rounded-pill border border-pastel-ink/15 px-4 text-[12px] font-bold uppercase tracking-wide text-pastel-ink/70"
              >
                Send reminder
              </Link>
            </div>
          </PastelCard>

          <DarkPanel>
            <SectionHeading title="Today’s attendance" caption={`${overview.attendanceToday} of ${overview.rosterActive} active members`} />
            <div className="mt-5 flex items-center gap-6">
              <CircularGauge
                value={overview.attendanceRate}
                size={140}
                stroke={13}
                accent={ACCENT.cyan}
                trackColor="rgba(255,255,255,.08)"
                textColor="#F7F7F4"
                sublabel={`${overview.attendanceToday} / ${overview.rosterActive}`}
              />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ghost-muted">Peak window</p>
                  <p className="mt-1 text-[15px] font-semibold text-ghost">6 PM – 8 PM</p>
                  <p className="mt-0.5 text-[11.5px] text-ghost-muted">Evening sessions dominate check-ins</p>
                </div>
                <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ghost-muted">14 day trend</p>
                  <div className="mt-2 h-11">
                    <MiniChart data={overview.revenueSeries.slice(-14).map((s) => s.value)} accent={ACCENT.cyan} height={44} />
                  </div>
                </div>
              </div>
            </div>
          </DarkPanel>
        </div>
      </div>

      {/* Sales-style list + member overview */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <DarkPanel>
          <SectionHeading title="Pulse" caption="Members · Attendance · Memberships · Revenue" />
          <ul className="mt-4 divide-y divide-white/6">
            {salesRows.map((row) => (
              <li key={row.label}>
                <Link href={row.href} className="flex items-center gap-4 py-3.5 transition hover:opacity-90">
                  <IconTile accent={row.accent} size="sm">
                    {row.icon}
                  </IconTile>
                  <span className="flex-1 text-[13.5px] font-medium text-ghost">{row.label}</span>
                  <span className="text-right">
                    <span className="gf-num block text-[16px] font-semibold text-ghost">{row.value}</span>
                    <span className="block text-[11px] text-ghost-muted">{row.caption}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DarkPanel>

        <DarkPanel>
          <SectionHeading
            title="Member Overview"
            caption="Growth across the last six months"
            action={<Pill tone="info">{overview.newThisMonth} new this month</Pill>}
          />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total", value: overview.membersTotal },
              { label: "Active", value: overview.membersActive },
              { label: "Expiring", value: overview.membersExpiring },
              { label: "Expired", value: overview.membersExpired },
            ].map((stat) => (
              <div key={stat.label} className="rounded-card border border-white/7 bg-white/4 p-3.5">
                <p className="gf-num text-[22px] font-semibold leading-none text-ghost">{num(stat.value)}</p>
                <p className="mt-1.5 text-[11.5px] text-ghost-muted">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <SmoothLineChart series={growthSeries} height={150} accent={ACCENT.purple} accentSoft={ACCENT.purple} gradientId="gf-growth" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card bg-pastel-sage p-4 text-pastel-ink">
              <p className="text-[12px] font-semibold text-pastel-ink/60">Retention watch</p>
              <p className="gf-num mt-1 text-[20px] font-semibold">{overview.inactiveCount}</p>
              <p className="mt-0.5 text-[11.5px] text-pastel-ink/60">members have not visited in {admin.gym.inactivityDays} days</p>
            </div>
            <div className="rounded-card bg-pastel-lavender p-4 text-pastel-ink">
              <p className="text-[12px] font-semibold text-pastel-ink/60">Expiring this week</p>
              <p className="gf-num mt-1 text-[20px] font-semibold">{overview.membersExpiring}</p>
              <p className="mt-0.5 text-[11.5px] text-pastel-ink/60">renewals to close in the next 7 days</p>
            </div>
          </div>
        </DarkPanel>
      </div>

      {/* Action center (PRD §73) */}
      <div>
        <SectionHeading title="Action centre" caption="Everything that needs you today" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overview.insights.map((insight) => (
            <InsightCard
              key={insight.id}
              icon={<Sparkles size={15} />}
              title={insight.title}
              detail={insight.detail}
              cta={insight.cta}
              href={insight.href}
              accent={insight.accent}
            />
          ))}
        </div>
      </div>

      {/* Lists */}
      <div className="grid gap-5 xl:grid-cols-3">
        <DarkPanel className="xl:col-span-2">
          <SectionHeading
            title="Recent payments"
            caption="Every payment stays a separate transaction"
            action={
              <Link href="/admin/payments" className="text-[12px] font-semibold text-ghost-dim hover:text-ghost">
                View all
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {overview.recentPayments.map((payment, index) => (
              <PaymentRow
                key={payment.id}
                index={index}
                payment={{
                  id: payment.id,
                  member_name: payment.memberName,
                  member_code: payment.memberCode,
                  plan_name: payment.note,
                  amount: payment.amount,
                  method: payment.method,
                  paymentDate: payment.paymentDate,
                  receipt_number: `#${payment.id}`,
                }}
              />
            ))}
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Expiring soon" caption="Next 7 days" />
            <ul className="mt-4 space-y-3">
              {overview.expiringSoon.map((member) => (
                <li key={member.id} className="flex items-center gap-3 rounded-card border border-white/7 bg-white/4 p-3.5">
                  <IconTile accent="lavender" size="sm">
                    <CalendarClock size={15} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ghost">{member.name}</p>
                    <p className="text-[11px] text-ghost-muted">
                      {member.plan} · {member.memberCode}
                    </p>
                  </div>
                  <Pill tone={member.daysLeft <= 2 ? "danger" : "warning"}>{member.daysLeft}d</Pill>
                </li>
              ))}
              {!overview.expiringSoon.length ? <li className="text-[12.5px] text-ghost-muted">Nothing expiring this week.</li> : null}
            </ul>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Checked in today" caption="Live from the entrance" />
            <ul className="mt-4 space-y-2.5">
              {overview.todayCheckIns.map((checkIn) => (
                <li key={checkIn.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pastel-sage text-pastel-ink">
                    <Activity size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ghost">{checkIn.name}</p>
                    <p className="text-[11px] text-ghost-muted">
                      {checkIn.method} · {checkIn.checkIn ? formatTime(checkIn.checkIn) : "—"}
                    </p>
                  </div>
                  <StatusDot status="ACTIVE" label="In" />
                </li>
              ))}
              {!overview.todayCheckIns.length ? <li className="text-[12.5px] text-ghost-muted">No check-ins yet today.</li> : null}
            </ul>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Peak hours" caption="Last 14 days" />
            <div className="mt-4 space-y-2.5">
              {overview.peakHours.slice(0, 8).map((hour) => (
                <div key={hour.label} className="flex items-center gap-3">
                  <span className="w-10 text-[11.5px] text-ghost-muted">{hour.label}</span>
                  <div className="flex-1">
                    <ProgressBar
                      value={(hour.value / Math.max(1, Math.max(...overview.peakHours.map((h) => h.value)))) * 100}
                      accent={ACCENT.purple}
                      track="rgba(255,255,255,.06)"
                      height={6}
                    />
                  </div>
                  <span className="gf-num w-8 text-right text-[11.5px] text-ghost-dim">{hour.value}</span>
                </div>
              ))}
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Coaching desk" caption="Trainers on the floor" />
            <div className="mt-4 flex flex-wrap gap-2">
              {trainers.slice(0, 6).map((trainer) => (
                <span key={trainer.id} className="rounded-pill border border-white/8 bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-ghost-dim">
                  {trainer.name}
                </span>
              ))}
            </div>
            <Link
              href="/admin/trainers"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[12px] font-semibold text-ghost-dim hover:bg-white/10"
            >
              <Dumbbell size={14} /> Manage trainers
            </Link>
            <p className="mt-4 text-[11.5px] text-ghost-muted">
              {pendingPlans.length} active plans · <CreditCard size={11} className="inline" /> receipts generated automatically
            </p>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
