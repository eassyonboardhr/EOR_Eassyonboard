import Link from "next/link";
import {
  cancelHolidayCalendarChangeRequestAction,
  submitHolidayCalendarChangeRequestAction,
} from "@/lib/portal/actions/holiday-calendar";
import { getEmployerHolidayCalendarData } from "@/lib/portal/holiday-calendar";
import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/ui";

const weekdays = [
  ["0", "Sunday"],
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

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
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
      <p className="font-bold text-slate-800">{summary}</p>
      <details className="mt-2">
        <summary className="cursor-pointer font-semibold text-blue-700">Raw payload</summary>
        <pre className="mt-2 max-h-28 overflow-auto">{JSON.stringify(payload, null, 2)}</pre>
      </details>
    </div>
  );
}

function summarizePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return "No proposed values";
  const row = payload as Record<string, unknown>;
  if (Array.isArray(row.weekdays)) {
    return `Weekly offs: ${row.weekdays.map((day) => weekdays[Number(day)]?.[1] ?? day).join(", ") || "none"}`;
  }
  if (row.date && row.name) return `${String(row.name)} on ${formatDate(String(row.date))}`;
  if (row.date && row.override_type) return `${String(row.override_type).replaceAll("_", " ")} on ${formatDate(String(row.date))}`;
  if (row.previous_date && row.date) return `Move ${formatDate(String(row.previous_date))} to ${formatDate(String(row.date))}`;
  return "Calendar policy update";
}

export default async function EmployerHolidayCalendarPage() {
  const session = await requirePortalRole(["employer_admin"]);
  const data = await getEmployerHolidayCalendarData(session);
  const activeWeeklyOffs = new Set(data.activeWeeklyOffWeekdays);
  const today = todayIso();

  return (
    <PortalShell
      session={session}
      title="Holiday Calendar"
      subtitle="Propose official holidays, weekly offs, and date overrides for admin approval."
      wide
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>Calendar policy changes are future-only and become active after admin approval.</span>
          <Link href="/dashboard/employer/leaves" className="font-semibold text-blue-700">
            Back to leave requests
          </Link>
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Weekly Off Rules</h2>
              <p className="mt-1 text-sm text-slate-500">
                Current weekly offs: {data.activeWeeklyOffWeekdays.map((day) => weekdays[day][1]).join(", ") || "None"}
              </p>
              <form action={submitHolidayCalendarChangeRequestAction} className="mt-5 grid gap-4">
                <input type="hidden" name="request_type" value="weekly_off_change" />
                <input type="hidden" name="title" value="Weekly off policy update" />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Effective from
                  <input name="effective_date" type="date" min={today} defaultValue={today} required className="h-10 rounded-xl border border-slate-300 px-3" />
                </label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {weekdays.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                      <input name="weekday" type="checkbox" value={value} defaultChecked={activeWeeklyOffs.has(Number(value))} />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">
                    Submit Weekly Offs
                  </button>
                  <span className="inline-flex items-center rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                    Quick default: Saturday + Sunday selected
                  </span>
                </div>
              </form>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <form action={submitHolidayCalendarChangeRequestAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Add Official Holiday</h2>
                  <p className="mt-1 text-sm text-slate-500">Creates a pending request for an employer-wide holiday.</p>
                </div>
                <input type="hidden" name="request_type" value="holiday_add" />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Holiday date
                  <input name="date" type="date" min={today} required className="h-10 rounded-xl border border-slate-300 px-3" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Holiday name
                  <input name="name" required placeholder="Example: Diwali" className="h-10 rounded-xl border border-slate-300 px-3" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Effective from
                  <input name="effective_date" type="date" min={today} defaultValue={today} required className="h-10 rounded-xl border border-slate-300 px-3" />
                </label>
                <button className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Submit Holiday</button>
              </form>

              <form action={submitHolidayCalendarChangeRequestAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Date Override</h2>
                  <p className="mt-1 text-sm text-slate-500">Make a weekend working, or mark a specific date as holiday.</p>
                </div>
                <input type="hidden" name="request_type" value="date_override" />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Date
                  <input name="date" type="date" min={today} required className="h-10 rounded-xl border border-slate-300 px-3" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Override type
                  <select name="override_type" className="h-10 rounded-xl border border-slate-300 px-3">
                    <option value="working_day">Working day</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </label>
                <input name="name" placeholder="Name" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
                <input name="reason" placeholder="Reason" className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
                <input name="effective_date" type="date" min={today} defaultValue={today} required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
                <button className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Submit Override</button>
              </form>
            </div>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Approved Holidays</h2>
              <div className="mt-4 grid max-h-80 gap-3 overflow-auto">
                {data.holidays.map((holiday) => (
                  <div key={`${holiday.date}-${holiday.name}`} className="rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{holiday.name}</p>
                        <p className="text-slate-500">{formatDate(holiday.date)}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        Approved
                      </span>
                    </div>
                    <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-blue-700">Edit / Delete</summary>
                      <div className="mt-3 grid gap-3">
                        <form action={submitHolidayCalendarChangeRequestAction} className="grid gap-2">
                          <input type="hidden" name="request_type" value="holiday_edit" />
                          <input type="hidden" name="previous_date" value={holiday.date} />
                          <input type="hidden" name="previous_name" value={holiday.name} />
                          <input name="date" type="date" min={today} defaultValue={holiday.date} required className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
                          <input name="name" defaultValue={holiday.name} required className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
                          <input name="effective_date" type="date" min={today} defaultValue={today} required className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
                          <button className="h-9 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white">Submit Edit</button>
                        </form>
                        <form action={submitHolidayCalendarChangeRequestAction}>
                          <input type="hidden" name="request_type" value="holiday_delete" />
                          <input type="hidden" name="date" value={holiday.date} />
                          <input type="hidden" name="name" value={holiday.name} />
                          <input type="hidden" name="effective_date" value={today} />
                          <button className="h-9 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700">Request Delete</button>
                        </form>
                      </div>
                    </details>
                  </div>
                ))}
                {data.holidays.length === 0 ? <p className="text-sm text-slate-500">No approved holidays yet.</p> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Approved Overrides</h2>
              <div className="mt-4 grid gap-3">
                {data.overrides.map((override) => (
                  <div key={override.id} className="rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
                    <p className="font-semibold capitalize text-slate-950">{override.override_type.replace("_", " ")}</p>
                    <p className="text-slate-500">{formatDate(override.date)} {override.name ? `- ${override.name}` : ""}</p>
                    <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-blue-700">Edit / Delete</summary>
                      <div className="mt-3 grid gap-3">
                        <form action={submitHolidayCalendarChangeRequestAction} className="grid gap-2">
                          <input type="hidden" name="request_type" value="date_override" />
                          <input name="date" type="date" min={today} defaultValue={override.date} required className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
                          <select name="override_type" defaultValue={override.override_type} className="h-9 rounded-lg border border-slate-300 px-2 text-xs">
                            <option value="working_day">Working day</option>
                            <option value="holiday">Holiday</option>
                          </select>
                          <input name="name" defaultValue={override.name ?? ""} className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
                          <input name="reason" defaultValue={override.reason ?? ""} className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
                          <input name="effective_date" type="date" min={today} defaultValue={today} required className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
                          <button className="h-9 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white">Submit Edit</button>
                        </form>
                        <form action={submitHolidayCalendarChangeRequestAction}>
                          <input type="hidden" name="request_type" value="date_override_delete" />
                          <input type="hidden" name="date" value={override.date} />
                          <input type="hidden" name="override_type" value={override.override_type} />
                          <input type="hidden" name="effective_date" value={today} />
                          <button className="h-9 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700">Request Delete</button>
                        </form>
                      </div>
                    </details>
                  </div>
                ))}
                {data.overrides.length === 0 ? <p className="text-sm text-slate-500">No approved date overrides yet.</p> : null}
              </div>
            </section>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Calendar Change Requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs font-semibold text-slate-500">
                <tr>
                  <th className="border-b border-slate-100 px-3 py-2">Title</th>
                  <th className="border-b border-slate-100 px-3 py-2">Type</th>
                  <th className="border-b border-slate-100 px-3 py-2">Effective</th>
                  <th className="border-b border-slate-100 px-3 py-2">Status</th>
                  <th className="border-b border-slate-100 px-3 py-2">Payload</th>
                  <th className="border-b border-slate-100 px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3 font-semibold text-slate-950">{request.title}</td>
                    <td className="px-3 py-3 capitalize">{request.request_type.replaceAll("_", " ")}</td>
                    <td className="px-3 py-3">{formatDate(request.effective_date)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusTone(request.status)}`}>
                        {request.status}
                      </span>
                      {request.admin_notes ? <p className="mt-2 text-xs text-slate-500">{request.admin_notes}</p> : null}
                    </td>
                    <td className="px-3 py-3"><PayloadPreview payload={request.proposed_payload} /></td>
                    <td className="px-3 py-3">
                      {request.status === "pending" ? (
                        <form action={cancelHolidayCalendarChangeRequestAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-700">
                            Cancel
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.requests.length === 0 ? <p className="py-5 text-sm text-slate-500">No calendar requests yet.</p> : null}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
