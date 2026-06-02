import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import { withScopedCompanyDocumentUrls, withScopedEmployeeDocumentUrls, signedStorageUrl } from "@/lib/portal/document-access";
import type { PortalSession } from "@/lib/portal/types";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export async function getDocumentsData(session: PortalSession, filters: Record<string, string | string[] | undefined> = {}) {
  const supabase = getSupabaseAdmin();
  const employeeIdFilter = Array.isArray(filters.employee) ? filters.employee[0] : filters.employee;

  if (session.user.role === "employee") {
    const { data: employee } = await supabase.from("employees").select("*").eq("portal_user_id", session.user.id).maybeSingle();
    if (!employee) return { employee: null, employeeDocuments: [], companyDocuments: [], templates: [], serviceAgreements: [], employees: [], employers: [] };
    const [{ data: employeeDocuments }, { data: serviceAgreements }] = await Promise.all([
      supabase.from("employee_documents").select("*").eq("employee_id", employee.id).order("uploaded_at", { ascending: false }),
      from(supabase, "service_agreements")
        .select("*, employers(name), employees(full_name)")
        .eq("employee_id", employee.id)
        .eq("shared_with_employee", true)
        .order("created_at", { ascending: false }),
    ]);
    return {
      employee,
      employeeDocuments: await withScopedEmployeeDocumentUrls(employeeDocuments ?? [], session),
      companyDocuments: [],
      templates: [],
      serviceAgreements: await signServiceAgreements(serviceAgreements ?? [], session),
      employees: [employee],
      employers: [],
    };
  }

  let employeeQuery = supabase.from("employees").select("id, full_name, email, employer_id, employers(name)").order("full_name", { ascending: true });
  let employeeDocumentsQuery = supabase.from("employee_documents").select("*, employees!inner(id, full_name, email, employer_id, employers(name))").order("uploaded_at", { ascending: false });
  let companyDocumentsQuery = supabase.from("client_documents").select("*, client_companies!inner(id, company_name, employer_id, employers(name))").order("uploaded_at", { ascending: false });
  let templatesQuery = supabase.from("contract_templates").select("*, client_companies(id, company_name, employer_id)").order("created_at", { ascending: false });
  let agreementsQuery = from(supabase, "service_agreements").select("*, employers(id, name), employees(id, full_name, email)").order("created_at", { ascending: false });

  if (session.user.role === "employer_admin") {
    const employerId = session.user.employer_id ?? "";
    employeeQuery = employeeQuery.eq("employer_id", employerId);
    employeeDocumentsQuery = employeeDocumentsQuery.eq("employees.employer_id", employerId);
    companyDocumentsQuery = companyDocumentsQuery.eq("client_companies.employer_id", employerId);
    templatesQuery = templatesQuery.eq("client_companies.employer_id", employerId);
    agreementsQuery = agreementsQuery.eq("employer_id", employerId);
  }
  if (employeeIdFilter && employeeIdFilter !== "all") {
    employeeDocumentsQuery = employeeDocumentsQuery.eq("employee_id", employeeIdFilter);
    agreementsQuery = agreementsQuery.eq("employee_id", employeeIdFilter);
  }

  const [{ data: employees }, { data: employeeDocuments }, { data: companyDocuments }, { data: templates }, { data: agreements }, { data: employers }] = await Promise.all([
    employeeQuery,
    employeeDocumentsQuery,
    companyDocumentsQuery,
    templatesQuery,
    agreementsQuery,
    isPlatformAdmin(session.user.role) ? supabase.from("employers").select("id, name").order("name", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);

  return {
    employee: null,
    employees: employees ?? [],
    employers: employers ?? [],
    employeeDocuments: await withScopedEmployeeDocumentUrls(employeeDocuments ?? [], session),
    companyDocuments: await withScopedCompanyDocumentUrls(companyDocuments ?? [], session),
    templates: await withScopedCompanyDocumentUrls(templates ?? [], session),
    serviceAgreements: await signServiceAgreements(agreements ?? [], session),
  };
}

async function signServiceAgreements<T extends { file_path: string; employer_id: string; shared_with_employee?: boolean | null; employee_id?: string | null }>(
  rows: T[],
  session: PortalSession,
) {
  const allowed = rows.filter((row) => {
    if (isPlatformAdmin(session.user.role)) return true;
    if (session.user.role === "employer_admin") return row.employer_id === session.user.employer_id;
    return session.user.role === "employee" && row.shared_with_employee;
  });
  const allowedIds = new Set(allowed.map((row: any) => row.id));
  return Promise.all(rows.map(async (row: any) => ({
    ...row,
    signed_url: allowedIds.has(row.id) ? await signedStorageUrl("company-documents", row.file_path) : null,
  })));
}
