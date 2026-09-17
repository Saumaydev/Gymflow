import Link from "next/link";
import { CheckCircle2, Compass, Sparkles, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/primitives";
import { GymProfileForm } from "@/components/admin/forms";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const admin = await requireAdmin();

  const steps = [
    { icon: Sparkles, title: "Configure the gym", detail: "Name, contact, opening hours and logo mark." },
    { icon: Compass, title: "Publish membership plans", detail: "Basic, Standard, Premium and VIP pricing." },
    { icon: UserPlus, title: "Add your first member", detail: "Generate the member code and login." },
    { icon: CheckCircle2, title: "Start collecting", detail: "Record payments and mark attendance." },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ghost-muted">Setup</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ghost">Welcome to GymFlow</h1>
          <p className="mt-1 text-[13.5px] text-ghost-dim">Run your gym smarter — four quick steps.</p>
        </div>
        <Link href="/admin" className="rounded-pill border border-white/8 bg-white/5 px-4 py-2.5 text-[12.5px] font-semibold text-ghost-dim transition hover:bg-white/10">
          Skip to dashboard
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="gf-hairline rounded-card bg-panel/80 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-ghost">
              <step.icon size={17} strokeWidth={1.7} />
            </span>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ghost-muted">Step {index + 1}</p>
            <p className="mt-1.5 text-[14px] font-semibold text-ghost">{step.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ghost-dim">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <SectionHeading title="Gym profile" caption="These values power receipts, reminders and reports." />
        <div className="mt-4">
          <GymProfileForm
            mode="onboarding"
            gym={{
              name: admin.gym.name,
              tagline: admin.gym.tagline,
              phone: admin.gym.phone ?? "",
              email: admin.gym.email ?? "",
              address: admin.gym.address ?? "",
              openingHours: admin.gym.openingHours ?? "",
              inactivityDays: admin.gym.inactivityDays,
              expiringThresholdDays: admin.gym.expiringThresholdDays,
              reminderDays: admin.gym.reminderDays,
            }}
          />
        </div>
      </div>
    </div>
  );
}
