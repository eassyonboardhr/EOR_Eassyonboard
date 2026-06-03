/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getAttendanceData } from "@/lib/portal/operations";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, formatDate } from "@/components/portal/ui";

export default async function AttendancePage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getAttendanceData(session);
  return (
    <PortalShell session={session} title="Attendance" subtitle="Operational attendance view built from approved leave, pending leave, marked absences, and LOP records.">
      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Approved leave days" value={data.summary.approvedLeaveDays} tone="emerald" />
          <Metric label="Pending leave days" value={data.summary.pendingLeaveDays} tone="amber" />
          <Metric label="Rejected leave days" value={data.summary.rejectedLeaveDays} tone="rose" />
          <Metric label="Marked absence days" value={data.summary.absenceDays} tone="slate" />
          <Metric label="LOP days" value={data.summary.lopDays} tone="purple" />
        </div>

        {session.user.role !== "employee" ? (
          <Panel title="Attendance actions" description="Use the leave module to apply leave on behalf of an employee, mark absences, or convert absence days to LOP.">
            <div className="flex flex-wrap gap-3">
              <Link href={session.user.role === "employer_admin" ? "/dashboard/employer/leaves" : "/dashboard/admin/leaves"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">
                Open Leave Queue
              </Link>
              <Link href="/dashboard/worktree" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Find Employee
              </Link>
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Marked absences" description="Absences entered by admin or employer, including rejected leave that became LOP.">
            <Rows rows={data.absences} dateKey="start_date" />
          </Panel>
          <Panel title="Leave-linked attendance" description="Recent leave requests that affect attendance and payroll readiness.">
            <Rows rows={data.leaves} dateKey="start_date" />
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "rose" | "slate" | "purple" }) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
    slate: "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
    purple: "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-200",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{Number(value).toLocaleString("en-IN")}</p>
    </div>
  );
}

function Rows({ rows, dateKey }: { rows: any[]; dateKey: string }) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950 dark:text-slate-100">{row.employees?.full_name ?? "Employee"}</p>
              <p className="mt-1 text-xs text-slate-500">{row.employees?.employers?.name ?? row.employees?.email ?? ""}</p>
            </div>
            <StatusBadge value={row.status ?? (row.is_lop ? "lop" : "recorded")} />
          </div>
          <p className="mt-3 text-slate-500">{formatDate(row[dateKey])} {row.end_date ? `to ${formatDate(row.end_date)}` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>{Number(row.total_absent_days ?? row.total_leave_days ?? row.days ?? 0)} day(s)</span>
            {row.lop_days || row.is_lop ? <span className="font-semibold text-purple-700 dark:text-purple-300">LOP {Number(row.lop_days ?? row.total_absent_days ?? 0)}</span> : null}
            {row.excluded_holiday_days ? <span>{row.excluded_holiday_days} holiday/week-off excluded</span> : null}
          </div>
          {row.reason ? <p className="mt-2 text-slate-600 dark:text-slate-300">{row.reason}</p> : null}
        </div>
      ))}
      {rows.length === 0 ? <EmptyState>No attendance records in scope yet.</EmptyState> : null}
    </div>
  );
}
