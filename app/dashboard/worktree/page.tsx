import { PortalShell } from "@/components/portal/ui";
import { WorktreeClient } from "@/components/worktree/worktree-client";
import { getWorktreeData } from "@/lib/portal/worktree";
import { requirePortalRole } from "@/lib/portal/session";

function resolveWorktreeTab(value: string | string[] | undefined) {
  const tab = Array.isArray(value) ? value[0] : value;
  return tab === "teams" ? "teams" : "worktree";
}

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
  const activeTab = resolveWorktreeTab(resolvedSearchParams.tab);

  return (
    <PortalShell
      session={session}
      title="Worktree"
      subtitle="Visualize employer, team, manager, and employee relationships."
      wide
    >
      <WorktreeClient data={data} role={session.user.role} activeTab={activeTab} />
    </PortalShell>
  );
}
