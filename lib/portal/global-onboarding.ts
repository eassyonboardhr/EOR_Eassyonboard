import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

export async function getGlobalOnboardingData(session: PortalSession) {
  const supabase = getSupabaseAdmin();

  if (isPlatformAdmin(session.user.role)) {
    const [companies, employeeStatuses, templates, fields] = await Promise.all([
      supabase.from("client_companies").select("*, employers(id, name)").order("created_at", { ascending: false }),
      supabase
        .from("employee_onboarding_status")
        .select("*, employees(id, full_name, email, employer_id, employers(id, name))")
        .order("updated_at", { ascending: false }),
      supabase.from("contract_templates").select("*, client_companies(id, company_name)").order("created_at", { ascending: false }),
      supabase.from("custom_fields").select("*").order("created_at", { ascending: false }),
    ]);

    return {
      mode: "admin" as const,
      companies: companies.data ?? [],
      employeeStatuses: employeeStatuses.data ?? [],
      templates: templates.data ?? [],
      customFields: fields.data ?? [],
    };
  }

  if (session.user.role === "employer_admin") {
    const [companies, requests, templates, fields, employees, teams, leavePolicies] = await Promise.all([
      supabase
        .from("client_companies")
        .select("*")
        .eq("employer_id", session.user.employer_id ?? "")
        .order("created_at", { ascending: false }),
      supabase
        .from("employee_requests")
        .select("*")
        .eq("employer_id", session.user.employer_id ?? "")
        .order("created_at", { ascending: false }),
      supabase
        .from("contract_templates")
        .select("*, client_companies(id, company_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("custom_fields")
        .select("*")
        .eq("target_type", "employee")
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("*, employee_onboarding_status(status)")
        .eq("employer_id", session.user.employer_id ?? "")
        .order("full_name", { ascending: true }),
      supabase
        .from("teams")
        .select("*")
        .eq("employer_id", session.user.employer_id ?? "")
        .order("name", { ascending: true }),
      supabase
        .from("leave_policies")
        .select("*")
        .eq("employer_id", session.user.employer_id ?? "")
        .order("year", { ascending: false }),
    ]);

    return {
      mode: "employer" as const,
      companies: companies.data ?? [],
      requests: requests.data ?? [],
      templates: templates.data ?? [],
      customFields: fields.data ?? [],
      employees: employees.data ?? [],
      teams: teams.data ?? [],
      leavePolicies: leavePolicies.data ?? [],
    };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("*, employers(id, name)")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();

  if (!employee) {
    return {
      mode: "employee" as const,
      employee: null,
      profile: null,
      progress: null,
      status: null,
      documents: [],
      customFields: [],
    };
  }

  const [profile, progress, status, documents, fields] = await Promise.all([
    supabase.from("employee_profiles").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_onboarding_progress").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_onboarding_status").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_documents").select("*").eq("employee_id", employee.id).order("uploaded_at", { ascending: false }),
    supabase.from("custom_fields").select("*").eq("target_type", "employee").eq("active", true).order("created_at", { ascending: true }),
  ]);

  return {
    mode: "employee" as const,
    employee,
    profile: profile.data,
    progress: progress.data,
    status: status.data,
    documents: documents.data ?? [],
    customFields: fields.data ?? [],
  };
}

export function onboardingCompletionPercentage(sections: Record<string, boolean>) {
  const values = Object.values(sections);
  if (values.length === 0) return 0;
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}
