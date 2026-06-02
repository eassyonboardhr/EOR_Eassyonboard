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
  const summary = summarizePayload(payload);
  return (
    <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs text-purple-900">
      <p className="font-bold">{summary}</p>
      <details className="mt-2">
        <summary className="cursor-pointer font-semibold text-blue-700">Inspect payload</summary>
        <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-white p-2 text-slate-600">{JSON.stringify(payload, null, 2)}</pre>
      </details>
    </div>
  );
}

function summarizePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return "No proposed values";
  const row = payload as Record<string, unknown>;
  if (Array.isArray(row.weekdays)) {
    const labels = row.weekdays
      .map((day) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(day)] ?? String(day))
      .join(", ");
    return `Set weekly offs to ${labels || "none"}`;
  }
  if (row.previous_date && row.date) return `Edit holiday from ${formatDate(String(row.previous_date))} to ${formatDate(String(row.date))}`;
  if (row.date && row.name) return `${String(row.name)} on ${formatDate(String(row.date))}`;
  if (row.date && row.override_type) return `${String(row.override_type).replaceAll("_", " ")} on ${formatDate(String(row.date))}`;
  return "Calendar policy update";
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
                  <td className="px-4 py-3">
                    <PayloadPreview payload={request.proposed_payload} />
                    {request.status === "pending" ? (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Admin preview: approving this request writes only future-effective company calendar records and sends linked notices to active employees.
                      </div>
                    ) : null}
                  </td>
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
