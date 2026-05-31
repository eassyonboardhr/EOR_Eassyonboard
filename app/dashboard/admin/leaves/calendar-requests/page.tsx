import Link from "next/link";
import { reviewHolidayCalendarChangeRequestAction } from "@/lib/portal/actions/holiday-calendar";
import { getAdminHolidayCalendarRequestsData } from "@/lib/portal/holiday-calendar";
import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/ui";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-rose-50 text-rose-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function PayloadPreview({ payload }: { payload: unknown }) {
  return (
    <pre className="max-h-36 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

export default async function AdminHolidayCalendarRequestsPage() {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const data = await getAdminHolidayCalendarRequestsData();
  const pendingCount = data.requests.filter((request) => request.status === "pending").length;

  return (
    <PortalShell
      session={session}
      title="Calendar Requests"
      subtitle="Review employer holiday, weekly-off, and date override proposals."
      wide
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
          <span>{pendingCount} pending calendar request{pendingCount === 1 ? "" : "s"} need review. Approved changes apply only from the effective date forward.</span>
          <Link href="/dashboard/admin/leaves" className="font-semibold text-blue-700">
            Back to leave requests
          </Link>
        </div>

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">Employer</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proposed Changes</th>
                <th className="px-4 py-3">Review</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.map((request) => (
                <tr key={request.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-semibold text-slate-950">{request.employers?.name ?? "Employer"}</td>
                  <td className="px-4 py-3">{request.title}</td>
                  <td className="px-4 py-3 capitalize">{request.request_type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{formatDate(request.effective_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusTone(request.status)}`}>
                      {request.status}
                    </span>
                    {request.admin_notes ? <p className="mt-2 text-xs text-slate-500">{request.admin_notes}</p> : null}
                  </td>
                  <td className="px-4 py-3"><PayloadPreview payload={request.proposed_payload} /></td>
                  <td className="px-4 py-3">
                    {request.status === "pending" ? (
                      <div className="grid gap-2">
                        <form action={reviewHolidayCalendarChangeRequestAction} className="grid gap-2">
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <textarea name="admin_notes" placeholder="Admin note" className="min-h-16 rounded-xl border border-slate-300 p-2 text-xs" />
                          <button className="h-9 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white">
                            Approve
                          </button>
                        </form>
                        <form action={reviewHolidayCalendarChangeRequestAction} className="flex gap-2">
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <input name="admin_notes" placeholder="Reject reason" className="h-9 w-32 rounded-xl border border-slate-300 px-2 text-xs" />
                          <button className="h-9 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700">
                            Reject
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.requests.length === 0 ? <p className="p-5 text-sm text-slate-500">No calendar requests found.</p> : null}
        </section>
      </div>
    </PortalShell>
  );
}
