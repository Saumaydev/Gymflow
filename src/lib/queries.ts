import { cache } from "react";
import { and, desc, eq, gte, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attendance,
  auditLogs,
  events,
  expenses,
  gyms,
  holidays,
  invoices,
  members,
  membershipPlans,
  notificationRecipients,
  notifications,
  payments,
  subscriptions,
  trainerContracts,
  trainerMembers,
  trainers,
  users,
} from "@/db/schema";
import { addDays, pct, toDate, toISODate, today } from "./format";
import type { PastelKey } from "./tokens";

export type SqlRow = Record<string, unknown>;

/** Runs a raw SQL aggregate and returns typed rows. */
export async function rows<T extends SqlRow>(query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return (result as unknown as { rows: T[] }).rows;
}

export const moneyExpr = sql<number>`coalesce(sum(p.amount), 0)::int`;

/* ------------------------------------------------------------------ */
/* Admin dashboard (PRD §18-§27, §72-§73)                              */
/* ------------------------------------------------------------------ */

export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  cta: string;
  href: string;
  accent: "cyan" | "lavender" | "cream" | "blush" | "sage" | "blue";
};

export type AdminOverview = {
  membersTotal: number;
  membersActive: number;
  membersExpiring: number;
  membersExpired: number;
  newThisMonth: number;
  revenue30: number;
  revenuePrev30: number;
  collectedToday: number;
  pendingTotal: number;
  pendingCount: number;
  overdueTotal: number;
  overdueCount: number;
  attendanceToday: number;
  rosterActive: number;
  attendanceRate: number;
  inactiveCount: number;
  revenueSeries: { label: string; value: number }[];
  previousSeries: { label: string; value: number }[];
  growth: { label: string; total: number; active: number }[];
  peakHours: { label: string; value: number }[];
  breakdown: { label: string; value: number; accent: PastelKey }[];
  recentPayments: {
    id: number;
    memberName: string;
    memberCode: string;
    amount: number;
    method: string;
    paymentDate: Date;
    note: string | null;
  }[];
  expiringSoon: { id: number; name: string; memberCode: string; plan: string; endDate: string; daysLeft: number }[];
  insights: AttentionItem[];
  todayCheckIns: { id: number; name: string; memberCode: string; method: string; checkIn: Date | null }[];
  occupancyPct: number;
};

export const getAdminOverview = cache(async (gymId: number, inactivityDays = 14): Promise<AdminOverview> => {
  const t = today();
  const start30 = toISODate(addDays(t, -29));
  const start60 = toISODate(addDays(t, -59));
  const windowStart = toISODate(addDays(t, -inactivityDays));
  const weekAhead = toISODate(addDays(t, 7));
  const monthAgo = toISODate(addDays(t, -30));
  const fortnightAgo = toISODate(addDays(t, -13));

  /*
   * One parallel batch instead of a chain of sequential round trips: with a remote
   * Postgres (Supabase) each awaited statement costs a full network hop.
   */
  const [statsRows, daily, growthRows, peak, breakdown, recentPayments, expiringSoon, checkIns] = await Promise.all([
    rows<{
      total: number;
      active: number;
      expired: number;
      new_this_month: number;
      expiring: number;
      pending: number;
      pending_count: number;
      overdue: number;
      overdue_count: number;
      rev30: number;
      rev_prev30: number;
      collected_today: number;
      present_today: number;
      inactive_count: number;
    }>(sql`
      select
        (select count(*)::int from ${members} where gym_id = ${gymId}) as total,
        (select count(*)::int from ${members} where gym_id = ${gymId} and status = 'ACTIVE') as active,
        (select count(*)::int from ${members} where gym_id = ${gymId} and status = 'EXPIRED') as expired,
        (select count(*)::int from ${members} where gym_id = ${gymId} and joining_date >= ${monthAgo}) as new_this_month,
        (select count(*)::int from ${subscriptions} where gym_id = ${gymId} and status in ('ACTIVE','EXPIRING') and end_date between ${toISODate(t)} and ${weekAhead}) as expiring,
        (select coalesce(sum(amount_due),0)::int from ${subscriptions} where gym_id = ${gymId} and amount_due > 0 and status in ('ACTIVE','EXPIRING')) as pending,
        (select count(*)::int from ${subscriptions} where gym_id = ${gymId} and amount_due > 0 and status in ('ACTIVE','EXPIRING')) as pending_count,
        (select coalesce(sum(amount_due),0)::int from ${subscriptions} where gym_id = ${gymId} and amount_due > 0 and status = 'EXPIRED') as overdue,
        (select count(*)::int from ${subscriptions} where gym_id = ${gymId} and amount_due > 0 and status = 'EXPIRED') as overdue_count,
        (select coalesce(sum(amount),0)::int from ${payments} where gym_id = ${gymId} and payment_date >= ${start30}::date) as rev30,
        (select coalesce(sum(amount),0)::int from ${payments} where gym_id = ${gymId} and payment_date >= ${start60}::date and payment_date < ${start30}::date) as rev_prev30,
        (select coalesce(sum(amount),0)::int from ${payments} where gym_id = ${gymId} and payment_date >= ${toISODate(t)}::date) as collected_today,
        (select count(*)::int from ${attendance} a join ${members} m on m.id = a.member_id where a.gym_id = ${gymId} and a.date = ${toISODate(t)}) as present_today,
        (select count(*)::int from ${members} m where m.gym_id = ${gymId} and m.status = 'ACTIVE'
           and not exists (select 1 from ${attendance} a where a.member_id = m.id and a.date >= ${windowStart})) as inactive_count
    `),
    rows<{ day: string; total: number }>(sql`
      select to_char(payment_date, 'YYYY-MM-DD') as day, sum(amount)::int as total
      from ${payments}
      where gym_id = ${gymId} and payment_date >= ${start60}::date
      group by 1 order by 1
    `),
    rows<{ label: string; total: number; active: number }>(sql`
      with months as (
        select date_trunc('month', (current_date - (n || ' month')::interval)) as m
        from generate_series(0, 5) as n
      )
      select to_char(m, 'Mon') as label,
        (select count(*)::int from ${members} where gym_id = ${gymId} and joining_date < (m + interval '1 month')::date) as total,
        (select count(*)::int from ${members} where gym_id = ${gymId} and status = 'ACTIVE' and joining_date < (m + interval '1 month')::date) as active
      from months order by m
    `),
    rows<{ hour: string; value: number }>(sql`
      select to_char(date_trunc('hour', check_in), 'HH24') as hour, count(*)::int as value
      from ${attendance}
      where gym_id = ${gymId} and date >= ${fortnightAgo}
      group by 1 order by 1
    `),
    rows<{ label: string; value: number }>(sql`
      select
        case
          when notes ilike '%personal training%' then 'Personal Training'
          when notes ilike '%class%' then 'Classes'
          when notes ilike '%membership%' then 'Membership'
          else 'Other'
        end as label,
        sum(amount)::int as value
      from ${payments}
      where gym_id = ${gymId} and payment_date >= ${start30}::date
      group by 1 order by 2 desc
    `),
    rows<{
      id: number;
      member_name: string;
      member_code: string;
      amount: number;
      method: string;
      payment_date: string;
      notes: string | null;
    }>(sql`
      select p.id, m.name as member_name, m.member_code, p.amount, p.method::text as method,
             to_char(p.payment_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as payment_date, p.notes
      from ${payments} p join ${members} m on m.id = p.member_id
      where p.gym_id = ${gymId}
      order by p.payment_date desc limit 6
    `),
    rows<{
      id: number;
      name: string;
      member_code: string;
      plan: string;
      end_date: string;
      days_left: number;
    }>(sql`
      select m.id, m.name, m.member_code, pl.name as plan, s.end_date::text as end_date,
             (s.end_date - current_date)::int as days_left
      from ${subscriptions} s
      join ${members} m on m.id = s.member_id
      join ${membershipPlans} pl on pl.id = s.plan_id
      where s.gym_id = ${gymId} and s.status in ('ACTIVE','EXPIRING')
        and s.end_date <= ${weekAhead}
      order by s.end_date asc limit 6
    `),
    rows<{ id: number; name: string; member_code: string; method: string; check_in: string | null }>(sql`
      select a.id, m.name, m.member_code, a.method::text as method,
             to_char(a.check_in AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as check_in
      from ${attendance} a join ${members} m on m.id = a.member_id
      where a.gym_id = ${gymId} and a.date = ${toISODate(t)}
      order by a.check_in desc limit 6
    `),
  ]);

  const stats = statsRows[0];
  const byDay = new Map(daily.map((d) => [d.day, d.total]));
  const revenueSeries = Array.from({ length: 30 }, (_, i) => {
    const key = toISODate(addDays(t, -29 + i));
    return { label: key.slice(5), value: byDay.get(key) ?? 0 };
  });
  const previousSeries = Array.from({ length: 30 }, (_, i) => {
    const key = toISODate(addDays(t, -59 + i));
    return { label: key.slice(5), value: byDay.get(key) ?? 0 };
  });

  const membersActive = stats?.active ?? 0;
  const attendanceRate = pct(stats?.present_today ?? 0, membersActive);
  const growthDelta = (stats?.rev30 ?? 0) - (stats?.rev_prev30 ?? 0);
  const breakdownMapped = breakdown.map((b) => ({
    label: b.label,
    value: b.value,
    accent: (b.label === "Membership"
      ? "cyan"
      : b.label === "Personal Training"
        ? "lavender"
        : b.label === "Classes"
          ? "blush"
          : "cream") as PastelKey,
  }));

  const insights: AttentionItem[] = [
    {
      id: "expiring",
      title: `${stats?.expiring ?? 0} memberships expire this week`,
      detail: `₹${(Math.abs(growthDelta) / 1000).toFixed(1)}K ${growthDelta >= 0 ? "more" : "less"} collected than the previous 30 days.`,
      cta: "View",
      href: "/admin/memberships?tab=expiring",
      accent: "lavender",
    },
    {
      id: "pending",
      title: `₹${((stats?.pending ?? 0) / 1000).toFixed(1)}K remains unpaid`,
      detail: `${stats?.pending_count ?? 0} subscriptions carry an outstanding balance.`,
      cta: "View Payments",
      href: "/admin/payments?tab=pending",
      accent: "blush",
    },
    {
      id: "inactive",
      title: `${stats?.inactive_count ?? 0} members haven't visited in ${inactivityDays} days`,
      detail: "Send a win-back nudge from the communication centre.",
      cta: "View Members",
      href: "/admin/members?filter=inactive",
      accent: "cyan",
    },
    {
      id: "evening",
      title: "Evening attendance is highest",
      detail: "6 PM – 8 PM carries the majority of daily check-ins.",
      cta: "Open Analytics",
      href: "/admin/analytics",
      accent: "cream",
    },
  ];

  return {
    membersTotal: stats?.total ?? 0,
    membersActive,
    membersExpiring: stats?.expiring ?? 0,
    membersExpired: stats?.expired ?? 0,
    newThisMonth: stats?.new_this_month ?? 0,
    revenue30: stats?.rev30 ?? 0,
    revenuePrev30: stats?.rev_prev30 ?? 0,
    collectedToday: stats?.collected_today ?? 0,
    pendingTotal: stats?.pending ?? 0,
    pendingCount: stats?.pending_count ?? 0,
    overdueTotal: stats?.overdue ?? 0,
    overdueCount: stats?.overdue_count ?? 0,
    attendanceToday: stats?.present_today ?? 0,
    rosterActive: membersActive,
    attendanceRate,
    inactiveCount: stats?.inactive_count ?? 0,
    revenueSeries,
    previousSeries,
    growth: growthRows.map((g) => ({ label: g.label, total: g.total, active: g.active })),
    peakHours: peak.map((p) => ({ label: `${p.hour}h`, value: p.value })),
    breakdown: breakdownMapped,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      memberName: p.member_name,
      memberCode: p.member_code,
      amount: p.amount,
      method: p.method,
      paymentDate: toDate(p.payment_date) ?? new Date(),
      note: p.notes,
    })),
    expiringSoon: expiringSoon.map((e) => ({
      id: e.id,
      name: e.name,
      memberCode: e.member_code,
      plan: e.plan,
      endDate: e.end_date,
      daysLeft: e.days_left,
    })),
    insights,
    todayCheckIns: checkIns.map((c) => ({
      id: c.id,
      name: c.name,
      memberCode: c.member_code,
      method: c.method,
      checkIn: toDate(c.check_in),
    })),
    occupancyPct: attendanceRate,
  };
});

/* ------------------------------------------------------------------ */
/* Members                                                            */
/* ------------------------------------------------------------------ */

export type MemberListItem = {
  id: number;
  name: string;
  memberCode: string;
  phone: string | null;
  email: string | null;
  status: string;
  plan: string | null;
  endDate: string | null;
  daysLeft: number | null;
  amountDue: number;
  visits: number;
  joined: string;
  trainerName: string | null;
};

async function _listMembers(
  gymId: number,
  opts: { filter?: string; q?: string; plan?: string; page?: number; pageSize?: number } = {},
): Promise<{ items: MemberListItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = opts.pageSize ?? 24;
  const page = Math.max(1, opts.page ?? 1);
  const t = today();

  const filters: SQL[] = [sql`m.gym_id = ${gymId}`];
  if (opts.q) filters.push(sql`(m.name ilike ${`%${opts.q}%`} or m.member_code ilike ${`%${opts.q}%`} or coalesce(m.phone,'') ilike ${`%${opts.q}%`})`);
  if (opts.plan) filters.push(sql`pl.name = ${opts.plan}`);

  switch (opts.filter) {
    case "active":
      filters.push(sql`m.status = 'ACTIVE'`);
      break;
    case "expiring":
      filters.push(sql`s.status in ('ACTIVE','EXPIRING') and s.end_date between ${toISODate(t)} and ${toISODate(addDays(t, 7))}`);
      break;
    case "expired":
      filters.push(sql`(m.status = 'EXPIRED' or s.end_date < ${toISODate(t)})`);
      break;
    case "pending":
      filters.push(sql`s.amount_due > 0`);
      break;
    case "inactive":
      filters.push(sql`not exists (select 1 from ${attendance} a where a.member_id = m.id and a.date >= ${toISODate(addDays(t, -14))})`);
      break;
    case "new":
      filters.push(sql`m.joining_date >= ${toISODate(addDays(t, -30))}`);
      break;
    default:
      break;
  }
  const where = and(...filters);

  const base = sql`
    from ${members} m
    left join lateral (
      select s.*, pl.name as plan_name
      from ${subscriptions} s join ${membershipPlans} pl on pl.id = s.plan_id
      where s.member_id = m.id order by s.end_date desc limit 1
    ) s on true
    left join membership_plans pl on pl.id = s.plan_id
    left join lateral (
      select count(*)::int as visits from ${attendance} a where a.member_id = m.id
    ) att on true
    left join lateral (
      select t.name from ${trainerMembers} tm join ${trainers} t on t.id = tm.trainer_id
      where tm.member_id = m.id and tm.status = 'ACTIVE' limit 1
    ) tr on true
  `;

  const [countRow] = await rows<{ c: number }>(sql`select count(*)::int as c ${base} where ${where}`);
  const items = await rows<{
    id: number;
    name: string;
    member_code: string;
    phone: string | null;
    email: string | null;
    status: string;
    plan_name: string | null;
    end_date: string | null;
    days_left: number | null;
    amount_due: number | null;
    visits: number;
    joining_date: string;
    trainer_name: string | null;
  }>(sql`
    select m.id, m.name, m.member_code, m.phone, m.email, m.status::text as status,
           s.plan_name, s.end_date::text as end_date,
           (s.end_date - current_date)::int as days_left,
           coalesce(s.amount_due, 0) as amount_due,
           coalesce(att.visits, 0) as visits,
           m.joining_date::text as joining_date,
           tr.name as trainer_name
    ${base}
    where ${where}
    order by m.name asc
    limit ${pageSize} offset ${(page - 1) * pageSize}
  `);

  return {
    items: items.map((m) => ({
      id: m.id,
      name: m.name,
      memberCode: m.member_code,
      phone: m.phone,
      email: m.email,
      status: m.status,
      plan: m.plan_name,
      endDate: m.end_date,
      daysLeft: m.days_left,
      amountDue: m.amount_due ?? 0,
      visits: m.visits,
      joined: m.joining_date,
      trainerName: m.trainer_name,
    })),
    total: countRow?.c ?? 0,
    page,
    pageSize,
  };
}

async function _getMemberProfile(gymId: number, memberId: number) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.gymId, gymId), eq(members.id, memberId)))
    .limit(1);
  if (!member) return null;

  const [user] = await db.select().from(users).where(eq(users.id, member.userId)).limit(1);

  const subs = await db
    .select({
      id: subscriptions.id,
      startDate: subscriptions.startDate,
      endDate: subscriptions.endDate,
      price: subscriptions.price,
      discount: subscriptions.discount,
      amountPaid: subscriptions.amountPaid,
      amountDue: subscriptions.amountDue,
      status: subscriptions.status,
      planName: membershipPlans.name,
      planId: membershipPlans.id,
      durationDays: membershipPlans.durationDays,
    })
    .from(subscriptions)
    .leftJoin(membershipPlans, eq(membershipPlans.id, subscriptions.planId))
    .where(eq(subscriptions.memberId, memberId))
    .orderBy(desc(subscriptions.endDate));

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.memberId, memberId))
    .orderBy(desc(payments.paymentDate))
    .limit(40);

  const visits = await db
    .select({
      id: attendance.id,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      method: attendance.method,
    })
    .from(attendance)
    .where(eq(attendance.memberId, memberId))
    .orderBy(desc(attendance.date))
    .limit(60);

  const [trainerRow] = await db
    .select({
      id: trainers.id,
      name: trainers.name,
      specialization: trainers.specialization,
      experienceYears: trainers.experienceYears,
      phone: trainers.phone,
      email: trainers.email,
      assignedAt: trainerMembers.assignedAt,
    })
    .from(trainerMembers)
    .innerJoin(trainers, eq(trainers.id, trainerMembers.trainerId))
    .where(and(eq(trainerMembers.memberId, memberId), eq(trainerMembers.status, "ACTIVE")))
    .limit(1);

  const activity = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.gymId, gymId), eq(auditLogs.entityType, "MEMBER"), eq(auditLogs.entityId, memberId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  const current = subs.find((s) => s.status === "ACTIVE" || s.status === "EXPIRING") ?? subs[0] ?? null;
  const endDate = toDate(current?.endDate);
  const daysLeft = endDate ? Math.round((endDate.getTime() - t0()) / 86_400_000) : 0;
  const windowStart = addDays(today(), -30).getTime();
  const visitsLast30 = visits.filter((v) => (toDate(v.date)?.getTime() ?? 0) >= windowStart).length;

  return {
    member,
    user: user ?? null,
    subscriptions: subs,
    current,
    daysLeft,
    payments: paymentRows,
    visits,
    trainer: trainerRow ?? null,
    activity,
    attendanceRate: Math.min(100, Math.round((visitsLast30 / 22) * 100)),
    visitsLast30,
  };
}

function t0() {
  return today().getTime();
}

/* ------------------------------------------------------------------ */
/* Trainers                                                           */
/* ------------------------------------------------------------------ */

async function _listTrainers(gymId: number) {
  return rows<{
    id: number;
    name: string;
    trainer_code: string;
    specialization: string | null;
    experience_years: number;
    phone: string | null;
    email: string | null;
    status: string;
    assigned: number;
    attendance_rate: number;
    present_days: number;
    salary: number | null;
    employment_type: string | null;
    contract_end: string | null;
  }>(sql`
    select t.id, t.name, t.trainer_code, t.specialization, t.experience_years, t.phone, t.email, t.status::text as status,
      (select count(*)::int from ${trainerMembers} tm where tm.trainer_id = t.id and tm.status = 'ACTIVE') as assigned,
      (select coalesce(round(100.0 * count(*) / 30), 0)::int from ${attendance} a where a.trainer_id = t.id and a.date >= ${toISODate(addDays(today(), -29))}) as attendance_rate,
      (select count(*)::int from ${attendance} a where a.trainer_id = t.id and a.date >= ${toISODate(addDays(today(), -29))}) as present_days,
      c.salary, c.employment_type, c.contract_end::text as contract_end
    from ${trainers} t
    left join lateral (select * from ${trainerContracts} where trainer_id = t.id order by id desc limit 1) c on true
    where t.gym_id = ${gymId}
    order by t.name asc
  `);
}

async function _getTrainerProfile(gymId: number, trainerId: number) {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(and(eq(trainers.gymId, gymId), eq(trainers.id, trainerId)))
    .limit(1);
  if (!trainer) return null;

  const [contract] = await db
    .select()
    .from(trainerContracts)
    .where(eq(trainerContracts.trainerId, trainerId))
    .orderBy(desc(trainerContracts.id))
    .limit(1);

  const assigned = await rows<{
    id: number;
    name: string;
    member_code: string;
    plan_name: string | null;
    status: string;
    visits: number;
    assigned_at: string;
    present_today: boolean;
  }>(sql`
    select m.id, m.name, m.member_code, pl.name as plan_name, m.status::text as status,
      (select count(*)::int from ${attendance} a where a.member_id = m.id and a.date >= ${toISODate(addDays(today(), -29))}) as visits,
      tm.assigned_at::text as assigned_at,
      exists(select 1 from ${attendance} a where a.member_id = m.id and a.date = ${toISODate(today())}) as present_today
    from ${trainerMembers} tm
    join ${members} m on m.id = tm.member_id
    left join lateral (select pl.name from ${subscriptions} s join ${membershipPlans} pl on pl.id = s.plan_id where s.member_id = m.id order by s.end_date desc limit 1) pl on true
    where tm.trainer_id = ${trainerId} and tm.status = 'ACTIVE'
    order by m.name asc
  `);

  const attendanceRows = await db
    .select()
    .from(attendance)
    .where(eq(attendance.trainerId, trainerId))
    .orderBy(desc(attendance.date))
    .limit(30);

  return { trainer, contract: contract ?? null, assigned, attendanceRows };
}

/* ------------------------------------------------------------------ */
/* Memberships                                                        */
/* ------------------------------------------------------------------ */

async function _getMembershipOverview(gymId: number) {
  const t = today();
  const [stats] = await rows<{ active: number; expiring: number; expired: number; renewed: number; collected: number; due: number }>(sql`
    select
      (select count(*)::int from ${subscriptions} where gym_id = ${gymId} and status in ('ACTIVE','EXPIRING') and end_date >= ${toISODate(t)}) as active,
      (select count(*)::int from ${subscriptions} where gym_id = ${gymId} and status in ('ACTIVE','EXPIRING') and end_date between ${toISODate(t)} and ${toISODate(addDays(t, 7))}) as expiring,
      (select count(*)::int from ${subscriptions} where gym_id = ${gymId} and (status = 'EXPIRED' or end_date < ${toISODate(t)})) as expired,
      (select count(*)::int from ${subscriptions} where gym_id = ${gymId} and renewed_from_id is not null) as renewed,
      (select coalesce(sum(amount_paid),0)::int from ${subscriptions} where gym_id = ${gymId}) as collected,
      (select coalesce(sum(amount_due),0)::int from ${subscriptions} where gym_id = ${gymId}) as due
  `);

  const plans = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.gymId, gymId))
    .orderBy(membershipPlans.price);

  const planCounts = await rows<{ plan_id: number; c: number; revenue: number }>(sql`
    select plan_id, count(*)::int as c, sum(price - discount)::int as revenue
    from ${subscriptions} where gym_id = ${gymId} group by plan_id
  `);

  const subscriptionRows = await rows<{
    id: number;
    member_name: string;
    member_code: string;
    plan_name: string;
    start_date: string;
    end_date: string;
    price: number;
    discount: number;
    amount_paid: number;
    amount_due: number;
    status: string;
    days_left: number;
  }>(sql`
    select s.id, m.name as member_name, m.member_code, pl.name as plan_name,
      s.start_date::text as start_date, s.end_date::text as end_date, s.price, s.discount,
      s.amount_paid, s.amount_due, s.status::text as status, (s.end_date - current_date)::int as days_left
    from ${subscriptions} s
    join ${members} m on m.id = s.member_id
    join ${membershipPlans} pl on pl.id = s.plan_id
    where s.gym_id = ${gymId}
    order by s.end_date asc
    limit 120
  `);

  const lifecycle = await rows<{ status: string; c: number }>(sql`
    select status::text as status, count(*)::int as c from ${subscriptions}
    where gym_id = ${gymId} group by 1
  `);

  return {
    stats: stats ?? { active: 0, expiring: 0, expired: 0, renewed: 0, collected: 0, due: 0 },
    plans: plans.map((p) => ({
      ...p,
      activeMembers: planCounts.find((c) => c.plan_id === p.id)?.c ?? 0,
      revenue: planCounts.find((c) => c.plan_id === p.id)?.revenue ?? 0,
    })),
    subscriptions: subscriptionRows,
    lifecycle,
  };
}

/* ------------------------------------------------------------------ */
/* Payments                                                           */
/* ------------------------------------------------------------------ */

async function _getPaymentsOverview(gymId: number) {
  const t = today();
  const [totals] = await rows<{ revenue: number; collected_today: number; pending: number; overdue: number; count: number }>(sql`
    select
      (select coalesce(sum(amount),0)::int from ${payments} where gym_id = ${gymId} and payment_date >= ${toISODate(addDays(t, -29))}::date) as revenue,
      (select coalesce(sum(amount),0)::int from ${payments} where gym_id = ${gymId} and payment_date >= ${toISODate(t)}::date) as collected_today,
      (select coalesce(sum(amount_due),0)::int from ${subscriptions} where gym_id = ${gymId} and amount_due > 0 and status in ('ACTIVE','EXPIRING')) as pending,
      (select coalesce(sum(amount_due),0)::int from ${subscriptions} where gym_id = ${gymId} and amount_due > 0 and status = 'EXPIRED') as overdue,
      (select count(*)::int from ${payments} where gym_id = ${gymId} and payment_date >= ${toISODate(addDays(t, -29))}::date) as count
  `);

  const methodMix = await rows<{ method: string; value: number }>(sql`
    select method::text as method, sum(amount)::int as value from ${payments}
    where gym_id = ${gymId} and payment_date >= ${toISODate(addDays(t, -29))}::date
    group by 1 order by 2 desc
  `);

  const transactions = await rows<{
    id: number;
    member_id: number;
    member_name: string;
    member_code: string;
    plan_name: string | null;
    amount: number;
    method: string;
    payment_date: string;
    receipt_number: string;
    notes: string | null;
  }>(sql`
    select p.id, m.id as member_id, m.name as member_name, m.member_code, pl.name as plan_name,
      p.amount, p.method::text as method, to_char(p.payment_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as payment_date, 
      p.receipt_number, p.notes
    from ${payments} p
    join ${members} m on m.id = p.member_id
    left join ${subscriptions} s on s.id = p.subscription_id
    left join ${membershipPlans} pl on pl.id = s.plan_id
    where p.gym_id = ${gymId}
    order by p.payment_date desc
    limit 60
  `);

  const pending = await rows<{
    id: number;
    member_id: number;
    member_name: string;
    member_code: string;
    plan_name: string;
    total: number;
    paid: number;
    due: number;
    end_date: string;
    status: string;
  }>(sql`
    select s.id, m.id as member_id, m.name as member_name, m.member_code, pl.name as plan_name,
      (s.price - s.discount)::int as total, s.amount_paid as paid, s.amount_due as due,
      s.end_date::text as end_date, s.status::text as status
    from ${subscriptions} s
    join ${members} m on m.id = s.member_id
    join ${membershipPlans} pl on pl.id = s.plan_id
    where s.gym_id = ${gymId} and s.amount_due > 0
    order by s.end_date asc
    limit 80
  `);

  return {
    totals: totals ?? { revenue: 0, collected_today: 0, pending: 0, overdue: 0, count: 0 },
    methodMix,
    transactions: transactions.map((tr) => ({ ...tr, paymentDate: toDate(tr.payment_date) ?? new Date() })),
    pending,
  };
}

async function _getReceipt(gymId: number, paymentId: number) {
  const [receipt] = await rows<{
    id: number;
    receipt_number: string;
    amount: number;
    method: string;
    payment_date: string;
    notes: string | null;
    member_name: string;
    member_code: string;
    member_phone: string | null;
    member_email: string | null;
    plan_name: string | null;
    start_date: string | null;
    end_date: string | null;
    total: number | null;
    paid: number | null;
    due: number | null;
    subscription_status: string | null;
  }>(sql`
    select p.id, p.receipt_number, p.amount, p.method::text as method,
      to_char(p.payment_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as payment_date, p.notes,
      m.name as member_name, m.member_code, m.phone as member_phone, m.email as member_email,
      pl.name as plan_name, s.start_date::text as start_date, s.end_date::text as end_date,
      (s.price - s.discount)::int as total, s.amount_paid as paid, s.amount_due as due, s.status::text as subscription_status
    from ${payments} p
    join ${members} m on m.id = p.member_id
    left join ${subscriptions} s on s.id = p.subscription_id
    left join ${membershipPlans} pl on pl.id = s.plan_id
    where p.gym_id = ${gymId} and p.id = ${paymentId}
    limit 1
  `);
  if (!receipt) return null;
  const [gym] = await db.select().from(gyms).where(eq(gyms.id, gymId)).limit(1);
  return { receipt, gym };
}

async function _getPaymentTimeline(gymId: number, memberId: number) {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.gymId, gymId), eq(payments.memberId, memberId)))
    .orderBy(desc(payments.paymentDate));
}

/* ------------------------------------------------------------------ */
/* Attendance                                                         */
/* ------------------------------------------------------------------ */

async function _getAttendanceOverview(gymId: number) {
  const t = today();
  const [stats] = await rows<{ present_today: number; roster: number; active: number }>(sql`
    select
      (select count(*)::int from ${attendance} a join ${members} m on m.id = a.member_id where a.gym_id = ${gymId} and a.date = ${toISODate(t)}) as present_today,
      (select count(*)::int from ${members} where gym_id = ${gymId}) as roster,
      (select count(*)::int from ${members} where gym_id = ${gymId} and status = 'ACTIVE') as active
  `);

  const trend = await rows<{ day: string; visits: number }>(sql`
    select to_char(date, 'YYYY-MM-DD') as day, count(*)::int as visits
    from ${attendance} where gym_id = ${gymId} and date >= ${toISODate(addDays(t, -29))}
    group by 1 order by 1
  `);
  const byDay = new Map(trend.map((r) => [r.day, r.visits]));
  const calendar = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(t, -29 + i);
    const key = toISODate(day);
    return { date: key, visits: byDay.get(key) ?? 0 };
  });

  const peak = await rows<{ hour: string; value: number }>(sql`
    select to_char(date_trunc('hour', check_in), 'HH24') as hour, count(*)::int as value
    from ${attendance} where gym_id = ${gymId} and date >= ${toISODate(addDays(t, -13))}
    group by 1 order by 1
  `);

  const methodMix = await rows<{ method: string; c: number }>(sql`
    select method::text as method, count(*)::int as c from ${attendance}
    where gym_id = ${gymId} and date >= ${toISODate(addDays(t, -29))}
    group by 1 order by 2 desc
  `);

  const topVisitors = await rows<{ id: number; name: string; member_code: string; visits: number; plan_name: string | null }>(sql`
    select m.id, m.name, m.member_code, count(*)::int as visits, pl.name as plan_name
    from ${attendance} a join ${members} m on m.id = a.member_id
    left join lateral (select pl.name from ${subscriptions} s join ${membershipPlans} pl on pl.id = s.plan_id where s.member_id = m.id order by s.end_date desc limit 1) pl on true
    where a.gym_id = ${gymId} and a.date >= ${toISODate(addDays(t, -29))}
    group by m.id, m.name, m.member_code, pl.name
    order by 4 desc limit 8
  `);

  const trainerAttendance = await rows<{ id: number; name: string; present: number; late: number; rate: number }>(sql`
    select t.id, t.name,
      count(*)::int as present,
      coalesce(sum(case when a.status = 'LATE' then 1 else 0 end), 0)::int as late,
      coalesce(round(100.0 * count(*) / 30), 0)::int as rate
    from ${trainers} t
    left join ${attendance} a on a.trainer_id = t.id and a.date >= ${toISODate(addDays(t, -29))}
    where t.gym_id = ${gymId}
    group by t.id, t.name
    order by rate desc
  `);

  const liveFeed = await rows<{ id: number; name: string; member_code: string; method: string; check_in: string | null }>(sql`
    select a.id, m.name, m.member_code, a.method::text as method, to_char(a.check_in AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as check_in
    from ${attendance} a join ${members} m on m.id = a.member_id
    where a.gym_id = ${gymId} and a.date = ${toISODate(t)}
    order by a.check_in desc limit 12
  `);

  return {
    presentToday: stats?.present_today ?? 0,
    roster: stats?.roster ?? 0,
    active: stats?.active ?? 0,
    rate: pct(stats?.present_today ?? 0, stats?.roster ?? 0),
    calendar,
    peak,
    methodMix,
    topVisitors,
    trainerAttendance,
    liveFeed: liveFeed.map((f) => ({ ...f, checkIn: toDate(f.check_in) })),
  };
}

/* ------------------------------------------------------------------ */
/* Communication, holidays, events, settings                          */
/* ------------------------------------------------------------------ */

async function _listNotifications(gymId: number) {
  const data = await rows<{
    id: number;
    title: string;
    message: string;
    type: string;
    audience: string;
    created_at: string;
    recipients: number;
    read_count: number;
  }>(sql`
    select n.id, n.title, n.message, n.type::text as type, n.audience,
      to_char(n.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      (select count(*)::int from ${notificationRecipients} r where r.notification_id = n.id) as recipients,
      (select count(*)::int from ${notificationRecipients} r where r.notification_id = n.id and r.read_at is not null) as read_count
    from ${notifications} n where n.gym_id = ${gymId}
    order by n.created_at desc limit 40
  `);
  return data.map((n) => ({ ...n, createdAt: toDate(n.created_at) ?? new Date() }));
}

async function _listHolidays(gymId: number) {
  return db.select().from(holidays).where(eq(holidays.gymId, gymId)).orderBy(holidays.date);
}

async function _listEvents(gymId: number) {
  return db.select().from(events).where(eq(events.gymId, gymId)).orderBy(events.date);
}

async function _listExpenses(gymId: number) {
  return db.select().from(expenses).where(eq(expenses.gymId, gymId)).orderBy(desc(expenses.expenseDate)).limit(20);
}

async function _listAuditLogs(gymId: number) {
  const data = await rows<{
    id: number;
    action: string;
    entity_type: string;
    entity_id: number | null;
    created_at: string;
    actor: string | null;
  }>(sql`
    select l.id, l.action, l.entity_type, l.entity_id, to_char(l.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, u.name as actor
    from ${auditLogs} l left join ${users} u on u.id = l.user_id
    where l.gym_id = ${gymId} order by l.created_at desc limit 25
  `);
  return data.map((l) => ({ ...l, createdAt: toDate(l.created_at) ?? new Date() }));
}

/* ------------------------------------------------------------------ */
/* Analytics                                                          */
/* ------------------------------------------------------------------ */

async function _getAnalytics(gymId: number) {
  const t = today();
  const since6m = toISODate(addDays(t, -182));
  const since4w = toISODate(addDays(t, -27));
  const since30 = toISODate(addDays(t, -29));

  // Overview + the five breakdowns resolve in a single parallel batch.
  const [overview, revenueByMonth, planRevenue, retention, weekday, avgRows] = await Promise.all([
    getAdminOverview(gymId),
    rows<{ label: string; value: number }>(sql`
      select to_char(date_trunc('month', payment_date), 'Mon') as label, sum(amount)::int as value
      from ${payments}
      where gym_id = ${gymId} and payment_date >= ${since6m}::date
      group by date_trunc('month', payment_date) order by date_trunc('month', payment_date)
    `),
    rows<{ label: string; value: number }>(sql`
      select pl.name as label, coalesce(sum(s.amount_paid), 0)::int as value
      from ${subscriptions} s join ${membershipPlans} pl on pl.id = s.plan_id
      where s.gym_id = ${gymId}
      group by pl.name order by 2 desc
    `),
    rows<{ label: string; value: number }>(sql`
      select pl.name as label, count(*)::int as value
      from ${subscriptions} s join ${membershipPlans} pl on pl.id = s.plan_id
      where s.gym_id = ${gymId} and s.renewed_from_id is not null
      group by 1 order by 2 desc
    `),
    rows<{ label: string; value: number }>(sql`
      select to_char(date, 'Dy') as label, count(*)::int as value
      from ${attendance} where gym_id = ${gymId} and date >= ${since4w}
      group by 1, extract(dow from date) order by extract(dow from date)
    `),
    rows<{ avg_visits: number; total: number }>(sql`
      select coalesce(round(avg(daily)), 0)::int as avg_visits, coalesce(sum(daily), 0)::int as total from (
        select date, count(*)::int as daily from ${attendance}
        where gym_id = ${gymId} and date >= ${since30} group by date
      ) x
    `),
  ]);

  const avg = avgRows[0];
  return { overview, revenueByMonth, planRevenue, retention, weekday, avgVisits: avg?.avg_visits ?? 0, totalVisits: avg?.total ?? 0 };
}

/* ------------------------------------------------------------------ */
/* Member-side loaders                                                */
/* ------------------------------------------------------------------ */

async function _getMemberDashboard(gymId: number, memberId: number) {
  const profile = await getMemberProfile(gymId, memberId);
  if (!profile) return null;
  const [holidayList, eventList, notificationList, unreadRow] = await Promise.all([
    db.select().from(holidays).where(and(eq(holidays.gymId, gymId), gte(holidays.date, toISODate(today())))).orderBy(holidays.date).limit(3),
    db.select().from(events).where(and(eq(events.gymId, gymId), gte(events.date, toISODate(today())))).orderBy(events.date).limit(3),
    getMemberNotifications(profile.member.userId),
    rows<{ c: number }>(sql`select count(*)::int as c from ${notificationRecipients} where user_id = ${profile.member.userId} and read_at is null`),
  ]);
  return { ...profile, holidays: holidayList, events: eventList, notifications: notificationList, unread: unreadRow[0]?.c ?? 0 };
}

async function _getMemberNotifications(userId: number) {
  const data = await rows<{
    id: number;
    title: string;
    message: string;
    type: string;
    created_at: string;
    read_at: string | null;
  }>(sql`
    select n.id, n.title, n.message, n.type::text as type,
      to_char(n.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      to_char(r.read_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as read_at
    from ${notificationRecipients} r
    join ${notifications} n on n.id = r.notification_id
    where r.user_id = ${userId}
    order by n.created_at desc limit 40
  `);
  return data.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    createdAt: toDate(n.created_at) ?? new Date(),
    readAt: toDate(n.read_at),
  }));
}

async function _getTrainerDashboard(gymId: number, trainerId: number, userId: number) {
  const [stats] = await rows<{ assigned: number; checked_in: number; rate: number; present: number; late: number; absent: number }>(sql`
    select
      (select count(*)::int from ${trainerMembers} tm where tm.trainer_id = ${trainerId} and tm.status = 'ACTIVE') as assigned,
      (select count(*)::int from ${trainerMembers} tm join ${attendance} a on a.member_id = tm.member_id and a.date = ${toISODate(today())}
        where tm.trainer_id = ${trainerId} and tm.status = 'ACTIVE') as checked_in,
      (select coalesce(round(100.0 * count(*) / 30), 0)::int from ${attendance} where trainer_id = ${trainerId} and date >= ${toISODate(addDays(today(), -29))}) as rate,
      (select coalesce(sum(case when status = 'PRESENT' then 1 else 0 end), 0)::int from ${attendance} where trainer_id = ${trainerId} and date >= ${toISODate(addDays(today(), -29))}) as present,
      (select coalesce(sum(case when status = 'LATE' then 1 else 0 end), 0)::int from ${attendance} where trainer_id = ${trainerId} and date >= ${toISODate(addDays(today(), -29))}) as late,
      (select greatest(0, 30 - count(*))::int from ${attendance} where trainer_id = ${trainerId} and date >= ${toISODate(addDays(today(), -29))}) as absent
  `);

  const roster = await rows<{
    id: number;
    name: string;
    member_code: string;
    plan_name: string | null;
    visits: number;
    present_today: boolean;
    amount_due: number;
  }>(sql`
    select m.id, m.name, m.member_code, pl.name as plan_name,
      (select count(*)::int from ${attendance} a where a.member_id = m.id and a.date >= ${toISODate(addDays(today(), -29))}) as visits,
      exists(select 1 from ${attendance} a where a.member_id = m.id and a.date = ${toISODate(today())}) as present_today,
      coalesce(s.amount_due, 0) as amount_due
    from ${trainerMembers} tm
    join ${members} m on m.id = tm.member_id
    left join lateral (select amount_due from ${subscriptions} where member_id = m.id order by end_date desc limit 1) s on true
    left join lateral (select pl.name from ${subscriptions} s2 join ${membershipPlans} pl on pl.id = s2.plan_id where s2.member_id = m.id order by s2.end_date desc limit 1) pl on true
    where tm.trainer_id = ${trainerId} and tm.status = 'ACTIVE'
    order by present_today desc, m.name asc
  `);

  const weekTrend = await rows<{ day: string; visits: number }>(sql`
    select to_char(a.date, 'YYYY-MM-DD') as day, count(*)::int as visits
    from ${attendance} a join ${trainerMembers} tm on tm.member_id = a.member_id
    where tm.trainer_id = ${trainerId} and a.date >= ${toISODate(addDays(today(), -13))}
    group by 1 order by 1
  `);

  const own = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.userId, userId), gte(attendance.date, toISODate(addDays(today(), -29)))))
    .orderBy(desc(attendance.date));

  return { stats: stats ?? { assigned: 0, checked_in: 0, rate: 0, present: 0, late: 0, absent: 0 }, roster, weekTrend, own };
}

/* ------------------------------------------------------------------ */
/* Command palette search                                             */
/* ------------------------------------------------------------------ */

export async function searchEverything(gymId: number, q: string) {
  const term = `%${q}%`;
  if (!q.trim()) return { members: [], trainers: [], plans: [] };
  const [memberHits, trainerHits, planHits] = await Promise.all([
    db
      .select({ id: members.id, name: members.name, code: members.memberCode, phone: members.phone })
      .from(members)
      .where(and(eq(members.gymId, gymId), or(ilike(members.name, term), ilike(members.memberCode, term), ilike(members.phone, term))))
      .limit(6),
    db
      .select({ id: trainers.id, name: trainers.name, code: trainers.trainerCode, specialization: trainers.specialization })
      .from(trainers)
      .where(and(eq(trainers.gymId, gymId), or(ilike(trainers.name, term), ilike(trainers.specialization, term))))
      .limit(4),
    db
      .select({ id: membershipPlans.id, name: membershipPlans.name, price: membershipPlans.price })
      .from(membershipPlans)
      .where(and(eq(membershipPlans.gymId, gymId), ilike(membershipPlans.name, term)))
      .limit(4),
  ]);
  return { members: memberHits, trainers: trainerHits, plans: planHits };
}

export async function listPendingVerification(gymId: number) {
  return db
    .select({ id: invoices.id, number: invoices.invoiceNumber, due: invoices.dueAmount, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.gymId, gymId), sql`${invoices.dueAmount} > 0`))
    .limit(5);
}

export async function listUnassignedMembers(gymId: number, limit = 8) {
  return db
    .select({ id: members.id, name: members.name, code: members.memberCode })
    .from(members)
    .where(and(eq(members.gymId, gymId), isNull(sql`(select tm.id from trainer_members tm where tm.member_id = ${members.id} and tm.status = 'ACTIVE' limit 1)`)))
    .limit(limit);
}

async function _membersForPicker(gymId: number) {
  return db
    .select({ id: members.id, name: members.name, code: members.memberCode })
    .from(members)
    .where(eq(members.gymId, gymId))
    .orderBy(members.name)
    .limit(300);
}

async function _plansForPicker(gymId: number) {
  return db
    .select({ id: membershipPlans.id, name: membershipPlans.name, price: membershipPlans.price, durationDays: membershipPlans.durationDays })
    .from(membershipPlans)
    .where(and(eq(membershipPlans.gymId, gymId), eq(membershipPlans.status, "ACTIVE")))
    .orderBy(membershipPlans.price);
}

async function _trainersForPicker(gymId: number) {
  return db
    .select({ id: trainers.id, name: trainers.name, specialization: trainers.specialization })
    .from(trainers)
    .where(eq(trainers.gymId, gymId))
    .orderBy(trainers.name);
}

async function _subscriptionsForMember(gymId: number, memberId: number) {
  return db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.gymId, gymId), eq(subscriptions.memberId, memberId)))
    .orderBy(desc(subscriptions.endDate));
}

export async function membersByIds(gymId: number, ids: number[]) {
  if (!ids.length) return [];
  return db
    .select({ id: members.id, name: members.name, code: members.memberCode, userId: members.userId })
    .from(members)
    .where(and(eq(members.gymId, gymId), inArray(members.id, ids)));
}

/* ------------------------------------------------------------------ */
/* Public, request-memoised loaders (layout + page share one query)      */
/* ------------------------------------------------------------------ */

export const getMemberProfile = cache(_getMemberProfile);
export const listMembers = cache(_listMembers);
export const listTrainers = cache(_listTrainers);
export const getTrainerProfile = cache(_getTrainerProfile);
export const getMembershipOverview = cache(_getMembershipOverview);
export const getPaymentsOverview = cache(_getPaymentsOverview);
export const getReceipt = cache(_getReceipt);
export const getPaymentTimeline = cache(_getPaymentTimeline);
export const getAttendanceOverview = cache(_getAttendanceOverview);
export const listNotifications = cache(_listNotifications);
export const listHolidays = cache(_listHolidays);
export const listEvents = cache(_listEvents);
export const listExpenses = cache(_listExpenses);
export const listAuditLogs = cache(_listAuditLogs);
export const getAnalytics = cache(_getAnalytics);
export const getMemberDashboard = cache(_getMemberDashboard);
export const getMemberNotifications = cache(_getMemberNotifications);
export const getTrainerDashboard = cache(_getTrainerDashboard);
export const membersForPicker = cache(_membersForPicker);
export const plansForPicker = cache(_plansForPicker);
export const trainersForPicker = cache(_trainersForPicker);
export const subscriptionsForMember = cache(_subscriptionsForMember);
