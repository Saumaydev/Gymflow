import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { membersForPicker, trainersForPicker } from "@/lib/queries";
import { CheckinStationView } from "@/components/admin/CheckinStation";
import { DarkPanel, Pill } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminStationPage() {
  const admin = await requireAdmin();
  const [members, trainers] = await Promise.all([membersForPicker(admin.gymId), trainersForPicker(admin.gymId)]);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/attendance" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ghost-dim hover:text-ghost">
            <ArrowLeft size={14} /> Back to attendance
          </Link>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Entrance station</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">
            {admin.gym.name} · continuous scanning · attendance is written the moment a pass is decoded
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="info">
            <ShieldCheck size={11} /> QR · wedge scanner · manual
          </Pill>
          <Pill tone="neutral">Opens 24/7 on the front-desk tablet</Pill>
        </div>
      </div>

      <DarkPanel elevated className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-cyan/10 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <CheckinStationView
            members={members.map((member) => ({ id: member.id, name: member.name, memberCode: member.code }))}
            trainers={trainers.map((trainer) => ({ id: trainer.id, name: trainer.name }))}
            title="Live scanner"
            subtitle="Hold the member pass inside the frame. The next person can scan immediately — no clicks required."
          />
        </div>
      </DarkPanel>
    </div>
  );
}
