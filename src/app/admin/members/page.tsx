import Link from "next/link";
import { Download, UserPlus, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listMembers } from "@/lib/queries";
import { FilterChips, SearchBar } from "@/components/ui/form";
import { DarkPanel, EmptyState, GlassLink, Pill } from "@/components/ui/primitives";
import { MemberCard } from "@/components/cards";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
  { value: "pending", label: "Payment pending" },
  { value: "inactive", label: "Inactive" },
  { value: "new", label: "New" },
];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string; plan?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const { items, total, pageSize } = await listMembers(admin.gymId, {
    filter: params.filter,
    q: params.q,
    plan: params.plan,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const expiringCount = items.filter((m) => m.daysLeft !== null && m.daysLeft <= 7 && m.daysLeft >= 0).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Members</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ghost-dim">
            <span className="gf-num font-semibold text-ghost">{num(total)}</span> total
            <span className="text-ghost-muted">·</span>
            {expiringCount} expiring on this page
            <Pill tone="info">
              <Users size={11} /> {admin.gym.name}
            </Pill>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/reports?type=members"
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost-dim transition hover:bg-white/10"
          >
            <Download size={15} /> CSV
          </a>
          <GlassLink href="/admin/members/new" variant="primary">
            <UserPlus size={16} /> Add Member
          </GlassLink>
        </div>
      </div>

      <DarkPanel className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBar className="flex-1" placeholder="Search by name, code or phone…" />
          <div className="flex items-center gap-2">
            <Link
              href="/admin/members?filter=pending"
              className="inline-flex h-11 items-center rounded-pill border border-white/8 bg-white/5 px-4 text-[12.5px] font-semibold text-ghost-dim hover:bg-white/10"
            >
              Payment pending
            </Link>
            <Link
              href="/admin/members?filter=expiring"
              className="inline-flex h-11 items-center rounded-pill border border-white/8 bg-white/5 px-4 text-[12.5px] font-semibold text-ghost-dim hover:bg-white/10"
            >
              Expiring
            </Link>
          </div>
        </div>
        <FilterChips options={FILTERS} />
      </DarkPanel>

      {items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((member, index) => (
              <MemberCard key={member.id} index={index} member={member} />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/7 bg-panel/70 px-5 py-4">
            <p className="text-[12.5px] text-ghost-dim">
              Page {page} of {totalPages} · showing {items.length} of {num(total)} members
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={{ pathname: "/admin/members", query: { ...params, page: page - 1 } }}
                  className="inline-flex h-10 items-center rounded-pill border border-white/8 bg-white/5 px-4 text-[12.5px] font-semibold text-ghost-dim hover:bg-white/10"
                >
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={{ pathname: "/admin/members", query: { ...params, page: page + 1 } }}
                  className="inline-flex h-10 items-center rounded-pill bg-ghost px-4 text-[12.5px] font-semibold text-pastel-ink transition hover:bg-white"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Users size={22} />}
          title="No members match this view"
          message="Try a different filter or start building your gym community with a new member."
          action={
            <GlassLink href="/admin/members/new" variant="primary">
              <UserPlus size={16} /> Add Member
            </GlassLink>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Billing runs itself", detail: "Partial payments are stored as individual transactions with receipts." },
          { title: "Reminders are automatic", detail: "Expiry nudges fire 30, 15, 7, 3 and 1 day before the cycle ends." },
          { title: "Trainer handover", detail: "Every member can be assigned to a coach from the roster." },
        ].map((item) => (
          <DarkPanel key={item.title}>
            <p className="text-[13px] font-semibold text-ghost">{item.title}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ghost-muted">{item.detail}</p>
          </DarkPanel>
        ))}
      </div>
    </div>
  );
}
