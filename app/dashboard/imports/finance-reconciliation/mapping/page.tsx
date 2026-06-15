/* eslint-disable @typescript-eslint/no-explicit-any */
import { mapFinanceCompanyAction, mapFinanceEmployeeAction } from "@/lib/portal/actions/finance";
import { getFinanceMappingData } from "@/lib/portal/finances";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, formatDate } from "@/components/portal/ui";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default async function ImportFinanceMappingPage() {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const data = await getFinanceMappingData();

  return (
    <PortalShell
      session={session}
      title="Finance Mapping"
      subtitle="Connect Invoice Generator companies and employees to EOR portal records once, then monthly syncs can populate role-aware finance views."
      wide
    >
      <div className="grid gap-5">
        <Panel title="Company mappings">
          <div className="grid gap-3">
            {data.companyMappings.map((mapping: any) => {
              const suggestion = data.employers.find((employer: any) => normalize(employer.name) === normalize(mapping.external_company_name));
              return (
                <form key={mapping.id} action={mapFinanceCompanyAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <input type="hidden" name="mappingId" value={mapping.id} />
                  <input type="hidden" name="sourceKey" value={mapping.source_key} />
                  <input type="hidden" name="externalCompanyId" value={mapping.external_company_id} />
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{mapping.external_company_name}</p>
                    <p className="mt-1 text-xs text-slate-500">External ID: {mapping.external_company_id}</p>
                    {mapping.employer_id ? <p className="mt-1 text-xs font-semibold text-emerald-600">Mapped</p> : <p className="mt-1 text-xs font-semibold text-amber-600">Needs mapping</p>}
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">EOR employer</span>
                    <select name="employerId" defaultValue={mapping.employer_id ?? suggestion?.id ?? ""} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                      <option value="">Select employer</option>
                      {data.employers.map((employer: any) => (
                        <option key={employer.id} value={employer.id}>{employer.name}</option>
                      ))}
                    </select>
                    {suggestion && !mapping.employer_id ? <span className="text-xs text-blue-600">Suggested: {suggestion.name}</span> : null}
                  </label>
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">Save mapping</button>
                </form>
              );
            })}
            {data.companyMappings.length === 0 ? <EmptyState>No synced companies yet.</EmptyState> : null}
          </div>
        </Panel>

        <Panel title="Employee mappings">
          <div className="grid gap-3">
            {data.employeeMappings.map((mapping: any) => {
              const suggestion = data.employees.find((employee: any) => {
                const emailMatch = mapping.external_employee_email && normalize(employee.email) === normalize(mapping.external_employee_email);
                const nameMatch = normalize(employee.full_name) === normalize(mapping.external_employee_name);
                return emailMatch || nameMatch;
              });
              const scopedEmployees = mapping.employer_id
                ? data.employees.filter((employee: any) => employee.employer_id === mapping.employer_id)
                : data.employees;
              return (
                <form key={mapping.id} action={mapFinanceEmployeeAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <input type="hidden" name="mappingId" value={mapping.id} />
                  <input type="hidden" name="sourceKey" value={mapping.source_key} />
                  <input type="hidden" name="externalEmployeeId" value={mapping.external_employee_id} />
                  <input type="hidden" name="employerId" value={mapping.employer_id ?? suggestion?.employer_id ?? ""} />
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{mapping.external_employee_name}</p>
                    <p className="mt-1 text-xs text-slate-500">External ID: {mapping.external_employee_id}</p>
                    <p className="mt-1 text-xs text-slate-500">{mapping.external_employee_email ?? "No email in invoice app"}</p>
                    {mapping.employee_id ? <p className="mt-1 text-xs font-semibold text-emerald-600">Mapped</p> : <p className="mt-1 text-xs font-semibold text-amber-600">Needs mapping</p>}
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">EOR employee</span>
                    <select name="employeeId" defaultValue={mapping.employee_id ?? suggestion?.id ?? ""} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                      <option value="">Select employee</option>
                      {scopedEmployees.map((employee: any) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.full_name} - {employee.employers?.name ?? employee.email}
                        </option>
                      ))}
                    </select>
                    {suggestion && !mapping.employee_id ? <span className="text-xs text-blue-600">Suggested: {suggestion.full_name}</span> : null}
                  </label>
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">Save mapping</button>
                </form>
              );
            })}
            {data.employeeMappings.length === 0 ? <EmptyState>No synced employees yet.</EmptyState> : null}
          </div>
        </Panel>

        <Panel title="Recent sync attempts">
          <div className="grid gap-3">
            {data.syncRuns.map((run: any) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950 dark:text-slate-100">{run.external_invoice_id ?? "Unknown invoice"}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${run.status === "synced" ? "bg-emerald-50 text-emerald-700" : run.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{run.status.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDate(run.created_at)}</p>
              </div>
            ))}
            {data.syncRuns.length === 0 ? <EmptyState>No sync attempts recorded yet.</EmptyState> : null}
          </div>
        </Panel>
      </div>
    </PortalShell>
  );
}
