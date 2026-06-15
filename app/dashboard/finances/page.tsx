import { AdminPortalFinance } from "@/components/finances/admin-portal-finance";
import { EmployeePortalFinance } from "@/components/finances/employee-portal-finance";
import { EmployerPortalFinance } from "@/components/finances/employer-portal-finance";
import {
  getAdminPortalFinanceOptions,
  getAdminPortalFinanceOverview,
  getEmployeePortalFinanceView,
  getEmployerPortalFinanceView,
  parsePortalFinanceFilters,
} from "@/lib/portal/portal-finance";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/ui";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = await searchParams;
  const admin = isPlatformAdmin(session.user.role);
  const [adminData, adminOptions, roleData] = admin
    ? await Promise.all([
      getAdminPortalFinanceOverview(params),
      getAdminPortalFinanceOptions(),
      Promise.resolve(null),
    ])
    : await Promise.all([
      Promise.resolve(null),
      Promise.resolve(null),
      session.user.role === "employer_admin"
        ? getEmployerPortalFinanceView(params)
        : getEmployeePortalFinanceView(params),
    ]);

  return (
    <PortalShell
      session={session}
      title={session.user.role === "employee" ? "Finance" : "Finances"}
      subtitle={
        session.user.role === "employee"
          ? "View your monthly salary details and payslips."
          : "Portal-native employer invoices and employee payroll, kept separate by role and data boundary."
      }
      wide
    >
      {admin ? (
        <AdminPortalFinance data={adminData!} options={adminOptions!} filters={parsePortalFinanceFilters(params)} />
      ) : session.user.role === "employer_admin" ? (
        <EmployerPortalFinance data={roleData as Awaited<ReturnType<typeof getEmployerPortalFinanceView>>} />
      ) : (
        <EmployeePortalFinance data={roleData as Awaited<ReturnType<typeof getEmployeePortalFinanceView>>} />
      )}
    </PortalShell>
  );
}
