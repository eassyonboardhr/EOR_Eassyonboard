import Link from "next/link";
import {
  deleteEmployeePayrollLineItemAction,
  deleteEmployeePayrollRecordAction,
  deleteEmployerInvoiceLineItemAction,
  deleteEmployerInvoiceRecordAction,
  uploadPayslipAction,
  upsertEmployeePayrollLineItemAction,
  upsertEmployeePayrollRecordAction,
  upsertEmployerInvoiceLineItemAction,
  upsertEmployerInvoiceRecordAction,
} from "@/lib/portal/actions/portal-finance";
import {
  calculateMonthlyBill,
  employeePayrollLineItemLabels,
  employeePayrollStatuses,
  employerInvoiceLineItemLabels,
  employerInvoiceStatuses,
  type PortalEmployeePayrollRecord,
  type PortalEmployerInvoiceRecord,
  type PortalFinanceFilters,
} from "@/lib/portal/portal-finance-types";
import { EmptyState, Panel, SubmitButton } from "@/components/portal/ui";

type FinanceOptionData = {
  employers: Array<{ id: string; name: string | null }>;
  employees: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    employer_id: string | null;
    employers?: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
  }>;
};

type AdminFinanceData = {
  employerInvoices: PortalEmployerInvoiceRecord[];
  employeePayroll: PortalEmployeePayrollRecord[];
  totals: {
    employerInvoiceCount: number;
    employeePayrollCount: number;
    employerMonthlyBill: number;
    employeeActualPaidInr: number;
  };
};

function currency(value: number | string | null | undefined, code = "USD") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function monthValue(value: string | null | undefined) {
  return value ? value.slice(0, 7) : "";
}

function employerName(employee: FinanceOptionData["employees"][number]) {
  const employer = Array.isArray(employee.employers) ? employee.employers[0] : employee.employers;
  return employer?.name ?? employee.email ?? "No employer";
}

function employeesForEmployer(options: FinanceOptionData, employerId: string | null | undefined) {
  return employerId ? options.employees.filter((employee) => employee.employer_id === employerId) : options.employees;
}

function EmployeeSelect({
  options,
  employerId,
  defaultValue,
}: {
  options: FinanceOptionData;
  employerId?: string | null;
  defaultValue?: string | null;
}) {
  const employees = employeesForEmployer(options, employerId);
  return (
    <select name="employee_id" defaultValue={defaultValue ?? ""} required className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
      <option value="">Select employee</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.full_name ?? employee.email ?? "Employee"} - {employerName(employee)}
        </option>
      ))}
    </select>
  );
}

function EmployerSelect({ options, defaultValue }: { options: FinanceOptionData; defaultValue?: string | null }) {
  return (
    <select name="employer_id" defaultValue={defaultValue ?? ""} required className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
      <option value="">Select employer</option>
      {options.employers.map((employer) => (
        <option key={employer.id} value={employer.id}>{employer.name ?? "Employer"}</option>
      ))}
    </select>
  );
}

function Field({ label: fieldLabel, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
      {fieldLabel}
      {children}
    </label>
  );
}

function TextField({
  name,
  type = "text",
  defaultValue,
  required,
  step,
  min,
}: {
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      required={required}
      step={step}
      min={min}
      defaultValue={defaultValue ?? undefined}
      className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
    />
  );
}

function StatusSelect({ name, values, defaultValue }: { name: string; values: readonly string[]; defaultValue?: string | null }) {
  return (
    <select name={name} defaultValue={defaultValue ?? values[0]} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
      {values.map((value) => <option key={value} value={value}>{label(value)}</option>)}
    </select>
  );
}

function FinanceFilters({ filters, options }: { filters: PortalFinanceFilters; options: FinanceOptionData }) {
  return (
    <Panel title="Filters" description="Filter portal-native finance records by employer, employee, month, and status.">
      <form action="/dashboard/finances" className="grid gap-3 md:grid-cols-5 md:items-end">
        <Field label="Employer">
          <select name="employer" defaultValue={filters.employerIds[0] ?? "all"} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="all">All employers</option>
            {options.employers.map((employer) => <option key={employer.id} value={employer.id}>{employer.name ?? "Employer"}</option>)}
          </select>
        </Field>
        <Field label="Employee">
          <select name="employee" defaultValue={filters.employeeIds[0] ?? "all"} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="all">All employees</option>
            {options.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name ?? employee.email ?? "Employee"}</option>)}
          </select>
        </Field>
        <Field label="Month">
          <input name="month" type="month" defaultValue={monthValue(filters.months[0])} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={filters.statuses[0] ?? "all"} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="all">All statuses</option>
            {[...employerInvoiceStatuses, ...employeePayrollStatuses].map((status) => <option key={status} value={status}>{label(status)}</option>)}
          </select>
        </Field>
        <SubmitButton pendingText="Applying...">Apply filters</SubmitButton>
      </form>
    </Panel>
  );
}

function StatCard({ label: cardLabel, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{cardLabel}</p>
      <p className={`mt-2 text-xl font-bold ${tone ?? "text-slate-950 dark:text-slate-100"}`}>{value}</p>
    </div>
  );
}

function AddEmployerInvoiceForm({ options, filters }: { options: FinanceOptionData; filters: PortalFinanceFilters }) {
  const defaultEmployerId = filters.employerIds[0] ?? "";
  return (
    <form action={upsertEmployerInvoiceRecordAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-4">
      <Field label="Employer"><EmployerSelect options={options} defaultValue={defaultEmployerId} /></Field>
      <Field label="Employee"><EmployeeSelect options={options} employerId={defaultEmployerId} defaultValue={filters.employeeIds[0]} /></Field>
      <Field label="Invoice month"><TextField name="invoice_month" type="month" required defaultValue={monthValue(filters.months[0])} /></Field>
      <Field label="Invoice no."><TextField name="invoice_no" /></Field>
      <Field label="Days worked"><TextField name="days_worked" type="number" min="0" step="0.01" /></Field>
      <Field label="Hourly rate"><TextField name="hourly_rate" type="number" min="0" step="0.01" defaultValue="0" required /></Field>
      <Field label="Hours per week"><TextField name="hours_per_week" type="number" min="0" step="0.01" defaultValue="40" required /></Field>
      <Field label="Status"><StatusSelect name="status" values={employerInvoiceStatuses} /></Field>
      <input type="hidden" name="currency" value="USD" />
      <div className="lg:col-span-4"><SubmitButton pendingText="Adding...">Add invoice row</SubmitButton></div>
    </form>
  );
}

function EmployerInvoiceRow({ row }: { row: PortalEmployerInvoiceRecord }) {
  const lineItems = row.portal_employer_invoice_line_items ?? [];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <form action={upsertEmployerInvoiceRecordAction} className="grid gap-3 lg:grid-cols-8 lg:items-end">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="employer_id" value={row.employer_id} />
        <input type="hidden" name="employee_id" value={row.employee_id} />
        <Field label="Employee"><p className="min-h-10 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold dark:bg-slate-950">{row.employees?.full_name ?? "Employee"}</p></Field>
        <Field label="Invoice no."><TextField name="invoice_no" defaultValue={row.invoice_no} /></Field>
        <Field label="Month"><TextField name="invoice_month" type="month" required defaultValue={monthValue(row.invoice_month)} /></Field>
        <Field label="Days"><TextField name="days_worked" type="number" min="0" step="0.01" defaultValue={row.days_worked} /></Field>
        <Field label="Hourly rate"><TextField name="hourly_rate" type="number" min="0" step="0.01" required defaultValue={row.hourly_rate} /></Field>
        <Field label="Hours/week"><TextField name="hours_per_week" type="number" min="0" step="0.01" required defaultValue={row.hours_per_week} /></Field>
                <Field label="Monthly bill">
                  <p className="h-10 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold dark:bg-slate-950">{currency(row.monthly_bill, row.currency)}</p>
                  <span className="text-xs text-slate-500">Preview: {currency(calculateMonthlyBill(Number(row.hourly_rate), Number(row.hours_per_week)), row.currency)}</span>
                </Field>
        <Field label="Status"><StatusSelect name="status" values={employerInvoiceStatuses} defaultValue={row.status} /></Field>
        <input type="hidden" name="currency" value={row.currency} />
        <div className="flex flex-wrap gap-2 lg:col-span-8">
          <SubmitButton pendingText="Saving...">Save invoice</SubmitButton>
        </div>
      </form>
      <form action={deleteEmployerInvoiceRecordAction} className="mt-2">
        <input type="hidden" name="id" value={row.id} />
        <SubmitButton tone="danger" pendingText="Deleting...">Delete invoice row</SubmitButton>
      </form>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Additional charges</p>
        <div className="mt-3 grid gap-2">
          {lineItems.map((item) => (
            <form key={item.id} action={deleteEmployerInvoiceLineItemAction} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-slate-500">{item.amount === null ? "Note only" : currency(item.amount, row.currency)}{item.note ? ` - ${item.note}` : ""}</p>
              </div>
              <input type="hidden" name="id" value={item.id} />
              <SubmitButton tone="secondary" pendingText="Deleting...">Delete</SubmitButton>
            </form>
          ))}
          {lineItems.length === 0 ? <p className="text-sm text-slate-500">No additional charges yet.</p> : null}
        </div>
        <form action={upsertEmployerInvoiceLineItemAction} className="mt-3 grid gap-2 md:grid-cols-4 md:items-end">
          <input type="hidden" name="invoice_record_id" value={row.id} />
          <Field label="Label">
            <select name="label" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              {employerInvoiceLineItemLabels.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Amount"><TextField name="amount" type="number" min="0" step="0.01" /></Field>
          <Field label="Note"><TextField name="note" /></Field>
          <SubmitButton pendingText="Adding...">Add charge</SubmitButton>
        </form>
      </div>
    </div>
  );
}

function EmployerInvoiceSection({ data, options, filters }: { data: AdminFinanceData; options: FinanceOptionData; filters: PortalFinanceFilters }) {
  return (
    <Panel title="Employer Invoice" description="Employer-facing billing rows. This is what we bill to employers; payroll details stay out of this section.">
      <div className="grid gap-4">
        <AddEmployerInvoiceForm options={options} filters={filters} />
        <div className="grid gap-3">
          {data.employerInvoices.map((row) => <EmployerInvoiceRow key={row.id} row={row} />)}
          {data.employerInvoices.length === 0 ? <EmptyState>No employer invoice records for this filter yet. Add an invoice row to begin.</EmptyState> : null}
        </div>
      </div>
    </Panel>
  );
}

function AddPayrollForm({ options, filters }: { options: FinanceOptionData; filters: PortalFinanceFilters }) {
  const defaultEmployerId = filters.employerIds[0] ?? "";
  return (
    <form action={upsertEmployeePayrollRecordAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-4">
      <Field label="Employer"><EmployerSelect options={options} defaultValue={defaultEmployerId} /></Field>
      <Field label="Employee"><EmployeeSelect options={options} employerId={defaultEmployerId} defaultValue={filters.employeeIds[0]} /></Field>
      <Field label="Payroll month"><TextField name="payroll_month" type="month" required defaultValue={monthValue(filters.months[0])} /></Field>
      <Field label="Gross salary INR"><TextField name="gross_salary_inr" type="number" min="0" step="0.01" defaultValue="0" required /></Field>
      <Field label="Actual paid INR"><TextField name="actual_paid_inr" type="number" min="0" step="0.01" defaultValue="0" required /></Field>
      <Field label="Payment date"><TextField name="payment_date" type="date" /></Field>
      <Field label="Status"><StatusSelect name="payment_status" values={employeePayrollStatuses} /></Field>
      <div className="lg:col-span-4"><SubmitButton pendingText="Adding...">Add payroll row</SubmitButton></div>
    </form>
  );
}

function PayrollRow({ row }: { row: PortalEmployeePayrollRecord }) {
  const lineItems = row.portal_employee_payroll_line_items ?? [];
  const payslip = row.portal_payslip_files?.[0] ?? null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <form action={upsertEmployeePayrollRecordAction} className="grid gap-3 lg:grid-cols-8 lg:items-end">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="employer_id" value={row.employer_id} />
        <input type="hidden" name="employee_id" value={row.employee_id} />
        <Field label="Employee"><p className="min-h-10 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold dark:bg-slate-950">{row.employees?.full_name ?? "Employee"}</p></Field>
        <Field label="Month"><TextField name="payroll_month" type="month" required defaultValue={monthValue(row.payroll_month)} /></Field>
        <Field label="Gross INR"><TextField name="gross_salary_inr" type="number" min="0" step="0.01" required defaultValue={row.gross_salary_inr} /></Field>
        <Field label="Actual paid"><TextField name="actual_paid_inr" type="number" min="0" step="0.01" required defaultValue={row.actual_paid_inr} /></Field>
        <Field label="Payment date"><TextField name="payment_date" type="date" defaultValue={row.payment_date} /></Field>
        <Field label="Status"><StatusSelect name="payment_status" values={employeePayrollStatuses} defaultValue={row.payment_status} /></Field>
        <div className="lg:col-span-2"><SubmitButton pendingText="Saving...">Save payroll</SubmitButton></div>
      </form>
      <form action={deleteEmployeePayrollRecordAction} className="mt-2">
        <input type="hidden" name="id" value={row.id} />
        <SubmitButton tone="danger" pendingText="Deleting...">Delete payroll row</SubmitButton>
      </form>
      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Payslip</p>
          {payslip ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold">{payslip.file_name}</p>
              <p className="text-xs text-slate-500">Uploaded {payslip.uploaded_at ? new Date(payslip.uploaded_at).toLocaleDateString("en-IN") : "recently"}</p>
              {payslip.signed_url ? <a href={payslip.signed_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-blue-700">View / download</a> : null}
            </div>
          ) : <p className="mt-2 text-sm text-slate-500">No payslip uploaded.</p>}
          <form action={uploadPayslipAction} className="mt-3 grid gap-2">
            <input type="hidden" name="payroll_record_id" value={row.id} />
            <input name="file" type="file" accept=".pdf,image/*" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <SubmitButton pendingText="Uploading...">{payslip ? "Replace payslip" : "Upload payslip"}</SubmitButton>
          </form>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Payroll components</p>
          <div className="mt-3 grid gap-2">
            {lineItems.map((item) => (
              <form key={item.id} action={deleteEmployeePayrollLineItemAction} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.amount === null ? "Note only" : currency(item.amount, "INR")}{item.note ? ` - ${item.note}` : ""}</p>
                </div>
                <input type="hidden" name="id" value={item.id} />
                <SubmitButton tone="secondary" pendingText="Deleting...">Delete</SubmitButton>
              </form>
            ))}
            {lineItems.length === 0 ? <p className="text-sm text-slate-500">No payroll components yet.</p> : null}
          </div>
          <form action={upsertEmployeePayrollLineItemAction} className="mt-3 grid gap-2 md:grid-cols-4 md:items-end">
            <input type="hidden" name="payroll_record_id" value={row.id} />
            <Field label="Label">
              <select name="label" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                {employeePayrollLineItemLabels.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Amount"><TextField name="amount" type="number" min="0" step="0.01" /></Field>
            <Field label="Note"><TextField name="note" /></Field>
            <SubmitButton pendingText="Adding...">Add component</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function EmployeePayrollSection({ data, options, filters }: { data: AdminFinanceData; options: FinanceOptionData; filters: PortalFinanceFilters }) {
  return (
    <Panel title="Employee Payroll" description="Employee-facing INR payroll records. Employer billing stays out of this section.">
      <div className="grid gap-4">
        <AddPayrollForm options={options} filters={filters} />
        <div className="grid gap-3">
          {data.employeePayroll.map((row) => <PayrollRow key={row.id} row={row} />)}
          {data.employeePayroll.length === 0 ? <EmptyState>No payroll records for this filter yet. Add a payroll row to begin.</EmptyState> : null}
        </div>
      </div>
    </Panel>
  );
}

export function AdminPortalFinance({
  data,
  options,
  filters,
}: {
  data: AdminFinanceData;
  options: FinanceOptionData;
  filters: PortalFinanceFilters;
}) {
  return (
    <div className="grid gap-5">
      <Panel title="Imported Finance Reconciliation" description="Imported finance reconciliation has moved to Imports -> Finance Reconciliation.">
        <Link href="/dashboard/imports/finance-reconciliation" className="inline-flex h-10 items-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
          Open finance reconciliation
        </Link>
      </Panel>
      <FinanceFilters filters={filters} options={options} />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Invoice rows" value={String(data.totals.employerInvoiceCount)} />
        <StatCard label="Payroll rows" value={String(data.totals.employeePayrollCount)} />
        <StatCard label="Employer monthly bill" value={currency(data.totals.employerMonthlyBill, "USD")} />
        <StatCard label="Actual paid INR" value={currency(data.totals.employeeActualPaidInr, "INR")} />
      </div>
      <EmployerInvoiceSection data={data} options={options} filters={filters} />
      <EmployeePayrollSection data={data} options={options} filters={filters} />
    </div>
  );
}
