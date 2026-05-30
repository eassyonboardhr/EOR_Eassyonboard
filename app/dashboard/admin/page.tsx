import { approveLeadAction, rejectLeadAction } from "@/lib/portal/actions/employer";
import {
  approveEmployeeRequestAction,
  rejectEmployeeRequestAction,
} from "@/lib/portal/actions/employee";
import { reviewLeaveRequestAction } from "@/lib/portal/actions/leave";
import {
  approveOffboardingAction,
  forwardResignationAction,
} from "@/lib/portal/actions/offboarding";
import { sendNoticeAction } from "@/lib/portal/actions/notices";
import { getAdminDashboardData } from "@/lib/portal/data";
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

export default async function AdminDashboardPage() {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const data = await getAdminDashboardData();

  return (
    <PortalShell
      session={session}
      title="Admin console"
      subtitle="Approve employers, control employee access, review leave/offboarding, and keep salary/billing boundaries separate."
    >
      <div className="grid gap-5">
        <StatGrid counts={data.counts} />

        <Panel title="Employer leads" description="Public signups wait here until an admin approves or rejects them.">
          <div className="grid gap-3">
            {data.leads.length === 0 ? <EmptyState>No employer leads yet.</EmptyState> : null}
            {data.leads.map((lead) => (
              <div key={lead.id} className="grid gap-3 border border-slate-200 p-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{lead.company_name ?? lead.email}</h3>
                    <StatusBadge value={lead.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{lead.contact_name ?? "No contact name"} · {lead.email}</p>
                  {lead.message ? <p className="mt-2 text-sm text-slate-600">{lead.message}</p> : null}
                </div>
                {lead.status === "pending" ? (
                  <div className="flex gap-2">
                    <form action={approveLeadAction}>
                      <input type="hidden" name="lead_id" value={lead.id} />
                      <SubmitButton>Approve</SubmitButton>
                    </form>
                    <form action={rejectLeadAction}>
                      <input type="hidden" name="lead_id" value={lead.id} />
                      <SubmitButton tone="danger">Reject</SubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Employee requests" description="Employers request employees; admins approve before employees can join.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.employeeRequests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{request.full_name}</p>
                      <p className="text-slate-500">{request.email}</p>
                    </td>
                    <td className="py-3 pr-4">{request.job_title ?? "Not set"}</td>
                    <td className="py-3 pr-4"><StatusBadge value={request.status} /></td>
                    <td className="py-3 pr-4">{formatDate(request.created_at)}</td>
                    <td className="py-3 pr-4">
                      {request.status === "pending" ? (
                        <div className="flex gap-2">
                          <form action={approveEmployeeRequestAction}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <SubmitButton>Approve</SubmitButton>
                          </form>
                          <form action={rejectEmployeeRequestAction}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <SubmitButton tone="danger">Reject</SubmitButton>
                          </form>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.employeeRequests.length === 0 ? <EmptyState>No employee requests yet.</EmptyState> : null}
          </div>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Leave review queue">
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

          <Panel title="Resignation and offboarding">
            <div className="grid gap-3">
              {data.resignations.map((resignation) => (
                <form key={resignation.id} action={forwardResignationAction} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">Resignation</p>
                    <StatusBadge value={resignation.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Preferred LWD: {formatDate(resignation.preferred_last_working_day)}</p>
                  <input type="hidden" name="resignation_id" value={resignation.id} />
                  {resignation.status === "submitted_to_admin" ? (
                    <div className="mt-3 grid gap-2">
                      <TextArea name="admin_notes" label="Admin note to employer" />
                      <SubmitButton>Forward to employer</SubmitButton>
                    </div>
                  ) : null}
                </form>
              ))}
              {data.offboardingCases.map((offboarding) => (
                <form key={offboarding.id} action={approveOffboardingAction} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">Offboarding case</p>
                    <StatusBadge value={offboarding.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Target LWD: {formatDate(offboarding.target_last_working_day)}</p>
                  <input type="hidden" name="offboarding_id" value={offboarding.id} />
                  {offboarding.status === "requested_by_employer" ? (
                    <div className="mt-3 grid gap-2">
                      <TextArea name="admin_notes" label="Approval notes" />
                      <SubmitButton>Approve offboarding</SubmitButton>
                    </div>
                  ) : null}
                </form>
              ))}
              {data.resignations.length === 0 && data.offboardingCases.length === 0 ? (
                <EmptyState>No resignation or offboarding activity.</EmptyState>
              ) : null}
            </div>
          </Panel>
        </div>

        <Panel title="Send notice" description="Admin notices can target all active employers or all active employees.">
          <form action={sendNoticeAction} className="grid gap-4 lg:grid-cols-2">
            <TextInput name="title" label="Title" required />
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Audience
              <select name="audience" className="h-10 border border-slate-300 px-3">
                <option value="all_employers">All employers</option>
                <option value="all_employees">All employees</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Priority
              <select name="priority" className="h-10 border border-slate-300 px-3">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
              <input type="checkbox" name="requires_acknowledgement" />
              Requires acknowledgement
            </label>
            <div className="lg:col-span-2">
              <TextArea name="body" label="Message" required />
            </div>
            <div className="lg:col-span-2">
              <SubmitButton>Send notice</SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel title="Privacy boundary check" description="Admin sees both lists for control; employer and employee dashboards intentionally do not combine these values.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="border border-slate-200 p-4 text-sm text-slate-600">
              Employee salary records live in <span className="font-mono">employee_compensation</span> and are hidden from employer dashboards.
            </div>
            <div className="border border-slate-200 p-4 text-sm text-slate-600">
              Employer billing records live in <span className="font-mono">employer_billing</span> and are hidden from employee dashboards.
            </div>
          </div>
        </Panel>
      </div>
    </PortalShell>
  );
}
