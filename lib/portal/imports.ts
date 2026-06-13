import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ImportQueueRow = {
  sourceKey: string;
  externalCompanyId: string;
  companyName: string;
  employerId: string | null;
  importStatus: "not_imported" | "partially_imported" | "imported";
  employeeCount: number;
  importedEmployeeCount: number;
  invoiceCount: number;
  lastSyncedAt: string | null;
  suggestedEmployerId: string | null;
  suggestedEmployerName: string | null;
};

export type ImportReview = {
  company: ImportQueueRow;
  employers: Array<{ id: string; name: string; contact_email: string | null }>;
  employees: Array<{
    mappingId: string;
    sourceKey: string;
    externalEmployeeId: string;
    externalCompanyId: string;
    name: string;
    email: string | null;
    employerId: string | null;
    employeeId: string | null;
    suggestedEmployeeId: string | null;
    suggestedEmployeeName: string | null;
    needsEmail: boolean;
  }>;
  financeSummary: {
    invoiceCount: number;
    salaryPaymentCount: number;
    statementRowCount: number;
    latestMonth: string | null;
  };
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function countBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string") {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

export async function getInvoiceGeneratorImportQueue(): Promise<ImportQueueRow[]> {
  const supabase = getSupabaseAdmin() as any;
  const [{ data: companies }, { data: employeeMappings }, { data: invoices }, { data: employers }] = await Promise.all([
    supabase.from("finance_company_mappings").select("*").order("updated_at", { ascending: false }),
    supabase.from("finance_employee_mappings").select("*").order("updated_at", { ascending: false }),
    supabase.from("finance_invoices").select("id, external_company_id, employer_id, synced_at, updated_at").order("synced_at", { ascending: false }),
    supabase.from("employers").select("id, name, contact_email").order("name", { ascending: true }),
  ]);

  const employeesByCompany = countBy(employeeMappings ?? [], "external_company_id");
  const invoicesByCompany = countBy(invoices ?? [], "external_company_id");

  return (companies ?? []).map((company: any) => {
    const companyEmployees = (employeeMappings ?? []).filter((row: any) => row.external_company_id === company.external_company_id);
    const importedEmployeeCount = companyEmployees.filter((row: any) => row.employee_id).length;
    const employeeCount = employeesByCompany.get(company.external_company_id) ?? 0;
    const suggestedEmployer = (employers ?? []).find((employer: any) => normalize(employer.name) === normalize(company.external_company_name));
    const lastInvoice = (invoices ?? []).find((invoice: any) => invoice.external_company_id === company.external_company_id);
    const importStatus = company.employer_id && employeeCount > 0 && importedEmployeeCount === employeeCount
      ? "imported"
      : company.employer_id || importedEmployeeCount > 0
        ? "partially_imported"
        : "not_imported";

    return {
      sourceKey: company.source_key ?? "invoice_generator",
      externalCompanyId: company.external_company_id,
      companyName: company.external_company_name,
      employerId: company.employer_id,
      importStatus,
      employeeCount,
      importedEmployeeCount,
      invoiceCount: invoicesByCompany.get(company.external_company_id) ?? 0,
      lastSyncedAt: lastInvoice?.synced_at ?? company.updated_at ?? null,
      suggestedEmployerId: suggestedEmployer?.id ?? null,
      suggestedEmployerName: suggestedEmployer?.name ?? null,
    };
  });
}

export async function getInvoiceGeneratorImportReview(externalCompanyId: string): Promise<ImportReview> {
  const supabase = getSupabaseAdmin() as any;
  const queue = await getInvoiceGeneratorImportQueue();
  const company = queue.find((row) => row.externalCompanyId === externalCompanyId);
  if (!company) {
    throw new Error("Imported company was not found.");
  }

  const { data: employeeMappings } = await supabase
    .from("finance_employee_mappings")
    .select("*")
    .eq("external_company_id", externalCompanyId)
    .order("external_employee_name", { ascending: true });
  const externalEmployeeIds = (employeeMappings ?? []).map((row: any) => row.external_employee_id).filter(Boolean);

  const [{ data: invoices }, { data: salaries }, { data: statements }, { data: employers }, { data: portalEmployees }] = await Promise.all([
    supabase.from("finance_invoices").select("id, month_key, grand_total_usd_cents").eq("external_company_id", externalCompanyId).order("month_key", { ascending: false }),
    supabase.from("finance_employee_salary_payments").select("id, external_employee_id, month_key").eq("external_company_id", externalCompanyId).order("month_key", { ascending: false }),
    externalEmployeeIds.length
      ? supabase.from("finance_employee_statement_rows").select("id, external_employee_id, month_key").in("external_employee_id", externalEmployeeIds)
      : Promise.resolve({ data: [] }),
    supabase.from("employers").select("id, name, contact_email").order("name", { ascending: true }),
    supabase.from("employees").select("id, full_name, email, employer_id").order("full_name", { ascending: true }),
  ]);

  const employees = (employeeMappings ?? []).map((mapping: any) => {
    const suggestion = (portalEmployees ?? []).find((employee: any) => {
      const emailMatch = mapping.external_employee_email && normalize(employee.email) === normalize(mapping.external_employee_email);
      const nameMatch = normalize(employee.full_name) === normalize(mapping.external_employee_name);
      return emailMatch || nameMatch;
    });
    return {
      mappingId: mapping.id,
      sourceKey: mapping.source_key ?? "invoice_generator",
      externalEmployeeId: mapping.external_employee_id,
      externalCompanyId: mapping.external_company_id,
      name: mapping.external_employee_name,
      email: mapping.external_employee_email ?? null,
      employerId: mapping.employer_id ?? null,
      employeeId: mapping.employee_id ?? null,
      suggestedEmployeeId: suggestion?.id ?? null,
      suggestedEmployeeName: suggestion?.full_name ?? null,
      needsEmail: !mapping.external_employee_email,
    };
  });

  const months = [...(invoices ?? []), ...(salaries ?? []), ...(statements ?? [])]
    .map((row: any) => row.month_key)
    .filter(Boolean)
    .sort()
    .reverse();

  return {
    company,
    employers: employers ?? [],
    employees,
    financeSummary: {
      invoiceCount: (invoices ?? []).length,
      salaryPaymentCount: (salaries ?? []).length,
      statementRowCount: (statements ?? []).length,
      latestMonth: months[0] ?? null,
    },
  };
}
