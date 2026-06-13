import { beforeEach, describe, expect, test, vi } from "vitest";

const getPortalSession = vi.fn();
const requirePortalRole = vi.fn();
const getSupabaseAdmin = vi.fn();
const revalidatePath = vi.fn();
const writeAudit = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/portal/session", () => ({
  getPortalSession,
  requirePortalRole,
  isPlatformAdmin: (role: string) => role === "super_admin" || role === "admin",
  ensureActivePortalSession: (session: { user: { status: string } }) => {
    if (session.user.status !== "active") throw new Error("An active portal account is required for this action.");
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/portal/actions/audit", () => ({ writeAudit }));

const adminSession = {
  clerkUserId: "clerk_admin",
  email: "admin@example.com",
  user: {
    id: "user_admin",
    clerk_user_id: "clerk_admin",
    email: "admin@example.com",
    full_name: "Admin",
    role: "admin",
    status: "active",
    employer_id: null,
  },
};

const employerSession = {
  ...adminSession,
  user: {
    ...adminSession.user,
    id: "user_employer",
    role: "employer_admin",
    employer_id: "employer_1",
  },
};

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

type SupabaseScenario = {
  activeEmployeeCount?: number;
  pendingBillCount?: number;
  employeeEmployerId?: string;
  completedOffboarding?: boolean;
  resignationLastWorkingDay?: string | null;
  adminUsers?: string[];
};

function createDeactivationSupabaseMock({
  activeEmployeeCount = 0,
  pendingBillCount = 0,
  employeeEmployerId = "employer_1",
  completedOffboarding = false,
  resignationLastWorkingDay = null,
  adminUsers = ["admin_recipient_1"],
}: SupabaseScenario = {}) {
  const updates: Array<{ table: string; payload: Record<string, unknown>; filters: Array<{ column: string; value: unknown }> }> = [];
  const inserts: Array<{ table: string; payload: unknown }> = [];

  const table = (name: string) => {
    const filters: Array<{ column: string; value: unknown }> = [];
    let selected = "";
    let isCountQuery = false;
    const query = {
      select: vi.fn((columns?: string, options?: { count?: string; head?: boolean }) => {
        selected = columns ?? "";
        isCountQuery = Boolean(options?.count && options?.head);
        return query;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, value });
        return query;
      }),
      neq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, value });
        return query;
      }),
      not: vi.fn(() => query),
      in: vi.fn(() => query),
      or: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload, filters });
        return query;
      }),
      insert: vi.fn((payload: unknown) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      single: vi.fn(async () => {
        if (name === "employees") {
          return {
            data: {
              id: "employee_1",
              employer_id: employeeEmployerId,
              status: "active",
              lifecycle_status: completedOffboarding ? "offboarded" : "active",
              full_name: "Employee One",
            },
            error: null,
          };
        }
        if (name === "notices") return { data: { id: "notice_1" }, error: null };
        return { data: { id: `${name}_1` }, error: null };
      }),
      maybeSingle: vi.fn(async () => {
        if (name === "offboarding_cases" && completedOffboarding) {
          return { data: { id: "offboarding_1", status: "completed", target_last_working_day: "2026-06-01" }, error: null };
        }
        if (name === "resignations" && resignationLastWorkingDay) {
          return { data: { id: "resignation_1", status: "employer_acknowledged", calculated_last_working_day: resignationLastWorkingDay }, error: null };
        }
        return { data: null, error: null };
      }),
      then: vi.fn((resolve) => {
        if (isCountQuery && name === "employees") return Promise.resolve({ count: activeEmployeeCount, data: null, error: null }).then(resolve);
        if (isCountQuery && name === "finance_invoices") return Promise.resolve({ count: pendingBillCount, data: null, error: null }).then(resolve);
        if (name === "portal_users" && selected.includes("id")) {
          return Promise.resolve({ data: adminUsers.map((id) => ({ id })), error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
      }),
    };

    return query;
  };

  return {
    inserts,
    updates,
    client: {
      from: vi.fn(table),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getPortalSession.mockResolvedValue(adminSession);
  requirePortalRole.mockResolvedValue(adminSession);
});

describe("deactivation actions", () => {
  test("blocks employer deactivation when active employees remain", async () => {
    const supabase = createDeactivationSupabaseMock({ activeEmployeeCount: 2 });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { deactivateEmployerAction } = await import("@/lib/portal/actions/deactivation");

    await expect(deactivateEmployerAction(form({ employer_id: "employer_1", reason: "Close account" }))).rejects.toThrow("active employees");

    expect(supabase.updates).toEqual([]);
  });

  test("blocks employer deactivation when pending bills remain", async () => {
    const supabase = createDeactivationSupabaseMock({ pendingBillCount: 1 });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { deactivateEmployerAction } = await import("@/lib/portal/actions/deactivation");

    await expect(deactivateEmployerAction(form({ employer_id: "employer_1", reason: "Close account" }))).rejects.toThrow("pending or unpaid bills");

    expect(supabase.updates).toEqual([]);
  });

  test("deactivates employer when strict blockers are clear", async () => {
    const supabase = createDeactivationSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { deactivateEmployerAction } = await import("@/lib/portal/actions/deactivation");

    await deactivateEmployerAction(form({ employer_id: "employer_1", reason: "Close account" }));

    expect(supabase.updates).toContainEqual({
      table: "employers",
      payload: expect.objectContaining({ status: "deactivated" }),
      filters: expect.arrayContaining([{ column: "id", value: "employer_1" }]),
    });
    expect(writeAudit).toHaveBeenCalledWith(adminSession.user, "deactivate_employer", "employer", "employer_1", expect.objectContaining({ reason: "Close account" }));
  });

  test("blocks employer users from deactivating employees outside their scope", async () => {
    getPortalSession.mockResolvedValue(employerSession);
    const supabase = createDeactivationSupabaseMock({ employeeEmployerId: "employer_2", completedOffboarding: true });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { deactivateEmployeeAction } = await import("@/lib/portal/actions/deactivation");

    await expect(deactivateEmployeeAction(form({ employee_id: "employee_1", reason: "Completed exit" }))).rejects.toThrow("outside your employer scope");

    expect(supabase.updates).toEqual([]);
  });

  test("deactivates employee after completed offboarding", async () => {
    getPortalSession.mockResolvedValue(employerSession);
    const supabase = createDeactivationSupabaseMock({ completedOffboarding: true });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { deactivateEmployeeAction } = await import("@/lib/portal/actions/deactivation");

    await deactivateEmployeeAction(form({ employee_id: "employee_1", reason: "Completed exit" }));

    expect(supabase.updates).toContainEqual({
      table: "employees",
      payload: expect.objectContaining({ status: "deactivated", lifecycle_status: "offboarded" }),
      filters: expect.arrayContaining([{ column: "id", value: "employee_1" }]),
    });
  });

  test("deactivates employee after resignation last working day has passed", async () => {
    const supabase = createDeactivationSupabaseMock({ resignationLastWorkingDay: "2026-01-01" });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { deactivateEmployeeAction } = await import("@/lib/portal/actions/deactivation");

    await deactivateEmployeeAction(form({ employee_id: "employee_1", reason: "Notice completed" }));

    expect(supabase.updates).toContainEqual({
      table: "employees",
      payload: expect.objectContaining({ status: "deactivated", lifecycle_status: "offboarded" }),
      filters: expect.arrayContaining([{ column: "id", value: "employee_1" }]),
    });
  });

  test("allows admin absconding deactivation with reason", async () => {
    const supabase = createDeactivationSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { deactivateEmployeeAction } = await import("@/lib/portal/actions/deactivation");

    await deactivateEmployeeAction(form({ employee_id: "employee_1", reason: "Absconding for 10 days", deactivation_reason: "absconding" }));

    expect(supabase.updates).toContainEqual({
      table: "employees",
      payload: expect.objectContaining({ status: "deactivated" }),
      filters: expect.arrayContaining([{ column: "id", value: "employee_1" }]),
    });
    expect(writeAudit).toHaveBeenCalledWith(adminSession.user, "deactivate_employee", "employee", "employee_1", expect.objectContaining({ eligibleReason: "absconding_admin" }));
  });

  test("records keep-active decision without deactivating employee", async () => {
    const supabase = createDeactivationSupabaseMock({ completedOffboarding: true });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { keepEmployeeActiveAction } = await import("@/lib/portal/actions/deactivation");

    await keepEmployeeActiveAction(form({ employee_id: "employee_1", reason: "Need payroll review" }));

    expect(supabase.updates).toEqual([]);
    expect(writeAudit).toHaveBeenCalledWith(adminSession.user, "keep_employee_active_after_exit", "employee", "employee_1", expect.objectContaining({ reason: "Need payroll review" }));
  });

  test("completed offboarding creates an admin deactivation reminder notice", async () => {
    const supabase = createDeactivationSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { createAdminDeactivationReminder } = await import("@/lib/portal/actions/deactivation");

    await createAdminDeactivationReminder({
      actorId: "user_admin",
      employeeId: "employee_1",
      employerId: "employer_1",
      employeeName: "Employee One",
      reason: "completed_offboarding",
    });

    expect(supabase.inserts).toContainEqual({
      table: "notices",
      payload: expect.objectContaining({
        title: "Employee deactivation review needed",
        category: "offboarding",
        action_url: "/dashboard/employees?tab=deactivate&employee=employee_1",
      }),
    });
    expect(supabase.inserts).toContainEqual({
      table: "notice_recipients",
      payload: [{ notice_id: "notice_1", recipient_user_id: "admin_recipient_1" }],
    });
  });
});
