import { ImportFinanceReconciliation } from "@/components/finances/import-finance-reconciliation";
import { getAdminFinanceReconciliation } from "@/lib/portal/finances";
import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/ui";

export default async function ImportFinanceReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const params = await searchParams;
  const data = await getAdminFinanceReconciliation(session, params);

  return (
    <PortalShell
      session={session}
      title="Finance Reconciliation"
      subtitle="Imported Invoice Generator invoices, payments, salary rows, mappings, allocations, cashout, and reconciliation data."
      wide
    >
      <ImportFinanceReconciliation data={data} />
    </PortalShell>
  );
}
