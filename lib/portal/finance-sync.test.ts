import { describe, expect, test, vi } from "vitest";
import {
  financeSyncPayloadSchema,
  resolvePaymentReceivedAt,
} from "@/lib/portal/finance-sync";

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
        status: "received",
        paymentReceivedAt: "2026-06-10",
      },
      lineItems: [{
        id: "line_1",
        invoiceId: "invoice_1",
        employeeId: "employee_1",
        employeeNameSnapshot: "John Employee",
        billedTotalUsdCents: 500000,
      }],
      salaryPayments: [{
        id: "salary_1",
        employeeId: "employee_1",
        companyId: "company_acme",
        month: "2026-05",
        salaryUsdCents: 250000,
        salaryPaidInrCents: 20800000,
        pfInrCents: 180000,
        tdsInrCents: 500000,
        actualPaidInrCents: 20120000,
        paidStatus: true,
      }],
      statementRows: [{
        id: "statement_row_1",
        employeeId: "employee_1",
        invoiceId: "invoice_1",
        monthKey: "2026-05",
        employeeNameSnapshot: "John Employee",
        invoiceNumberSnapshot: "INV-001",
        dollarInwardUsdCents: 300000,
      }],
    });

    expect(parsed.source).toBe("invoice_generator");
    expect(parsed.invoice.month).toBe(5);
    expect(parsed.invoice.status).toBe("received");
    expect(parsed.invoice.paymentReceivedAt).toBe("2026-06-10");
    expect(parsed.lineItems[0].payoutMonthlyUsdCentsSnapshot).toBe(0);
    expect(parsed.salaryPayments[0].actualPaidInrCents).toBe(20120000);
    expect(parsed.statementRows[0].dollarInwardUsdCents).toBe(300000);
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

  test("uses the source received timestamp for received invoices", () => {
    expect(resolvePaymentReceivedAt({
      status: "received",
      sourcePaymentReceivedAt: "2026-06-10",
      existingPaymentReceivedAt: null,
      fallbackSyncedAt: "2026-06-12T08:00:00.000Z",
    })).toBe("2026-06-10T00:00:00.000Z");
  });

  test("does not overwrite an existing received timestamp when older payloads omit it", () => {
    expect(resolvePaymentReceivedAt({
      status: "received",
      sourcePaymentReceivedAt: null,
      existingPaymentReceivedAt: "2026-06-09T00:00:00.000Z",
      fallbackSyncedAt: "2026-06-12T08:00:00.000Z",
    })).toBe("2026-06-09T00:00:00.000Z");
  });

  test("does not set payment received timestamps for non-received statuses", () => {
    expect(resolvePaymentReceivedAt({
      status: "generated",
      sourcePaymentReceivedAt: "2026-06-10",
      existingPaymentReceivedAt: "2026-06-09T00:00:00.000Z",
      fallbackSyncedAt: "2026-06-12T08:00:00.000Z",
    })).toBeUndefined();
  });
});
