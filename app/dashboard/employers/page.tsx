import Link from "next/link";

import {
  approveLeadAction,
  createEmployerInviteAction,
  rejectLeadAction,
} from "@/lib/portal/actions/employer";
import { deactivateEmployerAction } from "@/lib/portal/actions/deactivation";
import { getEmployerDirectoryData } from "@/lib/portal/directory";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import {
  EmptyState,
  Panel,
  PortalShell,
  StatusBadge,
  SubmitButton,
  TextArea,
  TextInput,
  formatDate,
} from "@/components/portal/ui";

export const dynamic = "force-dynamic";

const tabs = [
  ["directory", "Directory"],
  ["create", "Create Employer"],
  ["leads", "Leads"],
  ["deactivate", "Deactivate"],
] as const;

function TabNav({ active }: { active: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {tabs.map(([value, label]) => (
        <Link
          key={value}
          href={`/dashboard/employers?tab=${value}`}
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

export default async function EmployersDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = searchParams ? await searchParams : {};
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const activeTab = tabs.some(([value]) => value === requestedTab) ? requestedTab ?? "directory" : "directory";
  const data = await getEmployerDirectoryData(session);
  const admin = isPlatformAdmin(session.user.role);

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
        <div className="grid gap-5">
          {admin ? <TabNav active={activeTab} /> : null}

          {activeTab === "directory" ? (
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
          ) : null}

          {activeTab === "create" && admin ? (
            <Panel
              title="Create employer"
              description="Create an active employer account and send the company admin a Clerk email invitation."
            >
              <form action={createEmployerInviteAction} className="grid gap-4 lg:grid-cols-3">
                <TextInput name="company_name" label="Company name" required />
                <TextInput name="contact_name" label="Contact person" />
                <TextInput name="email" label="Admin email" type="email" required />
                <div className="lg:col-span-3">
                  <SubmitButton pendingText="Creating...">Create and invite</SubmitButton>
                </div>
              </form>
            </Panel>
          ) : null}

          {activeTab === "leads" && admin ? (
            <Panel title="Employer leads" description="Public signups wait here until an admin approves or rejects them.">
              <div className="grid gap-3">
                {data.leads.length === 0 ? <EmptyState>No employer leads yet.</EmptyState> : null}
                {data.leads.map((lead) => (
                  <div key={lead.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1fr_auto] dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{lead.company_name ?? lead.email}</h3>
                        <StatusBadge value={lead.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{lead.contact_name ?? "No contact name"} - {lead.email}</p>
                      {lead.message ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{lead.message}</p> : null}
                    </div>
                    {lead.status === "pending" ? (
                      <div className="flex gap-2">
                        <form action={approveLeadAction}>
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <SubmitButton pendingText="Approving...">Approve</SubmitButton>
                        </form>
                        <form action={rejectLeadAction}>
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <SubmitButton tone="danger" pendingText="Rejecting...">Reject</SubmitButton>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {activeTab === "deactivate" && admin ? (
            <Panel title="Deactivate employer" description="Strict safeguard: deactivation is allowed only after no active employees and no pending or unpaid bills remain.">
              <div className="grid gap-3">
                {data.employers.map((employer) => (
                  <div key={employer.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1fr_auto] dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950 dark:text-slate-100">{employer.name}</p>
                        <StatusBadge value={employer.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {employer.deactivation_status.activeEmployeeCount ?? 0} active employees - {employer.deactivation_status.pendingBillCount ?? 0} pending bills
                      </p>
                      {employer.deactivation_status.blockers.length > 0 ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700">{employer.deactivation_status.blockers.join("; ")}</p>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-emerald-700">Ready for deactivation.</p>
                      )}
                    </div>
                    <form action={deactivateEmployerAction} className="grid gap-2 sm:min-w-72">
                      <input type="hidden" name="employer_id" value={employer.id} />
                      <TextArea name="reason" label="Reason" required />
                      <SubmitButton tone="danger" pendingText="Deactivating...">
                        Deactivate
                      </SubmitButton>
                    </form>
                  </div>
                ))}
                {data.employers.length === 0 ? <EmptyState>No employers found.</EmptyState> : null}
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </PortalShell>
  );
}
