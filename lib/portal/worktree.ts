import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";
import type { Database } from "@/lib/supabase/database.types";

type EmployerRow = Database["public"]["Tables"]["employers"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
type TeamMemberRow = Database["public"]["Tables"]["team_members"]["Row"];

export type WorktreeEmployeeNode = EmployeeRow & {
  initials: string;
  teamRole: string | null;
};

export type WorktreeTeamNode = {
  id: string;
  name: string;
  manager: WorktreeEmployeeNode | null;
  employees: WorktreeEmployeeNode[];
  isFallback: boolean;
};

export type WorktreeModel = {
  employer: EmployerRow;
  teams: WorktreeTeamNode[];
  ungroupedEmployees: WorktreeEmployeeNode[];
};

export type WorktreePageData = {
  mode: "admin" | "employer" | "employee";
  model: WorktreeModel | null;
  employers: EmployerRow[];
  employerIndex: number;
  employerCount: number;
  employeeSelf: WorktreeEmployeeNode | null;
  error: string | null;
};

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}

function toEmployeeNode(
  employee: EmployeeRow,
  teamRole: string | null = null,
): WorktreeEmployeeNode {
  return {
    ...employee,
    initials: initials(employee.full_name, employee.email),
    teamRole,
  };
}

export function buildWorktreeModel({
  employer,
  employees,
  teams,
  teamMembers,
}: {
  employer: EmployerRow;
  employees: EmployeeRow[];
  teams: TeamRow[];
  teamMembers: TeamMemberRow[];
}): WorktreeModel {
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const assignedEmployeeIds = new Set<string>();
  const membersByTeam = new Map<string, TeamMemberRow[]>();

  for (const member of teamMembers) {
    const current = membersByTeam.get(member.team_id) ?? [];
    current.push(member);
    membersByTeam.set(member.team_id, current);
    assignedEmployeeIds.add(member.employee_id);
  }

  const explicitTeams: WorktreeTeamNode[] = teams.map((team) => {
    if (team.manager_employee_id) {
      assignedEmployeeIds.add(team.manager_employee_id);
    }

    const manager = team.manager_employee_id
      ? employeesById.get(team.manager_employee_id)
      : null;
    const members = (membersByTeam.get(team.id) ?? [])
      .map((member) => {
        const employee = employeesById.get(member.employee_id);
        return employee ? toEmployeeNode(employee, member.role_in_team) : null;
      })
      .filter((employee): employee is WorktreeEmployeeNode => Boolean(employee))
      .filter((employee) => employee.id !== team.manager_employee_id);

    return {
      id: team.id,
      name: team.name,
      manager: manager ? toEmployeeNode(manager, "Team lead") : null,
      employees: members,
      isFallback: false,
    };
  });

  const fallbackGroups = new Map<string, EmployeeRow[]>();
  for (const employee of employees) {
    if (assignedEmployeeIds.has(employee.id)) continue;
    const groupName = employee.department?.trim() || "Unassigned";
    fallbackGroups.set(groupName, [...(fallbackGroups.get(groupName) ?? []), employee]);
  }

  const fallbackTeams: WorktreeTeamNode[] = [...fallbackGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, groupEmployees]) => ({
      id: `department:${name}`,
      name,
      manager: null,
      employees: groupEmployees.map((employee) => toEmployeeNode(employee)),
      isFallback: true,
    }));

  return {
    employer,
    teams: [...explicitTeams, ...fallbackTeams],
    ungroupedEmployees: [],
  };
}

async function fetchEmployerTree(employer: EmployerRow): Promise<WorktreeModel> {
  const supabase = getSupabaseAdmin();
  const [employees, teams] = await Promise.all([
    supabase
      .from("employees")
      .select("*")
      .eq("employer_id", employer.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("teams")
      .select("*")
      .eq("employer_id", employer.id)
      .order("name", { ascending: true }),
  ]);

  if (employees.error) throw new Error(employees.error.message);
  if (teams.error) throw new Error(teams.error.message);

  const teamIds = (teams.data ?? []).map((team) => team.id);
  const teamMembers =
    teamIds.length === 0
      ? { data: [] as TeamMemberRow[], error: null }
      : await supabase
          .from("team_members")
          .select("*")
          .in("team_id", teamIds)
          .order("created_at", { ascending: true });

  if (teamMembers.error) throw new Error(teamMembers.error.message);

  return buildWorktreeModel({
    employer,
    employees: employees.data ?? [],
    teams: teams.data ?? [],
    teamMembers: teamMembers.data ?? [],
  });
}

function parseEmployerIndex(value: string | string[] | undefined, count: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const index = Number.parseInt(raw ?? "0", 10);

  if (!Number.isFinite(index) || Number.isNaN(index)) return 0;
  return Math.max(0, Math.min(count - 1, index));
}

export async function getWorktreeData(
  session: PortalSession,
  searchParams: Record<string, string | string[] | undefined> = {},
): Promise<WorktreePageData> {
  const supabase = getSupabaseAdmin();

  if (isPlatformAdmin(session.user.role)) {
    const { data: employers, error } = await supabase
      .from("employers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    const employerList = employers ?? [];
    const employerIndex = parseEmployerIndex(searchParams.employer, employerList.length);
    const employer = employerList[employerIndex] ?? null;

    return {
      mode: "admin",
      model: employer ? await fetchEmployerTree(employer) : null,
      employers: employerList,
      employerIndex,
      employerCount: employerList.length,
      employeeSelf: null,
      error: employer ? null : "No employers are available for Worktree yet.",
    };
  }

  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) {
      return {
        mode: "employer",
        model: null,
        employers: [],
        employerIndex: 0,
        employerCount: 0,
        employeeSelf: null,
        error: "Your employer account is not linked yet.",
      };
    }

    const { data: employer, error } = await supabase
      .from("employers")
      .select("*")
      .eq("id", session.user.employer_id)
      .single();

    if (error || !employer) throw new Error(error?.message ?? "Employer not found.");

    return {
      mode: "employer",
      model: await fetchEmployerTree(employer),
      employers: [employer],
      employerIndex: 0,
      employerCount: 1,
      employeeSelf: null,
      error: null,
    };
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .select("*")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!employee) {
    return {
      mode: "employee",
      model: null,
      employers: [],
      employerIndex: 0,
      employerCount: 0,
      employeeSelf: null,
      error: "Your employee profile is not linked yet.",
    };
  }

  const { data: employer } = await supabase
    .from("employers")
    .select("*")
    .eq("id", employee.employer_id)
    .single();

  return {
    mode: "employee",
    model: employer
      ? buildWorktreeModel({
          employer,
          employees: [employee],
          teams: [],
          teamMembers: [],
        })
      : null,
    employers: employer ? [employer] : [],
    employerIndex: 0,
    employerCount: employer ? 1 : 0,
    employeeSelf: toEmployeeNode(employee),
    error: null,
  };
}
