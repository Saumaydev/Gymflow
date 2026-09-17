import Link from "next/link";
import { BadgeIndianRupee, CalendarClock, RefreshCw, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getMembershipOverview, plansForPicker } from "@/lib/queries";
import { DarkPanel, EmptyState, IconTile, MetricCard, PastelCard, Pill, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { DonutChart, HorizontalBars } from "@/components/ui/charts";
import { SubscriptionActions, PlanCreator } from "@/components/admin/forms";
import { SubscriptionRow } from "@/components/cards";
import { formatDate, inr, inrCompact, num, relativeDay } from "@/lib/format";
import { pastelFor, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "plans", label: "Plans" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
];

const LIFECYCLE = ["Created", "Active", "Expiring Soon", "Expired", "Renewed"];

export default async function MembershipsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await requireAdmin();
  const { tab } = await searchParams;
  const activeTab = TABS.find((t) => t.value === tab)?.value ?? "plans";
  const [overview, plans] = await Promise.all([getMembershipOverview(admin.gymId), plansForPicker(admin.gymId)]);
  const { stats, subscriptions } = overview;

  const filtered =
    activeTab === "expiring"
      ? subscriptions.filter((s) => s.days_left <= 7 && s.days_left >= 0)
      : activeTab === "expired"
        ? subscriptions.filter((s) => s.days_left < 0)
        : subscriptions;

  const lifecycleCounts = new Map(overview.lifecycle.map((row) => [row.status, row.c]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Memberships</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Plans, subscriptions and the renewal pipeline</p>
        </div>
        <PlanCreator />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="cyan" label="Active" value={num(stats.active)} caption="Billing this cycle" icon={<BadgeIndianRupee size={16} />} href="/admin/memberships?tab=subscriptions" />
        <MetricCard accent="lavender" label="Expiring" value={num(stats.expiring)} caption="Next 7 days" icon={<CalendarClock size={16} />} href="/admin/memberships?tab=expiring" />
        <MetricCard accent="blush" label="Expired" value={num(stats.expired)} caption="Win-back targets" icon={<Sparkles size={16} />} href="/admin/memberships?tab=expired" />
        <MetricCard accent="cream" label="Renewed" value={num(stats.renewed)} caption="Linked renewal chains" icon={<RefreshCw size={16} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <DarkPanel>
          <SectionHeading title="Subscription lifecycle" caption="Created → Active → Expiring → Expired → Renewed" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {LIFECYCLE.map((stage, index) => (
              <div key={stage} className="rounded-card border border-white/7 bg-white/4 p-4">
                <IconTile accent={(pastelFor(index) as PastelKey)} size="sm">
                  <Sparkles size={13} />
                </IconTile>
                <p className="mt-3 text-[12px] font-semibold text-ghost">{stage}</p>
                <p className="gf-num mt-1 text-[18px] font-semibold text-ghost">
                  {stage === "Created"
                    ? num(stats.active + stats.expired)
                    : stage === "Active"
                      ? num(stats.active)
                      : stage === "Expiring Soon"
                        ? num(stats.expiring)
                        : stage === "Expired"
                          ? num(stats.expired)
                          : num(stats.renewed)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <HorizontalBars
              data={overview.plans.map((plan) => ({
                label: plan.name,
                value: plan.activeMembers,
                accent: (plan.accent ?? "cyan") as PastelKey,
              }))}
              formatValue={(value) => `${value} members`}
            />
            <DonutChart
              data={overview.lifecycle.map((row, index) => ({
                label: row.status,
                value: row.c,
                accent: pastelFor(index + 2) as PastelKey,
              }))}
              centerValue={num(stats.active + stats.expired)}
              centerLabel="subscriptions"
              size={150}
              thickness={16}
            />
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <PastelCard accent="cyan" hero>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Collected on subscriptions</p>
            <p className="gf-num mt-3 text-[32px] font-semibold leading-none">{inr(stats.collected)}</p>
            <div className="mt-4">
              <ProgressBar value={(stats.collected / Math.max(1, stats.collected + stats.due)) * 100} accent="rgba(24,24,28,.75)" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px] font-semibold text-pastel-ink/65">
              <span>{inr(stats.due)} still due</span>
              <span>{inrCompact(stats.collected + stats.due)} billed</span>
            </div>
          </PastelCard>

          <DarkPanel>
            <SectionHeading title="Plan performance" caption="Members and revenue per plan" />
            <div className="mt-4 space-y-3">
              {overview.plans.map((plan) => (
                <div key={plan.id} className="rounded-card border border-white/7 bg-white/4 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-semibold text-ghost">{plan.name}</p>
                    <Pill tone="info">{inr(plan.price)}</Pill>
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-ghost-muted">
                    {plan.durationDays} days · {plan.activeMembers} members · {inr(plan.revenue)} billed
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="rounded-pill bg-white/6 px-2.5 py-1 text-[10.5px] text-ghost-dim">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </DarkPanel>
        </div>
      </div>

      <div className="gf-scroll-x flex gap-2">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={`/admin/memberships?tab=${item.value}`}
            className={`shrink-0 rounded-pill px-4 py-2.5 text-[12.5px] font-semibold transition ${
              activeTab === item.value ? "bg-ghost text-pastel-ink" : "border border-white/8 bg-white/5 text-ghost-dim hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {activeTab === "plans" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {overview.plans.map((plan) => (
            <div key={plan.id} className="gf-hairline rounded-card bg-panel/85 p-5">
              <div className="flex items-start justify-between">
                <IconTile accent={(plan.accent ?? "cyan") as PastelKey}>
                  <BadgeIndianRupee size={16} />
                </IconTile>
                <Pill tone="positive">{plan.status}</Pill>
              </div>
              <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-ghost-dim">{plan.name}</p>
              <p className="gf-num mt-2 text-[28px] font-semibold leading-none text-ghost">
                {inr(plan.price)}
                <span className="text-[12px] font-medium text-ghost-muted"> / {plan.durationDays} days</span>
              </p>
              <p className="mt-3 text-[12px] text-ghost-dim">{plan.description}</p>
              <ul className="mt-4 space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-[11.5px] text-ghost-muted">
                    <span className="h-1 w-1 rounded-full bg-accent-cyan" /> {feature}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11.5px] text-ghost-muted">
                {plan.activeMembers} members · {inr(plan.revenue)} billed
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 40).map((subscription) => (
            <div key={subscription.id} className="space-y-3">
              <SubscriptionRow subscription={subscription} />
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <p className="text-[11.5px] text-ghost-muted">
                  Cycle {formatDate(subscription.start_date)} → {formatDate(subscription.end_date)} ·{" "}
                  <span className={subscription.days_left < 0 ? "text-pastel-blush" : "text-ghost-dim"}>{relativeDay(subscription.end_date)}</span>
                </p>
                <SubscriptionActions subscriptionId={subscription.id} plans={plans} memberName={subscription.member_name} compact />
              </div>
            </div>
          ))}
          {!filtered.length ? (
            <EmptyState
              icon={<CalendarClock size={22} />}
              title="Nothing in this view"
              message="No subscriptions match the selected lifecycle stage right now."
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
