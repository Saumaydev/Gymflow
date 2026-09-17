import Link from "next/link";
import { Compass, CreditCard, LayoutDashboard, Lock, Megaphone, QrCode, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listAuditLogs, plansForPicker } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, Pill, SectionHeading } from "@/components/ui/primitives";
import { GymProfileForm, SecurityForm } from "@/components/admin/forms";
import { formatDate, inr } from "@/lib/format";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "gym", label: "Gym", icon: Compass },
  { value: "plans", label: "Plans", icon: CreditCard },
  { value: "attendance", label: "Attendance", icon: QrCode },
  { value: "notifications", label: "Notifications", icon: Megaphone },
  { value: "security", label: "Security", icon: Lock },
  { value: "account", label: "Account", icon: Users },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await requireAdmin();
  const { tab } = await searchParams;
  const activeTab = TABS.find((t) => t.value === tab)?.value ?? "gym";
  const [plans, audit] = await Promise.all([plansForPicker(admin.gymId), listAuditLogs(admin.gymId)]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Settings</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Gym profile, plans, attendance methods, reminders and security</p>
      </div>

      <div className="gf-scroll-x flex gap-2">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={`/admin/settings?tab=${item.value}`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-pill px-4 py-2.5 text-[12.5px] font-semibold transition ${
              activeTab === item.value ? "bg-ghost text-pastel-ink" : "border border-white/8 bg-white/5 text-ghost-dim hover:bg-white/10"
            }`}
          >
            <item.icon size={14} /> {item.label}
          </Link>
        ))}
      </div>

      {activeTab === "gym" ? (
        <DarkPanel>
          <SectionHeading title="Gym profile" caption="Appears on receipts, reminders and the member app" />
          <div className="mt-6">
            <GymProfileForm
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
        </DarkPanel>
      ) : null}

      {activeTab === "plans" ? (
        <DarkPanel>
          <SectionHeading title="Membership plans" caption="Pricing, duration and features" action={<Link href="/admin/memberships" className="text-[12.5px] font-semibold text-ghost-dim hover:text-ghost">Manage plans</Link>} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-card border border-white/7 bg-white/4 p-4">
                <p className="text-[13px] font-semibold text-ghost">{plan.name}</p>
                <p className="gf-num mt-1.5 text-[18px] font-semibold text-ghost">
                  {inr(plan.price)}
                  <span className="text-[11.5px] font-medium text-ghost-muted"> / {plan.durationDays} days</span>
                </p>
              </div>
            ))}
          </div>
        </DarkPanel>
      ) : null}

      {activeTab === "attendance" ? (
        <DarkPanel>
          <SectionHeading title="Attendance capture" caption="How members check in" />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: "QR scanner", detail: "Entrance tablet, glowing scan surface", tone: "positive" as const },
              { label: "Manual entry", detail: "Front desk override with status", tone: "info" as const },
              { label: "App check-in", detail: "Members self check-in from the app", tone: "warning" as const },
            ].map((method) => (
              <div key={method.label} className="rounded-card border border-white/7 bg-white/4 p-4">
                <IconTile accent="cyan" size="sm">
                  <QrCode size={14} />
                </IconTile>
                <p className="mt-3 text-[13px] font-semibold text-ghost">{method.label}</p>
                <p className="mt-1 text-[11.5px] text-ghost-muted">{method.detail}</p>
                <Pill className="mt-3" tone={method.tone}>
                  Enabled
                </Pill>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <KeyValue label="Expiring threshold" value={`${admin.gym.expiringThresholdDays} days`} />
            <KeyValue label="Inactivity watch" value={`${admin.gym.inactivityDays} days`} />
            <KeyValue label="Duplicate guard" value="One check-in per member per day" />
          </div>
        </DarkPanel>
      ) : null}

      {activeTab === "notifications" ? (
        <DarkPanel>
          <SectionHeading title="Reminder configuration" caption="Automated membership and payment nudges" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-white/7 bg-white/4 p-4">
              <p className="text-[13px] font-semibold text-ghost">Expiry reminders</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(admin.gym.reminderDays ?? [30, 15, 7, 3, 1]).map((day) => (
                  <Pill key={day} tone="positive">
                    {day} days
                  </Pill>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-white/7 bg-white/4 p-4">
              <p className="text-[13px] font-semibold text-ghost">Event triggers</p>
              <ul className="mt-3 space-y-1.5 text-[11.5px] text-ghost-muted">
                <li>· Payment received</li>
                <li>· Membership renewed or expired</li>
                <li>· Holiday published</li>
                <li>· Emergency broadcasts</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] text-ghost-muted">Change the schedule from the Gym tab — reminders re-generate automatically.</p>
        </DarkPanel>
      ) : null}

      {activeTab === "security" ? (
        <DarkPanel>
          <SectionHeading title="Security" caption="Passwords use scrypt hashing; sessions are HttpOnly and signed" />
          <div className="mt-6">
            <SecurityForm />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <KeyValue label="Signed sessions" value="HMAC-SHA256 cookie, 7 day expiry" />
            <KeyValue label="Role enforcement" value="Server-side on every request" />
            <KeyValue label="Audit logging" value="All writes recorded" />
          </div>
        </DarkPanel>
      ) : null}

      {activeTab === "account" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <DarkPanel>
            <SectionHeading title="Admin account" caption="Owner profile" />
            <div className="mt-5 grid gap-4">
              <KeyValue label="Name" value={admin.name} />
              <KeyValue label="Email" value={admin.email} />
              <KeyValue label="Phone" value={admin.phone ?? "—"} />
              <KeyValue label="Role" value="ADMIN" />
            </div>
            <Link href="/onboarding" className="mt-6 inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost-dim hover:bg-white/10">
              <LayoutDashboard size={15} /> Re-run setup guide
            </Link>
          </DarkPanel>
          <DarkPanel>
            <SectionHeading title="Recent console activity" caption="Last 10 events" />
            <ul className="mt-4 space-y-2.5">
              {audit.slice(0, 10).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                  <span className="text-[12.5px] font-medium text-ghost">{row.action.replace(/_/g, " ")}</span>
                  <span className="text-[11px] text-ghost-muted">
                    {row.entity_type} · {formatDate(row.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </DarkPanel>
        </div>
      ) : null}
    </div>
  );
}
