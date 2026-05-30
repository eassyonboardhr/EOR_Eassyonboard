"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { booleanValue, optionalString, requireString } from "@/lib/portal/form";
import { getPortalSession, isPlatformAdmin } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

async function resolveNoticeRecipients(audience: string, senderEmployerId: string | null) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("portal_users")
    .select("id")
    .eq("status", "active");

  if (audience === "all_employers") {
    query = query.eq("role", "employer_admin");
  } else if (audience === "all_employees") {
    query = query.eq("role", "employee");
  } else if (audience === "my_employees" && senderEmployerId) {
    query = query.eq("role", "employee").eq("employer_id", senderEmployerId);
  } else {
    return [];
  }

  const { data } = await query;
  return (data ?? []).map((row) => row.id);
}

export async function sendNoticeAction(formData: FormData) {
  const session = await getPortalSession();
  const audience = requireString(formData, "audience");

  if (!isPlatformAdmin(session.user.role) && session.user.role !== "employer_admin") {
    throw new Error("You cannot send notices.");
  }

  if (session.user.role === "employer_admin" && audience !== "my_employees") {
    throw new Error("Employer admins can only message their own employees.");
  }

  const recipientIds = await resolveNoticeRecipients(audience, session.user.employer_id);
  const supabase = getSupabaseAdmin();
  const { data: notice, error } = await supabase
    .from("notices")
    .insert({
      sender_id: session.user.id,
      employer_id: session.user.role === "employer_admin" ? session.user.employer_id : null,
      title: requireString(formData, "title"),
      body: requireString(formData, "body"),
      priority: requireString(formData, "priority"),
      requires_acknowledgement: booleanValue(formData, "requires_acknowledgement"),
    })
    .select("id")
    .single();

  if (error || !notice) {
    throw new Error(error?.message ?? "Could not send notice.");
  }

  if (recipientIds.length > 0) {
    await supabase.from("notice_recipients").insert(
      recipientIds.map((recipient_user_id) => ({
        notice_id: notice.id,
        recipient_user_id,
      })),
    );
  }

  await writeAudit(session.user, "send_notice", "notice", notice.id, {
    audience,
    recipient_count: recipientIds.length,
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/employee");
}

export async function markNoticeReadAction(formData: FormData) {
  const session = await getPortalSession();
  const recipientId = requireString(formData, "recipient_id");
  const supabase = getSupabaseAdmin();

  await supabase
    .from("notice_recipients")
    .update({
      read_at: new Date().toISOString(),
      acknowledged_at: optionalString(formData, "acknowledge")
        ? new Date().toISOString()
        : undefined,
    })
    .eq("id", recipientId)
    .eq("recipient_user_id", session.user.id);

  revalidatePath("/dashboard/employee");
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/admin");
}
