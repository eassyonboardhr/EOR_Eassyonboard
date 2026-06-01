import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

export async function getNoticesCenterData(
  session: PortalSession,
  filters: Record<string, string | string[] | undefined> = {},
) {
  const supabase = getSupabaseAdmin();
  const tab = Array.isArray(filters.tab) ? filters.tab[0] : filters.tab;

  let query = supabase
    .from("notice_recipients")
    .select("*, notices(*)")
    .eq("recipient_user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (tab === "unread") {
    query = query.is("read_at", null);
  }

  const [{ data: recipients, error }, { data: sentNotices }] = await Promise.all([
    query,
    isPlatformAdmin(session.user.role)
      ? supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(50)
      : session.user.role === "employer_admin"
        ? supabase
            .from("notices")
            .select("*")
            .eq("sender_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),
  ]);

  if (error) throw new Error(error.message);

  return {
    tab: tab ?? "all",
    recipients: tab === "acknowledgement"
      ? (recipients ?? []).filter((recipient) => !recipient.acknowledged_at && recipient.notices?.requires_acknowledgement)
      : recipients ?? [],
    sentNotices: sentNotices ?? [],
  };
}
