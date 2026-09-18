import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Dumbbell, Mail, Phone, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getTrainerProfile, membersForPicker } from "@/lib/queries";
import { Avatar, DarkPanel, IconTile, KeyValue, MetricCard, Pill, ProgressBar, SectionHeading } from "@/components/ui/primitives";
import { AssignTrainerForm } from "@/components/admin/forms";
import { AvatarUploader } from "@/components/admin/AvatarUploader";
import { AccountDangerZone, CredentialsCard } from "@/components/admin/AccountControls";
import { formatDate, formatTime, inr, pct } from "@/lib/format";
import { ACCENT } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function TrainerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const trainerId = Number.parseInt(id, 10);
  if (!Number.isFinite(trainerId)) notFound();

  const [profile, members] = await Promise.all([getTrainerProfile(admin.gymId, trainerId), membersForPicker(admin.gymId)]);
  if (!profile) notFound();

  const { trainer, contract, assigned, attendanceRows } = profile;
  const present = attendanceRows.filter((row) => row.status !== "ABSENT").length;
  const late = attendanceRows.filter((row) => row.status === "LATE").length;
  const rate = pct(present, Math.max(1, attendanceRows.length));
  const checkedInToday = assigned.filter((member) => member.present_today).length;

  return (
    <div className="space-y-5">
      <Link href="/admin/trainers" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ghost-dim hover:text-ghost">
        <ArrowLeft size={14} /> Back to trainers
      </Link>

      <DarkPanel elevated>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <Avatar
              name={trainer.name}
              size={68}
              accent="lavender"
              src={trainer.profileImage}
              subtitle={trainer.specialization ?? "Coach"}
              className={trainer.profileImage ? "border-2 border-white/25" : "gf-num bg-pastel-lavender text-pastel-ink"}
            />
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-ghost">{trainer.name}</h1>
              <p className="mt-1 text-[13px] text-ghost-dim">
                {trainer.trainerCode} · {trainer.specialization} · {trainer.experienceYears} years experience
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Pill tone="positive">{rate}% attendance</Pill>
                <Pill tone="info">{assigned.length} members</Pill>
                <Pill tone="neutral">joined {formatDate(trainer.joiningDate)}</Pill>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <AssignTrainerForm
              trainers={[{ id: trainer.id, name: trainer.name }]}
              members={members.map((m) => ({ id: m.id, name: m.name, memberCode: m.code }))}
              defaultTrainerId={trainer.id}
              trainerName={trainer.name}
            />
            <Link href="/admin/trainers" className="inline-flex h-11 items-center rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost-dim hover:bg-white/10">
              All trainers
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard accent="cyan" label="Assigned Members" value={String(assigned.length)} caption={`${checkedInToday} checked in today`} icon={<Users size={16} />} />
          <MetricCard accent="lavender" label="Attendance" value={`${rate}%`} caption={`${present} present · ${late} late`} icon={<CheckCircle2 size={16} />} />
          <MetricCard accent="cream" label="Experience" value={`${trainer.experienceYears}y`} caption={trainer.specialization ?? "Coach"} icon={<Dumbbell size={16} />} />
          <MetricCard accent="blush" label="Salary" value={inr(contract?.salary ?? 0)} caption={`${contract?.commissionPct ?? 0}% commission`} icon={<CalendarClock size={16} />} />
        </div>
      </DarkPanel>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <DarkPanel>
          <SectionHeading title="Assigned members" caption="Roster with attendance health" />
          <div className="mt-4 space-y-3">
            {assigned.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center gap-4 rounded-card border border-white/7 bg-white/4 p-4">
                <Avatar
                  name={member.name}
                  size={36}
                  accent={member.present_today ? "sage" : "lavender"}
                  src={member.profile_image}
                  subtitle={member.plan_name ?? undefined}
                />
                <div className="min-w-[140px] flex-1">
                  <p className="truncate text-[13px] font-semibold text-ghost">{member.name}</p>
                  <p className="text-[11px] text-ghost-muted">
                    {member.member_code} · {member.plan_name ?? "No plan"}
                  </p>
                </div>
                <div className="min-w-[120px]">
                  <ProgressBar value={Math.min(100, (member.visits / 22) * 100)} accent={ACCENT.green} track="rgba(255,255,255,.08)" height={6} />
                  <p className="mt-1.5 text-[11px] text-ghost-muted">{member.visits} visits</p>
                </div>
                <Pill tone={member.present_today ? "positive" : "neutral"}>{member.present_today ? "Present today" : "Not checked in"}</Pill>
              </div>
            ))}
            {!assigned.length ? <p className="text-[13px] text-ghost-dim">No members assigned yet.</p> : null}
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Photo" caption="Shown on trainer cards and the trainer app" />
            <div className="mt-4">
              <AvatarUploader
                name={trainer.name}
                scope="trainers"
                initialUrl={trainer.profileImage}
                persistTo={{ kind: "trainer", id: trainer.id }}
                size={76}
                label="Trainer photo"
              />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Credentials" caption="Owner-only visibility" />
            <div className="mt-4">
              <CredentialsCard
                kind="trainer"
                id={trainer.id}
                name={trainer.name}
                email={trainer.email}
                storedPassword={profile.storedPassword}
              />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Account controls" caption="Deactivate or remove this coach" />
            <div className="mt-4">
              <AccountDangerZone
                kind="trainer"
                id={trainer.id}
                name={trainer.name}
                code={trainer.trainerCode}
                email={trainer.email}
                storedPassword={profile.storedPassword}
                active={trainer.status !== "INACTIVE"}
                redirectTo="/admin/trainers"
              />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Contract" caption="Employment terms" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <KeyValue label="Type" value={(contract?.employmentType ?? "FULL_TIME").replace("_", " ")} />
              <KeyValue label="Salary" value={inr(contract?.salary ?? 0)} mono />
              <KeyValue label="Commission" value={`${contract?.commissionPct ?? 0}%`} />
              <KeyValue label="Working hours" value={contract?.workingHours ?? "—"} />
              <KeyValue label="Joined" value={formatDate(contract?.joiningDate ?? trainer.joiningDate)} />
              <KeyValue label="Contract ends" value={contract?.contractEnd ? formatDate(contract.contractEnd) : "—"} />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Contact" caption="Reach the coach" />
            <div className="mt-4 space-y-3 text-[13px] text-ghost-dim">
              <p className="flex items-center gap-2">
                <Phone size={14} /> {trainer.phone ?? "—"}
              </p>
              <p className="flex items-center gap-2">
                <Mail size={14} /> {trainer.email ?? "—"}
              </p>
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Recent attendance" caption="Own check-ins" />
            <ul className="mt-4 space-y-2.5">
              {attendanceRows.slice(0, 8).map((row) => (
                <li key={row.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ghost-dim">{formatDate(row.date)}</span>
                  <span className="text-ghost-muted">{row.checkIn ? formatTime(row.checkIn) : "—"}</span>
                  <Pill tone={row.status === "LATE" ? "warning" : "positive"}>{row.status}</Pill>
                </li>
              ))}
            </ul>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
