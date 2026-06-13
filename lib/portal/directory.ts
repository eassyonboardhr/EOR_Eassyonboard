import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getEmployeeDeactivationStatus, getEmployerDeactivationPreview, type DeactivationStatus } from "@/lib/portal/actions/deactivation";
import { getCompanyDocumentCompletionStatus, getEmployeeDocumentCompletionStatus, type DocumentCompletionStatus } from "@/lib/portal/document-status";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

type EmployerDirectoryRow = {
  id: string;
  name: string;
  legal_name: string | null;
  contact_name: string | null;
  contact_email: string;
  status: string;
  created_at: string;
  employee_count: number;
  active_employee_count: number;
  document_completion_status: DocumentCompletionStatus;
  deactivation_status: DeactivationStatus;
};

type EmployeeDirectoryRow = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  department: string | null;
  status: string;
  lifecycle_status: string;
  start_date: string | null;
  notice_period_days: number | null;
  employer_id: string;
  employers?: { id: string; name: string } | null;
  teams?: { id: string; name: string } | null;
  document_completion_status: DocumentCompletionStatus;
  deactivation_status: DeactivationStatus;
};

export async function getEmployerDirectoryData(session: PortalSession) {
  if (!isPlatformAdmin(session.user.role)) {
    return { allowed: false, employers: [] as EmployerDirectoryRow[], leads: [], adminUsers: [] };
  }

  const supabase = getSupabaseAdmin();
  const [{ data: employers, error: employerError }, { data: employees, error: employeeError }, { data: companies, error: companyError }] = await Promise.all([
    supabase
      .from("employers")
      .select("id, name, legal_name, contact_name, contact_email, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("employees")
      .select("id, employer_id, status"),
    supabase
      .from("client_companies")
      .select("id, employer_id, client_documents(*)"),
  ]);

  if (employerError) throw new Error(employerError.message);
  if (employeeError) throw new Error(employeeError.message);
  if (companyError) throw new Error(companyError.message);

  const counts = new Map<string, { total: number; active: number }>();
  for (const employee of employees ?? []) {
    const current = counts.get(employee.employer_id) ?? { total: 0, active: 0 };
    current.total += 1;
    if (employee.status === "active") current.active += 1;
    counts.set(employee.employer_id, current);
  }

  const employerRows = await Promise.all((employers ?? []).map(async (employer) => {
    const count = counts.get(employer.id) ?? { total: 0, active: 0 };
    const employerCompanies = (companies ?? []).filter((company) => company.employer_id === employer.id);
    const companyStatuses = employerCompanies.map((company) => getCompanyDocumentCompletionStatus(company.client_documents ?? []));
    const documentStatus = companyStatuses.find((status) => status.status === "docs_rejected")
      ?? companyStatuses.find((status) => status.status === "docs_missing")
      ?? companyStatuses.find((status) => status.status === "docs_pending")
      ?? companyStatuses[0]
      ?? getCompanyDocumentCompletionStatus([]);
    return {
      ...employer,
      status: employer.status,
      employee_count: count.total,
      active_employee_count: count.active,
      document_completion_status: documentStatus,
      deactivation_status: await getEmployerDeactivationPreview(employer.id),
    };
  }));

  const [{ data: leads }, { data: adminUsers }] = await Promise.all([
    supabase.from("employer_leads").select("*").order("created_at", { ascending: false }),
    supabase.from("portal_users").select("id, employer_id, email, status").eq("role", "employer_admin"),
  ]);

  return {
    allowed: true,
    employers: employerRows satisfies EmployerDirectoryRow[],
    leads: leads ?? [],
    adminUsers: adminUsers ?? [],
  };
}

export async function getEmployeeDirectoryData(session: PortalSession) {
  if (session.user.role === "employee") {
    return { allowed: false, employees: [] as EmployeeDirectoryRow[], employeeRequests: [] };
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("employees")
    .select("id, full_name, email, job_title, department, status, lifecycle_status, start_date, notice_period_days, employer_id, employers(id, name), teams!employees_team_id_fkey(id, name)")
    .order("created_at", { ascending: false });

  if (!isPlatformAdmin(session.user.role)) {
    query = query.eq("employer_id", session.user.employer_id ?? "");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const employeeIds = (data ?? []).map((employee) => employee.id);
  const [{ data: documents, error: documentError }, { data: experiences, error: experienceError }] = employeeIds.length > 0
    ? await Promise.all([
        supabase.from("employee_documents").select("id, employee_id, document_type, verification_status, uploaded_at").in("employee_id", employeeIds),
        supabase.from("employee_experience").select("employee_id, is_fresher").in("employee_id", employeeIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (documentError) throw new Error(documentError.message);
  if (experienceError) throw new Error(experienceError.message);

  const experienceByEmployee = new Map((experiences ?? []).map((experience) => [experience.employee_id, experience.is_fresher]));

  const employeeRows = await Promise.all((data ?? []).map(async (employee) => ({
    ...employee,
    employers: Array.isArray(employee.employers) ? employee.employers[0] : employee.employers,
    teams: Array.isArray(employee.teams) ? employee.teams[0] : employee.teams,
    document_completion_status: getEmployeeDocumentCompletionStatus(
      (documents ?? []).filter((document) => document.employee_id === employee.id),
      experienceByEmployee.get(employee.id) ?? true,
    ),
    deactivation_status: await getEmployeeDeactivationStatus(employee.id),
  })));

  let employeeRequestsQuery = supabase
    .from("employee_requests")
    .select("*, employers(id, name)")
    .order("created_at", { ascending: false });
  if (!isPlatformAdmin(session.user.role)) {
    employeeRequestsQuery = employeeRequestsQuery.eq("employer_id", session.user.employer_id ?? "");
  }
  const { data: employeeRequests, error: requestError } = await employeeRequestsQuery;
  if (requestError) throw new Error(requestError.message);

  return {
    allowed: true,
    employees: employeeRows as EmployeeDirectoryRow[],
    employeeRequests: employeeRequests ?? [],
  };
}
