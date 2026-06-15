"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { booleanValue, optionalString, requireString } from "@/lib/portal/form";
import {
  ensureActivePortalSession,
  getPortalSession,
  isPlatformAdmin,
} from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

function noticePriority(formData: FormData) {
  const priority = requireString(formData, "priority");

  if (priority !== "normal" && priority !== "important" && priority !== "urgent") {
    throw new Error("Invalid notice priority.");
  }

  return priority;
}

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

async function resolveTargetedNotice(
  targetType: string,
  targetId: string,
  senderEmployerId: string | null,
  isAdmin: boolean,
) {
  const supabase = getSupabaseAdmin();

  if (targetType === "employee") {
    const scopedEmployerId = senderEmployerId;
    if (!isAdmin && !senderEmployerId) {
      throw new Error("Your employer account is not linked yet.");
    }

    let query = supabase
      .from("employees")
      .select("id, employer_id, portal_user_id, full_name")
      .eq("id", targetId)
      .not("portal_user_id", "is", null);

    if (!isAdmin) {
      query = query.eq("employer_id", scopedEmployerId as string);
    }

    const { data: employee, error } = await query.single();

    if (error || !employee?.portal_user_id) {
      throw new Error("Employee recipient is not available.");
    }

    return {
      employerId: employee.employer_id,
      recipientIds: [employee.portal_user_id],
      auditTarget: "employee",
    };
  }

  if (targetType === "employer" && isAdmin) {
    const { data: recipients, error } = await supabase
      .from("portal_users")
      .select("id")
      .eq("role", "employer_admin")
      .eq("status", "active")
      .eq("employer_id", targetId);

    if (error) throw new Error(error.message);

    return {
      employerId: targetId,
      recipientIds: (recipients ?? []).map((recipient) => recipient.id),
      auditTarget: "employer",
    };
  }

  throw new Error("You cannot send notices to that recipient.");
}

export async function sendNoticeAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
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
      priority: noticePriority(formData),
      requires_acknowledgement: booleanValue(formData, "requires_acknowledgement"),
      action_url: optionalString(formData, "action_url"),
      action_label: optionalString(formData, "action_label"),
      category: optionalString(formData, "category"),
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
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notices");
}

export async function sendTargetedNoticeAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);

  const isAdmin = isPlatformAdmin(session.user.role);
  if (!isAdmin && session.user.role !== "employer_admin") {
    throw new Error("You cannot send notices.");
  }

  const targetType = requireString(formData, "target_type");
  const targetId = requireString(formData, "target_id");
  const target = await resolveTargetedNotice(
    targetType,
    targetId,
    session.user.employer_id,
    isAdmin,
  );

  if (target.recipientIds.length === 0) {
    throw new Error("No active recipient is linked to this node.");
  }

  const supabase = getSupabaseAdmin();
  const { data: notice, error } = await supabase
    .from("notices")
    .insert({
      sender_id: session.user.id,
      employer_id: target.employerId,
      title: requireString(formData, "title"),
      body: requireString(formData, "body"),
      priority: noticePriority(formData),
      requires_acknowledgement: booleanValue(formData, "requires_acknowledgement"),
      action_url: optionalString(formData, "action_url"),
      action_label: optionalString(formData, "action_label"),
      category: optionalString(formData, "category"),
    })
    .select("id")
    .single();

  if (error || !notice) {
    throw new Error(error?.message ?? "Could not send notice.");
  }

  await supabase.from("notice_recipients").insert(
    target.recipientIds.map((recipient_user_id) => ({
      notice_id: notice.id,
      recipient_user_id,
    })),
  );

  await writeAudit(session.user, "send_targeted_notice", "notice", notice.id, {
    target_type: target.auditTarget,
    target_id: targetId,
    recipient_count: target.recipientIds.length,
  });

  revalidatePath("/dashboard/worktree");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/employee");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notices");
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
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notices");
}
