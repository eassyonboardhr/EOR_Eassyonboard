import { OffboardingLifecycleView } from "@/components/lifecycle/lifecycle-ui";
import { PortalShell } from "@/components/portal/ui";
import { getOffboardingLifecycleData } from "@/lib/portal/lifecycle";
import { requirePortalRole } from "@/lib/portal/session";

export default async function OffboardingPage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getOffboardingLifecycleData(session);

  return (
    <PortalShell
      session={session}
      title="Offboarding"
      subtitle="Request, approve, initiate, complete, and confirm access deactivation."
      wide
    >
      <OffboardingLifecycleView role={session.user.role} data={data} />
    </PortalShell>
  );
}
