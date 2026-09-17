import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, BadgeIndianRupee, BellRing, CalendarX2, Check, Dumbbell, Flame, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMemberDashboard } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, PastelCard, Pill, ProgressBar, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { CircularGauge } from "@/components/ui/charts";
import { MemberPassCard } from "@/components/ui/MemberPass";
import { formatDate, formatTime, inr, relativeDay } from "@/lib/format";
import { ACCENT, pastelBg, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function MemberHome() {
  const user = await requireRole("MEMBER");
  if (!user.member) notFound();
  const data = await getMemberDashboard(user.gymId, user.member.id);
  if (!data) notFound();

  const { current, daysLeft, attendanceRate, visitsLast30, payments, trainer, holidays, events, notifications, unread } = data;
  const paidUp = (current?.amountDue ?? 0) <= 0;
  const progress = current ? Math.max(4, Math.min(100, (Math.max(0, daysLeft) / Math.max(1, current.durationDays ?? 30)) * 100)) : 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  const lastVisit = data.visits[0] ?? null;
  const checkedInToday = data.visits.some((visit) => visit.date === todayIso);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ghost-muted">{user.gym.name}</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-ghost sm:text-[34px]">
            Hello {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-[13.5px] text-ghost-dim">Welcome back! Here’s your training snapshot.</p>
        </div>
        <Link
          href="/member/notifications"
          className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost-dim transition hover:bg-white/10"
        >
          <BellRing size={15} /> {unread} unread
        </Link>
      </div>

      {/* Membership card (PRD §57) */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <PastelCard accent="lavender" hero className="relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Pill>{current?.planName ?? "No active plan"}</Pill>
              <p className="gf-num mt-5 text-[54px] font-semibold leading-none tracking-tight sm:text-[64px]">
                {Math.max(0, daysLeft)}
              </p>
              <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-pastel-ink/55">days left</p>
            </div>
            <div className="text-right">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Valid until</p>
              <p className="mt-1 text-[15px] font-semibold">{current ? formatDate(current.endDate) : "—"}</p>
              <p className="mt-1 text-[11.5px] text-pastel-ink/60">{current ? `${inr(current.price - current.discount)} / cycle` : ""}</p>
            </div>
          </div>
          <div className="mt-6">
            <ProgressBar value={progress} accent="rgba(24,24,28,.78)" track="rgba(24,24,28,.12)" height={10} />
            <div className="mt-2 flex items-center justify-between text-[11.5px] font-semibold text-pastel-ink/65">
              <span>{current ? formatDate(current.startDate) : ""}</span>
              <span>{current ? formatDate(current.endDate) : ""}</span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/member/membership" className="inline-flex h-11 items-center rounded-pill bg-white/70 px-5 text-[12.5px] font-bold uppercase tracking-wide">
              View membership
            </Link>
            <Link href="/member/payments" className="inline-flex h-11 items-center rounded-pill border border-pastel-ink/15 px-5 text-[12.5px] font-bold uppercase tracking-wide text-pastel-ink/70">
              Payment history
            </Link>
          </div>
        </PastelCard>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <PastelCard accent="cyan">
            <div className="flex items-center gap-4">
              <CircularGauge value={attendanceRate} size={112} stroke={11} accent="rgba(24,24,28,.78)" trackColor="rgba(24,24,28,.12)" />
              <div>
                <p className="text-[12px] font-semibold text-pastel-ink/55">Attendance</p>
                <p className="gf-num text-[24px] font-semibold leading-none">{attendanceRate}%</p>
                <p className="mt-1 text-[11.5px] text-pastel-ink/60">{visitsLast30} visits in 30 days</p>
              </div>
            </div>
          </PastelCard>
          <PastelCard accent="cream">
            <div className="flex items-center gap-4">
              <IconTile accent="dark" size="lg" className="bg-white/60 text-pastel-ink">
                {paidUp ? <Check size={20} /> : <BadgeIndianRupee size={20} />}
              </IconTile>
              <div>
                <p className="text-[12px] font-semibold text-pastel-ink/55">Payment</p>
                <p className="text-[22px] font-semibold leading-none">{paidUp ? "Paid" : inr(current?.amountDue ?? 0)}</p>
                <p className="mt-1 text-[11.5px] text-pastel-ink/60">
                  {payments[0] ? `Last ${formatDate(payments[0].paymentDate)}` : "No payments yet"}
                </p>
              </div>
            </div>
          </PastelCard>
        </div>
      </div>

      {/* Metrics (PRD §58) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Attendance", value: `${attendanceRate}%`, caption: "Rolling 30 days", accent: "cyan" as PastelKey, icon: <Activity size={16} />, href: "/member/attendance" },
          { label: "Payments", value: paidUp ? "Paid" : inr(current?.amountDue ?? 0), caption: `${payments.length} receipts`, accent: "lavender" as PastelKey, icon: <BadgeIndianRupee size={16} />, href: "/member/payments" },
          { label: "Visits", value: String(visitsLast30), caption: "Last 30 days", accent: "sage" as PastelKey, icon: <Flame size={16} />, href: "/member/attendance" },
          { label: "Trainer", value: trainer ? trainer.name.split(" ")[0] : "None", caption: trainer?.specialization ?? "Not assigned", accent: "blush" as PastelKey, icon: <Dumbbell size={16} />, href: "/member/trainer" },
        ].map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`block rounded-card border border-white/25 ${pastelBg[metric.accent]} p-5 text-pastel-ink shadow-float transition hover:-translate-y-1`}
          >
            <div className="flex items-center justify-between">
              <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                {metric.icon}
              </IconTile>
              <span className="text-[11px] font-semibold text-pastel-ink/50">{metric.label}</span>
            </div>
            <p className="gf-num mt-4 text-[26px] font-semibold leading-none">{metric.value}</p>
            <p className="mt-1.5 text-[11.5px] text-pastel-ink/60">{metric.caption}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <DarkPanel>
          <SectionHeading
            title="Your trainer"
            caption={trainer ? "Assigned coach" : "Ask the front desk to assign a coach"}
            action={
              <Link href="/member/trainer" className="text-[12px] font-semibold text-ghost-dim hover:text-ghost">
                Open
              </Link>
            }
          />
          {trainer ? (
            <div className="mt-5 flex items-center gap-4 rounded-card border border-white/7 bg-white/4 p-5">
              <span className="gf-num flex h-16 w-16 items-center justify-center rounded-hero bg-pastel-lavender text-[20px] font-semibold text-pastel-ink">
                {trainer.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <div>
                <p className="text-[16px] font-semibold text-ghost">{trainer.name}</p>
                <p className="text-[12.5px] text-ghost-dim">
                  {trainer.specialization} · {trainer.experienceYears} years experience
                </p>
                <p className="mt-1 text-[11.5px] text-ghost-muted">Assigned {formatDate(trainer.assignedAt)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-ghost-dim">No trainer assigned yet.</p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card bg-pastel-sage p-4 text-pastel-ink">
              <p className="text-[11.5px] font-semibold text-pastel-ink/60">Check-in today</p>
              <p className="mt-1 text-[15px] font-semibold">
                {checkedInToday ? "Recorded" : "Not yet"}
              </p>
              <p className="mt-0.5 text-[11px] text-pastel-ink/60">Peak slots 6–8 PM</p>
            </div>
            <div className="rounded-card bg-pastel-lavender p-4 text-pastel-ink">
              <p className="text-[11.5px] font-semibold text-pastel-ink/60">Next renewal</p>
              <p className="mt-1 text-[15px] font-semibold">{current ? formatDate(current.endDate) : "—"}</p>
              <p className="mt-0.5 text-[11px] text-pastel-ink/60">{current ? relativeDay(current.endDate) : ""}</p>
            </div>
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading
              title="Notifications"
              caption={`${unread} unread`}
              action={
                <Link href="/member/notifications" className="text-[12px] font-semibold text-ghost-dim hover:text-ghost">
                  All
                </Link>
              }
            />
            <ul className="mt-4 space-y-3">
              {notifications.slice(0, 4).map((notification) => (
                <li
                  key={notification.id}
                  className={`rounded-card border p-4 ${
                    notification.readAt ? "border-white/7 bg-white/4" : "border-accent-blue/40 bg-accent-blue/12 shadow-glow"
                  }`}
                >
                  <p className="text-[13px] font-semibold text-ghost">{notification.title}</p>
                  <p className="mt-1 text-[11.5px] text-ghost-dim">{formatDate(notification.createdAt)}</p>
                </li>
              ))}
              {!notifications.length ? <li className="text-[12.5px] text-ghost-muted">No notifications yet.</li> : null}
            </ul>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Upcoming holiday" caption="Plan your week" />
            {holidays[0] ? (
              <div className="mt-4 rounded-card bg-pastel-blush p-5 text-pastel-ink">
                <div className="flex items-center gap-3">
                  <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                    <CalendarX2 size={14} />
                  </IconTile>
                  <p className="gf-num text-[15px] font-semibold">{formatDate(holidays[0].date, { day: "2-digit", month: "short" })}</p>
                </div>
                <p className="mt-3 text-[15px] font-semibold">{holidays[0].title}</p>
                <p className="mt-1 text-[12px] text-pastel-ink/65">{holidays[0].description ?? "Gym closed."}</p>
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] text-ghost-muted">No holidays scheduled.</p>
            )}
            <div className="mt-4 space-y-2.5">
              {events.slice(0, 2).map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-card border border-white/7 bg-white/4 p-3.5">
                  <IconTile accent="cream" size="sm">
                    <Sparkles size={14} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-ghost">{event.title}</p>
                    <p className="text-[11px] text-ghost-muted">
                      {formatDate(event.date)} · {event.eventType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Latest visits" caption="Recent check-ins" />
            <ul className="mt-4 space-y-2.5">
              {data.visits.slice(0, 5).map((visit) => (
                <li key={visit.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ghost-dim">{formatDate(visit.date)}</span>
                  <span className="text-ghost-muted">{visit.checkIn ? formatTime(visit.checkIn) : "—"}</span>
                  <StatusDot status="ACTIVE" label={visit.method} />
                </li>
              ))}
              {!data.visits.length ? <li className="text-[12.5px] text-ghost-muted">No visits recorded yet.</li> : null}
            </ul>
            <p className="mt-4 text-[11.5px] text-ghost-muted">
              Consistency score {attendanceRate}% — keep it above 70% to stay on track with {trainer?.name.split(" ")[0] ?? "your coach"}.
            </p>
          </DarkPanel>
        </div>
      </div>

      {/* Check-in pass (PRD §49) — scannable QR for the entrance / trainer */}
      <DarkPanel elevated className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-cyan/10 blur-2xl" aria-hidden="true" />
        <SectionHeading
          title="Your check-in QR"
          caption="Show this at the entrance — your trainer or the front desk scans it to mark you present"
          action={
            <Pill tone={checkedInToday ? "positive" : "info"}>
              {checkedInToday ? "Checked in today" : "Not checked in yet"}
            </Pill>
          }
        />
        <div className="relative mt-6">
          <MemberPassCard
            pass={{
              name: user.name,
              memberCode: user.member.memberCode,
              planName: current?.planName ?? "Member pass",
              status: current?.status === "EXPIRING" ? "Expiring soon" : (current?.status ?? memberStatusLabel(data.member.status)),
              meta: (
                <div className="grid gap-3 sm:grid-cols-3">
                  <KeyValue label="Valid until" value={current ? formatDate(current.endDate) : "—"} />
                  <KeyValue label="Last check-in" value={lastVisit ? `${formatDate(lastVisit.date)} · ${lastVisit.checkIn ? formatTime(lastVisit.checkIn) : "—"}` : "No visits yet"} />
                  <KeyValue label="Visits (30 days)" value={String(visitsLast30)} mono />
                </div>
              ),
            }}
          />
        </div>
      </DarkPanel>
    </div>
  );
}

function memberStatusLabel(status: string) {
  if (status === "ACTIVE") return "Active";
  if (status === "EXPIRED") return "Expired";
  return status.charAt(0) + status.slice(1).toLowerCase();
}
