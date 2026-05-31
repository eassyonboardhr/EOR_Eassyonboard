import Link from "next/link";
import { PortalShell } from "@/components/portal/ui";
import { requirePortalRole } from "@/lib/portal/session";

function label(value: string) {
  return value
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function WorktreeActionPlaceholderPage({
  params,
}: {
  params: Promise<{ targetType: string; targetId: string; action: string }>;
}) {
  const session = await requirePortalRole([
    "super_admin",
    "admin",
    "employer_admin",
    "employee",
  ]);
  const { targetType, targetId, action } = await params;

  return (
    <PortalShell
      session={session}
      title={label(action)}
      subtitle={`Placeholder ${label(action).toLowerCase()} page for ${targetType} Worktree node ${targetId}.`}
    >
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <p className="text-sm font-semibold text-slate-950">{label(action)}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          This route is reserved for the Worktree {targetType} action. The dedicated
          workflow can be connected here without changing the Worktree action panel.
        </p>
        <Link
          href="/dashboard/worktree"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Back to Worktree
        </Link>
      </section>
    </PortalShell>
  );
}
