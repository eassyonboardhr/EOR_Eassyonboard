/* eslint-disable @typescript-eslint/no-explicit-any */
import { recordEmployeeDocumentAction } from "@/lib/portal/actions/global-onboarding";
import { reviewServiceAgreementAction, uploadServiceAgreementAction } from "@/lib/portal/actions/documents";
import { getDocumentsData } from "@/lib/portal/documents";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, SubmitButton, TextArea, TextInput, formatDate } from "@/components/portal/ui";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = await searchParams;
  const data = await getDocumentsData(session, params);
  const admin = isPlatformAdmin(session.user.role);

  return (
    <PortalShell session={session} title="Documents" subtitle="Review employee documents, company files, templates, and service agreements." wide>
      <div className="grid gap-5">
        {admin ? (
          <Panel title="Upload service agreement" description="Admin-uploaded agreements are visible to the employer for review/download.">
            <form action={uploadServiceAgreementAction} className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Employer
                <select name="employer_id" required className="h-10 rounded-xl border border-slate-300 bg-white px-3">
                  <option value="">Choose employer</option>
                  {data.employers.map((employer: any) => <option key={employer.id} value={employer.id}>{employer.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Employee optional
                <select name="employee_id" className="h-10 rounded-xl border border-slate-300 bg-white px-3">
                  <option value="">General employer agreement</option>
                  {data.employees.map((employee: any) => <option key={employee.id} value={employee.id}>{employee.full_name ?? employee.email}</option>)}
                </select>
              </label>
              <TextInput name="title" label="Agreement title" required />
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Currency
                <select name="currency" className="h-10 rounded-xl border border-slate-300 bg-white px-3">
                  {["USD", "GBP", "EUR", "AUD", "CAD", "SGD", "INR"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                File
                <input name="file" type="file" required className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm font-medium text-slate-700">
                <input name="shared_with_employee" type="checkbox" />
                Share with employee
              </label>
              <div className="md:col-span-3">
                <TextArea name="admin_notes" label="Admin notes" />
              </div>
              <div className="md:col-span-3"><SubmitButton>Upload Agreement</SubmitButton></div>
            </form>
          </Panel>
        ) : null}

        {session.user.role === "employee" ? (
          <Panel title="Upload employee document">
            <form action={recordEmployeeDocumentAction} className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Document type
                <select name="document_type" className="h-10 rounded-xl border border-slate-300 bg-white px-3">
                  {["passport_photo", "aadhaar_card", "pan_card", "bank_proof", "resume", "degree_certificate", "salary_slip", "experience_letter", "relieving_letter"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                File
                <input name="file" type="file" required className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <div className="md:col-span-3"><SubmitButton>Upload Document</SubmitButton></div>
            </form>
          </Panel>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Service agreements">
            <DocumentRows rows={data.serviceAgreements} serviceActions={session.user.role === "employer_admin" || admin} />
          </Panel>
          <Panel title="Employee documents">
            <DocumentRows rows={data.employeeDocuments} />
          </Panel>
          <Panel title="Company documents">
            <DocumentRows rows={data.companyDocuments} />
          </Panel>
          <Panel title="Templates">
            <DocumentRows rows={data.templates} />
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}

function DocumentRows({ rows, serviceActions = false }: { rows: any[]; serviceActions?: boolean }) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-semibold capitalize text-slate-950">{(row.title ?? row.document_type ?? row.template_name ?? "Document").replaceAll("_", " ")}</p>
              <p className="mt-1 text-xs text-slate-500">
                {row.employees?.full_name ?? row.client_companies?.company_name ?? row.employers?.name ?? ""} · {formatDate(row.created_at ?? row.uploaded_at)}
              </p>
            </div>
            {row.status || row.verification_status ? <StatusBadge value={row.status ?? row.verification_status} /> : null}
          </div>
          {row.signed_url ? <a href={row.signed_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-semibold text-blue-700">View / Download</a> : null}
          {row.admin_notes ? <p className="mt-2 text-xs text-slate-500">{row.admin_notes}</p> : null}
          {serviceActions ? (
            <form action={reviewServiceAgreementAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="agreement_id" value={row.id} />
              <select name="status" className="h-9 rounded-xl border border-slate-300 px-2 text-xs">
                <option value="reviewed">Reviewed</option>
                <option value="signed_offline">Signed offline</option>
                <option value="needs_change">Needs change</option>
              </select>
              <input name="employer_notes" placeholder="Notes" className="h-9 rounded-xl border border-slate-300 px-2 text-xs" />
              <SubmitButton tone="secondary">Update</SubmitButton>
            </form>
          ) : null}
        </div>
      ))}
      {rows.length === 0 ? <EmptyState>No documents in this view yet.</EmptyState> : null}
    </div>
  );
}
