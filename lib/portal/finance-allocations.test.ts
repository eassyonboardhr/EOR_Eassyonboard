import { describe, expect, test } from "vitest";
import {
  centsNumber,
  inferPayrollAllocations,
  refreshAllocationCashout,
  summarizeAdminFinance,
  toArrayFilter,
  toEmployerPaymentStatus,
} from "@/lib/portal/finance-allocations";

describe("finance allocation helpers", () => {
  test("maps internal invoice statuses to employer-safe payment statuses", () => {
    expect(toEmployerPaymentStatus("generated")).toBe("Invoice raised");
    expect(toEmployerPaymentStatus("sent")).toBe("Invoice raised");
    expect(toEmployerPaymentStatus("received")).toBe("Payment received");
    expect(toEmployerPaymentStatus("cashed_out")).toBe("Settled");
    expect(toEmployerPaymentStatus("void")).toBe("Unknown");
  });

  test("normalizes scalar and comma-separated filter values", () => {
    expect(toArrayFilter(undefined)).toEqual([]);
    expect(toArrayFilter("all")).toEqual([]);
    expect(toArrayFilter("2026-05,2026-06")).toEqual(["2026-05", "2026-06"]);
    expect(toArrayFilter(["emp_1", "all", "emp_2"])).toEqual(["emp_1", "emp_2"]);
  });

  test("coerces cents-like values into numbers", () => {
    expect(centsNumber("1200")).toBe(1200);
    expect(centsNumber(null)).toBe(0);
    expect(centsNumber("not-a-number")).toBe(0);
  });

  test("infers allocation from same employee line item and matching payment month", () => {
    const drafts = inferPayrollAllocations({
      salaryPayments: [{
        id: "salary_1",
        source_key: "invoice_generator",
        employer_id: "employer_1",
        employee_id: "employee_1",
        month_key: "2026-06",
        salary_usd_cents: 250000,
      }],
      lineItems: [{
        id: "line_1",
        invoice_id: "invoice_1",
        employer_id: "employer_1",
        employee_id: "employee_1",
        billed_total_usd_cents: 500000,
        finance_invoices: { id: "invoice_1", month_key: "2026-05" },
      }],
      payments: [{
        id: "payment_1",
        invoice_id: "invoice_1",
        employer_id: "employer_1",
        payment_month: "2026-06",
        usd_inr_rate: "83.1250",
      }],
      existingAllocations: [],
    });

    expect(drafts).toEqual([expect.objectContaining({
      salary_payment_id: "salary_1",
      invoice_id: "invoice_1",
      invoice_payment_id: "payment_1",
      invoice_month: "2026-05",
      paid_month: "2026-06",
      payroll_month: "2026-06",
      allocated_usd_cents: 250000,
      cashout_rate: 83.125,
      allocation_source: "inferred",
      cashout_rate_source: "invoice_payment",
    })]);
  });

  test("does not infer over an existing manual allocation", () => {
    const drafts = inferPayrollAllocations({
      salaryPayments: [{
        id: "salary_1",
        source_key: "invoice_generator",
        employer_id: "employer_1",
        employee_id: "employee_1",
        month_key: "2026-06",
        salary_usd_cents: 250000,
      }],
      lineItems: [{
        id: "line_1",
        invoice_id: "invoice_1",
        employer_id: "employer_1",
        employee_id: "employee_1",
        billed_total_usd_cents: 500000,
        finance_invoices: { id: "invoice_1", month_key: "2026-05" },
      }],
      payments: [{
        id: "payment_1",
        invoice_id: "invoice_1",
        employer_id: "employer_1",
        payment_month: "2026-06",
        usd_inr_rate: 83,
      }],
      existingAllocations: [{
        id: "allocation_1",
        salary_payment_id: "salary_1",
        allocation_source: "manual",
      }],
    });

    expect(drafts).toEqual([]);
  });

  test("refreshes cashout from invoice payment unless manually overridden", () => {
    expect(refreshAllocationCashout({ paymentRate: "84.50" })).toEqual({
      cashout_rate: 84.5,
      cashout_rate_source: "invoice_payment",
      override_reason: null,
    });
    expect(refreshAllocationCashout({ paymentRate: "84.50", manualRate: "85.25", overrideReason: "Bank settlement correction" })).toEqual({
      cashout_rate: 85.25,
      cashout_rate_source: "manual_override",
      override_reason: "Bank settlement correction",
    });
    expect(() => refreshAllocationCashout({ paymentRate: "84.50", manualRate: "85.25" })).toThrow("Override reason is required.");
  });

  test("summarizes admin finance totals from safe row arrays", () => {
    expect(summarizeAdminFinance({
      employerReceivables: [
        { amountUsdCents: 100000, receivedUsdCents: 100000, status: "received", cashoutRate: 83 },
        { amountUsdCents: 50000, receivedUsdCents: 0, status: "generated", cashoutRate: null },
      ],
      employeePayables: [
        { actualPaidInrCents: 8300000, pfInrCents: 100000, tdsInrCents: 200000, paid: true },
        { actualPaidInrCents: 4150000, pfInrCents: 50000, tdsInrCents: 100000, paid: false },
      ],
    })).toEqual({
      totalInvoicedUsdCents: 150000,
      totalReceivedUsdCents: 100000,
      totalEmployeePayoutInrCents: 12450000,
      pendingReceivableUsdCents: 50000,
      pendingSalaryInrCents: 4150000,
      averageCashoutRate: 83,
      estimatedMarginInrCents: -4150000,
    });
  });
});
