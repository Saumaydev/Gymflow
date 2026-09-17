import Link from "next/link";
import { BadgeIndianRupee, CircleAlert, Download, Receipt, TrendingUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview, getPaymentsOverview, membersForPicker, plansForPicker } from "@/lib/queries";
import { DarkPanel, EmptyState, KeyValue, MetricCard, Pill, ProgressBar, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { DonutChart, MiniChart, SmoothLineChart } from "@/components/ui/charts";
import { PaymentRow } from "@/components/cards";
import { RecordPaymentForm } from "@/components/admin/forms";
import { formatDate, formatTime, inr, inrCompact, num } from "@/lib/format";
import { ACCENT, pastelFor, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "transactions", label: "Transactions" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "receipts", label: "Receipts" },
];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await requireAdmin();
  const { tab } = await searchParams;
  const activeTab = TABS.find((t) => t.value === tab)?.value ?? "overview";
  const [data, overview, members, plans] = await Promise.all([
    getPaymentsOverview(admin.gymId),
    getAdminOverview(admin.gymId, admin.gym.inactivityDays),
    membersForPicker(admin.gymId),
    plansForPicker(admin.gymId),
  ]);

  const { totals, methodMix, transactions, pending } = data;
  const pendingList = pending.filter((p) => p.status !== "EXPIRED");
  const overdueList = pending.filter((p) => p.status === "EXPIRED");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Payments</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Revenue, pending balances and receipts · {num(totals.count)} transactions in 30 days</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/reports?type=payments"
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost-dim hover:bg-white/10"
          >
            <Download size={15} /> Export
          </a>
          <RecordPaymentForm
            members={members.map((m) => ({ id: m.id, name: m.name, memberCode: m.code }))}
            pendingOptions={pending.map((p) => ({
              id: p.id,
              memberId: p.member_id,
              memberName: p.member_name,
              planName: p.plan_name,
              total: p.total,
              paid: p.paid,
              due: p.due,
            }))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="cyan" label="Revenue" value={inrCompact(totals.revenue)} caption="Rolling 30 days" icon={<TrendingUp size={16} />} />
        <MetricCard accent="sage" label="Collected Today" value={inr(totals.collected_today)} caption="Since midnight" icon={<BadgeIndianRupee size={16} />} />
        <MetricCard accent="blush" label="Pending" value={inrCompact(totals.pending)} caption={`${pendingList.length} subscriptions`} icon={<CircleAlert size={16} />} href="/admin/payments?tab=pending" />
        <MetricCard accent="lavender" label="Overdue" value={inrCompact(totals.overdue)} caption={`${overdueList.length} lapsed cycles`} icon={<Receipt size={16} />} href="/admin/payments?tab=overdue" />
      </div>

      <div className="gf-scroll-x flex gap-2">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={`/admin/payments?tab=${item.value}`}
            className={`shrink-0 rounded-pill px-4 py-2.5 text-[12.5px] font-semibold transition ${
              activeTab === item.value ? "bg-ghost text-pastel-ink" : "border border-white/8 bg-white/5 text-ghost-dim hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <DarkPanel elevated>
            <SectionHeading title="Collections" caption="Daily receipts over 60 days with 30 day comparison" />
            <div className="mt-6">
              <SmoothLineChart series={overview.revenueSeries} compare={overview.previousSeries} height={220} accent={ACCENT.purple} accentSoft={ACCENT.purple} gradientId="gf-payments" />
            </div>
            <div className="mt-6 grid gap-4 border-t border-white/6 pt-6 sm:grid-cols-3">
              <KeyValue label="Average ticket" value={inr(Math.round(totals.revenue / Math.max(1, totals.count)))} mono />
              <KeyValue label="Daily average" value={inr(Math.round(totals.revenue / 30))} mono />
              <KeyValue label="Transactions" value={num(totals.count)} mono />
            </div>
            <div className="mt-6">
              <HorizontalBreakdown data={methodMix} />
            </div>
          </DarkPanel>
          <DarkPanel>
            <SectionHeading title="Method mix" caption="Share of collections" />
            <div className="mt-5">
              <DonutChart
                data={methodMix.map((row, index) => ({ label: row.method, value: row.value, accent: pastelFor(index + 1) as PastelKey }))}
                centerValue={inrCompact(totals.revenue)}
                centerLabel="30 days"
                size={165}
                thickness={18}
              />
            </div>
            <div className="mt-6 rounded-card border border-white/7 bg-white/4 p-4">
              <p className="text-[12.5px] font-semibold text-ghost">Recovery priority</p>
              <p className="mt-1 text-[12px] text-ghost-dim">
                {pendingList.length} members hold partial balances, {overdueList.length} have lapsed. Send reminders from the
                communication centre.
              </p>
              <Link href="/admin/communication?new=1" className="mt-3 inline-flex h-10 items-center rounded-pill bg-ghost px-4 text-[12px] font-semibold text-pastel-ink">
                Send payment reminder
              </Link>
            </div>
          </DarkPanel>
        </div>
      ) : null}

      {activeTab === "transactions" || activeTab === "receipts" ? (
        <div className="space-y-3">
          {transactions.map((transaction, index) => (
            <PaymentRow
              key={transaction.id}
              index={index}
              payment={{
                id: transaction.id,
                member_name: transaction.member_name,
                member_code: transaction.member_code,
                plan_name: transaction.plan_name,
                amount: transaction.amount,
                method: transaction.method,
                paymentDate: transaction.paymentDate,
                receipt_number: transaction.receipt_number,
                notes: transaction.notes,
              }}
            />
          ))}
          {!transactions.length ? <EmptyState icon={<Receipt size={22} />} title="No transactions yet" message="Recorded payments appear here instantly with a receipt number." /> : null}
        </div>
      ) : null}

      {activeTab === "pending" || activeTab === "overdue" ? (
        <DarkPanel>
          <SectionHeading
            title={activeTab === "pending" ? "Pending balances" : "Overdue balances"}
            caption="Partial payments are tracked per transaction"
          />
          <div className="mt-4 space-y-3">
            {(activeTab === "pending" ? pendingList : overdueList).map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-4 rounded-card border border-white/7 bg-white/4 p-4">
                <div className="min-w-[160px] flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ghost">{row.member_name}</p>
                  <p className="text-[11.5px] text-ghost-muted">
                    {row.member_code} · {row.plan_name} · ends {formatDate(row.end_date)}
                  </p>
                </div>
                <div className="min-w-[180px]">
                  <ProgressBar value={(row.paid / Math.max(1, row.total)) * 100} accent={ACCENT.purple} track="rgba(255,255,255,.08)" height={6} />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-ghost-muted">
                    <span>{inr(row.paid)} paid</span>
                    <span>{inr(row.due)} due</span>
                  </div>
                </div>
                <StatusDot status={row.status} />
                <Link
                  href={`/admin/members/${row.member_id}?tab=payments`}
                  className="inline-flex h-9 items-center rounded-pill border border-white/10 bg-white/6 px-3.5 text-[12px] font-semibold text-ghost hover:bg-white/12"
                >
                  Collect
                </Link>
              </div>
            ))}
            {!(activeTab === "pending" ? pendingList : overdueList).length ? (
              <EmptyState icon={<BadgeIndianRupee size={22} />} title="All clear" message="No balances in this bucket right now." />
            ) : null}
          </div>
        </DarkPanel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <DarkPanel className="xl:col-span-2">
          <SectionHeading title="Latest receipts" caption={`${plans.length} active plans · auto-numbered receipts`} />
          <div className="mt-4 space-y-2.5">
            {transactions.slice(0, 8).map((transaction) => (
              <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ghost">{transaction.receipt_number}</p>
                  <p className="text-[11.5px] text-ghost-muted">
                    {transaction.member_name} · {formatDate(transaction.paymentDate)} {formatTime(transaction.paymentDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="gf-num text-[14px] font-semibold text-ghost">{inr(transaction.amount)}</span>
                  <Link
                    href={`/admin/payments/${transaction.id}/receipt`}
                    className="inline-flex h-9 items-center rounded-pill border border-white/10 bg-white/6 px-3.5 text-[12px] font-semibold text-ghost hover:bg-white/12"
                  >
                    View receipt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </DarkPanel>
        <DarkPanel>
          <SectionHeading title="Trend" caption="7 day collections" />
          <div className="mt-5 h-24">
            <MiniChart data={overview.revenueSeries.slice(-7).map((s) => s.value)} accent={ACCENT.cyan} height={96} />
          </div>
          <p className="mt-4 text-[12.5px] text-ghost-dim">
            Collected today <span className="gf-num font-semibold text-ghost">{inr(totals.collected_today)}</span>
          </p>
          <p className="mt-1 text-[12.5px] text-ghost-dim">
            Outstanding <span className="gf-num font-semibold text-ghost">{inr(totals.pending + totals.overdue)}</span>
          </p>
        </DarkPanel>
      </div>
    </div>
  );
}

function HorizontalBreakdown({ data }: { data: { method: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((row) => row.value));
  return (
    <ul className="space-y-3">
      {data.map((row, index) => (
        <li key={row.method}>
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-ghost-dim">{row.method}</span>
            <span className="gf-num font-semibold text-ghost">{inr(row.value)}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-pill bg-white/6">
            <div
              className="h-full rounded-pill"
              style={{
                width: `${Math.max(4, (row.value / max) * 100)}%`,
                background: index % 2 === 0 ? ACCENT.blue : ACCENT.cyan,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
