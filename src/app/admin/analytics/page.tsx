import { Activity, BadgeIndianRupee, Sparkles, TrendingUp, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, MetricCard, PastelCard, Pill, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { BarChart, CircularGauge, DonutChart, HorizontalBars, MiniChart, SmoothLineChart } from "@/components/ui/charts";
import { InsightCard } from "@/components/cards";
import { inr, inrCompact, num } from "@/lib/format";
import { ACCENT, pastelFor, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const admin = await requireAdmin();
  const { overview, revenueByMonth, planRevenue, retention, weekday, avgVisits, totalVisits } = await getAnalytics(admin.gymId);

  const breakdown = [
    { label: "Membership", value: overview.breakdown.find((b) => b.label === "Membership")?.value ?? 0, accent: "cyan" as PastelKey },
    { label: "Personal Training", value: overview.breakdown.find((b) => b.label === "Personal Training")?.value ?? 0, accent: "lavender" as PastelKey },
    { label: "Classes", value: overview.breakdown.find((b) => b.label === "Classes")?.value ?? 0, accent: "blush" as PastelKey },
    { label: "Other", value: overview.breakdown.find((b) => b.label === "Other")?.value ?? 0, accent: "cream" as PastelKey },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Analytics</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Members, money and attendance — the financial view of your gym</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="cyan" label="Total members" value={num(overview.membersTotal)} caption={`${overview.membersActive} active · ${overview.newThisMonth} new`} icon={<Users size={16} />} />
        <MetricCard accent="lavender" label="Revenue" value={inrCompact(overview.revenue30)} caption="Rolling 30 days" icon={<BadgeIndianRupee size={16} />} />
        <MetricCard accent="blush" label="At risk" value={inrCompact(overview.pendingTotal + overview.overdueTotal)} caption="Pending + overdue" icon={<TrendingUp size={16} />} />
        <MetricCard accent="cream" label="Attendance" value={`${overview.attendanceRate}%`} caption={`${num(totalVisits)} visits in 30 days`} icon={<Activity size={16} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <DarkPanel elevated>
          <SectionHeading title="Revenue by month" caption="Six month trajectory" />
          <div className="mt-6">
            <SmoothLineChart series={revenueByMonth} height={210} accent={ACCENT.blue} accentSoft={ACCENT.cyan} gradientId="gf-rev-month" />
          </div>
          <div className="mt-6 grid gap-6 border-t border-white/6 pt-6 sm:grid-cols-2">
            <div>
              <p className="mb-4 text-[12.5px] font-semibold text-ghost-dim">Revenue by stream</p>
              <HorizontalBars data={breakdown} formatValue={inr} />
            </div>
            <div>
              <p className="mb-4 text-[12.5px] font-semibold text-ghost-dim">Revenue by plan</p>
              <HorizontalBars
                data={planRevenue.map((plan, index) => ({ label: plan.label, value: plan.value, accent: pastelFor(index) as PastelKey }))}
                formatValue={inrCompact}
              />
            </div>
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <PastelCard accent="lavender" hero>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Attendance engine</p>
            <div className="mt-4 flex items-center gap-6">
              <CircularGauge value={overview.attendanceRate} size={132} stroke={13} accent="rgba(24,24,28,.78)" trackColor="rgba(24,24,28,.12)" />
              <div className="space-y-2 text-[12.5px] font-semibold text-pastel-ink/70">
                <p>Average {avgVisits} visits / day</p>
                <p>Peak 6–8 PM</p>
                <p>{num(totalVisits)} total visits</p>
              </div>
            </div>
          </PastelCard>

          <DarkPanel>
            <SectionHeading title="Member mix" caption="Active vs expired vs expiring" />
            <div className="mt-5">
              <DonutChart
                data={[
                  { label: "Active", value: overview.membersActive, accent: "sage" },
                  { label: "Expiring", value: overview.membersExpiring, accent: "lavender" },
                  { label: "Expired", value: overview.membersExpired, accent: "blush" },
                ]}
                centerValue={num(overview.membersTotal)}
                centerLabel="members"
                size={158}
                thickness={17}
              />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Retention signals" caption="Renewal chains per plan" />
            <div className="mt-4 space-y-3">
              {retention.map((row, index) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ghost-dim">{row.label}</span>
                    <span className="gf-num font-semibold text-ghost">{row.value} renewals</span>
                  </div>
                  <ProgressBar value={(row.value / Math.max(1, retention[0].value)) * 100} accent={[ACCENT.blue, ACCENT.cyan, ACCENT.purple][index % 3]} track="rgba(255,255,255,.08)" height={6} />
                </div>
              ))}
              {!retention.length ? <p className="text-[12.5px] text-ghost-muted">No renewal chains recorded yet.</p> : null}
            </div>
          </DarkPanel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <DarkPanel className="xl:col-span-2">
          <SectionHeading title="Peak hours" caption="Last 14 days of check-ins" />
          <div className="mt-6">
            <BarChart
              data={overview.peakHours.map((hour) => ({ label: hour.label, value: hour.value }))}
              accent={ACCENT.cyan}
              height={200}
              formatValue={(value) => `${value}`}
            />
          </div>
        </DarkPanel>
        <DarkPanel>
          <SectionHeading title="Weekday rhythm" caption="Visits by day of week" />
          <div className="mt-6">
            <BarChart data={weekday} accent={ACCENT.purple} height={200} />
          </div>
        </DarkPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IconStat label="Premium revenue" value={inr(planRevenue.find((p) => p.label === "Premium")?.value ?? 0)} caption="Highest grossing plan" />
        <IconStat label="Average ticket" value={inr(Math.round(overview.revenue30 / Math.max(1, 30)))} caption="Per day collection" />
        <IconStat label="Inactive members" value={num(overview.inactiveCount)} caption={`No visit in ${admin.gym.inactivityDays} days`} />
        <IconStat label="Occupancy" value={`${overview.occupancyPct}%`} caption="Today vs active roster" />
      </div>

      <div>
        <SectionHeading title="Smart insights" caption="Auto-surfaced from your data" />
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

      <DarkPanel>
        <SectionHeading title="Cohort trend" caption="Member growth by month" />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            {overview.growth.map((month) => (
              <div key={month.label} className="flex items-center gap-4 py-2.5">
                <span className="w-10 text-[12px] text-ghost-muted">{month.label}</span>
                <div className="flex-1">
                  <ProgressBar value={(month.total / Math.max(1, overview.membersTotal)) * 100} accent={ACCENT.blue} track="rgba(255,255,255,.06)" height={6} />
                </div>
                <span className="gf-num w-12 text-right text-[12.5px] text-ghost">{month.total}</span>
              </div>
            ))}
          </div>
          <div className="h-40">
            <MiniChart data={overview.growth.map((m) => m.total)} accent={ACCENT.purple} height={160} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <KeyValue label="Growth" value={`${overview.growth.length > 1 ? overview.growth[overview.growth.length - 1].total - overview.growth[0].total : 0} members in 6 months`} />
          <KeyValue label="Retention" value={`${Math.round((overview.membersActive / Math.max(1, overview.membersTotal)) * 100)}% active`} />
          <KeyValue label="Attendance score" value={`${overview.attendanceRate}% today`} />
        </div>
      </DarkPanel>
    </div>
  );
}

function IconStat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <DarkPanel className="flex items-center gap-4">
      <IconTile accent="cyan">
        <Sparkles size={16} />
      </IconTile>
      <div>
        <p className="gf-num text-[18px] font-semibold text-ghost">{value}</p>
        <p className="text-[11.5px] text-ghost-muted">{label}</p>
        <p className="mt-0.5 text-[10.5px] text-ghost-muted">{caption}</p>
      </div>
      <Pill className="ml-auto" tone="neutral">
        <TrendingUp size={11} />
      </Pill>
    </DarkPanel>
  );
}
