"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Dumbbell, Printer, Sparkles, User } from "lucide-react";
import { Modal, toast } from "@/components/ui/overlay";
import { Field, SelectField, TextArea, TextField } from "@/components/ui/form";
import { Avatar, GlassButton, KeyValue, Pill, ProgressBar } from "@/components/ui/primitives";
import { MemberPassCard } from "@/components/ui/MemberPass";
import { AvatarUploader } from "@/components/admin/AvatarUploader";
import { inr } from "@/lib/format";

export type WizardPlan = { id: number; name: string; price: number; durationDays: number; description: string; features: string[]; accent: string };
export type WizardTrainer = { id: number; name: string; specialization: string | null };

const STEPS = ["Personal", "Membership", "Trainer", "Payment", "Account"] as const;

export function MemberWizard({ plans, trainers }: { plans: WizardPlan[]; trainers: WizardTrainer[] }) {
  const [step, setStep] = useState(0);
  const [planId, setPlanId] = useState(plans[0]?.id ?? 0);
  const [trainerId, setTrainerId] = useState(trainers[0]?.id ?? 0);
  const [discount, setDiscount] = useState(200);
  const [paid, setPaid] = useState(1500);
  const [created, setCreated] = useState<{ memberCode: string; email: string; password: string; receiptNumber: string | null } | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: "Rahul Sharma", phone: "", email: "", dob: "", gender: "Male", address: "", emergencyContact: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const total = useMemo(() => Math.max(0, (plan?.price ?? 0) - discount), [plan, discount]);
  const due = Math.max(0, total - paid);
  const progress = ((step + 1) / STEPS.length) * 100;

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit() {
    setPending(true);
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, planId, trainerId, discount, paid, method: "UPI", avatarUrl }),
      });
      const data = (await response.json()) as {
        error?: string;
        member?: { memberCode: string; email: string; password: string; id: number };
        receiptNumber?: string | null;
      };
      if (!response.ok || !data.member) throw new Error(data.error ?? "Could not create member.");
      setCreated({ memberCode: data.member.memberCode, email: data.member.email, password: data.member.password, receiptNumber: data.receiptNumber ?? null });
      toast({ title: `${data.member.memberCode} created`, message: "Login credentials generated.", tone: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Registration failed", message: (error as Error).message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="gf-hairline rounded-hero bg-panel/85 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ghost-muted">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-ghost">{STEPS[step]}</h2>
          </div>
          <div className="w-full max-w-[220px]">
            <ProgressBar value={progress} accent="#7890FF" track="rgba(255,255,255,.08)" />
          </div>
        </div>

        <div className="mt-6">
          {step === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AvatarUploader
                  name={form.name || "New Member"}
                  scope="members"
                  size={76}
                  label="Profile photo"
                  hint="Shown on the member card, their pass and the member app. Press and hold the photo to preview it."
                  onUploaded={setAvatarUrl}
                />
              </div>
              <TextField label="Full name" name="name" value={form.name} onChange={update("name")} required />
              <TextField label="Phone" name="phone" value={form.phone} onChange={update("phone")} placeholder="+91 98450 00000" />
              <TextField label="Email" name="email" type="email" value={form.email} onChange={update("email")} placeholder="member@gymflow.app" required />
              <TextField label="Date of birth" name="dob" type="date" value={form.dob} onChange={update("dob")} />
              <SelectField
                label="Gender"
                name="gender"
                defaultValue="Male"
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
              />
              <TextField label="Emergency contact" name="emergencyContact" value={form.emergencyContact} onChange={update("emergencyContact")} placeholder="+91 98110 00000" />
              <div className="sm:col-span-2">
                <TextArea label="Address" name="address" rows={2} defaultValue={form.address} placeholder="Flat, street, area, city" />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((option) => {
                const active = option.id === planId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPlanId(option.id)}
                    className={`rounded-card border p-5 text-left transition ${
                      active ? "border-white/30 bg-white/10" : "border-white/8 bg-white/4 hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ghost-dim">{option.name}</p>
                      {active ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pastel-cyan text-pastel-ink">
                          <Check size={13} />
                        </span>
                      ) : null}
                    </div>
                    <p className="gf-num mt-3 text-[24px] font-semibold text-ghost">
                      {inr(option.price)}
                      <span className="text-[12px] font-medium text-ghost-muted"> / {option.durationDays} days</span>
                    </p>
                    <p className="mt-2 text-[12px] text-ghost-dim">{option.description}</p>
                    <ul className="mt-3 space-y-1">
                      {option.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-[11.5px] text-ghost-muted">
                          <span className="h-1 w-1 rounded-full bg-accent-cyan" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              {trainers.map((trainer) => {
                const active = trainer.id === trainerId;
                return (
                  <button
                    key={trainer.id}
                    type="button"
                    onClick={() => setTrainerId(trainer.id)}
                    className={`flex items-center gap-4 rounded-card border p-4 text-left transition ${
                      active ? "border-white/30 bg-white/10" : "border-white/8 bg-white/4 hover:bg-white/8"
                    }`}
                  >
                    <Avatar name={trainer.name} size={44} accent="lavender" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ghost">{trainer.name}</p>
                      <p className="truncate text-[12px] text-ghost-dim">{trainer.specialization}</p>
                    </div>
                    {active ? <Pill tone="info">Selected</Pill> : <Dumbbell size={16} className="text-ghost-muted" />}
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="rounded-card border border-white/8 bg-white/4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <KeyValue label="Membership total" value={inr(plan?.price ?? 0)} mono />
                  <KeyValue label="Discount" value={inr(discount)} mono />
                  <KeyValue label="Final payable" value={inr(total)} mono />
                  <KeyValue label="Collecting now" value={inr(paid)} mono />
                </div>
                <div className="mt-4">
                  <ProgressBar value={(paid / Math.max(1, total)) * 100} accent="#82D6B2" track="rgba(255,255,255,.08)" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[12.5px]">
                  <span className="text-ghost-dim">
                    Balance after payment: <span className="gf-num font-semibold text-ghost">{inr(due)}</span>
                  </span>
                  <Pill tone={due === 0 ? "positive" : "warning"}>{due === 0 ? "Paid" : "Partial"}</Pill>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={`Discount (₹) — max ${inr(plan?.price ?? 0)}`}>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, (plan?.price ?? 0) / 2)}
                    step={100}
                    value={discount}
                    onChange={(event) => setDiscount(Number(event.target.value))}
                    className="mt-4 w-full accent-[#7890FF]"
                  />
                </Field>
                <TextField
                  label="Amount collected now (₹)"
                  name="paid"
                  type="number"
                  min="0"
                  value={paid}
                  onChange={(event) => setPaid(Number(event.target.value))}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[0, Math.round(total / 2), total].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPaid(preset)}
                    className="rounded-pill border border-white/10 px-3.5 py-2 text-[12px] font-semibold text-ghost-dim hover:bg-white/8"
                  >
                    {preset === 0 ? "Pay later" : preset === total ? "Full payment" : "50% now"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-card border border-white/8 bg-white/4 p-5">
                <p className="text-[13px] font-semibold text-ghost">Account generation</p>
                <p className="mt-1 text-[12.5px] text-ghost-dim">
                  A member code, login and subscription are created automatically. A unique password is generated on
                  save and shown once — share it securely with the member.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <KeyValue label="Plan" value={plan?.name ?? "—"} />
                  <KeyValue label="Trainer" value={trainers.find((t) => t.id === trainerId)?.name ?? "Unassigned"} />
                  <KeyValue label="Collection" value={inr(paid)} mono />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-card bg-pastel-cyan p-4 text-pastel-ink">
                <Sparkles size={18} />
                <p className="text-[12.5px] font-semibold">Membership expiry is calculated automatically from the plan duration.</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <GlassButton onClick={() => setStep((prev) => Math.max(0, prev - 1))} disabled={step === 0}>
            Back
          </GlassButton>
          {step < STEPS.length - 1 ? (
            <GlassButton variant="primary" onClick={() => setStep((prev) => Math.min(STEPS.length - 1, prev + 1))}>
              Continue
            </GlassButton>
          ) : (
            <GlassButton variant="primary" onClick={submit} disabled={pending}>
              <User size={16} /> {pending ? "Creating…" : "Create member"}
            </GlassButton>
          )}
        </div>
      </div>

      {/* Live summary */}
      <aside className="space-y-4">
        <div className="rounded-hero border border-white/25 bg-pastel-cream p-6 text-pastel-ink shadow-float">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-pastel-ink/50">New member</p>
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={form.name || "New Member"} size={52} accent="cyan" src={avatarUrl} subtitle={plan?.name ?? undefined} />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold">{form.name || "Unnamed member"}</p>
              <p className="truncate text-[12px] text-pastel-ink/60">{form.email || "email pending"}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-pastel-ink/60">Plan</span>
              <span className="font-semibold">{plan?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-pastel-ink/60">Duration</span>
              <span className="font-semibold">{plan?.durationDays ?? 0} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-pastel-ink/60">Trainer</span>
              <span className="font-semibold">{trainers.find((t) => t.id === trainerId)?.name.split(" ")[0] ?? "—"}</span>
            </div>
          </div>
          <div className="mt-5 rounded-card bg-white/55 p-4">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-pastel-ink/60">Payable</span>
              <span className="gf-num text-[20px] font-semibold">{inr(total)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <span className="text-pastel-ink/60">Collecting now</span>
              <span className="font-semibold">{inr(paid)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="text-pastel-ink/60">Balance</span>
              <span className="font-semibold">{inr(due)}</span>
            </div>
          </div>
        </div>

        <div className="gf-hairline rounded-card bg-panel/80 p-5">
          <p className="text-[12.5px] font-semibold text-ghost">Registration checklist</p>
          <ul className="mt-3 space-y-2 text-[12px] text-ghost-dim">
            {STEPS.map((label, index) => (
              <li key={label} className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                    index <= step ? "bg-accent-green/20 text-accent-green" : "bg-white/6 text-ghost-muted"
                  }`}
                >
                  {index <= step ? <Check size={12} /> : index + 1}
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2 text-[11.5px] text-ghost-muted">
            <CreditCard size={13} /> Partial payments stay as separate transactions.
          </div>
        </div>
      </aside>

      <Modal
        open={Boolean(created)}
        onClose={() => {
          setCreated(null);
          router.push("/admin/members");
        }}
        title="Member account created"
        subtitle="Share these credentials with the member"
      >
        {created ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-card bg-pastel-cyan p-5 text-pastel-ink">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-[20px] font-semibold">✓</span>
              <div>
                <p className="text-[13px] font-semibold">{created.memberCode}</p>
                <p className="text-[12px] text-pastel-ink/65">
                  {created.receiptNumber ? `Receipt ${created.receiptNumber} generated` : "Balance pending"}
                </p>
              </div>
            </div>

            <div className="rounded-card border border-white/8 bg-white/4 p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ghost-muted">Check-in pass</p>
              <div className="mt-4">
                <MemberPassCard
                  pass={{
                    name: form.name || created.memberCode,
                    memberCode: created.memberCode,
                    planName: plan?.name ? `${plan.name} membership` : "Member pass",
                    status: "Active",
                  }}
                  caption="Hand this QR to the member — trainers and the front desk scan it to check them in."
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <KeyValue label="Login email" value={created.email} />
              <KeyValue label="Password" value={created.password} />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <GlassButton
                onClick={() => window.print()}
                className="print:hidden"
              >
                <Printer size={15} /> Print pass
              </GlassButton>
              <Link href="/admin/members" className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold leading-[44px] text-pastel-ink">
                Back to members
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
