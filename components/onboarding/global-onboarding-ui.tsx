"use client";

import { useRef, useState, useTransition } from "react";
import {
  createCustomFieldAction,
  recordEmployeeDocumentAction,
  reviewClientCompanyAction,
  reviewEmployeeDocumentAction,
  reviewEmployeeOnboardingAction,
  saveEmployeeEmployerSetupAction,
  saveEmployeeOnboardingStepAction,
  saveEmployeeSelfOnboardingAction,
  saveEmployerOnboardingAction,
  skipCompanyDocumentsAction,
  uploadCompanyDocumentAction,
  uploadContractTemplateAction,
} from "@/lib/portal/actions/global-onboarding";
import { createEmployeeRequestAction, resendEmployeeInviteAction } from "@/lib/portal/actions/employee";
import { getCompanyDocumentCompletionStatus, getEmployeeDocumentCompletionStatus } from "@/lib/portal/document-status";
import type { DocumentRow } from "@/lib/portal/document-status";

type Row = Record<string, unknown>;

function value(row: Row | null | undefined, key: string) {
  const raw = row?.[key];
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
}

function rows(value: unknown) {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function documentRows(value: Row[]): DocumentRow[] {
  return value.map((row) => ({
    id: String(row.id ?? ""),
    document_type: typeof row.document_type === "string" ? row.document_type : null,
    file_path: typeof row.file_path === "string" ? row.file_path : null,
    verification_status: typeof row.verification_status === "string" ? row.verification_status : null,
    replaced_by_document_id: typeof row.replaced_by_document_id === "string" ? row.replaced_by_document_id : null,
    uploaded_at: typeof row.uploaded_at === "string" ? row.uploaded_at : null,
    employee_id: typeof row.employee_id === "string" ? row.employee_id : null,
    company_id: typeof row.company_id === "string" ? row.company_id : null,
  }));
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
  disabled,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function TextArea({ name, label, required, defaultValue, disabled }: { name: string; label: string; required?: boolean; defaultValue?: string; disabled?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
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
  const normalized = text.toLowerCase().replaceAll(" ", "_");
  const tone = normalized.includes("complete") || normalized.includes("approved") || normalized === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : normalized.includes("rejected") || normalized.includes("missing")
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : normalized.includes("pending") || normalized.includes("submitted") || normalized.includes("correction")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize ${tone}`}>
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

function CustomFieldInputs({ fields, values: customValues = [], disabled = false }: { fields: Row[]; values?: Row[]; disabled?: boolean }) {
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
          return <TextArea key={id} name={name} label={label} required={required} defaultValue={defaultValue} disabled={disabled} />;
        }

        if (fieldType === "dropdown") {
          return (
            <label key={id} className="grid gap-1 text-sm font-medium text-slate-700">
              {label}
              <select name={name} required={required} defaultValue={defaultValue} disabled={disabled} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select</option>
                {fieldOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          );
        }

        if (fieldType === "checkbox") {
          return (
            <label key={id} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name={name} defaultChecked={defaultValue === "true"} disabled={disabled} />
              {label}
            </label>
          );
        }

        const inputType = ["number", "email", "url", "date"].includes(fieldType) ? fieldType : "text";
        return <Field key={id} name={name} label={label} type={inputType} required={required} defaultValue={defaultValue} disabled={disabled} />;
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
    <div className="grid gap-4">
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
      <form action={skipCompanyDocumentsAction} className="grid gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Defer documents for
          <select name="company_id" className="h-10 rounded-xl border border-amber-200 bg-white px-3 text-sm">
            {companies.map((company) => (
              <option key={String(company.id)} value={String(company.id)}>
                {String(company.company_name ?? "Company")}
              </option>
            ))}
          </select>
        </label>
        <Submit>Skip documents for now</Submit>
      </form>
    </div>
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
            {record.signed_url ? (
              <a href={String(record.signed_url)} target="_blank" rel="noreferrer" className="mt-1 inline-flex font-semibold text-blue-700">
                View / Download
              </a>
            ) : (
              <p className="mt-1 break-all">{String(record.file_path ?? record.value ?? record.verification_status ?? "")}</p>
            )}
          </div>
        ))}
        {records.length === 0 ? <p className="text-sm text-slate-500">No records yet.</p> : null}
      </div>
    </div>
  );
}

function groupedByEntity(records: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const record of records) {
    const key = String(record.entity_id ?? "unassigned");
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()];
}

function GroupedCustomFieldValues({ records }: { records: Row[] }) {
  const groups = groupedByEntity(records);
  return (
    <div className="grid gap-3">
      {groups.map(([entityId, values]) => (
        <details key={entityId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-800">Entity {entityId} · {values.length} value(s)</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {values.map((record) => {
              const field = record.custom_fields as Row | undefined;
              return (
                <div key={String(record.id)} className="rounded-lg bg-white p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-950">{String(field?.field_label ?? record.custom_field_id ?? "Custom field")}</p>
                  <p className="mt-1 break-words">{String(record.value ?? "")}</p>
                </div>
              );
            })}
          </div>
        </details>
      ))}
      {groups.length === 0 ? <p className="text-sm text-slate-500">No custom field values saved yet.</p> : null}
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

const employeeSteps = [
  "Personal",
  "Address",
  "Emergency",
  "Identity",
  "Bank",
  "Education",
  "Experience",
  "Custom Fields",
  "Documents",
];

function StepTabs({ active, setActive }: { active: number; setActive: (value: number) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {employeeSteps.map((step, index) => (
        <button
          key={step}
          type="button"
          onClick={() => setActive(index)}
          className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${
            active === index
              ? "border-blue-200 bg-blue-700 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {index + 1}. {step}
        </button>
      ))}
    </div>
  );
}

function StepSection({ active, index, children }: { active: number; index: number; children: React.ReactNode }) {
  return (
    <fieldset disabled={active !== index} className={active === index ? "grid gap-4 md:grid-cols-2" : "hidden"}>
      {children}
    </fieldset>
  );
}

function EmployeeSelfOnboarding({ data }: { data: Row }) {
  const employee = data.employee as Row | null;
  const customFields = rows(data.customFields);
  const customValues = rows(data.customFieldValues);
  const documents = rows(data.documents);
  const checklist = rows(data.documentChecklist);
  const profile = (data.profile as Row | null) ?? {};
  const address = (data.address as Row | null) ?? {};
  const emergency = (data.emergency as Row | null) ?? {};
  const identity = (data.identity as Row | null) ?? {};
  const bank = (data.bank as Row | null) ?? {};
  const education = (data.education as Row | null) ?? {};
  const experience = (data.experience as Row | null) ?? {};
  const status = data.status as Row | null;
  const progress = data.progress as Row | null;
  const completedSteps = Array.isArray(progress?.completed_steps) ? progress.completed_steps.map((step) => String(step)) : [];
  const initialStep = Math.max(0, employeeSteps.findIndex((step) => step === progress?.current_step));
  const [activeStep, setActiveStep] = useState(initialStep);
  const [saveMessage, setSaveMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSavingStep, startStepSave] = useTransition();
  const stepFormRef = useRef<HTMLFormElement>(null);
  if (!employee) {
    return <Panel title="Employee Onboarding">Your employee profile is not linked yet.</Panel>;
  }
  const statusText = String(status?.status ?? "Draft");
  const formLocked = statusText === "Approved";
  const missingDocuments = checklist.filter((item) => !item.approved);
  const documentStatus = getEmployeeDocumentCompletionStatus(documentRows(documents), Boolean(experience.is_fresher ?? true));
  const missingSteps = employeeSteps.filter((step) => !completedSteps.includes(step));
  const missingCustomFields = customFields.filter((field) => Boolean(field.required) && !fieldValue(customValues, field.id));
  const rejectedDocuments = documents.filter((document) => document.verification_status === "Rejected");

  function saveAndNext() {
    const form = stepFormRef.current;
    if (!form) return;
    setSaveMessage(null);
    startStepSave(async () => {
      try {
        const formData = new FormData(form);
        await saveEmployeeOnboardingStepAction(formData);
        setSaveMessage({
          tone: "success",
          text:
            activeStep < employeeSteps.length - 1
              ? `${employeeSteps[activeStep]} saved. Moving to ${employeeSteps[activeStep + 1]}.`
              : `${employeeSteps[activeStep]} saved.`,
        });
        setActiveStep((step) => Math.min(step + 1, employeeSteps.length - 1));
      } catch (error) {
        setSaveMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "Could not save this step.",
        });
      }
    });
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-slate-950">{documents.length}</p>
            <Badge value={documentStatus.label} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Corrections</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{documents.filter((doc) => doc.verification_status === "Rejected").length}</p>
        </div>
      </div>
      <Panel title="Employee Self-Onboarding">
        {formLocked ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            Your onboarding is approved. Profile fields are locked; rejected document replacements remain available if requested later.
            {documentStatus.status !== "docs_complete" ? (
              <span className="mt-1 block">Your profile is approved. Some documents are still pending.</span>
            ) : null}
          </div>
        ) : null}
        <StepTabs active={activeStep} setActive={setActiveStep} />
        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Missing steps</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{missingSteps.length === 0 ? "All steps saved" : missingSteps.join(", ")}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Required custom fields</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{missingCustomFields.length === 0 ? "Complete" : missingCustomFields.map((field) => String(field.field_label)).join(", ")}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Document status</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge value={documentStatus.label} />
              <span className="text-sm font-semibold text-slate-950">{missingDocuments.length === 0 ? "All required docs approved" : `${missingDocuments.length} pending or missing`}</span>
            </div>
          </div>
        </div>
        {saveMessage ? (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm font-semibold ${
              saveMessage.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {saveMessage.text}
          </div>
        ) : null}
        <form ref={stepFormRef} action={saveEmployeeOnboardingStepAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="current_step" value={employeeSteps[activeStep]} />
          <fieldset disabled={formLocked} className="contents">
            <StepSection active={activeStep} index={0}>
              <Field name="full_name" label="Full Name" required defaultValue={value(profile, "full_name") || String(employee.full_name ?? "")} />
              <Field name="father_name" label="Father's Name" required defaultValue={value(profile, "father_name")} />
              <Field name="date_of_birth" label="Date of Birth" type="date" required defaultValue={value(profile, "date_of_birth")} />
              <Field name="gender" label="Gender" required defaultValue={value(profile, "gender")} />
              <Field name="email" label="Email" type="email" required defaultValue={value(profile, "email") || String(employee.email ?? "")} />
              <Field name="phone" label="Phone Number" required defaultValue={value(profile, "phone")} />
              <Field name="alternate_phone" label="Alternate Phone Number" defaultValue={value(profile, "alternate_phone")} />
              <Field name="linkedin_url" label="LinkedIn URL" defaultValue={value(profile, "linkedin_url")} />
              <Field name="github_url" label="GitHub URL" defaultValue={value(profile, "github_url")} />
              <Field name="portfolio_url" label="Portfolio URL" defaultValue={value(profile, "portfolio_url")} />
            </StepSection>
            <StepSection active={activeStep} index={1}>
              <TextArea name="current_address" label="Current Address" required defaultValue={value(address, "current_address")} />
              <TextArea name="permanent_address" label="Permanent Address" required defaultValue={value(address, "permanent_address")} />
              <Field name="state" label="State" required defaultValue={value(address, "state")} />
              <Field name="city" label="City" required defaultValue={value(address, "city")} />
              <Field name="postal_code" label="PIN Code" required defaultValue={value(address, "postal_code")} />
            </StepSection>
            <StepSection active={activeStep} index={2}>
              <Field name="emergency_contact_name" label="Emergency Contact Name" required defaultValue={value(emergency, "contact_name")} />
              <Field name="emergency_relationship" label="Relationship" required defaultValue={value(emergency, "relationship")} />
              <Field name="emergency_phone" label="Emergency Phone" required defaultValue={value(emergency, "phone")} />
            </StepSection>
            <StepSection active={activeStep} index={3}>
              <Field name="aadhaar_number" label="Aadhaar Number" required defaultValue={value(identity, "aadhaar_number")} />
              <Field name="pan_number" label="PAN Number" required defaultValue={value(identity, "pan_number")} />
              <Field name="passport_number" label="Passport Number" defaultValue={value(identity, "passport_number")} />
            </StepSection>
            <StepSection active={activeStep} index={4}>
              <Field name="account_holder_name" label="Account Holder Name" required defaultValue={value(bank, "account_holder_name")} />
              <Field name="account_number" label="Account Number" required defaultValue={value(bank, "account_number")} />
              <Field name="ifsc_code" label="IFSC Code" required defaultValue={value(bank, "ifsc_code")} />
              <Field name="bank_name" label="Bank Name" required defaultValue={value(bank, "bank_name")} />
              <Field name="branch_name" label="Branch Name" defaultValue={value(bank, "branch_name")} />
            </StepSection>
            <StepSection active={activeStep} index={5}>
              <Field name="qualification" label="Highest Qualification" required defaultValue={value(education, "qualification")} />
              <Field name="institution" label="Institution" required defaultValue={value(education, "institution")} />
              <Field name="year_of_passing" label="Year of Passing" type="number" required defaultValue={value(education, "year_of_passing")} />
            </StepSection>
            <StepSection active={activeStep} index={6}>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="is_fresher" defaultChecked={experience.is_fresher !== false} />
                Fresher
              </label>
              <Field name="total_experience" label="Total Experience" defaultValue={value(experience, "total_experience")} />
              <Field name="previous_company" label="Previous Company" defaultValue={value(experience, "previous_company")} />
              <Field name="previous_designation" label="Previous Designation" defaultValue={value(experience, "previous_designation")} />
            </StepSection>
            <StepSection active={activeStep} index={7}>
              <CustomFieldInputs fields={customFields} values={customValues} disabled={formLocked} />
              {customFields.length === 0 ? <p className="text-sm text-slate-500">No custom fields assigned.</p> : null}
            </StepSection>
          </fieldset>
          <StepSection active={activeStep} index={8}>
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Mandatory document checklist</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {checklist.map((item) => (
                  <div key={String(item.document_type)} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="capitalize">{String(item.document_type).replaceAll("_", " ")}</span>
                    <Badge value={item.status} />
                  </div>
                ))}
              </div>
              {missingDocuments.length > 0 ? (
                <p className="mt-3 text-xs font-semibold text-amber-700">{missingDocuments.length} required document(s) still need approval.</p>
              ) : null}
            </div>
          </StepSection>
          {!formLocked ? (
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <Submit>Save Current Step</Submit>
              {employeeSteps[activeStep] === "Documents" ? (
                <button
                  type="submit"
                  name="skip_documents"
                  value="1"
                  className="h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                  Skip documents for now
                </button>
              ) : null}
              <button
                type="button"
                onClick={saveAndNext}
                disabled={isSavingStep}
                className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-70"
              >
                {isSavingStep ? "Saving..." : "Save and Next"}
              </button>
              <span className="text-xs text-slate-500">
                Completed: {completedSteps.length} / {employeeSteps.length}
              </span>
            </div>
          ) : null}
        </form>
        {!formLocked ? (
          <form action={saveEmployeeSelfOnboardingAction} className="mt-4">
            <Submit>Submit Onboarding For Review</Submit>
          </form>
        ) : null}
      </Panel>
      <Panel title="Document Uploads">
        {rejectedDocuments.length > 0 ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-semibold">Corrections requested</p>
            <div className="mt-2 grid gap-2">
              {rejectedDocuments.map((document) => (
                <div key={String(document.id)} className="rounded-lg bg-white p-3">
                  <p className="font-semibold capitalize">Replace this document: {String(document.document_type).replaceAll("_", " ")}</p>
                  {document.remarks ? <p className="mt-1 text-xs">{String(document.remarks)}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
              {document.signed_url ? (
                <a href={String(document.signed_url)} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-semibold text-blue-700">
                  View / Download
                </a>
              ) : (
                <p className="mt-1 break-all text-xs text-slate-500">{String(document.file_path)}</p>
              )}
              {document.replaced_by_document_id ? <p className="mt-2 text-xs text-slate-500">Replaced by a newer upload.</p> : null}
              {document.remarks ? <p className="mt-2 text-xs font-medium text-rose-700">{String(document.remarks)}</p> : null}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ReviewTable({
  rows,
  type,
  documents = [],
  customValues = [],
}: {
  rows: Row[];
  type: "company" | "employee";
  documents?: Row[];
  customValues?: Row[];
}) {
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
            const rowDocuments = documents.filter((document) =>
              type === "company"
                ? document.company_id === row.id
                : document.employee_id === row.employee_id,
            );
            const rowCustomValues = customValues.filter((item) =>
              type === "company"
                ? item.entity_id === row.id
                : item.entity_id === row.employee_id,
            );
            const documentStatus = row.document_completion_status as Row | undefined;
            const derivedDocumentStatus = documentStatus ?? (
              type === "company"
                ? getCompanyDocumentCompletionStatus(documentRows(rowDocuments))
                : getEmployeeDocumentCompletionStatus(documentRows(rowDocuments), true)
            );
            const attentionDocuments = rowDocuments.filter((document) => document.verification_status === "Rejected" || document.verification_status === "Pending");
            return (
              <tr key={String(row.id)} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold">
                  <details>
                    <summary className="cursor-pointer text-slate-950">{String(row.company_name ?? employee?.full_name ?? "Onboarding")}</summary>
                    <div className="mt-3 grid min-w-[360px] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 md:grid-cols-2">
                      <div>
                        <p className="font-bold text-slate-950">Documents</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge value={derivedDocumentStatus.label} />
                          <span>{rowDocuments.length} uploaded</span>
                        </div>
                        {attentionDocuments.map((document) => (
                          <p key={String(document.id)} className="mt-1 capitalize">
                            {String(document.document_type).replaceAll("_", " ")}: {String(document.verification_status)}
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="font-bold text-slate-950">Custom fields</p>
                        {rowCustomValues.length === 0 ? <p>No saved values.</p> : null}
                        {rowCustomValues.map((item) => {
                          const field = item.custom_fields as Row | undefined;
                          return (
                            <p key={String(item.id)} className="mt-1">
                              {String(field?.field_label ?? "Field")}: {String(item.value ?? "")}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge value={row.onboarding_status ?? row.status} />
                    <Badge value={derivedDocumentStatus.label} />
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-500">{String(row.country ?? employer?.name ?? "")}</td>
                <td className="py-3 pr-4">
                  {type === "company" ? (
                    <div className="flex flex-wrap gap-2">
                      {["approved", "needs_correction", "rejected"].map((decision) => (
                        <form key={decision} action={reviewClientCompanyAction}>
                          <input type="hidden" name="company_id" value={String(row.id)} />
                          <input type="hidden" name="decision" value={decision} />
                          <input name="review_remarks" placeholder="Remarks" className="h-10 w-32 rounded-xl border border-slate-300 px-3 text-xs" />
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
                          <input name="remarks" placeholder="Remarks" className="h-10 w-32 rounded-xl border border-slate-300 px-3 text-xs" />
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
                <td className="max-w-xs break-all py-3 pr-4 text-xs text-slate-500">
                  {document.signed_url ? (
                    <a href={String(document.signed_url)} target="_blank" rel="noreferrer" className="font-semibold text-blue-700">View / Download</a>
                  ) : String(document.file_path)}
                  {document.replaced_by_document_id ? <p className="mt-1 text-slate-400">Replaced by newer upload</p> : null}
                </td>
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

function EmployeeRequestInviteTable({ requests, allowResend = false }: { requests: Row[]; allowResend?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="py-2 pr-4">Candidate</th>
            <th className="py-2 pr-4">Employer</th>
            <th className="py-2 pr-4">Request</th>
            <th className="py-2 pr-4">Invite</th>
            <th className="py-2 pr-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const employer = request.employers as Row | undefined;
            return (
              <tr key={String(request.id)} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4">
                  <p className="font-semibold">{String(request.full_name ?? "Candidate")}</p>
                  <p className="text-xs text-slate-500">{String(request.email ?? "")}</p>
                </td>
                <td className="py-3 pr-4">{String(employer?.name ?? "")}</td>
                <td className="py-3 pr-4"><Badge value={request.status} /></td>
                <td className="py-3 pr-4 text-xs text-slate-600">
                  {request.onboarding_started_at
                    ? `Onboarding started ${String(request.onboarding_started_at).slice(0, 10)}`
                    : request.invite_accepted_at
                      ? `Accepted ${String(request.invite_accepted_at).slice(0, 10)}`
                      : request.invite_sent_at
                        ? `Sent ${String(request.invite_sent_at).slice(0, 10)}`
                        : "Not sent"}
                  {request.invite_error ? <p className="mt-1 font-semibold text-rose-700">{String(request.invite_error)}</p> : null}
                </td>
                <td className="py-3 pr-4">
                  {allowResend && request.status === "approved" && request.employee_id ? (
                    <form action={resendEmployeeInviteAction}>
                      <input type="hidden" name="request_id" value={String(request.id)} />
                      <Submit>Resend Invite</Submit>
                    </form>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {requests.length === 0 ? <p className="py-5 text-sm text-slate-500">No employee requests found.</p> : null}
    </div>
  );
}

function AdminFilters({ data }: { data: Row }) {
  const employers = rows(data.employers);
  const filters = (data.filters as Row | undefined) ?? {};
  return (
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Employer
        <select name="employer" defaultValue={String(filters.employer ?? "all")} className="h-10 rounded-xl border border-slate-300 px-3">
          <option value="all">All employers</option>
          {employers.map((employer) => <option key={String(employer.id)} value={String(employer.id)}>{String(employer.name)}</option>)}
        </select>
      </label>
      <Select name="status" label="Onboarding Status" options={["all", "submitted", "approved", "needs_correction", "rejected", "Approved", "Needs Correction", "Rejected"]} defaultValue={String(filters.status ?? "all")} />
      <Select name="document_status" label="Document Status" options={["all", "Pending", "Approved", "Rejected"]} defaultValue={String(filters.documentStatus ?? "all")} />
      <div className="pt-6">
        <Submit>Filter</Submit>
      </div>
    </form>
  );
}

function AdminTabs({ active, setActive }: { active: string; setActive: (value: string) => void }) {
  const tabs = ["Company Review", "Employee Review", "Document Review", "Corrections", "Templates", "Custom Fields"];
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActive(tab)}
          className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${active === tab ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          {tab}
        </button>
      ))}
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
  const [adminTab, setAdminTab] = useState("Company Review");

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
          <AdminFilters data={data} />
          <AdminTabs active={adminTab} setActive={setAdminTab} />
          {adminTab === "Company Review" ? (
            <Panel title="Client Company Review">
              <ReviewTable rows={companies} type="company" documents={companyDocuments} customValues={customFieldValues} />
              <div className="mt-5"><RecordsList title="Company Documents" records={companyDocuments} /></div>
            </Panel>
          ) : null}
          {adminTab === "Employee Review" ? (
            <Panel title="Employee Onboarding Review">
              <EmployeeRequestInviteTable requests={rows(data.employeeRequests)} allowResend />
              <div className="mt-5">
                <ReviewTable rows={(data.employeeStatuses as Row[] | undefined) ?? []} type="employee" documents={rows(data.employeeDocuments)} customValues={customFieldValues} />
              </div>
            </Panel>
          ) : null}
          {adminTab === "Document Review" ? (
            <Panel title="Employee Document Review">
              <EmployeeDocumentReview documents={rows(data.employeeDocuments)} />
            </Panel>
          ) : null}
          {adminTab === "Corrections" ? (
            <Panel title="Corrections">
              <EmployeeDocumentReview documents={rows(data.employeeDocuments).filter((document) => document.verification_status === "Rejected")} />
            </Panel>
          ) : null}
          {adminTab === "Templates" ? (
            <Panel title="Contract Templates">
              <TemplateForm companies={companies} />
              <div className="mt-5"><RecordsList title="Template History" records={templates} /></div>
            </Panel>
          ) : null}
          {adminTab === "Custom Fields" ? (
            <Panel title="Custom Fields">
              <CustomFieldForm companies={companies} />
              <div className="mt-5"><GroupedCustomFieldValues records={customFieldValues} /></div>
            </Panel>
          ) : null}
        </>
      ) : null}

      {mode === "employer" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Contract Templates">
            <TemplateForm companies={companies} />
            <div className="mt-5"><RecordsList title="Template History" records={templates} /></div>
          </Panel>
          <Panel title="Custom Fields">
            <CustomFieldForm companies={companies} />
          </Panel>
        </div>
      ) : null}

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
