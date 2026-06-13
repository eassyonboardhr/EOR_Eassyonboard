import { beforeEach, describe, expect, test, vi } from "vitest";

const requirePortalRole = vi.fn();
const getSupabaseAdmin = vi.fn();
const revalidatePath = vi.fn();
const writeAudit = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/portal/session", () => ({
  requirePortalRole,
  isPlatformAdmin: (role: string) => role === "super_admin" || role === "admin",
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/portal/actions/audit", () => ({ writeAudit }));

const employeeSession = {
  clerkUserId: "clerk_employee",
  email: "employee@example.com",
  user: {
    id: "portal_employee_1",
    clerk_user_id: "clerk_employee",
    email: "employee@example.com",
    full_name: "Employee",
    role: "employee",
    status: "active",
    employer_id: "employer_1",
  },
};

function createSupabaseMock() {
  const upserts: Array<{ table: string; payload: unknown }> = [];

  const table = (name: string) => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (name === "employee_onboarding_status") return { data: { status: "Draft" }, error: null };
        if (name === "employee_onboarding_progress") return { data: { completed_steps: [] }, error: null };
        return { data: null, error: null };
      }),
      single: vi.fn(async () => {
        if (name === "employees") {
          return { data: { id: "employee_1", email: "employee@example.com", employer_id: "employer_1" }, error: null };
        }
        return { data: { id: `${name}_1` }, error: null };
      }),
      upsert: vi.fn((payload: unknown) => {
        upserts.push({ table: name, payload });
        return query;
      }),
    };
    return query;
  };

  return {
    upserts,
    client: { from: vi.fn(table) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  requirePortalRole.mockResolvedValue(employeeSession);
});

describe("onboarding document skip", () => {
  test("saves employee Documents step as skipped without uploaded documents", async () => {
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { saveEmployeeOnboardingStepAction } = await import("@/lib/portal/actions/global-onboarding");

    const formData = new FormData();
    formData.set("current_step", "Documents");
    formData.set("skip_documents", "1");

    await saveEmployeeOnboardingStepAction(formData);

    expect(supabase.upserts).toContainEqual({
      table: "employee_onboarding_progress",
      payload: expect.objectContaining({
        employee_id: "employee_1",
        current_step: "Documents",
        completed_steps: ["Documents"],
      }),
    });
    expect(writeAudit).toHaveBeenCalledWith(
      employeeSession.user,
      "skip_employee_onboarding_documents",
      "employee",
      "employee_1",
      expect.objectContaining({ source: "employee_self_onboarding" }),
    );
  });
});
