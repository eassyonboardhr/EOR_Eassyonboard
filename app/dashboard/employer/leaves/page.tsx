import { LeaveRequestsTable } from "@/components/leaves/leave-requests-table";
import { PortalShell } from "@/components/portal/ui";
import { getLeaveRequestsForApproval } from "@/lib/portal/leaves";
import { requirePortalRole } from "@/lib/portal/session";

export default async function EmployerLeavesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["employer_admin"]);
  const params = searchParams ? await searchParams : {};
  const data = await getLeaveRequestsForApproval(session, params);

  return (
    <PortalShell
      session={session}
      title="Leaves"
      subtitle="Approve, reject, apply on behalf, and mark employee absences."
      wide
    >
      <LeaveRequestsTable
        requests={data.requests}
        employees={data.employees}
        employers={data.employers}
        teams={data.teams}
        counts={data.counts}
        role="employer"
        basePath="/dashboard/employer/leaves"
      />
    </PortalShell>
  );
}
