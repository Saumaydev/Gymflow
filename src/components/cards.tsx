import Link from "next/link";
import { CalendarClock, CreditCard, Dumbbell, MapPin, TrendingUp } from "lucide-react";
import { Avatar, IconTile, Pill, ProgressBar, StatusDot } from "@/components/ui/primitives";
import { formatShortDate, inr, relativeDay } from "@/lib/format";
import { pastelBg, pastelFor } from "@/lib/tokens";

/* ------------------------------------------------------------------ */
/* Member card (PRD §29)                                               */
/* ------------------------------------------------------------------ */

export function MemberCard({
  member,
  index = 0,
}: {
  member: {
    id: number;
    name: string;
    memberCode: string;
    status: string;
    profileImage?: string | null;
    accountStatus?: string;
    plan: string | null;
    daysLeft: number | null;
    amountDue: number;
    visits: number;
    endDate?: string | null;
    trainerName?: string | null;
  };
  index?: number;
}) {
  const accent = pastelFor(index + member.memberCode);
  return (
    <Link
      href={`/admin/members/${member.id}`}
      className={`group block rounded-card border border-white/25 ${pastelBg[accent]} p-5 text-pastel-ink shadow-float transition-all duration-300 hover:-translate-y-1 hover:shadow-lift`}
    >
      <div className="flex items-start justify-between">
        <Avatar
          name={member.name}
          size={46}
          accent={accent}
          src={member.profileImage}
          subtitle={`${member.memberCode} · ${member.plan ?? "No plan"}`}
          className={member.profileImage ? "border-2 border-white/70" : "bg-white/60"}
        />
        <span className="text-[11px] font-semibold text-pastel-ink/50">{member.memberCode}</span>
      </div>
      <p className="mt-4 truncate text-[15.5px] font-semibold">{member.name}</p>
      <p className="mt-0.5 text-[12px] font-medium text-pastel-ink/60">{member.plan ?? "No active plan"}</p>

      <div className="mt-4 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${member.status === "ACTIVE" ? "bg-[#2f7d5c]" : "bg-pastel-ink/35"}`} />
        <span className="text-[11.5px] font-semibold text-pastel-ink/70">
          {member.status === "ACTIVE" ? "Active" : member.status.toLowerCase()}
        </span>
        {member.accountStatus === "INACTIVE" || member.status === "INACTIVE" ? (
          <span className="ml-auto rounded-pill bg-pastel-ink/85 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-pastel-cream">
            Deactivated
          </span>
        ) : member.amountDue > 0 ? (
          <span className="ml-auto rounded-pill bg-white/70 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide">
            {inr(member.amountDue)} due
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <ProgressBar
          value={member.daysLeft !== null && member.daysLeft > 0 ? Math.min(100, (member.daysLeft / 30) * 100) : 4}
          accent="rgba(24,24,28,.72)"
        />
        <div className="mt-2 flex items-center justify-between text-[11.5px] font-medium text-pastel-ink/65">
          <span>{member.daysLeft !== null && member.daysLeft > 0 ? `${member.daysLeft} days remaining` : "Renewal required"}</span>
          <span>{member.visits} visits</span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Trainer card (PRD §40)                                              */
/* ------------------------------------------------------------------ */

export function TrainerCard({
  trainer,
  index = 0,
}: {
  trainer: {
    id: number;
    name: string;
    trainer_code: string;
    specialization: string | null;
    experience_years: number;
    profile_image?: string | null;
    assigned: number;
    attendance_rate: number;
    employment_type?: string | null;
  };
  index?: number;
}) {
  const accent = pastelFor(index + 3);
  return (
    <Link
      href={`/admin/trainers/${trainer.id}`}
      className={`block rounded-card border border-white/25 ${pastelBg[accent]} p-5 text-pastel-ink shadow-float transition-all duration-300 hover:-translate-y-1 hover:shadow-lift`}
    >
      <div className="flex items-start justify-between">
        <Avatar
          name={trainer.name}
          size={46}
          accent={accent}
          src={trainer.profile_image}
          subtitle={trainer.specialization ?? "Coach"}
          className={trainer.profile_image ? "border-2 border-white/70" : "bg-white/60"}
        />
        <span className="text-[11px] font-semibold text-pastel-ink/50">{trainer.trainer_code}</span>
      </div>
      <p className="mt-4 truncate text-[15.5px] font-semibold">{trainer.name}</p>
      <p className="mt-0.5 text-[12px] font-medium text-pastel-ink/60">{trainer.specialization ?? "Coach"}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Members", value: trainer.assigned },
          { label: "Attendance", value: `${trainer.attendance_rate}%` },
          { label: "Years", value: trainer.experience_years },
        ].map((stat) => (
          <div key={stat.label} className="rounded-card bg-white/55 px-2 py-2.5">
            <p className="gf-num text-[15px] font-semibold">{stat.value}</p>
            <p className="text-[10.5px] font-semibold text-pastel-ink/55">{stat.label}</p>
          </div>
        ))}
      </div>
      {trainer.employment_type ? (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-pastel-ink/50">
          {trainer.employment_type.replace("_", " ")}
        </p>
      ) : null}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Payment row (PRD §33)                                               */
/* ------------------------------------------------------------------ */

export function PaymentRow({
  payment,
  index = 0,
}: {
  payment: {
    id: number;
    member_name: string;
    member_code?: string;
    plan_name?: string | null;
    amount: number;
    method: string;
    paymentDate: Date;
    receipt_number: string;
    notes?: string | null;
  };
  index?: number;
}) {
  const accent = pastelFor(index + payment.member_name);
  return (
    <div className={`flex items-center gap-4 rounded-card border border-white/25 ${pastelBg[accent]} p-4 text-pastel-ink transition hover:-translate-y-0.5`}>
      <IconTile accent="dark" size="md" className="bg-white/60 text-pastel-ink">
        <CreditCard size={16} strokeWidth={1.8} />
      </IconTile>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{payment.member_name}</p>
        <p className="truncate text-[11.5px] font-medium text-pastel-ink/60">
          {payment.plan_name ?? payment.notes ?? "Membership"} · {payment.method} · {formatShortDate(payment.paymentDate)}
        </p>
      </div>
      <div className="text-right">
        <p className="gf-num text-[16px] font-semibold">{inr(payment.amount)}</p>
        <Link href={`/admin/payments/${payment.id}/receipt`} className="text-[11px] font-semibold text-pastel-ink/60 underline decoration-pastel-ink/30">
          {payment.receipt_number}
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subscription row                                                    */
/* ------------------------------------------------------------------ */

export function SubscriptionRow({
  subscription,
}: {
  subscription: {
    id: number;
    member_name: string;
    member_code: string;
    plan_name: string;
    end_date: string;
    days_left: number;
    price: number;
    discount: number;
    amount_paid: number;
    amount_due: number;
    status: string;
  };
}) {
  const total = subscription.price - subscription.discount;
  return (
    <div className="gf-hairline flex flex-wrap items-center gap-4 rounded-card bg-panel/80 p-4">
      <Avatar name={subscription.member_name} size={40} />
      <div className="min-w-[160px] flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ghost">{subscription.member_name}</p>
        <p className="text-[11.5px] text-ghost-muted">
          {subscription.member_code} · {subscription.plan_name}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-ghost-dim">
        <CalendarClock size={14} />
        {formatShortDate(subscription.end_date)}
        <span className="text-ghost-muted">({relativeDay(subscription.end_date)})</span>
      </div>
      <div className="min-w-[150px]">
        <ProgressBar
          value={(subscription.amount_paid / Math.max(1, total)) * 100}
          accent={subscription.amount_due === 0 ? "#82D6B2" : "#9D8AFF"}
          track="rgba(255,255,255,.08)"
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ghost-muted">
          <span>{inr(subscription.amount_paid)} paid</span>
          <span>{subscription.amount_due > 0 ? `${inr(subscription.amount_due)} due` : "settled"}</span>
        </div>
      </div>
      <StatusDot status={subscription.status} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

export function InsightCard({
  icon,
  title,
  detail,
  cta,
  href,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  cta: string;
  href: string;
  accent: string;
}) {
  return (
    <div className={`rounded-card border border-white/25 ${pastelBg[accent as keyof typeof pastelBg]} p-5 text-pastel-ink shadow-float`}>
      <IconTile accent="dark" size="md" className="bg-white/60 text-pastel-ink">
        {icon}
      </IconTile>
      <p className="mt-4 text-[14px] font-semibold leading-snug">{title}</p>
      <p className="mt-1 text-[11.5px] text-pastel-ink/60">{detail}</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-9 items-center rounded-pill bg-white/70 px-3.5 text-[11.5px] font-bold uppercase tracking-wide text-pastel-ink"
      >
        {cta}
      </Link>
    </div>
  );
}

export function TimePill({ value }: { value: string }) {
  return (
    <Pill tone="info">
      <TrendingUp size={12} /> {value}
    </Pill>
  );
}

export function LocationLine({ address }: { address: string | null }) {
  return (
    <p className="flex items-center gap-2 text-[12px] text-ghost-muted">
      <MapPin size={13} /> {address ?? "Add a gym address in settings"}
    </p>
  );
}

export function TrainerMini({
  name,
  specialization,
  src,
}: {
  name: string;
  specialization?: string | null;
  src?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-white/8 bg-white/4 p-3">
      <Avatar name={name} size={36} accent="lavender" src={src} subtitle={specialization ?? "Coach"} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-ghost">{name}</p>
        <p className="truncate text-[11px] text-ghost-muted">{specialization ?? "Coach"}</p>
      </div>
      <Dumbbell size={15} className="ml-auto text-ghost-muted" />
    </div>
  );
}
