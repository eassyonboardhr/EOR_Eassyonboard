import { describe, expect, test } from "vitest";
import {
  buildDraftTeamLayout,
  moveEmployeeInDraftAssignments,
  resetDraftAssignments,
} from "@/components/worktree/worktree-dnd-helpers";

const employees = [
  { id: "employee_1", full_name: "Asha", email: "asha@example.com" },
  { id: "employee_2", full_name: "Ben", email: "ben@example.com" },
  { id: "employee_3", full_name: "Chen", email: "chen@example.com" },
];

const teams = [
  { id: "team_1", name: "Engineering" },
  { id: "team_2", name: "Operations" },
];

describe("worktree draft assignment helpers", () => {
  test("moves an employee to a target team without mutating the original draft", () => {
    const draft = { employee_1: "", employee_2: "team_1" };
    const next = moveEmployeeInDraftAssignments(draft, "employee_1", "team_2", new Set(["team_1", "team_2"]));

    expect(next).toEqual({ employee_1: "team_2", employee_2: "team_1" });
    expect(draft).toEqual({ employee_1: "", employee_2: "team_1" });
  });

  test("moves an employee back to unassigned", () => {
    const next = moveEmployeeInDraftAssignments({ employee_1: "team_1" }, "employee_1", null, new Set(["team_1"]));

    expect(next).toEqual({ employee_1: "" });
  });

  test("ignores invalid team drops", () => {
    const draft = { employee_1: "team_1" };
    const next = moveEmployeeInDraftAssignments(draft, "employee_1", "team_other", new Set(["team_1"]));

    expect(next).toBe(draft);
  });

  test("builds a draft layout where each employee appears once", () => {
    const layout = buildDraftTeamLayout(employees, teams, {
      employee_1: "team_1",
      employee_2: "team_1",
      employee_3: "",
    });

    expect(layout.assignedByTeam.get("team_1")?.map((employee) => employee.id)).toEqual([
      "employee_1",
      "employee_2",
    ]);
    expect(layout.assignedByTeam.get("team_2")).toEqual([]);
    expect(layout.unassignedEmployees.map((employee) => employee.id)).toEqual(["employee_3"]);

    const renderedIds = [
      ...layout.unassignedEmployees.map((employee) => employee.id),
      ...[...layout.assignedByTeam.values()].flat().map((employee) => employee.id),
    ];
    expect(renderedIds.sort()).toEqual(["employee_1", "employee_2", "employee_3"]);
  });

  test("resets draft assignments from the saved baseline without sharing references", () => {
    const baseline = { employee_1: "team_1", employee_2: "" };
    const reset = resetDraftAssignments(baseline);

    expect(reset).toEqual(baseline);
    expect(reset).not.toBe(baseline);
  });
});
