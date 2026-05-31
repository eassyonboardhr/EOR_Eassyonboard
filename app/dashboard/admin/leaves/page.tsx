import { LeaveRequestsTable } from "@/components/leaves/leave-requests-table";
import { PortalShell } from "@/components/portal/ui";
import { getLeaveRequestsForApproval } from "@/lib/portal/leaves";
import { requirePortalRole } from "@/lib/portal/session";

export default async function AdminLeavesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const params = searchParams ? await searchParams : {};
  const data = await getLeaveRequestsForApproval(session, params);

  return (
    <PortalShell
      session={session}
      title="Leaves"
      subtitle="Review all leave requests across employers and manage absence/LOP outcomes."
      wide
    >
      <LeaveRequestsTable
        requests={data.requests}
        employees={data.employees}
        employers={data.employers}
        teams={data.teams}
        counts={data.counts}
        role="admin"
        basePath="/dashboard/admin/leaves"
      />
    </PortalShell>
  );
}
