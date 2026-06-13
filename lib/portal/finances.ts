import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  centsNumber,
  summarizeAdminFinance,
  toArrayFilter,
  toEmployerPaymentStatus,
  type AdminFinanceSummary,
} from "@/lib/portal/finance-allocations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

export type FinanceFilters = {
  invoiceMonths: string[];
  paidMonths: string[];
  payrollMonths: string[];
  employerIds: string[];
  employeeIds: string[];
  statuses: string[];
  allocationSources: string[];
  cashoutRateSources: string[];
};

export type EmployerReceivableRow = {
  id: string;
  employerId: string | null;
  employerName: string;
  invoiceNumber: string;
  invoiceMonth: string | null;
  paidMonth: string | null;
  status: string;
  amountUsdCents: number;
  receivedUsdCents: number;
  cashoutRate: number | null;
  employeeNames: string[];
  pdfPath: string | null;
};

export type EmployeePayableRow = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employerId: string | null;
  employerName: string;
  payrollMonth: string | null;
  grossUsdCents: number;
  grossInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  reimbursementUsdCents: number;
  reimbursementsInrCents: number;
  leaveDeductionInrCents: number;
  advanceUsdCents: number;
  advancesInrCents: number;
  offboardingDeductionUsdCents: number;
  offboardingDeductionInrCents: number;
  actualPaidInrCents: number;
  paid: boolean;
  paidDate: string | null;
  notes: string | null;
};

export type AllocationRow = {
  id: string;
  employerId: string;
  employerName: string;
  employeeId: string;
  employeeName: string;
  invoiceId: string | null;
  invoicePaymentId: string | null;
  salaryPaymentId: string | null;
  invoiceNumber: string;
  invoiceMonth: string | null;
  paidMonth: string | null;
  payrollMonth: string | null;
  allocatedUsdCents: number;
  cashoutRate: number | null;
  cashoutRateSource: string;
  allocationSource: string;
  overrideReason: string | null;
};

export type EmployerStatementRow = {
  id: string;
  invoiceNumber: string;
  invoiceMonth: string | null;
  employeeId: string | null;
  employeeName: string;
  designation: string | null;
  teamName: string | null;
  daysWorked: number | null;
  hoursPerWeek: number | null;
  amountUsdCents: number;
  paymentStatus: string;
  pdfPath: string | null;
};

export type EmployeeSalaryStatementRow = {
  id: string;
  payrollMonth: string | null;
  grossUsdCents: number;
  grossInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  allowancesInrCents: number;
  reimbursementsInrCents: number;
  leaveDeductionInrCents: number;
  advancesInrCents: number;
  offboardingDeductionInrCents: number;
  actualPaidInrCents: number;
  paid: boolean;
  paidDate: string | null;
  notes: string | null;
};

export type AdminFinanceReconciliation = {
  filters: FinanceFilters;
  employers: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; full_name: string; employer_id: string | null }>;
  summary: AdminFinanceSummary;
  employerReceivables: EmployerReceivableRow[];
  employeePayables: EmployeePayableRow[];
  allocations: AllocationRow[];
};

export type EmployerFinanceStatement = {
  filters: FinanceFilters;
  rows: EmployerStatementRow[];
  totals: { billedUsdCents: number };
};

export type EmployeeSalaryStatement = {
  rows: EmployeeSalaryStatementRow[];
  totals: {
    actualPaidInrCents: number;
    pfInrCents: number;
    tdsInrCents: number;
  };
};

function parseFinanceFilters(filters: Record<string, string | string[] | undefined> = {}): FinanceFilters {
  const monthValues = toArrayFilter(filters.month);
  return {
    invoiceMonths: [...new Set([...monthValues, ...toArrayFilter(filters.invoiceMonth)])],
    paidMonths: [...new Set([...monthValues, ...toArrayFilter(filters.paidMonth)])],
    payrollMonths: [...new Set([...monthValues, ...toArrayFilter(filters.payrollMonth)])],
    employerIds: toArrayFilter(filters.employer),
    employeeIds: toArrayFilter(filters.employee),
    statuses: toArrayFilter(filters.status),
    allocationSources: toArrayFilter(filters.allocationSource),
    cashoutRateSources: toArrayFilter(filters.cashoutRateSource),
  };
}

function applyIn(query: any, column: string, values: string[]) {
  return values.length ? query.in(column, values) : query;
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function employerNameFrom(row: any) {
  return firstRelated(row.employers)?.name ?? "Employer";
}

function rowPaymentForInvoice(payments: any[], invoiceId: string) {
  return payments.find((payment) => payment.invoice_id === invoiceId) ?? null;
}

function statementRowsByEmployeeMonth(rows: any[]) {
  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    const key = `${row.employee_id ?? row.external_employee_id}:${row.month_key}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function usdToInrCents(usdCents: number, rate: number | string | null | undefined) {
  const parsedRate = Number(rate ?? 0);
  return Number.isFinite(parsedRate) && parsedRate > 0 ? Math.round(usdCents * parsedRate) : 0;
}

function toEmployerReceivables(invoices: any[], lineItems: any[], payments: any[]): EmployerReceivableRow[] {
  const lineItemsByInvoice = new Map<string, any[]>();
  for (const item of lineItems) {
    lineItemsByInvoice.set(item.invoice_id, [...(lineItemsByInvoice.get(item.invoice_id) ?? []), item]);
  }

  return invoices.map((invoice) => {
    const payment = rowPaymentForInvoice(payments, invoice.id);
    const invoiceLineItems = lineItemsByInvoice.get(invoice.id) ?? [];
    const received = invoice.status === "received" || invoice.status === "cashed_out" || invoice.status === "paid";
    return {
      id: invoice.id,
      employerId: invoice.employer_id,
      employerName: employerNameFrom(invoice),
      invoiceNumber: invoice.invoice_number ?? invoice.external_invoice_id ?? "Invoice",
      invoiceMonth: invoice.month_key ?? null,
      paidMonth: payment?.payment_month ?? null,
      status: invoice.status ?? "unknown",
      amountUsdCents: centsNumber(invoice.grand_total_usd_cents),
      receivedUsdCents: received ? centsNumber(invoice.grand_total_usd_cents) : 0,
      cashoutRate: payment ? Number(payment.usd_inr_rate ?? 0) || null : null,
      employeeNames: [...new Set(invoiceLineItems.map((item) => item.employee_name_snapshot).filter(Boolean))],
      pdfPath: invoice.pdf_path ?? null,
    };
  });
}

function toEmployeePayables(salaryPayments: any[], statementRows: any[]): EmployeePayableRow[] {
  const statements = statementRowsByEmployeeMonth(statementRows);

  return salaryPayments.map((salary) => {
    const employee = firstRelated(salary.employees);
    const employer = firstRelated(employee?.employers);
    const key = `${salary.employee_id ?? salary.external_employee_id}:${salary.month_key}`;
    const employeeStatements = statements.get(key) ?? [];
    const reimbursementUsdCents = employeeStatements.reduce((sum, row) => sum + centsNumber(row.reimbursement_usd_cents), 0);
    const advanceUsdCents = employeeStatements.reduce((sum, row) => sum + centsNumber(row.onboarding_advance_usd_cents) + centsNumber(row.appraisal_advance_usd_cents), 0);
    const offboardingDeductionUsdCents = employeeStatements.reduce((sum, row) => sum + centsNumber(row.offboarding_deduction_usd_cents), 0);
    const paidRate = Number(salary.paid_usd_inr_rate ?? 0) || null;

    return {
      id: salary.id,
      employeeId: salary.employee_id,
      employeeName: employee?.full_name ?? "Employee",
      employerId: salary.employer_id ?? employee?.employer_id ?? null,
      employerName: employer?.name ?? "Employer",
      payrollMonth: salary.month_key ?? null,
      grossUsdCents: centsNumber(salary.salary_usd_cents),
      grossInrCents: centsNumber(salary.salary_paid_inr_cents),
      pfInrCents: centsNumber(salary.pf_inr_cents),
      tdsInrCents: centsNumber(salary.tds_inr_cents),
      reimbursementUsdCents,
      leaveDeductionInrCents: 0,
      advanceUsdCents,
      offboardingDeductionUsdCents,
      actualPaidInrCents: centsNumber(salary.actual_paid_inr_cents || salary.salary_paid_inr_cents),
      paid: Boolean(salary.paid_status),
      paidDate: salary.paid_date ?? null,
      notes: salary.notes ?? null,
      allowancesInrCents: 0,
      reimbursementsInrCents: usdToInrCents(reimbursementUsdCents, paidRate),
      advancesInrCents: usdToInrCents(advanceUsdCents, paidRate),
      offboardingDeductionInrCents: usdToInrCents(offboardingDeductionUsdCents, paidRate),
    };
  });
}

function toAllocationRows(rows: any[]): AllocationRow[] {
  return rows.map((row) => {
    const employee = firstRelated(row.employees);
    const employer = firstRelated(row.employers);
    const invoice = firstRelated(row.finance_invoices);
    return {
      id: row.id,
      employerId: row.employer_id,
      employerName: employer?.name ?? "Employer",
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Employee",
      invoiceId: row.invoice_id ?? null,
      invoicePaymentId: row.invoice_payment_id ?? null,
      salaryPaymentId: row.salary_payment_id ?? null,
      invoiceNumber: invoice?.invoice_number ?? "Invoice",
      invoiceMonth: row.invoice_month ?? invoice?.month_key ?? null,
      paidMonth: row.paid_month ?? null,
      payrollMonth: row.payroll_month ?? null,
      allocatedUsdCents: centsNumber(row.allocated_usd_cents),
      cashoutRate: Number(row.cashout_rate ?? 0) || null,
      cashoutRateSource: row.cashout_rate_source ?? "invoice_payment",
      allocationSource: row.allocation_source ?? "inferred",
      overrideReason: row.override_reason ?? null,
    };
  });
}

function toEmployerStatement(lineItems: any[]): EmployerStatementRow[] {
  return lineItems.map((row) => {
    const invoice = firstRelated(row.finance_invoices);
    return {
      id: row.id,
      invoiceNumber: invoice?.invoice_number ?? row.external_invoice_id ?? "Invoice",
      invoiceMonth: invoice?.month_key ?? null,
      employeeId: row.employee_id ?? null,
      employeeName: row.employee_name_snapshot ?? "Employee",
      designation: row.designation_snapshot ?? null,
      teamName: row.team_name_snapshot ?? null,
      daysWorked: row.days_worked ?? null,
      hoursPerWeek: row.hrs_per_week === null || row.hrs_per_week === undefined ? null : Number(row.hrs_per_week),
      amountUsdCents: centsNumber(row.billed_total_usd_cents),
      paymentStatus: toEmployerPaymentStatus(invoice?.status),
      pdfPath: invoice?.pdf_path ?? null,
    };
  });
}

function toEmployeeSalaryStatement(salaryPayments: any[], statementRows: any[]): EmployeeSalaryStatementRow[] {
  return toEmployeePayables(salaryPayments, statementRows).map((row) => ({
    id: row.id,
    payrollMonth: row.payrollMonth,
    grossUsdCents: row.grossUsdCents,
    grossInrCents: row.grossInrCents,
    pfInrCents: row.pfInrCents,
    tdsInrCents: row.tdsInrCents,
    allowancesInrCents: 0,
    reimbursementsInrCents: row.reimbursementsInrCents,
    leaveDeductionInrCents: row.leaveDeductionInrCents,
    advancesInrCents: row.advancesInrCents,
    offboardingDeductionInrCents: row.offboardingDeductionInrCents,
    actualPaidInrCents: row.actualPaidInrCents,
    paid: row.paid,
    paidDate: row.paidDate,
    notes: row.notes,
  }));
}

export async function getAdminFinanceReconciliation(
  session: PortalSession,
  rawFilters: Record<string, string | string[] | undefined> = {},
): Promise<AdminFinanceReconciliation> {
  if (!isPlatformAdmin(session.user.role)) {
    throw new Error("Admin access is required.");
  }

  const filters = parseFinanceFilters(rawFilters);
  const supabase = getSupabaseAdmin() as any;
  let invoiceQuery = supabase.from("finance_invoices").select("*, employers(id, name)").order("month_key", { ascending: false });
  let lineItemQuery = supabase.from("finance_invoice_line_items").select("*, finance_invoices(id, invoice_number, month_key, status, pdf_path)").order("created_at", { ascending: false });
  let paymentQuery = supabase.from("finance_invoice_payments").select("*, finance_invoices(id, invoice_number, month_key)").order("payment_month", { ascending: false });
  let salaryQuery = supabase.from("finance_employee_salary_payments").select("*, employees(id, full_name, employer_id, employers(id, name))").order("month_key", { ascending: false });
  let statementQuery = supabase.from("finance_employee_statement_rows").select("*").order("month_key", { ascending: false });
  let allocationQuery = supabase
    .from("finance_payroll_allocations")
    .select("*, employees(id, full_name), employers(id, name), finance_invoices(id, invoice_number, month_key)")
    .order("payroll_month", { ascending: false });

  invoiceQuery = applyIn(invoiceQuery, "month_key", filters.invoiceMonths);
  invoiceQuery = applyIn(invoiceQuery, "employer_id", filters.employerIds);
  invoiceQuery = applyIn(invoiceQuery, "status", filters.statuses);
  lineItemQuery = applyIn(lineItemQuery, "employer_id", filters.employerIds);
  lineItemQuery = applyIn(lineItemQuery, "employee_id", filters.employeeIds);
  paymentQuery = applyIn(paymentQuery, "payment_month", filters.paidMonths);
  paymentQuery = applyIn(paymentQuery, "employer_id", filters.employerIds);
  salaryQuery = applyIn(salaryQuery, "month_key", filters.payrollMonths);
  salaryQuery = applyIn(salaryQuery, "employer_id", filters.employerIds);
  salaryQuery = applyIn(salaryQuery, "employee_id", filters.employeeIds);
  statementQuery = applyIn(statementQuery, "month_key", filters.payrollMonths);
  statementQuery = applyIn(statementQuery, "employee_id", filters.employeeIds);
  allocationQuery = applyIn(allocationQuery, "employer_id", filters.employerIds);
  allocationQuery = applyIn(allocationQuery, "employee_id", filters.employeeIds);
  allocationQuery = applyIn(allocationQuery, "invoice_month", filters.invoiceMonths);
  allocationQuery = applyIn(allocationQuery, "paid_month", filters.paidMonths);
  allocationQuery = applyIn(allocationQuery, "payroll_month", filters.payrollMonths);
  allocationQuery = applyIn(allocationQuery, "allocation_source", filters.allocationSources);
  allocationQuery = applyIn(allocationQuery, "cashout_rate_source", filters.cashoutRateSources);

  const [
    { data: employers },
    { data: employees },
    { data: invoices },
    { data: lineItems },
    { data: payments },
    { data: salaryPayments },
    { data: statementRows },
    { data: allocations },
  ] = await Promise.all([
    supabase.from("employers").select("id, name").order("name", { ascending: true }),
    filters.employerIds.length
      ? supabase.from("employees").select("id, full_name, employer_id").in("employer_id", filters.employerIds).order("full_name", { ascending: true })
      : supabase.from("employees").select("id, full_name, employer_id").order("full_name", { ascending: true }),
    invoiceQuery,
    lineItemQuery,
    paymentQuery,
    salaryQuery,
    statementQuery,
    allocationQuery,
  ]);

  const employerReceivables = toEmployerReceivables(invoices ?? [], lineItems ?? [], payments ?? []);
  const employeePayables = toEmployeePayables(salaryPayments ?? [], statementRows ?? []);
  const allocationsRows = toAllocationRows(allocations ?? []);
  const summary = summarizeAdminFinance({
    employerReceivables,
    employeePayables: employeePayables.map((row) => ({
      actualPaidInrCents: row.actualPaidInrCents,
      pfInrCents: row.pfInrCents,
      tdsInrCents: row.tdsInrCents,
      paid: row.paid,
    })),
  });

  return {
    filters,
    employers: employers ?? [],
    employees: employees ?? [],
    summary,
    employerReceivables,
    employeePayables,
    allocations: allocationsRows,
  };
}

export async function getEmployerFinanceStatement(
  session: PortalSession,
  rawFilters: Record<string, string | string[] | undefined> = {},
  forcedEmployerId?: string,
  forcedEmployeeIds: string[] = [],
): Promise<EmployerFinanceStatement> {
  const filters = parseFinanceFilters(rawFilters);
  const employerId = forcedEmployerId ?? session.user.employer_id;
  if (!employerId) {
    return { filters, rows: [], totals: { billedUsdCents: 0 } };
  }

  const supabase = getSupabaseAdmin() as any;
  let query = supabase
    .from("finance_invoice_line_items")
    .select("*, finance_invoices(id, invoice_number, month_key, status, pdf_path)")
    .eq("employer_id", employerId)
    .eq("sync_status", "synced")
    .order("created_at", { ascending: false });

  query = applyIn(query, "employee_id", forcedEmployeeIds.length ? forcedEmployeeIds : filters.employeeIds);
  const invoiceMonths = filters.invoiceMonths.length ? filters.invoiceMonths : toArrayFilter(rawFilters.month);
  if (invoiceMonths.length) {
    query = query.in("finance_invoices.month_key", invoiceMonths);
  }

  const { data } = await query;
  const rows = toEmployerStatement(data ?? []);
  return {
    filters,
    rows,
    totals: { billedUsdCents: rows.reduce((sum, row) => sum + row.amountUsdCents, 0) },
  };
}

async function resolveEmployeeId(session: PortalSession, requestedEmployeeId?: string) {
  const supabase = getSupabaseAdmin() as any;
  if (requestedEmployeeId && isPlatformAdmin(session.user.role)) return requestedEmployeeId;
  if (requestedEmployeeId && session.user.role === "employer_admin") {
    const { data: employee } = await supabase.from("employees").select("id, employer_id").eq("id", requestedEmployeeId).maybeSingle();
    if (employee?.employer_id === session.user.employer_id) return requestedEmployeeId;
  }
  const { data: employee } = await supabase.from("employees").select("id").eq("portal_user_id", session.user.id).maybeSingle();
  return employee?.id ?? null;
}

export async function getEmployeeSalaryStatement(
  session: PortalSession,
  rawFilters: Record<string, string | string[] | undefined> = {},
  requestedEmployeeId?: string,
): Promise<EmployeeSalaryStatement> {
  const filters = parseFinanceFilters(rawFilters);
  const employeeId = await resolveEmployeeId(session, requestedEmployeeId);
  if (!employeeId) {
    return { rows: [], totals: { actualPaidInrCents: 0, pfInrCents: 0, tdsInrCents: 0 } };
  }

  const supabase = getSupabaseAdmin() as any;
  let salaryQuery = supabase
    .from("finance_employee_salary_payments")
    .select("*, employees(id, full_name, employer_id, employers(id, name))")
    .eq("employee_id", employeeId)
    .eq("sync_status", "synced")
    .order("month_key", { ascending: false });
  let statementQuery = supabase
    .from("finance_employee_statement_rows")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("sync_status", "synced")
    .order("month_key", { ascending: false });
  salaryQuery = applyIn(salaryQuery, "month_key", filters.payrollMonths);
  statementQuery = applyIn(statementQuery, "month_key", filters.payrollMonths);

  const [{ data: salaryPayments }, { data: statementRows }] = await Promise.all([salaryQuery, statementQuery]);
  const rows = toEmployeeSalaryStatement(salaryPayments ?? [], statementRows ?? []);

  return {
    rows,
    totals: {
      actualPaidInrCents: rows.reduce((sum, row) => sum + row.actualPaidInrCents, 0),
      pfInrCents: rows.reduce((sum, row) => sum + row.pfInrCents, 0),
      tdsInrCents: rows.reduce((sum, row) => sum + row.tdsInrCents, 0),
    },
  };
}

export async function getEmployeeFinanceRolePreview(
  session: PortalSession,
  employeeId: string,
  rawFilters: Record<string, string | string[] | undefined> = {},
) {
  const supabase = getSupabaseAdmin() as any;
  const { data: employee } = await supabase.from("employees").select("id, employer_id").eq("id", employeeId).single();
  if (!employee) throw new Error("Employee was not found.");
  if (session.user.role === "employer_admin" && session.user.employer_id !== employee.employer_id) {
    throw new Error("You cannot view this employee finance preview.");
  }
  if (session.user.role === "employee" && session.user.id !== employee.portal_user_id) {
    throw new Error("You cannot view this employee finance preview.");
  }

  const employerView = await getEmployerFinanceStatement(session, rawFilters, employee.employer_id, [employeeId]);
  const employeeView = await getEmployeeSalaryStatement(session, rawFilters, employeeId);
  const adminData = isPlatformAdmin(session.user.role)
    ? await getAdminFinanceReconciliation(session, { ...rawFilters, employee: employeeId })
    : null;

  return {
    employerView,
    employeeView,
    adminAllocations: adminData?.allocations ?? [],
  };
}

export async function getFinancesData(session: PortalSession, filters: Record<string, string | string[] | undefined> = {}): Promise<any> {
  if (isPlatformAdmin(session.user.role)) return getAdminFinanceReconciliation(session, filters);
  if (session.user.role === "employer_admin") return getEmployerFinanceStatement(session, filters);
  return getEmployeeSalaryStatement(session, filters);
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
