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
          <ReportCard title="Pending documents" value={data.pendingDocuments} href="/dashboard/onboarding" />
          <ReportCard title="Calendar requests" value={data.pendingCalendarRequests} href={session.user.role === "employer_admin" ? "/dashboard/employer/leaves/calendar" : "/dashboard/admin/leaves/calendar-requests"} />
          <ReportCard title="Marked absences" value={data.absences} href="/dashboard/attendance" />
          {session.user.role !== "employer_admin" ? <ReportCard title="Finance mapping" value={data.financeNeedsMapping} href="/dashboard/finances/mapping" /> : null}
        </div>
        <Panel title="Exports" description="Download scoped CSV reports for payroll review, leave audits, and lifecycle tracking.">
          <div className="flex flex-wrap gap-3">
            <ExportLink type="leave" label="Leave CSV" />
            <ExportLink type="attendance" label="Attendance CSV" />
            <ExportLink type="lifecycle" label="Lifecycle CSV" />
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Employer exports include only their company data. Admin exports include all currently visible portal records.
          </p>
        </Panel>
      </div>
    </PortalShell>
  );
}

function ReportCard({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Panel title={title}>
      <p className="text-3xl font-bold text-slate-950 dark:text-slate-100">{value}</p>
      <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-blue-700">Open module</Link>
    </Panel>
  );
}

function ExportLink({ type, label }: { type: string; label: string }) {
  return (
    <Link href={`/api/reports/export?type=${type}`} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
      {label}
    </Link>
  );
}
