/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAttendanceData } from "@/lib/portal/operations";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, formatDate } from "@/components/portal/ui";

export default async function AttendancePage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getAttendanceData(session);
  return (
    <PortalShell session={session} title="Attendance" subtitle="Read-only v1 attendance view based on leave and absence records.">
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Absence records">
          <Rows rows={data.absences} dateKey="date" />
        </Panel>
        <Panel title="Leave-linked attendance">
          <Rows rows={data.leaves} dateKey="start_date" />
        </Panel>
      </div>
    </PortalShell>
  );
}

function Rows({ rows, dateKey }: { rows: any[]; dateKey: string }) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between gap-3">
            <p className="font-semibold">{row.employees?.full_name ?? "Employee"}</p>
            <StatusBadge value={row.status ?? (row.is_lop ? "lop" : "recorded")} />
          </div>
          <p className="mt-1 text-slate-500">{formatDate(row[dateKey])} {row.end_date ? `to ${formatDate(row.end_date)}` : ""}</p>
          {row.reason ? <p className="mt-2 text-slate-600">{row.reason}</p> : null}
        </div>
      ))}
      {rows.length === 0 ? <EmptyState>No attendance records in scope yet. The full punch/timesheet engine can be added later without blocking leave/absence tracking.</EmptyState> : null}
    </div>
  );
}
