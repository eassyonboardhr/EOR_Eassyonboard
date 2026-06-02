import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalSession } from "@/lib/portal/types";
import { getPortalCounts } from "@/lib/portal/data";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export async function getAttendanceData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  let leaveQuery = supabase.from("leave_requests").select("*, employees(full_name, email, employers(name))").order("created_at", { ascending: false }).limit(50);
  let absenceQuery = supabase.from("employee_absences").select("*, employees(full_name, email, employers(name))").order("date", { ascending: false }).limit(50);
  if (session.user.role === "employee") {
    const { data: employee } = await supabase.from("employees").select("id").eq("portal_user_id", session.user.id).maybeSingle();
    leaveQuery = leaveQuery.eq("employee_id", employee?.id ?? "");
    absenceQuery = absenceQuery.eq("employee_id", employee?.id ?? "");
  } else if (session.user.role === "employer_admin") {
    leaveQuery = leaveQuery.eq("employer_id", session.user.employer_id ?? "");
    absenceQuery = absenceQuery.eq("employer_id", session.user.employer_id ?? "");
  }
  const [{ data: leaves }, { data: absences }] = await Promise.all([leaveQuery, absenceQuery]);
  return { leaves: leaves ?? [], absences: absences ?? [] };
}

export async function getReportsData(session: PortalSession) {
  const counts = await getPortalCounts(session.user.role === "employer_admin" ? session.user.employer_id : null);
  const supabase = getSupabaseAdmin();
  const employerId = session.user.role === "employer_admin" ? session.user.employer_id : null;
  let agreementsQuery = from(supabase, "service_agreements").select("id", { count: "exact", head: true });
  const messagesQuery = from(supabase, "message_participants").select("id", { count: "exact", head: true }).eq("portal_user_id", session.user.id);
  if (employerId) agreementsQuery = agreementsQuery.eq("employer_id", employerId);
  const [{ count: agreements }, { count: messages }] = await Promise.all([agreementsQuery, messagesQuery]);
  return { counts, agreements: agreements ?? 0, messages: messages ?? 0 };
}
