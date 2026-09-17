import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTrainerDashboard } from "@/lib/queries";
import { CheckinStationView } from "@/components/admin/CheckinStation";
import { DarkPanel, Pill } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function TrainerStationPage() {
  const user = await requireRole("TRAINER");
  if (!user.trainer) notFound();
  const data = await getTrainerDashboard(user.gymId, user.trainer.id, user.id);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/trainer/attendance" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ghost-dim hover:text-ghost">
            <ArrowLeft size={14} /> Back to attendance
          </Link>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Coach check-in station</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">
            Scan a pass and attendance is marked instantly — only members on your roster can be checked in.
          </p>
        </div>
        <Pill tone="info">
          <Info size={11} /> {data.stats.checked_in} of {data.stats.assigned} checked in today
        </Pill>
      </div>

      <DarkPanel elevated className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-purple/10 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <CheckinStationView
            members={data.roster.map((member) => ({ id: member.id, name: member.name, memberCode: member.member_code }))}
            trainers={[{ id: user.trainer.id, name: user.name }]}
            title="Live scanner"
            subtitle="Point the member pass at the camera — the roster updates immediately, no confirmation step."
            backHref="/trainer/attendance"
          />
        </div>
      </DarkPanel>
    </div>
  );
}
