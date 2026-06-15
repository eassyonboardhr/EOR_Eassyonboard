"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireString } from "@/lib/portal/form";
import { ensureActivePortalSession, getPortalSession } from "@/lib/portal/session";
import { resolveMessageRecipient } from "@/lib/portal/messages";
import { writeAudit } from "@/lib/portal/actions/audit";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export async function createMessageThreadAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  const subject = requireString(formData, "subject");
  const body = requireString(formData, "body");
  const target = await resolveMessageRecipient(session, requireString(formData, "recipient"));
  const recipientIds = target.recipientIds.filter((id) => id !== session.user.id);
  if (recipientIds.length === 0) throw new Error("No active recipient is available.");

  const supabase = getSupabaseAdmin();
  const { data: thread, error } = await from(supabase, "message_threads")
    .insert({
      subject,
      created_by: session.user.id,
      employer_id: target.employerId,
      related_employee_id: target.employeeId,
    })
    .select("id")
    .single();
  if (error || !thread) throw new Error(error?.message ?? "Could not create message.");

  const participantIds = [...new Set([session.user.id, ...recipientIds])];
  const { data: users } = await supabase.from("portal_users").select("id, role").in("id", participantIds);
  await from(supabase, "message_participants").insert(
    participantIds.map((portal_user_id) => ({
      thread_id: thread.id,
      portal_user_id,
      role_snapshot: users?.find((user) => user.id === portal_user_id)?.role ?? "unknown",
      last_read_at: portal_user_id === session.user.id ? new Date().toISOString() : null,
    })),
  );
  await from(supabase, "message_entries").insert({
    thread_id: thread.id,
    sender_id: session.user.id,
    body,
  });

  await writeAudit(session.user, "create_message_thread", "message_thread", thread.id, { recipient_count: recipientIds.length });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
}

export async function replyMessageThreadAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  const threadId = requireString(formData, "thread_id");
  const body = requireString(formData, "body");
  const supabase = getSupabaseAdmin();

  const { data: participant } = await from(supabase, "message_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("portal_user_id", session.user.id)
    .maybeSingle();
  if (!participant) throw new Error("You cannot reply to this thread.");

  await from(supabase, "message_entries").insert({
    thread_id: threadId,
    sender_id: session.user.id,
    body,
  });
  await from(supabase, "message_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
  await from(supabase, "message_participants").update({ last_read_at: new Date().toISOString() }).eq("thread_id", threadId).eq("portal_user_id", session.user.id);
  await writeAudit(session.user, "reply_message_thread", "message_thread", threadId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
}

export async function updateMessageThreadStateAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  const threadId = requireString(formData, "thread_id");
  const action = requireString(formData, "state_action");
  if (!["archive", "restore", "read", "unread"].includes(action)) {
    throw new Error("Invalid message action.");
  }

  const supabase = getSupabaseAdmin();
  const payload =
    action === "archive"
      ? { archived_at: new Date().toISOString() }
      : action === "restore"
        ? { archived_at: null }
        : action === "read"
          ? { last_read_at: new Date().toISOString() }
          : { last_read_at: null };

  const { data: participant } = await from(supabase, "message_participants")
    .update(payload)
    .eq("thread_id", threadId)
    .eq("portal_user_id", session.user.id)
    .select("id")
    .maybeSingle();
  if (!participant) throw new Error("You cannot update this thread.");

  await writeAudit(session.user, `message_thread_${action}`, "message_thread", threadId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
}
