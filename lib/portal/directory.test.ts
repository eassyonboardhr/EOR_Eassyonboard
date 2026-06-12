import { describe, expect, test, vi } from "vitest";

import { getEmployeeDirectoryData } from "@/lib/portal/directory";
import type { PortalSession } from "@/lib/portal/types";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));

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
} as PortalSession;

describe("getEmployeeDirectoryData", () => {
  test("uses an explicit team relationship to avoid ambiguous PostgREST embeds", async () => {
    const select = vi.fn();
    const query = {
      select,
      order: vi.fn(() => query),
      eq: vi.fn(() => query),
      then: (resolve: (value: { data: unknown[]; error: null }) => void) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    select.mockReturnValue(query);
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn(() => query) });

    await getEmployeeDirectoryData(adminSession);

    expect(select).toHaveBeenCalledWith(expect.stringContaining("teams!employees_team_id_fkey(id, name)"));
  });
});
