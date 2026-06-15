import { PayslipDownloadButton } from "@/components/finances/payslip-download-button";
import { EmptyState, Panel, SubmitButton, formatDate } from "@/components/portal/ui";
import {
  employeePayrollStatuses,
  type PortalEmployeePayrollRecord,
  type PortalFinanceFilters,
} from "@/lib/portal/portal-finance-types";

type EmployeeNativeFinanceData = {
  filters: PortalFinanceFilters;
  payrollRecords: PortalEmployeePayrollRecord[];
  totals: {
    totalGrossSalaryInr: number;
    totalActualPaidInr: number;
    paidRecordCount: number;
    recordCount: number;
    pendingAmountInr: number;
    pendingRecordCount: number;
  };
};

function moneyInr(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
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

function Filters({ data }: { data: EmployeeNativeFinanceData }) {
  return (
    <Panel title="Filters" description="Filter your salary records by payroll month and payment status.">
      <form action="/dashboard/finances" className="grid gap-3 md:grid-cols-3 md:items-end">
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
          Payment status
          <select name="status" defaultValue={data.filters.statuses[0] ?? "all"} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="all">All</option>
            {employeePayrollStatuses.map((status) => (
              <option key={status} value={status}>{titleCase(status)}</option>
            ))}
          </select>
        </label>
        <SubmitButton pendingText="Applying...">Apply filters</SubmitButton>
      </form>
    </Panel>
  );
}

function PayrollComponents({ row }: { row: PortalEmployeePayrollRecord }) {
  const items = row.portal_employee_payroll_line_items ?? [];
  if (!items.length) return <span className="text-sm text-slate-500">No payroll components added.</span>;

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-950">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
          <p className="text-slate-500">
            {item.amount === null ? "Note only" : moneyInr(item.amount)}
            {item.note ? ` - ${item.note}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function PayslipCell({ row }: { row: PortalEmployeePayrollRecord }) {
  const payslip = row.portal_payslip_files?.[0] ?? null;
  if (!payslip) return <span className="text-sm text-slate-500">Not uploaded yet</span>;

  return (
    <div className="grid gap-2">
      <p className="text-xs text-slate-500">{payslip.file_name}</p>
      <PayslipDownloadButton payslipId={payslip.id} />
    </div>
  );
}

function PayrollTable({ data }: { data: EmployeeNativeFinanceData }) {
  return (
    <Panel title="Salary Records" description="Your monthly salary details, payroll components, and private payslip downloads.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">
            <tr>
              <th className="py-2 pr-4">Payroll Month</th>
              <th className="py-2 pr-4">Gross Salary INR</th>
              <th className="py-2 pr-4">Actual Paid INR</th>
              <th className="py-2 pr-4">Payment Date</th>
              <th className="py-2 pr-4">Payment Status</th>
              <th className="py-2 pr-4">Payroll Components</th>
              <th className="py-2 pr-4">Payslip</th>
            </tr>
          </thead>
          <tbody>
            {data.payrollRecords.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                <td className="py-3 pr-4 font-semibold text-slate-950 dark:text-slate-100">{monthValue(row.payroll_month) || "Not set"}</td>
                <td className="py-3 pr-4">{moneyInr(row.gross_salary_inr)}</td>
                <td className="py-3 pr-4 font-semibold">{moneyInr(row.actual_paid_inr)}</td>
                <td className="py-3 pr-4">{formatDate(row.payment_date)}</td>
                <td className="py-3 pr-4">{titleCase(row.payment_status)}</td>
                <td className="py-3 pr-4"><PayrollComponents row={row} /></td>
                <td className="py-3 pr-4"><PayslipCell row={row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.payrollRecords.length === 0 ? (
        <EmptyState>
          No salary records are available yet.
          <span className="mt-1 block">Your EOR admin will update salary records once payroll is processed.</span>
        </EmptyState>
      ) : null}
    </Panel>
  );
}

export function EmployeePortalFinance({ data }: { data: EmployeeNativeFinanceData }) {
  return (
    <div className="grid gap-5">
      <Filters data={data} />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total Gross Salary" value={moneyInr(data.totals.totalGrossSalaryInr)} />
        <StatCard label="Total Actual Paid" value={moneyInr(data.totals.totalActualPaidInr)} />
        <StatCard label="Paid Months / Records" value={`${data.totals.paidRecordCount} / ${data.totals.recordCount}`} />
        <StatCard label="Pending Amount / Records" value={`${moneyInr(data.totals.pendingAmountInr)} / ${data.totals.pendingRecordCount}`} />
      </div>
      <PayrollTable data={data} />
    </div>
  );
}
