import { describe, expect, test, vi } from "vitest";
import { resolveMessageRecipient } from "@/lib/portal/messages";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));

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

function createMessageScopeMock(recipientEmployerId: string | null) {
  const table = (name: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (name === "employees") {
          return { data: { employer_id: "employer_1" }, error: null };
        }
        if (name === "portal_users") {
          return {
            data: {
              id: "portal_employer",
              role: "employer_admin",
              employer_id: recipientEmployerId,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    };
    return query;
  };

  return { from: vi.fn(table) };
}

describe("resolveMessageRecipient", () => {
  test("allows an employee to message their linked employer admin when portal user has no employer_id", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createMessageScopeMock("employer_1"));

    await expect(resolveMessageRecipient(employeeSession, "user:portal_employer")).resolves.toEqual({
      recipientIds: ["portal_employer"],
      employerId: "employer_1",
      employeeId: null,
    });
  });

  test("rejects an employee messaging another employer admin", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createMessageScopeMock("employer_2"));

    await expect(resolveMessageRecipient(employeeSession, "user:portal_employer")).rejects.toThrow("You cannot message that recipient.");
  });
});
