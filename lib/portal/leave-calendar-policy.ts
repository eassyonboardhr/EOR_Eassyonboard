import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { LeaveCalendarPolicy } from "@/lib/portal/leave-utils";

export type ApprovedLeaveCalendarPolicy = {
  holidays: Array<{ date: string; name: string }>;
  weeklyOffWeekdays: number[];
  weeklyOffRules: Array<{
    weekday: number;
    isWeeklyOff: boolean;
    effectiveFrom: string;
  }>;
  workingDayOverrides: string[];
  holidayOverrides: string[];
};

export async function getApprovedLeaveCalendarPolicy(
  employerId: string,
  startDate?: string,
  endDate?: string,
): Promise<ApprovedLeaveCalendarPolicy> {
  const supabase = getSupabaseAdmin();
  let holidayQuery = supabase
    .from("holidays")
    .select("date, name")
    .or(`employer_id.eq.${employerId},employer_id.is.null`)
    .order("date", { ascending: true });
  let overrideQuery = supabase
    .from("holiday_overrides")
    .select("date, override_type")
    .eq("employer_id", employerId)
    .order("date", { ascending: true });
  let weeklyOffQuery = supabase
    .from("weekly_off_rules")
    .select("weekday, is_weekly_off, effective_from")
    .eq("employer_id", employerId)
    .eq("active", true)
    .order("effective_from", { ascending: false });

  if (startDate) {
    holidayQuery = holidayQuery.gte("date", startDate);
    overrideQuery = overrideQuery.gte("date", startDate);
  }

  if (endDate) {
    holidayQuery = holidayQuery.lte("date", endDate);
    overrideQuery = overrideQuery.lte("date", endDate);
    weeklyOffQuery = weeklyOffQuery.lte("effective_from", endDate);
  }

  const [holidays, weeklyOffs, overrides] = await Promise.all([
    holidayQuery,
    weeklyOffQuery,
    overrideQuery,
  ]);

  if (holidays.error) throw new Error(holidays.error.message);
  if (weeklyOffs.error) throw new Error(weeklyOffs.error.message);
  if (overrides.error) throw new Error(overrides.error.message);

  const weekdayState = new Map<number, boolean>();
  for (const rule of weeklyOffs.data ?? []) {
    if (!weekdayState.has(rule.weekday)) {
      weekdayState.set(rule.weekday, rule.is_weekly_off);
    }
  }

  const weeklyOffWeekdays =
    weekdayState.size > 0
      ? Array.from(weekdayState.entries())
          .filter(([, isWeeklyOff]) => isWeeklyOff)
          .map(([weekday]) => weekday)
      : [0, 6];

  return {
    holidays: holidays.data ?? [],
    weeklyOffWeekdays,
    weeklyOffRules: (weeklyOffs.data ?? []).map((rule) => ({
      weekday: rule.weekday,
      isWeeklyOff: rule.is_weekly_off,
      effectiveFrom: rule.effective_from,
    })),
    workingDayOverrides: (overrides.data ?? [])
      .filter((override) => override.override_type === "working_day")
      .map((override) => override.date),
    holidayOverrides: (overrides.data ?? [])
      .filter((override) => override.override_type === "holiday")
      .map((override) => override.date),
  };
}

export function toLeaveCalendarPolicy(
  policy: ApprovedLeaveCalendarPolicy,
): LeaveCalendarPolicy {
  return {
    weeklyOffWeekdays: policy.weeklyOffWeekdays,
    weeklyOffRules: policy.weeklyOffRules,
    workingDayOverrides: policy.workingDayOverrides,
    holidayOverrides: policy.holidayOverrides,
  };
}
