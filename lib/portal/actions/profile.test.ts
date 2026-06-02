import { beforeEach, describe, expect, test, vi } from "vitest";
import { reviewProfileChangeRequestAction, updateProfileAction } from "@/lib/portal/actions/profile";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requirePortalRole: vi.fn(),
  getPortalSession: vi.fn(),
  revalidatePath: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  writeAudit: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/portal/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/portal/session")>("@/lib/portal/session");
  return {
    ...actual,
    getPortalSession: mocks.getPortalSession,
    requirePortalRole: mocks.requirePortalRole,
  };
});
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));
vi.mock("@/lib/portal/actions/audit", () => ({ writeAudit: mocks.writeAudit }));

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

function createProfileApprovalMock(request: Record<string, unknown>) {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const upserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; payload: unknown }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload });
        return query;
      }),
      upsert: vi.fn((payload: Record<string, unknown>) => {
        upserts.push({ table: name, payload });
        return query;
      }),
      insert: vi.fn((payload: unknown) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      maybeSingle: vi.fn(async () => {
        if (name === "employee_identity_details") {
          return { data: { aadhaar_number: "old-aadhaar", pan_number: "old-pan", passport_number: "P1" }, error: null };
        }
        if (name === "employee_bank_details") {
          return { data: { account_holder_name: "Old Name", account_number: "111", ifsc_code: "OLDIFSC", bank_name: "Old Bank", branch_name: "Main" }, error: null };
        }
        if (name === "client_companies") {
          return { data: { id: "company_1" }, error: null };
        }
        return { data: null, error: null };
      }),
      single: vi.fn(async () => {
        if (name === "profile_change_requests") return { data: request, error: null };
        if (name === "notices") return { data: { id: "notice_1" }, error: null };
        return { data: { id: `${name}_1` }, error: null };
      }),
    };
    return query;
  };

  return {
    updates,
    upserts,
    inserts,
    client: { from: vi.fn(table) },
  };
}

function createEmployeeUpdateMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      upsert: vi.fn(() => query),
      insert: vi.fn((payload: unknown) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      single: vi.fn(async () => {
        if (name === "employees") return { data: { id: "employee_1", employer_id: "employer_1" }, error: null };
        if (name === "notices") return { data: { id: "notice_1" }, error: null };
        return { data: { id: `${name}_1` }, error: null };
      }),
      then: name === "portal_users"
        ? vi.fn((resolve) => Promise.resolve({ data: [{ id: "admin_1" }], error: null }).then(resolve))
        : undefined,
    };
    return query;
  };

  return {
    inserts,
    client: { from: vi.fn(table) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePortalRole.mockResolvedValue({
    clerkUserId: "clerk_admin",
    email: "admin@example.com",
    user: { id: "admin_1", role: "admin", status: "active", employer_id: null },
  });
  mocks.getPortalSession.mockResolvedValue({
    clerkUserId: "clerk_employee",
    email: "employee@example.com",
    user: { id: "portal_employee", role: "employee", status: "active", employer_id: null },
  });
});

describe("profile actions", () => {
  test("employee sensitive update includes account holder name in the review payload", async () => {
    const supabase = createEmployeeUpdateMock();
    mocks.getSupabaseAdmin.mockReturnValue(supabase.client);

    await updateProfileAction(form({
      full_name: "Employee One",
      account_holder_name: "Employee One",
      account_number: "222",
      ifsc_code: "NEWIFSC",
      bank_name: "New Bank",
    }));

    const profileRequest = supabase.inserts.find((row) => row.table === "profile_change_requests");
    expect(profileRequest?.payload).toMatchObject({
      target_type: "employee",
      target_id: "employee_1",
      requested_by: "portal_employee",
      payload: expect.objectContaining({ account_holder_name: "Employee One" }),
    });
  });

  test("employee profile approval preserves existing bank fields when only one field changes", async () => {
    const supabase = createProfileApprovalMock({
      id: "request_1",
      target_type: "employee",
      target_id: "employee_1",
      requested_by: "portal_employee",
      status: "pending",
      payload: { account_number: "222" },
    });
    mocks.getSupabaseAdmin.mockReturnValue(supabase.client);

    await reviewProfileChangeRequestAction(form({ request_id: "request_1", decision: "approved" }));

    expect(supabase.upserts.find((row) => row.table === "employee_bank_details")?.payload).toMatchObject({
      employee_id: "employee_1",
      account_holder_name: "Old Name",
      account_number: "222",
      ifsc_code: "OLDIFSC",
      bank_name: "Old Bank",
    });
  });

  test("employer profile approval applies company registration and billing settings", async () => {
    const supabase = createProfileApprovalMock({
      id: "request_1",
      target_type: "employer",
      target_id: "employer_1",
      requested_by: "portal_employer",
      status: "pending",
      payload: {
        company_name: "New Company",
        contact_name: "New Contact",
        contact_email: "contact@example.com",
        registration_number: "REG-2",
        billing_currency: "GBP",
        payment_terms: "Net 45",
      },
    });
    mocks.getSupabaseAdmin.mockReturnValue(supabase.client);

    await reviewProfileChangeRequestAction(form({ request_id: "request_1", decision: "approved" }));

    expect(supabase.updates.find((row) => row.table === "employers")?.payload).toMatchObject({
      name: "New Company",
      contact_name: "New Contact",
      contact_email: "contact@example.com",
    });
    expect(supabase.updates.find((row) => row.table === "client_companies")?.payload).toMatchObject({
      company_name: "New Company",
      registration_number: "REG-2",
    });
    expect(supabase.updates.find((row) => row.table === "client_billing_settings")?.payload).toMatchObject({
      currency: "GBP",
      payment_terms: "Net 45",
    });
  });
});
