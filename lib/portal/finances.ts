import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getFinancesData(session: PortalSession, filters: Record<string, string | string[] | undefined> = {}) {
  const supabase = getSupabaseAdmin() as any;
  const employerFilter = first(filters.employer);
  const employeeFilter = first(filters.employee);
  const currencyFilter = first(filters.currency);
  const monthFilter = first(filters.month);

  if (session.user.role === "employee") {
    const { data: employee } = await supabase.from("employees").select("*").eq("portal_user_id", session.user.id).maybeSingle();
    const { data: compensation } = employee
      ? await supabase.from("employee_compensation").select("*").eq("employee_id", employee.id).order("effective_from", { ascending: false })
      : { data: [] };
    const [{ data: salaryPayments }, { data: statementSummaries }, { data: statementRows }] = employee
      ? await Promise.all([
          supabase.from("finance_employee_salary_payments").select("*").eq("employee_id", employee.id).order("month_key", { ascending: false }),
          supabase.from("finance_employee_statement_summaries").select("*").eq("employee_id", employee.id).order("month_key", { ascending: false }),
          supabase.from("finance_employee_statement_rows").select("*, finance_invoices(invoice_number, status, pdf_path)").eq("employee_id", employee.id).order("month_key", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];
    return {
      employees: employee ? [employee] : [],
      employers: [],
      compensation: compensation ?? [],
      billing: [],
      totals: {} as Record<string, number>,
      invoices: [],
      invoiceLineItems: [],
      invoicePayments: [],
      salaryPayments: salaryPayments ?? [],
      statementSummaries: statementSummaries ?? [],
      statementRows: statementRows ?? [],
    };
  }

  let billingQuery = supabase.from("employer_billing").select("*, employees(id, full_name, email, employer_id, job_title), employers(id, name)").order("created_at", { ascending: false });
  let compensationQuery = supabase.from("employee_compensation").select("*, employees(id, full_name, email, employer_id, job_title, employers(id, name))").order("created_at", { ascending: false });
  let employeeQuery = supabase.from("employees").select("id, full_name, email, employer_id, employers(name)").order("full_name", { ascending: true });
  let invoiceQuery = supabase.from("finance_invoices").select("*").order("month_key", { ascending: false });
  let lineItemQuery = supabase.from("finance_invoice_line_items").select("*, finance_invoices(invoice_number, month_key, employer_id, status, pdf_path)").order("created_at", { ascending: false });
  let paymentQuery = supabase.from("finance_invoice_payments").select("*, finance_invoices(invoice_number, month_key)").order("payment_month", { ascending: false });
  let salaryQuery = supabase.from("finance_employee_salary_payments").select("*, employees(id, full_name, email, employers(id, name))").order("month_key", { ascending: false });
  let statementSummaryQuery = supabase.from("finance_employee_statement_summaries").select("*, employees(id, full_name, email)").order("month_key", { ascending: false });
  let statementRowsQuery = supabase.from("finance_employee_statement_rows").select("*, finance_invoices(invoice_number, status, pdf_path), employees(id, full_name, email)").order("month_key", { ascending: false });

  if (session.user.role === "employer_admin") {
    const employerId = session.user.employer_id ?? "";
    billingQuery = billingQuery.eq("employer_id", employerId);
    compensationQuery = compensationQuery.eq("employee_id", "__blocked__");
    employeeQuery = employeeQuery.eq("employer_id", employerId);
    invoiceQuery = invoiceQuery.eq("employer_id", employerId).eq("sync_status", "synced");
    lineItemQuery = lineItemQuery.eq("employer_id", employerId).not("employee_id", "is", null);
    paymentQuery = paymentQuery.eq("employer_id", employerId);
    salaryQuery = salaryQuery.eq("employee_id", "__blocked__");
    statementSummaryQuery = statementSummaryQuery.eq("employee_id", "__blocked__");
    statementRowsQuery = statementRowsQuery.eq("employee_id", "__blocked__");
  } else if (employerFilter && employerFilter !== "all") {
    billingQuery = billingQuery.eq("employer_id", employerFilter);
    employeeQuery = employeeQuery.eq("employer_id", employerFilter);
    invoiceQuery = invoiceQuery.eq("employer_id", employerFilter);
    lineItemQuery = lineItemQuery.eq("employer_id", employerFilter);
    paymentQuery = paymentQuery.eq("employer_id", employerFilter);
  }
  if (employeeFilter && employeeFilter !== "all") {
    billingQuery = billingQuery.eq("employee_id", employeeFilter);
    compensationQuery = compensationQuery.eq("employee_id", employeeFilter);
    lineItemQuery = lineItemQuery.eq("employee_id", employeeFilter);
    salaryQuery = salaryQuery.eq("employee_id", employeeFilter);
    statementSummaryQuery = statementSummaryQuery.eq("employee_id", employeeFilter);
    statementRowsQuery = statementRowsQuery.eq("employee_id", employeeFilter);
  }
  if (currencyFilter && currencyFilter !== "all") {
    billingQuery = billingQuery.eq("currency", currencyFilter);
    compensationQuery = compensationQuery.eq("currency", currencyFilter);
  }
  if (monthFilter && monthFilter !== "all") {
    invoiceQuery = invoiceQuery.eq("month_key", monthFilter);
    lineItemQuery = lineItemQuery.eq("finance_invoices.month_key", monthFilter);
    paymentQuery = paymentQuery.eq("payment_month", monthFilter);
    salaryQuery = salaryQuery.eq("month_key", monthFilter);
    statementSummaryQuery = statementSummaryQuery.eq("month_key", monthFilter);
    statementRowsQuery = statementRowsQuery.eq("month_key", monthFilter);
  }

  const [
    { data: billing },
    { data: compensation },
    { data: employees },
    { data: employers },
    { data: invoices },
    { data: invoiceLineItems },
    { data: invoicePayments },
    { data: salaryPayments },
    { data: statementSummaries },
    { data: statementRows },
  ] = await Promise.all([
    billingQuery,
    isPlatformAdmin(session.user.role) ? compensationQuery : Promise.resolve({ data: [] }),
    employeeQuery,
    isPlatformAdmin(session.user.role) ? supabase.from("employers").select("id, name").order("name", { ascending: true }) : Promise.resolve({ data: [] }),
    invoiceQuery,
    lineItemQuery,
    paymentQuery,
    isPlatformAdmin(session.user.role) ? salaryQuery : Promise.resolve({ data: [] }),
    isPlatformAdmin(session.user.role) ? statementSummaryQuery : Promise.resolve({ data: [] }),
    isPlatformAdmin(session.user.role) ? statementRowsQuery : Promise.resolve({ data: [] }),
  ]);

  const totals = (billing ?? []).reduce((acc: Record<string, number>, row: any) => {
    const currency = row.currency ?? "USD";
    acc[currency] = (acc[currency] ?? 0) + Number(row.monthly_bill_amount ?? 0);
    return acc;
  }, {});
  totals.SYNCED_USD = (invoiceLineItems ?? []).reduce((sum: number, row: any) => sum + Number(row.billed_total_usd_cents ?? 0) / 100, 0);

  return {
    employees: employees ?? [],
    employers: employers ?? [],
    compensation: compensation ?? [],
    billing: billing ?? [],
    totals,
    invoices: invoices ?? [],
    invoiceLineItems: invoiceLineItems ?? [],
    invoicePayments: invoicePayments ?? [],
    salaryPayments: salaryPayments ?? [],
    statementSummaries: statementSummaries ?? [],
    statementRows: statementRows ?? [],
  };
}

export async function getFinanceMappingData() {
  const supabase = getSupabaseAdmin() as any;
  const [
    { data: companyMappings },
    { data: employeeMappings },
    { data: employers },
    { data: employees },
    { data: syncRuns },
  ] = await Promise.all([
    supabase.from("finance_company_mappings").select("*").order("updated_at", { ascending: false }),
    supabase.from("finance_employee_mappings").select("*").order("updated_at", { ascending: false }),
    supabase.from("employers").select("id, name, contact_email").order("name", { ascending: true }),
    supabase.from("employees").select("id, full_name, email, employer_id, employers(id, name)").order("full_name", { ascending: true }),
    supabase.from("finance_sync_runs").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  return {
    companyMappings: companyMappings ?? [],
    employeeMappings: employeeMappings ?? [],
    employers: employers ?? [],
    employees: employees ?? [],
    syncRuns: syncRuns ?? [],
  };
}
