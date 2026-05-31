import { beforeEach, describe, expect, test, vi } from "vitest";

const session = {
  clerkUserId: "clerk_admin",
  email: "admin@example.com",
  user: {
    id: "user_admin",
    clerk_user_id: "clerk_admin",
    email: "admin@example.com",
    full_name: "Admin",
    role: "admin",
    status: "suspended",
    employer_id: null,
  },
};

const getPortalSession = vi.fn();
const requirePortalRole = vi.fn();
const getSupabaseAdmin = vi.fn();
const revalidatePath = vi.fn();
const headers = vi.fn();
const createInvitation = vi.fn();
const clerkClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient }));
vi.mock("@/lib/portal/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/portal/session")>(
    "@/lib/portal/session",
  );

  return {
    ...actual,
    getPortalSession,
    requirePortalRole,
  };
});
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/portal/actions/audit", () => ({ writeAudit: vi.fn() }));

function form(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

function createSupabaseMock() {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; payload: unknown }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      single: vi.fn(async () => ({
        data:
          name === "leave_requests"
            ? {
                id: "leave_1",
                employer_id: "employer_1",
                employee_id: "employee_1",
                leave_type: "casual",
                days: 2,
              status: "approved",
            }
            : name === "employer_leads"
              ? {
                  id: "lead_1",
                  portal_user_id: "portal_user_1",
                  email: "lead@example.com",
                  contact_name: "Lead",
                  company_name: "Lead Co",
                  status: "approved",
                }
              : name === "employee_requests"
                ? {
                    id: "request_1",
                    employer_id: "employer_1",
                    email: "employee@example.com",
                    full_name: "Employee",
                    job_title: "Analyst",
                    department: "Ops",
                    proposed_start_date: "2026-06-01",
                    status: "approved",
                  }
            : { id: "row_1", employer_id: "employer_1" },
        error: null,
      })),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: "balance_1",
          casual_available: 10,
        },
        error: null,
      })),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload });
        return query;
      }),
      insert: vi.fn((payload: unknown) => {
        inserts.push({ table: name, payload });
        return query;
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

function createTargetedNoticeSupabaseMock({
  employeeEmployerId = "employer_1",
  employeePortalUserId = "portal_employee_1",
  employeeLookupError = null as Error | null,
} = {}) {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => {
        eqCalls.push({ table: name, column, value });
        return query;
      }),
      not: vi.fn(() => query),
      insert: vi.fn((payload: unknown) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      single: vi.fn(async () => {
        if (name === "employees") {
          return {
            data: employeeLookupError
              ? null
              : {
                  id: "employee_1",
                  employer_id: employeeEmployerId,
                  portal_user_id: employeePortalUserId,
                  full_name: "Employee One",
                },
            error: employeeLookupError,
          };
        }

        if (name === "notices") {
          return { data: { id: "notice_1" }, error: null };
        }

        return { data: null, error: null };
      }),
    };

    return query;
  };

  return {
    eqCalls,
    inserts,
    client: {
      from: vi.fn(table),
    },
  };
}

beforeEach(() => {
  getPortalSession.mockResolvedValue(session);
  requirePortalRole.mockResolvedValue(session);
  clerkClient.mockResolvedValue({
    invitations: {
      createInvitation,
    },
  });
  createInvitation.mockResolvedValue({ id: "invitation_1" });
  revalidatePath.mockReset();
  headers.mockResolvedValue(
    new Map([
      ["host", "localhost:3000"],
      ["x-forwarded-proto", "http"],
    ]),
  );
});

describe("server action authorization guards", () => {
  test("rejects suspended admins before reviewing leave requests", async () => {
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { reviewLeaveRequestAction } = await import("@/lib/portal/actions/leave");

    await expect(
      reviewLeaveRequestAction(
        form({ leave_request_id: "leave_1", decision: "approved" }),
      ),
    ).rejects.toThrow("active");

    expect(supabase.client.from).not.toHaveBeenCalled();
  });

  test("rejects suspended admins before requesting offboarding", async () => {
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { requestOffboardingAction } = await import(
      "@/lib/portal/actions/offboarding"
    );

    await expect(
      requestOffboardingAction(form({ employee_id: "employee_1" })),
    ).rejects.toThrow("active");

    expect(supabase.client.from).not.toHaveBeenCalled();
  });

  test("rejects suspended admins before sending notices", async () => {
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { sendNoticeAction } = await import("@/lib/portal/actions/notices");

    await expect(
      sendNoticeAction(
        form({ audience: "all_employees", title: "Hello", body: "World", priority: "normal" }),
      ),
    ).rejects.toThrow("active");

    expect(supabase.client.from).not.toHaveBeenCalled();
  });
});

describe("targeted notices", () => {
  test("employer admins can send targeted notices only to their own employees", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        status: "active",
        role: "employer_admin",
        employer_id: "employer_1",
      },
    };
    getPortalSession.mockResolvedValue(activeSession);
    const supabase = createTargetedNoticeSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { sendTargetedNoticeAction } = await import("@/lib/portal/actions/notices");

    await sendTargetedNoticeAction(
      form({
        target_type: "employee",
        target_id: "employee_1",
        title: "Hello",
        body: "World",
        priority: "normal",
      }),
    );

    expect(supabase.eqCalls).toContainEqual({
      table: "employees",
      column: "employer_id",
      value: "employer_1",
    });
    expect(supabase.inserts).toContainEqual({
      table: "notice_recipients",
      payload: [{ notice_id: "notice_1", recipient_user_id: "portal_employee_1" }],
    });
  });

  test("employer admins cannot send targeted notices to employer nodes", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        status: "active",
        role: "employer_admin",
        employer_id: "employer_1",
      },
    };
    getPortalSession.mockResolvedValue(activeSession);
    const supabase = createTargetedNoticeSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { sendTargetedNoticeAction } = await import("@/lib/portal/actions/notices");

    await expect(
      sendTargetedNoticeAction(
        form({
          target_type: "employer",
          target_id: "employer_2",
          title: "Hello",
          body: "World",
          priority: "normal",
        }),
      ),
    ).rejects.toThrow("recipient");

    expect(supabase.inserts).toEqual([]);
  });
});

describe("leave review idempotency", () => {
  test("does not deduct balances when the leave request is already reviewed", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    getPortalSession.mockResolvedValue(activeSession);
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { reviewLeaveRequestAction } = await import("@/lib/portal/actions/leave");

    await expect(
      reviewLeaveRequestAction(
        form({ leave_request_id: "leave_1", decision: "approved" }),
      ),
    ).rejects.toThrow("already reviewed");

    expect(supabase.updates).toEqual([]);
  });
});

describe("approval idempotency", () => {
  test("does not create another employer for an already reviewed lead", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { approveLeadAction } = await import("@/lib/portal/actions/employer");

    await expect(approveLeadAction(form({ lead_id: "lead_1" }))).rejects.toThrow(
      "already reviewed",
    );

    expect(supabase.inserts).toEqual([]);
  });

  test("does not create another employee for an already reviewed employee request", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { approveEmployeeRequestAction } = await import(
      "@/lib/portal/actions/employee"
    );

    await expect(
      approveEmployeeRequestAction(form({ request_id: "request_1" })),
    ).rejects.toThrow("already reviewed");

    expect(supabase.inserts).toEqual([]);
  });
});

describe("admin-created employer invitations", () => {
  test("creates an active employer and sends a Clerk invitation email", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { createEmployerInviteAction } = await import(
      "@/lib/portal/actions/employer"
    );

    await createEmployerInviteAction(
      form({
        company_name: "Acme India",
        contact_name: "Priya",
        email: "PRIYA@ACME.EXAMPLE",
      }),
    );

    expect(supabase.inserts).toContainEqual({
      table: "employers",
      payload: expect.objectContaining({
        name: "Acme India",
        contact_email: "priya@acme.example",
        contact_name: "Priya",
        status: "active",
        approved_by: "user_admin",
      }),
    });
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "priya@acme.example",
        redirectUrl: "http://localhost:3000/sign-up",
        publicMetadata: expect.objectContaining({
          portalRole: "employer_admin",
          source: "admin_created_employer",
        }),
      }),
    );
  });
});
