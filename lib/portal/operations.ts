import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalSession } from "@/lib/portal/types";
import { getPortalCounts } from "@/lib/portal/data";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export async function getAttendanceData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  let leaveQuery = supabase.from("leave_requests").select("*, employees(full_name, email, employers(name))").order("start_date", { ascending: false }).limit(75);
  let absenceQuery = supabase.from("employee_absences").select("*, employees(full_name, email, employers(name))").order("start_date", { ascending: false }).limit(75);
  if (session.user.role === "employee") {
    const { data: employee } = await supabase.from("employees").select("id").eq("portal_user_id", session.user.id).maybeSingle();
    leaveQuery = leaveQuery.eq("employee_id", employee?.id ?? "");
    absenceQuery = absenceQuery.eq("employee_id", employee?.id ?? "");
  } else if (session.user.role === "employer_admin") {
    leaveQuery = leaveQuery.eq("employer_id", session.user.employer_id ?? "");
    absenceQuery = absenceQuery.eq("employer_id", session.user.employer_id ?? "");
  }
  const [{ data: leaves }, { data: absences }] = await Promise.all([leaveQuery, absenceQuery]);
  const leaveRows = leaves ?? [];
  const absenceRows = absences ?? [];
  const summary = {
    approvedLeaveDays: sum(leaveRows.filter((row: any) => row.status === "approved"), "total_leave_days"),
    pendingLeaveDays: sum(leaveRows.filter((row: any) => row.status === "pending"), "total_leave_days"),
    rejectedLeaveDays: sum(leaveRows.filter((row: any) => row.status === "rejected"), "total_leave_days"),
    absenceDays: sum(absenceRows, "total_absent_days"),
    lopDays: sum(absenceRows.filter((row: any) => row.is_lop), "total_absent_days") + sum(leaveRows, "lop_days"),
    openItems: leaveRows.filter((row: any) => row.status === "pending").length,
  };
  return { leaves: leaveRows, absences: absenceRows, summary };
}

export async function getReportsData(session: PortalSession) {
  const counts = await getPortalCounts(session.user.role === "employer_admin" ? session.user.employer_id : null);
  const supabase = getSupabaseAdmin();
  const employerId = session.user.role === "employer_admin" ? session.user.employer_id : null;
  let agreementsQuery = from(supabase, "service_agreements").select("id", { count: "exact", head: true });
  let pendingDocumentsQuery = from(supabase, "employee_documents").select("id, employees!inner(employer_id)", { count: "exact", head: true }).eq("verification_status", "Pending");
  let pendingCalendarQuery = from(supabase, "holiday_calendar_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
  let absencesQuery = from(supabase, "employee_absences").select("id", { count: "exact", head: true });
  let financeNeedsMappingQuery = from(supabase, "finance_sync_runs").select("id", { count: "exact", head: true }).eq("status", "needs_mapping");
  const messagesQuery = from(supabase, "message_participants").select("id", { count: "exact", head: true }).eq("portal_user_id", session.user.id);
  if (employerId) {
    agreementsQuery = agreementsQuery.eq("employer_id", employerId);
    pendingDocumentsQuery = pendingDocumentsQuery.eq("employees.employer_id", employerId);
    pendingCalendarQuery = pendingCalendarQuery.eq("employer_id", employerId);
    absencesQuery = absencesQuery.eq("employer_id", employerId);
    financeNeedsMappingQuery = Promise.resolve({ count: 0 }) as any;
  }
  const [
    { count: agreements },
    { count: messages },
    { count: pendingDocuments },
    { count: pendingCalendarRequests },
    { count: absences },
    { count: financeNeedsMapping },
  ] = await Promise.all([agreementsQuery, messagesQuery, pendingDocumentsQuery, pendingCalendarQuery, absencesQuery, financeNeedsMappingQuery]);
  return {
    counts,
    agreements: agreements ?? 0,
    messages: messages ?? 0,
    pendingDocuments: pendingDocuments ?? 0,
    pendingCalendarRequests: pendingCalendarRequests ?? 0,
    absences: absences ?? 0,
    financeNeedsMapping: financeNeedsMapping ?? 0,
  };
}

function sum(rows: any[], key: string) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}
