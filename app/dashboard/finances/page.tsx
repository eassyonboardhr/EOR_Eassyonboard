import Link from "next/link";
import {
  getAdminFinanceReconciliation,
  getEmployeeSalaryStatement,
  getEmployerFinanceStatement,
  type AdminFinanceReconciliation,
  type EmployeeSalaryStatement,
  type EmployerFinanceStatement,
} from "@/lib/portal/finances";
import {
  inferFinancePayrollAllocationsAction,
  markFinanceInvoicePaymentReceivedAction,
  updateFinancePayrollAllocationAction,
} from "@/lib/portal/actions/finance";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, SubmitButton, formatDate } from "@/components/portal/ui";

function moneyFromCents(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0) / 100);
}

function rate(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return parsed > 0 ? parsed.toFixed(4) : "Not set";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function MultiSelect({
  label,
  name,
  options,
  selectedValues,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
      <select
        name={name}
        multiple
        defaultValue={selectedValues}
        className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">{value}</p>
    </div>
  );
}

function AdminFilters({ data }: { data: AdminFinanceReconciliation }) {
  const months = [...new Set([
    ...data.employerReceivables.flatMap((row) => [row.invoiceMonth, row.paidMonth]),
    ...data.employeePayables.map((row) => row.payrollMonth),
  ].filter((value): value is string => Boolean(value)))].sort().reverse();

  return (
    <Panel title="Filters" description="Compare multiple months, employers, employees, statuses, and allocation sources. Hold Ctrl/Cmd to pick more than one option.">
      <form action="/dashboard/finances" className="grid gap-4 lg:grid-cols-6">
        <MultiSelect
          label="Invoice month"
          name="invoiceMonth"
          selectedValues={data.filters.invoiceMonths}
          options={months.map((month) => ({ value: month, label: month }))}
        />
        <MultiSelect
          label="Paid month"
          name="paidMonth"
          selectedValues={data.filters.paidMonths}
          options={months.map((month) => ({ value: month, label: month }))}
        />
        <MultiSelect
          label="Payroll month"
          name="payrollMonth"
          selectedValues={data.filters.payrollMonths}
          options={months.map((month) => ({ value: month, label: month }))}
        />
        <MultiSelect
          label="Employers"
          name="employer"
          selectedValues={data.filters.employerIds}
          options={data.employers.map((employer) => ({ value: employer.id, label: employer.name }))}
        />
        <MultiSelect
          label="Employees"
          name="employee"
          selectedValues={data.filters.employeeIds}
          options={data.employees.map((employee) => ({ value: employee.id, label: employee.full_name }))}
        />
        <div className="grid gap-3">
          <MultiSelect
            label="Status"
            name="status"
            selectedValues={data.filters.statuses}
            options={[
              { value: "generated", label: "Invoice raised" },
              { value: "sent", label: "Invoice sent" },
              { value: "received", label: "Payment received" },
              { value: "cashed_out", label: "Settled" },
            ]}
          />
          <SubmitButton pendingText="Applying...">Apply filters</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}

function AdminFinance({ data }: { data: AdminFinanceReconciliation }) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Admin reconciliation workspace</p>
          <p className="text-xs text-slate-500">Default reconciliation is by paid month, while invoice month and payroll month stay visible on every row.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={inferFinancePayrollAllocationsAction}>
            <SubmitButton pendingText="Inferring...">Infer allocations</SubmitButton>
          </form>
          <Link href="/dashboard/finances/mapping" className="inline-flex h-10 items-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
            Manage mapping
          </Link>
        </div>
      </div>

      <AdminFilters data={data} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total invoiced" value={moneyFromCents(data.summary.totalInvoicedUsdCents)} />
        <StatCard label="Total received" value={moneyFromCents(data.summary.totalReceivedUsdCents)} />
        <StatCard label="Employee payouts" value={moneyFromCents(data.summary.totalEmployeePayoutInrCents, "INR")} />
        <StatCard label="Pending receivables" value={moneyFromCents(data.summary.pendingReceivableUsdCents)} />
        <StatCard label="Pending salaries" value={moneyFromCents(data.summary.pendingSalaryInrCents, "INR")} />
        <StatCard label="Average cashout" value={rate(data.summary.averageCashoutRate)} />
        <StatCard label="Estimated margin" value={data.summary.estimatedMarginInrCents === null ? "Not set" : moneyFromCents(data.summary.estimatedMarginInrCents, "INR")} />
      </div>

      <Panel title="Employer receivables" description="Invoices raised to employers, when payment landed, and the cashout rate used internally.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-2 pr-4">Employer</th>
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Invoice month</th>
                <th className="py-2 pr-4">Paid month</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Cashout</th>
                <th className="py-2 pr-4">Employees</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.employerReceivables.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-semibold">{row.employerName}</td>
                  <td className="py-3 pr-4">{row.invoiceNumber}</td>
                  <td className="py-3 pr-4">{row.invoiceMonth ?? "Not set"}</td>
                  <td className="py-3 pr-4">{row.paidMonth ?? "Not paid"}</td>
                  <td className="py-3 pr-4 capitalize">{row.status.replaceAll("_", " ")}</td>
                  <td className="py-3 pr-4 font-semibold">{moneyFromCents(row.amountUsdCents)}</td>
                  <td className="py-3 pr-4">{rate(row.cashoutRate)}</td>
                  <td className="py-3 pr-4">{row.employeeNames.slice(0, 3).join(", ") || "No line items"}{row.employeeNames.length > 3 ? ` +${row.employeeNames.length - 3}` : ""}</td>
                  <td className="py-3 pr-4">
                    {row.status === "generated" || row.status === "sent" ? (
                      <form action={markFinanceInvoicePaymentReceivedAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="invoiceId" value={row.id} />
                        <input type="date" name="receivedAt" defaultValue={todayIso()} className="h-9 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
                        <input name="notes" placeholder="Notes" className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
                        <SubmitButton pendingText="Updating...">Mark received</SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-500">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.employerReceivables.length === 0 ? <EmptyState>No employer receivables match these filters.</EmptyState> : null}
        </div>
      </Panel>

      <Panel title="Employee payables" description="Employee salary rows with INR salary components. Cashout and invoice details stay in the allocation section.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Employer</th>
                <th className="py-2 pr-4">Payroll month</th>
                <th className="py-2 pr-4">Gross INR</th>
                <th className="py-2 pr-4">PF</th>
                <th className="py-2 pr-4">TDS</th>
                <th className="py-2 pr-4">Reimbursements</th>
                <th className="py-2 pr-4">Actual paid</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.employeePayables.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-semibold">{row.employeeName}</td>
                  <td className="py-3 pr-4">{row.employerName}</td>
                  <td className="py-3 pr-4">{row.payrollMonth ?? "Not set"}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.grossInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.pfInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.tdsInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.reimbursementsInrCents, "INR")}</td>
                  <td className="py-3 pr-4 font-semibold">{moneyFromCents(row.actualPaidInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{row.paid ? `Paid ${formatDate(row.paidDate)}` : "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.employeePayables.length === 0 ? <EmptyState>No employee payables match these filters.</EmptyState> : null}
        </div>
      </Panel>

      <Panel title="Invoice-to-payroll allocations" description="System-inferred links can be edited by admin. Changing invoice payment refreshes the cashout rate from that payment unless a manual override is supplied.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Invoice month</th>
                <th className="py-2 pr-4">Paid month</th>
                <th className="py-2 pr-4">Payroll month</th>
                <th className="py-2 pr-4">Allocated</th>
                <th className="py-2 pr-4">Cashout</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Edit</th>
              </tr>
            </thead>
            <tbody>
              {data.allocations.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-semibold">{row.employeeName}</td>
                  <td className="py-3 pr-4">{row.invoiceNumber}</td>
                  <td className="py-3 pr-4">{row.invoiceMonth ?? "Not set"}</td>
                  <td className="py-3 pr-4">{row.paidMonth ?? "Not set"}</td>
                  <td className="py-3 pr-4">{row.payrollMonth ?? "Not set"}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.allocatedUsdCents)}</td>
                  <td className="py-3 pr-4">{rate(row.cashoutRate)}<p className="text-xs text-slate-500">{row.cashoutRateSource.replaceAll("_", " ")}</p></td>
                  <td className="py-3 pr-4 capitalize">{row.allocationSource}</td>
                  <td className="py-3 pr-4">
                    <form action={updateFinancePayrollAllocationAction} className="grid min-w-72 gap-2">
                      <input type="hidden" name="allocationId" value={row.id} />
                      <input name="invoicePaymentId" defaultValue={row.invoicePaymentId ?? ""} placeholder="Invoice payment id" className="h-9 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
                      <input name="allocatedUsdCents" defaultValue={row.allocatedUsdCents} placeholder="Allocated USD cents" className="h-9 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
                      <input name="cashoutRateOverride" placeholder="Override rate" className="h-9 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
                      <input name="overrideReason" placeholder="Reason if overriding" className="h-9 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
                      <SubmitButton pendingText="Saving...">Save allocation</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.allocations.length === 0 ? <EmptyState>No allocations yet. Use Infer allocations after finance rows are mapped.</EmptyState> : null}
        </div>
      </Panel>
    </div>
  );
}

function EmployerFinance({ data }: { data: EmployerFinanceStatement }) {
  return (
    <div className="grid gap-5">
      <StatCard label="Employer statement total" value={moneyFromCents(data.totals.billedUsdCents)} />
      <Panel title="Employee statement" description="Employer-safe invoice rows. Salary internals, cashout rate, and margin are hidden.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Invoice month</th>
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Designation</th>
                <th className="py-2 pr-4">Days</th>
                <th className="py-2 pr-4">Amount billed</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-semibold">{row.invoiceNumber}</td>
                  <td className="py-3 pr-4">{row.invoiceMonth ?? "Not set"}</td>
                  <td className="py-3 pr-4">{row.employeeName}</td>
                  <td className="py-3 pr-4">{row.designation ?? row.teamName ?? "Not set"}</td>
                  <td className="py-3 pr-4">{row.daysWorked ?? "Not set"}</td>
                  <td className="py-3 pr-4 font-semibold">{moneyFromCents(row.amountUsdCents)}</td>
                  <td className="py-3 pr-4">{row.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length === 0 ? <EmptyState>No employer statement rows are synced yet.</EmptyState> : null}
        </div>
      </Panel>
    </div>
  );
}

function EmployeeFinance({ data }: { data: EmployeeSalaryStatement }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Actual paid" value={moneyFromCents(data.totals.actualPaidInrCents, "INR")} />
        <StatCard label="PF" value={moneyFromCents(data.totals.pfInrCents, "INR")} />
        <StatCard label="TDS" value={moneyFromCents(data.totals.tdsInrCents, "INR")} />
      </div>
      <Panel title="My salary breakdown" description="INR salary components only. Employer invoices and cashout rates are not shown here.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-2 pr-4">Payroll month</th>
                <th className="py-2 pr-4">Gross salary</th>
                <th className="py-2 pr-4">PF</th>
                <th className="py-2 pr-4">TDS</th>
                <th className="py-2 pr-4">Reimbursements</th>
                <th className="py-2 pr-4">Advances</th>
                <th className="py-2 pr-4">Offboarding deduction</th>
                <th className="py-2 pr-4">Actual paid</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">{row.payrollMonth ?? "Not set"}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.grossInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.pfInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.tdsInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.reimbursementsInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.advancesInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{moneyFromCents(row.offboardingDeductionInrCents, "INR")}</td>
                  <td className="py-3 pr-4 font-semibold">{moneyFromCents(row.actualPaidInrCents, "INR")}</td>
                  <td className="py-3 pr-4">{row.paid ? `Paid ${formatDate(row.paidDate)}` : "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length === 0 ? <EmptyState>No salary statement rows are synced yet.</EmptyState> : null}
        </div>
      </Panel>
    </div>
  );
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = await searchParams;
  const admin = isPlatformAdmin(session.user.role);
  const data = admin
    ? await getAdminFinanceReconciliation(session, params)
    : session.user.role === "employer_admin"
      ? await getEmployerFinanceStatement(session, params)
      : await getEmployeeSalaryStatement(session, params);

  return (
    <PortalShell
      session={session}
      title="Finances"
      subtitle="Role-specific financial statements with admin-only reconciliation controls."
      wide
    >
      {admin ? (
        <AdminFinance data={data as AdminFinanceReconciliation} />
      ) : session.user.role === "employer_admin" ? (
        <EmployerFinance data={data as EmployerFinanceStatement} />
      ) : (
        <EmployeeFinance data={data as EmployeeSalaryStatement} />
      )}
    </PortalShell>
  );
}
