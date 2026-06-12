import Link from "next/link";
import {
  applyLeaveOnBehalfAction,
  markAbsentAction,
  reviewLeaveRequestAction,
} from "@/lib/portal/actions/leave";
import { SubmitButton } from "@/components/portal/ui";
import type { LeaveRequestWithPeople } from "@/lib/portal/leaves";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-rose-50 text-rose-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function LeaveRequestsTable({
  requests,
  employees,
  employers,
  teams,
  counts,
  role,
  basePath,
}: {
  requests: LeaveRequestWithPeople[];
  employees: Array<{ id: string; full_name: string; employer_id: string }>;
  employers: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string }>;
  counts: { pending: number; approved: number; rejected: number; all: number };
  role: "admin" | "employer";
  basePath: string;
}) {
  const tabs = [
    ["pending", `Pending (${counts.pending})`],
    ["approved", `Approved (${counts.approved})`],
    ["rejected", `Rejected (${counts.rejected})`],
    ["all", `All (${counts.all})`],
  ];

  return (
    <div className="grid gap-5">
      <nav className="flex flex-wrap gap-5 border-b border-slate-200 text-sm font-semibold">
        {tabs.map(([status, label]) => (
          <Link
            key={status}
            href={`${basePath}?status=${status}`}
            className="border-b-2 border-transparent px-1 py-3 text-slate-600 transition hover:border-blue-600 hover:text-blue-700"
          >
            {label}
          </Link>
        ))}
      </nav>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <input type="hidden" name="status" value="all" />
        {role === "admin" ? (
          <select name="employer" className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
            <option value="all">All Companies</option>
            {employers.map((employer) => (
              <option key={employer.id} value={employer.id}>{employer.name}</option>
            ))}
          </select>
        ) : null}
        <select name="employee" className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
          <option value="all">All Employees</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.full_name}</option>
          ))}
        </select>
        <select name="team" className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
          <option value="all">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
        <input name="start" type="date" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
        <input name="end" type="date" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
        <SubmitButton tone="secondary" pendingText="Filtering...">Filter</SubmitButton>
      </form>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              {role === "admin" ? <th className="px-4 py-3">Company</th> : null}
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted On</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-950">{request.employees?.full_name ?? "Employee"}</p>
                  <p className="text-xs text-slate-500">{request.employees?.department ?? request.teams?.name ?? "No team"}</p>
                </td>
                {role === "admin" ? (
                  <td className="px-4 py-3">{request.employees?.employers?.name ?? "Employer"}</td>
                ) : null}
                <td className="px-4 py-3">{formatDate(request.start_date)} - {formatDate(request.end_date)}</td>
                <td className="px-4 py-3">
                  {Number(request.total_leave_days ?? request.days)}
                  {Number(request.lop_days ?? 0) > 0 ? <span className="ml-1 text-purple-700">+ {request.lop_days} LOP</span> : null}
                </td>
                <td className="px-4 py-3">{request.reason ?? "Not provided"}</td>
                <td className="px-4 py-3">{request.mobile_number ?? "Not set"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusTone(request.status)}`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-4 py-3">{formatDate(request.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {request.status === "pending" ? (
                      <>
                        <form action={reviewLeaveRequestAction}>
                          <input type="hidden" name="leave_request_id" value={request.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <SubmitButton tone="secondary" pendingText="Approving...">Approve</SubmitButton>
                        </form>
                        <form action={reviewLeaveRequestAction} className="flex gap-1">
                          <input type="hidden" name="leave_request_id" value={request.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <input name="rejection_reason" placeholder="Reason" className="h-7 w-24 rounded border border-slate-200 px-2 text-xs" />
                          <SubmitButton tone="danger" pendingText="Rejecting...">Reject</SubmitButton>
                        </form>
                      </>
                    ) : null}
                    <Link href={`/dashboard/leaves/history/${request.employee_id}`} className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-bold text-blue-700">View</Link>
                    {request.status === "rejected" ? (
                      <form action={markAbsentAction}>
                        <input type="hidden" name="employee_id" value={request.employee_id} />
                        <input type="hidden" name="leave_request_id" value={request.id} />
                        <input type="hidden" name="start_date" value={request.start_date} />
                        <input type="hidden" name="end_date" value={request.end_date} />
                        <input type="hidden" name="reason" value={`Rejected leave converted to LOP: ${request.reason ?? ""}`} />
                        <SubmitButton tone="secondary" pendingText="Marking...">LOP</SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 ? <p className="p-5 text-sm text-slate-500">No leave requests found.</p> : null}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Need to view an employee&apos;s complete leave history? Open a request row or go to Worktree and use the employee Leave History action.
          </span>
          <Link
            href={role === "admin" ? "/dashboard/admin/leaves/calendar-requests" : "/dashboard/employer/leaves/calendar"}
            className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-700"
          >
            {role === "admin" ? "Review Calendar Changes" : "Manage Holiday Calendar"}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-2">
        <form action={applyLeaveOnBehalfAction} className="grid gap-3">
          <h2 className="font-semibold text-slate-950">Apply Leave on Behalf</h2>
          <select name="employee_id" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="start_date" type="date" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
            <input name="end_date" type="date" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          </div>
          <input name="reason" required placeholder="Reason" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          <input name="mobile_number" required placeholder="Mobile number" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          <SubmitButton pendingText="Applying...">Apply</SubmitButton>
        </form>
        <form action={markAbsentAction} className="grid gap-3">
          <h2 className="font-semibold text-slate-950">Mark Absent / LOP</h2>
          <select name="employee_id" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm">
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="start_date" type="date" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
            <input name="end_date" type="date" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          </div>
          <input name="reason" placeholder="Reason" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          <input name="mobile_number" placeholder="Mobile number" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          <SubmitButton pendingText="Marking...">Mark LOP Absence</SubmitButton>
        </form>
      </section>
    </div>
  );
}
