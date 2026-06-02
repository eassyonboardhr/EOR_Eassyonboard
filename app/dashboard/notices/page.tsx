import Link from "next/link";
import { markNoticeReadAction } from "@/lib/portal/actions/notices";
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

export default async function NoticesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = searchParams ? await searchParams : {};
  const data = await getNoticesCenterData(session, params);
  const recipients = data.recipients as Row[];

  return (
    <PortalShell
      session={session}
      title="Notices"
      subtitle="Read messages, acknowledge required notices, and jump directly to related workflow actions."
      wide
    >
      <div className="grid gap-5">
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
      </div>
    </PortalShell>
  );
}
