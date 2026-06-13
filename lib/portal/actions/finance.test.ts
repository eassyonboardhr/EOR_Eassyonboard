import { beforeEach, describe, expect, test, vi } from "vitest";
/* eslint-disable @typescript-eslint/no-explicit-any */

const requirePortalRole = vi.fn();
const getSupabaseAdmin = vi.fn();
const revalidatePath = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/portal/session", () => ({
  requirePortalRole,
  isPlatformAdmin: (role: string) => role === "super_admin" || role === "admin",
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));

const adminSession = {
  user: {
    id: "user_admin",
    role: "admin",
    employer_id: null,
  },
};

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function createFinanceSupabaseMock() {
  const updates: Array<{ table: string; payload: any; filters: Array<[string, unknown]> }> = [];
  const inserts: Array<{ table: string; payload: any }> = [];
  const upserts: Array<{ table: string; payload: any; options?: any }> = [];

  const data: Record<string, any[]> = {
    finance_payroll_allocations: [{
      id: "allocation_1",
      source_key: "invoice_generator",
      employer_id: "employer_1",
      employee_id: "employee_1",
      invoice_id: "invoice_old",
      invoice_payment_id: "payment_old",
      salary_payment_id: "salary_1",
      invoice_month: "2026-05",
      paid_month: "2026-05",
      payroll_month: "2026-06",
      allocated_usd_cents: 200000,
      cashout_rate: 82,
      allocation_source: "inferred",
    }],
    finance_invoice_payments: [{
      id: "payment_1",
      invoice_id: "invoice_1",
      employer_id: "employer_1",
      payment_month: "2026-06",
      usd_inr_rate: "84.2500",
      finance_invoices: { id: "invoice_1", month_key: "2026-05" },
    }],
    finance_employee_salary_payments: [{
      id: "salary_2",
      source_key: "invoice_generator",
      employer_id: "employer_1",
      employee_id: "employee_2",
      month_key: "2026-06",
      salary_usd_cents: 300000,
      sync_status: "synced",
    }],
    finance_invoice_line_items: [{
      id: "line_2",
      invoice_id: "invoice_1",
      employer_id: "employer_1",
      employee_id: "employee_2",
      billed_total_usd_cents: 500000,
      sync_status: "synced",
      finance_invoices: { id: "invoice_1", month_key: "2026-05" },
    }],
    audit_events: [],
  };

  const table = (name: string) => {
    const filters: Array<[string, unknown]> = [];
    const matches = (row: any) => filters.every(([column, value]) => row[column] === value);
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push([column, value]);
        return query;
      }),
      not: vi.fn(() => query),
      update: vi.fn((payload: any) => {
        updates.push({ table: name, payload, filters });
        return query;
      }),
      insert: vi.fn((payload: any) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      upsert: vi.fn((payload: any, options?: any) => {
        upserts.push({ table: name, payload, options });
        return Promise.resolve({ data: payload, error: null });
      }),
      single: vi.fn(async () => ({ data: (data[name] ?? []).find(matches) ?? null, error: null })),
      then: vi.fn((resolve) => Promise.resolve({ data: (data[name] ?? []).filter(matches), error: null }).then(resolve)),
    };
    return query;
  };

  return {
    updates,
    inserts,
    upserts,
    client: { from: vi.fn(table) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  requirePortalRole.mockResolvedValue(adminSession);
});

describe("finance allocation actions", () => {
  test("rejects non-admin allocation updates", async () => {
    requirePortalRole.mockResolvedValue({ user: { id: "user_employer", role: "employer_admin" } });
    getSupabaseAdmin.mockReturnValue(createFinanceSupabaseMock().client);
    const { updateFinancePayrollAllocationAction } = await import("@/lib/portal/actions/finance");

    await expect(updateFinancePayrollAllocationAction(form({ allocationId: "allocation_1" }))).rejects.toThrow("Admin access is required.");
  });

  test("changing invoice payment refreshes cashout rate and audits the update", async () => {
    const supabase = createFinanceSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { updateFinancePayrollAllocationAction } = await import("@/lib/portal/actions/finance");

    await updateFinancePayrollAllocationAction(form({
      allocationId: "allocation_1",
      invoicePaymentId: "payment_1",
      allocatedUsdCents: "250000",
    }));

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "finance_payroll_allocations",
      payload: expect.objectContaining({
        invoice_payment_id: "payment_1",
        invoice_id: "invoice_1",
        invoice_month: "2026-05",
        paid_month: "2026-06",
        allocated_usd_cents: 250000,
        cashout_rate: 84.25,
        cashout_rate_source: "invoice_payment",
        allocation_source: "manual",
      }),
    }));
    expect(supabase.inserts).toContainEqual(expect.objectContaining({
      table: "audit_events",
      payload: expect.objectContaining({ action: "update_finance_payroll_allocation" }),
    }));
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/finances");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/worktree");
  });

  test("manual cashout override requires a reason", async () => {
    const supabase = createFinanceSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { updateFinancePayrollAllocationAction } = await import("@/lib/portal/actions/finance");

    await expect(updateFinancePayrollAllocationAction(form({
      allocationId: "allocation_1",
      invoicePaymentId: "payment_1",
      cashoutRateOverride: "85.5",
    }))).rejects.toThrow("Override reason is required.");
  });

  test("infers allocations and upserts inferred rows only", async () => {
    const supabase = createFinanceSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { inferFinancePayrollAllocationsAction } = await import("@/lib/portal/actions/finance");

    await inferFinancePayrollAllocationsAction(form({ employerId: "employer_1", payrollMonth: "2026-06" }));

    expect(supabase.upserts).toContainEqual(expect.objectContaining({
      table: "finance_payroll_allocations",
      payload: [expect.objectContaining({
        salary_payment_id: "salary_2",
        invoice_payment_id: "payment_1",
        allocation_source: "inferred",
        cashout_rate: 84.25,
      })],
      options: { onConflict: "source_key,salary_payment_id" },
    }));
  });
});
