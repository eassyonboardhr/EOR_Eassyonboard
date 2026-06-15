import { describe, expect, test } from "vitest";
import {
  calculateMonthlyBill,
  isEmployeePayrollLineItemLabel,
  isEmployerInvoiceLineItemLabel,
} from "@/lib/portal/portal-finance-types";

describe("portal finance types and calculations", () => {
  test("calculates monthly bill from hourly rate and weekly hours", () => {
    expect(calculateMonthlyBill(20, 40)).toBe(3466.67);
  });

  test("calculates zero bill for zero values", () => {
    expect(calculateMonthlyBill(0, 40)).toBe(0);
    expect(calculateMonthlyBill(20, 0)).toBe(0);
  });

  test("rounds decimal monthly bill values to 2 decimals", () => {
    expect(calculateMonthlyBill(23.45, 37.5)).toBe(3810.63);
  });

  test("guards employer invoice line item labels", () => {
    expect(isEmployerInvoiceLineItemLabel("Other")).toBe(true);
    expect(isEmployerInvoiceLineItemLabel("Appraisal Advance")).toBe(true);
    expect(isEmployerInvoiceLineItemLabel("PF")).toBe(false);
  });

  test("guards employee payroll line item labels", () => {
    expect(isEmployeePayrollLineItemLabel("PF")).toBe(true);
    expect(isEmployeePayrollLineItemLabel("Reimbursements")).toBe(true);
    expect(isEmployeePayrollLineItemLabel("Onboarding Advance")).toBe(false);
  });
});
