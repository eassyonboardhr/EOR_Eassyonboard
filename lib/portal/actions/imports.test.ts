import { beforeEach, describe, expect, test, vi } from "vitest";
/* eslint-disable @typescript-eslint/no-explicit-any */

const requirePortalRole = vi.fn();
const getSupabaseAdmin = vi.fn();
const revalidatePath = vi.fn();
const writeAudit = vi.fn();
const createInvitation = vi.fn();
const clerkClient = vi.fn();
const headers = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient }));
vi.mock("@/lib/portal/session", () => ({
  requirePortalRole,
  isPlatformAdmin: (role: string) => role === "super_admin" || role === "admin",
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/portal/actions/audit", () => ({ writeAudit }));

const adminSession = {
  clerkUserId: "clerk_admin",
  email: "admin@example.com",
  user: {
    id: "user_admin",
    clerk_user_id: "clerk_admin",
    email: "admin@example.com",
    full_name: "Admin",
    role: "admin",
    status: "active",
    employer_id: null,
  },
};

function form(values: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, item);
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

function createImportSupabaseMock() {
  const inserts: Array<{ table: string; payload: any }> = [];
  const updates: Array<{ table: string; payload: any; filters: Array<[string, unknown]> }> = [];
  const upserts: Array<{ table: string; payload: any; options?: any }> = [];

  const data: Record<string, any[]> = {
    finance_company_mappings: [
      {
        id: "company_map_1",
        source_key: "invoice_generator",
        external_company_id: "company_ext_1",
        external_company_name: "Acme",
        employer_id: null,
      },
    ],
    finance_employee_mappings: [
      {
        id: "employee_map_1",
        source_key: "invoice_generator",
        external_employee_id: "employee_ext_1",
        external_company_id: "company_ext_1",
        external_employee_name: "Riya Rao",
        external_employee_email: "riya@example.com",
        employer_id: null,
        employee_id: null,
      },
      {
        id: "employee_map_2",
        source_key: "invoice_generator",
        external_employee_id: "employee_ext_2",
        external_company_id: "company_ext_1",
        external_employee_name: "No Email",
        external_employee_email: null,
        employer_id: null,
        employee_id: null,
      },
    ],
    finance_invoices: [{ id: "invoice_1", external_invoice_id: "invoice_ext_1", external_company_id: "company_ext_1" }],
    finance_invoice_payments: [],
    finance_invoice_line_items: [],
    finance_employee_salary_payments: [],
    finance_employee_statement_rows: [],
    finance_employee_statement_summaries: [],
    employers: [],
    employees: [],
    employee_onboarding_status: [],
    employee_onboarding_progress: [],
    audit_events: [],
  };

  const table = (name: string) => {
    const filters: Array<[string, unknown]> = [];
    let insertPayload: any;
    let updatePayload: any;
    let upsertPayload: any;
    let upsertOptions: any;

    const matches = (row: any) => filters.every(([column, value]) => row[column] === value);
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push([column, value]);
        return query;
      }),
      is: vi.fn(() => query),
      in: vi.fn(() => query),
      update: vi.fn((payload: any) => {
        updatePayload = payload;
        updates.push({ table: name, payload, filters });
        return query;
      }),
      insert: vi.fn((payload: any) => {
        insertPayload = payload;
        inserts.push({ table: name, payload });
        if (name === "employers") data.employers.push({ ...payload, id: "employer_new_1" });
        if (name === "employees") data.employees.push({ ...payload, id: "employee_new_1" });
        return query;
      }),
      upsert: vi.fn((payload: any, options?: any) => {
        upsertPayload = payload;
        upsertOptions = options;
        upserts.push({ table: name, payload, options });
        return query;
      }),
      single: vi.fn(async () => {
        if (insertPayload) {
          if (name === "employers") return { data: { id: "employer_new_1" }, error: null };
          if (name === "employees") return { data: { id: "employee_new_1" }, error: null };
          return { data: { id: `${name}_new_1` }, error: null };
        }
        if (upsertPayload || upsertOptions) return { data: upsertPayload, error: null };
        if (updatePayload) return { data: updatePayload, error: null };
        return { data: (data[name] ?? []).find(matches) ?? null, error: null };
      }),
      maybeSingle: vi.fn(async () => ({ data: (data[name] ?? []).find(matches) ?? null, error: null })),
      order: vi.fn(() => {
        const rows = (data[name] ?? []).filter(matches);
        return Promise.resolve({ data: rows, error: null });
      }),
      then: vi.fn((resolve) => {
        const rows = (data[name] ?? []).filter(matches);
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      }),
    };
    return query;
  };

  return {
    data,
    inserts,
    updates,
    upserts,
    client: { from: vi.fn(table) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  requirePortalRole.mockResolvedValue(adminSession);
  clerkClient.mockResolvedValue({ invitations: { createInvitation } });
  createInvitation.mockResolvedValue({ id: "invite_1" });
  headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
});

describe("invoice generator import actions", () => {
  test("creates a pending employer from a staged company and maps invoices", async () => {
    const supabase = createImportSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { importInvoiceGeneratorCompanyAction } = await import("@/lib/portal/actions/imports");

    const result = await importInvoiceGeneratorCompanyAction(form({
      source_key: "invoice_generator",
      external_company_id: "company_ext_1",
      employer_mode: "create",
      employer_admin_email: "owner@acme.test",
      selected_external_employee_id: [],
    }));

    expect(result.employerId).toBe("employer_new_1");
    expect(supabase.inserts).toContainEqual(expect.objectContaining({
      table: "employers",
      payload: expect.objectContaining({ name: "Acme", contact_email: "owner@acme.test", status: "pending" }),
    }));
    expect(supabase.updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "finance_company_mappings", payload: expect.objectContaining({ employer_id: "employer_new_1" }) }),
      expect.objectContaining({ table: "finance_invoices", payload: expect.objectContaining({ employer_id: "employer_new_1", sync_status: "synced" }) }),
    ]));
    expect(createInvitation).toHaveBeenCalledWith(expect.objectContaining({
      emailAddress: "owner@acme.test",
      publicMetadata: expect.objectContaining({ portalRole: "employer_admin", employerId: "employer_new_1", source: "invoice_generator_import" }),
    }));
  });

  test("links a staged company to an existing employer without creating another employer", async () => {
    const supabase = createImportSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { importInvoiceGeneratorCompanyAction } = await import("@/lib/portal/actions/imports");

    const result = await importInvoiceGeneratorCompanyAction(form({
      source_key: "invoice_generator",
      external_company_id: "company_ext_1",
      employer_mode: "link",
      existing_employer_id: "employer_existing_1",
      selected_external_employee_id: [],
    }));

    expect(result.linkedEmployer).toBe(true);
    expect(supabase.inserts.filter((insert) => insert.table === "employers")).toEqual([]);
    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "finance_company_mappings",
      payload: expect.objectContaining({ employer_id: "employer_existing_1" }),
    }));
  });

  test("creates pending onboarding employees and maps finance rows", async () => {
    const supabase = createImportSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { importInvoiceGeneratorCompanyAction } = await import("@/lib/portal/actions/imports");

    const result = await importInvoiceGeneratorCompanyAction(form({
      source_key: "invoice_generator",
      external_company_id: "company_ext_1",
      employer_mode: "link",
      existing_employer_id: "employer_existing_1",
      selected_external_employee_id: ["employee_ext_1"],
    }));

    expect(result.createdEmployees).toBe(1);
    expect(result.invitedEmployees).toBe(1);
    expect(supabase.inserts).toContainEqual(expect.objectContaining({
      table: "employees",
      payload: expect.objectContaining({
        employer_id: "employer_existing_1",
        email: "riya@example.com",
        status: "pending",
        lifecycle_status: "onboarding",
      }),
    }));
    expect(supabase.upserts).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "employee_onboarding_status", payload: expect.objectContaining({ employee_id: "employee_new_1", status: "Draft" }) }),
      expect.objectContaining({ table: "employee_onboarding_progress", payload: expect.objectContaining({ employee_id: "employee_new_1", current_step: "Personal" }) }),
    ]));
    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "finance_employee_mappings",
      payload: expect.objectContaining({ employee_id: "employee_new_1", employer_id: "employer_existing_1" }),
    }));
  });

  test("skips selected employees with missing email and reports them", async () => {
    const supabase = createImportSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { importInvoiceGeneratorCompanyAction } = await import("@/lib/portal/actions/imports");

    const result = await importInvoiceGeneratorCompanyAction(form({
      source_key: "invoice_generator",
      external_company_id: "company_ext_1",
      employer_mode: "link",
      existing_employer_id: "employer_existing_1",
      selected_external_employee_id: ["employee_ext_2"],
    }));

    expect(result.skippedEmployees).toEqual([
      expect.objectContaining({ externalEmployeeId: "employee_ext_2", reason: "Missing employee email." }),
    ]);
    expect(supabase.inserts.filter((insert) => insert.table === "employees")).toEqual([]);
  });

  test("rejects non-admin import attempts", async () => {
    requirePortalRole.mockResolvedValue({ ...adminSession, user: { ...adminSession.user, role: "employer_admin" } });
    const supabase = createImportSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase.client);
    const { importInvoiceGeneratorCompanyAction } = await import("@/lib/portal/actions/imports");

    await expect(importInvoiceGeneratorCompanyAction(form({
      source_key: "invoice_generator",
      external_company_id: "company_ext_1",
      employer_mode: "link",
      existing_employer_id: "employer_existing_1",
    }))).rejects.toThrow("Admin access is required.");
  });
});
