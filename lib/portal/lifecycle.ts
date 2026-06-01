import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

function countsByStatus<T extends { status: string }>(items: T[]) {
  return {
    pending: items.filter((item) => item.status === "pending" || item.status === "submitted_to_admin" || item.status === "requested_by_employer").length,
    approved: items.filter((item) => item.status === "approved" || item.status === "employer_acknowledged" || item.status === "admin_approved").length,
    rejected: items.filter((item) => item.status === "rejected" || item.status === "cancelled" || item.status === "admin_rejected").length,
    total: items.length,
  };
}

export async function getOnboardingLifecycleData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("employee_requests")
    .select("*, employers(id, name)")
    .order("created_at", { ascending: false });

  if (session.user.role === "employer_admin") {
    query = query.eq("employer_id", session.user.employer_id ?? "");
  } else if (!isPlatformAdmin(session.user.role)) {
    return {
      mode: "limited" as const,
      requests: [],
      counts: { pending: 0, approved: 0, rejected: 0, total: 0 },
    };
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const requests = data ?? [];

  return {
    mode: session.user.role === "employer_admin" ? ("employer" as const) : ("admin" as const),
    requests,
    counts: countsByStatus(requests),
  };
}

export async function getResignationLifecycleData(session: PortalSession) {
  const supabase = getSupabaseAdmin();

  if (session.user.role === "employee") {
    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .eq("portal_user_id", session.user.id)
      .maybeSingle();

    if (!employee) return { mode: "employee" as const, employee: null, resignations: [] };

    const { data, error } = await supabase
      .from("resignations")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { mode: "employee" as const, employee, resignations: data ?? [] };
  }

  let query = supabase
    .from("resignations")
    .select("*, employees(id, full_name, email, job_title, department)")
    .order("created_at", { ascending: false });

  if (session.user.role === "employer_admin") {
    query = query.eq("employer_id", session.user.employer_id ?? "");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return {
    mode: session.user.role === "employer_admin" ? ("employer" as const) : ("admin" as const),
    resignations: data ?? [],
    counts: countsByStatus(data ?? []),
  };
}

export async function getOffboardingLifecycleData(session: PortalSession) {
  const supabase = getSupabaseAdmin();

  if (session.user.role === "employee") {
    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .eq("portal_user_id", session.user.id)
      .maybeSingle();

    if (!employee) return { mode: "employee" as const, employee: null, cases: [] };

    const { data, error } = await supabase
      .from("offboarding_cases")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { mode: "employee" as const, employee, cases: data ?? [] };
  }

  let casesQuery = supabase
    .from("offboarding_cases")
    .select("*, employees(id, full_name, email, job_title, department), resignations(id, calculated_last_working_day)")
    .order("created_at", { ascending: false });
  let employeesQuery = supabase.from("employees").select("*").order("full_name", { ascending: true });

  if (session.user.role === "employer_admin") {
    casesQuery = casesQuery.eq("employer_id", session.user.employer_id ?? "");
    employeesQuery = employeesQuery.eq("employer_id", session.user.employer_id ?? "");
  }

  const [cases, employees] = await Promise.all([casesQuery, employeesQuery]);
  if (cases.error) throw new Error(cases.error.message);
  if (employees.error) throw new Error(employees.error.message);

  return {
    mode: session.user.role === "employer_admin" ? ("employer" as const) : ("admin" as const),
    cases: cases.data ?? [],
    employees: employees.data ?? [],
    counts: countsByStatus(cases.data ?? []),
  };
}
