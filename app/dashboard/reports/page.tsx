import Link from "next/link";
import { getReportsData } from "@/lib/portal/operations";
import { requirePortalRole } from "@/lib/portal/session";
import { Panel, PortalShell, StatGrid } from "@/components/portal/ui";

export default async function ReportsPage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin"]);
  const data = await getReportsData(session);
  return (
    <PortalShell session={session} title="Reports" subtitle="Operational report hub with live portal counts and shortcuts.">
      <div className="grid gap-5">
        <StatGrid counts={data.counts} />
        <div className="grid gap-5 md:grid-cols-3">
          <ReportCard title="Messages" value={data.messages} href="/dashboard/messages" />
          <ReportCard title="Service agreements" value={data.agreements} href="/dashboard/documents" />
          <ReportCard title="Leave review" value={data.counts.leaveRequests} href={session.user.role === "employer_admin" ? "/dashboard/employer/leaves" : "/dashboard/admin/leaves"} />
        </div>
      </div>
    </PortalShell>
  );
}

function ReportCard({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Panel title={title}>
      <p className="text-3xl font-bold text-slate-950">{value}</p>
      <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-blue-700">Open module</Link>
    </Panel>
  );
}
