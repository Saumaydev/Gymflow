import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Download, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getReceipt } from "@/lib/queries";
import { DarkPanel, KeyValue, Pill, StatusDot } from "@/components/ui/primitives";
import { formatDate, formatTime, inr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const paymentId = Number.parseInt(id, 10);
  if (!Number.isFinite(paymentId)) notFound();
  const data = await getReceipt(admin.gymId, paymentId);
  if (!data) notFound();
  const { receipt, gym } = data;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="gf-no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/payments" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ghost-dim hover:text-ghost">
          <ArrowLeft size={14} /> Back to payments
        </Link>
        <div className="flex gap-3">
          <a
            href={`/api/reports?type=payments`}
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost-dim hover:bg-white/10"
          >
            <Download size={15} /> Download CSV
          </a>
          <span className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[12px] font-semibold text-ghost-muted">
            <Printer size={15} /> Use browser print for PDF
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-hero border border-white/25 bg-pastel-cream text-pastel-ink shadow-lift">
        <div className="flex flex-wrap items-start justify-between gap-6 p-7">
          <div>
            <div className="flex items-center gap-3">
              <span className="gf-num flex h-11 w-11 items-center justify-center rounded-card bg-white/70 text-[14px] font-semibold">
                {gym.logoText ?? "GF"}
              </span>
              <div>
                <p className="text-[16px] font-semibold">{gym.name}</p>
                <p className="text-[11.5px] text-pastel-ink/60">{gym.address}</p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pastel-ink/50">Receipt</p>
              <p className="gf-num mt-1 text-[22px] font-semibold">{receipt.receipt_number}</p>
              <p className="mt-1 text-[12px] text-pastel-ink/60">
                {formatDate(receipt.payment_date)} · {formatTime(receipt.payment_date)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/70 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-wide">
              <Check size={13} /> Payment received
            </span>
            <p className="gf-num mt-4 text-[34px] font-semibold leading-none">{inr(receipt.amount)}</p>
            <p className="mt-1 text-[12px] font-semibold text-pastel-ink/60">{receipt.method}</p>
          </div>
        </div>

        <div className="grid gap-6 border-t border-pastel-ink/10 p-7 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pastel-ink/50">Billed to</p>
            <p className="mt-2 text-[15px] font-semibold">{receipt.member_name}</p>
            <p className="text-[12px] text-pastel-ink/65">{receipt.member_code}</p>
            <p className="text-[12px] text-pastel-ink/65">{receipt.member_phone ?? ""}</p>
            <p className="text-[12px] text-pastel-ink/65">{receipt.member_email ?? ""}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pastel-ink/50">Membership</p>
            <p className="mt-2 text-[15px] font-semibold">{receipt.plan_name ?? "Membership payment"}</p>
            <p className="text-[12px] text-pastel-ink/65">
              {receipt.start_date ? `${formatDate(receipt.start_date)} → ${formatDate(receipt.end_date)}` : "Add-on service"}
            </p>
            {receipt.notes ? <p className="mt-2 text-[12px] text-pastel-ink/65">{receipt.notes}</p> : null}
          </div>
        </div>

        <div className="mx-7 mb-7 rounded-card bg-white/60 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <KeyValue label="Membership total" value={inr(receipt.total ?? receipt.amount)} mono />
            <KeyValue label="Paid to date" value={inr(receipt.paid ?? receipt.amount)} mono />
            <KeyValue label="Balance" value={inr(receipt.due ?? 0)} mono />
          </div>
        </div>
      </div>

      <DarkPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-ghost">Subscription status at time of receipt</p>
          <StatusDot status={receipt.subscription_status ?? "PAID"} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Pill tone="positive">Partial payments remain separate transactions</Pill>
          <Pill tone="info">Receipts regenerated on demand</Pill>
        </div>
        <p className="mt-4 text-[11.5px] text-ghost-muted">
          Generated by GymFlow · {gym.name} · {gym.phone ?? ""}
        </p>
      </DarkPanel>
    </div>
  );
}
