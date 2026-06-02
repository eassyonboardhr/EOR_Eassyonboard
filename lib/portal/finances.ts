import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

export async function getFinancesData(session: PortalSession, filters: Record<string, string | string[] | undefined> = {}) {
  const supabase = getSupabaseAdmin();
  const employerFilter = Array.isArray(filters.employer) ? filters.employer[0] : filters.employer;
  const employeeFilter = Array.isArray(filters.employee) ? filters.employee[0] : filters.employee;
  const currencyFilter = Array.isArray(filters.currency) ? filters.currency[0] : filters.currency;

  if (session.user.role === "employee") {
    const { data: employee } = await supabase.from("employees").select("*").eq("portal_user_id", session.user.id).maybeSingle();
    const { data: compensation } = employee
      ? await supabase.from("employee_compensation").select("*").eq("employee_id", employee.id).order("effective_from", { ascending: false })
      : { data: [] };
    return { employees: employee ? [employee] : [], employers: [], compensation: compensation ?? [], billing: [], totals: {} as Record<string, number> };
  }

  let billingQuery = supabase.from("employer_billing").select("*, employees(id, full_name, email, employer_id, job_title), employers(id, name)").order("created_at", { ascending: false });
  let compensationQuery = supabase.from("employee_compensation").select("*, employees(id, full_name, email, employer_id, job_title, employers(id, name))").order("created_at", { ascending: false });
  let employeeQuery = supabase.from("employees").select("id, full_name, email, employer_id, employers(name)").order("full_name", { ascending: true });

  if (session.user.role === "employer_admin") {
    const employerId = session.user.employer_id ?? "";
    billingQuery = billingQuery.eq("employer_id", employerId);
    compensationQuery = compensationQuery.eq("employee_id", "__blocked__");
    employeeQuery = employeeQuery.eq("employer_id", employerId);
  } else if (employerFilter && employerFilter !== "all") {
    billingQuery = billingQuery.eq("employer_id", employerFilter);
    employeeQuery = employeeQuery.eq("employer_id", employerFilter);
  }
  if (employeeFilter && employeeFilter !== "all") {
    billingQuery = billingQuery.eq("employee_id", employeeFilter);
    compensationQuery = compensationQuery.eq("employee_id", employeeFilter);
  }
  if (currencyFilter && currencyFilter !== "all") {
    billingQuery = billingQuery.eq("currency", currencyFilter);
    compensationQuery = compensationQuery.eq("currency", currencyFilter);
  }

  const [{ data: billing }, { data: compensation }, { data: employees }, { data: employers }] = await Promise.all([
    billingQuery,
    isPlatformAdmin(session.user.role) ? compensationQuery : Promise.resolve({ data: [] }),
    employeeQuery,
    isPlatformAdmin(session.user.role) ? supabase.from("employers").select("id, name").order("name", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);

  const totals = (billing ?? []).reduce((acc: Record<string, number>, row: any) => {
    const currency = row.currency ?? "USD";
    acc[currency] = (acc[currency] ?? 0) + Number(row.monthly_bill_amount ?? 0);
    return acc;
  }, {});

  return { employees: employees ?? [], employers: employers ?? [], compensation: compensation ?? [], billing: billing ?? [], totals };
}
