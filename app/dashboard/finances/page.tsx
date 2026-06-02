/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFinancesData } from "@/lib/portal/finances";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, formatDate } from "@/components/portal/ui";

function money(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = await searchParams;
  const data = await getFinancesData(session, params);
  const admin = isPlatformAdmin(session.user.role);

  return (
    <PortalShell session={session} title="Finances" subtitle="Role-aware salary and employer billing summaries with strict privacy boundaries." wide>
      <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(data.totals).map(([currency, total]) => (
            <div key={currency} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Employer billing {currency}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{money(total, currency)}</p>
            </div>
          ))}
          {Object.keys(data.totals).length === 0 ? <EmptyState>No billing totals yet.</EmptyState> : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title={session.user.role === "employee" ? "My compensation" : "Employer billing"}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr><th className="py-2 pr-4">Employee</th><th className="py-2 pr-4">Monthly bill</th><th className="py-2 pr-4">Currency</th><th className="py-2 pr-4">Effective</th></tr>
                </thead>
                <tbody>
                  {data.billing.map((row: any) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{row.employees?.full_name ?? "Employee"}</td>
                      <td className="py-3 pr-4 font-semibold">{money(row.monthly_bill_amount, row.currency)}</td>
                      <td className="py-3 pr-4">{row.currency}</td>
                      <td className="py-3 pr-4">{formatDate(row.effective_from)}</td>
                    </tr>
                  ))}
                  {session.user.role === "employee" ? data.compensation.map((row: any) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">My salary</td>
                      <td className="py-3 pr-4 font-semibold">{money(row.monthly_salary, row.currency)}</td>
                      <td className="py-3 pr-4">{row.currency}</td>
                      <td className="py-3 pr-4">{formatDate(row.effective_from)}</td>
                    </tr>
                  )) : null}
                </tbody>
              </table>
              {data.billing.length === 0 && (session.user.role !== "employee" || data.compensation.length === 0) ? <EmptyState>No finance records yet.</EmptyState> : null}
            </div>
          </Panel>

          {admin ? (
            <Panel title="Employee salary records">
              <div className="grid gap-3">
                {data.compensation.map((row: any) => (
                  <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-semibold">{row.employees?.full_name ?? "Employee"}</p>
                    <p className="mt-1 text-slate-500">{row.employees?.employers?.name ?? ""}</p>
                    <p className="mt-2 text-lg font-bold">{money(row.monthly_salary, row.currency)}</p>
                  </div>
                ))}
                {data.compensation.length === 0 ? <EmptyState>No salary records in this filter.</EmptyState> : null}
              </div>
            </Panel>
          ) : (
            <Panel title="Privacy boundary">
              <p className="text-sm leading-6 text-slate-600">
                {session.user.role === "employer_admin"
                  ? "Employer users can view employer billing only. Employee salary records remain admin-only."
                  : "Employees can view their own compensation only. Employer billing is never shown here."}
              </p>
            </Panel>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
