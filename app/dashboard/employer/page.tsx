import { createEmployeeRequestAction } from "@/lib/portal/actions/employee";
import { saveLeavePolicyAction, reviewLeaveRequestAction } from "@/lib/portal/actions/leave";
import {
  acknowledgeResignationAction,
  requestOffboardingAction,
} from "@/lib/portal/actions/offboarding";
import { sendNoticeAction } from "@/lib/portal/actions/notices";
import { getEmployerDashboardData } from "@/lib/portal/data";
import { requirePortalRole } from "@/lib/portal/session";
import {
  EmptyState,
  Panel,
  PortalShell,
  StatGrid,
  StatusBadge,
  SubmitButton,
  TextArea,
  TextInput,
  formatDate,
} from "@/components/portal/ui";

export default async function EmployerDashboardPage() {
  const session = await requirePortalRole(["employer_admin"]);
  const data = await getEmployerDashboardData(session);

  if (!data) {
    return (
      <PortalShell
        session={session}
        title="Employer workspace pending"
        subtitle="This account has not been attached to an approved employer yet."
      >
        <EmptyState>Admin approval is required before the employer workspace is available.</EmptyState>
      </PortalShell>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <PortalShell
      session={session}
      title={data.employer?.name ?? "Employer workspace"}
      subtitle="Set yearly leave rules, request employee onboarding, review leave activity, and send notices to your own employees."
    >
      <div className="grid gap-5">
        <StatGrid counts={data.counts} />

        <Panel
          title={`${currentYear} leave policy`}
          description="This must exist before employee requests can be submitted."
        >
          <form action={saveLeavePolicyAction} className="grid gap-4 md:grid-cols-3">
            <TextInput name="year" label="Year" type="number" defaultValue={data.leavePolicy?.year ?? currentYear} required />
            <TextInput name="casual_leave" label="Casual leave" type="number" defaultValue={data.leavePolicy?.casual_leave ?? 7} required />
            <TextInput name="sick_leave" label="Sick leave" type="number" defaultValue={data.leavePolicy?.sick_leave ?? 7} required />
            <TextInput name="earned_leave" label="Earned leave" type="number" defaultValue={data.leavePolicy?.earned_leave ?? 15} required />
            <TextInput name="public_holidays" label="Public holidays" type="number" defaultValue={data.leavePolicy?.public_holidays ?? 10} />
            <TextInput name="weekly_off" label="Weekly off" defaultValue={data.leavePolicy?.weekly_off ?? "Saturday/Sunday"} />
            <TextInput name="max_carry_forward" label="Max carry-forward" type="number" defaultValue={data.leavePolicy?.max_carry_forward ?? 0} />
            <TextInput name="notice_period_days" label="Notice period days" type="number" defaultValue={data.leavePolicy?.notice_period_days ?? 30} />
            <TextInput name="maternity_leave_days" label="Maternity leave days" type="number" defaultValue={data.leavePolicy?.maternity_leave_days ?? 0} />
            <TextInput name="paternity_leave_days" label="Paternity leave days" type="number" defaultValue={data.leavePolicy?.paternity_leave_days ?? 0} />
            <TextInput name="bereavement_leave_days" label="Bereavement leave days" type="number" defaultValue={data.leavePolicy?.bereavement_leave_days ?? 0} />
            <div className="grid gap-2 pt-6 text-sm text-slate-700">
              <label className="flex items-center gap-2"><input type="checkbox" name="half_day_allowed" defaultChecked={data.leavePolicy?.half_day_allowed ?? true} /> Half-day allowed</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="carry_forward_allowed" defaultChecked={data.leavePolicy?.carry_forward_allowed ?? false} /> Carry-forward allowed</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="encashment_allowed" defaultChecked={data.leavePolicy?.encashment_allowed ?? false} /> Encashment allowed</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="probation_leave_allowed" defaultChecked={data.leavePolicy?.probation_leave_allowed ?? false} /> Probation leave allowed</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="comp_off_allowed" defaultChecked={data.leavePolicy?.comp_off_allowed ?? false} /> Comp-off allowed</label>
            </div>
            <div className="md:col-span-3">
              <TextArea name="accrual_notes" label="Accrual notes" defaultValue={data.leavePolicy?.accrual_notes} />
            </div>
            <div className="md:col-span-3">
              <TextArea name="lop_policy" label="LOP policy" defaultValue={data.leavePolicy?.lop_policy} />
            </div>
            <div className="md:col-span-3">
              <SubmitButton>Save leave policy</SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel title="Request employee onboarding" description="Admin approval is required before an employee can join.">
          {data.leavePolicy ? (
            <form action={createEmployeeRequestAction} className="grid gap-4 md:grid-cols-2">
              <TextInput name="full_name" label="Employee full name" required />
              <TextInput name="email" label="Employee email" type="email" required />
              <TextInput name="job_title" label="Job title" />
              <TextInput name="department" label="Department" />
              <TextInput name="proposed_start_date" label="Proposed start date" type="date" />
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Billing currency
                <select name="billing_currency" className="h-10 border border-slate-300 px-3">
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AED">AED</option>
                </select>
              </label>
              <TextInput name="hourly_billing_rate" label="Employer Billing / Hr" type="number" required />
              <TextInput name="hours_per_week" label="Hours / Week" type="number" defaultValue={40} />
              <div className="md:col-span-2">
                <TextArea name="onboarding_notes" label="Notes" />
              </div>
              <div className="md:col-span-2">
                <SubmitButton>Submit employee request</SubmitButton>
              </div>
            </form>
          ) : (
            <EmptyState>Create the current-year leave policy before requesting employees.</EmptyState>
          )}
        </Panel>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Employees">
            <div className="grid gap-3">
              {data.employees.length === 0 ? <EmptyState>No employees yet.</EmptyState> : null}
              {data.employees.map((employee) => (
                <div key={employee.id} className="border border-slate-200 p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold">{employee.full_name}</p>
                      <p className="text-sm text-slate-500">{employee.email} · {employee.job_title ?? "No role"}</p>
                    </div>
                    <StatusBadge value={employee.status} />
                  </div>
                  <form action={requestOffboardingAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                    <input type="hidden" name="employee_id" value={employee.id} />
                    <TextInput name="target_last_working_day" label="Target last working day" type="date" required />
                    <div className="pt-6">
                      <SubmitButton tone="secondary">Request offboarding</SubmitButton>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Employee requests">
            <div className="grid gap-3">
              {data.employeeRequests.length === 0 ? <EmptyState>No employee requests submitted.</EmptyState> : null}
              {data.employeeRequests.map((request) => (
                <div key={request.id} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">{request.full_name}</p>
                    <StatusBadge value={request.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{request.email} · {request.job_title ?? "No role"}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Leave requests">
            <div className="grid gap-3">
              {data.leaveRequests.length === 0 ? <EmptyState>No leave requests.</EmptyState> : null}
              {data.leaveRequests.map((leave) => (
                <div key={leave.id} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">{leave.leave_type} · {leave.days} day(s)</p>
                    <StatusBadge value={leave.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(leave.start_date)} to {formatDate(leave.end_date)}</p>
                  {leave.status === "pending" ? (
                    <div className="mt-3 flex gap-2">
                      <form action={reviewLeaveRequestAction}>
                        <input type="hidden" name="leave_request_id" value={leave.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <SubmitButton>Approve</SubmitButton>
                      </form>
                      <form action={reviewLeaveRequestAction}>
                        <input type="hidden" name="leave_request_id" value={leave.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <SubmitButton tone="danger">Reject</SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Resignations">
            <div className="grid gap-3">
              {data.resignations.length === 0 ? <EmptyState>No resignations.</EmptyState> : null}
              {data.resignations.map((resignation) => (
                <form key={resignation.id} action={acknowledgeResignationAction} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">Resignation</p>
                    <StatusBadge value={resignation.status} />
                  </div>
                  <input type="hidden" name="resignation_id" value={resignation.id} />
                  {resignation.status === "forwarded_to_employer" ? (
                    <div className="mt-3 grid gap-2">
                      <TextInput name="notice_period_days" label="Notice period days" type="number" defaultValue={30} required />
                      <TextArea name="employer_notes" label="Employer notes" />
                      <SubmitButton>Accept and send notice</SubmitButton>
                    </div>
                  ) : null}
                </form>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="Send employee notice">
          <form action={sendNoticeAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="audience" value="my_employees" />
            <TextInput name="title" label="Title" required />
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Priority
              <select name="priority" className="h-10 border border-slate-300 px-3">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <div className="md:col-span-2">
              <TextArea name="body" label="Message" required />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="requires_acknowledgement" />
              Requires acknowledgement
            </label>
            <div className="md:col-span-2">
              <SubmitButton>Send to my employees</SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel title="Financial privacy">
          <p className="text-sm leading-6 text-slate-600">
            This employer workspace does not display employee salary records. It can only show
            employer-facing operational and billing workflow data when that billing UI is added.
          </p>
        </Panel>
      </div>
    </PortalShell>
  );
}
