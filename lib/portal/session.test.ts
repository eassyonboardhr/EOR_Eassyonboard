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

function createSessionSupabaseMock() {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (name === "employers") {
          return {
            data: {
              id: "employer_1",
              name: "Acme India",
              contact_email: "invitee@example.com",
              status: "active",
            },
            error: null,
          };
        }

        return { data: null, error: null };
      }),
      single: vi.fn(async () => ({
        data: {
          id: "portal_user_1",
          clerk_user_id: "clerk_invitee",
          email: "invitee@example.com",
          full_name: "Invitee",
          role: "employer_admin",
          status: "active",
          employer_id: "employer_1",
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
});
