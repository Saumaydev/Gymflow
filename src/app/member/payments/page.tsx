import { notFound } from "next/navigation";
import { BadgeIndianRupee, Check, CreditCard } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMemberProfile } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, PastelCard, Pill, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { formatDate, formatTime, inr, relativeDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberPaymentsPage() {
  const user = await requireRole("MEMBER");
  if (!user.member) notFound();
  const profile = await getMemberProfile(user.gymId, user.member.id);
  if (!profile) notFound();

  const { current, payments, daysLeft } = profile;
  const paid = current?.amountPaid ?? 0;
  const total = current ? current.price - current.discount : 0;
  const due = current?.amountDue ?? 0;
  const latest = payments[0] ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Payments</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Receipts, balances and renewal dates</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <PastelCard accent="cream" hero>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Current cycle</p>
              <p className="gf-num mt-3 text-[34px] font-semibold leading-none">{inr(total)}</p>
              <p className="mt-2 text-[12.5px] font-semibold text-pastel-ink/60">
                {current?.planName ?? "No plan"} · {formatDate(current?.startDate)} → {formatDate(current?.endDate)}
              </p>
            </div>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-[22px] font-semibold">
              {due === 0 ? <Check size={22} /> : "!"}
            </span>
          </div>
          <div className="mt-6">
            <ProgressBar value={(paid / Math.max(1, total)) * 100} accent="rgba(24,24,28,.78)" track="rgba(24,24,28,.12)" height={10} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Paid", value: inr(paid) },
              { label: "Remaining", value: inr(due) },
              { label: "Next renewal", value: current ? formatDate(current.endDate, { month: "short", day: "2-digit" }) : "—" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-card bg-white/60 px-2 py-3">
                <p className="gf-num text-[15px] font-semibold">{stat.value}</p>
                <p className="text-[10.5px] font-semibold text-pastel-ink/55">{stat.label}</p>
              </div>
            ))}
          </div>
        </PastelCard>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Status" caption="Live from the front desk ledger" />
            <div className="mt-4 space-y-4">
              <KeyValue label="Last payment" value={latest ? `${inr(latest.amount)} on ${formatDate(latest.paymentDate)}` : "No payments yet"} mono />
              <KeyValue label="Method" value={latest?.method ?? "—"} />
              <KeyValue label="Next renewal" value={current ? `${formatDate(current.endDate)} (${relativeDay(current.endDate)})` : "—"} />
              <KeyValue label="Days remaining" value={`${Math.max(0, daysLeft)} days`} mono />
            </div>
            {due > 0 ? (
              <Pill className="mt-5" tone="warning">
                {inr(due)} pending — pay at the desk or via UPI
              </Pill>
            ) : (
              <Pill className="mt-5" tone="positive">
                All settled
              </Pill>
            )}
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Need a receipt?" caption="Every transaction is numbered" />
            <p className="mt-3 text-[12.5px] text-ghost-dim">
              Ask the front desk for a printed copy, or download the full ledger from the gym console.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-card border border-white/7 bg-white/4 p-4">
              <IconTile accent="cyan" size="sm">
                <CreditCard size={14} />
              </IconTile>
              <p className="text-[12px] text-ghost-muted">{payments.length} transactions recorded for your account.</p>
            </div>
          </DarkPanel>
        </div>
      </div>

      <DarkPanel>
        <SectionHeading title="Payment timeline" caption="Most recent first" />
        <ol className="mt-5 space-y-3">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-4 rounded-card bg-white/4 p-4">
              <IconTile accent="sage" size="sm">
                <BadgeIndianRupee size={14} />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ghost">
                  {formatDate(payment.paymentDate)} · {formatTime(payment.paymentDate)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ghost-muted">
                  {payment.notes ?? "Membership payment"} · {payment.method}
                </p>
              </div>
              <span className="gf-num text-[15px] font-semibold text-ghost">{inr(payment.amount)}</span>
              <span className="text-[11.5px] text-ghost-muted">{payment.receiptNumber}</span>
            </li>
          ))}
          {!payments.length ? <li className="text-[12.5px] text-ghost-muted">No payments recorded yet.</li> : null}
        </ol>
      </DarkPanel>
    </div>
  );
}
