import Image from "next/image";
import { redirect } from "next/navigation";
import { Activity, BadgeIndianRupee, Users } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas-dark">
      <div className="gf-ambient">
        <span className="gf-glow-blue" style={{ top: "-220px", left: "-160px" }} />
        <span className="gf-glow-purple" style={{ bottom: "-260px", right: "-120px" }} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1280px] items-center gap-10 px-5 py-10 lg:grid-cols-[1.15fr_1fr] lg:px-10">
        {/* Dark fitness/product hero */}
        <section className="relative">
          <div className="flex items-center gap-3">
            <span className="gf-num flex h-11 w-11 items-center justify-center rounded-card bg-pastel-cyan text-[15px] font-semibold text-pastel-ink">
              GF
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-ghost">GymFlow</p>
              <p className="text-[11.5px] text-ghost-muted">Gym operating system</p>
            </div>
          </div>

          <h1 className="mt-8 max-w-xl text-[34px] font-semibold leading-[1.08] tracking-tight text-ghost sm:text-[46px]">
            Run your gym.
            <br />
            Know your numbers.
            <br />
            <span className="text-ghost-dim">Grow your community.</span>
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-ghost-dim">
            Members, trainers, subscriptions, partial payments, attendance and analytics — one premium control
            center for your fitness business.
          </p>

          <div className="relative mt-10 hidden h-[300px] lg:block">
            <div className="relative h-full w-full overflow-hidden rounded-hero border border-white/8">
              <Image
                src="/images/login-hero.jpg"
                alt="Dark premium gym floor"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 640px"
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-canvas-dark via-canvas-dark/40 to-transparent" />
            </div>

            {/* Floating pastel metric surfaces */}
            <div className="absolute -bottom-8 left-6 w-[188px] animate-[float-slow_9s_ease-in-out_infinite] rounded-card border border-white/25 bg-pastel-cyan p-4 text-pastel-ink shadow-lift">
              <Users size={16} />
              <p className="gf-num mt-3 text-[26px] font-semibold leading-none">486</p>
              <p className="mt-1 text-[12px] font-semibold text-pastel-ink/70">Members tracked</p>
            </div>
            <div className="absolute -bottom-4 left-[220px] w-[176px] rounded-card border border-white/25 bg-pastel-lavender p-4 text-pastel-ink shadow-lift">
              <BadgeIndianRupee size={16} />
              <p className="gf-num mt-3 text-[24px] font-semibold leading-none">₹4.82L</p>
              <p className="mt-1 text-[12px] font-semibold text-pastel-ink/70">Revenue this month</p>
            </div>
            <div className="absolute right-4 top-6 w-[168px] rounded-card border border-white/25 bg-pastel-blush p-4 text-pastel-ink shadow-lift">
              <Activity size={16} />
              <p className="gf-num mt-3 text-[24px] font-semibold leading-none">39.4%</p>
              <p className="mt-1 text-[12px] font-semibold text-pastel-ink/70">Today’s attendance</p>
            </div>
          </div>
        </section>

        {/* Pastel login surface */}
        <section className="w-full">
          <div className="rounded-hero border border-white/25 bg-pastel-cream p-6 text-pastel-ink shadow-lift sm:p-8">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-pastel-ink/50">GymFlow console</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-[13px] text-pastel-ink/60">Sign in to manage your gym, members and money.</p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
          <p className="mt-5 text-center text-[11.5px] text-ghost-muted">
            Secure, role-aware access · members only ever see their own data
          </p>
        </section>
      </div>
    </div>
  );
}
