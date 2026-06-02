import { describe, expect, test, vi } from "vitest";
import { financeSyncPayloadSchema } from "@/lib/portal/finance-sync";

vi.mock("server-only", () => ({}));

describe("finance sync payload", () => {
  test("accepts an invoice generator payload with unresolved mappings", () => {
    const parsed = financeSyncPayloadSchema.parse({
      source: "invoice_generator",
      company: { id: "company_acme", name: "Acme" },
      employees: [{ id: "employee_1", companyId: "company_acme", fullName: "John Employee" }],
      invoice: {
        id: "invoice_1",
        companyId: "company_acme",
        invoiceNumber: "INV-001",
        month: 5,
        year: 2026,
        status: "generated",
      },
      lineItems: [{
        id: "line_1",
        invoiceId: "invoice_1",
        employeeId: "employee_1",
        employeeNameSnapshot: "John Employee",
        billedTotalUsdCents: 500000,
      }],
    });

    expect(parsed.source).toBe("invoice_generator");
    expect(parsed.invoice.month).toBe(5);
    expect(parsed.lineItems[0].payoutMonthlyUsdCentsSnapshot).toBe(0);
  });

  test("rejects unknown source keys", () => {
    expect(() => financeSyncPayloadSchema.parse({
      source: "other",
      company: { id: "company_acme", name: "Acme" },
      invoice: {
        id: "invoice_1",
        companyId: "company_acme",
        invoiceNumber: "INV-001",
        month: 5,
        year: 2026,
        status: "generated",
      },
    })).toThrow();
  });
});
