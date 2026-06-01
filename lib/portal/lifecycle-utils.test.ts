import { describe, expect, test } from "vitest";
import {
  calculateLastWorkingDay,
  calculateMonthlySalaryFromHourly,
  canCompleteOffboarding,
  validateNoticePeriodDays,
  validateResignationReason,
} from "@/lib/portal/lifecycle-utils";

describe("lifecycle utilities", () => {
  test("validates resignation reason", () => {
    expect(() => validateResignationReason("")).toThrow("Reason is required.");
    expect(() => validateResignationReason("bye")).toThrow("Reason must be at least 5 characters.");
    expect(validateResignationReason("Personal reasons")).toBe("Personal reasons");
  });

  test("validates notice period days", () => {
    expect(validateNoticePeriodDays("30")).toBe(30);
    expect(validateNoticePeriodDays("0")).toBe(0);
    expect(() => validateNoticePeriodDays("-1")).toThrow("Notice period days must be zero or more.");
    expect(() => validateNoticePeriodDays("abc")).toThrow("Notice period days must be a number.");
  });

  test("calculates last working day from approval date and notice period", () => {
    expect(calculateLastWorkingDay("2026-06-01", 0)).toBe("2026-06-01");
    expect(calculateLastWorkingDay("2026-06-01", 30)).toBe("2026-07-01");
  });

  test("calculates monthly salary from employer billing per-hour inputs", () => {
    expect(calculateMonthlySalaryFromHourly(25, 40, 52)).toBe(4333.33);
    expect(calculateMonthlySalaryFromHourly(10, 20, 50)).toBe(833.33);
  });

  test("allows offboarding completion only on or after last working day", () => {
    expect(canCompleteOffboarding("2026-06-01", "2026-06-01")).toBe(true);
    expect(canCompleteOffboarding("2026-06-02", "2026-06-01")).toBe(false);
  });
});
