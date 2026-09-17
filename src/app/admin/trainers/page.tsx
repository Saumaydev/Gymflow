import Link from "next/link";
import { Dumbbell, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listTrainers, membersForPicker } from "@/lib/queries";
import { DarkPanel, MetricCard, SectionHeading } from "@/components/ui/primitives";
import { TrainerCard } from "@/components/cards";
import { AssignTrainerForm, TrainerCreator } from "@/components/admin/forms";
import { MiniChart } from "@/components/ui/charts";
import { ACCENT } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const admin = await requireAdmin();
  const [trainers, members] = await Promise.all([listTrainers(admin.gymId), membersForPicker(admin.gymId)]);

  const assigned = trainers.reduce((sum, trainer) => sum + trainer.assigned, 0);
  const average = trainers.length
    ? Math.round(trainers.reduce((sum, trainer) => sum + trainer.attendance_rate, 0) / trainers.length)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Trainers</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Coaching roster, attendance and contracts</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AssignTrainerForm trainers={trainers.map((t) => ({ id: t.id, name: t.name }))} members={members.map((m) => ({ id: m.id, name: m.name, memberCode: m.code }))} />
          <TrainerCreator />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard accent="cyan" label="Active Trainers" value={String(trainers.length)} caption="On the floor this month" icon={<Dumbbell size={16} />} />
        <MetricCard accent="lavender" label="Assigned Members" value={String(assigned)} caption="Across the coaching team" icon={<Users size={16} />} />
        <MetricCard accent="cream" label="Average Attendance" value={`${average}%`} caption="Last 30 days" icon={<Dumbbell size={16} />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trainers.map((trainer, index) => (
          <TrainerCard key={trainer.id} index={index} trainer={trainer} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DarkPanel>
          <SectionHeading title="Attendance vs roster" caption="Assigned members and punctuality" />
          <div className="mt-5 space-y-4">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="flex items-center gap-4">
                <span className="w-[150px] truncate text-[12.5px] text-ghost-dim">{trainer.name}</span>
                <div className="flex-1">
                  <MiniChart data={[60, 66, 71, 78, trainer.attendance_rate]} accent={ACCENT.blue} height={30} strokeWidth={2} fill={false} />
                </div>
                <span className="gf-num w-10 text-right text-[12px] text-ghost">{trainer.attendance_rate}%</span>
              </div>
            ))}
          </div>
        </DarkPanel>
        <DarkPanel>
          <SectionHeading title="Contracts" caption="Employment, salary and working hours" />
          <div className="mt-4 space-y-3">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 p-4">
                <div>
                  <p className="text-[13px] font-semibold text-ghost">{trainer.name}</p>
                  <p className="text-[11.5px] text-ghost-muted">
                    {(trainer.employment_type ?? "FULL_TIME").replace("_", " ")} · until {trainer.contract_end ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="gf-num text-[13px] font-semibold text-ghost">₹{trainer.salary ?? 0}</span>
                  <Link href={`/admin/trainers/${trainer.id}`} className="text-[11.5px] font-semibold text-ghost-dim hover:text-ghost">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </DarkPanel>
      </div>
    </div>
  );
}
