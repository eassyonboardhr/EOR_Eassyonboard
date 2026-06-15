"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";
import type { PortalSession } from "@/lib/portal/types";

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

async function assertEmployerExists(employerId: string) {
  const supabase = getSupabaseAdmin();
  const { data: employer } = await supabase
    .from("employers")
    .select("id")
    .eq("id", employerId)
    .single();
  if (!employer) throw new Error("Selected employer is not available.");
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

async function resolveTeamManagementEmployerScope(session: PortalSession, formData: FormData) {
  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) throw new Error("Employer account is not linked.");
    return session.user.employer_id;
  }

  if (isPlatformAdmin(session.user.role)) {
    const employerId = requireString(formData, "employer_id");
    await assertEmployerExists(employerId);
    return employerId;
  }

  throw new Error("You cannot manage team structure.");
}

export async function createTeamAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin"]);
  const employerId = await resolveTeamManagementEmployerScope(session, formData);

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
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin"]);
  const employerId = await resolveTeamManagementEmployerScope(session, formData);

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

type TeamAssignmentInput = {
  employee_id?: unknown;
  team_id?: unknown;
};

function parseTeamAssignments(formData: FormData) {
  const raw = formData.get("assignments");
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("No team assignments were submitted.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Team assignments payload is invalid.");
  }

  if (!Array.isArray(parsed)) throw new Error("Team assignments payload is invalid.");

  return parsed.map((item: TeamAssignmentInput) => {
    if (!item || typeof item !== "object") throw new Error("Team assignments payload is invalid.");
    if (typeof item.employee_id !== "string" || item.employee_id.trim().length === 0) {
      throw new Error("Every assignment must include an employee.");
    }
    if (item.team_id !== null && item.team_id !== undefined && typeof item.team_id !== "string") {
      throw new Error("Team assignment target is invalid.");
    }

    return {
      employeeId: item.employee_id,
      teamId: typeof item.team_id === "string" && item.team_id.trim().length > 0 ? item.team_id : null,
    };
  });
}

export async function bulkUpdateEmployeeTeamAssignmentsAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin"]);
  const employerId = await resolveTeamManagementEmployerScope(session, formData);
  const assignments = parseTeamAssignments(formData);
  if (assignments.length === 0) return { ok: true, message: "No team assignment changes to save." };

  const uniqueEmployeeIds = [...new Set(assignments.map((assignment) => assignment.employeeId))];
  if (uniqueEmployeeIds.length !== assignments.length) {
    throw new Error("Each employee can only appear once in a team assignment save.");
  }

  const uniqueTeamIds = [...new Set(assignments.map((assignment) => assignment.teamId).filter((teamId): teamId is string => Boolean(teamId)))];

  for (const employeeId of uniqueEmployeeIds) {
    await assertEmployeeScope(employeeId, employerId);
  }
  for (const teamId of uniqueTeamIds) {
    await assertTeamScope(teamId, employerId);
  }

  const supabase = getSupabaseAdmin();
  const rpcAssignments = assignments.map((assignment) => ({
    employee_id: assignment.employeeId,
    team_id: assignment.teamId,
  }));
  const { error: rpcError } = await supabase.rpc("bulk_update_employee_team_assignments", {
    p_employer_id: employerId,
    p_assignments: rpcAssignments,
  });
  if (rpcError) throw new Error(rpcError.message);

  await writeAudit(session.user, "bulk_update_team_assignments", "employer", employerId, {
    assignment_count: assignments.length,
  });
  revalidateTeams();
  return { ok: true, message: "Team assignments saved." };
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
