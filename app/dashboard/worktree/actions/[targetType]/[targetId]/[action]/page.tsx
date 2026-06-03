import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/ui";
import { withScopedEmployeeDocumentUrls } from "@/lib/portal/document-access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

type SearchParams = {
  targetType: "employer" | "employee";
  targetId: string;
  action: string;
};

type FinanceInvoice = {
  id: string;
  invoice_number: string | null;
  month_key: string | null;
  status: string | null;
  grand_total_usd_cents: number | string | null;
};

type FinanceInvoiceMeta = {
  invoice_number?: string | null;
  month_key?: string | null;
  status?: string | null;
} | null;

type FinanceLineItem = {
  id: string;
  employee_name_snapshot?: string | null;
  billed_total_usd_cents: number | string | null;
  finance_invoices?: FinanceInvoiceMeta;
};

type FinanceStatementRow = {
  id: string;
  month_key: string | null;
  dollar_inward_usd_cents: number | string | null;
  finance_invoices?: FinanceInvoiceMeta;
};

type FinanceStatementSummary = {
  id: string;
  month_key: string | null;
  effective_dollar_inward_usd_cents: number | string | null;
};

type FinanceSalaryPayment = {
  id: string;
  month_key: string | null;
  pf_inr_cents: number | string | null;
  tds_inr_cents: number | string | null;
  actual_paid_inr_cents: number | string | null;
  paid_status: boolean | null;
};

type EmployerLeaveRequest = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  total_leave_days: number | string | null;
  employees?: { full_name?: string | null } | null;
};

type EmployerEmployeeRequest = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  invite_sent_at: string | null;
  invite_error: string | null;
};

type EmployerOffboardingCase = {
  id: string;
  employee_id: string | null;
  status: string;
  target_last_working_day?: string | null;
};

type EmployerResignation = {
  id: string;
  employee_id: string | null;
  status: string;
  calculated_last_working_day?: string | null;
};

type EmployeeLeaveRequest = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  total_leave_days: number | string | null;
  paid_leave_days: number | string | null;
  lop_days: number | string | null;
  reason: string | null;
};

type EmployeeResignation = {
  id: string;
  status: string;
  notice_period_days: number | string | null;
  calculated_last_working_day: string | null;
  employer_notes: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
};

type EmployeeOffboardingCase = {
  id: string;
  status: string;
  target_last_working_day: string | null;
  completed_at: string | null;
  access_deactivation_confirmed_at: string | null;
  access_deactivation_confirmed_by: string | null;
  employer_notes: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
};

function label(value: string) {
  return value
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function Field({ label: fieldLabel, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{fieldLabel}</p>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value || "Not set"}</div>
    </div>
  );
}

function ModuleLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function money(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function cents(value: number | string | null | undefined, currency = "USD") {
  return money(Number(value ?? 0) / 100, currency);
}

function statusLabel(status: string | null | undefined, { showCashout = false } = {}) {
  if (status === "generated" || status === "sent") return "Raised / Sent";
  if (status === "received") return "Payment received";
  if (status === "cashed_out") return showCashout ? "Cashed out" : "Payment received";
  return status?.replaceAll("_", " ") ?? "Unknown";
}

function sumCents<T>(rows: T[], selector: (row: T) => number | string | null | undefined) {
  return rows.reduce((total, row) => total + Number(selector(row) ?? 0), 0);
}

function employerLifecycleLastWorkingDay(item: EmployerOffboardingCase | EmployerResignation) {
  return "target_last_working_day" in item
    ? item.target_last_working_day
    : (item as EmployerResignation).calculated_last_working_day;
}

async function getEmployer(targetId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Finance sync tables are newer than the generated Supabase types.
  const supabase = getSupabaseAdmin() as any;
  const [
    { data: employer },
    { count: employeesCount },
    { data: billing },
    { data: company },
    { data: employeeRequests },
    { data: leaveRequests },
    { data: offboardingCases },
    { data: resignations },
    { data: financeInvoices },
    { data: financeLineItems },
    { data: financePayments },
  ] = await Promise.all([
    supabase.from("employers").select("*").eq("id", targetId).single(),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("employer_id", targetId),
    supabase
      .from("employer_billing")
      .select("monthly_bill_amount, currency")
      .eq("employer_id", targetId),
    supabase
      .from("client_companies")
      .select("*, client_billing_settings(*), client_employment_defaults(*), client_compliance_settings(*), client_documents(id), contract_templates(id, template_type, template_name, version_number, is_active)")
      .eq("employer_id", targetId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("employee_requests")
      .select("id, full_name, email, status, invite_sent_at, invite_error, created_at")
      .eq("employer_id", targetId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("leave_requests")
      .select("id, employee_id, start_date, end_date, status, total_leave_days, created_at, employees(full_name)")
      .eq("employer_id", targetId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("offboarding_cases")
      .select("id, employee_id, status, target_last_working_day, created_at")
      .eq("employer_id", targetId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("resignations")
      .select("id, employee_id, status, calculated_last_working_day, created_at")
      .eq("employer_id", targetId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("finance_invoices")
      .select("id, invoice_number, month_key, status, grand_total_usd_cents, payment_received_at, due_date, sync_status")
      .eq("employer_id", targetId)
      .eq("sync_status", "synced")
      .order("month_key", { ascending: false })
      .limit(8),
    supabase
      .from("finance_invoice_line_items")
      .select("id, employee_id, employee_name_snapshot, billed_total_usd_cents, finance_invoices(invoice_number, month_key, status)")
      .eq("employer_id", targetId)
      .eq("sync_status", "synced")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("finance_invoice_payments")
      .select("id, payment_month, payment_date, external_invoice_id")
      .eq("employer_id", targetId)
      .order("payment_month", { ascending: false })
      .limit(8),
  ]);

  if (!employer) return null;

  const totals = (billing ?? []).reduce(
    (acc: Record<string, number>, row: { currency?: string | null; monthly_bill_amount?: number | string | null }) => {
      const currency = row.currency ?? "USD";
      acc[currency] = (acc[currency] ?? 0) + Number(row.monthly_bill_amount ?? 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    employer,
    employeesCount: employeesCount ?? 0,
    billingTotals: totals,
    company,
    employeeRequests: (employeeRequests ?? []) as EmployerEmployeeRequest[],
    leaveRequests: (leaveRequests ?? []) as EmployerLeaveRequest[],
    offboardingCases: (offboardingCases ?? []) as EmployerOffboardingCase[],
    resignations: (resignations ?? []) as EmployerResignation[],
    financeInvoices: (financeInvoices ?? []) as FinanceInvoice[],
    financeLineItems: (financeLineItems ?? []) as FinanceLineItem[],
    financePayments: financePayments ?? [],
  };
}

async function getEmployee(targetId: string, session: PortalSession) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Finance sync tables are newer than the generated Supabase types.
  const supabase = getSupabaseAdmin() as any;
  const [
    { data: employee },
    { data: compensation },
    { data: billing },
    { data: profile },
    { data: progress },
    { data: status },
    { data: documents },
    { data: leaveRequests },
    { data: resignations },
    { data: offboardingCases },
    { data: financeLineItems },
    { data: statementRows },
    { data: statementSummaries },
    { data: salaryPayments },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*, employers(id, name)")
      .eq("id", targetId)
      .single(),
    supabase
      .from("employee_compensation")
      .select("*")
      .eq("employee_id", targetId)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("employer_billing")
      .select("*")
      .eq("employee_id", targetId)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("employee_profiles").select("*").eq("employee_id", targetId).maybeSingle(),
    supabase.from("employee_onboarding_progress").select("*").eq("employee_id", targetId).maybeSingle(),
    supabase.from("employee_onboarding_status").select("*").eq("employee_id", targetId).maybeSingle(),
    supabase.from("employee_documents").select("*").eq("employee_id", targetId).order("uploaded_at", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("id, start_date, end_date, status, total_leave_days, paid_leave_days, lop_days, reason, created_at")
      .eq("employee_id", targetId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("resignations")
      .select("id, status, notice_period_days, calculated_last_working_day, acknowledged_at, employer_notes, admin_notes, rejection_reason, created_at")
      .eq("employee_id", targetId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("offboarding_cases")
      .select("id, status, target_last_working_day, completed_at, access_deactivation_confirmed_at, access_deactivation_confirmed_by, employer_notes, admin_notes, rejection_reason, created_at")
      .eq("employee_id", targetId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("finance_invoice_line_items")
      .select("id, employee_id, employee_name_snapshot, billed_total_usd_cents, billing_rate_usd_cents, days_worked, sync_status, finance_invoices(invoice_number, month_key, status)")
      .eq("employee_id", targetId)
      .eq("sync_status", "synced")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("finance_employee_statement_rows")
      .select("id, month_key, dollar_inward_usd_cents, onboarding_advance_usd_cents, reimbursement_usd_cents, appraisal_advance_usd_cents, offboarding_deduction_usd_cents, finance_invoices(invoice_number, status)")
      .eq("employee_id", targetId)
      .eq("sync_status", "synced")
      .order("month_key", { ascending: false })
      .limit(12),
    supabase
      .from("finance_employee_statement_summaries")
      .select("id, month_key, month_label_snapshot, effective_dollar_inward_usd_cents, monthly_dollar_paid_usd_cents")
      .eq("employee_id", targetId)
      .eq("sync_status", "synced")
      .order("month_key", { ascending: false })
      .limit(12),
    supabase
      .from("finance_employee_salary_payments")
      .select("id, month_key, salary_usd_cents, salary_paid_inr_cents, pf_inr_cents, tds_inr_cents, actual_paid_inr_cents, paid_status, paid_date")
      .eq("employee_id", targetId)
      .eq("sync_status", "synced")
      .order("month_key", { ascending: false })
      .limit(12),
  ]);

  if (!employee) return null;
  const signedDocuments = await withScopedEmployeeDocumentUrls(documents ?? [], session);
  return {
    employee,
    compensation,
    billing,
    profile,
    progress,
    status,
    documents: signedDocuments,
    leaveRequests: (leaveRequests ?? []) as EmployeeLeaveRequest[],
    resignations: (resignations ?? []) as EmployeeResignation[],
    offboardingCases: (offboardingCases ?? []) as EmployeeOffboardingCase[],
    financeLineItems: (financeLineItems ?? []) as FinanceLineItem[],
    statementRows: (statementRows ?? []) as FinanceStatementRow[],
    statementSummaries: (statementSummaries ?? []) as FinanceStatementSummary[],
    salaryPayments: (salaryPayments ?? []) as FinanceSalaryPayment[],
  };
}

export default async function WorktreeActionPage({
  params,
}: {
  params: Promise<SearchParams>;
}) {
  const session = await requirePortalRole([
    "super_admin",
    "admin",
    "employer_admin",
    "employee",
  ]);
  const { targetType, targetId, action } = await params;

  if (targetType !== "employer" && targetType !== "employee") notFound();

  const isAdmin = isPlatformAdmin(session.user.role);
  const actionTitle = label(action);

  if (targetType === "employer") {
    const data = await getEmployer(targetId);
    if (!data) notFound();

    if (!isAdmin && session.user.employer_id !== data.employer.id) {
      throw new Error("You cannot view this employer action.");
    }

    return (
      <PortalShell
        session={session}
        title={`${data.employer.name} ${actionTitle}`}
        subtitle="Worktree action details backed by current portal records."
      >
        <section className="grid gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-950">{data.employer.name}</p>
                <p className="mt-1 text-sm text-slate-500">{data.employer.contact_email ?? "No contact email"}</p>
              </div>
              <Link href="/dashboard/worktree" className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
                Back to Worktree
              </Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Field label="Status" value={data.employer.status} />
              <Field label="Employees" value={data.employeesCount} />
              <Field label="Contact" value={data.employer.contact_name} />
              <Field label="Client Onboarding" value={data.company?.onboarding_status} />
              <Field label="Country" value={data.company?.country} />
              <Field label="Industry" value={data.company?.industry} />
            </div>
          </div>

          {data.company ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Client Company Setup</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Legal Name" value={data.company.company_name} />
                <Field label="Registration" value={data.company.registration_number} />
                <Field label="Website" value={data.company.website} />
                <Field label="Working Hours" value={data.company.client_employment_defaults?.working_hours} />
                <Field label="Notice Period" value={data.company.client_employment_defaults?.notice_period} />
                <Field label="Work Mode" value={data.company.client_employment_defaults?.work_mode} />
                <Field label="Billing Currency" value={data.company.client_billing_settings?.currency} />
                <Field label="Payment Terms" value={data.company.client_billing_settings?.payment_terms} />
                <Field label="Company Documents" value={data.company.client_documents?.length ?? 0} />
              </div>
            </div>
          ) : null}

          {action === "details" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Role-Aware Modules</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <ModuleLink href="/dashboard/onboarding" title="Onboarding" description="Review employer setup, hiring requests, company documents, and templates." />
                <ModuleLink href={isAdmin ? `/dashboard/admin/leaves?employer=${data.employer.id}` : "/dashboard/employer/leaves"} title="Leaves" description="Open the live leave queue scoped to this employer." />
                <ModuleLink href="/dashboard/worktree" title="Worktree" description="Return to the organization chart and employee relationship view." />
              </div>
            </div>
          ) : null}

          {action === "finances" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Synced Finance Summary</h2>
                  <p className="mt-1 text-sm text-slate-500">Invoice Generator billing and payment status for this employer.</p>
                </div>
                <Link href={`/dashboard/finances?employer=${data.employer.id}`} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
                  Open Finance Page
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Total invoiced" value={cents(sumCents(data.financeInvoices, (row) => row.grand_total_usd_cents))} />
                <Field label="Pending payment" value={cents(sumCents(data.financeInvoices.filter((row) => row.status === "generated" || row.status === "sent"), (row) => row.grand_total_usd_cents))} />
                <Field label="Payment received" value={cents(sumCents(data.financeInvoices.filter((row) => row.status === "received"), (row) => row.grand_total_usd_cents))} />
                <Field label="Cashed out" value={cents(sumCents(data.financeInvoices.filter((row) => row.status === "cashed_out"), (row) => row.grand_total_usd_cents))} />
                <Field label="Invoice count" value={data.financeInvoices.length} />
                <Field label="Payment records" value={data.financePayments.length} />
              </div>
              {data.financeInvoices.length > 0 ? (
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {data.financeInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-4 py-3 font-semibold text-slate-950">{invoice.invoice_number}</td>
                          <td className="px-4 py-3 text-slate-600">{invoice.month_key}</td>
                          <td className="px-4 py-3 text-slate-600">{statusLabel(invoice.status, { showCashout: true })}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-950">{cents(invoice.grand_total_usd_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No synced invoices found yet. Sync from Invoice Generator, then map the company in Finance Mapping.</p>
              )}
              {Object.entries(data.billingTotals).length > 0 ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">Current configured monthly billing</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {Object.entries(data.billingTotals as Record<string, number>).map(([currency, total]) => (
                      <Field key={currency} label={currency} value={money(total, currency)} />
                    ))}
                  </div>
                </div>
              ) : null}
              {data.financeLineItems.length > 0 ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-950">Recent employee billing rows</p>
                  <div className="mt-3 grid gap-3">
                    {data.financeLineItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-semibold text-slate-950">{item.employee_name_snapshot}</p>
                          <p className="font-semibold text-slate-950">{cents(item.billed_total_usd_cents)}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.finance_invoices?.invoice_number ?? "Invoice"} · {item.finance_invoices?.month_key ?? "Month not set"} · {statusLabel(item.finance_invoices?.status, { showCashout: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {action === "leaves" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Recent Leave Requests</h2>
              <div className="mt-4 grid gap-3">
                {data.leaveRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-950">{request.employees?.full_name ?? "Employee"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {request.start_date} to {request.end_date} · {request.total_leave_days ?? "-"} days · {request.status}
                    </p>
                  </div>
                ))}
                {data.leaveRequests.length === 0 ? <p className="text-sm text-slate-500">No leave requests found for this employer.</p> : null}
              </div>
              <div className="mt-4">
                <Link href={isAdmin ? `/dashboard/admin/leaves?employer=${data.employer.id}` : "/dashboard/employer/leaves"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                  Open Leave Module
                </Link>
              </div>
            </div>
          ) : null}

          {action === "onboarding-requests" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Hiring And Onboarding Requests</h2>
              <div className="mt-4 grid gap-3">
                {data.employeeRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-950">{request.full_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {request.email} · {request.status} · Invite {request.invite_sent_at ? "sent" : "not sent"}
                    </p>
                    {request.invite_error ? <p className="mt-2 text-xs font-semibold text-rose-700">{request.invite_error}</p> : null}
                  </div>
                ))}
                {data.employeeRequests.length === 0 ? <p className="text-sm text-slate-500">No onboarding requests found for this employer.</p> : null}
              </div>
              <div className="mt-4">
                <Link href={`/dashboard/onboarding?employer=${data.employer.id}`} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                  Open Onboarding Module
                </Link>
              </div>
            </div>
          ) : null}

          {action === "offboarding-requests" || action === "resignations" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">
                {action === "offboarding-requests" ? "Offboarding Requests" : "Resignations"}
              </h2>
              <div className="mt-4 grid gap-3">
                {(action === "offboarding-requests" ? data.offboardingCases : data.resignations).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-950">{item.status.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Employee {item.employee_id} · Last working day {employerLifecycleLastWorkingDay(item) ?? "not set"}
                    </p>
                  </div>
                ))}
                {(action === "offboarding-requests" ? data.offboardingCases : data.resignations).length === 0 ? (
                  <p className="text-sm text-slate-500">No records found yet.</p>
                ) : null}
              </div>
              <div className="mt-4">
                <Link href={action === "offboarding-requests" ? "/dashboard/offboarding" : "/dashboard/resignations"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                  Open {action === "offboarding-requests" ? "Offboarding" : "Resignations"}
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </PortalShell>
    );
  }

  const data = await getEmployee(targetId, session);
  if (!data) notFound();

  if (
    session.user.role === "employer_admin" &&
    session.user.employer_id !== data.employee.employer_id
  ) {
    throw new Error("You cannot view this employee action.");
  }

  if (
    session.user.role === "employee" &&
    session.user.id !== data.employee.portal_user_id
  ) {
    throw new Error("You cannot view this employee action.");
  }

  const canViewEmployeeBilling = action === "finances" && (isAdmin || session.user.role === "employer_admin");
  const canViewEmployeePay = action === "finances" && isAdmin;
  const documentSummary = data.documents.reduce(
    (acc, document) => {
      const status = document.verification_status ?? "Pending";
      acc.total += 1;
      if (status === "Approved") acc.approved += 1;
      if (status === "Rejected") acc.rejected += 1;
      if (status === "Pending") acc.pending += 1;
      return acc;
    },
    { total: 0, approved: 0, rejected: 0, pending: 0 },
  );

  return (
    <PortalShell
      session={session}
      title={`${data.employee.full_name} ${actionTitle}`}
      subtitle="Worktree employee action details backed by current portal records."
    >
      <section className="grid gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">{data.employee.full_name}</p>
              <p className="mt-1 text-sm text-slate-500">{data.employee.email}</p>
            </div>
            <Link href="/dashboard/worktree" className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
              Back to Worktree
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Field label="Job title" value={data.employee.job_title} />
            <Field label="Department / Team" value={data.employee.department} />
            <Field label="Lifecycle" value={data.employee.lifecycle_status} />
            <Field label="Status" value={data.employee.status} />
            <Field label="Employer" value={data.employee.employers?.name} />
            <Field label="Start date" value={data.employee.start_date} />
            <Field label="Onboarding Status" value={data.status?.status} />
            <Field label="Completion" value={`${data.progress?.completion_percentage ?? 0}%`} />
            <Field label="Documents" value={`${documentSummary.approved}/${documentSummary.total} approved`} />
            <Field label="Notice Period" value={data.employee.notice_period_days ? `${data.employee.notice_period_days} days` : null} />
            <Field label="Employer Setup" value={data.employee.employer_setup_completed_at ? "Completed" : "Pending"} />
            <Field label="Setup Notes" value={data.employee.employer_setup_notes} />
          </div>
        </div>

        {data.profile ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Self-Onboarding Details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Father's Name" value={data.profile.father_name} />
              <Field label="Date of Birth" value={data.profile.date_of_birth} />
              <Field label="Phone" value={data.profile.phone} />
              <Field label="Alternate Phone" value={data.profile.alternate_phone} />
              <Field label="LinkedIn" value={data.profile.linkedin_url} />
              <Field label="Portfolio" value={data.profile.portfolio_url} />
            </div>
          </div>
        ) : null}

        {action === "docs" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Documents</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Field label="Total" value={documentSummary.total} />
              <Field label="Approved" value={documentSummary.approved} />
              <Field label="Pending" value={documentSummary.pending} />
              <Field label="Rejected" value={documentSummary.rejected} />
            </div>
            <div className="mt-4 grid gap-3">
              {data.documents.map((document) => (
                <div key={document.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{(document.document_type ?? "document").replaceAll("_", " ")}</p>
                      {document.signed_url ? (
                        <a href={document.signed_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-semibold text-blue-700">
                          View / Download
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">{document.file_path}</p>
                      )}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                      {document.verification_status}
                    </span>
                  </div>
                </div>
              ))}
              {data.documents.length === 0 ? <p className="text-sm text-slate-500">No employee documents uploaded yet.</p> : null}
            </div>
          </div>
        ) : null}

        {action === "leaves" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Leave Module</h2>
            <div className="mt-4 grid gap-3">
              {data.leaveRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-slate-950">
                    {request.start_date} to {request.end_date} · {request.status}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {request.total_leave_days ?? "-"} day(s) · paid {request.paid_leave_days ?? 0} · LOP {request.lop_days ?? 0}
                  </p>
                  {request.reason ? <p className="mt-2 text-xs text-slate-600">{request.reason}</p> : null}
                </div>
              ))}
              {data.leaveRequests.length === 0 ? <p className="text-sm text-slate-500">No leave requests found yet.</p> : null}
            </div>
            <div className="mt-4">
              <Link href={session.user.role === "employee" ? "/dashboard/employee/leaves" : `/dashboard/leaves/history/${data.employee.id}`} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                Open Leaves
              </Link>
            </div>
          </div>
        ) : null}

        {action === "resignation" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Resignation Module</h2>
            <div className="mt-4 grid gap-3">
              {data.resignations.map((resignation) => (
                <div key={resignation.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold capitalize text-slate-950">{resignation.status.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Notice {resignation.notice_period_days ?? "-"} days · Last working day {resignation.calculated_last_working_day ?? "not set"}
                  </p>
                  {resignation.employer_notes || resignation.admin_notes || resignation.rejection_reason ? (
                    <p className="mt-2 text-xs text-slate-600">{resignation.employer_notes ?? resignation.admin_notes ?? resignation.rejection_reason}</p>
                  ) : null}
                </div>
              ))}
              {data.resignations.length === 0 ? <p className="text-sm text-slate-500">No resignation records found yet.</p> : null}
            </div>
            <div className="mt-4">
              <Link href="/dashboard/resignations" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                Open Resignations
              </Link>
            </div>
          </div>
        ) : null}

        {action === "offboarding" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Offboarding Module</h2>
            <div className="mt-4 grid gap-3">
              {data.offboardingCases.map((offboarding) => (
                <div key={offboarding.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold capitalize text-slate-950">{offboarding.status.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target LWD {offboarding.target_last_working_day ?? "not set"} · Completed {offboarding.completed_at ? "yes" : "no"} · Access confirmed {offboarding.access_deactivation_confirmed_at ? "yes" : "no"}
                  </p>
                  {offboarding.access_deactivation_confirmed_at ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Access deactivation confirmed on {offboarding.access_deactivation_confirmed_at}
                      {offboarding.access_deactivation_confirmed_by ? ` by ${offboarding.access_deactivation_confirmed_by}` : ""}
                    </p>
                  ) : null}
                  {offboarding.employer_notes || offboarding.admin_notes || offboarding.rejection_reason ? (
                    <p className="mt-2 text-xs text-slate-600">{offboarding.employer_notes ?? offboarding.admin_notes ?? offboarding.rejection_reason}</p>
                  ) : null}
                </div>
              ))}
              {data.offboardingCases.length === 0 ? <p className="text-sm text-slate-500">No offboarding records found yet.</p> : null}
            </div>
            <div className="mt-4">
              <Link href="/dashboard/offboarding" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                Open Offboarding
              </Link>
            </div>
          </div>
        ) : null}

        {action === "finances" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Finance Records</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isAdmin ? "Admin-only employee pay and employer billing view." : "Employer billing view for this employee."}
                </p>
              </div>
              <Link href={`/dashboard/finances?employee=${data.employee.id}`} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
                Open Finance Page
              </Link>
            </div>
            {canViewEmployeeBilling ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Synced employer billing" value={cents(sumCents(data.financeLineItems, (row) => row.billed_total_usd_cents))} />
                <Field label="Billing months" value={new Set(data.financeLineItems.map((row) => row.finance_invoices?.month_key).filter(Boolean)).size} />
                <Field label="Latest billing status" value={statusLabel(data.financeLineItems[0]?.finance_invoices?.status, { showCashout: isAdmin })} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Employee finance details are available from your own finance page.
              </p>
            )}
            {canViewEmployeeBilling && data.financeLineItems.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Employer billing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.financeLineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-slate-600">{item.finance_invoices?.month_key ?? "Not set"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-950">{item.finance_invoices?.invoice_number ?? "Invoice"}</td>
                        <td className="px-4 py-3 text-slate-600">{statusLabel(item.finance_invoices?.status, { showCashout: isAdmin })}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-950">{cents(item.billed_total_usd_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : canViewEmployeeBilling ? (
              <p className="mt-4 text-sm text-slate-500">No synced month-wise billing rows found for this employee yet.</p>
            ) : null}
            {canViewEmployeePay ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Admin employee pay summary</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Field label="Dollar inward" value={cents(sumCents(data.statementRows, (row) => row.dollar_inward_usd_cents))} />
                  <Field label="Effective inward" value={cents(sumCents(data.statementSummaries, (row) => row.effective_dollar_inward_usd_cents))} />
                  <Field label="Actual paid INR" value={cents(sumCents(data.salaryPayments, (row) => row.actual_paid_inr_cents), "INR")} />
                  <Field label="PF INR" value={cents(sumCents(data.salaryPayments, (row) => row.pf_inr_cents), "INR")} />
                  <Field label="TDS INR" value={cents(sumCents(data.salaryPayments, (row) => row.tds_inr_cents), "INR")} />
                  <Field
                    label="Current monthly salary"
                    value={money(data.compensation?.monthly_salary, data.compensation?.currency ?? "USD")}
                  />
                </div>
                {data.salaryPayments.length > 0 || data.statementRows.length > 0 ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">Dollar inward rows</p>
                      <div className="mt-3 grid gap-2">
                        {data.statementRows.slice(0, 6).map((row) => (
                          <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-600">{row.month_key} · {row.finance_invoices?.invoice_number ?? "Invoice"}</span>
                            <span className="font-semibold text-slate-950">{cents(row.dollar_inward_usd_cents)}</span>
                          </div>
                        ))}
                        {data.statementRows.length === 0 ? <p className="text-sm text-slate-500">No statement rows synced yet.</p> : null}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">INR salary payments</p>
                      <div className="mt-3 grid gap-2">
                        {data.salaryPayments.slice(0, 6).map((row) => (
                          <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-600">{row.month_key} · {row.paid_status ? "Paid" : "Pending"}</span>
                            <span className="font-semibold text-slate-950">{cents(row.actual_paid_inr_cents, "INR")}</span>
                          </div>
                        ))}
                        {data.salaryPayments.length === 0 ? <p className="text-sm text-slate-500">No salary payments synced yet.</p> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </PortalShell>
  );
}
