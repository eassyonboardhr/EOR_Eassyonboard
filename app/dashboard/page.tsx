import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";

export default async function DashboardPage() {
  const session = await getPortalSession();

  if (session.user.role === "super_admin" || session.user.role === "admin") {
    redirect("/dashboard/admin");
  }

  if (session.user.role === "employer_admin" && session.user.status === "active") {
    redirect("/dashboard/employer");
  }

  if (session.user.role === "employee" && session.user.status === "active") {
    redirect("/dashboard/employee");
  }

  redirect("/request-received");
}
