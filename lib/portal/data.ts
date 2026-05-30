import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalCounts, PortalSession } from "@/lib/portal/types";

async function countRows(table: string, filters: Record<string, string> = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function getPortalCounts(employerId?: string | null): Promise<PortalCounts> {
  const scoped: Record<string, string> = employerId ? { employer_id: employerId } : {};

  const [
    employerLeads,
    employers,
    employees,
    employeeRequests,
    leaveRequests,
    resignations,
    offboardingCases,
    notices,
  ] = await Promise.all([
    employerId ? Promise.resolve(0) : countRows("employer_leads", { status: "pending" }),
    employerId ? Promise.resolve(1) : countRows("employers"),
    countRows("employees", scoped),
    countRows("employee_requests", { ...scoped, status: "pending" }),
    countRows("leave_requests", { ...scoped, status: "pending" }),
    countRows("resignations", scoped),
    countRows("offboarding_cases", scoped),
    countRows("notices", employerId ? { employer_id: employerId } : {}),
  ]);

  return {
    employerLeads,
    employers,
    employees,
    employeeRequests,
    leaveRequests,
    resignations,
    offboardingCases,
    notices,
  };
}

export async function getAdminDashboardData() {
  const supabase = getSupabaseAdmin();
  const [
    counts,
    leads,
    employers,
    users,
    employeeRequests,
    employees,
    leaveRequests,
    resignations,
    offboardingCases,
    notices,
    auditEvents,
  ] = await Promise.all([
    getPortalCounts(),
    supabase.from("employer_leads").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("employers").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("portal_users").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("employee_requests").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("employees").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("leave_requests").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("resignations").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("offboarding_cases").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(12),
  ]);

  return {
    counts,
    leads: leads.data ?? [],
    employers: employers.data ?? [],
    users: users.data ?? [],
    employeeRequests: employeeRequests.data ?? [],
    employees: employees.data ?? [],
    leaveRequests: leaveRequests.data ?? [],
    resignations: resignations.data ?? [],
    offboardingCases: offboardingCases.data ?? [],
    notices: notices.data ?? [],
    auditEvents: auditEvents.data ?? [],
  };
}

export async function getEmployerDashboardData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const employerId = session.user.employer_id;

  if (!employerId) {
    return null;
  }

  const year = new Date().getFullYear();
  const [
    counts,
    employer,
    leavePolicy,
    employees,
    employeeRequests,
    leaveRequests,
    resignations,
    offboardingCases,
    notices,
  ] = await Promise.all([
    getPortalCounts(employerId),
    supabase.from("employers").select("*").eq("id", employerId).single(),
    supabase
      .from("leave_policies")
      .select("*")
      .eq("employer_id", employerId)
      .eq("year", year)
      .maybeSingle(),
    supabase.from("employees").select("*").eq("employer_id", employerId).order("created_at", { ascending: false }),
    supabase
      .from("employee_requests")
      .select("*")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("resignations")
      .select("*")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("offboarding_cases")
      .select("*")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notices")
      .select("*")
      .or(`employer_id.eq.${employerId},employer_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    counts,
    employer: employer.data,
    leavePolicy: leavePolicy.data,
    employees: employees.data ?? [],
    employeeRequests: employeeRequests.data ?? [],
    leaveRequests: leaveRequests.data ?? [],
    resignations: resignations.data ?? [],
    offboardingCases: offboardingCases.data ?? [],
    notices: notices.data ?? [],
  };
}

export async function getEmployeeDashboardData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();

  if (!employee) {
    return null;
  }

  const year = new Date().getFullYear();
  const [balance, leaveRequests, resignations, offboardingCases, noticeRecipients] =
    await Promise.all([
      supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("year", year)
        .maybeSingle(),
      supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("resignations")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("offboarding_cases")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("notice_recipients")
        .select("*, notices(*)")
        .eq("recipient_user_id", session.user.id)
        .order("created_at", { ascending: false }),
    ]);

  return {
    employee,
    balance: balance.data,
    leaveRequests: leaveRequests.data ?? [],
    resignations: resignations.data ?? [],
    offboardingCases: offboardingCases.data ?? [],
    noticeRecipients: noticeRecipients.data ?? [],
  };
}

export async function getRequestReceivedData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase
    .from("employer_leads")
    .select("*")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();

  return { lead };
}
