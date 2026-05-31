import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalSession } from "@/lib/portal/types";
import type { Database } from "@/lib/supabase/database.types";

export type HolidayCalendarRequest =
  Database["public"]["Tables"]["holiday_calendar_change_requests"]["Row"] & {
    employers?: { id: string; name: string } | null;
  };

export async function getEmployerHolidayCalendarData(session: PortalSession) {
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not active.");

  const supabase = getSupabaseAdmin();
  const [holidays, weeklyOffs, overrides, requests] = await Promise.all([
    supabase
      .from("holidays")
      .select("*")
      .or(`employer_id.eq.${employerId},employer_id.is.null`)
      .order("date", { ascending: true }),
    supabase
      .from("weekly_off_rules")
      .select("*")
      .eq("employer_id", employerId)
      .eq("active", true)
      .order("effective_from", { ascending: false }),
    supabase
      .from("holiday_overrides")
      .select("*")
      .eq("employer_id", employerId)
      .order("date", { ascending: true }),
    supabase
      .from("holiday_calendar_change_requests")
      .select("*")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (holidays.error) throw new Error(holidays.error.message);
  if (weeklyOffs.error) throw new Error(weeklyOffs.error.message);
  if (overrides.error) throw new Error(overrides.error.message);
  if (requests.error) throw new Error(requests.error.message);

  const weeklyOffByDay = new Map<number, boolean>();
  for (const rule of weeklyOffs.data ?? []) {
    if (!weeklyOffByDay.has(rule.weekday)) {
      weeklyOffByDay.set(rule.weekday, rule.is_weekly_off);
    }
  }

  return {
    holidays: holidays.data ?? [],
    weeklyOffRules: weeklyOffs.data ?? [],
    activeWeeklyOffWeekdays:
      weeklyOffByDay.size > 0
        ? Array.from(weeklyOffByDay.entries())
            .filter(([, enabled]) => enabled)
            .map(([weekday]) => weekday)
        : [0, 6],
    overrides: overrides.data ?? [],
    requests: requests.data ?? [],
  };
}

export async function getAdminHolidayCalendarRequestsData() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("holiday_calendar_change_requests")
    .select("*, employers(id, name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return {
    requests: (data ?? []) as unknown as HolidayCalendarRequest[],
  };
}
