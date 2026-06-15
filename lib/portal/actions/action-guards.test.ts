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

function createDocumentReviewSupabaseMock({ onboardingStatus = null as string | null } = {}) {
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
        data:
          name === "employees"
            ? { portal_user_id: null, employer_id: "employer_1" }
            : name === "employee_onboarding_status" && onboardingStatus
              ? { status: onboardingStatus }
              : null,
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

function createOnboardingApprovalAllowsPendingDocsSupabaseMock() {
  const upserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

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
        data: name === "employee_experience" ? { is_fresher: true } : null,
        error: null,
      })),
      single: vi.fn(async () => ({
        data: name === "employees" ? { id: "employee_1", full_name: "Employee One", employer_id: "employer_1" } : { id: "row_1" },
        error: null,
      })),
      then:
        name === "employee_documents" || name === "portal_users"
          ? vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve))
          : undefined,
    };

    return query;
  };

  return {
    upserts,
    updates,
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

function createTeamManagementSupabaseMock() {
  const deletes: Array<{ table: string; filters: Array<{ column: string; value: unknown; op?: string }> }> = [];
  const upserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const currentFilters: Array<{ column: string; value: unknown; op?: string }> = [];
    let isDelete = false;
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => {
        currentFilters.push({ column, value });
        return query;
      }),
      neq: vi.fn((column: string, value: unknown) => {
        currentFilters.push({ column, value, op: "neq" });
        return query;
      }),
      delete: vi.fn(() => {
        isDelete = true;
        return query;
      }),
      upsert: vi.fn((payload: unknown) => {
        upserts.push({ table: name, payload });
        return Promise.resolve({ error: null });
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload });
        return query;
      }),
      single: vi.fn(async () => ({ data: { id: "row_1" }, error: null })),
      then: vi.fn((resolve) => {
        if (isDelete) deletes.push({ table: name, filters: [...currentFilters] });
        return Promise.resolve({ error: null }).then(resolve);
      }),
    };

    return query;
  };

  return {
    deletes,
    updates,
    upserts,
    client: {
      from: vi.fn(table),
    },
  };
}

function createBulkTeamAssignmentsSupabaseMock({
  employeeEmployerId = "employer_1",
  teamEmployerId = "employer_1",
  employerExists = true,
  rpcError = null as Error | null,
} = {}) {
  const deletes: Array<{ table: string; filters: Array<{ column: string; value: unknown; op?: string }> }> = [];
  const upserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: Record<string, unknown>; filters: Array<{ column: string; value: unknown; op?: string }> }> = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const filters: Array<{ column: string; value: unknown; op?: string }> = [];
    let isDelete = false;
    let updatePayload: Record<string, unknown> | null = null;
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, value });
        return query;
      }),
      neq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, value, op: "neq" });
        return query;
      }),
      delete: vi.fn(() => {
        isDelete = true;
        return query;
      }),
      upsert: vi.fn((payload: unknown) => {
        upserts.push({ table: name, payload });
        return Promise.resolve({ error: null });
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        updatePayload = payload;
        return query;
      }),
      single: vi.fn(async () => {
        if (name === "employers") {
          return { data: employerExists ? { id: "employer_1" } : null, error: null };
        }
        if (name === "employees") {
          const requestedEmployerId = filters.find((filter) => filter.column === "employer_id")?.value;
          return {
            data: requestedEmployerId === employeeEmployerId ? { id: "employee_1", employer_id: employeeEmployerId } : null,
            error: null,
          };
        }
        if (name === "teams") {
          const requestedEmployerId = filters.find((filter) => filter.column === "employer_id")?.value;
          return {
            data: requestedEmployerId === teamEmployerId ? { id: "team_1", employer_id: teamEmployerId } : null,
            error: null,
          };
        }
        return { data: { id: "row_1", employer_id: "employer_1" }, error: null };
      }),
      then: vi.fn((resolve) => {
        if (isDelete) deletes.push({ table: name, filters: [...filters] });
        if (updatePayload) updates.push({ table: name, payload: updatePayload, filters: [...filters] });
        return Promise.resolve({ error: null }).then(resolve);
      }),
    };

    return query;
  };

  return {
    deletes,
    rpcCalls,
    updates,
    upserts,
    client: {
      from: vi.fn(table),
      rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
        rpcCalls.push({ fn, args });
        return rpcError ? { data: null, error: rpcError } : { data: { updated_count: 1 }, error: null };
      }),
    },
  };
}

function createResignationFlowSupabaseMock(initialResignationStatus = "forwarded_to_employer") {
  const updates: Array<{ table: string; payload: Record<string, unknown>; filters: Array<{ column: string; value: unknown }> }> = [];
  const inserts: Array<{ table: string; payload: unknown }> = [];

  const table = (name: string) => {
    const filters: Array<{ column: string; value: unknown }> = [];
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, value });
        return query;
      }),
      insert: vi.fn((payload: unknown) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload, filters: [...filters] });
        return query;
      }),
      single: vi.fn(async () => {
        if (name === "resignations") {
          return {
            data: {
              id: "resignation_1",
              employee_id: "employee_1",
              employer_id: "employer_1",
              status: initialResignationStatus,
              employees: { portal_user_id: "portal_employee_1", full_name: "Employee" },
            },
            error: null,
          };
        }

        if (name === "notices") {
          return { data: { id: "notice_1" }, error: null };
        }

        return { data: { id: "row_1" }, error: null };
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

  test("document rejection keeps approved employee onboarding approved", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createDocumentReviewSupabaseMock({ onboardingStatus: "Approved" });
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
      }),
    });
    expect(supabase.upserts).not.toContainEqual({
      table: "employee_onboarding_status",
      payload: expect.objectContaining({
        status: "Needs Correction",
      }),
    });
  });

  test("admin onboarding approval allows pending mandatory documents", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createOnboardingApprovalAllowsPendingDocsSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { reviewEmployeeOnboardingAction } = await import(
      "@/lib/portal/actions/global-onboarding"
    );

    await reviewEmployeeOnboardingAction(
      form({ employee_id: "employee_1", decision: "Approved" }),
    );

    expect(supabase.updates).toContainEqual({
      table: "employees",
      payload: expect.objectContaining({
        status: "active",
        lifecycle_status: "active",
      }),
    });
    expect(supabase.upserts).toContainEqual({
      table: "employee_onboarding_status",
      payload: expect.objectContaining({
        employee_id: "employee_1",
        status: "Approved",
      }),
    });
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

describe("team management hardening", () => {
  test("bulk assignment action is not exposed to employee users", async () => {
    requirePortalRole.mockRejectedValue(new Error("Forbidden"));
    const { bulkUpdateEmployeeTeamAssignmentsAction } = await import("@/lib/portal/actions/team-management");

    await expect(
      bulkUpdateEmployeeTeamAssignmentsAction(
        form({
          employer_id: "employer_1",
          assignments: JSON.stringify([{ employee_id: "employee_1", team_id: "team_1" }]),
        }),
      ),
    ).rejects.toThrow("Forbidden");

    expect(requirePortalRole).toHaveBeenCalledWith(["super_admin", "admin", "employer_admin"]);
  });

  test("bulk assignment blocks employer users from assigning another employer employee", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createBulkTeamAssignmentsSupabaseMock({ employeeEmployerId: "employer_2" });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { bulkUpdateEmployeeTeamAssignmentsAction } = await import("@/lib/portal/actions/team-management");

    await expect(
      bulkUpdateEmployeeTeamAssignmentsAction(
        form({
          employer_id: "employer_1",
          assignments: JSON.stringify([{ employee_id: "employee_1", team_id: "team_1" }]),
        }),
      ),
    ).rejects.toThrow("Employee is outside your employer scope.");
  });

  test("bulk assignment blocks employer users from assigning to another employer team", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createBulkTeamAssignmentsSupabaseMock({ teamEmployerId: "employer_2" });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { bulkUpdateEmployeeTeamAssignmentsAction } = await import("@/lib/portal/actions/team-management");

    await expect(
      bulkUpdateEmployeeTeamAssignmentsAction(
        form({
          employer_id: "employer_1",
          assignments: JSON.stringify([{ employee_id: "employee_1", team_id: "team_1" }]),
        }),
      ),
    ).rejects.toThrow("Team is outside your employer scope.");
  });

  test("bulk assignment saves staged employee team changes through the atomic RPC", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createBulkTeamAssignmentsSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { bulkUpdateEmployeeTeamAssignmentsAction } = await import("@/lib/portal/actions/team-management");

    await bulkUpdateEmployeeTeamAssignmentsAction(
      form({
        employer_id: "employer_1",
        assignments: JSON.stringify([{ employee_id: "employee_1", team_id: "team_1" }]),
      }),
    );

    expect(supabase.rpcCalls).toContainEqual({
      fn: "bulk_update_employee_team_assignments",
      args: {
        p_employer_id: "employer_1",
        p_assignments: [{ employee_id: "employee_1", team_id: "team_1" }],
      },
    });
    expect(supabase.deletes).toEqual([]);
    expect(supabase.upserts).toEqual([]);
    expect(supabase.updates).toEqual([]);
  });

  test("bulk assignment rejects duplicate employee assignments before calling the RPC", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createBulkTeamAssignmentsSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { bulkUpdateEmployeeTeamAssignmentsAction } = await import("@/lib/portal/actions/team-management");

    await expect(
      bulkUpdateEmployeeTeamAssignmentsAction(
        form({
          employer_id: "employer_1",
          assignments: JSON.stringify([
            { employee_id: "employee_1", team_id: "team_1" },
            { employee_id: "employee_1", team_id: null },
          ]),
        }),
      ),
    ).rejects.toThrow("Each employee can only appear once");

    expect(supabase.rpcCalls).toEqual([]);
  });

  test("bulk assignment accepts null team ids for atomic unassignment", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createBulkTeamAssignmentsSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { bulkUpdateEmployeeTeamAssignmentsAction } = await import("@/lib/portal/actions/team-management");

    await bulkUpdateEmployeeTeamAssignmentsAction(
      form({
        employer_id: "employer_1",
        assignments: JSON.stringify([{ employee_id: "employee_1", team_id: null }]),
      }),
    );

    expect(supabase.rpcCalls).toContainEqual({
      fn: "bulk_update_employee_team_assignments",
      args: {
        p_employer_id: "employer_1",
        p_assignments: [{ employee_id: "employee_1", team_id: null }],
      },
    });
  });

  test("bulk assignment reports RPC failures clearly", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createBulkTeamAssignmentsSupabaseMock({ rpcError: new Error("atomic save failed") });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { bulkUpdateEmployeeTeamAssignmentsAction } = await import("@/lib/portal/actions/team-management");

    await expect(
      bulkUpdateEmployeeTeamAssignmentsAction(
        form({
          employer_id: "employer_1",
          assignments: JSON.stringify([{ employee_id: "employee_1", team_id: "team_1" }]),
        }),
      ),
    ).rejects.toThrow("atomic save failed");
  });

  test("moving an employee to a team clears their previous team memberships first", async () => {
    const activeSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createTeamManagementSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { addTeamMemberAction } = await import("@/lib/portal/actions/team-management");

    await addTeamMemberAction(
      form({ team_id: "team_new", employee_id: "employee_1", role_in_team: "Designer" }),
    );

    expect(supabase.deletes).toContainEqual({
      table: "team_members",
      filters: expect.arrayContaining([
        { column: "employee_id", value: "employee_1" },
        { column: "team_id", value: "team_new", op: "neq" },
      ]),
    });
    expect(supabase.upserts).toContainEqual({
      table: "team_members",
      payload: expect.objectContaining({
        team_id: "team_new",
        employee_id: "employee_1",
        role_in_team: "Designer",
      }),
    });
  });
});

describe("resignation workflow safeguards", () => {
  test("admin approval forwards resignation to employer instead of acknowledging it", async () => {
    const activeSession = {
      ...session,
      user: { ...session.user, status: "active" },
    };
    requirePortalRole.mockResolvedValue(activeSession);
    const supabase = createResignationFlowSupabaseMock("submitted_to_admin");
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { decideResignationAction } = await import("@/lib/portal/actions/offboarding");

    await decideResignationAction(
      form({ resignation_id: "resignation_1", decision: "approved", admin_notes: "Forward to employer." }),
    );

    expect(supabase.updates).toContainEqual({
      table: "resignations",
      payload: expect.objectContaining({
        status: "forwarded_to_employer",
        admin_notes: "Forward to employer.",
        forwarded_at: expect.any(String),
      }),
      filters: [],
    });
  });

  test("employer acceptance calculates last working day and sends the employee notice", async () => {
    const employerSession = {
      ...session,
      user: {
        ...session.user,
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      },
    };
    requirePortalRole.mockResolvedValue(employerSession);
    const supabase = createResignationFlowSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { employerAcceptResignationAction } = await import("@/lib/portal/actions/offboarding");

    await employerAcceptResignationAction(
      form({ resignation_id: "resignation_1", notice_period_days: "30", employer_notes: "Accepted." }),
    );

    expect(supabase.updates).toContainEqual({
      table: "resignations",
      payload: expect.objectContaining({
        status: "employer_acknowledged",
        notice_period_days: 30,
        calculated_last_working_day: expect.any(String),
        employer_notes: "Accepted.",
      }),
      filters: [],
    });
    expect(supabase.inserts).toContainEqual({
      table: "notices",
      payload: expect.objectContaining({
        title: "Resignation accepted",
        body: expect.stringContaining("last working day"),
        action_url: "/dashboard/employee/leaves",
      }),
    });
    expect(supabase.inserts).toContainEqual({
      table: "notice_recipients",
      payload: expect.objectContaining({
        notice_id: "notice_1",
        recipient_user_id: "portal_employee_1",
      }),
    });
  });
});
