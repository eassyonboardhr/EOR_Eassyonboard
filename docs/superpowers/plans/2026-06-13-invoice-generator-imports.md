# Invoice Generator Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated admin Imports workflow that converts staged Invoice Generator companies/employees into pending portal onboarding records, maps historical finance data, and lets employer/employee onboarding users skip document uploads for now.

**Architecture:** Keep Invoice Generator sync as ingestion-only and add import orchestration around existing finance mapping tables. Add focused read helpers in `lib/portal/imports.ts`, server actions in `lib/portal/actions/imports.ts`, a dedicated `app/dashboard/imports/page.tsx`, a small Clerk invitation bootstrap extension in `lib/portal/session.ts`, and onboarding UI/action changes for document deferral.

**Tech Stack:** Next.js App Router, React server components, server actions, Clerk invitations, Supabase service-role access, Vitest.

---

## File Structure

- Create `lib/portal/imports.ts`: read-only import queue/review helpers, source-data aggregation, name/email suggestions, and finance row counts.
- Create `lib/portal/imports.test.ts`: unit tests for queue/review shape and suggestion behavior.
- Create `lib/portal/actions/imports.ts`: admin-only import action, mapping propagation helpers, invite sends, audit writes, and document-skip action.
- Create `lib/portal/actions/imports.test.ts`: action tests for idempotent import, create/link paths, missing email behavior, and mapping propagation.
- Create `app/dashboard/imports/page.tsx`: admin-only Imports page with queue, review form, employee selection, emails, and import result surface.
- Modify `components/portal/ui.tsx`: add Imports to admin navigation and active-section detection.
- Modify `lib/portal/session.ts`: support Clerk invitation metadata for imported pending employers.
- Modify `lib/portal/actions/global-onboarding.ts`: add document-skip handling for employer and employee onboarding.
- Modify `components/onboarding/global-onboarding-ui.tsx`: add "Skip documents for now" controls to company and employee document upload areas.
- Modify or add tests in `lib/portal/actions/action-guards.test.ts` only if existing onboarding action behavior needs coverage there.

---

### Task 1: Add Import Queue Read Helpers

**Files:**
- Create: `lib/portal/imports.ts`
- Create: `lib/portal/imports.test.ts`

- [ ] **Step 1: Write failing tests for import queue and review data**

Create `lib/portal/imports.test.ts`:

```ts
import { describe, expect, test, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

function query(data: unknown[] = []) {
  const builder: any = {
    select: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve({ data, error: null })),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: data[0] ?? null, error: null })),
  };
  return builder;
}

describe("Invoice Generator imports data", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  test("lists staged companies with counts and import status", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "finance_company_mappings") return query([{ id: "map_1", source_key: "invoice_generator", external_company_id: "c_1", external_company_name: "Acme", employer_id: null, updated_at: "2026-06-01" }]);
      if (table === "finance_employee_mappings") return query([{ id: "emp_map_1", external_company_id: "c_1", employee_id: null }]);
      if (table === "finance_invoices") return query([{ id: "inv_1", external_company_id: "c_1", employer_id: null }]);
      if (table === "employers") return query([{ id: "er_1", name: "Acme", contact_email: "ops@acme.test" }]);
      return query([]);
    });

    const { getInvoiceGeneratorImportQueue } = await import("@/lib/portal/imports");
    const rows = await getInvoiceGeneratorImportQueue();

    expect(rows).toEqual([
      expect.objectContaining({
        externalCompanyId: "c_1",
        companyName: "Acme",
        importStatus: "not_imported",
        employeeCount: 1,
        invoiceCount: 1,
        suggestedEmployerId: "er_1",
      }),
    ]);
  });

  test("builds company review with employees and finance summary", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "finance_company_mappings") return query([{ id: "map_1", source_key: "invoice_generator", external_company_id: "c_1", external_company_name: "Acme", employer_id: null }]);
      if (table === "finance_employee_mappings") return query([{ id: "emp_map_1", source_key: "invoice_generator", external_employee_id: "e_1", external_company_id: "c_1", external_employee_name: "Riya Rao", external_employee_email: null, employee_id: null, employer_id: null }]);
      if (table === "finance_invoices") return query([{ id: "inv_1", external_company_id: "c_1", month_key: "2026-05", grand_total_usd_cents: 100000 }]);
      if (table === "finance_employee_salary_payments") return query([{ id: "sal_1", external_employee_id: "e_1", month_key: "2026-05" }]);
      if (table === "employers") return query([]);
      if (table === "employees") return query([]);
      return query([]);
    });

    const { getInvoiceGeneratorImportReview } = await import("@/lib/portal/imports");
    const review = await getInvoiceGeneratorImportReview("c_1");

    expect(review.company.externalCompanyId).toBe("c_1");
    expect(review.employees).toHaveLength(1);
    expect(review.employees[0]).toEqual(expect.objectContaining({ externalEmployeeId: "e_1", needsEmail: true }));
    expect(review.financeSummary.invoiceCount).toBe(1);
    expect(review.financeSummary.salaryPaymentCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npx vitest run lib/portal/imports.test.ts --testTimeout=20000`

Expected: FAIL because `@/lib/portal/imports` does not exist.

- [ ] **Step 3: Implement import read helpers**

Create `lib/portal/imports.ts`:

```ts
import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ImportQueueRow = {
  sourceKey: string;
  externalCompanyId: string;
  companyName: string;
  employerId: string | null;
  importStatus: "not_imported" | "partially_imported" | "imported";
  employeeCount: number;
  importedEmployeeCount: number;
  invoiceCount: number;
  lastSyncedAt: string | null;
  suggestedEmployerId: string | null;
  suggestedEmployerName: string | null;
};

export type ImportReview = {
  company: ImportQueueRow;
  employers: Array<{ id: string; name: string; contact_email: string | null }>;
  employees: Array<{
    mappingId: string;
    sourceKey: string;
    externalEmployeeId: string;
    externalCompanyId: string;
    name: string;
    email: string | null;
    employerId: string | null;
    employeeId: string | null;
    suggestedEmployeeId: string | null;
    suggestedEmployeeName: string | null;
    needsEmail: boolean;
  }>;
  financeSummary: {
    invoiceCount: number;
    salaryPaymentCount: number;
    statementRowCount: number;
    latestMonth: string | null;
  };
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function countBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string") counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export async function getInvoiceGeneratorImportQueue(): Promise<ImportQueueRow[]> {
  const supabase = getSupabaseAdmin() as any;
  const [{ data: companies }, { data: employeeMappings }, { data: invoices }, { data: employers }] = await Promise.all([
    supabase.from("finance_company_mappings").select("*").order("updated_at", { ascending: false }),
    supabase.from("finance_employee_mappings").select("*").order("updated_at", { ascending: false }),
    supabase.from("finance_invoices").select("id, external_company_id, employer_id, synced_at, updated_at").order("synced_at", { ascending: false }),
    supabase.from("employers").select("id, name, contact_email").order("name", { ascending: true }),
  ]);

  const employeesByCompany = countBy(employeeMappings ?? [], "external_company_id");
  const invoicesByCompany = countBy(invoices ?? [], "external_company_id");

  return (companies ?? []).map((company: any) => {
    const companyEmployees = (employeeMappings ?? []).filter((row: any) => row.external_company_id === company.external_company_id);
    const importedEmployeeCount = companyEmployees.filter((row: any) => row.employee_id).length;
    const employeeCount = employeesByCompany.get(company.external_company_id) ?? 0;
    const suggestedEmployer = (employers ?? []).find((employer: any) => normalize(employer.name) === normalize(company.external_company_name));
    const lastInvoice = (invoices ?? []).find((invoice: any) => invoice.external_company_id === company.external_company_id);
    const importStatus = company.employer_id && employeeCount > 0 && importedEmployeeCount === employeeCount
      ? "imported"
      : company.employer_id || importedEmployeeCount > 0
        ? "partially_imported"
        : "not_imported";

    return {
      sourceKey: company.source_key ?? "invoice_generator",
      externalCompanyId: company.external_company_id,
      companyName: company.external_company_name,
      employerId: company.employer_id,
      importStatus,
      employeeCount,
      importedEmployeeCount,
      invoiceCount: invoicesByCompany.get(company.external_company_id) ?? 0,
      lastSyncedAt: lastInvoice?.synced_at ?? company.updated_at ?? null,
      suggestedEmployerId: suggestedEmployer?.id ?? null,
      suggestedEmployerName: suggestedEmployer?.name ?? null,
    };
  });
}

export async function getInvoiceGeneratorImportReview(externalCompanyId: string): Promise<ImportReview> {
  const supabase = getSupabaseAdmin() as any;
  const queue = await getInvoiceGeneratorImportQueue();
  const company = queue.find((row) => row.externalCompanyId === externalCompanyId);
  if (!company) throw new Error("Imported company was not found.");

  const { data: employeeMappings } = await supabase
    .from("finance_employee_mappings")
    .select("*")
    .eq("external_company_id", externalCompanyId)
    .order("external_employee_name", { ascending: true });
  const externalEmployeeIds = (employeeMappings ?? []).map((row: any) => row.external_employee_id).filter(Boolean);

  const [{ data: invoices }, { data: salaries }, { data: statements }, { data: employers }, { data: portalEmployees }] = await Promise.all([
    supabase.from("finance_invoices").select("id, month_key, grand_total_usd_cents").eq("external_company_id", externalCompanyId).order("month_key", { ascending: false }),
    supabase.from("finance_employee_salary_payments").select("id, external_employee_id, month_key").eq("external_company_id", externalCompanyId).order("month_key", { ascending: false }),
    externalEmployeeIds.length
      ? supabase.from("finance_employee_statement_rows").select("id, external_employee_id, month_key").in("external_employee_id", externalEmployeeIds)
      : Promise.resolve({ data: [] }),
    supabase.from("employers").select("id, name, contact_email").order("name", { ascending: true }),
    supabase.from("employees").select("id, full_name, email, employer_id").order("full_name", { ascending: true }),
  ]);

  const employees = (employeeMappings ?? []).map((mapping: any) => {
    const suggestion = (portalEmployees ?? []).find((employee: any) => {
      const emailMatch = mapping.external_employee_email && normalize(employee.email) === normalize(mapping.external_employee_email);
      const nameMatch = normalize(employee.full_name) === normalize(mapping.external_employee_name);
      return emailMatch || nameMatch;
    });
    return {
      mappingId: mapping.id,
      sourceKey: mapping.source_key ?? "invoice_generator",
      externalEmployeeId: mapping.external_employee_id,
      externalCompanyId: mapping.external_company_id,
      name: mapping.external_employee_name,
      email: mapping.external_employee_email ?? null,
      employerId: mapping.employer_id ?? null,
      employeeId: mapping.employee_id ?? null,
      suggestedEmployeeId: suggestion?.id ?? null,
      suggestedEmployeeName: suggestion?.full_name ?? null,
      needsEmail: !mapping.external_employee_email,
    };
  });

  const months = [...(invoices ?? []), ...(salaries ?? []), ...(statements ?? [])]
    .map((row: any) => row.month_key)
    .filter(Boolean)
    .sort()
    .reverse();

  return {
    company,
    employers: employers ?? [],
    employees,
    financeSummary: {
      invoiceCount: (invoices ?? []).length,
      salaryPaymentCount: (salaries ?? []).length,
      statementRowCount: (statements ?? []).length,
      latestMonth: months[0] ?? null,
    },
  };
}
```

- [ ] **Step 4: Run tests and verify pass**

Run: `npx vitest run lib/portal/imports.test.ts --testTimeout=20000`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- lib/portal/imports.ts lib/portal/imports.test.ts
git commit -m "feat: add invoice import queue helpers"
```

---

### Task 2: Add Import Server Actions

**Files:**
- Create: `lib/portal/actions/imports.ts`
- Create: `lib/portal/actions/imports.test.ts`

- [ ] **Step 1: Write failing action tests**

Create `lib/portal/actions/imports.test.ts` with tests for:

```ts
test("creates a pending employer from a staged company and maps invoices", async () => {});
test("links a staged company to an existing employer without overwriting profile fields", async () => {});
test("creates pending onboarding employees and maps finance rows", async () => {});
test("skips selected employees with missing email and reports them", async () => {});
test("does not duplicate employer or employee records when import is rerun", async () => {});
test("rejects non-admin import attempts", async () => {});
```

Use the same mock style as `lib/portal/actions/deactivation.test.ts`: mock `@/lib/portal/session`, `@/lib/supabase/admin`, `@clerk/nextjs/server`, `next/cache`, and `writeAudit`.

- [ ] **Step 2: Run tests and verify failure**

Run: `npx vitest run lib/portal/actions/imports.test.ts --testTimeout=20000`

Expected: FAIL because actions do not exist.

- [ ] **Step 3: Implement `importInvoiceGeneratorCompanyAction`**

Create `lib/portal/actions/imports.ts`:

```ts
"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

type ImportResult = {
  employerId: string;
  createdEmployer: boolean;
  linkedEmployer: boolean;
  createdEmployees: number;
  linkedEmployees: number;
  invitedEmployees: number;
  skippedEmployees: Array<{ externalEmployeeId: string; name: string; reason: string }>;
};

async function appUrl(path: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configuredOrigin) return new URL(path, configuredOrigin.startsWith("http") ? configuredOrigin : `https://${configuredOrigin}`).toString();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("Could not determine application URL for invitation.");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(path, `${proto}://${host}`).toString();
}

function selectedEmployeeIds(formData: FormData) {
  return new Set(formData.getAll("selected_external_employee_id").map(String).filter(Boolean));
}

function employeeEmail(formData: FormData, externalEmployeeId: string) {
  const raw = formData.get(`employee_email_${externalEmployeeId}`);
  return typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : null;
}

async function requireAdminSession() {
  const session = await requirePortalRole(["super_admin", "admin"]);
  if (!isPlatformAdmin(session.user.role)) throw new Error("Admin access is required.");
  return session;
}
```

Then add helpers inside the same file:

```ts
async function propagateCompanyMapping(supabase: any, sourceKey: string, externalCompanyId: string, employerId: string) {
  const { data: invoices } = await supabase
    .from("finance_invoices")
    .select("external_invoice_id")
    .eq("source_key", sourceKey)
    .eq("external_company_id", externalCompanyId);
  const invoiceIds = (invoices ?? []).map((invoice: any) => invoice.external_invoice_id).filter(Boolean);

  await Promise.all([
    supabase.from("finance_company_mappings").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    supabase.from("finance_employee_mappings").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId).is("employer_id", null),
    supabase.from("finance_invoices").update({ employer_id: employerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    supabase.from("finance_invoice_payments").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    invoiceIds.length ? supabase.from("finance_invoice_line_items").update({ employer_id: employerId }).eq("source_key", sourceKey).in("external_invoice_id", invoiceIds) : Promise.resolve(),
    supabase.from("finance_employee_salary_payments").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
  ]);
}

async function propagateEmployeeMapping(supabase: any, sourceKey: string, externalEmployeeId: string, employeeId: string, employerId: string) {
  await Promise.all([
    supabase.from("finance_employee_mappings").update({ employee_id: employeeId, employer_id: employerId }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_invoice_line_items").update({ employee_id: employeeId, employer_id: employerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_salary_payments").update({ employee_id: employeeId, employer_id: employerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_statement_rows").update({ employee_id: employeeId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_statement_summaries").update({ employee_id: employeeId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
  ]);
}
```

Then implement the action:

```ts
export async function importInvoiceGeneratorCompanyAction(formData: FormData): Promise<ImportResult> {
  const session = await requireAdminSession();
  const sourceKey = optionalString(formData, "source_key") ?? "invoice_generator";
  const externalCompanyId = requireString(formData, "external_company_id");
  const employerMode = requireString(formData, "employer_mode");
  const existingEmployerId = optionalString(formData, "existing_employer_id");
  const employerAdminEmail = optionalString(formData, "employer_admin_email")?.toLowerCase() ?? null;
  const selectedEmployees = selectedEmployeeIds(formData);
  const supabase = getSupabaseAdmin() as any;

  const { data: companyMapping, error: mappingError } = await supabase
    .from("finance_company_mappings")
    .select("*")
    .eq("source_key", sourceKey)
    .eq("external_company_id", externalCompanyId)
    .single();
  if (mappingError || !companyMapping) throw new Error(mappingError?.message ?? "Company import row not found.");

  let employerId = existingEmployerId ?? companyMapping.employer_id;
  let createdEmployer = false;
  let linkedEmployer = false;

  if (employerMode === "create") {
    if (!employerAdminEmail) throw new Error("Employer admin email is required.");
    if (!employerId) {
      const { data: employer, error } = await supabase.from("employers").insert({
        name: companyMapping.external_company_name,
        contact_email: employerAdminEmail,
        status: "pending",
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
      }).select("id").single();
      if (error || !employer) throw new Error(error?.message ?? "Could not create employer.");
      employerId = employer.id;
      createdEmployer = true;
    }
  } else if (employerMode === "link") {
    if (!employerId) throw new Error("Select an employer to link.");
    linkedEmployer = true;
  } else {
    throw new Error("Choose whether to create or link an employer.");
  }

  await propagateCompanyMapping(supabase, sourceKey, externalCompanyId, employerId);

  if (employerAdminEmail) {
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: employerAdminEmail,
      redirectUrl: await appUrl("/sign-up"),
      notify: true,
      ignoreExisting: true,
      publicMetadata: {
        portalRole: "employer_admin",
        employerId,
        source: "invoice_generator_import",
      },
    });
  }

  const { data: mappings } = await supabase
    .from("finance_employee_mappings")
    .select("*")
    .eq("source_key", sourceKey)
    .eq("external_company_id", externalCompanyId);

  const result: ImportResult = { employerId, createdEmployer, linkedEmployer, createdEmployees: 0, linkedEmployees: 0, invitedEmployees: 0, skippedEmployees: [] };
  const clerk = await clerkClient();

  for (const mapping of mappings ?? []) {
    if (!selectedEmployees.has(mapping.external_employee_id)) continue;
    const email = employeeEmail(formData, mapping.external_employee_id) ?? mapping.external_employee_email?.toLowerCase() ?? null;
    const existingEmployeeId = optionalString(formData, `existing_employee_id_${mapping.external_employee_id}`);
    if (!email && !existingEmployeeId) {
      result.skippedEmployees.push({ externalEmployeeId: mapping.external_employee_id, name: mapping.external_employee_name, reason: "Missing employee email." });
      continue;
    }

    let employeeId = existingEmployeeId ?? mapping.employee_id;
    if (employeeId) {
      result.linkedEmployees += 1;
    } else {
      const { data: employee, error } = await supabase.from("employees").insert({
        employer_id: employerId,
        email,
        full_name: mapping.external_employee_name,
        job_title: null,
        department: null,
        status: "pending",
        lifecycle_status: "onboarding",
      }).select("id").single();
      if (error || !employee) throw new Error(error?.message ?? `Could not create employee ${mapping.external_employee_name}.`);
      employeeId = employee.id;
      result.createdEmployees += 1;
      await Promise.all([
        supabase.from("employee_onboarding_status").upsert({ employee_id: employeeId, status: "Draft" }, { onConflict: "employee_id" }),
        supabase.from("employee_onboarding_progress").upsert({ employee_id: employeeId, current_step: "Personal", completed_steps: [], completion_percentage: 0 }, { onConflict: "employee_id" }),
      ]);
    }

    await propagateEmployeeMapping(supabase, sourceKey, mapping.external_employee_id, employeeId, employerId);

    if (email) {
      await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: await appUrl("/sign-up"),
        notify: true,
        ignoreExisting: true,
        publicMetadata: {
          portalRole: "employee",
          employerId,
          employeeId,
          source: "invoice_generator_import",
        },
      });
      result.invitedEmployees += 1;
    }
  }

  await writeAudit(session.user, "import_invoice_generator_company", "finance_company_mapping", companyMapping.id, {
    sourceKey,
    externalCompanyId,
    result,
  });

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/finances/mapping");
  revalidatePath("/dashboard/employers");
  revalidatePath("/dashboard/employees");

  return result;
}
```

- [ ] **Step 4: Implement document skip action**

Append to `lib/portal/actions/imports.ts`:

```ts
export async function skipOnboardingDocumentsAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const targetType = requireString(formData, "target_type");
  const targetId = requireString(formData, "target_id");

  await writeAudit(session.user, "skip_onboarding_documents", targetType, targetId, {
    source: "onboarding_document_step",
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/documents");
}
```

- [ ] **Step 5: Run action tests**

Run: `npx vitest run lib/portal/actions/imports.test.ts --testTimeout=20000`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- lib/portal/actions/imports.ts lib/portal/actions/imports.test.ts
git commit -m "feat: import invoice generator companies"
```

---

### Task 3: Support Imported Employer Invitation Bootstrap

**Files:**
- Modify: `lib/portal/session.ts`
- Test: `lib/portal/session.test.ts`

- [ ] **Step 1: Add failing session test**

Add a test to `lib/portal/session.test.ts` proving that a Clerk user with invitation metadata `{ portalRole: "employer_admin", employerId: "er_1", source: "invoice_generator_import" }` gets a `portal_users` row linked to `er_1` even when the employer row is still `pending`.

Expected assertion:

```ts
expect(insertedPortalUser).toEqual(expect.objectContaining({
  role: "employer_admin",
  status: "active",
  employer_id: "er_1",
}));
```

- [ ] **Step 2: Run test and verify failure**

Run: `npx vitest run lib/portal/session.test.ts --testTimeout=20000`

Expected: FAIL because `getPortalSession()` does not inspect Clerk public metadata for imported employer invites.

- [ ] **Step 3: Implement metadata bootstrap**

Modify `lib/portal/session.ts`:

```ts
function invitationMetadata(user: Awaited<ReturnType<typeof currentUser>>) {
  const metadata = user?.publicMetadata ?? {};
  return {
    portalRole: typeof metadata.portalRole === "string" ? metadata.portalRole : null,
    employerId: typeof metadata.employerId === "string" ? metadata.employerId : null,
    employeeId: typeof metadata.employeeId === "string" ? metadata.employeeId : null,
    source: typeof metadata.source === "string" ? metadata.source : null,
  };
}
```

In `getPortalSession()` before `findActiveEmployerByEmail(email)`, add:

```ts
const invite = invitationMetadata(clerkUser);
const invitedEmployerId =
  invite.portalRole === "employer_admin" && invite.employerId && invite.source === "invoice_generator_import"
    ? invite.employerId
    : null;
const invitedEmployer = invitedEmployee || !invitedEmployerId
  ? null
  : { id: invitedEmployerId };
const activeEmployer = invitedEmployee || invitedEmployer ? null : await findActiveEmployerByEmail(email);
const employerForBootstrap = invitedEmployer ?? activeEmployer;
```

Then use `employerForBootstrap` instead of the old `invitedEmployer` in bootstrap status and insert:

```ts
const bootstrapStatus =
  bootstrapRole === "super_admin" || bootstrapRole === "employee" || employerForBootstrap
    ? "active"
    : "pending";
```

and:

```ts
employer_id: employerForBootstrap?.id,
```

Set `bootstrapRole` to employer admin when imported employer metadata is present:

```ts
const bootstrapRole: PortalRole = isAdminEmail(email)
  ? "super_admin"
  : invitedEmployee
    ? "employee"
    : invite.portalRole === "employer_admin" && invitedEmployerId
      ? "employer_admin"
      : "employer_admin";
```

- [ ] **Step 4: Run session tests**

Run: `npx vitest run lib/portal/session.test.ts --testTimeout=20000`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- lib/portal/session.ts lib/portal/session.test.ts
git commit -m "feat: bootstrap imported employer invites"
```

---

### Task 4: Build Dedicated Imports Page

**Files:**
- Create: `app/dashboard/imports/page.tsx`
- Modify: `components/portal/ui.tsx`
- Optional test: add route smoke coverage if a page-level test pattern exists

- [ ] **Step 1: Add admin navigation**

Modify admin nav in `components/portal/ui.tsx`:

```ts
{ label: "Imports", icon: "IM", href: "/dashboard/imports" },
```

Add `"imports"` to `activeSectionTitles`.

- [ ] **Step 2: Create Imports page**

Create `app/dashboard/imports/page.tsx`:

```tsx
import Link from "next/link";
import { importInvoiceGeneratorCompanyAction } from "@/lib/portal/actions/imports";
import { getInvoiceGeneratorImportQueue, getInvoiceGeneratorImportReview } from "@/lib/portal/imports";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, SubmitButton, TextInput, formatDate } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function ImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const params = searchParams ? await searchParams : {};
  const externalCompanyId = Array.isArray(params.company) ? params.company[0] : params.company;
  const queue = await getInvoiceGeneratorImportQueue();
  const review = externalCompanyId ? await getInvoiceGeneratorImportReview(externalCompanyId) : null;

  return (
    <PortalShell
      session={session}
      title="Imports"
      subtitle="Review Invoice Generator companies, create pending portal onboarding records, and map historical finance data."
      wide
    >
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel title="Invoice Generator Queue" description="Synced companies stay staged until an admin imports them.">
          <div className="grid gap-3">
            {queue.map((company) => (
              <Link
                key={company.externalCompanyId}
                href={`/dashboard/imports?company=${encodeURIComponent(company.externalCompanyId)}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-slate-100">{company.companyName}</p>
                    <p className="mt-1 text-xs text-slate-500">External ID: {company.externalCompanyId}</p>
                  </div>
                  <StatusBadge value={company.importStatus} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <span>{company.employeeCount} employees</span>
                  <span>{company.invoiceCount} invoices</span>
                  <span>{formatDate(company.lastSyncedAt)}</span>
                </div>
                {company.suggestedEmployerName ? (
                  <p className="mt-2 text-xs font-semibold text-blue-700">Suggested: {company.suggestedEmployerName}</p>
                ) : null}
              </Link>
            ))}
            {queue.length === 0 ? <EmptyState>No Invoice Generator companies have synced yet.</EmptyState> : null}
          </div>
        </Panel>

        {review ? (
          <Panel title={`Review Import: ${review.company.companyName}`} description="Create or link the employer, select employees, add emails, and send invites.">
            <form action={importInvoiceGeneratorCompanyAction} className="grid gap-5">
              <input type="hidden" name="source_key" value={review.company.sourceKey} />
              <input type="hidden" name="external_company_id" value={review.company.externalCompanyId} />
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Employer action
                  <select name="employer_mode" defaultValue={review.company.employerId ? "link" : "create"} className="h-10 rounded-xl border border-slate-300 px-3">
                    <option value="create">Create pending employer</option>
                    <option value="link">Link existing employer</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Existing employer
                  <select name="existing_employer_id" defaultValue={review.company.employerId ?? review.company.suggestedEmployerId ?? ""} className="h-10 rounded-xl border border-slate-300 px-3">
                    <option value="">Create new / no link</option>
                    {review.employers.map((employer) => (
                      <option key={employer.id} value={employer.id}>{employer.name}</option>
                    ))}
                  </select>
                </label>
                <TextInput name="employer_admin_email" label="Employer admin email" type="email" />
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold">Finance available</p>
                <p>{review.financeSummary.invoiceCount} invoices · {review.financeSummary.salaryPaymentCount} salary payments · {review.financeSummary.statementRowCount} statement rows</p>
                {review.financeSummary.latestMonth ? <p className="text-xs text-slate-500">Latest month: {review.financeSummary.latestMonth}</p> : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Import</th>
                      <th className="py-2 pr-4">Employee</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Existing employee</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.employees.map((employee) => (
                      <tr key={employee.externalEmployeeId} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">
                          <input type="checkbox" name="selected_external_employee_id" value={employee.externalEmployeeId} defaultChecked={!employee.employeeId} />
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-semibold">{employee.name}</p>
                          <p className="text-xs text-slate-500">{employee.externalEmployeeId}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <input name={`employee_email_${employee.externalEmployeeId}`} type="email" defaultValue={employee.email ?? ""} className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs" />
                        </td>
                        <td className="py-3 pr-4">
                          <select name={`existing_employee_id_${employee.externalEmployeeId}`} defaultValue={employee.employeeId ?? employee.suggestedEmployeeId ?? ""} className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs">
                            <option value="">Create new</option>
                            {employee.suggestedEmployeeId ? <option value={employee.suggestedEmployeeId}>{employee.suggestedEmployeeName}</option> : null}
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge value={employee.employeeId ? "mapped" : employee.needsEmail ? "needs_email" : "ready"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SubmitButton pendingText="Importing...">Import company</SubmitButton>
            </form>
          </Panel>
        ) : (
          <Panel title="Review Import">
            <EmptyState>Select a company from the queue to review its import details.</EmptyState>
          </Panel>
        )}
      </div>
    </PortalShell>
  );
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit --pretty false`

Expected: PASS or only actionable type issues in the new imports page/helpers.

- [ ] **Step 4: Commit**

```powershell
git add -- app/dashboard/imports/page.tsx components/portal/ui.tsx
git commit -m "feat: add invoice imports page"
```

---

### Task 5: Add Document Skip Controls To Onboarding

**Files:**
- Modify: `lib/portal/actions/global-onboarding.ts`
- Modify: `components/onboarding/global-onboarding-ui.tsx`
- Test: `lib/portal/actions/action-guards.test.ts` or new focused test if easier

- [ ] **Step 1: Write failing test for employee document skip**

Add a test asserting that saving the employee Documents step with `skip_documents=1` marks the Documents step complete without requiring document rows.

Target action: `saveEmployeeOnboardingStepAction`.

Expected:

```ts
expect(saveProgressUpsert).toHaveBeenCalledWith(expect.objectContaining({
  current_step: "Documents",
  completed_steps: expect.arrayContaining(["Documents"]),
}));
```

- [ ] **Step 2: Update employee onboarding action**

In `lib/portal/actions/global-onboarding.ts`, inside `saveEmployeeOnboardingStepAction`, keep the existing Documents-step permissive behavior and add audit metadata when skipping:

```ts
const skipDocuments = formData.get("skip_documents") === "1";
if (step === "Documents" && skipDocuments) {
  await writeAudit(session.user, "skip_employee_onboarding_documents", "employee", employee.id, {
    source: "employee_self_onboarding",
  });
}
```

Do not create fake `employee_documents` rows.

- [ ] **Step 3: Add employer/company document skip action**

In `lib/portal/actions/global-onboarding.ts`, add:

```ts
export async function skipCompanyDocumentsAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin"]);
  const companyId = requireString(formData, "company_id");
  const supabase = getSupabaseAdmin();

  const { data: company, error } = await supabase
    .from("client_companies")
    .select("id, employer_id")
    .eq("id", companyId)
    .single();
  if (error || !company) throw new Error(error?.message ?? "Company not found.");

  await assertCompanyAccess(company.id, session.user.role, session.user.employer_id);
  await writeAudit(session.user, "skip_company_onboarding_documents", "client_company", company.id, {
    source: "company_onboarding",
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/documents");
}
```

- [ ] **Step 4: Add UI controls**

In `components/onboarding/global-onboarding-ui.tsx`:

Import `skipCompanyDocumentsAction`.

In `CompanyDocuments`, below the upload form, add:

```tsx
<form action={skipCompanyDocumentsAction}>
  <input type="hidden" name="company_id" value={String(company.id)} />
  <SubmitButton pendingText="Skipping...">Skip documents for now</SubmitButton>
</form>
```

In `EmployeeSelfOnboarding`, inside the employee step form footer when active step is Documents, add:

```tsx
{employeeSteps[activeStep] === "Documents" ? (
  <button
    type="submit"
    name="skip_documents"
    value="1"
    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
  >
    Skip documents for now
  </button>
) : null}
```

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run lib/portal/actions/action-guards.test.ts --testTimeout=20000`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- lib/portal/actions/global-onboarding.ts components/onboarding/global-onboarding-ui.tsx lib/portal/actions/action-guards.test.ts
git commit -m "feat: allow deferred onboarding documents"
```

---

### Task 6: Full Verification And Browser QA

**Files:**
- No planned code edits unless verification reveals defects.

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run TypeScript**

Run: `npx tsc --noEmit --pretty false`

Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS, Next.js builds all dashboard routes including `/dashboard/imports`.

- [ ] **Step 5: Manual browser QA**

Start dev server:

```powershell
npm run dev -- --port 3000
```

Check:

- `/dashboard/imports` redirects anonymous users to sign-in.
- With an admin session, Imports appears in sidebar.
- Imports queue shows staged Invoice Generator companies.
- Review Import page shows employer action, employer email, employee rows, employee email inputs, finance summary, and Import company button.
- Import action shows a visible pending state.
- Employer/employee onboarding document areas show "Skip documents for now".
- Skipping documents does not create fake uploaded documents.

- [ ] **Step 6: Commit any verification fixes**

If fixes were needed:

```powershell
git add -- <changed-files>
git commit -m "fix: stabilize invoice imports workflow"
```

If no fixes were needed, do not create an empty commit.
