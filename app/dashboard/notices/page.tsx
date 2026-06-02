import Link from "next/link";
import { markNoticeReadAction, sendNoticeAction } from "@/lib/portal/actions/notices";
import { getNoticesCenterData } from "@/lib/portal/notices";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, PortalShell, StatusBadge, SubmitButton, formatDate } from "@/components/portal/ui";

type Row = Record<string, unknown> & {
  id: string;
  read_at?: string | null;
  acknowledged_at?: string | null;
  notices?: {
    title?: string | null;
    body?: string | null;
    priority?: string | null;
    requires_acknowledgement?: boolean | null;
    action_url?: string | null;
    action_label?: string | null;
    category?: string | null;
    created_at?: string | null;
  } | null;
};

type NoticeRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  priority?: string | null;
  category?: string | null;
  created_at?: string | null;
};

const tabs = [
  ["all", "All"],
  ["unread", "Unread"],
  ["acknowledgement", "Requires Acknowledgement"],
];

const categories = [
  ["all", "All categories"],
  ["onboarding", "Onboarding"],
  ["documents", "Documents"],
  ["holiday_calendar", "Leave calendar"],
  ["resignation", "Resignation"],
  ["offboarding", "Offboarding"],
  ["general", "General"],
];

function canCompose(role: string) {
  return role === "super_admin" || role === "admin" || role === "employer_admin";
}

function ComposeMessageForm({ role }: { role: string }) {
  const isEmployer = role === "employer_admin";
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Send Message</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {isEmployer
              ? "Send an in-app message to all active employees under your company."
              : "Send an in-app message to active employers or employees."}
          </p>
        </div>
        <Link href="/dashboard/worktree" className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700">
          Send to one person from Worktree
        </Link>
      </div>
      <form action={sendNoticeAction} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Audience
          <select name="audience" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
            {isEmployer ? (
              <option value="my_employees">My employees</option>
            ) : (
              <>
                <option value="all_employees">All employees</option>
                <option value="all_employers">All employers</option>
              </>
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Priority
          <select name="priority" defaultValue="normal" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Subject
          <input name="title" required className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Message
          <textarea name="body" required rows={4} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        <input type="hidden" name="category" value="general" />
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Action URL optional
          <input name="action_url" placeholder="/dashboard/onboarding" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Action label optional
          <input name="action_label" placeholder="Open page" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
          <input type="checkbox" name="requires_acknowledgement" />
          Require acknowledgement
        </label>
        <div className="md:col-span-2">
          <SubmitButton>Send Message</SubmitButton>
        </div>
      </form>
    </section>
  );
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = searchParams ? await searchParams : {};
  const data = await getNoticesCenterData(session, params);
  const recipients = data.recipients as Row[];
  const sentNotices = data.sentNotices as NoticeRow[];
  const showCompose = canCompose(session.user.role) && params.compose === "1";

  return (
    <PortalShell
      session={session}
      title={showCompose ? "Messages" : "Notices"}
      subtitle={showCompose ? "Send in-app messages and review sent communication." : "Read messages, acknowledge required notices, and jump directly to related workflow actions."}
      wide
    >
      <div className="grid gap-5">
        {showCompose ? <ComposeMessageForm role={session.user.role} /> : null}

        {canCompose(session.user.role) && !showCompose ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <span>Need to send a message? Use the compose panel, or send a targeted message from a Worktree node.</span>
            <Link href="/dashboard/notices?compose=1" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Compose Message
            </Link>
          </div>
        ) : null}

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map(([value, label]) => (
            <Link
              key={value}
              href={`/dashboard/notices?tab=${value}&category=${data.category}`}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${
                data.tab === value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {categories.map(([value, label]) => (
            <Link
              key={value}
              href={`/dashboard/notices?tab=${data.tab}&category=${value}`}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
                data.category === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <section className="grid gap-3">
          {recipients.map((recipient) => {
            const notice = recipient.notices;
            return (
              <form
                key={recipient.id}
                action={markNoticeReadAction}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  recipient.acknowledged_at
                    ? "border-emerald-100"
                    : recipient.read_at
                      ? "border-slate-200"
                      : notice?.priority === "urgent"
                        ? "border-rose-200 bg-rose-50/40"
                        : "border-blue-200 bg-blue-50/40"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-950">{notice?.title ?? "Notice"}</h2>
                      <StatusBadge value={notice?.category ?? notice?.priority ?? "notice"} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{notice?.body}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(notice?.created_at)}</p>
                  </div>
                  <StatusBadge value={recipient.acknowledged_at ? "acknowledged" : recipient.read_at ? "read" : "unread"} />
                </div>
                <input type="hidden" name="recipient_id" value={recipient.id} />
                {notice?.requires_acknowledgement ? <input type="hidden" name="acknowledge" value="true" /> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {notice?.action_url ? (
                    <Link href={notice.action_url} className="h-10 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                      {notice.action_label ?? "Open"}
                    </Link>
                  ) : null}
                  <SubmitButton tone="secondary">
                    {notice?.requires_acknowledgement ? "Acknowledge" : "Mark Read"}
                  </SubmitButton>
                </div>
              </form>
            );
          })}
          {recipients.length === 0 ? <EmptyState>No notices in this view.</EmptyState> : null}
        </section>

        {canCompose(session.user.role) ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Sent Messages</h2>
            <div className="mt-4 grid gap-3">
              {sentNotices.map((notice) => (
                <div key={notice.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">{notice.title ?? "Message"}</p>
                    <StatusBadge value={notice.category ?? notice.priority ?? "message"} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{notice.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(notice.created_at)}</p>
                </div>
              ))}
              {sentNotices.length === 0 ? <EmptyState>No sent messages yet.</EmptyState> : null}
            </div>
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}
