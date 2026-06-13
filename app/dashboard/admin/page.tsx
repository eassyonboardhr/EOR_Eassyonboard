import Link from "next/link";
import { reviewLeaveRequestAction } from "@/lib/portal/actions/leave";
import {
  approveOffboardingAction,
  forwardResignationAction,
} from "@/lib/portal/actions/offboarding";
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

        <Panel title="Admin shortcuts" description="Operational management now lives in the matching sidebar sections.">
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/dashboard/employers?tab=create" className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              Create employer
            </Link>
            <Link href="/dashboard/employers?tab=leads" className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              Review employer leads
            </Link>
            <Link href="/dashboard/employees?tab=requests" className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              Review employee requests
            </Link>
            <Link href="/dashboard/notices?compose=1" className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              Send notice
            </Link>
            <Link href="/dashboard/employees?tab=deactivate" className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              Employee deactivation
            </Link>
            <Link href="/dashboard/reports#privacy-boundary" className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              Privacy boundary
            </Link>
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

      </div>
    </PortalShell>
  );
}
