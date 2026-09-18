import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeIndianRupee, BellRing, CalendarDays, Dumbbell } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMemberProfile } from "@/lib/queries";
import { Avatar, DarkPanel, KeyValue, PastelCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { MemberPassCard } from "@/components/ui/MemberPass";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage() {
  const user = await requireRole("MEMBER");
  if (!user.member) notFound();
  const profile = await getMemberProfile(user.gymId, user.member.id);
  if (!profile) notFound();
  const { member, current, trainer, attendanceRate, visitsLast30 } = profile;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Profile</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Your details, membership and gym relationship</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <PastelCard accent="cream" hero>
          <Avatar
            name={member.name}
            size={92}
            src={member.profileImage}
            subtitle={`${member.memberCode} · ${current?.planName ?? "No plan"}`}
            className={member.profileImage ? "border-2 border-white/70" : "bg-white/60"}
          />
          <p className="mt-5 text-[24px] font-semibold leading-none">{member.name}</p>
          <p className="mt-1.5 text-[12.5px] font-semibold text-pastel-ink/60">{member.memberCode}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>{current?.planName ?? "No plan"}</Pill>
            <Pill>{attendanceRate}% attendance</Pill>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-card bg-white/60 px-3 py-3 text-center">
              <p className="gf-num text-[16px] font-semibold">{visitsLast30}</p>
              <p className="text-[10.5px] font-semibold text-pastel-ink/55">Visits (30d)</p>
            </div>
            <div className="rounded-card bg-white/60 px-3 py-3 text-center">
              <p className="gf-num text-[16px] font-semibold">{profile.subscriptions.length}</p>
              <p className="text-[10.5px] font-semibold text-pastel-ink/55">Cycles</p>
            </div>
          </div>
        </PastelCard>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Personal details" caption="Contact the front desk to update these" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <KeyValue label="Name" value={member.name} />
              <KeyValue label="Member ID" value={member.memberCode} mono />
              <KeyValue label="Phone" value={member.phone ?? "—"} />
              <KeyValue label="Email" value={member.email ?? user.email} />
              <KeyValue label="Date of birth" value={member.dob ? formatDate(member.dob) : "—"} />
              <KeyValue label="Gender" value={member.gender ?? "—"} />
              <KeyValue label="Emergency contact" value={member.emergencyContact ?? "—"} />
              <KeyValue label="Joining date" value={formatDate(member.joiningDate)} />
              <KeyValue label="Address" value={member.address ?? "—"} />
              <KeyValue label="Gym" value={user.gym.name} />
            </div>
          </DarkPanel>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/member/membership" className="block">
              <DarkPanel className="transition hover:-translate-y-1">
                <BadgeIndianRupee size={16} className="text-accent-cyan" />
                <p className="mt-3 text-[13px] font-semibold text-ghost">Membership</p>
                <p className="mt-0.5 text-[11.5px] text-ghost-muted">{current?.planName ?? "—"}</p>
              </DarkPanel>
            </Link>
            <Link href="/member/trainer" className="block">
              <DarkPanel className="transition hover:-translate-y-1">
                <Dumbbell size={16} className="text-accent-purple" />
                <p className="mt-3 text-[13px] font-semibold text-ghost">Trainer</p>
                <p className="mt-0.5 text-[11.5px] text-ghost-muted">{trainer?.name ?? "Not assigned"}</p>
              </DarkPanel>
            </Link>
            <Link href="/member/notifications" className="block">
              <DarkPanel className="transition hover:-translate-y-1">
                <BellRing size={16} className="text-accent-green" />
                <p className="mt-3 text-[13px] font-semibold text-ghost">Notifications</p>
                <p className="mt-0.5 text-[11.5px] text-ghost-muted">Reminders & updates</p>
              </DarkPanel>
            </Link>
          </div>

          <DarkPanel>
            <SectionHeading title="Check-in QR" caption="Membership pass used at the gym entrance" />
            <div className="mt-5">
              <MemberPassCard
                pass={{
                  name: member.name,
                  memberCode: member.memberCode,
                  planName: current?.planName ?? "Member pass",
                  status: current?.status === "EXPIRING" ? "Expiring soon" : (current?.status ?? "Active"),
                  meta: <KeyValue label="Valid until" value={current ? formatDate(current.endDate) : "—"} />,
                }}
                caption="Keep this pass handy — staff scan it to mark your attendance."
              />
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Membership timeline" caption="Every cycle you have held" />
            <ul className="mt-4 space-y-2.5">
              {profile.subscriptions.slice(0, 5).map((sub) => (
                <li key={sub.id} className="flex items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={15} className="text-ghost-muted" />
                    <div>
                      <p className="text-[12.5px] font-semibold text-ghost">{sub.planName}</p>
                      <p className="text-[11px] text-ghost-muted">
                        {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                      </p>
                    </div>
                  </div>
                  <Pill tone={sub.amountDue === 0 ? "positive" : "warning"}>{sub.status}</Pill>
                </li>
              ))}
            </ul>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
