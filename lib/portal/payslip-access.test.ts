import { beforeEach, describe, expect, test, vi } from "vitest";

const getSupabaseAdmin = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/portal/session", () => ({
  isPlatformAdmin: (role: string) => role === "super_admin" || role === "admin",
}));

const employeeSession = {
  clerkUserId: "clerk_employee",
  email: "employee@example.com",
  user: {
    id: "portal_employee",
    clerk_user_id: "clerk_employee",
    email: "employee@example.com",
    full_name: "Employee",
    role: "employee",
    status: "active",
    employer_id: null,
  },
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("payslip access", () => {
  test("denies employer access to payslips", async () => {
    const { canAccessPayslip } = await import("@/lib/portal/payslip-access");

    await expect(canAccessPayslip({
      ...employeeSession,
      user: { ...employeeSession.user, role: "employer_admin", employer_id: "employer_1" },
    }, { employee_id: "employee_1" })).resolves.toBe(false);

    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  test("denies employee access to another employee payslip", async () => {
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: "employee_self" }, error: null })),
          })),
        })),
      })),
    });
    const { canAccessPayslip } = await import("@/lib/portal/payslip-access");

    await expect(canAccessPayslip(employeeSession, { employee_id: "employee_other" })).resolves.toBe(false);
  });
});
