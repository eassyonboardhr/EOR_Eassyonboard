import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/ui";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";

type SearchParams = {
  targetType: "employer" | "employee";
  targetId: string;
  action: string;
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

function money(value: number | string | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

async function getEmployer(targetId: string) {
  const supabase = getSupabaseAdmin();
  const [{ data: employer }, { count: employeesCount }, { data: billing }, { data: company }] = await Promise.all([
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
  ]);

  if (!employer) return null;

  const totals = (billing ?? []).reduce(
    (acc, row) => {
      const currency = row.currency ?? "USD";
      acc[currency] = (acc[currency] ?? 0) + Number(row.monthly_bill_amount ?? 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  return { employer, employeesCount: employeesCount ?? 0, billingTotals: totals, company };
}

async function getEmployee(targetId: string) {
  const supabase = getSupabaseAdmin();
  const [{ data: employee }, { data: compensation }, { data: billing }, { data: profile }, { data: progress }, { data: status }, { data: documents }] = await Promise.all([
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
  ]);

  if (!employee) return null;
  return { employee, compensation, billing, profile, progress, status, documents: documents ?? [] };
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

          {action === "finances" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Monthly Billing Summary</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {Object.entries(data.billingTotals).length > 0 ? (
                  Object.entries(data.billingTotals).map(([currency, total]) => (
                    <Field key={currency} label={currency} value={money(total, currency)} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No employer billing records found yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </PortalShell>
    );
  }

  const data = await getEmployee(targetId);
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

  const showFinance = action === "finances" && isAdmin;

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
            <Field label="Documents" value={data.documents.length} />
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

        {showFinance ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Finance Records</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field
                label="Monthly Salary"
                value={money(data.compensation?.monthly_salary, data.compensation?.currency ?? "USD")}
              />
              <Field
                label="Employer Monthly Billing"
                value={money(data.billing?.monthly_bill_amount, data.billing?.currency ?? "USD")}
              />
            </div>
          </div>
        ) : null}

        {action === "docs" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Documents</h2>
            <div className="mt-4 grid gap-3">
              {data.documents.map((document) => (
                <div key={document.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{document.document_type.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs text-slate-500">{document.file_path}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                      {document.verification_status}
                    </span>
                  </div>
                  {document.remarks ? <p className="mt-2 text-xs text-slate-600">{document.remarks}</p> : null}
                </div>
              ))}
              {data.documents.length === 0 ? <p className="text-sm text-slate-500">No employee documents uploaded yet.</p> : null}
            </div>
          </div>
        ) : null}
      </section>
    </PortalShell>
  );
}
