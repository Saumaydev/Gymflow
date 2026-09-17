import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeIndianRupee, CalendarClock, Check, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMemberProfile } from "@/lib/queries";
import { DarkPanel, KeyValue, PastelCard, Pill, ProgressBar, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { formatDate, inr, relativeDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberMembershipPage() {
  const user = await requireRole("MEMBER");
  if (!user.member) notFound();
  const profile = await getMemberProfile(user.gymId, user.member.id);
  if (!profile) notFound();

  const { current, subscriptions, daysLeft, payments } = profile;
  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">My membership</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Plan, billing cycle and renewal information</p>
      </div>

      <PastelCard accent="cyan" hero className="relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Pill>{current?.planName ?? "No plan"}</Pill>
            <p className="gf-num mt-5 text-[34px] font-semibold leading-none">{current ? inr(current.price - current.discount) : "—"}</p>
            <p className="mt-1 text-[12.5px] font-semibold text-pastel-ink/60">
              per {current?.durationDays ?? 30} day cycle
            </p>
          </div>
          <div className="text-right">
            <StatusDot status={current?.status ?? "EXPIRED"} />
            <p className="gf-num mt-3 text-[40px] font-semibold leading-none">{Math.max(0, daysLeft)}</p>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/55">days remaining</p>
          </div>
        </div>

        <div className="mt-6">
          <ProgressBar
            value={current ? Math.max(4, Math.min(100, (Math.max(0, daysLeft) / Math.max(1, current.durationDays ?? 30)) * 100)) : 0}
            accent="rgba(24,24,28,.78)"
            track="rgba(24,24,28,.12)"
            height={10}
          />
          <div className="mt-2 flex items-center justify-between text-[11.5px] font-semibold text-pastel-ink/65">
            <span>{current ? `Started ${formatDate(current.startDate)}` : ""}</span>
            <span>{current ? `Valid until ${formatDate(current.endDate)}` : ""}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/member/payments" className="inline-flex h-11 items-center gap-2 rounded-pill bg-white/70 px-5 text-[12.5px] font-bold uppercase tracking-wide">
            <BadgeIndianRupee size={14} /> Payment history
          </Link>
          <span className="inline-flex h-11 items-center gap-2 rounded-pill border border-pastel-ink/15 px-5 text-[12.5px] font-bold uppercase tracking-wide text-pastel-ink/70">
            <Sparkles size={14} /> Renew at the front desk
          </span>
        </div>
      </PastelCard>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <DarkPanel>
          <SectionHeading title="Subscription history" caption="Every cycle on record, newest first" />
          <div className="mt-4 space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="rounded-card border border-white/7 bg-white/4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ghost">
                      {sub.planName} · {inr(sub.price - sub.discount)}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ghost-muted">
                      {formatDate(sub.startDate)} → {formatDate(sub.endDate)} ({relativeDay(sub.endDate)})
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill tone={sub.amountDue === 0 ? "positive" : "warning"}>
                      {sub.amountDue === 0 ? "Settled" : `${inr(sub.amountDue)} due`}
                    </Pill>
                    <StatusDot status={sub.status} />
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={(sub.amountPaid / Math.max(1, sub.price - sub.discount)) * 100}
                    accent={sub.amountDue === 0 ? "#82D6B2" : "#9D8AFF"}
                    track="rgba(255,255,255,.08)"
                    height={6}
                  />
                </div>
              </div>
            ))}
            {!subscriptions.length ? <p className="text-[12.5px] text-ghost-muted">No subscriptions yet.</p> : null}
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Renewal information" caption="What happens next" />
            <div className="mt-4 space-y-4">
              <KeyValue label="Cycle ends" value={current ? formatDate(current.endDate) : "—"} />
              <KeyValue label="Days remaining" value={`${Math.max(0, daysLeft)} days`} mono />
              <KeyValue label="Amount due" value={inr(current?.amountDue ?? 0)} mono />
              <KeyValue label="Lifetime paid" value={inr(paidTotal)} mono />
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-card bg-pastel-lavender p-4 text-pastel-ink">
              <CalendarClock size={16} />
              <p className="text-[12px] font-semibold">
                Reminders are sent 30, 15, 7, 3 and 1 day before expiry so you never train on an inactive pass.
              </p>
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Plan benefits" caption="Included in your membership" />
            <ul className="mt-4 space-y-2.5">
              {["Full gym floor access", "App based check-in", "Progress tracking and reviews", "Group class access"].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-[12.5px] text-ghost-dim">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pastel-sage text-pastel-ink">
                    <Check size={12} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
