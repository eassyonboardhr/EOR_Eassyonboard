import { PortalShell } from "@/components/portal/ui";
import { WorktreeClient } from "@/components/worktree/worktree-client";
import { getWorktreeData } from "@/lib/portal/worktree";
import { requirePortalRole } from "@/lib/portal/session";

export default async function WorktreePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole([
    "super_admin",
    "admin",
    "employer_admin",
    "employee",
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getWorktreeData(session, resolvedSearchParams);

  return (
    <PortalShell
      session={session}
      title="Worktree"
      subtitle="Visualize employer, team, manager, and employee relationships."
      wide
    >
      <WorktreeClient data={data} role={session.user.role} />
    </PortalShell>
  );
}
