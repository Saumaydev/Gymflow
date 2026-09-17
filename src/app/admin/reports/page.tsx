import { Download, FileText, Table2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview, listAuditLogs } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, MetricCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { formatDate, inr, inrCompact, num } from "@/lib/format";

export const dynamic = "force-dynamic";

const REPORTS = [
  { type: "members", title: "Members", detail: "Full roster with plan, status, dues and visit counts." },
  { type: "revenue", title: "Revenue", detail: "Transaction level receipts with method and notes." },
  { type: "payments", title: "Payments", detail: "Same ledger formatted for finance reconciliation." },
  { type: "attendance", title: "Attendance", detail: "Daily visit counts for the last 30 days." },
  { type: "trainers", title: "Trainers", detail: "Roster, assignments and punctuality." },
  { type: "memberships", title: "Memberships", detail: "Subscriptions with paid and due amounts." },
  { type: "inactive", title: "Inactive members", detail: "Win-back list based on the inactivity threshold." },
];

export default async function ReportsPage() {
  const admin = await requireAdmin();
  const [overview, audit] = await Promise.all([getAdminOverview(admin.gymId, admin.gym.inactivityDays), listAuditLogs(admin.gymId)]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Reports</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Export CSV for spreadsheets, or print any screen to PDF</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard accent="cyan" label="Members" value={num(overview.membersTotal)} caption={`${overview.membersActive} active`} icon={<FileText size={16} />} />
        <MetricCard accent="lavender" label="Revenue (30d)" value={inrCompact(overview.revenue30)} caption="Receipts in ledger" icon={<Table2 size={16} />} />
        <MetricCard accent="blush" label="Outstanding" value={inrCompact(overview.pendingTotal + overview.overdueTotal)} caption="Pending + overdue" icon={<Download size={16} />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <DarkPanel key={report.type} className="flex flex-col justify-between">
            <div>
              <IconTile accent="cream" size="md">
                <FileText size={16} />
              </IconTile>
              <p className="mt-4 text-[15px] font-semibold text-ghost">{report.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ghost-dim">{report.detail}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`/api/reports?type=${report.type}`}
                className="inline-flex h-10 items-center gap-2 rounded-pill bg-ghost px-4 text-[12px] font-semibold text-pastel-ink transition hover:bg-white"
              >
                <Download size={14} /> Export CSV
              </a>
              <span className="inline-flex h-10 items-center rounded-pill border border-white/10 px-4 text-[11.5px] font-semibold text-ghost-muted">
                Print → PDF
              </span>
            </div>
          </DarkPanel>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <DarkPanel>
          <SectionHeading title="Audit trail" caption="Server-side log of console activity" />
          <ul className="mt-4 space-y-2.5">
            {audit.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/7 bg-white/4 px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ghost">{row.action.replace(/_/g, " ")}</p>
                  <p className="text-[11.5px] text-ghost-muted">
                    {row.entity_type}
                    {row.entity_id ? ` #${row.entity_id}` : ""} · {row.actor ?? "system"}
                  </p>
                </div>
                <span className="text-[11.5px] text-ghost-muted">{formatDate(row.created_at)}</span>
              </li>
            ))}
            {!audit.length ? <li className="text-[12.5px] text-ghost-muted">No activity logged yet.</li> : null}
          </ul>
        </DarkPanel>

        <DarkPanel>
          <SectionHeading title="Scheduled exports" caption="Automatic deliveries" />
          <div className="mt-4 space-y-3">
            {[
              { title: "Daily closing summary", detail: "Collections, check-ins and dues", tone: "positive" as const },
              { title: "Weekly membership report", detail: "New, renewed, expired", tone: "info" as const },
              { title: "Monthly P&L", detail: "Revenue vs expenses", tone: "warning" as const },
            ].map((job) => (
              <div key={job.title} className="flex items-center justify-between rounded-card border border-white/7 bg-white/4 px-4 py-3">
                <div>
                  <p className="text-[12.5px] font-semibold text-ghost">{job.title}</p>
                  <p className="text-[11px] text-ghost-muted">{job.detail}</p>
                </div>
                <Pill tone={job.tone}>Scheduled</Pill>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4">
            <KeyValue label="Gym" value={admin.gym.name} />
            <KeyValue label="Opening hours" value={admin.gym.openingHours ?? "—"} />
            <KeyValue label="Currency" value={`${admin.gym.currency} · ${inr(0).charAt(0)}`} />
          </div>
        </DarkPanel>
      </div>
    </div>
  );
}
