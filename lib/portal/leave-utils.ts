export type LeaveDayCalculation = {
  date: string;
  isHoliday: boolean;
};

export type LeaveCalculation = {
  totalSelectedDays: number;
  excludedHolidayDays: number;
  totalLeaveDays: number;
  days: LeaveDayCalculation[];
};

export type LeaveCalendarPolicy = {
  weeklyOffWeekdays?: number[];
  weeklyOffRules?: Array<{
    weekday: number;
    isWeeklyOff: boolean;
    effectiveFrom: string;
  }>;
  workingDayOverrides?: string[];
  holidayOverrides?: string[];
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function eachDateInRange(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range.");
  }

  if (end < start) {
    throw new Error("End date must be after start date.");
  }

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function isWeekend(date: string) {
  const day = parseDate(date).getUTCDay();
  return day === 0 || day === 6;
}

function weeklyOffWeekdaysForDate(date: string, policy: LeaveCalendarPolicy) {
  if (!policy.weeklyOffRules?.length) {
    return policy.weeklyOffWeekdays ?? [0, 6];
  }

  const weekdayState = new Map<number, boolean>();
  const rules = [...policy.weeklyOffRules].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  );
  for (const rule of rules) {
    if (rule.effectiveFrom <= date && !weekdayState.has(rule.weekday)) {
      weekdayState.set(rule.weekday, rule.isWeeklyOff);
    }
  }

  if (weekdayState.size === 0) {
    return policy.weeklyOffWeekdays ?? [0, 6];
  }

  return Array.from(weekdayState.entries())
    .filter(([, isWeeklyOff]) => isWeeklyOff)
    .map(([weekday]) => weekday);
}

export function calculateLeaveDays(
  startDate: string,
  endDate: string,
  holidays: string[] = [],
  policy: LeaveCalendarPolicy = {},
): LeaveCalculation {
  const holidaySet = new Set([...holidays, ...(policy.holidayOverrides ?? [])]);
  const workingDayOverrides = new Set(policy.workingDayOverrides ?? []);
  const days = eachDateInRange(startDate, endDate).map((date) => ({
    date,
    isHoliday:
      !workingDayOverrides.has(date) &&
      (weeklyOffWeekdaysForDate(date, policy).includes(parseDate(date).getUTCDay()) ||
        holidaySet.has(date)),
  }));
  const excludedHolidayDays = days.filter((day) => day.isHoliday).length;

  return {
    totalSelectedDays: days.length,
    excludedHolidayDays,
    totalLeaveDays: days.length - excludedHolidayDays,
    days,
  };
}

export function payableLeaveDates(calculation: LeaveCalculation) {
  return calculation.days
    .filter((day) => !day.isHoliday)
    .map((day) => day.date);
}

export function allocatePaidAndLopDays(totalLeaveDays: number, availablePaidDays: number) {
  const paidLeaveDays = Math.max(0, Math.min(totalLeaveDays, availablePaidDays));
  return {
    paidLeaveDays,
    lopDays: Math.max(0, totalLeaveDays - paidLeaveDays),
  };
}

export function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}
