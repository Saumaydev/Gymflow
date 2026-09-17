import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { attendance, members } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { addDays, formatDate, toISODate, today } from "@/lib/format";
import {
  getAttendanceOverview,
  getMembershipOverview,
  getPaymentsOverview,
  listMembers,
  listTrainers,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "members";
  let csv = "";
  let filename = `gymflow-${type}.csv`;

  if (type === "members") {
    const { items } = await listMembers(user.gymId, { pageSize: 200 });
    csv = toCsv(
      ["Member code", "Name", "Phone", "Email", "Plan", "Status", "Expires", "Due (INR)", "Visits"],
      items.map((m) => [m.memberCode, m.name, m.phone, m.email, m.plan, m.status, m.endDate, m.amountDue, m.visits]),
    );
  } else if (type === "payments" || type === "revenue") {
    const { transactions } = await getPaymentsOverview(user.gymId);
    csv = toCsv(
      ["Receipt", "Member", "Member code", "Plan", "Amount (INR)", "Method", "Date", "Notes"],
      transactions.map((t) => [
        t.receipt_number,
        t.member_name,
        t.member_code,
        t.plan_name,
        t.amount,
        t.method,
        formatDate(t.paymentDate),
        t.notes,
      ]),
    );
    filename = `gymflow-${type}-export.csv`;
  } else if (type === "attendance") {
    const overview = await getAttendanceOverview(user.gymId);
    csv = toCsv(
      ["Date", "Visits"],
      overview.calendar.map((c) => [c.date, c.visits]),
    );
  } else if (type === "trainers") {
    const trainers = await listTrainers(user.gymId);
    csv = toCsv(
      ["Code", "Name", "Specialisation", "Experience", "Assigned members", "Attendance %"],
      trainers.map((t) => [t.trainer_code, t.name, t.specialization, t.experience_years, t.assigned, t.attendance_rate]),
    );
  } else if (type === "memberships") {
    const { subscriptions } = await getMembershipOverview(user.gymId);
    csv = toCsv(
      ["Member", "Code", "Plan", "Start", "End", "Total (INR)", "Paid (INR)", "Due (INR)", "Status"],
      subscriptions.map((s) => [
        s.member_name,
        s.member_code,
        s.plan_name,
        s.start_date,
        s.end_date,
        s.price - s.discount,
        s.amount_paid,
        s.amount_due,
        s.status,
      ]),
    );
  } else if (type === "inactive") {
    const { items } = await listMembers(user.gymId, { filter: "inactive", pageSize: 200 });
    csv = toCsv(
      ["Member code", "Name", "Phone", "Last plan", "Joined"],
      items.map((m) => [m.memberCode, m.name, m.phone, m.plan, m.joined]),
    );
  } else {
    const since = toISODate(addDays(today(), -30));
    const rows = await db
      .select({
        date: attendance.date,
        name: members.name,
        code: members.memberCode,
        status: attendance.status,
        method: attendance.method,
      })
      .from(attendance)
      .innerJoin(members, eq(members.id, attendance.memberId))
      .where(and(eq(attendance.gymId, user.gymId), gte(attendance.date, since)))
      .limit(2000);
    csv = toCsv(["Date", "Member", "Code", "Status", "Method"], rows.map((r) => [r.date, r.name, r.code, r.status, r.method]));
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
