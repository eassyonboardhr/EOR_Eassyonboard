import Link from "next/link";

import { getEmployeeDirectoryData } from "@/lib/portal/directory";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, formatDate } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function EmployeesDirectoryPage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getEmployeeDirectoryData(session);

  return (
    <PortalShell
      session={session}
      title="Employees"
      subtitle="Review employee status, lifecycle stage, team setup, and role-aware shortcuts."
      wide
    >
      {!data.allowed ? (
        <EmptyState>Employee directory access is limited to admins and employer users.</EmptyState>
      ) : (
        <Panel
          title={session.user.role === "employer_admin" ? "My employees" : "Employee directory"}
          description={session.user.role === "employer_admin" ? "Employees are scoped to your employer account." : "All employees across client companies."}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-3 pr-4">Employee</th>
                  <th className="py-3 pr-4">Employer</th>
                  <th className="py-3 pr-4">Team</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Lifecycle</th>
                  <th className="py-3 pr-4">Start / Notice</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-950 dark:text-slate-100">{employee.full_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{employee.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{employee.job_title ?? "Job title not set"}</p>
                    </td>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{employee.employers?.name ?? "Employer not linked"}</td>
                    <td className="py-4 pr-4">
                      <p className="text-slate-700 dark:text-slate-300">{employee.teams?.name ?? employee.department ?? "No team"}</p>
                    </td>
                    <td className="py-4 pr-4"><StatusBadge value={employee.status} /></td>
                    <td className="py-4 pr-4"><StatusBadge value={employee.lifecycle_status} /></td>
                    <td className="py-4 pr-4">
                      <p className="text-slate-700 dark:text-slate-300">{formatDate(employee.start_date)}</p>
                      <p className="mt-1 text-xs text-slate-500">{employee.notice_period_days ?? 0} day notice</p>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href={`/dashboard/worktree/actions/employee/${employee.id}/details`}>
                          Details
                        </Link>
                        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href={`/dashboard/worktree/actions/employee/${employee.id}/docs`}>
                          Docs
                        </Link>
                        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href={`/dashboard/finances?employee=${employee.id}`}>
                          Finances
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.employees.length === 0 ? <EmptyState>No employees found.</EmptyState> : null}
        </Panel>
      )}
    </PortalShell>
  );
}
