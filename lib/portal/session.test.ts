import { beforeEach, describe, expect, test, vi } from "vitest";

const auth = vi.fn();
const currentUser = vi.fn();
const getSupabaseAdmin = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({ auth, currentUser }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

function createSessionSupabaseMock({
  invitedEmployee = null as { id: string; employer_id: string } | null,
  activeEmployer = {
    id: "employer_1",
    name: "Acme India",
    contact_email: "invitee@example.com",
    status: "active",
  } as { id: string; name: string; contact_email: string; status: string } | null,
} = {}) {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (name === "employees") {
          return { data: invitedEmployee, error: null };
        }

        if (name === "employers") {
          return {
            data: activeEmployer,
            error: null,
          };
        }

        return { data: null, error: null };
      }),
      single: vi.fn(async () => ({
        data: inserts.at(-1)?.table === name ? {
          id: "portal_user_1",
          clerk_user_id: "clerk_invitee",
          email: String(inserts.at(-1)?.payload.email ?? "invitee@example.com"),
          full_name: "Invitee",
          role: inserts.at(-1)?.payload.role,
          status: inserts.at(-1)?.payload.status,
          employer_id: inserts.at(-1)?.payload.employer_id ?? null,
        } : {
          id: "portal_user_1",
          clerk_user_id: "clerk_invitee",
          email: "invitee@example.com",
          full_name: "Invitee",
          role: invitedEmployee ? "employee" : "employer_admin",
          status: "active",
          employer_id: invitedEmployee ? null : "employer_1",
        },
        error: null,
      })),
      insert: vi.fn((payload: Record<string, unknown>) => {
        inserts.push({ table: name, payload });
        return query;
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table: name, payload });
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

beforeEach(() => {
  auth.mockResolvedValue({ userId: "clerk_invitee" });
  currentUser.mockResolvedValue({
    fullName: "Invitee",
    firstName: "Invitee",
    lastName: null,
    publicMetadata: {},
    primaryEmailAddress: {
      emailAddress: "invitee@example.com",
    },
  });
});

describe("portal session employer invitation bootstrap", () => {
  test("links a first-login user to an active employer with matching contact email", async () => {
    const supabase = createSessionSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { getPortalSession } = await import("@/lib/portal/session");

    const session = await getPortalSession();

    expect(session.user.role).toBe("employer_admin");
    expect(session.user.status).toBe("active");
    expect(session.user.employer_id).toBe("employer_1");
    expect(supabase.inserts).toContainEqual({
      table: "portal_users",
      payload: expect.objectContaining({
        role: "employer_admin",
        status: "active",
        employer_id: "employer_1",
      }),
    });
  });

  test("marks employee invite accepted and onboarding started on first linked login", async () => {
    const supabase = createSessionSupabaseMock({
      invitedEmployee: { id: "employee_1", employer_id: "employer_1" },
    });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { getPortalSession } = await import("@/lib/portal/session");

    const session = await getPortalSession();

    expect(session.user.role).toBe("employee");
    expect(supabase.updates).toContainEqual({
      table: "employees",
      payload: expect.objectContaining({
        portal_user_id: "portal_user_1",
        status: "active",
      }),
    });
    expect(supabase.updates).toContainEqual({
      table: "employee_requests",
      payload: expect.objectContaining({
        invite_accepted_at: expect.any(String),
        onboarding_started_at: expect.any(String),
      }),
    });
  });

  test("links imported pending employer invite from Clerk metadata", async () => {
    currentUser.mockResolvedValue({
      fullName: "Imported Admin",
      firstName: "Imported",
      lastName: "Admin",
      publicMetadata: {
        portalRole: "employer_admin",
        employerId: "employer_imported_1",
        source: "invoice_generator_import",
      },
      primaryEmailAddress: {
        emailAddress: "imported@example.com",
      },
    });
    const supabase = createSessionSupabaseMock({ activeEmployer: null });
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { getPortalSession } = await import("@/lib/portal/session");

    const session = await getPortalSession();

    expect(session.user.role).toBe("employer_admin");
    expect(session.user.status).toBe("active");
    expect(session.user.employer_id).toBe("employer_imported_1");
    expect(supabase.inserts).toContainEqual({
      table: "portal_users",
      payload: expect.objectContaining({
        email: "imported@example.com",
        role: "employer_admin",
        status: "active",
        employer_id: "employer_imported_1",
      }),
    });
  });
});
