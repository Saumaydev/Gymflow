import { notFound } from "next/navigation";
import { CalendarClock, Dumbbell, Mail, Phone, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMemberProfile } from "@/lib/queries";
import { Avatar, DarkPanel, IconTile, KeyValue, PastelCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberTrainerPage() {
  const user = await requireRole("MEMBER");
  if (!user.member) notFound();
  const profile = await getMemberProfile(user.gymId, user.member.id);
  if (!profile) notFound();
  const { trainer } = profile;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">My trainer</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Coaching relationship and contact details</p>
      </div>

      {trainer ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <PastelCard accent="lavender" hero>
            <Avatar
              name={trainer.name}
              size={96}
              src={trainer.profileImage}
              subtitle={trainer.specialization ?? "Coach"}
              className={trainer.profileImage ? "border-2 border-white/70" : "bg-white/60"}
            />
            <p className="mt-5 text-[24px] font-semibold leading-none">{trainer.name}</p>
            <p className="mt-1.5 text-[13px] font-semibold text-pastel-ink/65">{trainer.specialization}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>{trainer.experienceYears} years experience</Pill>
              <Pill>Assigned {formatDate(trainer.assignedAt)}</Pill>
            </div>
          </PastelCard>

          <div className="space-y-5">
            <DarkPanel>
              <SectionHeading title="Contact" caption="Reach your coach" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <KeyValue label="Phone" value={<span className="inline-flex items-center gap-2"><Phone size={13} />{trainer.phone ?? "—"}</span>} />
                <KeyValue label="Email" value={<span className="inline-flex items-center gap-2"><Mail size={13} />{trainer.email ?? "—"}</span>} />
              </div>
            </DarkPanel>

            <DarkPanel>
              <SectionHeading title="Programme" caption="What your coach is running with you" />
              <div className="mt-4 space-y-3">
                {[
                  { icon: Dumbbell, title: "Strength block", detail: "Progressive overload on the big four, reviewed every 4 weeks." },
                  { icon: CalendarClock, title: "Session cadence", detail: "Coach is on the floor 6 AM – 2 PM and 3 PM – 10 PM." },
                  { icon: Sparkles, title: "Progress review", detail: "Monthly composition check with your programme notes." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-card border border-white/7 bg-white/4 p-4">
                    <IconTile accent="cyan" size="sm">
                      <item.icon size={14} />
                    </IconTile>
                    <div>
                      <p className="text-[13px] font-semibold text-ghost">{item.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-ghost-muted">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DarkPanel>
          </div>
        </div>
      ) : (
        <DarkPanel>
          <SectionHeading title="No trainer assigned" caption="Ask the front desk to pair you with a coach" />
          <p className="mt-3 text-[13px] text-ghost-dim">
            Coaching assignment is managed by the gym. Speak to the team about strength, conditioning or recovery specialists.
          </p>
        </DarkPanel>
      )}
    </div>
  );
}
