import { beforeEach, describe, expect, test, vi } from "vitest";
/* eslint-disable @typescript-eslint/no-explicit-any */

const requirePortalRole = vi.fn();
const getSupabaseAdmin = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/session", () => ({
  requirePortalRole,
  isPlatformAdmin: (role: string) => role === "super_admin" || role === "admin",
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));

function createQuery(tableName: string, calls: string[], eqCalls: Array<{ table: string; column: string; value: unknown }> = []) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push({ table: tableName, column, value });
      return query;
    }),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: { id: "employee_self" }, error: null })),
    then: vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
  };
  calls.push(tableName);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("portal finance loaders", () => {
  test("normalizes Supabase relation embeds that can return one object or an array", async () => {
    const { normalizeRelationArray } = await import("@/lib/portal/portal-finance");

    expect(normalizeRelationArray(null)).toEqual([]);
    expect(normalizeRelationArray({ id: "payslip_1" })).toEqual([{ id: "payslip_1" }]);
    expect(normalizeRelationArray([{ id: "payslip_1" }, { id: "payslip_2" }])).toEqual([{ id: "payslip_1" }, { id: "payslip_2" }]);
  });

  test("employer finance loader reads only employer invoice records and scopes employer id", async () => {
    const calls: string[] = [];
    const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_employer", role: "employer_admin", employer_id: "employer_1", status: "active" },
    });
    getSupabaseAdmin.mockReturnValue({ from: vi.fn((tableName: string) => createQuery(tableName, calls, eqCalls)) });

    const { getEmployerPortalFinanceView } = await import("@/lib/portal/portal-finance");
    await getEmployerPortalFinanceView();

    expect(calls).toContain("portal_employer_invoice_records");
    expect(calls).not.toContain("portal_employee_payroll_records");
    expect(calls).not.toContain("portal_payslip_files");
    expect(eqCalls).toContainEqual({
      table: "portal_employer_invoice_records",
      column: "employer_id",
      value: "employer_1",
    });
  });

  test("employee finance loader reads own payroll records and not employer invoices", async () => {
    const calls: string[] = [];
    const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_employee", role: "employee", employer_id: null, status: "active" },
    });
    getSupabaseAdmin.mockReturnValue({ from: vi.fn((tableName: string) => createQuery(tableName, calls, eqCalls)) });

    const { getEmployeePortalFinanceView } = await import("@/lib/portal/portal-finance");
    await getEmployeePortalFinanceView({ employee: "employee_other" });

    expect(calls).toContain("employees");
    expect(calls).toContain("portal_employee_payroll_records");
    expect(calls).not.toContain("portal_employer_invoice_records");
    expect(calls).not.toContain("portal_employer_invoice_line_items");
    expect(eqCalls).toContainEqual({
      table: "portal_employee_payroll_records",
      column: "employee_id",
      value: "employee_self",
    });
    expect(eqCalls).not.toContainEqual({
      table: "portal_employee_payroll_records",
      column: "employee_id",
      value: "employee_other",
    });
  });

  test("employer invoice totals are calculated from invoice records only", async () => {
    const { calculateEmployerInvoiceTotals } = await import("@/lib/portal/portal-finance");

    const totals = calculateEmployerInvoiceTotals([
      { employee_id: "employee_1", monthly_bill: "1000.50", status: "raised" },
      { employee_id: "employee_2", monthly_bill: "500.25", status: "received" },
      { employee_id: "employee_1", monthly_bill: "250.25", status: "paid" },
    ]);

    expect(totals).toEqual({
      totalMonthlyBill: 1751,
      raisedTotal: 1000.5,
      receivedTotal: 500.25,
      paidTotal: 250.25,
      recordCount: 3,
      employeeCount: 2,
    });
  });

  test("employee payroll totals are calculated from employee payroll records only", async () => {
    const { calculateEmployeePayrollTotals } = await import("@/lib/portal/portal-finance");

    const totals = calculateEmployeePayrollTotals([
      { gross_salary_inr: "50000", actual_paid_inr: "45000", payment_status: "paid" },
      { gross_salary_inr: "60000", actual_paid_inr: "0", payment_status: "pending" },
      { gross_salary_inr: "30000", actual_paid_inr: "0", payment_status: "hold" },
    ]);

    expect(totals).toEqual({
      totalGrossSalaryInr: 140000,
      totalActualPaidInr: 45000,
      paidRecordCount: 1,
      recordCount: 3,
      pendingAmountInr: 90000,
      pendingRecordCount: 2,
    });
  });
});
