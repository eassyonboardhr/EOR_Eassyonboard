function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function validateResignationReason(value: string | null | undefined) {
  const reason = value?.trim() ?? "";
  if (!reason) throw new Error("Reason is required.");
  if (reason.length < 5) throw new Error("Reason must be at least 5 characters.");
  return reason;
}

export function validateNoticePeriodDays(value: string | null | undefined) {
  const days = Number(value);
  if (!Number.isFinite(days)) throw new Error("Notice period days must be a number.");
  if (days < 0) throw new Error("Notice period days must be zero or more.");
  return Math.floor(days);
}

export function calculateLastWorkingDay(approvalDate: string, noticePeriodDays: number) {
  const date = parseIsoDate(approvalDate);
  date.setUTCDate(date.getUTCDate() + noticePeriodDays);
  return formatIsoDate(date);
}

export function canCompleteOffboarding(
  lastWorkingDay: string,
  today = new Date().toISOString().slice(0, 10),
) {
  return lastWorkingDay <= today;
}

export function calculateMonthlySalaryFromHourly(
  hourlyBillingRate: number,
  hoursPerWeek: number,
  weeksPerYear: number,
) {
  if (hourlyBillingRate <= 0) {
    throw new Error("Employer billing / hr must be greater than zero.");
  }
  if (hoursPerWeek <= 0) throw new Error("Hours per week must be greater than zero.");
  if (weeksPerYear <= 0) throw new Error("Weeks per year must be greater than zero.");

  const annualSalary = hourlyBillingRate * hoursPerWeek * weeksPerYear;
  return Math.round((annualSalary / 12) * 100) / 100;
}
