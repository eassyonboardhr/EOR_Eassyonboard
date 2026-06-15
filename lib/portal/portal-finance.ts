import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import {
  normalizeFinanceMonth,
  type PortalEmployeePayrollRecord,
  type PortalFinanceFilters,
  type PortalEmployerInvoiceRecord,
} from "@/lib/portal/portal-finance-types";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

function toArrayFilter(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => (item ?? "").split(","))
    .map((item) => item.trim())
    .filter((item) => item && item !== "all");
}

export function parsePortalFinanceFilters(
  rawFilters: Record<string, string | string[] | undefined> = {},
): PortalFinanceFilters {
  return {
    employerIds: toArrayFilter(rawFilters.employer),
    employeeIds: toArrayFilter(rawFilters.employee),
    months: [...new Set([...toArrayFilter(rawFilters.month), ...toArrayFilter(rawFilters.invoiceMonth), ...toArrayFilter(rawFilters.payrollMonth)])]
      .map(normalizeFinanceMonth),
    statuses: toArrayFilter(rawFilters.status),
  };
}

function applyIn(query: any, column: string, values: string[]) {
  return values.length ? query.in(column, values) : query;
}

export function normalizeRelationArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function resolveEmployeeIdForSession(sessionUserId: string) {
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("portal_user_id", sessionUserId)
    .maybeSingle();
  return employee?.id ?? null;
}

export async function getAdminEmployerInvoiceRecords(
  rawFilters: Record<string, string | string[] | undefined> = {},
) {
  await requirePortalRole(["super_admin", "admin"]);
  const filters = parsePortalFinanceFilters(rawFilters);
  const supabase = getSupabaseAdmin();
  let query = from(supabase, "portal_employer_invoice_records")
    .select("*, employers(id, name), employees(id, full_name, email), portal_employer_invoice_line_items(*)")
    .order("invoice_month", { ascending: false });

  query = applyIn(query, "employer_id", filters.employerIds);
  query = applyIn(query, "employee_id", filters.employeeIds);
  query = applyIn(query, "invoice_month", filters.months);
  query = applyIn(query, "status", filters.statuses);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminEmployeePayrollRecords(
  rawFilters: Record<string, string | string[] | undefined> = {},
) {
  await requirePortalRole(["super_admin", "admin"]);
  const filters = parsePortalFinanceFilters(rawFilters);
  const supabase = getSupabaseAdmin();
  let query = from(supabase, "portal_employee_payroll_records")
    .select("*, employers(id, name), employees(id, full_name, email), portal_employee_payroll_line_items(*), portal_payslip_files(*)")
    .order("payroll_month", { ascending: false });

  query = applyIn(query, "employer_id", filters.employerIds);
  query = applyIn(query, "employee_id", filters.employeeIds);
  query = applyIn(query, "payroll_month", filters.months);
  query = applyIn(query, "payment_status", filters.statuses);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return attachAdminPayslipUrls(data ?? []);
}

export async function getAdminPortalFinanceOverview(
  rawFilters: Record<string, string | string[] | undefined> = {},
) {
  const [employerInvoices, employeePayroll] = await Promise.all([
    getAdminEmployerInvoiceRecords(rawFilters),
    getAdminEmployeePayrollRecords(rawFilters),
  ]);

  return {
    employerInvoices,
    employeePayroll,
    totals: {
      employerInvoiceCount: employerInvoices.length,
      employeePayrollCount: employeePayroll.length,
      employerMonthlyBill: employerInvoices.reduce((sum: number, row: any) => sum + Number(row.monthly_bill ?? 0), 0),
      employeeActualPaidInr: employeePayroll.reduce((sum: number, row: any) => sum + Number(row.actual_paid_inr ?? 0), 0),
    },
  };
}

async function attachAdminPayslipUrls(rows: PortalEmployeePayrollRecord[]) {
  const supabase = getSupabaseAdmin();
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      portal_payslip_files: await Promise.all(
        normalizeRelationArray(row.portal_payslip_files).map(async (payslip) => {
          const { data } = await supabase.storage.from("payslips").createSignedUrl(payslip.file_path, 60 * 10);
          return { ...payslip, signed_url: data?.signedUrl ?? null };
        }),
      ),
    })),
  );
}

export async function getAdminPortalFinanceOptions() {
  await requirePortalRole(["super_admin", "admin"]);
  const supabase = getSupabaseAdmin();
  const [{ data: employers, error: employerError }, { data: employees, error: employeeError }] = await Promise.all([
    supabase.from("employers").select("id, name").order("name", { ascending: true }),
    supabase.from("employees").select("id, full_name, email, employer_id, employers(id, name)").order("full_name", { ascending: true }),
  ]);
  if (employerError) throw new Error(employerError.message);
  if (employeeError) throw new Error(employeeError.message);
  return { employers: employers ?? [], employees: employees ?? [] };
}

export async function getEmployerPortalFinanceView(
  rawFilters: Record<string, string | string[] | undefined> = {},
) {
  const session = await requirePortalRole(["employer_admin"]);
  if (!session.user.employer_id) {
    return {
      filters: parsePortalFinanceFilters(rawFilters),
      employerInvoices: [],
      totals: calculateEmployerInvoiceTotals([]),
      employees: [],
    };
  }

  const filters = parsePortalFinanceFilters(rawFilters);
  const supabase = getSupabaseAdmin();
  let query = from(supabase, "portal_employer_invoice_records")
    .select("*, employees(id, full_name, email), portal_employer_invoice_line_items(*)")
    .eq("employer_id", session.user.employer_id)
    .order("invoice_month", { ascending: false });

  query = applyIn(query, "employee_id", filters.employeeIds);
  query = applyIn(query, "invoice_month", filters.months);
  query = applyIn(query, "status", filters.statuses);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const employerInvoices = (data ?? []) as PortalEmployerInvoiceRecord[];
  const employees = Array.from(
    new Map(
      employerInvoices
        .map((row) => row.employees)
        .filter((employee): employee is NonNullable<PortalEmployerInvoiceRecord["employees"]> => Boolean(employee?.id))
        .map((employee) => [employee.id, employee]),
    ).values(),
  );
  return { filters, employerInvoices, employees, totals: calculateEmployerInvoiceTotals(employerInvoices) };
}

export function calculateEmployerInvoiceTotals(rows: Array<Pick<PortalEmployerInvoiceRecord, "employee_id" | "monthly_bill" | "status">>) {
  const byStatus = (status: string) =>
    rows
      .filter((row) => row.status === status)
      .reduce((sum, row) => sum + Number(row.monthly_bill ?? 0), 0);

  return {
    totalMonthlyBill: rows.reduce((sum, row) => sum + Number(row.monthly_bill ?? 0), 0),
    raisedTotal: byStatus("raised"),
    receivedTotal: byStatus("received"),
    paidTotal: byStatus("paid"),
    recordCount: rows.length,
    employeeCount: new Set(rows.map((row) => row.employee_id)).size,
  };
}

export async function getEmployeePortalFinanceView(
  rawFilters: Record<string, string | string[] | undefined> = {},
) {
  const session = await requirePortalRole(["employee"]);
  const employeeId = await resolveEmployeeIdForSession(session.user.id);
  if (!employeeId) {
    return {
      filters: parsePortalFinanceFilters(rawFilters),
      payrollRecords: [],
      totals: calculateEmployeePayrollTotals([]),
    };
  }

  const filters = parsePortalFinanceFilters(rawFilters);
  const supabase = getSupabaseAdmin();
  let query = from(supabase, "portal_employee_payroll_records")
    .select("*, portal_employee_payroll_line_items(*), portal_payslip_files(id, payroll_record_id, employer_id, employee_id, payroll_month, file_name, mime_type, file_size_bytes, uploaded_at, created_at)")
    .eq("employee_id", employeeId)
    .order("payroll_month", { ascending: false });

  query = applyIn(query, "payroll_month", filters.months);
  query = applyIn(query, "payment_status", filters.statuses);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const payrollRecords = (data ?? []) as PortalEmployeePayrollRecord[];
  return { filters, payrollRecords, totals: calculateEmployeePayrollTotals(payrollRecords) };
}

export function calculateEmployeePayrollTotals(
  rows: Array<Pick<PortalEmployeePayrollRecord, "gross_salary_inr" | "actual_paid_inr" | "payment_status">>,
) {
  const pendingRows = rows.filter((row) => row.payment_status !== "paid");
  return {
    totalGrossSalaryInr: rows.reduce((sum, row) => sum + Number(row.gross_salary_inr ?? 0), 0),
    totalActualPaidInr: rows.reduce((sum, row) => sum + Number(row.actual_paid_inr ?? 0), 0),
    paidRecordCount: rows.filter((row) => row.payment_status === "paid").length,
    recordCount: rows.length,
    pendingAmountInr: pendingRows.reduce((sum, row) => sum + Number(row.gross_salary_inr ?? 0), 0),
    pendingRecordCount: pendingRows.length,
  };
}

export function assertPlatformFinanceAdmin(role: string) {
  if (!isPlatformAdmin(role as any)) {
    throw new Error("Admin access is required for portal finance.");
  }
}
