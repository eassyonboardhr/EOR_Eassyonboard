import {
  LeaveCalendar,
  LeaveSummaryCard,
  RecentLeaveRequests,
} from "@/components/leaves/leave-ui";
import { EmptyState, PortalShell } from "@/components/portal/ui";
import { getEmployeeLeavesPageData } from "@/lib/portal/leaves";
import { requirePortalRole } from "@/lib/portal/session";

export default async function EmployeeLeavesPage() {
  const session = await requirePortalRole(["employee"]);
  const data = await getEmployeeLeavesPageData(session);
  const now = new Date();

  if (!data) {
    return (
      <PortalShell
        session={session}
        title="Leaves"
        subtitle="Your employee profile is not linked yet."
      >
        <EmptyState>Ask the portal admin to link your employee profile.</EmptyState>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      session={session}
      title="Leaves"
      subtitle="Apply for leave, track request status, and review your leave calendar."
      wide
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LeaveCalendar
          mode="apply"
          year={now.getFullYear()}
          month={now.getMonth() + 1}
          leaveDays={data.leaveDays}
          holidays={data.holidays}
          calendarPolicy={data.calendarPolicy}
          absences={data.absences}
          lifecycleMarkers={data.lifecycleMarkers}
        />
        <div className="grid content-start gap-5">
          <LeaveSummaryCard summary={data.summary} />
          <RecentLeaveRequests requests={data.leaveRequests} />
        </div>
      </div>
    </PortalShell>
  );
}
