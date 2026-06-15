import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("worktree tabs", () => {
  test("worktree route supports query-param tabs and defaults invalid values to worktree", () => {
    const source = readFileSync("app/dashboard/worktree/page.tsx", "utf8");

    expect(source).toContain('return tab === "teams" ? "teams" : "worktree"');
    expect(source).toContain("activeTab={activeTab}");
  });

  test("employee self view returns before rendering management tabs", () => {
    const source = readFileSync("components/worktree/worktree-client.tsx", "utf8");
    const employeeReturn = source.indexOf('if (data.mode === "employee" && data.employeeSelf)');
    const tabReturn = source.indexOf("<WorktreeTabs");

    expect(employeeReturn).toBeGreaterThan(-1);
    expect(tabReturn).toBeGreaterThan(-1);
    expect(employeeReturn).toBeLessThan(tabReturn);
  });

  test("teams manager keeps drag/drop, bulk save, and dropdown fallback wired", () => {
    const source = readFileSync("components/worktree/worktree-teams-manager.tsx", "utf8");

    expect(source).toContain("DndContext");
    expect(source).toContain("bulkUpdateEmployeeTeamAssignmentsAction");
    expect(source).toContain("Move using dropdown");
    expect(source).toContain("Dragging only stages changes. Click Save assignments to update the portal.");
  });
});
