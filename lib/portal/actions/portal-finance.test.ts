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

function form(values: Record<string, string | File>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("portal finance action guards", () => {
  test("rejects employer attempts to write employee payroll records", async () => {
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_employer", role: "employer_admin", employer_id: "employer_1", status: "active" },
    });
    const { upsertEmployeePayrollRecordAction } = await import("@/lib/portal/actions/portal-finance");

    await expect(upsertEmployeePayrollRecordAction(form({
      employer_id: "employer_1",
      employee_id: "employee_1",
      payroll_month: "2026-06-01",
    }))).rejects.toThrow("Admin access is required");

    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  test("rejects employee attempts to write employer invoice records", async () => {
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_employee", role: "employee", employer_id: null, status: "active" },
    });
    const { upsertEmployerInvoiceRecordAction } = await import("@/lib/portal/actions/portal-finance");

    await expect(upsertEmployerInvoiceRecordAction(form({
      employer_id: "employer_1",
      employee_id: "employee_1",
      invoice_month: "2026-06-01",
    }))).rejects.toThrow("Admin access is required");

    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  test("rejects negative employer invoice values before writing", async () => {
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_admin", role: "admin", employer_id: null, status: "active" },
    });
    const { upsertEmployerInvoiceRecordAction } = await import("@/lib/portal/actions/portal-finance");

    await expect(upsertEmployerInvoiceRecordAction(form({
      employer_id: "employer_1",
      employee_id: "employee_1",
      invoice_month: "2026-06",
      hourly_rate: "-1",
      hours_per_week: "40",
    }))).rejects.toThrow("hourly_rate must be zero or more");

    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  test("rejects negative payroll values before writing", async () => {
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_admin", role: "admin", employer_id: null, status: "active" },
    });
    const { upsertEmployeePayrollRecordAction } = await import("@/lib/portal/actions/portal-finance");

    await expect(upsertEmployeePayrollRecordAction(form({
      employer_id: "employer_1",
      employee_id: "employee_1",
      payroll_month: "2026-06",
      gross_salary_inr: "50000",
      actual_paid_inr: "-1",
    }))).rejects.toThrow("actual_paid_inr must be zero or more");

    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  test("removes the previous payslip object only after replacement metadata is saved", async () => {
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_admin", role: "admin", employer_id: null, status: "active" },
    });
    const remove = vi.fn(async () => ({ data: [], error: null }));
    const upload = vi.fn(async () => ({ data: { path: "new-path" }, error: null }));
    const storageFrom = vi.fn(() => ({ upload, remove }));
    const queries: Array<{ table: string; op: string }> = [];
    const createQuery = (table: string) => {
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => ({
          data: { id: "payroll_1", employer_id: "employer_1", employee_id: "employee_1", payroll_month: "2026-06-01" },
          error: null,
        })),
        maybeSingle: vi.fn(async () => ({
          data: { id: "payslip_1", file_path: "old-path" },
          error: null,
        })),
        upsert: vi.fn(async () => {
          queries.push({ table, op: "upsert" });
          return { data: null, error: null };
        }),
      };
      return query;
    };
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => createQuery(table)),
      storage: { from: storageFrom },
    });
    const { uploadPayslipAction } = await import("@/lib/portal/actions/portal-finance");

    await uploadPayslipAction(form({
      payroll_record_id: "payroll_1",
      file: new File(["new"], "new-payslip.pdf", { type: "application/pdf" }),
    }));

    expect(upload).toHaveBeenCalled();
    expect(queries).toContainEqual({ table: "portal_payslip_files", op: "upsert" });
    expect(remove).toHaveBeenCalledWith(["old-path"]);
  });

  test("logs and keeps replacement successful when old payslip object deletion fails", async () => {
    requirePortalRole.mockResolvedValue({
      user: { id: "portal_admin", role: "admin", employer_id: null, status: "active" },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const remove = vi.fn(async () => ({ data: null, error: { message: "storage cleanup failed" } }));
    const upload = vi.fn(async () => ({ data: { path: "new-path" }, error: null }));
    const createQuery = () => {
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => ({
          data: { id: "payroll_1", employer_id: "employer_1", employee_id: "employee_1", payroll_month: "2026-06-01" },
          error: null,
        })),
        maybeSingle: vi.fn(async () => ({
          data: { id: "payslip_1", file_path: "old-path" },
          error: null,
        })),
        upsert: vi.fn(async () => ({ data: null, error: null })),
      };
      return query;
    };
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => createQuery()),
      storage: { from: vi.fn(() => ({ upload, remove })) },
    });
    const { uploadPayslipAction } = await import("@/lib/portal/actions/portal-finance");

    await expect(uploadPayslipAction(form({
      payroll_record_id: "payroll_1",
      file: new File(["new"], "new-payslip.pdf", { type: "application/pdf" }),
    }))).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      "Failed to remove replaced payslip object.",
      expect.objectContaining({ path: "old-path", error: "storage cleanup failed" }),
    );
  });
});
