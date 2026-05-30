import { submitLeaveRequestAction } from "@/lib/portal/actions/leave";
import { markNoticeReadAction } from "@/lib/portal/actions/notices";
import { submitResignationAction } from "@/lib/portal/actions/offboarding";
import { getEmployeeDashboardData } from "@/lib/portal/data";
import { requirePortalRole } from "@/lib/portal/session";
import {
  EmptyState,
  Panel,
  PortalShell,
  StatusBadge,
  SubmitButton,
  TextArea,
  TextInput,
  formatDate,
} from "@/components/portal/ui";

export default async function EmployeeDashboardPage() {
  const session = await requirePortalRole(["employee"]);
  const data = await getEmployeeDashboardData(session);

  if (!data) {
    return (
      <PortalShell
        session={session}
        title="Employee profile pending"
        subtitle="Your Clerk account is active, but no employee profile is linked yet."
      >
        <EmptyState>Ask the portal admin to approve your employee request/invite.</EmptyState>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      session={session}
      title={`Welcome, ${data.employee.full_name}`}
      subtitle="View leave balances, apply for leave, track resignation/offboarding, and read notices."
    >
      <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Casual</p>
            <p className="mt-2 text-2xl font-semibold">{data.balance?.casual_available ?? 0}</p>
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Sick</p>
            <p className="mt-2 text-2xl font-semibold">{data.balance?.sick_available ?? 0}</p>
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Earned</p>
            <p className="mt-2 text-2xl font-semibold">{data.balance?.earned_available ?? 0}</p>
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Comp off</p>
            <p className="mt-2 text-2xl font-semibold">{data.balance?.comp_off_available ?? 0}</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Apply for leave">
            <form action={submitLeaveRequestAction} className="grid gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Leave type
                <select name="leave_type" className="h-10 border border-slate-300 px-3">
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="earned">Earned</option>
                  <option value="comp_off">Comp off</option>
                  <option value="lop">LOP</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <TextInput name="start_date" label="Start date" type="date" required />
                <TextInput name="end_date" label="End date" type="date" required />
                <TextInput name="days" label="Days" type="number" defaultValue={1} required />
              </div>
              <TextArea name="reason" label="Reason" />
              <SubmitButton>Submit leave request</SubmitButton>
            </form>
          </Panel>

          <Panel title="Apply for resignation">
            <form action={submitResignationAction} className="grid gap-4">
              <TextInput
                name="preferred_last_working_day"
                label="Preferred last working day"
                type="date"
              />
              <TextArea name="reason" label="Reason" />
              <SubmitButton tone="secondary">Submit resignation</SubmitButton>
            </form>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Leave history">
            <div className="grid gap-3">
              {data.leaveRequests.length === 0 ? <EmptyState>No leave requests yet.</EmptyState> : null}
              {data.leaveRequests.map((leave) => (
                <div key={leave.id} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">{leave.leave_type} · {leave.days} day(s)</p>
                    <StatusBadge value={leave.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(leave.start_date)} to {formatDate(leave.end_date)}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Resignation and offboarding status">
            <div className="grid gap-3">
              {data.resignations.map((resignation) => (
                <div key={resignation.id} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">Resignation</p>
                    <StatusBadge value={resignation.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Preferred LWD: {formatDate(resignation.preferred_last_working_day)}</p>
                </div>
              ))}
              {data.offboardingCases.map((offboarding) => (
                <div key={offboarding.id} className="border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium">Offboarding</p>
                    <StatusBadge value={offboarding.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Target LWD: {formatDate(offboarding.target_last_working_day)}</p>
                </div>
              ))}
              {data.resignations.length === 0 && data.offboardingCases.length === 0 ? (
                <EmptyState>No resignation or offboarding activity.</EmptyState>
              ) : null}
            </div>
          </Panel>
        </div>

        <Panel title="Notices">
          <div className="grid gap-3">
            {data.noticeRecipients.length === 0 ? <EmptyState>No notices yet.</EmptyState> : null}
            {data.noticeRecipients.map((recipient) => (
              <form key={recipient.id} action={markNoticeReadAction} className="border border-slate-200 p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{recipient.notices?.title ?? "Notice"}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{recipient.notices?.body}</p>
                  </div>
                  <StatusBadge value={recipient.acknowledged_at ? "acknowledged" : recipient.read_at ? "read" : "unread"} />
                </div>
                <input type="hidden" name="recipient_id" value={recipient.id} />
                {recipient.notices?.requires_acknowledgement ? (
                  <input type="hidden" name="acknowledge" value="true" />
                ) : null}
                <div className="mt-3">
                  <SubmitButton tone="secondary">
                    {recipient.notices?.requires_acknowledgement ? "Acknowledge" : "Mark read"}
                  </SubmitButton>
                </div>
              </form>
            ))}
          </div>
        </Panel>

        <Panel title="Financial privacy">
          <p className="text-sm leading-6 text-slate-600">
            Employee view does not display employer billing amounts. Your salary records are
            intentionally separate from employer-facing billing records.
          </p>
        </Panel>
      </div>
    </PortalShell>
  );
}
