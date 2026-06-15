import Link from "next/link";

import {
  approveEmployeeRequestAction,
  rejectEmployeeRequestAction,
} from "@/lib/portal/actions/employee";
import {
  deactivateEmployeeAction,
  keepEmployeeActiveAction,
} from "@/lib/portal/actions/deactivation";
import { getEmployeeDirectoryData } from "@/lib/portal/directory";
import { getDirectoryRouteRedirect } from "@/lib/portal/directory-route-policy";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, SubmitButton, TextArea, formatDate } from "@/components/portal/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const tabs = [
  ["directory", "Directory"],
  ["requests", "Requests"],
  ["deactivate", "Deactivate"],
] as const;

function TabNav({ active }: { active: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {tabs.map(([value, label]) => (
        <Link
          key={value}
          href={`/dashboard/employees?tab=${value}`}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${
            active === value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export default async function EmployeesDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const redirectHref = getDirectoryRouteRedirect(session.user.role, "employees");
  if (redirectHref) {
    redirect(redirectHref);
  }

  const params = searchParams ? await searchParams : {};
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const activeTab = tabs.some(([value]) => value === requestedTab) ? requestedTab ?? "directory" : "directory";
  const data = await getEmployeeDirectoryData(session);
  const admin = isPlatformAdmin(session.user.role);

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
        <div className="grid gap-5">
          <TabNav active={activeTab} />

          {activeTab === "directory" ? (
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
                      <th className="py-3 pr-4">Docs</th>
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
                        <td className="py-4 pr-4">
                          <StatusBadge value={employee.document_completion_status.label} />
                          {employee.document_completion_status.status !== "docs_complete" ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {employee.document_completion_status.missing} missing - {employee.document_completion_status.pending} pending - {employee.document_completion_status.rejected} rejected
                            </p>
                          ) : null}
                        </td>
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
          ) : null}

          {activeTab === "requests" ? (
            <Panel title="Employee requests" description="Employers request employees here; admins approve before employees can join.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="py-2 pr-4">Employee</th>
                      <th className="py-2 pr-4">Employer</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Requested</th>
                      {admin ? <th className="py-2 pr-4">Action</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {data.employeeRequests.map((request) => (
                      <tr key={request.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{request.full_name}</p>
                          <p className="text-slate-500">{request.email}</p>
                        </td>
                        <td className="py-3 pr-4">{request.employers?.name ?? "Employer"}</td>
                        <td className="py-3 pr-4">{request.job_title ?? "Not set"}</td>
                        <td className="py-3 pr-4"><StatusBadge value={request.status} /></td>
                        <td className="py-3 pr-4">{formatDate(request.created_at)}</td>
                        {admin ? (
                          <td className="py-3 pr-4">
                            {request.status === "pending" ? (
                              <div className="flex gap-2">
                                <form action={approveEmployeeRequestAction}>
                                  <input type="hidden" name="request_id" value={request.id} />
                                  <SubmitButton pendingText="Approving...">Approve</SubmitButton>
                                </form>
                                <form action={rejectEmployeeRequestAction}>
                                  <input type="hidden" name="request_id" value={request.id} />
                                  <SubmitButton tone="danger" pendingText="Rejecting...">Reject</SubmitButton>
                                </form>
                              </div>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.employeeRequests.length === 0 ? <EmptyState>No employee requests yet.</EmptyState> : null}
              </div>
            </Panel>
          ) : null}

          {activeTab === "deactivate" ? (
            <Panel title="Deactivate employee" description="Employees can be deactivated after completed offboarding, after notice completion, or by admin absconding review with a required reason.">
              <div className="grid gap-3">
                {data.employees.map((employee) => (
                  <div key={employee.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 xl:grid-cols-[1fr_360px_300px] dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950 dark:text-slate-100">{employee.full_name}</p>
                        <StatusBadge value={employee.status} />
                        <StatusBadge value={employee.lifecycle_status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{employee.email} - {employee.employers?.name ?? "Employer"}</p>
                      {employee.deactivation_status.canDeactivate ? (
                        <p className="mt-2 text-xs font-semibold text-emerald-700">
                          Eligible: {employee.deactivation_status.eligibleReason?.replaceAll("_", " ") ?? "review ready"}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-amber-700">{employee.deactivation_status.blockers.join("; ")}</p>
                      )}
                    </div>
                    <form action={keepEmployeeActiveAction} className="grid gap-2">
                      <input type="hidden" name="employee_id" value={employee.id} />
                      <TextArea name="reason" label="Keep-active reason" required />
                      <SubmitButton tone="secondary" pendingText="Recording...">Keep Active</SubmitButton>
                    </form>
                    <form action={deactivateEmployeeAction} className="grid gap-2">
                      <input type="hidden" name="employee_id" value={employee.id} />
                      {admin ? (
                        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Deactivation type
                          <select name="deactivation_reason" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                            <option value="exit_completed">Exit completed</option>
                            <option value="absconding">Absconding</option>
                          </select>
                        </label>
                      ) : (
                        <input type="hidden" name="deactivation_reason" value="exit_completed" />
                      )}
                      <TextArea name="reason" label="Deactivation reason" required />
                      <SubmitButton tone="danger" pendingText="Deactivating...">Deactivate</SubmitButton>
                    </form>
                  </div>
                ))}
                {data.employees.length === 0 ? <EmptyState>No employees found.</EmptyState> : null}
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </PortalShell>
  );
}
