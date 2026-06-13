"use client";

import { useMemo, useState } from "react";
import {
  approveEmployeeRequestAction,
  createEmployeeRequestAction,
  rejectEmployeeRequestAction,
} from "@/lib/portal/actions/employee";
import { PendingSubmitButton } from "@/components/portal/pending-submit-button";
import {
  approveOffboardingAction,
  completeOffboardingAction,
  confirmOffboardingAccessDeactivationAction,
  decideResignationAction,
  employerAcceptResignationAction,
  employerRejectResignationAction,
  forwardResignationAction,
  initiateOffboardingAction,
  requestOffboardingAction,
  submitResignationAction,
} from "@/lib/portal/actions/offboarding";
import { calculateLastWorkingDay } from "@/lib/portal/lifecycle-utils";
import type { PortalRole } from "@/lib/portal/types";

type LifecycleCounts = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

type AnyRow = {
  id: string;
  status?: string | null;
  full_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  department?: string | null;
  proposed_start_date?: string | null;
  hourly_billing_rate?: number | string | null;
  hours_per_week?: number | string | null;
  billing_currency?: string | null;
  reason?: string | null;
  admin_notes?: string | null;
  employer_notes?: string | null;
  rejection_reason?: string | null;
  preferred_last_working_day?: string | null;
  calculated_last_working_day?: string | null;
  target_last_working_day?: string | null;
  access_deactivation_confirmed_at?: string | null;
  employers?: { name?: string | null } | null;
  employees?: { full_name?: string | null } | null;
};

type LifecycleViewData = {
  mode?: "limited" | "employee" | "employer" | "admin";
  employee?: AnyRow | null;
  requests?: AnyRow[];
  resignations?: AnyRow[];
  cases?: AnyRow[];
  employees?: AnyRow[];
  counts?: LifecycleCounts;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function money(value: number | string | null | undefined, currency = "USD") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusTone(status: string | null | undefined) {
  const value = status ?? "unknown";
  if (["approved", "admin_approved", "employer_acknowledged", "completed"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["rejected", "cancelled", "admin_rejected"].includes(value)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["forwarded_to_employer", "in_progress", "under_resignation", "under_offboarding"].includes(value)) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusTone(value)}`}>
      {(value ?? "unknown").replaceAll("_", " ")}
    </span>
  );
}

function MetricStrip({ counts }: { counts?: { pending: number; approved: number; rejected: number; total: number } }) {
  const items = [
    ["Pending", counts?.pending ?? 0, "text-amber-700"],
    ["Approved", counts?.approved ?? 0, "text-emerald-700"],
    ["Rejected", counts?.rejected ?? 0, "text-rose-700"],
    ["Total", counts?.total ?? 0, "text-blue-700"],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, tone]) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function TimelineStrip({ steps, current }: { steps: string[]; current?: string | null }) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step === current));
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold capitalize ${
            index <= currentIndex ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {step.replaceAll("_", " ")}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
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

function TextArea({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        required={required}
        rows={3}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Submit({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "secondary" | "danger" }) {
  const cls =
    tone === "danger"
      ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : tone === "secondary"
        ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        : "bg-blue-700 text-white hover:bg-blue-800";
  return (
    <PendingSubmitButton
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${cls}`}
      pendingText="Working..."
    >
      {children}
    </PendingSubmitButton>
  );
}

function LimitedState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
      {label}
    </div>
  );
}

function OnboardingEmployerForm() {
  return (
    <form action={createEmployeeRequestAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
      <div className="lg:col-span-2">
        <h2 className="text-base font-semibold text-slate-950">Create Onboarding Request</h2>
        <p className="mt-1 text-sm text-slate-500">
          Monthly amount = Employer Billing / Hr x Hours / Week x 52 weeks / 12
        </p>
      </div>
      <Field name="full_name" label="Candidate Name" required />
      <Field name="email" label="Candidate Email" type="email" required />
      <Field name="job_title" label="Job Title" required />
      <Field name="department" label="Department / Team" />
      <Field name="proposed_start_date" label="Start Date" type="date" />
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Billing Currency
        <select name="billing_currency" className="h-10 rounded-xl border border-slate-300 px-3">
          <option value="USD">USD</option>
          <option value="INR">INR</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="AED">AED</option>
        </select>
      </label>
      <Field name="hourly_billing_rate" label="Employer Billing / Hr" type="number" required />
      <Field name="hours_per_week" label="Hours / Week" type="number" defaultValue={40} />
      <div className="lg:col-span-2">
        <TextArea name="onboarding_notes" label="Notes" />
      </div>
      <div className="lg:col-span-2">
        <Submit>Submit Onboarding Request</Submit>
      </div>
    </form>
  );
}

export function OnboardingLifecycleView({ data }: { role: PortalRole; data: LifecycleViewData }) {
  if (data.mode === "limited") {
    return <LimitedState label="Onboarding requests are managed by employers and admins." />;
  }

  const requests = data.requests ?? [];

  return (
    <div className="grid gap-5">
      <MetricStrip counts={data.counts} />
      {data.mode === "employer" ? <OnboardingEmployerForm /> : null}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Billing</th>
              <th className="px-4 py-3">Status</th>
              {data.mode === "admin" ? <th className="px-4 py-3">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {requests.map((request: AnyRow) => {
              const annual = Number(request.hourly_billing_rate ?? 0) * Number(request.hours_per_week ?? 40) * 52;
              const monthly = annual / 12;
              return (
                <tr key={request.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{request.full_name}</p>
                    <p className="text-xs text-slate-500">{request.email}</p>
                    <p className="text-xs text-slate-500">{request.employers?.name ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{request.job_title ?? "Not set"}</p>
                    <p className="text-xs text-slate-500">{request.department ?? "No team"}</p>
                  </td>
                  <td className="px-4 py-3">{formatDate(request.proposed_start_date)}</td>
                  <td className="px-4 py-3">
                    <p>{money(monthly, request.billing_currency ?? "USD")} monthly</p>
                    <p className="text-xs text-slate-500">
                      {money(request.hourly_billing_rate, request.billing_currency ?? "USD")} / hr x {request.hours_per_week ?? 40} x 52
                    </p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={request.status} /></td>
                  {data.mode === "admin" ? (
                    <td className="px-4 py-3">
                      {request.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <form action={approveEmployeeRequestAction}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <Submit>Approve</Submit>
                          </form>
                          <form action={rejectEmployeeRequestAction} className="flex gap-2">
                            <input type="hidden" name="request_id" value={request.id} />
                            <input name="admin_notes" placeholder="Reason" className="h-10 w-32 rounded-xl border border-slate-300 px-3 text-xs" />
                            <Submit tone="danger">Reject</Submit>
                          </form>
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {requests.length === 0 ? <p className="p-5 text-sm text-slate-500">No onboarding requests found.</p> : null}
      </section>
    </div>
  );
}

function EmployerResignationDecision({ resignation }: { resignation: AnyRow }) {
  const [noticeDays, setNoticeDays] = useState("30");
  const lastWorkingDay = useMemo(
    () => calculateLastWorkingDay(new Date().toISOString().slice(0, 10), Number(noticeDays || 0)),
    [noticeDays],
  );

  return (
    <div className="grid gap-3">
      <form action={employerAcceptResignationAction} className="grid gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
        <input type="hidden" name="resignation_id" value={resignation.id} />
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Notice Period Days
          <input
            name="notice_period_days"
            value={noticeDays}
            onChange={(event) => setNoticeDays(event.target.value)}
            type="number"
            min={0}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          />
        </label>
        <div className="rounded-xl bg-white p-3 text-sm text-sky-800">
          Calculated Last Working Day: <span className="font-bold">{formatDate(lastWorkingDay)}</span>
        </div>
        <TextArea name="employer_notes" label="Employer Notes" />
        <Submit>Accept and Send Notice</Submit>
      </form>
      <form action={employerRejectResignationAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="resignation_id" value={resignation.id} />
        <input name="rejection_reason" placeholder="Reject reason" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
        <Submit tone="danger">Reject</Submit>
      </form>
    </div>
  );
}

export function ResignationLifecycleView({ data }: { role: PortalRole; data: LifecycleViewData }) {
  const resignations = data.resignations ?? [];

  if (data.mode === "employee" && !data.employee) {
    return <LimitedState label="Your employee profile is not linked yet." />;
  }

  return (
    <div className="grid gap-5">
      {data.counts ? <MetricStrip counts={data.counts} /> : null}
      {data.mode === "employee" ? (
        <form action={submitResignationAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Submit Resignation</h2>
          <Field name="preferred_last_working_day" label="Preferred Last Working Day" type="date" />
          <TextArea name="reason" label="Reason" required />
          <Submit>Submit Resignation</Submit>
        </form>
      ) : null}
      <section className="grid gap-3">
        {resignations.map((resignation: AnyRow) => (
          <div key={resignation.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{resignation.employees?.full_name ?? "Resignation"}</p>
                <p className="mt-1 text-sm text-slate-500">{resignation.reason ?? "No reason provided"}</p>
                <p className="mt-1 text-xs text-slate-500">Preferred LWD: {formatDate(resignation.preferred_last_working_day)}</p>
                {resignation.calculated_last_working_day ? (
                  <p className="mt-1 text-xs font-semibold text-yellow-700">Calculated Last Working Day: {formatDate(resignation.calculated_last_working_day)}</p>
                ) : null}
              </div>
              <StatusBadge value={resignation.status} />
            </div>
            <TimelineStrip
              steps={["submitted_to_admin", "forwarded_to_employer", "employer_acknowledged", "offboarding_requested", "completed"]}
              current={resignation.status}
            />
            {resignation.employer_notes ? <p className="mt-3 text-xs text-slate-500">Employer notes: {resignation.employer_notes}</p> : null}
            {resignation.admin_notes ? <p className="mt-1 text-xs text-slate-500">Admin notes: {resignation.admin_notes}</p> : null}
            {resignation.rejection_reason ? <p className="mt-1 text-xs font-semibold text-rose-700">Reason: {resignation.rejection_reason}</p> : null}
            {data.mode === "admin" && resignation.status === "submitted_to_admin" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={forwardResignationAction}>
                  <input type="hidden" name="resignation_id" value={resignation.id} />
                  <Submit>Forward to Employer</Submit>
                </form>
                <form action={decideResignationAction}>
                  <input type="hidden" name="resignation_id" value={resignation.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Submit tone="secondary">Approve Directly</Submit>
                </form>
                <form action={decideResignationAction} className="flex gap-2">
                  <input type="hidden" name="resignation_id" value={resignation.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <input name="rejection_reason" placeholder="Reason" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
                  <Submit tone="danger">Reject</Submit>
                </form>
              </div>
            ) : null}
            {data.mode === "employer" && resignation.status === "forwarded_to_employer" ? (
              <div className="mt-4">
                <EmployerResignationDecision resignation={resignation} />
              </div>
            ) : null}
          </div>
        ))}
        {resignations.length === 0 ? <LimitedState label="No resignation activity yet." /> : null}
      </section>
    </div>
  );
}

export function OffboardingLifecycleView({ data }: { role: PortalRole; data: LifecycleViewData }) {
  const cases = data.cases ?? [];
  const employees = data.employees ?? [];

  return (
    <div className="grid gap-5">
      {data.counts ? <MetricStrip counts={data.counts} /> : null}
      {data.mode === "employer" || data.mode === "admin" ? (
        <form action={requestOffboardingAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold text-slate-950">Create Offboarding Request</h2>
            <p className="mt-1 text-sm text-slate-500">
              Completion records the exit. Access is disabled only after admin confirmation.
            </p>
          </div>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Employee
            <select name="employee_id" required className="h-10 rounded-xl border border-slate-300 px-3">
              <option value="">Select employee</option>
              {employees.map((employee: AnyRow) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} - {employee.job_title ?? "Employee"}
                </option>
              ))}
            </select>
          </label>
          <Field name="target_last_working_day" label="Calculated Last Working Day" type="date" required />
          <div className="lg:col-span-2">
            <TextArea name={data.mode === "admin" ? "admin_notes" : "employer_notes"} label="Notes" />
          </div>
          <div className="lg:col-span-2">
            <Submit>{data.mode === "admin" ? "Create Approved Offboarding" : "Submit Offboarding Request"}</Submit>
          </div>
        </form>
      ) : null}

      <section className="grid gap-3">
        {cases.map((item: AnyRow) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{item.employees?.full_name ?? "Offboarding"}</p>
                <p className="mt-1 text-sm text-slate-500">Last working day: {formatDate(item.target_last_working_day)}</p>
                {item.access_deactivation_confirmed_at ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">Access deactivation confirmed</p>
                ) : null}
              </div>
              <StatusBadge value={item.status} />
            </div>
            <TimelineStrip
              steps={["requested_by_employer", "admin_approved", "in_progress", "completed"]}
              current={item.status}
            />
            {item.employer_notes ? <p className="mt-3 text-xs text-slate-500">Employer notes: {item.employer_notes}</p> : null}
            {item.admin_notes ? <p className="mt-1 text-xs text-slate-500">Admin notes: {item.admin_notes}</p> : null}
            {item.rejection_reason ? <p className="mt-1 text-xs font-semibold text-rose-700">Reason: {item.rejection_reason}</p> : null}
            {data.mode === "admin" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === "requested_by_employer" ? (
                  <form action={approveOffboardingAction}>
                    <input type="hidden" name="offboarding_id" value={item.id} />
                    <Submit>Approve</Submit>
                  </form>
                ) : null}
                {item.status === "admin_approved" ? (
                  <form action={initiateOffboardingAction}>
                    <input type="hidden" name="offboarding_id" value={item.id} />
                    <Submit>Initiate</Submit>
                  </form>
                ) : null}
                {item.status === "in_progress" ? (
                  <form action={completeOffboardingAction}>
                    <input type="hidden" name="offboarding_id" value={item.id} />
                    <Submit tone="secondary">Complete</Submit>
                  </form>
                ) : null}
                {item.status === "completed" && !item.access_deactivation_confirmed_at ? (
                  <form action={confirmOffboardingAccessDeactivationAction}>
                    <input type="hidden" name="offboarding_id" value={item.id} />
                    <Submit tone="danger">Confirm Access Deactivation</Submit>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        {cases.length === 0 ? <LimitedState label="No offboarding activity yet." /> : null}
      </section>
    </div>
  );
}
