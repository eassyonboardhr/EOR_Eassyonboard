import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import { monthRange } from "@/lib/portal/leave-utils";
import { getApprovedLeaveCalendarPolicy } from "@/lib/portal/leave-calendar-policy";
import type { PortalSession } from "@/lib/portal/types";
import type { Database } from "@/lib/supabase/database.types";

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type LeaveBalanceRow = Database["public"]["Tables"]["leave_balances"]["Row"];
type LeaveRequestRow = Database["public"]["Tables"]["leave_requests"]["Row"];
type LeaveRequestStatus = Database["public"]["Enums"]["leave_request_status"];

export type LeaveRequestWithPeople = LeaveRequestRow & {
  employees?: EmployeeRow & {
    employers?: { id: string; name: string } | null;
  };
  teams?: { id: string; name: string } | null;
};

export type LeaveSummary = {
  totalAllowance: number;
  taken: number;
  pending: number;
  approved: number;
  rejected: number;
  remaining: number;
  lop: number;
};

export type LeaveLifecycleMarkers = {
  noticePeriodStart: string | null;
  noticePeriodEnd: string | null;
  lastWorkingDay: string | null;
};

export function buildLeaveSummary(
  balance: LeaveBalanceRow | null,
  requests: LeaveRequestRow[],
) {
  const remaining =
    Number(balance?.casual_available ?? 0) +
    Number(balance?.sick_available ?? 0) +
    Number(balance?.earned_available ?? 0) +
    Number(balance?.comp_off_available ?? 0);
  const approved = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + Number(request.total_leave_days ?? request.days), 0);
  const pending = requests
    .filter((request) => request.status === "pending")
    .reduce((sum, request) => sum + Number(request.total_leave_days ?? request.days), 0);
  const rejected = requests
    .filter((request) => request.status === "rejected")
    .reduce((sum, request) => sum + Number(request.total_leave_days ?? request.days), 0);
  const lop =
    Number(balance?.lop_days ?? 0) +
    requests.reduce((sum, request) => sum + Number(request.lop_days ?? 0), 0);

  return {
    totalAllowance: remaining + approved,
    taken: approved,
    pending,
    approved,
    rejected,
    remaining,
    lop,
  } satisfies LeaveSummary;
}

function isLeaveRequestStatus(value: string | undefined): value is LeaveRequestStatus {
  return value === "pending" || value === "approved" || value === "rejected" || value === "cancelled";
}

async function balanceFor(employeeId: string, year: number) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("year", year)
    .maybeSingle();
  return data;
}

function buildLifecycleMarkers(
  resignations: Array<{
    acknowledged_at: string | null;
    calculated_last_working_day: string | null;
    status: string | null;
  }>,
): LeaveLifecycleMarkers {
  const acceptedResignation = resignations.find(
    (resignation) =>
      resignation.calculated_last_working_day &&
      ["employer_acknowledged", "offboarding_requested", "admin_approved", "in_progress", "completed"].includes(
        resignation.status ?? "",
      ),
  );

  return {
    noticePeriodStart: acceptedResignation?.acknowledged_at?.slice(0, 10) ?? null,
    noticePeriodEnd: acceptedResignation?.calculated_last_working_day ?? null,
    lastWorkingDay: acceptedResignation?.calculated_last_working_day ?? null,
  };
}

export async function getEmployeeLeavesPageData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const year = new Date().getFullYear();
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();

  if (!employee) return null;

  const [balance, requests, days, calendarPolicy, absences, resignations] = await Promise.all([
    balanceFor(employee.id, year),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("leave_request_days")
      .select("*, leave_requests(*)")
      .eq("employee_id", employee.id)
      .order("date", { ascending: true }),
    getApprovedLeaveCalendarPolicy(employee.employer_id),
    supabase
      .from("employee_absences")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("resignations")
      .select("acknowledged_at, calculated_last_working_day, status")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false }),
  ]);

  const leaveRequests = requests.data ?? [];

  return {
    employee,
    balance,
    leaveRequests,
    leaveDays: days.data ?? [],
    holidays: calendarPolicy.holidays,
    calendarPolicy,
    absences: absences.data ?? [],
    lifecycleMarkers: buildLifecycleMarkers(resignations.data ?? []),
    summary: buildLeaveSummary(balance, leaveRequests),
  };
}

export async function getLeaveRequestsForApproval(
  session: PortalSession,
  filters: Record<string, string | string[] | undefined> = {},
) {
  const supabase = getSupabaseAdmin();
  const status = Array.isArray(filters.status) ? filters.status[0] : filters.status;
  const employerId = Array.isArray(filters.employer) ? filters.employer[0] : filters.employer;
  const employeeId = Array.isArray(filters.employee) ? filters.employee[0] : filters.employee;
  const teamId = Array.isArray(filters.team) ? filters.team[0] : filters.team;
  const startDate = Array.isArray(filters.start) ? filters.start[0] : filters.start;
  const endDate = Array.isArray(filters.end) ? filters.end[0] : filters.end;

  let query = supabase
    .from("leave_requests")
    .select("*, employees(*, employers(id, name)), teams(id, name)")
    .order("created_at", { ascending: false });

  if (session.user.role === "employer_admin") {
    query = query.eq("employer_id", session.user.employer_id ?? "");
  } else if (employerId && employerId !== "all") {
    query = query.eq("employer_id", employerId);
  }

  if (isLeaveRequestStatus(status)) query = query.eq("status", status);
  if (employeeId && employeeId !== "all") query = query.eq("employee_id", employeeId);
  if (teamId && teamId !== "all") query = query.eq("team_id", teamId);
  if (startDate) query = query.gte("start_date", startDate);
  if (endDate) query = query.lte("end_date", endDate);

  const [requests, employees, employers, teams] = await Promise.all([
    query,
    session.user.role === "employer_admin"
      ? supabase
          .from("employees")
          .select("*")
          .eq("employer_id", session.user.employer_id ?? "")
          .order("full_name", { ascending: true })
      : supabase.from("employees").select("*").order("full_name", { ascending: true }),
    isPlatformAdmin(session.user.role)
      ? supabase.from("employers").select("*").order("name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    session.user.role === "employer_admin"
      ? supabase
          .from("teams")
          .select("*")
          .eq("employer_id", session.user.employer_id ?? "")
          .order("name", { ascending: true })
      : supabase.from("teams").select("*").order("name", { ascending: true }),
  ]);

  const list = (requests.data ?? []) as unknown as LeaveRequestWithPeople[];
  const counts = {
    pending: list.filter((request) => request.status === "pending").length,
    approved: list.filter((request) => request.status === "approved").length,
    rejected: list.filter((request) => request.status === "rejected").length,
    all: list.length,
  };

  return {
    requests: list,
    employees: employees.data ?? [],
    employers: employers.data ?? [],
    teams: teams.data ?? [],
    counts,
    filters: { status: status ?? "pending", employerId, employeeId, teamId, startDate, endDate },
  };
}

export async function getLeaveHistoryPageData(
  session: PortalSession,
  employeeId: string,
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  const supabase = getSupabaseAdmin();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("*, employers(id, name)")
    .eq("id", employeeId)
    .single();

  if (error || !employee) throw new Error(error?.message ?? "Employee not found.");

  if (
    session.user.role === "employee" &&
    employee.portal_user_id !== session.user.id
  ) {
    throw new Error("You cannot view this employee's leave history.");
  }

  if (
    session.user.role === "employer_admin" &&
    employee.employer_id !== session.user.employer_id
  ) {
    throw new Error("You cannot view this employee's leave history.");
  }

  const now = new Date();
  const year = Number(Array.isArray(searchParams.year) ? searchParams.year[0] : searchParams.year) || now.getFullYear();
  const month = Number(Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month) || now.getMonth() + 1;
  const range = monthRange(year, month);

  const [balance, requests, days, calendarPolicy, absences, resignations] = await Promise.all([
    balanceFor(employeeId, year),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("leave_request_days")
      .select("*, leave_requests(*)")
      .eq("employee_id", employeeId)
      .gte("date", range.startDate)
      .lte("date", range.endDate)
      .order("date", { ascending: true }),
    getApprovedLeaveCalendarPolicy(employee.employer_id, range.startDate, range.endDate),
    supabase
      .from("employee_absences")
      .select("*")
      .eq("employee_id", employeeId)
      .lte("start_date", range.endDate)
      .gte("end_date", range.startDate)
      .order("created_at", { ascending: false }),
    supabase
      .from("resignations")
      .select("acknowledged_at, calculated_last_working_day, status")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);

  const leaveRequests = requests.data ?? [];

  return {
    employee,
    year,
    month,
    balance,
    leaveRequests,
    leaveDays: days.data ?? [],
    holidays: calendarPolicy.holidays,
    calendarPolicy,
    absences: absences.data ?? [],
    lifecycleMarkers: buildLifecycleMarkers(resignations.data ?? []),
    summary: buildLeaveSummary(balance, leaveRequests),
  };
}
