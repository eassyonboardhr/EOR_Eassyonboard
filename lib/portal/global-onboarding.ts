import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildEmployeeDocumentChecklist,
  withScopedCompanyDocumentUrls,
  withScopedEmployeeDocumentUrls,
} from "@/lib/portal/document-access";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

export async function getGlobalOnboardingData(
  session: PortalSession,
  filters: Record<string, string | string[] | undefined> = {},
) {
  const supabase = getSupabaseAdmin();
  const employerFilter = Array.isArray(filters.employer) ? filters.employer[0] : filters.employer;
  const statusFilter = Array.isArray(filters.status) ? filters.status[0] : filters.status;
  const documentStatusFilter = Array.isArray(filters.document_status) ? filters.document_status[0] : filters.document_status;
  const companyStatusFilters = ["submitted", "approved", "needs_correction", "rejected"] as const;
  const requestStatusFilters = ["pending", "approved", "rejected", "cancelled", "completed", "invite_sent", "joined"] as const;
  const employeeOnboardingStatusFilters = ["Draft", "Submitted", "Pending Review", "Approved", "Rejected", "Needs Correction"] as const;

  if (isPlatformAdmin(session.user.role)) {
    let companiesQuery = supabase.from("client_companies").select("*, employers(id, name), client_documents(*)").order("created_at", { ascending: false });
    let employeeStatusesQuery = supabase
        .from("employee_onboarding_status")
        .select("*, employees(id, full_name, email, employer_id, employers(id, name))")
        .order("updated_at", { ascending: false });
    let employeeDocumentsQuery = supabase
      .from("employee_documents")
      .select("*, employees!inner(id, full_name, email, employer_id, employers(id, name))")
      .order("uploaded_at", { ascending: false });
    let employeeRequestsQuery = supabase
      .from("employee_requests")
      .select("*, employers(id, name)")
      .order("created_at", { ascending: false });
    let companyDocumentsQuery = supabase
      .from("client_documents")
      .select("*, client_companies!inner(id, company_name, employer_id, employers(id, name))")
      .order("uploaded_at", { ascending: false });

    if (employerFilter && employerFilter !== "all") {
      companiesQuery = companiesQuery.eq("employer_id", employerFilter);
      employeeStatusesQuery = employeeStatusesQuery.eq("employees.employer_id", employerFilter);
      employeeDocumentsQuery = employeeDocumentsQuery.eq("employees.employer_id", employerFilter);
      employeeRequestsQuery = employeeRequestsQuery.eq("employer_id", employerFilter);
      companyDocumentsQuery = companyDocumentsQuery.eq("client_companies.employer_id", employerFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      if (companyStatusFilters.includes(statusFilter as (typeof companyStatusFilters)[number])) {
        companiesQuery = companiesQuery.eq("onboarding_status", statusFilter as (typeof companyStatusFilters)[number]);
      }
      if (employeeOnboardingStatusFilters.includes(statusFilter as (typeof employeeOnboardingStatusFilters)[number])) {
        employeeStatusesQuery = employeeStatusesQuery.eq("status", statusFilter as (typeof employeeOnboardingStatusFilters)[number]);
      }
      if (requestStatusFilters.includes(statusFilter as (typeof requestStatusFilters)[number])) {
        employeeRequestsQuery = employeeRequestsQuery.eq("status", statusFilter as (typeof requestStatusFilters)[number]);
      }
    }
    if (documentStatusFilter && documentStatusFilter !== "all") {
      employeeDocumentsQuery = employeeDocumentsQuery.eq("verification_status", documentStatusFilter);
    }

    const [companies, employeeStatuses, employeeRequests, documents, employeeDocuments, templates, fields, fieldValues, employers] = await Promise.all([
      companiesQuery,
      employeeStatusesQuery,
      employeeRequestsQuery,
      companyDocumentsQuery,
      employeeDocumentsQuery,
      supabase.from("contract_templates").select("*, client_companies(id, company_name)").order("created_at", { ascending: false }),
      supabase.from("custom_fields").select("*").order("created_at", { ascending: false }),
      supabase.from("custom_field_values").select("*, custom_fields(*)").order("updated_at", { ascending: false }),
      supabase.from("employers").select("id, name").order("name", { ascending: true }),
    ]);
    const signedCompanyDocuments = await withScopedCompanyDocumentUrls(documents.data ?? [], session);
    const signedEmployeeDocuments = await withScopedEmployeeDocumentUrls(employeeDocuments.data ?? [], session);
    const signedTemplates = await withScopedCompanyDocumentUrls(templates.data ?? [], session);

    return {
      mode: "admin" as const,
      companies: companies.data ?? [],
      employeeStatuses: employeeStatuses.data ?? [],
      employeeRequests: employeeRequests.data ?? [],
      companyDocuments: signedCompanyDocuments,
      employeeDocuments: signedEmployeeDocuments,
      templates: signedTemplates,
      customFields: fields.data ?? [],
      customFieldValues: fieldValues.data ?? [],
      employers: employers.data ?? [],
      filters: { employer: employerFilter ?? "all", status: statusFilter ?? "all", documentStatus: documentStatusFilter ?? "all" },
    };
  }

  if (session.user.role === "employer_admin") {
    const [companies, requests, templates, fields, employerFields, employees, teams, leavePolicies, companyDocuments, fieldValues] = await Promise.all([
      supabase
        .from("client_companies")
        .select("*, client_documents(*)")
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
        .from("custom_fields")
        .select("*")
        .eq("target_type", "employer")
        .eq("active", true)
        .order("created_at", { ascending: true }),
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
      supabase
        .from("client_documents")
        .select("*, client_companies!inner(id, company_name, employer_id)")
        .eq("client_companies.employer_id", session.user.employer_id ?? "")
        .order("uploaded_at", { ascending: false }),
      supabase.from("custom_field_values").select("*, custom_fields(*)").order("updated_at", { ascending: false }),
    ]);

    const signedCompanyDocuments = await withScopedCompanyDocumentUrls(companyDocuments.data ?? [], session);
    const signedTemplates = await withScopedCompanyDocumentUrls(templates.data ?? [], session);

    return {
      mode: "employer" as const,
      companies: companies.data ?? [],
      requests: requests.data ?? [],
      templates: signedTemplates,
      customFields: fields.data ?? [],
      employerCustomFields: employerFields.data ?? [],
      companyDocuments: signedCompanyDocuments,
      customFieldValues: fieldValues.data ?? [],
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

  const { data: company } = await supabase
    .from("client_companies")
    .select("id")
    .eq("employer_id", employee.employer_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [profile, progress, status, documents, experience, address, emergency, identity, bank, education, fields, fieldValues] = await Promise.all([
    supabase.from("employee_profiles").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_onboarding_progress").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_onboarding_status").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_documents").select("*").eq("employee_id", employee.id).order("uploaded_at", { ascending: false }),
    supabase.from("employee_experience").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_addresses").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_emergency_contacts").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_identity_details").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_bank_details").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_education").select("*").eq("employee_id", employee.id).maybeSingle(),
    company?.id
      ? supabase
          .from("custom_fields")
          .select("*")
          .eq("target_type", "employee")
          .eq("active", true)
          .or(`company_id.is.null,company_id.eq.${company.id}`)
          .order("created_at", { ascending: true })
      : supabase.from("custom_fields").select("*").eq("target_type", "employee").eq("active", true).is("company_id", null).order("created_at", { ascending: true }),
    supabase.from("custom_field_values").select("*").eq("entity_id", employee.id),
  ]);

  const signedDocuments = await withScopedEmployeeDocumentUrls(documents.data ?? [], session);

  return {
    mode: "employee" as const,
    employee,
    profile: profile.data,
    address: address.data,
    emergency: emergency.data,
    identity: identity.data,
    bank: bank.data,
    education: education.data,
    experience: experience.data,
    progress: progress.data,
    status: status.data,
    documents: signedDocuments,
    documentChecklist: buildEmployeeDocumentChecklist(signedDocuments, experience.data?.is_fresher ?? true),
    customFields: fields.data ?? [],
    customFieldValues: fieldValues.data ?? [],
  };
}

export function onboardingCompletionPercentage(sections: Record<string, boolean>) {
  const values = Object.values(sections);
  if (values.length === 0) return 0;
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}
