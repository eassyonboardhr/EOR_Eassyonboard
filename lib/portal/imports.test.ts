import { beforeEach, describe, expect, test, vi } from "vitest";
/* eslint-disable @typescript-eslint/no-explicit-any */

const fromMock = vi.fn();

vi.mock("server-only", () => ({}));

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
      if (table === "finance_company_mappings") {
        return query([
          {
            id: "map_1",
            source_key: "invoice_generator",
            external_company_id: "c_1",
            external_company_name: "Acme",
            employer_id: null,
            updated_at: "2026-06-01",
          },
        ]);
      }
      if (table === "finance_employee_mappings") {
        return query([{ id: "emp_map_1", external_company_id: "c_1", employee_id: null }]);
      }
      if (table === "finance_invoices") {
        return query([{ id: "inv_1", external_company_id: "c_1", employer_id: null }]);
      }
      if (table === "employers") {
        return query([{ id: "er_1", name: "Acme", contact_email: "ops@acme.test" }]);
      }
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
      if (table === "finance_company_mappings") {
        return query([
          {
            id: "map_1",
            source_key: "invoice_generator",
            external_company_id: "c_1",
            external_company_name: "Acme",
            employer_id: null,
          },
        ]);
      }
      if (table === "finance_employee_mappings") {
        return query([
          {
            id: "emp_map_1",
            source_key: "invoice_generator",
            external_employee_id: "e_1",
            external_company_id: "c_1",
            external_employee_name: "Riya Rao",
            external_employee_email: null,
            employee_id: null,
            employer_id: null,
          },
        ]);
      }
      if (table === "finance_invoices") {
        return query([{ id: "inv_1", external_company_id: "c_1", month_key: "2026-05", grand_total_usd_cents: 100000 }]);
      }
      if (table === "finance_employee_salary_payments") {
        return query([{ id: "sal_1", external_employee_id: "e_1", month_key: "2026-05" }]);
      }
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
