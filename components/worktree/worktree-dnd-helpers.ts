export type DraftAssignmentMap = Record<string, string>;
export type DraftEmployee = {
  id: string;
};
export type DraftTeam = {
  id: string;
};

export function moveEmployeeInDraftAssignments(
  draftAssignments: DraftAssignmentMap,
  employeeId: string,
  targetTeamId: string | null,
  validTeamIds: Set<string>,
) {
  const normalizedTeamId = targetTeamId ?? "";
  if (normalizedTeamId && !validTeamIds.has(normalizedTeamId)) return draftAssignments;

  return {
    ...draftAssignments,
    [employeeId]: normalizedTeamId,
  };
}

export function resetDraftAssignments(baselineAssignments: DraftAssignmentMap) {
  return { ...baselineAssignments };
}

export function buildDraftTeamLayout<Employee extends DraftEmployee, Team extends DraftTeam>(
  employees: Employee[],
  teams: Team[],
  draftAssignments: DraftAssignmentMap,
) {
  const validTeamIds = new Set(teams.map((team) => team.id));
  const assignedByTeam = new Map<string, Employee[]>(teams.map((team) => [team.id, []]));
  const unassignedEmployees: Employee[] = [];

  for (const employee of employees) {
    const teamId = draftAssignments[employee.id] ?? "";
    if (teamId && validTeamIds.has(teamId)) {
      assignedByTeam.set(teamId, [...(assignedByTeam.get(teamId) ?? []), employee]);
    } else {
      unassignedEmployees.push(employee);
    }
  }

  return {
    assignedByTeam,
    unassignedEmployees,
  };
}
