import Link from "next/link";
import {
  addTeamMemberAction,
  createTeamAction,
  deleteTeamAction,
  removeTeamMemberAction,
  updateTeamAction,
} from "@/lib/portal/actions/team-management";
import { getTeamManagementData } from "@/lib/portal/team-management";
import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/ui";

type Row = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  name?: string | null;
  manager_employee_id?: string | null;
  team_id?: string;
  employee_id?: string;
  role_in_team?: string | null;
};

function SelectEmployee({
  name,
  employees,
  defaultValue,
  includeEmpty = true,
}: {
  name: string;
  employees: Row[];
  defaultValue?: string | null;
  includeEmpty?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
      {includeEmpty ? <option value="">Select employee</option> : null}
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.full_name ?? employee.email} {employee.job_title ? `- ${employee.job_title}` : ""}
        </option>
      ))}
    </select>
  );
}

export default async function EmployerTeamsPage() {
  const session = await requirePortalRole(["employer_admin"]);
  const data = await getTeamManagementData(session);
  const employees = data.employees as Row[];
  const teams = data.teams as Row[];
  const members = data.members as Row[];

  return (
    <PortalShell
      session={session}
      title="Team Management"
      subtitle="Create the departments and team structure that appears in Worktree."
      wide
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <span>Teams, managers, and members saved here are reflected in Worktree immediately.</span>
          <Link href="/dashboard/worktree" className="font-semibold text-blue-700">Open Worktree</Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Create Team / Department</h2>
          <form action={createTeamAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Team name
              <input name="name" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Team manager
              <SelectEmployee name="manager_employee_id" employees={employees} />
            </label>
            <div className="pt-6">
              <button className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Create</button>
            </div>
          </form>
        </section>

        <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Teams</h2>
            <div className="mt-4 grid gap-2">
              {teams.map((team) => (
                <a key={team.id} href={`#team-${team.id}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  {team.name}
                </a>
              ))}
              {teams.length === 0 ? <p className="text-sm text-slate-500">No teams yet.</p> : null}
            </div>
          </div>
          <div className="grid gap-5">
          {teams.map((team) => {
            const teamMembers = members.filter((member) => member.team_id === team.id);
            const manager = employees.find((employee) => employee.id === team.manager_employee_id);
            return (
              <div key={team.id} id={`team-${team.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">{team.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Manager: {manager?.full_name ?? manager?.email ?? "Not assigned"}
                    </p>
                  </div>
                  <form action={deleteTeamAction}>
                    <input type="hidden" name="team_id" value={team.id} />
                    {teamMembers.length > 0 ? (
                      <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-rose-700">
                        <input type="checkbox" name="confirm_delete" value="true" />
                        Confirm
                      </label>
                    ) : null}
                    <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                      Delete
                    </button>
                  </form>
                </div>

                <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4" open>
                  <summary className="cursor-pointer text-sm font-bold text-slate-800">Edit team</summary>
                  <form action={updateTeamAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="team_id" value={team.id} />
                    <input name="name" defaultValue={team.name ?? ""} required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
                    <SelectEmployee name="manager_employee_id" employees={employees} defaultValue={team.manager_employee_id} />
                    <button className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Save</button>
                  </form>
                </details>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-950">Manager and members</p>
                  {manager ? (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">Team head</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{manager.full_name ?? manager.email}</p>
                      <p className="text-xs text-slate-500">{manager.job_title ?? "Manager"}</p>
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2">
                    {teamMembers.map((member) => {
                      const employee = employees.find((item) => item.id === member.employee_id);
                      return (
                        <div key={`${member.team_id}-${member.employee_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{employee?.full_name ?? employee?.email ?? "Employee"}</p>
                            <p className="text-xs text-slate-500">{member.role_in_team ?? employee?.job_title ?? "Team member"}</p>
                          </div>
                          <form action={removeTeamMemberAction}>
                            <input type="hidden" name="team_id" value={team.id} />
                            <input type="hidden" name="employee_id" value={String(member.employee_id)} />
                            <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">Remove</button>
                          </form>
                        </div>
                      );
                    })}
                    {teamMembers.length === 0 ? <p className="text-sm text-slate-500">No employees added yet.</p> : null}
                  </div>
                </div>

                <form action={addTeamMemberAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="team_id" value={team.id} />
                  <SelectEmployee name="employee_id" employees={employees} includeEmpty />
                  <input name="role_in_team" placeholder="Role in team" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
                  <button className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Add / Move</button>
                </form>
              </div>
            );
          })}
          {teams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
              Create your first team to start shaping the Worktree.
            </div>
          ) : null}
          </div>
          <aside className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
            <h2 className="text-base font-semibold">Worktree Structure</h2>
            <p className="mt-2">Create teams, choose a manager, then add members with their team roles. This page is the source of truth for the Worktree chart.</p>
            <Link href="/dashboard/worktree" className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Preview Worktree</Link>
          </aside>
        </section>
      </div>
    </PortalShell>
  );
}
