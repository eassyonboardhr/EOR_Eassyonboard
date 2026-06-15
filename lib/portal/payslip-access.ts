import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";
import type { PortalPayslipFile } from "@/lib/portal/portal-finance-types";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export async function canAccessPayslip(session: PortalSession, payslip: Pick<PortalPayslipFile, "employee_id">) {
  if (isPlatformAdmin(session.user.role)) return true;
  if (session.user.role !== "employee") return false;

  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();
  return employee?.id === payslip.employee_id;
}

export async function getPayslipSignedUrl(session: PortalSession, payslipId: string) {
  const supabase = getSupabaseAdmin();
  const { data: payslip, error } = await from(supabase, "portal_payslip_files")
    .select("*")
    .eq("id", payslipId)
    .single();
  if (error || !payslip) throw new Error(error?.message ?? "Payslip was not found.");
  if (!(await canAccessPayslip(session, payslip))) {
    throw new Error("You cannot access this payslip.");
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from("payslips")
    .createSignedUrl(payslip.file_path, 60 * 10);
  if (signedUrlError || !data?.signedUrl) {
    throw new Error(signedUrlError?.message ?? "Could not create payslip link.");
  }
  return data.signedUrl;
}
