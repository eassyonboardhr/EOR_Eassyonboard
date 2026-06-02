/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createMessageThreadAction, replyMessageThreadAction } from "@/lib/portal/actions/messages";
import { getMessagesData } from "@/lib/portal/messages";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, SubmitButton, TextArea, TextInput, formatDate } from "@/components/portal/ui";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const params = await searchParams;
  const threadId = Array.isArray(params.thread) ? params.thread[0] : params.thread;
  const recipientParam = Array.isArray(params.recipient) ? params.recipient[0] : params.recipient;
  const data = await getMessagesData(session, threadId);

  return (
    <PortalShell session={session} title="Messages" subtitle="Two-way conversations between admins, employers, and employees." wide>
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-5">
          <Panel title="Compose">
            <form action={createMessageThreadAction} className="grid gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Recipient
                <select name="recipient" required defaultValue={recipientParam ?? ""} className="h-10 rounded-xl border border-slate-300 bg-white px-3">
                  <option value="">Choose recipient</option>
                  {data.recipients.map((recipient) => (
                    <option key={recipient.value} value={recipient.value}>
                      {recipient.label} - {recipient.description}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput name="subject" label="Subject" required />
              <TextArea name="body" label="Message" required />
              <SubmitButton>Send Message</SubmitButton>
            </form>
          </Panel>

          <Panel title="Inbox">
            <div className="grid gap-2">
              {data.threads.map((thread: any) => (
                <Link
                  key={thread.id}
                  href={`/dashboard/messages?thread=${thread.id}`}
                  className={`rounded-xl border p-3 text-sm transition hover:border-blue-200 hover:bg-blue-50 ${
                    thread.unread ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold text-slate-950">{thread.subject}</p>
                    {thread.unread ? <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-semibold text-white">New</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(thread.latestEntryAt)}</p>
                </Link>
              ))}
              {data.threads.length === 0 ? <EmptyState>No message threads yet.</EmptyState> : null}
            </div>
          </Panel>
        </div>

        <Panel title={data.selectedThread?.subject ?? "Thread"}>
          {data.selectedThread ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {data.participants.map((participant: any) => (
                  <span key={participant.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {participant.portal_users?.full_name ?? participant.portal_users?.email ?? participant.role_snapshot}
                  </span>
                ))}
              </div>
              <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-2">
                {data.entries.map((entry: any) => {
                  const mine = entry.sender_id === session.user.id;
                  return (
                    <div key={entry.id} className={`rounded-2xl border p-4 ${mine ? "ml-auto max-w-[82%] border-blue-100 bg-blue-50" : "max-w-[82%] border-slate-200 bg-white"}`}>
                      <p className="text-xs font-semibold text-slate-500">{entry.portal_users?.full_name ?? entry.portal_users?.email ?? "Sender"} · {formatDate(entry.created_at)}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.body}</p>
                    </div>
                  );
                })}
              </div>
              <form action={replyMessageThreadAction} className="grid gap-3">
                <input type="hidden" name="thread_id" value={data.selectedThread.id} />
                <TextArea name="body" label="Reply" required />
                <SubmitButton>Send Reply</SubmitButton>
              </form>
            </div>
          ) : (
            <EmptyState>Select a thread or start a new message.</EmptyState>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
