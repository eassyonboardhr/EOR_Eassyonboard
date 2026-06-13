import { describe, expect, test, vi } from "vitest";
import { buildWorktreeModel } from "@/lib/portal/worktree";

vi.mock("server-only", () => ({}));

const employer = {
  id: "employer_1",
  name: "Acme Corporation",
  legal_name: null,
  contact_name: "Priya",
  contact_email: "priya@acme.example",
  status: "active",
  approved_by: null,
  approved_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  clientCompany: null,
  employmentDefaults: null,
  complianceSettings: null,
  companyDocumentCount: 0,
  templateCount: 0,
} as const;

const employees = [
  {
    id: "employee_manager",
    employer_id: "employer_1",
    portal_user_id: "portal_manager",
    full_name: "Mira Manager",
    email: "mira@example.com",
    job_title: "Engineering Lead",
    department: "Engineering",
    status: "active",
    lifecycle_status: "active",
    start_date: null,
    employer_setup_completed_at: null,
    employer_setup_completed_by: null,
    employer_setup_notes: null,
    leave_policy_id: null,
    manager_employee_id: null,
    notice_period_days: null,
    team_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "employee_member",
    employer_id: "employer_1",
    portal_user_id: "portal_member",
    full_name: "Dev Member",
    email: "dev@example.com",
    job_title: "Developer",
    department: "Engineering",
    status: "active",
    lifecycle_status: "active",
    start_date: null,
    employer_setup_completed_at: null,
    employer_setup_completed_by: null,
    employer_setup_notes: null,
    leave_policy_id: null,
    manager_employee_id: null,
    notice_period_days: null,
    team_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "employee_department",
    employer_id: "employer_1",
    portal_user_id: "portal_ops",
    full_name: "Ops Person",
    email: "ops@example.com",
    job_title: "Ops Analyst",
    department: "Operations",
    status: "active",
    lifecycle_status: "active",
    start_date: null,
    employer_setup_completed_at: null,
    employer_setup_completed_by: null,
    employer_setup_notes: null,
    leave_policy_id: null,
    manager_employee_id: null,
    notice_period_days: null,
    team_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
] as const;

describe("buildWorktreeModel", () => {
  test("combines explicit teams with department fallback groups", () => {
    const model = buildWorktreeModel({
      employer,
      employees: [...employees],
      teams: [
        {
          id: "team_1",
          employer_id: "employer_1",
          name: "Engineering Team",
          manager_employee_id: "employee_manager",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      teamMembers: [
        {
          id: "member_1",
          team_id: "team_1",
          employee_id: "employee_member",
          role_in_team: "Frontend",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(model.teams).toHaveLength(2);
    expect(model.teams[0]).toMatchObject({
      id: "team_1",
      name: "Engineering Team",
      manager: { id: "employee_manager" },
    });
    expect(model.teams[0].employees.map((employee) => employee.id)).toEqual([
      "employee_member",
    ]);
    expect(model.teams[1]).toMatchObject({
      id: "department:Operations",
      name: "Operations",
      isFallback: true,
    });
    expect(model.teams[1].employees.map((employee) => employee.id)).toEqual([
      "employee_department",
    ]);
  });
});
