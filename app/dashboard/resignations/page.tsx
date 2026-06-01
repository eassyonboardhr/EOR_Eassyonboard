import { ResignationLifecycleView } from "@/components/lifecycle/lifecycle-ui";
import { PortalShell } from "@/components/portal/ui";
import { getResignationLifecycleData } from "@/lib/portal/lifecycle";
import { requirePortalRole } from "@/lib/portal/session";

export default async function ResignationsPage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getResignationLifecycleData(session);

  return (
    <PortalShell
      session={session}
      title="Resignations"
      subtitle="Submit, review, accept, and track resignation lifecycle status."
      wide
    >
      <ResignationLifecycleView role={session.user.role} data={data} />
    </PortalShell>
  );
}
