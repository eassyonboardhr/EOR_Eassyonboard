import { describe, expect, test, vi } from "vitest";

const getSupabaseAdmin = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));

describe("document access helpers", () => {
  test("uses the latest uploaded document for mandatory checklist status", async () => {
    const { buildEmployeeDocumentChecklist } = await import("@/lib/portal/document-access");

    const checklist = buildEmployeeDocumentChecklist(
      [
        {
          id: "doc_new_rejected",
          document_type: "passport_photo",
          file_path: "employee/passport-new.png",
          verification_status: "Rejected",
          uploaded_at: "2026-06-01T10:00:00Z",
        },
        {
          id: "doc_old_approved",
          document_type: "passport_photo",
          file_path: "employee/passport-old.png",
          verification_status: "Approved",
          uploaded_at: "2026-05-31T10:00:00Z",
        },
      ],
      true,
    );

    expect(checklist.find((item) => item.document_type === "passport_photo")).toMatchObject({
      status: "Rejected",
      approved: false,
      document_id: "doc_new_rejected",
    });
  });

  test("does not sign employee documents outside the current employee scope", async () => {
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "signed" }, error: null }));
    getSupabaseAdmin.mockReturnValue({
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: "employee_self" }, error: null })),
          })),
        })),
      })),
    });
    const { withScopedEmployeeDocumentUrls } = await import("@/lib/portal/document-access");

    const rows = await withScopedEmployeeDocumentUrls(
      [{ id: "doc_1", employee_id: "employee_other", file_path: "other/pan.pdf" }],
      {
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
      },
    );

    expect(rows[0].signed_url).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
