import {
  employerInvoiceStatuses,
  type PortalEmployerInvoiceRecord,
  type PortalFinanceFilters,
} from "@/lib/portal/portal-finance-types";
import { EmptyState, Panel, SubmitButton } from "@/components/portal/ui";

type EmployerNativeFinanceData = {
  filters: PortalFinanceFilters;
  employerInvoices: PortalEmployerInvoiceRecord[];
  employees: Array<{ id: string; full_name: string | null; email: string | null }>;
  totals: {
    totalMonthlyBill: number;
    raisedTotal: number;
    receivedTotal: number;
    paidTotal: number;
    recordCount: number;
    employeeCount: number;
  };
};

function money(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function monthValue(value: string | null | undefined) {
  return value ? value.slice(0, 7) : "";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">{value}</p>
    </div>
  );
}

function Filters({ data }: { data: EmployerNativeFinanceData }) {
  return (
    <Panel title="Filters" description="Review invoice records by month, employee, or payment status.">
      <form action="/dashboard/finances" className="grid gap-3 md:grid-cols-4 md:items-end">
        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Month
          <input
            name="month"
            type="month"
            defaultValue={monthValue(data.filters.months[0])}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Employee
          <select name="employee" defaultValue={data.filters.employeeIds[0] ?? "all"} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="all">All employees</option>
            {data.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name ?? employee.email ?? "Employee"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Status
          <select name="status" defaultValue={data.filters.statuses[0] ?? "all"} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="all">All statuses</option>
            {employerInvoiceStatuses.map((status) => (
              <option key={status} value={status}>{titleCase(status)}</option>
            ))}
          </select>
        </label>
        <SubmitButton pendingText="Applying...">Apply filters</SubmitButton>
      </form>
    </Panel>
  );
}

function AdditionalItems({ row }: { row: PortalEmployerInvoiceRecord }) {
  const items = row.portal_employer_invoice_line_items ?? [];
  if (!items.length) return <span className="text-sm text-slate-500">None</span>;

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-950">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
          <p className="text-slate-500">
            {item.amount === null ? "Note only" : money(item.amount, row.currency)}
            {item.note ? ` - ${item.note}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function InvoiceTable({ data }: { data: EmployerNativeFinanceData }) {
  return (
    <Panel title="Employer Invoice Records" description="Employer-facing invoice details prepared by your EOR admin.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">
            <tr>
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Invoice No.</th>
              <th className="py-2 pr-4">Days Worked</th>
              <th className="py-2 pr-4">Hourly Rate</th>
              <th className="py-2 pr-4">Hours Per Week</th>
              <th className="py-2 pr-4">Monthly Bill</th>
              <th className="py-2 pr-4">Additional Invoice Items</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.employerInvoices.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                <td className="py-3 pr-4 font-semibold text-slate-950 dark:text-slate-100">{row.employees?.full_name ?? "Employee"}</td>
                <td className="py-3 pr-4">{row.invoice_no ?? "Not assigned"}</td>
                <td className="py-3 pr-4">{row.days_worked ?? "Not set"}</td>
                <td className="py-3 pr-4">{money(row.hourly_rate, row.currency)}</td>
                <td className="py-3 pr-4">{row.hours_per_week}</td>
                <td className="py-3 pr-4 font-semibold">{money(row.monthly_bill, row.currency)}</td>
                <td className="py-3 pr-4"><AdditionalItems row={row} /></td>
                <td className="py-3 pr-4">{titleCase(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.employerInvoices.length === 0 ? (
        <EmptyState>
          No invoice records are available for this period yet.
          <span className="mt-1 block">Your EOR admin will update invoice records once billing is prepared.</span>
        </EmptyState>
      ) : null}
    </Panel>
  );
}

export function EmployerPortalFinance({ data }: { data: EmployerNativeFinanceData }) {
  return (
    <div className="grid gap-5">
      <Filters data={data} />
      <div className="grid gap-3 md:grid-cols-5">
        <StatCard label="Total Monthly Bill" value={money(data.totals.totalMonthlyBill)} />
        <StatCard label="Raised Total" value={money(data.totals.raisedTotal)} />
        <StatCard label="Received Total" value={money(data.totals.receivedTotal)} />
        <StatCard label="Paid Total" value={money(data.totals.paidTotal)} />
        <StatCard label="Employees / Records" value={`${data.totals.employeeCount} / ${data.totals.recordCount}`} />
      </div>
      <InvoiceTable data={data} />
    </div>
  );
}
