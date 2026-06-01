import { GlobalOnboardingView } from "@/components/onboarding/global-onboarding-ui";
import { PortalShell } from "@/components/portal/ui";
import { getGlobalOnboardingData } from "@/lib/portal/global-onboarding";
import { requirePortalRole } from "@/lib/portal/session";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = searchParams ? await searchParams : {};
  const data = await getGlobalOnboardingData(session, params);

  return (
    <PortalShell
      session={session}
      title="Global Onboarding"
      subtitle="Manage client company setup, hiring requests, employee self-onboarding, templates, documents, and review workflows."
      wide
    >
      <GlobalOnboardingView data={data} />
    </PortalShell>
  );
}
