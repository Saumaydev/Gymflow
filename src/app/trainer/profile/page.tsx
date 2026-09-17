import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Dumbbell, Mail, Phone, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTrainerProfile } from "@/lib/queries";
import { DarkPanel, KeyValue, PastelCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { MemberPassMini } from "@/components/ui/MemberPass";
import { formatDate, inr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TrainerProfilePage() {
  const user = await requireRole("TRAINER");
  if (!user.trainer) notFound();
  const profile = await getTrainerProfile(user.gymId, user.trainer.id);
  if (!profile) notFound();
  const { trainer, contract, assigned, attendanceRows } = profile;
  const present = attendanceRows.filter((row) => row.status !== "ABSENT").length;
  const rate = attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Profile</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Your coaching profile, contract and performance</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <PastelCard accent="cream" hero>
          <span className="gf-num flex h-20 w-20 items-center justify-center rounded-hero bg-white/60 text-[26px] font-semibold">
            {trainer.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <p className="mt-5 text-[24px] font-semibold leading-none">{trainer.name}</p>
          <p className="mt-1.5 text-[12.5px] font-semibold text-pastel-ink/60">
            {trainer.specialization} · {trainer.trainerCode}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>{trainer.experienceYears} years experience</Pill>
            <Pill>{assigned.length} members</Pill>
            <Pill>{rate}% attendance</Pill>
          </div>
        </PastelCard>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Contact" caption="Kept in sync with the gym console" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <KeyValue label="Phone" value={<span className="inline-flex items-center gap-2"><Phone size={13} />{trainer.phone ?? "—"}</span>} />
              <KeyValue label="Email" value={<span className="inline-flex items-center gap-2"><Mail size={13} />{trainer.email ?? user.email}</span>} />
              <KeyValue label="Joined" value={formatDate(trainer.joiningDate)} />
              <KeyValue label="Gym" value={user.gym.name} />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Staff check-in pass" caption="Scan this to log your own shift attendance" />
            <div className="mt-4">
              <MemberPassMini name={trainer.name} memberCode={trainer.trainerCode} />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Contract" caption="Managed by the gym owner" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <KeyValue label="Employment" value={(contract?.employmentType ?? "FULL_TIME").replace("_", " ")} />
              <KeyValue label="Salary" value={inr(contract?.salary ?? 0)} mono />
              <KeyValue label="Commission" value={`${contract?.commissionPct ?? 0}%`} />
              <KeyValue label="Working hours" value={contract?.workingHours ?? "—"} />
              <KeyValue label="Contract end" value={contract?.contractEnd ? formatDate(contract.contractEnd) : "—"} />
              <KeyValue label="Status" value={contract?.status ?? "ACTIVE"} />
            </div>
          </DarkPanel>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/trainer/members" className="block">
              <DarkPanel className="transition hover:-translate-y-1">
                <Users size={16} className="text-accent-cyan" />
                <p className="mt-3 text-[13px] font-semibold text-ghost">Members</p>
                <p className="mt-0.5 text-[11.5px] text-ghost-muted">{assigned.length} assigned</p>
              </DarkPanel>
            </Link>
            <Link href="/trainer/attendance" className="block">
              <DarkPanel className="transition hover:-translate-y-1">
                <Activity size={16} className="text-accent-green" />
                <p className="mt-3 text-[13px] font-semibold text-ghost">Attendance</p>
                <p className="mt-0.5 text-[11.5px] text-ghost-muted">{rate}% this month</p>
              </DarkPanel>
            </Link>
            <Link href="/trainer/schedule" className="block">
              <DarkPanel className="transition hover:-translate-y-1">
                <Dumbbell size={16} className="text-accent-purple" />
                <p className="mt-3 text-[13px] font-semibold text-ghost">Schedule</p>
                <p className="mt-0.5 text-[11.5px] text-ghost-muted">Shift blocks</p>
              </DarkPanel>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
