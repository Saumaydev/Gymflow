import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BadgeIndianRupee,
  CalendarClock,
  Dumbbell,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getMemberProfile, plansForPicker, trainersForPicker } from "@/lib/queries";
import { Avatar, DarkPanel, GlassLink, IconTile, KeyValue, PastelCard, Pill, ProgressBar, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { Timer } from "lucide-react";
import { AssignTrainerForm, RecordPaymentForm, SubscriptionActions } from "@/components/admin/forms";
import { MemberPassMini } from "@/components/ui/MemberPass";
import { AvatarUploader } from "@/components/admin/AvatarUploader";
import { AccountDangerZone, CredentialsCard } from "@/components/admin/AccountControls";
import { MemberCard } from "@/components/cards";
import { formatDate, formatTime, inr, relativeDay } from "@/lib/format";
import { ACCENT } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const TABS = ["Overview", "Membership", "Payments", "Attendance", "Trainer", "Activity"] as const;

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { tab } = await searchParams;
  const memberId = Number.parseInt(id, 10);
  if (!Number.isFinite(memberId)) notFound();

  const [profile, plans, trainers] = await Promise.all([
    getMemberProfile(admin.gymId, memberId),
    plansForPicker(admin.gymId),
    trainersForPicker(admin.gymId),
  ]);
  if (!profile) notFound();

  const activeTab = (TABS.find((t) => t.toLowerCase() === (tab ?? "overview").toLowerCase()) ?? "Overview") as (typeof TABS)[number];
  const { member, user, current, payments, visits, trainer, activity, daysLeft, attendanceRate, subscriptions } = profile;
  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const visitMap = new Map(visits.map((visit) => [visit.date, visit]));

  return (
    <div className="space-y-5">
      <Link href="/admin/members" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ghost-dim hover:text-ghost">
        <ArrowLeft size={14} /> Back to members
      </Link>

      {/* Header */}
      <DarkPanel elevated>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <Avatar
              name={member.name}
              size={68}
              accent="cyan"
              src={member.profileImage}
              subtitle={`${member.memberCode} · joined ${formatDate(member.joiningDate)}`}
              className={member.profileImage ? "border-2 border-white/25" : "gf-num bg-pastel-cyan text-pastel-ink"}
            />
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-ghost">{member.name}</h1>
              <p className="mt-1 text-[13px] text-ghost-dim">
                {member.memberCode} · joined {formatDate(member.joiningDate)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusDot status={member.status === "INACTIVE" ? "INACTIVE" : (current?.status ?? member.status)} />
                <Pill tone="info">{current?.planName ?? "No plan"}</Pill>
                {member.status === "INACTIVE" ? <Pill tone="danger">Deactivated</Pill> : null}
                {current && current.amountDue > 0 ? <Pill tone="warning">{inr(current.amountDue)} due</Pill> : <Pill tone="positive">Payments settled</Pill>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <RecordPaymentForm
              members={[{ id: member.id, name: member.name, memberCode: member.memberCode }]}
              defaultMemberId={member.id}
              pendingOptions={
                current
                  ? [
                      {
                        id: current.id,
                        memberId: member.id,
                        memberName: member.name,
                        planName: current.planName ?? "Membership",
                        total: current.price - current.discount,
                        paid: current.amountPaid,
                        due: current.amountDue,
                      },
                    ]
                  : []
              }
            />
            <GlassLink href="/admin/attendance?mark=1">
              <ShieldCheck size={15} /> Check-in
            </GlassLink>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PastelCard accent="cyan" className="p-5">
            <div className="flex items-center justify-between">
              <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                <Activity size={14} />
              </IconTile>
              <span className="text-[11px] font-semibold text-pastel-ink/50">Attendance</span>
            </div>
            <p className="gf-num mt-3 text-[26px] font-semibold leading-none">{attendanceRate}%</p>
            <p className="mt-1 text-[11.5px] text-pastel-ink/60">{profile.visitsLast30} visits in 30 days</p>
          </PastelCard>
          <PastelCard accent="lavender" className="p-5">
            <div className="flex items-center justify-between">
              <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                <CalendarClock size={14} />
              </IconTile>
              <span className="text-[11px] font-semibold text-pastel-ink/50">Days left</span>
            </div>
            <p className="gf-num mt-3 text-[26px] font-semibold leading-none">{Math.max(0, daysLeft)}</p>
            <p className="mt-1 text-[11.5px] text-pastel-ink/60">{current ? `ends ${formatDate(current.endDate)}` : "no active cycle"}</p>
          </PastelCard>
          <PastelCard accent="blush" className="p-5">
            <div className="flex items-center justify-between">
              <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                <BadgeIndianRupee size={14} />
              </IconTile>
              <span className="text-[11px] font-semibold text-pastel-ink/50">Payment</span>
            </div>
            <p className="gf-num mt-3 text-[22px] font-semibold leading-none">{current && current.amountDue === 0 ? "Paid" : inr(current?.amountDue ?? 0)}</p>
            <p className="mt-1 text-[11.5px] text-pastel-ink/60">{inr(paidTotal)} lifetime collected</p>
          </PastelCard>
          <PastelCard accent="cream" className="p-5">
            <div className="flex items-center justify-between">
              <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                <Dumbbell size={14} />
              </IconTile>
              <span className="text-[11px] font-semibold text-pastel-ink/50">Trainer</span>
            </div>
            <p className="mt-3 truncate text-[18px] font-semibold leading-none">{trainer?.name.split(" ")[0] ?? "None"}</p>
            <p className="mt-1 text-[11.5px] text-pastel-ink/60">{trainer?.specialization ?? "Assign a coach"}</p>
          </PastelCard>
        </div>
      </DarkPanel>

      {/* Tabs */}
      <div className="gf-scroll-x flex gap-2">
        {TABS.map((item) => (
          <Link
            key={item}
            href={`/admin/members/${member.id}?tab=${item.toLowerCase()}`}
            className={`shrink-0 rounded-pill px-4 py-2.5 text-[12.5px] font-semibold transition ${
              activeTab === item ? "bg-ghost text-pastel-ink" : "border border-white/8 bg-white/5 text-ghost-dim hover:bg-white/10"
            }`}
          >
            {item}
          </Link>
        ))}
      </div>

      {activeTab === "Overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <DarkPanel>
            <SectionHeading title="Contact and personal" caption="Member profile record" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <KeyValue label="Phone" value={<span className="inline-flex items-center gap-2"><Phone size={13} />{member.phone ?? "—"}</span>} />
              <KeyValue label="Email" value={<span className="inline-flex items-center gap-2"><Mail size={13} />{user?.email ?? member.email ?? "—"}</span>} />
              <KeyValue label="Date of birth" value={member.dob ? formatDate(member.dob) : "—"} />
              <KeyValue label="Gender" value={member.gender ?? "—"} />
              <KeyValue label="Emergency contact" value={member.emergencyContact ?? "—"} />
              <KeyValue label="Address" value={<span className="inline-flex items-start gap-2"><MapPin size={13} className="mt-0.5" />{member.address ?? "—"}</span>} />
            </div>
            <div className="mt-6 rounded-card border border-white/7 bg-white/4 p-5">
              <p className="text-[12.5px] font-semibold text-ghost">Subscription progress</p>
              {current ? (
                <>
                  <div className="mt-3">
                    <ProgressBar
                      value={Math.max(4, Math.min(100, (1 - Math.max(0, daysLeft) / Math.max(1, current.durationDays ?? 30)) * 100))}
                      accent={ACCENT.blue}
                      track="rgba(255,255,255,.08)"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11.5px] text-ghost-muted">
                    <span>{formatDate(current.startDate)}</span>
                    <span>{current.planName}</span>
                    <span>{formatDate(current.endDate)}</span>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[12.5px] text-ghost-muted">No subscription on record.</p>
              )}
            </div>
          </DarkPanel>

          <div className="space-y-5">
            <DarkPanel>
              <SectionHeading title="Photo" caption="Uploaded by the gym — shown in every panel" />
              <div className="mt-4">
                <AvatarUploader
                  name={member.name}
                  scope="members"
                  initialUrl={member.profileImage}
                  persistTo={{ kind: "member", id: member.id }}
                  size={76}
                  label="Member photo"
                />
              </div>
            </DarkPanel>

            <DarkPanel>
              <SectionHeading title="Credentials" caption="Owner-only visibility" />
              <div className="mt-4">
                <CredentialsCard
                  kind="member"
                  id={member.id}
                  name={member.name}
                  email={user?.email ?? member.email}
                  storedPassword={profile.storedPassword}
                />
              </div>
            </DarkPanel>

            <DarkPanel>
              <SectionHeading title="Account controls" caption="Deactivate or remove this member" />
              <div className="mt-4">
                <AccountDangerZone
                  kind="member"
                  id={member.id}
                  name={member.name}
                  code={member.memberCode}
                  email={user?.email ?? member.email}
                  storedPassword={profile.storedPassword}
                  active={member.status !== "INACTIVE"}
                  redirectTo="/admin/members"
                />
              </div>
            </DarkPanel>

            <DarkPanel>
              <SectionHeading
                title="Check-in pass"
                caption="Scan at the desk, or print for the member"
                action={<Pill tone="info">QR · {member.memberCode}</Pill>}
              />
              <div className="mt-4">
                <MemberPassMini name={member.name} memberCode={member.memberCode} />
              </div>
            </DarkPanel>

            <DarkPanel>
              <SectionHeading title="Recent activity" caption="Audit trail for this member" />
              <ul className="mt-4 space-y-3">
                {activity.length ? (
                  activity.map((row) => (
                    <li key={row.id} className="flex items-start gap-3">
                      <IconTile accent="sage" size="sm">
                        <FileText size={14} />
                      </IconTile>
                      <div>
                        <p className="text-[12.5px] font-semibold text-ghost">{row.action.replace("_", " ")}</p>
                        <p className="text-[11px] text-ghost-muted">
                          {row.entityType} · {formatDate(row.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-[12.5px] text-ghost-muted">No audit entries yet. Actions performed from the console appear here.</li>
                )}
              </ul>
            </DarkPanel>
            <DarkPanel>
              <SectionHeading title="Last visits" caption="Most recent check-ins" />
              <ul className="mt-4 space-y-2.5">
                {visits.slice(0, 6).map((visit) => (
                  <li key={visit.id} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ghost-dim">{formatDate(visit.date)}</span>
                    <span className="text-ghost-muted">{visit.checkIn ? formatTime(visit.checkIn) : "—"}</span>
                    <Pill tone="neutral">{visit.method}</Pill>
                  </li>
                ))}
                {!visits.length ? <li className="text-[12.5px] text-ghost-muted">No attendance recorded yet.</li> : null}
              </ul>
            </DarkPanel>
          </div>
        </div>
      ) : null}

      {activeTab === "Membership" ? (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <DarkPanel key={sub.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-semibold text-ghost">
                    {sub.planName} · {sub.durationDays} days
                  </p>
                  <p className="mt-1 text-[12.5px] text-ghost-dim">
                    {formatDate(sub.startDate)} → {formatDate(sub.endDate)} ({relativeDay(sub.endDate)})
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Pill tone="info">{inr(sub.price - sub.discount)} payable</Pill>
                    <Pill tone={sub.amountDue === 0 ? "positive" : "warning"}>
                      {inr(sub.amountPaid)} paid · {inr(sub.amountDue)} due
                    </Pill>
                    <StatusDot status={sub.status} />
                  </div>
                </div>
                <SubscriptionActions subscriptionId={sub.id} plans={plans} memberName={member.name} />
              </div>
              <div className="mt-5">
                <ProgressBar
                  value={(sub.amountPaid / Math.max(1, sub.price - sub.discount)) * 100}
                  accent={sub.amountDue === 0 ? ACCENT.green : ACCENT.purple}
                  track="rgba(255,255,255,.08)"
                />
              </div>
            </DarkPanel>
          ))}
          {!subscriptions.length ? (
            <DarkPanel>
              <p className="text-[13px] text-ghost-dim">No subscriptions yet — create one to start billing this member.</p>
            </DarkPanel>
          ) : null}
        </div>
      ) : null}

      {activeTab === "Payments" ? (
        <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
          <DarkPanel>
            <SectionHeading
              title="Payment history"
              caption="Each transaction is stored separately, partial payments included"
              action={<RecordPaymentForm members={[{ id: member.id, name: member.name, memberCode: member.memberCode }]} defaultMemberId={member.id} pendingOptions={[]} />}
            />
            <ol className="mt-5 space-y-3">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-start gap-4 rounded-card bg-white/4 p-4">
                  <IconTile accent="cyan" size="sm">
                    <BadgeIndianRupee size={14} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ghost">
                      {formatDate(payment.paymentDate)} · {inr(payment.amount)}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ghost-muted">
                      {payment.method} · {payment.notes ?? "Membership payment"}
                    </p>
                  </div>
                  <Link
                    href={`/admin/payments/${payment.id}/receipt`}
                    className="text-[11.5px] font-semibold text-ghost-dim underline decoration-white/20 hover:text-ghost"
                  >
                    {payment.receiptNumber}
                  </Link>
                </li>
              ))}
              {!payments.length ? <li className="text-[12.5px] text-ghost-muted">No payments recorded.</li> : null}
            </ol>
          </DarkPanel>
          <DarkPanel>
            <SectionHeading title="Billing summary" caption="Lifetime value" />
            <div className="mt-5 space-y-4">
              <KeyValue label="Total collected" value={inr(paidTotal)} mono />
              <KeyValue label="Outstanding" value={inr(current?.amountDue ?? 0)} mono />
              <KeyValue label="Transactions" value={payments.length} mono />
            </div>
          </DarkPanel>
        </div>
      ) : null}

      {activeTab === "Attendance" ? (
        <DarkPanel>
          <SectionHeading title="Attendance calendar" caption="Last 30 days" />
          <div className="mt-5 grid grid-cols-7 gap-2 sm:grid-cols-10">
            {Array.from({ length: 30 }, (_, index) => {
              const day = new Date();
              day.setDate(day.getDate() - (29 - index));
              const key = day.toISOString().slice(0, 10);
              const visit = visitMap.get(key);
              return (
                <div
                  key={key}
                  className={`rounded-card p-2 text-center ${
                    visit ? "bg-pastel-sage text-pastel-ink" : "border border-white/7 bg-white/4 text-ghost-muted"
                  }`}
                >
                  <p className="gf-num text-[13px] font-semibold">{day.getDate()}</p>
                  <p className="text-[9.5px]">{visit ? (visit.checkIn ? formatTime(visit.checkIn).replace(":00", "") : "in") : "—"}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <KeyValue label="Visits (30 days)" value={profile.visitsLast30} mono />
            <KeyValue label="Attendance score" value={`${attendanceRate}%`} mono />
            <KeyValue label="Preferred slot" value="6 PM – 8 PM" />
          </div>
        </DarkPanel>
      ) : null}

      {activeTab === "Trainer" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <DarkPanel>
            <SectionHeading title="Assigned trainer" caption="Coaching relationship" />
            {trainer ? (
              <div className="mt-5 flex items-center gap-4">
                <span className="gf-num flex h-14 w-14 items-center justify-center rounded-full bg-pastel-lavender text-[17px] font-semibold text-pastel-ink">
                  {trainer.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-ghost">{trainer.name}</p>
                  <p className="text-[12px] text-ghost-dim">{trainer.specialization}</p>
                  <p className="mt-1 text-[11.5px] text-ghost-muted">Assigned {formatDate(trainer.assignedAt)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-ghost-dim">No trainer assigned yet.</p>
            )}
            <div className="mt-5">
              <AssignTrainerForm trainers={trainers} members={[{ id: member.id, name: member.name, memberCode: member.memberCode }]} />
            </div>
          </DarkPanel>
          <DarkPanel>
            <SectionHeading title="Coaching notes" caption="Visible to the admin desk only" />
            <div className="mt-4 space-y-3">
              {[
                { icon: Sparkles, text: `${attendanceRate}% attendance score over the last 30 days.` },
                { icon: Timer, text: `Prefers late evening sessions — ${visits.length} total logged visits.` },
                { icon: Dumbbell, text: trainer ? `${trainer.name} manages this member's programming.` : "Programming not assigned." },
              ].map((note, index) => (
                <div key={index} className="flex items-start gap-3 rounded-card border border-white/7 bg-white/4 p-4">
                  <IconTile accent="cream" size="sm">
                    <note.icon size={14} />
                  </IconTile>
                  <p className="text-[12.5px] text-ghost-dim">{note.text}</p>
                </div>
              ))}
            </div>
          </DarkPanel>
        </div>
      ) : null}

      {activeTab === "Activity" ? (
        <DarkPanel>
          <SectionHeading title="Audit log" caption="Server-side trail of console actions" />
          <ul className="mt-5 space-y-3">
            {activity.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 rounded-card bg-white/4 px-4 py-3">
                <span className="text-[13px] font-medium text-ghost">{row.action.replace("_", " ")}</span>
                <span className="text-[11.5px] text-ghost-muted">
                  {row.entityType} · {formatDate(row.createdAt)}
                </span>
              </li>
            ))}
            {!activity.length ? <li className="text-[12.5px] text-ghost-muted">Nothing logged yet.</li> : null}
          </ul>
        </DarkPanel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MemberCard member={{ ...member, plan: current?.planName ?? null, daysLeft, amountDue: current?.amountDue ?? 0, visits: profile.visitsLast30, endDate: current?.endDate ?? null }} />
        <DarkPanel className="sm:col-span-1 xl:col-span-3">
          <SectionHeading title="Renewal playbook" caption="Suggested next actions for this member" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-card bg-pastel-cyan p-4 text-pastel-ink">
              <p className="text-[12px] font-semibold text-pastel-ink/60">Remaining balance</p>
              <p className="gf-num mt-1 text-[20px] font-semibold">{inr(current?.amountDue ?? 0)}</p>
            </div>
            <div className="rounded-card bg-pastel-lavender p-4 text-pastel-ink">
              <p className="text-[12px] font-semibold text-pastel-ink/60">Cycle ends</p>
              <p className="mt-1 text-[16px] font-semibold">{current ? formatDate(current.endDate) : "—"}</p>
            </div>
            <div className="rounded-card bg-pastel-cream p-4 text-pastel-ink">
              <p className="text-[12px] font-semibold text-pastel-ink/60">Attendance score</p>
              <p className="gf-num mt-1 text-[20px] font-semibold">{attendanceRate}%</p>
            </div>
          </div>
        </DarkPanel>
      </div>
    </div>
  );
}
