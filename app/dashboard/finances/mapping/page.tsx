import { redirect } from "next/navigation";

export default function FinanceMappingRedirectPage() {
  redirect("/dashboard/imports/finance-reconciliation/mapping");
}
