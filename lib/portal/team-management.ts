import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalSession } from "@/lib/portal/types";

export async function getTeamManagementData(session: PortalSession) {
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not linked.");

  const supabase = getSupabaseAdmin();
  const [teams, employees, members] = await Promise.all([
    supabase
      .from("teams")
      .select("*")
      .eq("employer_id", employerId)
      .order("name", { ascending: true }),
    supabase
      .from("employees")
      .select("*")
      .eq("employer_id", employerId)
      .order("full_name", { ascending: true }),
    supabase
      .from("team_members")
      .select("*, teams!inner(employer_id)")
      .eq("teams.employer_id", employerId)
      .order("created_at", { ascending: true }),
  ]);

  if (teams.error) throw new Error(teams.error.message);
  if (employees.error) throw new Error(employees.error.message);
  if (members.error) throw new Error(members.error.message);

  return {
    teams: teams.data ?? [],
    employees: employees.data ?? [],
    members: members.data ?? [],
  };
}
