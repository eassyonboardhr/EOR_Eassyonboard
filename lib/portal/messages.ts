import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export type MessageRecipientOption = {
  value: string;
  label: string;
  description: string;
};

export async function getMessageRecipients(session: PortalSession): Promise<MessageRecipientOption[]> {
  const supabase = getSupabaseAdmin();

  if (isPlatformAdmin(session.user.role)) {
    const [{ data: employers }, { data: employees }] = await Promise.all([
      supabase.from("employers").select("id, name, contact_email").eq("status", "active").order("name", { ascending: true }).limit(100),
      supabase.from("employees").select("id, full_name, email, employers(name)").order("full_name", { ascending: true }).limit(100),
    ]);

    return [
      ...(employers ?? []).map((employer: any) => ({
        value: `employer:${employer.id}`,
        label: employer.name ?? employer.contact_email ?? "Employer",
        description: "Employer admin",
      })),
      ...(employees ?? []).map((employee: any) => ({
        value: `employee:${employee.id}`,
        label: employee.full_name ?? employee.email,
        description: employee.employers?.name ?? "Employee",
      })),
    ];
  }

  if (session.user.role === "employer_admin" && session.user.employer_id) {
    const [{ data: admins }, { data: employees }] = await Promise.all([
      supabase.from("portal_users").select("id, full_name, email").in("role", ["super_admin", "admin"]).eq("status", "active").limit(50),
      supabase.from("employees").select("id, full_name, email").eq("employer_id", session.user.employer_id).not("portal_user_id", "is", null).order("full_name", { ascending: true }),
    ]);
    return [
      ...(admins ?? []).map((admin: any) => ({
        value: `user:${admin.id}`,
        label: admin.full_name ?? admin.email,
        description: "Admin",
      })),
      ...(employees ?? []).map((employee: any) => ({
        value: `employee:${employee.id}`,
        label: employee.full_name ?? employee.email,
        description: "Employee",
      })),
    ];
  }

  if (session.user.role === "employee") {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, employer_id")
      .eq("portal_user_id", session.user.id)
      .maybeSingle();
    const [{ data: admins }, { data: employers }] = await Promise.all([
      supabase.from("portal_users").select("id, full_name, email").in("role", ["super_admin", "admin"]).eq("status", "active").limit(50),
      employee?.employer_id
        ? supabase.from("portal_users").select("id, full_name, email").eq("role", "employer_admin").eq("status", "active").eq("employer_id", employee.employer_id)
        : Promise.resolve({ data: [] }),
    ]);
    return [
      ...(admins ?? []).map((admin: any) => ({
        value: `user:${admin.id}`,
        label: admin.full_name ?? admin.email,
        description: "Admin",
      })),
      ...(employers ?? []).map((employer: any) => ({
        value: `user:${employer.id}`,
        label: employer.full_name ?? employer.email,
        description: "Employer admin",
      })),
    ];
  }

  return [];
}

export async function resolveMessageRecipient(session: PortalSession, recipientValue: string) {
  const supabase = getSupabaseAdmin();
  const [kind, id] = recipientValue.split(":");
  if (!kind || !id) throw new Error("Choose a recipient.");

  const sessionEmployerId = await getSessionEmployerId(session);

  if (kind === "user") {
    const { data: user } = await supabase
      .from("portal_users")
      .select("id, role, employer_id")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();
    if (!user) throw new Error("Recipient is not available.");
    const allowed =
      isPlatformAdmin(session.user.role) ||
      (session.user.role === "employer_admin" && isPlatformAdmin(user.role)) ||
      (session.user.role === "employee" && (isPlatformAdmin(user.role) || Boolean(sessionEmployerId && user.employer_id === sessionEmployerId)));
    if (!allowed) throw new Error("You cannot message that recipient.");
    return { recipientIds: [user.id], employerId: user.employer_id ?? sessionEmployerId, employeeId: null };
  }

  if (kind === "employer" && isPlatformAdmin(session.user.role)) {
    const { data: users } = await supabase
      .from("portal_users")
      .select("id")
      .eq("role", "employer_admin")
      .eq("status", "active")
      .eq("employer_id", id);
    return { recipientIds: (users ?? []).map((user) => user.id), employerId: id, employeeId: null };
  }

  if (kind === "employee") {
    let query = supabase
      .from("employees")
      .select("id, employer_id, portal_user_id")
      .eq("id", id)
      .not("portal_user_id", "is", null);
    if (session.user.role === "employer_admin") query = query.eq("employer_id", sessionEmployerId ?? "");
    if (session.user.role === "employee") query = query.eq("portal_user_id", session.user.id);
    const { data: employee } = await query.maybeSingle();
    if (!employee?.portal_user_id) throw new Error("Employee recipient is not available.");
    return { recipientIds: [employee.portal_user_id], employerId: employee.employer_id, employeeId: employee.id };
  }

  throw new Error("You cannot message that recipient.");
}

async function getSessionEmployerId(session: PortalSession) {
  if (session.user.employer_id) return session.user.employer_id;
  if (session.user.role !== "employee") return null;
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("employer_id")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();
  return employee?.employer_id ?? null;
}

export async function getMessagesData(session: PortalSession, threadId?: string, options?: { query?: string; archived?: boolean }) {
  const supabase = getSupabaseAdmin();
  const [recipients, { data: participantRows }] = await Promise.all([
    getMessageRecipients(session),
    from(supabase, "message_participants")
      .select("*, message_threads(*, message_entries(id, created_at, sender_id, body))")
      .eq("portal_user_id", session.user.id)
      .order("created_at", { ascending: false }),
  ]);
  const normalizedQuery = normalizeSearch(options?.query);
  const showArchived = Boolean(options?.archived);

  const threads = (participantRows ?? [])
    .map((participant: any) => {
      const thread = participant.message_threads;
      const entries = thread?.message_entries ?? [];
      const latestEntryAt = entries.map((entry: any) => entry.created_at).sort().at(-1) ?? thread?.updated_at;
      const unread = entries.some((entry: any) => entry.sender_id !== session.user.id && (!participant.last_read_at || entry.created_at > participant.last_read_at));
      return { ...thread, participant, latestEntryAt, unread, archived: Boolean(participant.archived_at) };
    })
    .filter(Boolean)
    .filter((thread: any) => showArchived ? Boolean(thread.participant?.archived_at) : !thread.participant?.archived_at)
    .filter((thread: any) => {
      if (!normalizedQuery) return true;
      const haystack = normalizeSearch([
        thread.subject,
        ...(thread.message_entries ?? []).map((entry: any) => entry.body),
      ].filter(Boolean).join(" "));
      return haystack.includes(normalizedQuery);
    })
    .sort((a: any, b: any) => String(b.latestEntryAt ?? "").localeCompare(String(a.latestEntryAt ?? "")));

  const selectedThreadId = threadId ?? threads[0]?.id ?? null;
  let selectedThread = null;
  let entries: any[] = [];
  let participants: any[] = [];

  if (selectedThreadId) {
    const participant = (participantRows ?? []).find((row: any) => row.thread_id === selectedThreadId);
    if (participant) {
      const [{ data: thread }, { data: entryRows }, { data: participantList }] = await Promise.all([
        from(supabase, "message_threads").select("*").eq("id", selectedThreadId).single(),
        from(supabase, "message_entries").select("*, portal_users(full_name, email, role)").eq("thread_id", selectedThreadId).order("created_at", { ascending: true }),
        from(supabase, "message_participants").select("*, portal_users(full_name, email, role)").eq("thread_id", selectedThreadId),
      ]);
      selectedThread = thread;
      entries = entryRows ?? [];
      participants = participantList ?? [];
      if (!participant.archived_at) {
        await from(supabase, "message_participants").update({ last_read_at: new Date().toISOString() }).eq("thread_id", selectedThreadId).eq("portal_user_id", session.user.id);
      }
    }
  }

  return { recipients, threads, selectedThread, entries, participants, query: options?.query ?? "", archived: showArchived };
}

export async function getUnreadMessageCount(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const { data: participants } = await from(supabase, "message_participants")
    .select("thread_id, last_read_at, archived_at, message_threads(message_entries(created_at, sender_id))")
    .eq("portal_user_id", session.user.id)
    .is("archived_at", null);

  return (participants ?? []).filter((participant: any) =>
    (participant.message_threads?.message_entries ?? []).some(
      (entry: any) => entry.sender_id !== session.user.id && (!participant.last_read_at || entry.created_at > participant.last_read_at),
    ),
  ).length;
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}
