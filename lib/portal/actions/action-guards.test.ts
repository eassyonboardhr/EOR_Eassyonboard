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

function createApproveEmployeeRequestSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({
        data:
          name === "leave_policies"
            ? { casual_leave: 7, sick_leave: 7, earned_leave: 6 }
            : null,
        error: null,
      })),
      insert: vi.fn((payload: unknown) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload });
        return query;
      }),
      single: vi.fn(async () => {
        if (name === "employee_requests") {
          return {
            data: {
              id: "request_1",
              employer_id: "employer_1",
              email: "new.employee@example.com",
              full_name: "New Employee",
              job_title: "Analyst",
              department: "Ops",
              proposed_start_date: "2026-06-01",
              status: "pending",
              hourly_billing_rate: 25,
              hours_per_week: 40,
              billing_currency: "USD",
              employee_id: null,
              invite_sent_at: null,
            },
            error: null,
          };
        }

        if (name === "employees") {
          return { data: { id: "employee_1" }, error: null };
        }

        return { data: { id: `${name}_1` }, error: null };
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

function createDocumentReviewSupabaseMock() {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const upserts: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload });
        return query;
      }),
      upsert: vi.fn((payload: Record<string, unknown>) => {
        upserts.push({ table: name, payload });
        return query;
      }),
      maybeSingle: vi.fn(async () => ({
        data: name === "employees" ? { portal_user_id: null, employer_id: "employer_1" } : null,
        error: null,
      })),
      single: vi.fn(async () => ({
        data: name === "employee_documents" ? { id: "doc_1", employee_id: "employee_1" } : { id: "row_1" },
        error: null,
      })),
    };

    return query;
  };

  return {
    updates,
    upserts,
    client: {
      from: vi.fn(table),
    },
  };
}

function createOnboardingApprovalGateSupabaseMock() {
  const upserts: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      upsert: vi.fn((payload: Record<string, unknown>) => {
        upserts.push({ table: name, payload });
        return query;
      }),
      maybeSingle: vi.fn(async () => ({
        data: name === "employee_experience" ? { is_fresher: true } : null,
        error: null,
      })),
      then:
        name === "employee_documents"
          ? vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve))
          : undefined,
    };

    return query;
  };

  return {
    upserts,
    client: {
      from: vi.fn(table),
    },
  };
}

function createResendInviteSupabaseMock() {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload });
        return query;
      }),
      single: vi.fn(async () => ({
        data:
          name === "employee_requests"
            ? {
                id: "request_1",
                employer_id: "employer_1",
                email: "new.employee@example.com",
                full_name: "New Employee",
                status: "approved",
                employee_id: "employee_1",
              }
            : null,
        error: null,
      })),
    };

    return query;
  };

  return {
    updates,
    client: {
      from: vi.fn(table),
    },
  };
}

function createCustomFieldSupabaseMock() {
  const upserts: Array<{ table: string; payload: unknown }> = [];
  const requiredField = {
    id: "field_1",
    field_label: "T-Shirt Size",
    field_key: "tshirt_size",
    field_type: "text",
    required: true,
    default_value: null,
  };

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      order: vi.fn(() => query),
      upsert: vi.fn((payload: unknown) => {
        upserts.push({ table: name, payload });
        return Promise.resolve({ error: null });
      }),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      then: name === "custom_fields"
        ? vi.fn((resolve) => Promise.resolve({ data: [requiredField], error: null }).then(resolve))
        : undefined,
    };

    return query;
  };

  return {
    upserts,
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

describe("onboarding core actions", () => {
  test("admin approval creates employee records and sends a Clerk employee invitation", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createApproveEmployeeRequestSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { approveEmployeeRequestAction } = await import(
      "@/lib/portal/actions/employee"
    );

    await approveEmployeeRequestAction(form({ request_id: "request_1" }));

    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "new.employee@example.com",
        redirectUrl: "http://localhost:3000/sign-up",
        publicMetadata: expect.objectContaining({
          portalRole: "employee",
          employeeId: "employee_1",
        }),
      }),
    );
    expect(supabase.updates).toContainEqual({
      table: "employee_requests",
      payload: expect.objectContaining({
        status: "approved",
        employee_id: "employee_1",
        invite_id: "invitation_1",
      }),
    });
  });

  test("document rejection marks employee onboarding as needs correction", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createDocumentReviewSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { reviewEmployeeDocumentAction } = await import(
      "@/lib/portal/actions/global-onboarding"
    );

    await reviewEmployeeDocumentAction(
      form({ document_id: "doc_1", decision: "Rejected", remarks: "Upload a clearer copy." }),
    );

    expect(supabase.updates).toContainEqual({
      table: "employee_documents",
      payload: expect.objectContaining({
        verification_status: "Rejected",
        remarks: "Upload a clearer copy.",
      }),
    });
    expect(supabase.upserts).toContainEqual({
      table: "employee_onboarding_status",
      payload: expect.objectContaining({
        employee_id: "employee_1",
        status: "Needs Correction",
      }),
    });
  });

  test("admin onboarding approval is blocked until mandatory documents are approved", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createOnboardingApprovalGateSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { reviewEmployeeOnboardingAction } = await import(
      "@/lib/portal/actions/global-onboarding"
    );

    await expect(
      reviewEmployeeOnboardingAction(
        form({ employee_id: "employee_1", decision: "Approved" }),
      ),
    ).rejects.toThrow("mandatory employee documents");

    expect(supabase.upserts).toEqual([]);
  });

  test("admin can resend an employee invite and update invite metadata", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createResendInviteSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { resendEmployeeInviteAction } = await import(
      "@/lib/portal/actions/employee"
    );

    await resendEmployeeInviteAction(form({ request_id: "request_1" }));

    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "new.employee@example.com",
        ignoreExisting: true,
        publicMetadata: expect.objectContaining({
          portalRole: "employee",
          employeeId: "employee_1",
        }),
      }),
    );
    expect(supabase.updates).toContainEqual({
      table: "employee_requests",
      payload: expect.objectContaining({
        invite_id: "invitation_1",
        invite_error: null,
      }),
    });
  });

  test("required custom fields are validated before values are saved", async () => {
    const supabase = createCustomFieldSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { saveCustomFieldValuesForEntity } = await import(
      "@/lib/portal/actions/global-onboarding"
    );

    await expect(
      saveCustomFieldValuesForEntity({
        entityId: "employee_1",
        targetType: "employee",
        formData: form({}),
      }),
    ).rejects.toThrow("T-Shirt Size is required");

    expect(supabase.upserts).toEqual([]);
  });
});
