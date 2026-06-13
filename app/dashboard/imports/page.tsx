import Link from "next/link";

import { importInvoiceGeneratorCompanyAction } from "@/lib/portal/actions/imports";
import { getInvoiceGeneratorImportQueue, getInvoiceGeneratorImportReview } from "@/lib/portal/imports";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, SubmitButton, TextInput, formatDate } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

function encodeCompany(value: string) {
  return encodeURIComponent(value);
}

async function importCompanyFormAction(formData: FormData) {
  "use server";
  await importInvoiceGeneratorCompanyAction(formData);
}

export default async function ImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const params = searchParams ? await searchParams : {};
  const externalCompanyId = Array.isArray(params.company) ? params.company[0] : params.company;
  const queue = await getInvoiceGeneratorImportQueue();
  const review = externalCompanyId ? await getInvoiceGeneratorImportReview(externalCompanyId) : null;

  return (
    <PortalShell
      session={session}
      title="Imports"
      subtitle="Review Invoice Generator companies, create pending portal onboarding records, and map historical finance data."
      wide
    >
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel title="Invoice Generator Queue" description="Synced companies stay staged until an admin imports them.">
          <div className="grid gap-3">
            {queue.map((company) => (
              <Link
                key={company.externalCompanyId}
                href={`/dashboard/imports?company=${encodeCompany(company.externalCompanyId)}`}
                className={`rounded-xl border p-4 text-sm shadow-sm transition ${
                  company.externalCompanyId === externalCompanyId
                    ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                    : "border-slate-200 bg-white hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-slate-100">{company.companyName}</p>
                    <p className="mt-1 text-xs text-slate-500">External ID: {company.externalCompanyId}</p>
                  </div>
                  <StatusBadge value={company.importStatus} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <span>{company.employeeCount} employees</span>
                  <span>{company.invoiceCount} invoices</span>
                  <span>{formatDate(company.lastSyncedAt)}</span>
                </div>
                {company.suggestedEmployerName ? (
                  <p className="mt-2 text-xs font-semibold text-blue-700">Suggested: {company.suggestedEmployerName}</p>
                ) : null}
              </Link>
            ))}
            {queue.length === 0 ? <EmptyState>No Invoice Generator companies have synced yet.</EmptyState> : null}
          </div>
        </Panel>

        {review ? (
          <Panel
            title={`Review Import: ${review.company.companyName}`}
            description="Create or link the employer, select employees, add emails, and send invites."
          >
            <form action={importCompanyFormAction} className="grid gap-5">
              <input type="hidden" name="source_key" value={review.company.sourceKey} />
              <input type="hidden" name="external_company_id" value={review.company.externalCompanyId} />

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Employer action
                  <select name="employer_mode" defaultValue={review.company.employerId ? "link" : "create"} className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                    <option value="create">Create pending employer</option>
                    <option value="link">Link existing employer</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Existing employer
                  <select name="existing_employer_id" defaultValue={review.company.employerId ?? review.company.suggestedEmployerId ?? ""} className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Create new / no link</option>
                    {review.employers.map((employer) => (
                      <option key={employer.id} value={employer.id}>{employer.name}</option>
                    ))}
                  </select>
                </label>
                <TextInput name="employer_admin_email" label="Employer admin email" type="email" />
              </div>

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-950 dark:text-slate-100">Finance available</p>
                <p className="text-slate-600 dark:text-slate-400">
                  {review.financeSummary.invoiceCount} invoices - {review.financeSummary.salaryPaymentCount} salary payments - {review.financeSummary.statementRowCount} statement rows
                </p>
                {review.financeSummary.latestMonth ? <p className="text-xs text-slate-500">Latest month: {review.financeSummary.latestMonth}</p> : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="py-2 pr-4">Import</th>
                      <th className="py-2 pr-4">Employee</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Existing employee</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.employees.map((employee) => (
                      <tr key={employee.externalEmployeeId} className="border-b border-slate-100 align-top dark:border-slate-800">
                        <td className="py-3 pr-4">
                          <input type="checkbox" name="selected_external_employee_id" value={employee.externalEmployeeId} defaultChecked={!employee.employeeId} />
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-950 dark:text-slate-100">{employee.name}</p>
                          <p className="text-xs text-slate-500">{employee.externalEmployeeId}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <input name={`employee_email_${employee.externalEmployeeId}`} type="email" defaultValue={employee.email ?? ""} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
                        </td>
                        <td className="py-3 pr-4">
                          <select name={`existing_employee_id_${employee.externalEmployeeId}`} defaultValue={employee.employeeId ?? employee.suggestedEmployeeId ?? ""} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950">
                            <option value="">Create new</option>
                            {employee.suggestedEmployeeId ? <option value={employee.suggestedEmployeeId}>{employee.suggestedEmployeeName}</option> : null}
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge value={employee.employeeId ? "mapped" : employee.needsEmail ? "needs_email" : "ready"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SubmitButton pendingText="Importing...">Import company</SubmitButton>
            </form>
          </Panel>
        ) : (
          <Panel title="Review Import">
            <EmptyState>Select a company from the queue to review its import details.</EmptyState>
          </Panel>
        )}
      </div>
    </PortalShell>
  );
}
