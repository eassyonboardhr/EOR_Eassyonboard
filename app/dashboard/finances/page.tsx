/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFinancesData } from "@/lib/portal/finances";
import { markFinanceInvoicePaymentReceivedAction } from "@/lib/portal/actions/finance";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, SubmitButton, formatDate } from "@/components/portal/ui";
import Link from "next/link";

function money(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

function usdCents(value: number | string | null | undefined) {
  return money(Number(value ?? 0) / 100, "USD");
}

function inrCents(value: number | string | null | undefined) {
  return money(Number(value ?? 0) / 100, "INR");
}

function formatInvoiceStatus(status: string | null | undefined, admin: boolean) {
  if (status === "generated" || status === "sent") return "Raised / Sent";
  if (status === "received") return "Payment received";
  if (status === "cashed_out") return admin ? "Cashed out" : "Payment received";
  if (status === "draft") return "Draft";
  return status ?? "Unknown";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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
  const employeeFilter = Array.isArray(params.employee) ? params.employee[0] : params.employee;

  return (
    <PortalShell session={session} title="Finances" subtitle="Role-aware salary and employer billing summaries with strict privacy boundaries." wide>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {admin ? "Admin finance view" : session.user.role === "employer_admin" ? "Employer billing view" : "Employee pay view"}
            </p>
            <p className="text-xs text-slate-500">Synced finance data comes from the Invoice Generator after mapping.</p>
          </div>
          {admin ? (
            <Link href="/dashboard/finances/mapping" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              Manage finance mapping
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {(Object.entries(data.totals) as Array<[string, number]>).filter(([currency]) => currency !== "SYNCED_USD").map(([currency, total]) => (
            <div key={currency} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Employer billing {currency}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{money(total, currency)}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Synced invoice billing</p>
            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-100">{money(data.totals.SYNCED_USD ?? 0, "USD")}</p>
          </div>
          {Object.keys(data.totals).length === 0 ? <EmptyState>No billing totals yet.</EmptyState> : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title={session.user.role === "employee" ? "My pay history" : "Employer billing"}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr><th className="py-2 pr-4">Employee</th><th className="py-2 pr-4">Monthly bill/pay</th><th className="py-2 pr-4">Currency</th><th className="py-2 pr-4">Period</th><th className="py-2 pr-4">Status</th></tr>
                </thead>
                <tbody>
                  {data.invoiceLineItems.map((row: any) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{row.employee_name_snapshot}</td>
                      <td className="py-3 pr-4 font-semibold">{usdCents(row.billed_total_usd_cents)}</td>
                      <td className="py-3 pr-4">USD</td>
                      <td className="py-3 pr-4">{row.finance_invoices?.month_key ?? row.external_invoice_id}</td>
                      <td className="py-3 pr-4">{formatInvoiceStatus(row.finance_invoices?.status ?? row.sync_status, admin)}</td>
                    </tr>
                  ))}
                  {data.billing.map((row: any) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{row.employees?.full_name ?? "Employee"}</td>
                      <td className="py-3 pr-4 font-semibold">{money(row.monthly_bill_amount, row.currency)}</td>
                      <td className="py-3 pr-4">{row.currency}</td>
                      <td className="py-3 pr-4">{formatDate(row.effective_from)}</td>
                      <td className="py-3 pr-4">Effective rate</td>
                    </tr>
                  ))}
                  {session.user.role === "employee" ? data.salaryPayments.map((row: any) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">My monthly pay</td>
                      <td className="py-3 pr-4 font-semibold">{inrCents(row.actual_paid_inr_cents ?? row.salary_paid_inr_cents)}</td>
                      <td className="py-3 pr-4">INR</td>
                      <td className="py-3 pr-4">{row.month_key}</td>
                      <td className="py-3 pr-4">
                        {row.paid_status ? "Paid" : "Pending"}
                        <p className="text-xs text-slate-500">PF {inrCents(row.pf_inr_cents)} · TDS {inrCents(row.tds_inr_cents)}</p>
                      </td>
                    </tr>
                  )) : null}
                  {session.user.role === "employee" && data.salaryPayments.length === 0 ? data.compensation.map((row: any) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">My salary</td>
                      <td className="py-3 pr-4 font-semibold">{money(row.monthly_salary, row.currency)}</td>
                      <td className="py-3 pr-4">{row.currency}</td>
                      <td className="py-3 pr-4">{formatDate(row.effective_from)}</td>
                      <td className="py-3 pr-4">Compensation</td>
                    </tr>
                  )) : null}
                </tbody>
              </table>
              {data.billing.length === 0 && data.invoiceLineItems.length === 0 && (session.user.role !== "employee" || (data.compensation.length === 0 && data.salaryPayments.length === 0)) ? <EmptyState>No finance records yet.</EmptyState> : null}
            </div>
          </Panel>

          {admin ? (
            <Panel title="Employee pay records">
              <div className="grid gap-3">
                {data.salaryPayments.map((row: any) => (
                  <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.employees?.full_name ?? "Employee"}</p>
                        <p className="mt-1 text-slate-500">{row.employees?.employers?.name ?? row.month_key}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.paid_status ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.paid_status ? "Paid" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold">{inrCents(row.actual_paid_inr_cents ?? row.salary_paid_inr_cents)}</p>
                    <p className="mt-1 text-xs text-slate-500">USD salary basis {usdCents(row.salary_usd_cents)} for {row.month_key}</p>
                    <p className="mt-1 text-xs text-slate-500">PF {inrCents(row.pf_inr_cents)} · TDS {inrCents(row.tds_inr_cents)} · Salary paid {inrCents(row.salary_paid_inr_cents)}</p>
                  </div>
                ))}
                {data.compensation.map((row: any) => (
                  <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-semibold">{row.employees?.full_name ?? "Employee"}</p>
                    <p className="mt-1 text-slate-500">{row.employees?.employers?.name ?? ""}</p>
                    <p className="mt-2 text-lg font-bold">{money(row.monthly_salary, row.currency)}</p>
                  </div>
                ))}
                {data.compensation.length === 0 && data.salaryPayments.length === 0 ? <EmptyState>No salary records in this filter.</EmptyState> : null}
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

        <Panel title="Invoices and payments">
          {admin && employeeFilter && employeeFilter !== "all" ? (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
                <p className="font-semibold">Employer Billing</p>
                <p className="mt-1">Invoice rows below show client billing linked to this employee.</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                <p className="font-semibold">Employee Pay</p>
                <p className="mt-1">Employee salary/payment rows above show paid status, INR paid amount, PF, and TDS where synced.</p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr><th className="py-2 pr-4">Invoice</th><th className="py-2 pr-4">Month</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Total</th>{admin ? <th className="py-2 pr-4">Admin action</th> : null}</tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold">{invoice.invoice_number}</td>
                      <td className="py-3 pr-4">{invoice.month_key}</td>
                      <td className="py-3 pr-4">{formatInvoiceStatus(invoice.status, admin)}</td>
                      <td className="py-3 pr-4">{usdCents(invoice.grand_total_usd_cents)}</td>
                      {admin ? (
                        <td className="py-3 pr-4">
                          {invoice.status === "generated" || invoice.status === "sent" ? (
                            <form action={markFinanceInvoicePaymentReceivedAction} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="invoiceId" value={invoice.id} />
                              <input
                                type="date"
                                name="receivedAt"
                                defaultValue={todayIso()}
                                className="h-9 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                              />
                              <input
                                name="notes"
                                placeholder="Notes"
                                className="h-9 w-32 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                              />
                              <SubmitButton pendingText="Updating...">Mark received</SubmitButton>
                            </form>
                          ) : (
                            <span className="text-xs text-slate-500">{formatInvoiceStatus(invoice.status, admin)}</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {data.invoices.length === 0 ? <tr><td colSpan={admin ? 5 : 4}><EmptyState>No synced invoices yet.</EmptyState></td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr><th className="py-2 pr-4">Invoice</th><th className="py-2 pr-4">Payment month</th><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">FX</th></tr>
                </thead>
                <tbody>
                  {data.invoicePayments.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold">{payment.finance_invoices?.invoice_number ?? payment.external_invoice_id}</td>
                      <td className="py-3 pr-4">{payment.payment_month}</td>
                      <td className="py-3 pr-4">{formatDate(payment.payment_date)}</td>
                      <td className="py-3 pr-4">{payment.usd_inr_rate}</td>
                    </tr>
                  ))}
                  {data.invoicePayments.length === 0 ? <tr><td colSpan={4}><EmptyState>No payment records yet.</EmptyState></td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      </div>
    </PortalShell>
  );
}
