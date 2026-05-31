import { describe, expect, test } from "vitest";
import {
  allocatePaidAndLopDays,
  calculateLeaveDays,
  eachDateInRange,
} from "@/lib/portal/leave-utils";

describe("leave date calculations", () => {
  test("counts selected days while excluding weekends and stored holidays", () => {
    const result = calculateLeaveDays("2025-05-20", "2025-05-25", [
      "2025-05-22",
    ]);

    expect(result.totalSelectedDays).toBe(6);
    expect(result.excludedHolidayDays).toBe(3);
    expect(result.totalLeaveDays).toBe(3);
    expect(result.days.map((day) => [day.date, day.isHoliday])).toEqual([
      ["2025-05-20", false],
      ["2025-05-21", false],
      ["2025-05-22", true],
      ["2025-05-23", false],
      ["2025-05-24", true],
      ["2025-05-25", true],
    ]);
  });

  test("supports approved weekly-off rules and date overrides", () => {
    const result = calculateLeaveDays("2025-05-20", "2025-05-25", [], {
      weeklyOffWeekdays: [0, 6],
      workingDayOverrides: ["2025-05-24"],
      holidayOverrides: ["2025-05-21"],
    });

    expect(result.totalSelectedDays).toBe(6);
    expect(result.excludedHolidayDays).toBe(2);
    expect(result.totalLeaveDays).toBe(4);
    expect(result.days.map((day) => [day.date, day.isHoliday])).toEqual([
      ["2025-05-20", false],
      ["2025-05-21", true],
      ["2025-05-22", false],
      ["2025-05-23", false],
      ["2025-05-24", false],
      ["2025-05-25", true],
    ]);
  });

  test("applies weekly-off rule changes only from their effective date forward", () => {
    const result = calculateLeaveDays("2025-05-23", "2025-05-26", [], {
      weeklyOffRules: [
        { weekday: 5, isWeeklyOff: true, effectiveFrom: "2025-05-25" },
      ],
    });

    expect(result.days.map((day) => [day.date, day.isHoliday])).toEqual([
      ["2025-05-23", false],
      ["2025-05-24", true],
      ["2025-05-25", false],
      ["2025-05-26", false],
    ]);
  });

  test("splits leave into paid and lop days when balance is insufficient", () => {
    expect(allocatePaidAndLopDays(4, 2)).toEqual({ paidLeaveDays: 2, lopDays: 2 });
    expect(allocatePaidAndLopDays(4, 7)).toEqual({ paidLeaveDays: 4, lopDays: 0 });
    expect(allocatePaidAndLopDays(4, 0)).toEqual({ paidLeaveDays: 0, lopDays: 4 });
  });

  test("builds an inclusive date range", () => {
    expect(eachDateInRange("2025-05-01", "2025-05-03")).toEqual([
      "2025-05-01",
      "2025-05-02",
      "2025-05-03",
    ]);
  });
});
