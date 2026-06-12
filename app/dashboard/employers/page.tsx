import Link from "next/link";

import { getEmployerDirectoryData } from "@/lib/portal/directory";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, formatDate } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function EmployersDirectoryPage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getEmployerDirectoryData(session);

  return (
    <PortalShell
      session={session}
      title="Employers"
      subtitle="Review client companies, account status, workforce counts, and operational shortcuts."
      wide
    >
      {!data.allowed ? (
        <EmptyState>Employer directory access is limited to platform admins.</EmptyState>
      ) : (
        <Panel title="Employer directory" description="Standalone client company view for admin operations.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-3 pr-4">Employer</th>
                  <th className="py-3 pr-4">Contact</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Docs</th>
                  <th className="py-3 pr-4">Employees</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.employers.map((employer) => (
                  <tr key={employer.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-950 dark:text-slate-100">{employer.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{employer.legal_name ?? "Legal name not set"}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-slate-700 dark:text-slate-300">{employer.contact_name ?? "No contact name"}</p>
                      <p className="mt-1 text-xs text-slate-500">{employer.contact_email}</p>
                    </td>
                    <td className="py-4 pr-4"><StatusBadge value={employer.status} /></td>
                    <td className="py-4 pr-4">
                      <StatusBadge value={employer.document_completion_status.label} />
                      {employer.document_completion_status.status !== "docs_complete" ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {employer.document_completion_status.missing} missing required company doc(s)
                        </p>
                      ) : null}
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-950 dark:text-slate-100">{employer.employee_count}</p>
                      <p className="mt-1 text-xs text-slate-500">{employer.active_employee_count} active</p>
                    </td>
                    <td className="py-4 pr-4 text-slate-600 dark:text-slate-400">{formatDate(employer.created_at)}</td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href={`/dashboard/worktree/actions/employer/${employer.id}/details`}>
                          Details
                        </Link>
                        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href={`/dashboard/finances?employer=${employer.id}`}>
                          Finances
                        </Link>
                        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" href={`/dashboard/onboarding?employer=${employer.id}`}>
                          Onboarding
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.employers.length === 0 ? <EmptyState>No employers found.</EmptyState> : null}
        </Panel>
      )}
    </PortalShell>
  );
}
