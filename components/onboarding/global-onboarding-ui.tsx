"use client";

import {
  createCustomFieldAction,
  recordEmployeeDocumentAction,
  reviewClientCompanyAction,
  reviewEmployeeDocumentAction,
  reviewEmployeeOnboardingAction,
  saveEmployeeEmployerSetupAction,
  saveEmployeeSelfOnboardingAction,
  saveEmployerOnboardingAction,
  uploadCompanyDocumentAction,
  uploadContractTemplateAction,
} from "@/lib/portal/actions/global-onboarding";
import { createEmployeeRequestAction } from "@/lib/portal/actions/employee";

type Row = Record<string, unknown>;

function value(row: Row | null | undefined, key: string) {
  const raw = row?.[key];
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
}

function rows(value: unknown) {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function fieldValue(values: Row[], fieldId: unknown) {
  const match = values.find((item) => item.custom_field_id === fieldId);
  const raw = match?.value;
  return typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? String(raw) : "";
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function TextArea({ name, label, required, defaultValue }: { name: string; label: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={3}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <select name={name} defaultValue={defaultValue} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Submit({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${
        danger ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-blue-700 text-white hover:bg-blue-800"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ value: badgeValue }: { value: unknown }) {
  const text = String(badgeValue ?? "unknown");
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
      {text.replaceAll("_", " ")}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CustomFieldInputs({ fields, values: customValues = [] }: { fields: Row[]; values?: Row[] }) {
  if (fields.length === 0) return null;

  return (
    <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
      {fields.map((field) => {
        const id = String(field.id);
        const name = `custom_${id}`;
        const label = String(field.field_label ?? "Custom field");
        const required = Boolean(field.required);
        const defaultValue = fieldValue(customValues, id) || String(field.default_value ?? "");
        const fieldType = String(field.field_type ?? "text");
        const fieldOptions = Array.isArray(field.options)
          ? field.options.map((option) => String(option))
          : String(field.default_value ?? "")
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean);

        if (fieldType === "textarea") {
          return <TextArea key={id} name={name} label={label} required={required} defaultValue={defaultValue} />;
        }

        if (fieldType === "dropdown") {
          return (
            <label key={id} className="grid gap-1 text-sm font-medium text-slate-700">
              {label}
              <select name={name} required={required} defaultValue={defaultValue} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select</option>
                {fieldOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          );
        }

        if (fieldType === "checkbox") {
          return (
            <label key={id} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name={name} defaultChecked={defaultValue === "true"} />
              {label}
            </label>
          );
        }

        const inputType = ["number", "email", "url", "date"].includes(fieldType) ? fieldType : "text";
        return <Field key={id} name={name} label={label} type={inputType} required={required} defaultValue={defaultValue} />;
      })}
    </div>
  );
}

function EmployerWizard({ company, customFields, customValues }: { company?: Row; customFields: Row[]; customValues: Row[] }) {
  return (
    <form action={saveEmployerOnboardingAction} className="grid gap-5">
      {company?.id ? <input type="hidden" name="company_id" value={String(company.id)} /> : null}
      <Panel title="Step 1: Company Information">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="company_name" label="Legal Company Name" required defaultValue={value(company, "company_name")} />
          <Field name="trading_name" label="Trading Name" defaultValue={value(company, "trading_name")} />
          <Field name="country" label="Country of Incorporation" required defaultValue={value(company, "country")} />
          <Field name="registration_number" label="Company Registration Number" required defaultValue={value(company, "registration_number")} />
          <Field name="registration_type" label="Registration Type" defaultValue={value(company, "registration_type")} />
          <Field name="website" label="Company Website" required defaultValue={value(company, "website")} />
          <Field name="industry" label="Industry" required defaultValue={value(company, "industry")} />
          <Field name="employee_count" label="Number of Employees" type="number" defaultValue={value(company, "employee_count")} />
        </div>
      </Panel>

      <Panel title="Step 2-3: Contacts and Signatory">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="primary_name" label="Primary Contact Full Name" required />
          <Field name="primary_designation" label="Primary Contact Designation" />
          <Field name="primary_email" label="Primary Contact Email" type="email" required />
          <Field name="primary_phone" label="Primary Contact Phone" />
          <Field name="primary_timezone" label="Time Zone" required defaultValue="Asia/Singapore" />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            <input type="checkbox" name="signatory_same_as_primary" />
            Authorized signatory is same as primary contact
          </label>
          <Field name="signatory_name" label="Signatory Full Name" />
          <Field name="signatory_designation" label="Signatory Designation" />
          <Field name="signatory_email" label="Signatory Email" type="email" />
          <Field name="signatory_phone" label="Signatory Phone" />
        </div>
      </Panel>

      <Panel title="Step 4-6: Billing, Defaults, and Compliance">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="billing_contact_name" label="Billing Contact Name" required />
          <Field name="billing_contact_email" label="Billing Contact Email" type="email" required />
          <Field name="billing_contact_phone" label="Billing Contact Phone" />
          <Field name="accounts_email" label="Accounts Email" type="email" />
          <Select name="currency" label="Currency" options={["USD", "GBP", "EUR", "AUD", "CAD", "SGD", "INR"]} />
          <Select name="payment_terms" label="Payment Terms" options={["Net 15", "Net 30", "Net 45"]} />
          <Field name="working_hours" label="Standard Working Hours" required defaultValue="40 hours/week" />
          <Field name="notice_period" label="Notice Period" required defaultValue="30 days" />
          <Field name="probation_period" label="Probation Period" required defaultValue="3 months" />
          <Field name="leave_policy" label="Leave Policy" required defaultValue="Standard India leave policy" />
          <Select name="work_mode" label="Work Mode" options={["Remote", "Hybrid", "Onsite"]} />
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            {[
              ["nda_required", "NDA Required"],
              ["background_check_required", "Background Verification Required"],
              ["equipment_required", "Company Equipment Required"],
              ["handles_customer_data", "Employee Handles Customer Data"],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2">
                <input type="checkbox" name={name} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="Employer Custom Fields">
        <CustomFieldInputs fields={customFields} values={customValues} />
        {customFields.length === 0 ? <p className="text-sm text-slate-500">No employer custom fields configured.</p> : null}
      </Panel>
      <Submit>Save and Submit Employer Onboarding</Submit>
    </form>
  );
}

function HiringRequestForm() {
  return (
    <form action={createEmployeeRequestAction} className="grid gap-4 md:grid-cols-2">
      <Field name="full_name" label="Candidate Name" required />
      <Field name="email" label="Candidate Email" type="email" required />
      <Field name="job_title" label="Job Title" required />
      <Field name="department" label="Department / Team" />
      <Field name="proposed_start_date" label="Start Date" type="date" />
      <Select name="billing_currency" label="Billing Currency" options={["USD", "INR", "EUR", "GBP", "AED"]} />
      <Field name="hourly_billing_rate" label="Employer Billing / Hr" type="number" required />
      <Field name="hours_per_week" label="Hours / Week" type="number" defaultValue={40} />
      <div className="md:col-span-2">
        <TextArea name="onboarding_notes" label="Notes" />
      </div>
      <div className="md:col-span-2">
        <Submit>Create Hiring Request</Submit>
      </div>
    </form>
  );
}

function EmployeeSetupForm({
  employees,
  teams,
  leavePolicies,
}: {
  employees: Row[];
  teams: Row[];
  leavePolicies: Row[];
}) {
  return (
    <form action={saveEmployeeEmployerSetupAction} className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Verified Employee
        <select name="employee_id" required className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="">Select employee</option>
          {employees.map((employee) => (
            <option key={String(employee.id)} value={String(employee.id)}>
              {String(employee.full_name ?? employee.email)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Team
        <select name="team_id" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="">No team</option>
          {teams.map((team) => (
            <option key={String(team.id)} value={String(team.id)}>
              {String(team.name)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Manager
        <select name="manager_employee_id" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="">No manager</option>
          {employees.map((employee) => (
            <option key={String(employee.id)} value={String(employee.id)}>
              {String(employee.full_name ?? employee.email)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Leave Policy
        <select name="leave_policy_id" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="">Use company default</option>
          {leavePolicies.map((policy) => (
            <option key={String(policy.id)} value={String(policy.id)}>
              {String(policy.year)} policy
            </option>
          ))}
        </select>
      </label>
      <Field name="notice_period_days" label="Notice Period Days" type="number" defaultValue={30} required />
      <div className="md:col-span-2">
        <TextArea name="employer_setup_notes" label="Setup Notes" />
      </div>
      <div className="md:col-span-2">
        <Submit>Save Employee Setup</Submit>
      </div>
    </form>
  );
}

function TemplateForm({ companies }: { companies: Row[] }) {
  return (
    <form action={uploadContractTemplateAction} className="grid gap-4 md:grid-cols-2">
      <Select name="template_type" label="Template Type" options={["offer_letter", "employment_agreement", "nda", "policy_document", "custom_template"]} />
      <Field name="template_name" label="Template Name" required />
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Company
        <select name="company_id" className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
          <option value="">Global / unassigned</option>
          {companies.map((company) => (
            <option key={String(company.id)} value={String(company.id)}>
              {String(company.company_name ?? company.name ?? "Company")}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Template File
        <input name="file" type="file" required className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
      </label>
      <div className="md:col-span-2">
        <Submit>Upload Template Version</Submit>
      </div>
    </form>
  );
}

function CompanyDocumentForm({ companies }: { companies: Row[] }) {
  if (companies.length === 0) {
    return <p className="text-sm text-slate-500">Save employer onboarding first, then upload company documents.</p>;
  }

  return (
    <form action={uploadCompanyDocumentAction} className="grid gap-4 md:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Company
        <select name="company_id" className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
          {companies.map((company) => (
            <option key={String(company.id)} value={String(company.id)}>
              {String(company.company_name ?? "Company")}
            </option>
          ))}
        </select>
      </label>
      <Select name="document_type" label="Document Type" options={["incorporation_certificate", "company_logo", "authorized_signatory_id", "supporting_document"]} />
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        File
        <input name="file" type="file" required className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
      </label>
      <div className="md:col-span-3">
        <Submit>Upload Company Document</Submit>
      </div>
    </form>
  );
}

function RecordsList({ title, records }: { title: string; records: Row[] }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-3 grid gap-2">
        {records.map((record) => (
          <div key={String(record.id)} className="rounded-lg bg-white p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-950">
              {String(record.document_type ?? record.template_name ?? record.field_label ?? "Record").replaceAll("_", " ")}
            </p>
            <p className="mt-1 break-all">{String(record.file_path ?? record.value ?? record.verification_status ?? "")}</p>
          </div>
        ))}
        {records.length === 0 ? <p className="text-sm text-slate-500">No records yet.</p> : null}
      </div>
    </div>
  );
}

function CustomFieldForm({ companies }: { companies: Row[] }) {
  return (
    <form action={createCustomFieldAction} className="grid gap-4 md:grid-cols-2">
      <Select name="target_type" label="Target" options={["employee", "employer"]} />
      <Field name="field_label" label="Label" required />
      <Field name="field_key" label="Field Key" required />
      <Select name="field_type" label="Type" options={["text", "textarea", "number", "email", "phone", "url", "date", "dropdown", "multi_select", "checkbox", "file_upload"]} />
      <Field name="placeholder" label="Placeholder" />
      <Field name="help_text" label="Help Text" />
      <Field name="default_value" label="Default Value" />
      <Field name="options" label="Dropdown Options (comma separated)" />
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Company
        <select name="company_id" className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
          <option value="">Global</option>
          {companies.map((company) => (
            <option key={String(company.id)} value={String(company.id)}>
              {String(company.company_name ?? "Company")}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" name="required" />
        Required
      </label>
      <div className="md:col-span-2">
        <Submit>Create Custom Field</Submit>
      </div>
    </form>
  );
}

function EmployeeSelfOnboarding({ data }: { data: Row }) {
  const employee = data.employee as Row | null;
  const customFields = rows(data.customFields);
  const customValues = rows(data.customFieldValues);
  const documents = rows(data.documents);
  const status = data.status as Row | null;
  const progress = data.progress as Row | null;
  if (!employee) {
    return <Panel title="Employee Onboarding">Your employee profile is not linked yet.</Panel>;
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{String(status?.status ?? "Draft")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Progress</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{String(progress?.completion_percentage ?? 0)}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Documents</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{documents.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Corrections</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{documents.filter((doc) => doc.verification_status === "Rejected").length}</p>
        </div>
      </div>
      <Panel title="Employee Self-Onboarding">
        <form action={saveEmployeeSelfOnboardingAction} className="grid gap-4 md:grid-cols-2">
          <Field name="full_name" label="Full Name" required defaultValue={String(employee.full_name ?? "")} />
          <Field name="father_name" label="Father's Name" required />
          <Field name="date_of_birth" label="Date of Birth" type="date" required />
          <Field name="gender" label="Gender" required />
          <Field name="email" label="Email" type="email" required defaultValue={String(employee.email ?? "")} />
          <Field name="phone" label="Phone Number" required />
          <Field name="alternate_phone" label="Alternate Phone Number" />
          <Field name="linkedin_url" label="LinkedIn URL" />
          <Field name="github_url" label="GitHub URL" />
          <Field name="portfolio_url" label="Portfolio URL" />
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <TextArea name="current_address" label="Current Address" required />
            <TextArea name="permanent_address" label="Permanent Address" required />
          </div>
          <Field name="state" label="State" required />
          <Field name="city" label="City" required />
          <Field name="postal_code" label="PIN Code" required />
          <Field name="emergency_contact_name" label="Emergency Contact Name" required />
          <Field name="emergency_relationship" label="Relationship" required />
          <Field name="emergency_phone" label="Emergency Phone" required />
          <Field name="aadhaar_number" label="Aadhaar Number" required />
          <Field name="pan_number" label="PAN Number" required />
          <Field name="passport_number" label="Passport Number" />
          <Field name="account_holder_name" label="Account Holder Name" required />
          <Field name="account_number" label="Account Number" required />
          <Field name="ifsc_code" label="IFSC Code" required />
          <Field name="bank_name" label="Bank Name" required />
          <Field name="branch_name" label="Branch Name" />
          <Field name="qualification" label="Highest Qualification" required />
          <Field name="institution" label="Institution" required />
          <Field name="year_of_passing" label="Year of Passing" type="number" required />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="is_fresher" defaultChecked />
            Fresher
          </label>
          <Field name="total_experience" label="Total Experience" />
          <Field name="previous_company" label="Previous Company" />
          <Field name="previous_designation" label="Previous Designation" />
          <CustomFieldInputs fields={customFields} values={customValues} />
          <div className="md:col-span-2">
            <Submit>Submit Self-Onboarding</Submit>
          </div>
        </form>
      </Panel>
      <Panel title="Document Uploads">
        <form action={recordEmployeeDocumentAction} className="grid gap-4 md:grid-cols-3">
          <Select name="document_type" label="Document Type" options={["passport_photo", "aadhaar_card", "pan_card", "bank_proof", "resume", "degree_certificate", "salary_slip", "experience_letter", "relieving_letter"]} />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            File
            <input name="file" type="file" required className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <div className="pt-6">
            <Submit>Upload Document</Submit>
          </div>
        </form>
        <div className="mt-5 grid gap-2">
          {documents.map((document) => (
            <div key={String(document.id)} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">{String(document.document_type).replaceAll("_", " ")}</p>
                <Badge value={document.verification_status} />
              </div>
              <p className="mt-1 break-all text-xs text-slate-500">{String(document.file_path)}</p>
              {document.remarks ? <p className="mt-2 text-xs font-medium text-rose-700">{String(document.remarks)}</p> : null}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ReviewTable({ rows, type }: { rows: Row[]; type: "company" | "employee" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Context</th>
            <th className="py-2 pr-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const employee = row.employees as Row | undefined;
            const employer = employee?.employers as Row | undefined;
            return (
              <tr key={String(row.id)} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold">{String(row.company_name ?? employee?.full_name ?? "Onboarding")}</td>
                <td className="py-3 pr-4"><Badge value={row.onboarding_status ?? row.status} /></td>
                <td className="py-3 pr-4 text-slate-500">{String(row.country ?? employer?.name ?? "")}</td>
                <td className="py-3 pr-4">
                  {type === "company" ? (
                    <div className="flex flex-wrap gap-2">
                      {["approved", "needs_correction", "rejected"].map((decision) => (
                        <form key={decision} action={reviewClientCompanyAction}>
                          <input type="hidden" name="company_id" value={String(row.id)} />
                          <input type="hidden" name="decision" value={decision} />
                          <Submit danger={decision === "rejected"}>{decision.replace("_", " ")}</Submit>
                        </form>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {["Approved", "Needs Correction", "Rejected"].map((decision) => (
                        <form key={decision} action={reviewEmployeeOnboardingAction}>
                          <input type="hidden" name="employee_id" value={String(row.employee_id)} />
                          <input type="hidden" name="decision" value={decision} />
                          <Submit danger={decision === "Rejected"}>{decision}</Submit>
                        </form>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="py-5 text-sm text-slate-500">Nothing to review yet.</p> : null}
    </div>
  );
}

function EmployeeDocumentReview({ documents }: { documents: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="py-2 pr-4">Employee</th>
            <th className="py-2 pr-4">Document</th>
            <th className="py-2 pr-4">Path</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Review</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const employee = document.employees as Row | undefined;
            const employer = employee?.employers as Row | undefined;
            return (
              <tr key={String(document.id)} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4">
                  <p className="font-semibold">{String(employee?.full_name ?? "Employee")}</p>
                  <p className="text-xs text-slate-500">{String(employer?.name ?? "")}</p>
                </td>
                <td className="py-3 pr-4 capitalize">{String(document.document_type).replaceAll("_", " ")}</td>
                <td className="max-w-xs break-all py-3 pr-4 text-xs text-slate-500">{String(document.file_path)}</td>
                <td className="py-3 pr-4">
                  <Badge value={document.verification_status} />
                  {document.remarks ? <p className="mt-2 text-xs text-slate-500">{String(document.remarks)}</p> : null}
                </td>
                <td className="py-3 pr-4">
                  <div className="grid gap-2">
                    <form action={reviewEmployeeDocumentAction}>
                      <input type="hidden" name="document_id" value={String(document.id)} />
                      <input type="hidden" name="decision" value="Approved" />
                      <Submit>Approve</Submit>
                    </form>
                    <form action={reviewEmployeeDocumentAction} className="flex gap-2">
                      <input type="hidden" name="document_id" value={String(document.id)} />
                      <input type="hidden" name="decision" value="Rejected" />
                      <input name="remarks" placeholder="Correction note" className="h-10 w-40 rounded-xl border border-slate-300 px-3 text-xs" />
                      <Submit danger>Reject</Submit>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {documents.length === 0 ? <p className="py-5 text-sm text-slate-500">No employee documents uploaded yet.</p> : null}
    </div>
  );
}

export function GlobalOnboardingView({ data }: { data: Row }) {
  const mode = data.mode;
  const companies = rows(data.companies);
  const templates = rows(data.templates);
  const customFields = rows(data.customFields);
  const companyDocuments = rows(data.companyDocuments);
  const customFieldValues = rows(data.customFieldValues);

  if (mode === "employee") {
    return <EmployeeSelfOnboarding data={data} />;
  }

  return (
    <div className="grid gap-5">
      {mode === "employer" ? (
        <>
          <EmployerWizard company={companies[0]} customFields={rows(data.employerCustomFields)} customValues={customFieldValues} />
          <Panel title="Employer Hiring Request">
            <HiringRequestForm />
          </Panel>
          <Panel title="Company Documents">
            <CompanyDocumentForm companies={companies} />
            <div className="mt-5">
              <RecordsList title="Uploaded Company Documents" records={companyDocuments} />
            </div>
          </Panel>
          <Panel title="Employee Setup After Verification">
            <p className="mb-4 text-sm leading-6 text-slate-600">
              After admin verifies an employee, update their editable employer-owned details here:
              team, manager, leave policy, and notice period.
            </p>
            <EmployeeSetupForm
              employees={(data.employees as Row[] | undefined) ?? []}
              teams={(data.teams as Row[] | undefined) ?? []}
              leavePolicies={(data.leavePolicies as Row[] | undefined) ?? []}
            />
          </Panel>
        </>
      ) : null}

      {mode === "admin" ? (
        <>
          <Panel title="Client Company Review">
            <ReviewTable rows={companies} type="company" />
          </Panel>
          <Panel title="Employee Onboarding Review">
            <ReviewTable rows={(data.employeeStatuses as Row[] | undefined) ?? []} type="employee" />
          </Panel>
          <Panel title="Employee Document Review">
            <EmployeeDocumentReview documents={rows(data.employeeDocuments)} />
          </Panel>
          <div className="grid gap-5 xl:grid-cols-2">
            <RecordsList title="Company Documents" records={companyDocuments} />
            <RecordsList title="Custom Field Values" records={customFieldValues} />
          </div>
        </>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Contract Templates">
          <TemplateForm companies={companies} />
        </Panel>
        <Panel title="Custom Fields">
          <CustomFieldForm companies={companies} />
        </Panel>
      </div>

      <Panel title="Current Records">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Companies</p>
            <p className="mt-2 text-2xl font-bold">{companies.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Templates</p>
            <p className="mt-2 text-2xl font-bold">{templates.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Custom Fields</p>
            <p className="mt-2 text-2xl font-bold">{customFields.length}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
