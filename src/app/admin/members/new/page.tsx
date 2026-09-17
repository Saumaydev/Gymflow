import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { plansForPicker, trainersForPicker } from "@/lib/queries";
import { MemberWizard, type WizardPlan } from "@/components/admin/MemberWizard";

export const dynamic = "force-dynamic";

export default async function NewMemberPage() {
  const admin = await requireAdmin();
  const [plans, trainers] = await Promise.all([plansForPicker(admin.gymId), trainersForPicker(admin.gymId)]);

  const wizardPlans: WizardPlan[] = plans.map((plan, index) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    durationDays: plan.durationDays,
    description:
      index === 0
        ? "Gym floor access with cardio and strength zones"
        : index === 1
          ? "Floor access plus two group classes each week"
          : "Coaching, classes and progress reviews",
    features: ["Gym floor access", "App check-in", "Locker room", "Progress tracking"],
    accent: "cyan",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/members" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ghost-dim hover:text-ghost">
            <ArrowLeft size={14} /> Back to members
          </Link>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Add member</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Five steps: personal details, plan, trainer, payment and credentials.</p>
        </div>
      </div>
      <MemberWizard plans={wizardPlans} trainers={trainers} />
    </div>
  );
}
