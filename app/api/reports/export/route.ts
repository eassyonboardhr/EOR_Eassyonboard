/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getPortalSession();
  if (session.user.status !== "active" || session.user.role === "employee") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "leave";
  if (!["leave", "attendance", "lifecycle"].includes(type)) {
    return new NextResponse("Unsupported report type", { status: 400 });
  }

  const rows = await getReportRows(type, session);
  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eor-${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

async function getReportRows(type: string, session: Awaited<ReturnType<typeof getPortalSession>>) {
  const supabase = getSupabaseAdmin();
  const employerId = session.user.role === "employer_admin" ? session.user.employer_id : null;

  if (type === "leave") {
    let query = supabase
      .from("leave_requests")
      .select("id, status, start_date, end_date, total_leave_days, paid_leave_days, lop_days, reason, created_at, employees(full_name, email, employers(name))")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (employerId) query = query.eq("employer_id", employerId);
    const { data } = await query;
    return (data ?? []).map((row: any) => ({
      employee: row.employees?.full_name,
      email: row.employees?.email,
      employer: row.employees?.employers?.name,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      leave_days: row.total_leave_days,
      paid_days: row.paid_leave_days,
      lop_days: row.lop_days,
      reason: row.reason,
      submitted_at: row.created_at,
    }));
  }

  if (type === "attendance") {
    let query = supabase
      .from("employee_absences")
      .select("id, status, start_date, end_date, total_absent_days, excluded_holiday_days, is_lop, reason, created_at, employees(full_name, email, employers(name))")
      .order("start_date", { ascending: false })
      .limit(1000);
    if (employerId) query = query.eq("employer_id", employerId);
    const { data } = await query;
    return (data ?? []).map((row: any) => ({
      employee: row.employees?.full_name,
      email: row.employees?.email,
      employer: row.employees?.employers?.name,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      absent_days: row.total_absent_days,
      excluded_holidays: row.excluded_holiday_days,
      lop: row.is_lop ? "yes" : "no",
      reason: row.reason,
      recorded_at: row.created_at,
    }));
  }

  const [{ data: resignations }, { data: offboarding }] = await Promise.all([
    scopedResignationQuery(supabase, employerId),
    scopedOffboardingQuery(supabase, employerId),
  ]);
  return [
    ...(resignations ?? []).map((row: any) => ({
      type: "resignation",
      employee: row.employees?.full_name,
      email: row.employees?.email,
      employer: row.employees?.employers?.name,
      status: row.status,
      last_working_day: row.calculated_last_working_day,
      submitted_at: row.created_at,
    })),
    ...(offboarding ?? []).map((row: any) => ({
      type: "offboarding",
      employee: row.employees?.full_name,
      email: row.employees?.email,
      employer: row.employees?.employers?.name,
      status: row.status,
      last_working_day: row.target_last_working_day,
      submitted_at: row.created_at,
    })),
  ];
}

function scopedResignationQuery(supabase: ReturnType<typeof getSupabaseAdmin>, employerId: string | null) {
  let query = supabase
    .from("resignations")
    .select("id, status, calculated_last_working_day, created_at, employees(full_name, email, employers(name))")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (employerId) query = query.eq("employer_id", employerId);
  return query;
}

function scopedOffboardingQuery(supabase: ReturnType<typeof getSupabaseAdmin>, employerId: string | null) {
  let query = supabase
    .from("offboarding_cases")
    .select("id, status, target_last_working_day, created_at, employees(full_name, email, employers(name))")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (employerId) query = query.eq("employer_id", employerId);
  return query;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "No records\n";
  const headers = Array.from(rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key));
    return keys;
  }, new Set<string>()));
  const body = rows.map((row) => headers.map((header) => quote(row[header])).join(","));
  return [headers.join(","), ...body].join("\n");
}

function quote(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
