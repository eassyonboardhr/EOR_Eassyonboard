"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { booleanValue, optionalString, requireString } from "@/lib/portal/form";
import { ensureActivePortalSession, getPortalSession, isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

function fileNameSafe(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadServiceAgreementAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const employerId = requireString(formData, "employer_id");
  const employeeId = optionalString(formData, "employee_id");
  const title = requireString(formData, "title");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Agreement file is required.");

  const supabase = getSupabaseAdmin();
  if (employeeId) {
    const { data: employee } = await supabase.from("employees").select("id").eq("id", employeeId).eq("employer_id", employerId).maybeSingle();
    if (!employee) throw new Error("Employee is not under the selected employer.");
  }
  const folder = `${employerId}/service-agreements/${employeeId ?? "general"}`;
  const path = `${folder}/${Date.now()}-${fileNameSafe(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("company-documents").upload(path, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: agreement, error } = await from(supabase, "service_agreements")
    .insert({
      employer_id: employerId,
      employee_id: employeeId,
      title,
      file_path: path,
      currency: optionalString(formData, "currency"),
      admin_notes: optionalString(formData, "admin_notes"),
      shared_with_employee: booleanValue(formData, "shared_with_employee"),
      uploaded_by: session.user.id,
    })
    .select("id")
    .single();
  if (error || !agreement) throw new Error(error?.message ?? "Could not save agreement.");

  await createEmployerNotice(employerId, "Service agreement uploaded", `A service agreement is ready for review: ${title}`, "/dashboard/documents");
  await writeAudit(session.user, "upload_service_agreement", "service_agreement", agreement.id);
  revalidatePath("/dashboard/documents");
}

export async function reviewServiceAgreementAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  const agreementId = requireString(formData, "agreement_id");
  const status = requireString(formData, "status");
  if (!["reviewed", "signed_offline", "needs_change"].includes(status)) throw new Error("Invalid agreement status.");
  if (session.user.role !== "employer_admin" && !isPlatformAdmin(session.user.role)) throw new Error("You cannot review agreements.");

  const supabase = getSupabaseAdmin();
  let query = from(supabase, "service_agreements").select("id, employer_id").eq("id", agreementId);
  if (session.user.role === "employer_admin") query = query.eq("employer_id", session.user.employer_id ?? "");
  const { data: agreement } = await query.maybeSingle();
  if (!agreement) throw new Error("Agreement is outside your scope.");

  await from(supabase, "service_agreements")
    .update({
      status,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      employer_notes: optionalString(formData, "employer_notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreementId);
  await writeAudit(session.user, `review_service_agreement_${status}`, "service_agreement", agreementId);
  revalidatePath("/dashboard/documents");
}

async function createEmployerNotice(employerId: string, title: string, body: string, actionUrl: string) {
  const supabase = getSupabaseAdmin();
  const { data: users } = await supabase.from("portal_users").select("id").eq("role", "employer_admin").eq("status", "active").eq("employer_id", employerId);
  if (!users?.length) return;
  const { data: notice } = await supabase
    .from("notices")
    .insert({ employer_id: employerId, title, body, priority: "important", category: "documents", action_url: actionUrl, action_label: "Open Documents" })
    .select("id")
    .single();
  if (notice) {
    await supabase.from("notice_recipients").insert(users.map((user) => ({ notice_id: notice.id, recipient_user_id: user.id })));
  }
}
