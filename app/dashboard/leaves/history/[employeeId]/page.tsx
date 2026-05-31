import { LeaveHistoryView } from "@/components/leaves/leave-ui";
import { PortalShell } from "@/components/portal/ui";
import { getLeaveHistoryPageData } from "@/lib/portal/leaves";
import { requirePortalRole } from "@/lib/portal/session";

export default async function LeaveHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole([
    "super_admin",
    "admin",
    "employer_admin",
    "employee",
  ]);
  const { employeeId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getLeaveHistoryPageData(session, employeeId, resolvedSearchParams);

  return (
    <PortalShell
      session={session}
      title="Leave History"
      subtitle={`Read-only leave calendar for ${data.employee.full_name}.`}
      wide
    >
      <LeaveHistoryView
        employee={data.employee}
        summary={data.summary}
        leaveDays={data.leaveDays}
        holidays={data.holidays}
        calendarPolicy={data.calendarPolicy}
        absences={data.absences}
        year={data.year}
        month={data.month}
      />
    </PortalShell>
  );
}
