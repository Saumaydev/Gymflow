"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeIndianRupee,
  CalendarPlus,
  Dumbbell,
  Megaphone,
  Plus,
  QrCode,
  RefreshCw,
  Sparkles,
  UserCheck,
  Wand2,
} from "lucide-react";
import { Modal, toast } from "@/components/ui/overlay";
import { CheckinStation } from "@/components/admin/CheckinStation";
import { Field, SelectField, TextArea, TextField } from "@/components/ui/form";
import { GlassButton, IconTile, KeyValue, Pill, ProgressBar } from "@/components/ui/primitives";
import { inr } from "@/lib/format";

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

/* ------------------------------------------------------------------ */
/* Onboarding + settings (PRD §75, §112)                               */
/* ------------------------------------------------------------------ */

export function GymProfileForm({
  gym,
  mode = "settings",
}: {
  gym: {
    name: string;
    tagline?: string | null;
    phone: string;
    email: string;
    address: string;
    openingHours: string;
    inactivityDays: number;
    expiringThresholdDays: number;
    reminderDays?: number[];
  };
  mode?: "settings" | "onboarding";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        try {
          await postJson("/api/settings", {
            section: "gym",
            name: form.get("name"),
            tagline: form.get("tagline"),
            phone: form.get("phone"),
            email: form.get("email"),
            address: form.get("address"),
            logoText: form.get("logoText"),
            openingHours: form.get("openingHours"),
            inactivityDays: form.get("inactivityDays"),
            expiringThresholdDays: form.get("expiringThresholdDays"),
            reminderDays: form.get("reminderDays"),
          });
          toast({ title: mode === "onboarding" ? "Gym configured" : "Gym profile saved", tone: "success" });
          router.refresh();
        } catch (error) {
          toast({ title: "Could not save", message: (error as Error).message, tone: "error" });
        } finally {
          setPending(false);
        }
      }}
      className="grid gap-5 md:grid-cols-2"
    >
      <TextField label="Gym name" name="name" defaultValue={gym.name} required />
      <TextField label="Tagline" name="tagline" defaultValue={gym.tagline ?? ""} placeholder="Strength · Conditioning · Recovery" />
      <TextField label="Phone" name="phone" defaultValue={gym.phone} />
      <TextField label="Email" name="email" type="email" defaultValue={gym.email} />
      <TextField label="Logo mark" name="logoText" defaultValue="IA" hint="Two letters shown in navigation" />
      <TextField label="Opening hours" name="openingHours" defaultValue={gym.openingHours} />
      <TextField label="Inactivity threshold (days)" name="inactivityDays" type="number" min="1" defaultValue={gym.inactivityDays} />
      <TextField label="Expiring threshold (days)" name="expiringThresholdDays" type="number" min="1" defaultValue={gym.expiringThresholdDays} />
      <TextField
        label="Reminder schedule (days before expiry)"
        name="reminderDays"
        defaultValue={(gym.reminderDays ?? [30, 15, 7, 3, 1]).join(", ")}
        hint="Comma separated — used by the automated reminder job"
        className="md:col-span-2"
      />
      <TextArea label="Address" name="address" defaultValue={gym.address} rows={2} />
      <div className="flex items-end md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="h-[52px] rounded-pill bg-ghost px-6 text-[14px] font-semibold text-pastel-ink transition hover:bg-white disabled:opacity-60"
        >
          {pending ? "Saving…" : mode === "onboarding" ? "Save and continue" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function SecurityForm() {
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        try {
          await postJson("/api/settings", {
            section: "security",
            currentPassword: form.get("currentPassword"),
            newPassword: form.get("newPassword"),
          });
          toast({ title: "Password updated", tone: "success" });
          (event.target as HTMLFormElement).reset();
        } catch (error) {
          toast({ title: "Update failed", message: (error as Error).message, tone: "error" });
        } finally {
          setPending(false);
        }
      }}
      className="grid gap-5 md:grid-cols-2"
    >
      <TextField label="Current password" name="currentPassword" type="password" required />
      <TextField label="New password" name="newPassword" type="password" min="8" required hint="Minimum 8 characters" />
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="h-[52px] rounded-pill bg-ghost px-6 text-[14px] font-semibold text-pastel-ink disabled:opacity-60">
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Creators                                                           */
/* ------------------------------------------------------------------ */

export function PlanCreator() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  return (
    <>
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> New plan
      </GlassButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Create membership plan" subtitle="Pricing, duration and features">
        <form
          id="plan-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            try {
              await postJson("/api/plans", {
                name: form.get("name"),
                description: form.get("description"),
                price: form.get("price"),
                durationDays: form.get("durationDays"),
                features: form.get("features"),
                accent: form.get("accent"),
              });
              toast({ title: "Plan created", message: "Members can be enrolled in it immediately.", tone: "success" });
              setOpen(false);
              router.refresh();
            } catch (error) {
              toast({ title: "Could not create plan", message: (error as Error).message, tone: "error" });
            } finally {
              setPending(false);
            }
          }}
          className="grid gap-5 sm:grid-cols-2"
        >
          <TextField label="Plan name" name="name" required placeholder="Premium" />
          <TextField label="Price (₹)" name="price" type="number" min="1" required placeholder="2500" />
          <TextField label="Duration (days)" name="durationDays" type="number" min="1" defaultValue={30} required />
          <SelectField
            label="Card accent"
            name="accent"
            defaultValue="cyan"
            options={[
              { value: "cyan", label: "Pale cyan" },
              { value: "lavender", label: "Lavender" },
              { value: "cream", label: "Cream" },
              { value: "blush", label: "Blush" },
              { value: "sage", label: "Sage" },
            ]}
          />
          <TextField label="Features (comma separated)" name="features" className="sm:col-span-2" placeholder="Unlimited classes, 4 PT sessions" />
          <div className="sm:col-span-2">
            <TextArea label="Description" name="description" rows={2} placeholder="Strength coaching and unlimited group classes" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <GlassButton onClick={() => setOpen(false)}>Cancel</GlassButton>
            <button type="submit" disabled={pending} className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink disabled:opacity-60">
              {pending ? "Creating…" : "Create plan"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function TrainerCreator({ autoOpen = false }: { autoOpen?: boolean }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(autoOpen || params.get("new") === "1");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  return (
    <>
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        <Dumbbell size={16} /> Add trainer
      </GlassButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Onboard trainer" subtitle="Profile, specialisation and contract">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            try {
              const result = await postJson<{ trainer: { code: string; email: string; password: string } }>("/api/trainers", {
                name: form.get("name"),
                email: form.get("email"),
                phone: form.get("phone"),
                specialization: form.get("specialization"),
                experienceYears: form.get("experienceYears"),
                employmentType: form.get("employmentType"),
                salary: form.get("salary"),
                commissionPct: form.get("commissionPct"),
                workingHours: form.get("workingHours"),
                joiningDate: form.get("joiningDate"),
              });
              toast({
                title: `${result.trainer.code} created`,
                message: `Login: ${result.trainer.email} / ${result.trainer.password}`,
                tone: "success",
              });
              setOpen(false);
              router.refresh();
            } catch (error) {
              toast({ title: "Could not add trainer", message: (error as Error).message, tone: "error" });
            } finally {
              setPending(false);
            }
          }}
          className="grid gap-5 sm:grid-cols-2"
        >
          <TextField label="Full name" name="name" required placeholder="Arjun Mehta" />
          <TextField label="Email" name="email" type="email" required placeholder="arjun@gymflow.app" />
          <TextField label="Phone" name="phone" placeholder="+91 98450 00000" />
          <TextField label="Specialisation" name="specialization" placeholder="Strength Coach" />
          <TextField label="Experience (years)" name="experienceYears" type="number" min="0" defaultValue={3} />
          <SelectField
            label="Employment type"
            name="employmentType"
            defaultValue="FULL_TIME"
            options={[
              { value: "FULL_TIME", label: "Full time" },
              { value: "PART_TIME", label: "Part time" },
              { value: "CONTRACT", label: "Contract" },
            ]}
          />
          <TextField label="Monthly salary (₹)" name="salary" type="number" min="0" defaultValue={35000} />
          <TextField label="Commission (%)" name="commissionPct" type="number" min="0" defaultValue={12} />
          <TextField label="Working hours" name="workingHours" defaultValue="6 AM – 2 PM" />
          <TextField label="Joining date" name="joiningDate" type="date" />
          <div className="sm:col-span-2 flex justify-end gap-3">
            <GlassButton onClick={() => setOpen(false)}>Cancel</GlassButton>
            <button type="submit" disabled={pending} className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink disabled:opacity-60">
              {pending ? "Saving…" : "Create trainer"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Payments (PRD §34-§37)                                              */
/* ------------------------------------------------------------------ */

export type MemberOption = { id: number; name: string; memberCode: string };
export type PendingOption = {
  id: number;
  memberId: number;
  memberName: string;
  planName: string;
  total: number;
  paid: number;
  due: number;
};

export function RecordPaymentForm({
  members,
  pendingOptions,
  defaultMemberId,
}: {
  members: MemberOption[];
  pendingOptions: PendingOption[];
  defaultMemberId?: number;
}) {
  const params = useSearchParams();
  // Only opens from an explicit action (?record=1 or the button click) — never on mount.
  const [open, setOpen] = useState(params.get("record") === "1");
  const [pending, setPending] = useState(false);
  const [memberId, setMemberId] = useState<number>(defaultMemberId ?? pendingOptions[0]?.memberId ?? members[0]?.id ?? 0);
  const [subscriptionId, setSubscriptionId] = useState<number>(pendingOptions.find((p) => p.memberId === (defaultMemberId ?? pendingOptions[0]?.memberId))?.id ?? 0);
  const [amount, setAmount] = useState<number>(0);
  const [receipt, setReceipt] = useState<{ number: string; amount: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (params.get("record") === "1") setOpen(true);
  }, [params]);

  const pendingForMember = pendingOptions.filter((p) => p.memberId === memberId);
  const selected = pendingOptions.find((p) => p.id === subscriptionId) ?? pendingForMember[0] ?? null;

  return (
    <>
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        <BadgeIndianRupee size={16} /> Record payment
      </GlassButton>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setReceipt(null);
        }}
        title={receipt ? "Payment recorded" : "Record payment"}
        subtitle={receipt ? "Receipt generated and balance updated" : "Partial payments are supported and tracked per transaction"}
      >
        {receipt ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="animate-[pulse-ring_1.6s_ease-out_infinite] flex h-16 w-16 items-center justify-center rounded-full bg-accent-green text-[26px] font-semibold text-pastel-ink">
              ✓
            </span>
            <p className="text-[22px] font-semibold text-ghost">{inr(receipt.amount)}</p>
            <p className="text-[13px] text-ghost-dim">Receipt {receipt.number} generated</p>
            <div className="flex gap-3">
              <a
                href="/admin/payments"
                className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold leading-[44px] text-pastel-ink"
              >
                Back to payments
              </a>
              <GlassButton
                onClick={() => {
                  setReceipt(null);
                }}
              >
                Record another
              </GlassButton>
            </div>
          </div>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setPending(true);
              try {
                const result = await postJson<{ receiptNumber: string }>("/api/payments", {
                  memberId,
                  subscriptionId: subscriptionId || (selected?.id ?? 0),
                  amount: form.get("amount"),
                  method: form.get("method"),
                  notes: form.get("notes"),
                  paymentDate: form.get("paymentDate"),
                });
                toast({ title: "Payment recorded", message: `Receipt ${result.receiptNumber}`, tone: "success" });
                setReceipt({ number: result.receiptNumber, amount: Number(form.get("amount")) });
                router.refresh();
              } catch (error) {
                toast({ title: "Could not record payment", message: (error as Error).message, tone: "error" });
              } finally {
                setPending(false);
              }
            }}
            className="grid gap-5 sm:grid-cols-2"
          >
            <Field label="Member" className="sm:col-span-2">
              <select
                value={memberId}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setMemberId(next);
                  setSubscriptionId(pendingOptions.find((p) => p.memberId === next)?.id ?? 0);
                  setAmount(pendingOptions.find((p) => p.memberId === next)?.due ?? 0);
                }}
                className="h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] text-ghost"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-panel">
                    {m.name} · {m.memberCode}
                  </option>
                ))}
              </select>
            </Field>

            {selected ? (
              <div className="sm:col-span-2 rounded-card border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-ghost">{selected.planName} membership</p>
                  <Pill tone={selected.paid > 0 ? "warning" : "info"}>{selected.paid > 0 ? "Partial" : "Unpaid"}</Pill>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <KeyValue label="Total" value={inr(selected.total)} mono />
                  <KeyValue label="Paid" value={inr(selected.paid)} mono />
                  <KeyValue label="Remaining" value={inr(selected.due)} mono />
                </div>
                <div className="mt-3">
                  <ProgressBar value={(selected.paid / Math.max(1, selected.total)) * 100} accent="#7890FF" track="rgba(255,255,255,.08)" />
                </div>
                <button
                  type="button"
                  onClick={() => setAmount(selected.due)}
                  className="mt-3 rounded-pill border border-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-ghost-dim hover:bg-white/8"
                >
                  Settle remaining {inr(selected.due)}
                </button>
              </div>
            ) : null}

            <TextField label="Amount (₹)" name="amount" type="number" min="1" required defaultValue={selected?.due ?? ""} key={`amount-${subscriptionId}`} />
            <SelectField
              label="Method"
              name="method"
              defaultValue="UPI"
              options={[
                { value: "UPI", label: "UPI" },
                { value: "CASH", label: "Cash" },
                { value: "CARD", label: "Card" },
                { value: "NETBANKING", label: "Net banking" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            <TextField label="Date" name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <TextField label="Notes" name="notes" placeholder="Renewal, PT add-on, discount settlement" />
            <div className="sm:col-span-2 flex justify-end gap-3">
              <div className="text-[12px] text-ghost-muted sm:mr-auto sm:self-center">
                Recording {amount ? inr(amount) : "an amount"} against {selected?.planName ?? "membership"}
              </div>
              <GlassButton onClick={() => setOpen(false)} type="button">
                Cancel
              </GlassButton>
              <button type="submit" disabled={pending} className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink disabled:opacity-60">
                {pending ? "Recording…" : "Record Payment"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Attendance (PRD §44-§49)                                            */
/* ------------------------------------------------------------------ */

export function MarkAttendancePanel({
  members,
  trainers,
  autoOpen = false,
  label,
  fullScreenHref,
}: {
  members: { id: number; name: string; memberCode: string }[];
  trainers: { id: number; name: string }[];
  autoOpen?: boolean;
  label?: string;
  fullScreenHref?: string;
}) {
  return (
    <CheckinStation
      members={members}
      trainers={trainers}
      autoOpen={autoOpen}
      label={label ?? "Mark attendance"}
      fullScreenHref={fullScreenHref ?? "/admin/attendance/station"}
    />
  );
}


/* ------------------------------------------------------------------ */
/* Communication centre (PRD §50-§55)                                  */
/* ------------------------------------------------------------------ */

export function NotificationComposer({ autoOpen = false }: { autoOpen?: boolean }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(autoOpen || params.get("new") === "1");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  return (
    <>
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        <Megaphone size={16} /> New announcement
      </GlassButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Create announcement" subtitle="Delivered instantly to the selected audience">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            try {
              const result = await postJson<{ recipients: number }>("/api/notifications", {
                title: form.get("title"),
                message: form.get("message"),
                type: form.get("type"),
                audience: form.get("audience"),
              });
              toast({ title: "Announcement sent", message: `Delivered to ${result.recipients} people`, tone: "success" });
              setOpen(false);
              router.refresh();
            } catch (error) {
              toast({ title: "Could not send", message: (error as Error).message, tone: "error" });
            } finally {
              setPending(false);
            }
          }}
          className="space-y-5"
        >
          <TextField label="Title" name="title" required placeholder="Gym closed tomorrow" />
          <TextArea label="Message" name="message" rows={4} placeholder="The gym will remain closed tomorrow due to maintenance." />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Type"
              name="type"
              defaultValue="ANNOUNCEMENT"
              options={[
                { value: "ANNOUNCEMENT", label: "Announcement" },
                { value: "PAYMENT", label: "Payment" },
                { value: "MEMBERSHIP", label: "Membership" },
                { value: "HOLIDAY", label: "Holiday" },
                { value: "EMERGENCY", label: "Emergency" },
                { value: "EVENT", label: "Event" },
                { value: "TRAINER", label: "Trainer update" },
              ]}
            />
            <SelectField
              label="Audience"
              name="audience"
              defaultValue="EVERYONE"
              options={[
                { value: "EVERYONE", label: "Everyone" },
                { value: "MEMBERS", label: "Members only" },
                { value: "TRAINERS", label: "Trainers only" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3">
            <GlassButton onClick={() => setOpen(false)}>Cancel</GlassButton>
            <button type="submit" disabled={pending} className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink disabled:opacity-60">
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function CalendarComposer({ defaultKind = "holiday", autoOpen = false }: { defaultKind?: "holiday" | "event"; autoOpen?: boolean }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(autoOpen || params.get("new") === "1");
  const [kind, setKind] = useState<"holiday" | "event">(defaultKind);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  return (
    <>
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        <CalendarPlus size={16} /> {defaultKind === "event" ? "New event" : "Add holiday"}
      </GlassButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Add to gym calendar" subtitle="Members see holidays and events instantly">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            try {
              await postJson("/api/holidays", {
                kind,
                title: form.get("title"),
                date: form.get("date"),
                description: form.get("description"),
                eventType: form.get("eventType"),
                capacity: form.get("capacity"),
              });
              toast({ title: kind === "holiday" ? "Holiday published" : "Event published", message: "Members have been notified.", tone: "success" });
              setOpen(false);
              router.refresh();
            } catch (error) {
              toast({ title: "Could not publish", message: (error as Error).message, tone: "error" });
            } finally {
              setPending(false);
            }
          }}
          className="space-y-5"
        >
          <div className="flex gap-2 rounded-pill border border-white/8 bg-white/4 p-1.5">
            {(["holiday", "event"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={`h-10 flex-1 rounded-pill text-[12.5px] font-semibold capitalize transition ${
                  kind === option ? "bg-ghost text-pastel-ink" : "text-ghost-dim hover:text-ghost"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <TextField label="Title" name="title" required placeholder={kind === "holiday" ? "Gandhi Jayanti" : "Mobility workshop"} />
          <TextField label="Date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          {kind === "event" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Event type"
                name="eventType"
                defaultValue="WORKSHOP"
                options={[
                  { value: "WORKSHOP", label: "Workshop" },
                  { value: "COMPETITION", label: "Competition" },
                  { value: "GROUP CLASS", label: "Group class" },
                  { value: "CHALLENGE", label: "Challenge" },
                  { value: "GYM EVENT", label: "Gym event" },
                ]}
              />
              <TextField label="Capacity" name="capacity" type="number" min="0" defaultValue={30} />
            </div>
          ) : null}
          <TextArea label="Description" name="description" rows={3} placeholder="Gym will remain closed." />
          <div className="flex justify-end gap-3">
            <GlassButton onClick={() => setOpen(false)}>Cancel</GlassButton>
            <button type="submit" disabled={pending} className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink disabled:opacity-60">
              {pending ? "Publishing…" : "Publish"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Subscription lifecycle + assignment (PRD §39, §43)                  */
/* ------------------------------------------------------------------ */

export function SubscriptionActions({
  subscriptionId,
  plans,
  memberName,
  compact = false,
}: {
  subscriptionId: number;
  plans: { id: number; name: string; price: number }[];
  memberName: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"renew" | "extend" | "upgrade" | "cancel">("renew");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const run = async (payload: Record<string, unknown>, label: string) => {
    setPending(true);
    try {
      await postJson("/api/subscriptions", { subscriptionId, ...payload });
      toast({ title: `${label} complete`, message: `${memberName}'s ${label.toLowerCase()} has been applied.`, tone: "success" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: `${label} failed`, message: (error as Error).message, tone: "error" });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-1"}`}>
        <button
          onClick={() => {
            setAction("renew");
            setOpen(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-white/10 bg-white/6 px-3.5 text-[12px] font-semibold text-ghost transition hover:bg-white/12"
        >
          <RefreshCw size={13} /> Renew
        </button>
        <button
          onClick={() => run({ action: "extend", days: 7 }, "Extension")}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-white/10 bg-white/6 px-3.5 text-[12px] font-semibold text-ghost transition hover:bg-white/12 disabled:opacity-50"
        >
          +7 days
        </button>
        <button
          onClick={() => {
            setAction("upgrade");
            setOpen(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-white/10 bg-white/6 px-3.5 text-[12px] font-semibold text-ghost transition hover:bg-white/12"
        >
          <Sparkles size={13} /> Upgrade
        </button>
        <button
          onClick={() => run({ action: "cancel" }, "Cancellation")}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-white/10 bg-pastel-blush/85 px-3.5 text-[12px] font-semibold text-pastel-ink transition hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={action === "upgrade" ? "Upgrade / downgrade plan" : "Renew subscription"} subtitle={memberName}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await run(
              {
                action,
                planId: form.get("planId"),
                discount: form.get("discount"),
                paid: form.get("paid"),
              },
              action === "upgrade" ? "Plan change" : "Renewal",
            );
          }}
          className="space-y-5"
        >
          <Field label="Plan">
            <select name="planId" className="h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] text-ghost">
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id} className="bg-panel">
                  {plan.name} · ₹{plan.price}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Discount (₹)" name="discount" type="number" min="0" defaultValue={0} />
            <TextField label="Collected now (₹)" name="paid" type="number" min="0" defaultValue={0} hint="Leave 0 to invoice later" />
          </div>
          <div className="flex justify-end gap-3">
            <GlassButton onClick={() => setOpen(false)}>Cancel</GlassButton>
            <button type="submit" disabled={pending} className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink disabled:opacity-60">
              {pending ? "Applying…" : action === "upgrade" ? "Apply plan change" : "Renew"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AssignTrainerForm({
  trainers,
  members,
  defaultTrainerId,
  trainerName,
}: {
  trainers: { id: number; name: string }[];
  members: MemberOption[];
  defaultTrainerId?: number;
  trainerName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [trainerId, setTrainerId] = useState(defaultTrainerId ?? trainers[0]?.id ?? 0);
  const router = useRouter();

  return (
    <>
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        <UserCheck size={16} /> Assign member
      </GlassButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Trainer assignment" subtitle={trainerName ? `${trainerName}'s roster` : "Reassign or remove members"}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            try {
              await postJson("/api/assignments", {
                action: form.get("action"),
                trainerId,
                memberId: form.get("memberId"),
              });
              toast({ title: "Roster updated", tone: "success" });
              setOpen(false);
              router.refresh();
            } catch (error) {
              toast({ title: "Could not update roster", message: (error as Error).message, tone: "error" });
            } finally {
              setPending(false);
            }
          }}
          className="space-y-5"
        >
          <Field label="Trainer">
            <select
              value={trainerId}
              onChange={(event) => setTrainerId(Number(event.target.value))}
              className="h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] text-ghost"
            >
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id} className="bg-panel">
                  {trainer.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Member">
            <select name="memberId" className="h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] text-ghost">
              {members.map((member) => (
                <option key={member.id} value={member.id} className="bg-panel">
                  {member.name} · {member.memberCode}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Action"
              name="action"
              defaultValue="assign"
              options={[
                { value: "assign", label: "Assign to trainer" },
                { value: "remove", label: "Remove from trainer" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3">
            <GlassButton onClick={() => setOpen(false)}>Cancel</GlassButton>
            <button type="submit" disabled={pending} className="h-11 rounded-pill bg-ghost px-5 text-[13px] font-semibold text-pastel-ink disabled:opacity-60">
              {pending ? "Saving…" : "Save roster"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function WelcomeName({ name }: { name: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <IconTile accent="cream" size="lg">
        <Wand2 size={18} />
      </IconTile>
      <div>
        <p className="text-[22px] font-semibold tracking-tight text-ghost">Hello {name}</p>
        <p className="text-[12.5px] text-ghost-dim">Welcome back!</p>
      </div>
    </div>
  );
}
