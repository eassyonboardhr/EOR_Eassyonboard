import { beforeEach, describe, expect, test, vi } from "vitest";
/* eslint-disable @typescript-eslint/no-explicit-any */

const getSupabaseAdmin = vi.fn();
const getUnreadMessageCount = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/portal/messages", () => ({ getUnreadMessageCount }));

type FilterCall = { table: string; method: "eq" | "is" | "in"; column: string; value: unknown };

const adminSession = {
  clerkUserId: "clerk_admin",
  email: "admin@example.com",
  user: {
    id: "portal_admin",
    clerk_user_id: "clerk_admin",
    email: "admin@example.com",
    full_name: "Admin",
    role: "admin",
    status: "active",
    employer_id: null,
  },
} as const;

const employerSession = {
  ...adminSession,
  user: {
    ...adminSession.user,
    id: "portal_employer",
    role: "employer_admin",
    employer_id: "employer_1",
  },
} as const;

const employeeSession = {
  ...adminSession,
  user: {
    ...adminSession.user,
    id: "portal_employee",
    role: "employee",
    employer_id: null,
  },
} as const;

function createSupabaseMock({
  noticeRecipients = [],
  countByTable = {},
  employee = { id: "employee_1" },
  employeeExperience = { is_fresher: true },
  employeeDocuments = [],
}: {
  noticeRecipients?: any[];
  countByTable?: Record<string, number>;
  employee?: { id: string } | null;
  employeeExperience?: { is_fresher: boolean } | null;
  employeeDocuments?: any[];
} = {}) {
  const filters: FilterCall[] = [];
  const selects: Array<{ table: string; columns: string; options?: unknown }> = [];

  const table = (name: string) => {
    const query: any = {
      select: vi.fn((columns: string, options?: unknown) => {
        selects.push({ table: name, columns, options });
        return query;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ table: name, method: "eq", column, value });
        return query;
      }),
      is: vi.fn((column: string, value: unknown) => {
        filters.push({ table: name, method: "is", column, value });
        return query;
      }),
      in: vi.fn((column: string, value: unknown) => {
        filters.push({ table: name, method: "in", column, value });
        return query;
      }),
      maybeSingle: vi.fn(async () => {
        if (name === "employees") return { data: employee, error: null };
        if (name === "employee_experience") return { data: employeeExperience, error: null };
        return { data: null, error: null };
      }),
      then: vi.fn((resolve) => {
        if (name === "notice_recipients") {
          return Promise.resolve({ data: noticeRecipients, error: null }).then(resolve);
        }
        if (name === "employee_documents" && filters.some((filter) => filter.table === "employee_documents" && filter.column === "employee_id")) {
          return Promise.resolve({ data: employeeDocuments, error: null }).then(resolve);
        }
        return Promise.resolve({ count: countByTable[name] ?? 0, data: [], error: null }).then(resolve);
      }),
    };

    return query;
  };

  return {
    filters,
    selects,
    client: {
      from: vi.fn(table),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  getUnreadMessageCount.mockResolvedValue(7);
});

describe("portal notification counts", () => {
  test("returns every notification count key with future modules defaulting to zero", async () => {
    getSupabaseAdmin.mockReturnValue(createSupabaseMock().client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    const counts = await getPortalNotificationCounts(adminSession as any);

    expect(Object.keys(counts).sort()).toEqual([
      "documents",
      "employees",
      "employers",
      "finances",
      "leaves",
      "messages",
      "notices",
      "offboarding",
      "onboarding",
      "resignations",
    ]);
    expect(counts).toMatchObject({
      messages: 7,
      onboarding: 0,
      resignations: 0,
      offboarding: 0,
      finances: 0,
      employers: 0,
      employees: 0,
    });
  });

  test("delegates unread message thread count to the existing message loader", async () => {
    getSupabaseAdmin.mockReturnValue(createSupabaseMock().client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    const counts = await getPortalNotificationCounts(employerSession as any);

    expect(getUnreadMessageCount).toHaveBeenCalledWith(employerSession);
    expect(counts.messages).toBe(7);
  });

  test("counts notice recipients that are unread or require acknowledgement once", async () => {
    getSupabaseAdmin.mockReturnValue(createSupabaseMock({
      noticeRecipients: [
        { id: "unread", read_at: null, acknowledged_at: null, notices: { requires_acknowledgement: false } },
        { id: "ack", read_at: "2026-06-01", acknowledged_at: null, notices: { requires_acknowledgement: true } },
        { id: "both", read_at: null, acknowledged_at: null, notices: { requires_acknowledgement: true } },
        { id: "done", read_at: "2026-06-01", acknowledged_at: "2026-06-02", notices: { requires_acknowledgement: true } },
        { id: "read", read_at: "2026-06-01", acknowledged_at: null, notices: { requires_acknowledgement: false } },
      ],
    }).client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    const counts = await getPortalNotificationCounts(employeeSession as any);

    expect(counts.notices).toBe(3);
  });

  test("scopes leave counts by role", async () => {
    const adminSupabase = createSupabaseMock({ countByTable: { leave_requests: 12 } });
    getSupabaseAdmin.mockReturnValue(adminSupabase.client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    await expect(getPortalNotificationCounts(adminSession as any)).resolves.toMatchObject({ leaves: 12 });
    expect(adminSupabase.filters).toContainEqual({ table: "leave_requests", method: "eq", column: "status", value: "pending" });
    expect(adminSupabase.filters).not.toContainEqual({ table: "leave_requests", method: "eq", column: "employer_id", value: "employer_1" });

    const employerSupabase = createSupabaseMock({ countByTable: { leave_requests: 4 } });
    getSupabaseAdmin.mockReturnValue(employerSupabase.client);
    await expect(getPortalNotificationCounts(employerSession as any)).resolves.toMatchObject({ leaves: 4 });
    expect(employerSupabase.filters).toContainEqual({ table: "leave_requests", method: "eq", column: "employer_id", value: "employer_1" });

    const employeeSupabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(employeeSupabase.client);
    await expect(getPortalNotificationCounts(employeeSession as any)).resolves.toMatchObject({ leaves: 0 });
    expect(employeeSupabase.filters).not.toContainEqual({ table: "leave_requests", method: "eq", column: "status", value: "pending" });
  });

  test("scopes document review counts for admin and employer users", async () => {
    const adminSupabase = createSupabaseMock({ countByTable: { employee_documents: 9 } });
    getSupabaseAdmin.mockReturnValue(adminSupabase.client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    await expect(getPortalNotificationCounts(adminSession as any)).resolves.toMatchObject({ documents: 9 });
    expect(adminSupabase.filters).toContainEqual({ table: "employee_documents", method: "eq", column: "verification_status", value: "Pending" });
    expect(adminSupabase.filters).not.toContainEqual({ table: "employee_documents", method: "eq", column: "employees.employer_id", value: "employer_1" });

    const employerSupabase = createSupabaseMock({ countByTable: { employee_documents: 3 } });
    getSupabaseAdmin.mockReturnValue(employerSupabase.client);
    await expect(getPortalNotificationCounts(employerSession as any)).resolves.toMatchObject({ documents: 3 });
    expect(employerSupabase.filters).toContainEqual({ table: "employee_documents", method: "eq", column: "employees.employer_id", value: "employer_1" });
  });

  test("counts employee missing and rejected required documents without signed URLs", async () => {
    const supabase = createSupabaseMock({
      employeeDocuments: [
        { id: "aadhaar", document_type: "aadhaar_card", verification_status: "Approved", uploaded_at: "2026-01-01" },
        { id: "pan", document_type: "pan_card", verification_status: "Rejected", uploaded_at: "2026-01-02" },
        { id: "degree", document_type: "degree_certificate", verification_status: "Pending", uploaded_at: "2026-01-03" },
      ],
    });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    const counts = await getPortalNotificationCounts(employeeSession as any);

    expect(counts.documents).toBe(4);
    expect(supabase.client.from).not.toHaveBeenCalledWith("storage");
    expect(supabase.filters).toContainEqual({ table: "employees", method: "eq", column: "portal_user_id", value: "portal_employee" });
    expect(supabase.filters).toContainEqual({ table: "employee_documents", method: "eq", column: "employee_id", value: "employee_1" });
  });

  test("implements role-scoped extended admin action counts and keeps finances zero", async () => {
    const supabase = createSupabaseMock({
      countByTable: {
        employee_onboarding_status: 2,
        resignations: 3,
        offboarding_cases: 4,
        employer_leads: 5,
        employee_requests: 6,
      },
    });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    const counts = await getPortalNotificationCounts(adminSession as any);

    expect(counts).toMatchObject({
      onboarding: 2,
      resignations: 3,
      offboarding: 4,
      employers: 5,
      employees: 6,
      finances: 0,
    });
    expect(supabase.filters).toContainEqual({
      table: "employee_onboarding_status",
      method: "in",
      column: "status",
      value: ["Submitted", "Pending Review", "Needs Correction"],
    });
    expect(supabase.filters).toContainEqual({
      table: "resignations",
      method: "in",
      column: "status",
      value: ["submitted_to_admin"],
    });
    expect(supabase.filters).toContainEqual({
      table: "offboarding_cases",
      method: "in",
      column: "status",
      value: ["requested_by_employer", "admin_approved", "in_progress"],
    });
    expect(supabase.filters).toContainEqual({ table: "employer_leads", method: "eq", column: "status", value: "pending" });
    expect(supabase.filters).toContainEqual({ table: "employee_requests", method: "eq", column: "status", value: "pending" });
  });

  test("scopes extended employer counts to the current employer and hides admin-only counts", async () => {
    const supabase = createSupabaseMock({
      countByTable: {
        employee_requests: 2,
        resignations: 3,
        offboarding_cases: 4,
      },
    });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    const counts = await getPortalNotificationCounts(employerSession as any);

    expect(counts).toMatchObject({
      onboarding: 2,
      resignations: 3,
      offboarding: 4,
      employers: 0,
      employees: 2,
      finances: 0,
    });
    expect(supabase.filters).toContainEqual({ table: "employee_requests", method: "eq", column: "employer_id", value: "employer_1" });
    expect(supabase.filters).toContainEqual({ table: "resignations", method: "eq", column: "employer_id", value: "employer_1" });
    expect(supabase.filters).toContainEqual({ table: "offboarding_cases", method: "eq", column: "employer_id", value: "employer_1" });
    expect(supabase.client.from).not.toHaveBeenCalledWith("employer_leads");
  });

  test("keeps employee lifecycle extended counts hidden unless there is safe self action state", async () => {
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { getPortalNotificationCounts } = await import("@/lib/portal/notification-counts");

    const counts = await getPortalNotificationCounts(employeeSession as any);

    expect(counts).toMatchObject({
      leaves: 0,
      onboarding: 0,
      resignations: 0,
      offboarding: 0,
      employers: 0,
      employees: 0,
      finances: 0,
    });
    expect(supabase.client.from).not.toHaveBeenCalledWith("resignations");
    expect(supabase.client.from).not.toHaveBeenCalledWith("offboarding_cases");
    expect(supabase.client.from).not.toHaveBeenCalledWith("employer_leads");
  });
});
