"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

function revalidateTeams() {
  revalidatePath("/dashboard/employer/teams");
  revalidatePath("/dashboard/worktree");
  revalidatePath("/dashboard/onboarding");
}

async function assertTeamScope(teamId: string, employerId: string) {
  const supabase = getSupabaseAdmin();
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("employer_id", employerId)
    .single();
  if (!team) throw new Error("Team is outside your employer scope.");
}

async function assertEmployeeScope(employeeId: string, employerId: string) {
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("employer_id", employerId)
    .single();
  if (!employee) throw new Error("Employee is outside your employer scope.");
}

export async function createTeamAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not linked.");

  const name = requireString(formData, "name");
  const managerEmployeeId = optionalString(formData, "manager_employee_id");
  if (managerEmployeeId) await assertEmployeeScope(managerEmployeeId, employerId);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      employer_id: employerId,
      name,
      manager_employee_id: managerEmployeeId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create team.");
  await writeAudit(session.user, "create_team", "team", data.id);
  revalidateTeams();
}

export async function updateTeamAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not linked.");

  const teamId = requireString(formData, "team_id");
  const managerEmployeeId = optionalString(formData, "manager_employee_id");
  await assertTeamScope(teamId, employerId);
  if (managerEmployeeId) await assertEmployeeScope(managerEmployeeId, employerId);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("teams")
    .update({
      name: requireString(formData, "name"),
      manager_employee_id: managerEmployeeId,
    })
    .eq("id", teamId)
    .eq("employer_id", employerId);

  if (error) throw new Error(error.message);
  await writeAudit(session.user, "update_team", "team", teamId);
  revalidateTeams();
}

export async function deleteTeamAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not linked.");

  const teamId = requireString(formData, "team_id");
  await assertTeamScope(teamId, employerId);
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("team_members")
    .select("employee_id", { count: "exact", head: true })
    .eq("team_id", teamId);
  if ((count ?? 0) > 0 && optionalString(formData, "confirm_delete") !== "true") {
    throw new Error("Remove team members or confirm deletion before deleting this team.");
  }
  await supabase.from("team_members").delete().eq("team_id", teamId);
  const { error } = await supabase.from("teams").delete().eq("id", teamId).eq("employer_id", employerId);
  if (error) throw new Error(error.message);
  await writeAudit(session.user, "delete_team", "team", teamId);
  revalidateTeams();
}

export async function addTeamMemberAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not linked.");

  const teamId = requireString(formData, "team_id");
  const employeeId = requireString(formData, "employee_id");
  await assertTeamScope(teamId, employerId);
  await assertEmployeeScope(employeeId, employerId);

  const supabase = getSupabaseAdmin();
  const { error: deleteError } = await supabase
    .from("team_members")
    .delete()
    .eq("employee_id", employeeId)
    .neq("team_id", teamId);
  if (deleteError) throw new Error(deleteError.message);

  await supabase.from("team_members").upsert(
    {
      team_id: teamId,
      employee_id: employeeId,
      role_in_team: optionalString(formData, "role_in_team"),
    },
    { onConflict: "team_id,employee_id" },
  );
  await supabase.from("employees").update({ team_id: teamId }).eq("id", employeeId);
  await writeAudit(session.user, "move_team_member", "team", teamId, { employee_id: employeeId });
  revalidateTeams();
}

export async function removeTeamMemberAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not linked.");

  const teamId = requireString(formData, "team_id");
  const employeeId = requireString(formData, "employee_id");
  await assertTeamScope(teamId, employerId);
  await assertEmployeeScope(employeeId, employerId);

  const supabase = getSupabaseAdmin();
  await supabase.from("team_members").delete().eq("team_id", teamId).eq("employee_id", employeeId);
  await supabase.from("employees").update({ team_id: null }).eq("id", employeeId).eq("team_id", teamId);
  await writeAudit(session.user, "remove_team_member", "team", teamId, { employee_id: employeeId });
  revalidateTeams();
}
