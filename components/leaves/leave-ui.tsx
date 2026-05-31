"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { submitLeaveRequestAction } from "@/lib/portal/actions/leave";
import { calculateLeaveDays, eachDateInRange } from "@/lib/portal/leave-utils";
import type { LeaveSummary } from "@/lib/portal/leaves";

type LeaveDay = {
  date: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  is_holiday: boolean;
  is_lop: boolean;
  leave_requests?: {
    id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    mobile_number?: string | null;
    rejection_reason?: string | null;
    total_leave_days?: number | null;
    excluded_holiday_days?: number;
    lop_days?: number;
  } | null;
};

type Holiday = {
  date: string;
  name: string;
};

type Absence = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  is_lop: boolean;
  status?: string;
  total_absent_days: number;
};

type CalendarPolicy = {
  weeklyOffWeekdays?: number[];
  weeklyOffRules?: Array<{
    weekday: number;
    isWeeklyOff: boolean;
    effectiveFrom: string;
  }>;
  workingDayOverrides?: string[];
  holidayOverrides?: string[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthMatrix(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      iso: toIsoDate(date),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month - 1,
    };
  });
}

function weekdayForIso(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function weeklyOffWeekdaysForDate(date: string, policy: CalendarPolicy | undefined) {
  if (!policy?.weeklyOffRules?.length) return policy?.weeklyOffWeekdays ?? [0, 6];

  const weekdayState = new Map<number, boolean>();
  const rules = [...policy.weeklyOffRules].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  );
  for (const rule of rules) {
    if (rule.effectiveFrom <= date && !weekdayState.has(rule.weekday)) {
      weekdayState.set(rule.weekday, rule.isWeeklyOff);
    }
  }

  if (weekdayState.size === 0) return policy.weeklyOffWeekdays ?? [0, 6];

  return Array.from(weekdayState.entries())
    .filter(([, isWeeklyOff]) => isWeeklyOff)
    .map(([weekday]) => weekday);
}

function statusClasses(day: LeaveDay | undefined, holiday: boolean, selected: boolean) {
  if (selected) return "border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-200";
  if (day?.is_lop) return "border-purple-300 bg-purple-50 text-purple-800";
  if (day?.status === "approved") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (day?.status === "pending") return "border-amber-300 bg-amber-50 text-amber-800";
  if (day?.status === "rejected") return "border-rose-300 bg-rose-50 text-rose-800";
  if (holiday) return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-slate-100 bg-white text-slate-700";
}

function Legend() {
  const items = [
    ["Holiday", "bg-orange-500"],
    ["Pending", "bg-amber-400"],
    ["Approved", "bg-emerald-500"],
    ["Rejected", "bg-rose-500"],
    ["LOP", "bg-purple-600"],
    ["Taken (X)", "text-slate-950"],
  ];

  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-2">
          {label === "Taken (X)" ? (
            <span className="font-bold text-slate-900">X</span>
          ) : (
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          )}
          {label}
        </span>
      ))}
    </div>
  );
}

function LeaveDetailsModal({
  day,
  absence,
  onClose,
}: {
  day?: LeaveDay;
  absence?: Absence;
  onClose: () => void;
}) {
  if (!day && !absence) return null;
  const request = day?.leave_requests;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-950">Leave Details</p>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(request?.start_date ?? absence?.start_date)} -{" "}
              {formatDate(request?.end_date ?? absence?.end_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            X
          </button>
        </div>
        <div className="mt-5 grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className="font-semibold capitalize text-slate-950">
              {day?.status ?? absence?.status ?? "recorded"}
              {day?.is_lop || absence?.is_lop ? " + LOP" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Leave days</span>
            <span className="font-semibold">{request?.total_leave_days ?? absence?.total_absent_days ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Excluded holidays</span>
            <span className="font-semibold">{request?.excluded_holiday_days ?? 0}</span>
          </div>
          {request?.lop_days ? (
            <div className="flex justify-between">
              <span className="text-slate-500">LOP days</span>
              <span className="font-semibold text-purple-700">{request.lop_days}</span>
            </div>
          ) : null}
          <div>
            <p className="text-slate-500">Reason</p>
            <p className="mt-1 font-medium text-slate-950">{request?.reason ?? absence?.reason ?? "Not provided"}</p>
          </div>
          {request?.mobile_number ? (
            <div>
              <p className="text-slate-500">Mobile number</p>
              <p className="mt-1 font-medium text-slate-950">{request.mobile_number}</p>
            </div>
          ) : null}
          {request?.rejection_reason ? (
            <div className="rounded-xl bg-rose-50 p-3 text-rose-700">
              Rejection reason: {request.rejection_reason}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LeaveSummaryCard({ summary }: { summary: LeaveSummary }) {
  const items = [
    ["Total Allowance", summary.totalAllowance, "bg-blue-50 text-blue-700"],
    ["Taken Leaves", summary.taken, "bg-slate-50 text-slate-700"],
    ["Pending Leaves", summary.pending, "bg-amber-50 text-amber-700"],
    ["Approved Leaves", summary.approved, "bg-emerald-50 text-emerald-700"],
    ["Rejected Leaves", summary.rejected, "bg-rose-50 text-rose-700"],
    ["Remaining Leaves", summary.remaining, "bg-sky-50 text-sky-700"],
    ["LOP Days", summary.lop, "bg-purple-50 text-purple-700"],
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Leave Summary</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([label, value, tone]) => (
          <div key={label} className={`rounded-xl p-4 ${tone}`}>
            <p className="text-xs font-semibold">{label}</p>
            <p className="mt-2 text-xl font-bold">{value} Days</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LeaveCalendar({
  mode,
  year,
  month,
  leaveDays,
  holidays,
  calendarPolicy,
  absences = [],
}: {
  mode: "apply" | "history";
  year: number;
  month: number;
  leaveDays: LeaveDay[];
  holidays: Holiday[];
  calendarPolicy?: CalendarPolicy;
  absences?: Absence[];
}) {
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [activeDay, setActiveDay] = useState<LeaveDay | undefined>();
  const [activeAbsence, setActiveAbsence] = useState<Absence | undefined>();
  const holidaySet = useMemo(() => new Set(holidays.map((holiday) => holiday.date)), [holidays]);
  const workingDayOverrideSet = useMemo(
    () => new Set(calendarPolicy?.workingDayOverrides ?? []),
    [calendarPolicy?.workingDayOverrides],
  );
  const holidayOverrideSet = useMemo(
    () => new Set(calendarPolicy?.holidayOverrides ?? []),
    [calendarPolicy?.holidayOverrides],
  );
  const leaveDayByDate = useMemo(
    () => new Map(leaveDays.map((day) => [day.date, day])),
    [leaveDays],
  );
  const absenceByDate = useMemo(() => {
    const map = new Map<string, Absence>();
    for (const absence of absences) {
      for (const date of eachDateInRange(absence.start_date, absence.end_date)) {
        map.set(date, absence);
      }
    }
    return map;
  }, [absences]);
  const selectedDates = useMemo(() => {
    if (!rangeStart || !rangeEnd) return new Set<string>();
    return new Set(eachDateInRange(rangeStart, rangeEnd));
  }, [rangeEnd, rangeStart]);
  const calculation = useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;
    return calculateLeaveDays(rangeStart, rangeEnd, holidays.map((holiday) => holiday.date), calendarPolicy);
  }, [calendarPolicy, holidays, rangeEnd, rangeStart]);

  function moveMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth() + 1);
  }

  function selectDate(date: string) {
    const leaveDay = leaveDayByDate.get(date);
    const absence = absenceByDate.get(date);
    if (leaveDay || absence) {
      setActiveDay(leaveDay);
      setActiveAbsence(absence);
      return;
    }

    if (mode !== "apply") return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd("");
      return;
    }

    if (date < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
    } else {
      setRangeEnd(date);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <button type="button" className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50" onClick={() => moveMonth(-1)}>
            ‹
          </button>
          <h2 className="text-base font-semibold text-slate-950">
            {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
              new Date(Date.UTC(viewYear, viewMonth - 1, 1)),
            )}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth() + 1);
              }}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
            >
              Today
            </button>
            <button type="button" className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50" onClick={() => moveMonth(1)}>
              ›
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className={day === "Sun" || day === "Sat" ? "py-2 text-orange-600" : "py-2"}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-100">
          {monthMatrix(viewYear, viewMonth).map((cell) => {
            const day = leaveDayByDate.get(cell.iso);
            const holiday =
              !workingDayOverrideSet.has(cell.iso) &&
              (weeklyOffWeekdaysForDate(cell.iso, calendarPolicy).includes(weekdayForIso(cell.iso)) ||
                holidaySet.has(cell.iso) ||
                holidayOverrideSet.has(cell.iso));
            const absence = absenceByDate.get(cell.iso);
            const selected = selectedDates.has(cell.iso);
            const taken = day?.status === "approved" && cell.iso < toIsoDate(new Date());
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => selectDate(cell.iso)}
                className={`relative min-h-16 border p-2 text-left text-xs transition hover:z-10 hover:ring-2 hover:ring-blue-100 ${
                  cell.inMonth ? "" : "opacity-40"
                } ${statusClasses(day, holiday, selected)} ${absence?.is_lop ? "after:absolute after:right-1 after:top-1 after:h-2 after:w-2 after:rounded-full after:bg-purple-600" : ""}`}
              >
                <span className="font-semibold">{cell.day}</span>
                {taken ? <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900">X</span> : null}
                {day?.is_lop ? <span className="absolute bottom-1 right-1 rounded bg-purple-600 px-1 text-[9px] font-bold text-white">LOP</span> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Legend />
        </div>
      </section>

      {mode === "apply" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Selected Leave Details</h2>
          <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Selected Dates</p>
              <p className="font-semibold text-slate-950">
                {rangeStart && rangeEnd ? `${formatDate(rangeStart)} - ${formatDate(rangeEnd)}` : "Select a date range"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Leave Days (Payable)</p>
              <p className="font-semibold text-emerald-700">{calculation?.totalLeaveDays ?? 0} Days</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Excluded Holidays</p>
              <p className="font-semibold">{calculation?.excludedHolidayDays ?? 0} Day</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Selected Days</p>
              <p className="font-semibold">{calculation?.totalSelectedDays ?? 0} Days</p>
            </div>
          </div>
          <form action={submitLeaveRequestAction} className="mt-4 grid gap-4">
            <input type="hidden" name="start_date" value={rangeStart} />
            <input type="hidden" name="end_date" value={rangeEnd || rangeStart} />
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Leave type
              <select name="leave_type" className="h-10 rounded-xl border border-slate-300 px-3">
                <option value="casual">Casual</option>
                <option value="sick">Sick</option>
                <option value="earned">Earned</option>
                <option value="comp_off">Comp off</option>
                <option value="lop">LOP</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Reason
                <input name="reason" required className="h-10 rounded-xl border border-slate-300 px-3" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Mobile Number
                <input name="mobile_number" required className="h-10 rounded-xl border border-slate-300 px-3" />
              </label>
            </div>
            <button
              type="submit"
              disabled={!rangeStart || !rangeEnd || !calculation || calculation.totalLeaveDays <= 0}
              className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Submit Leave Request
            </button>
          </form>
        </section>
      ) : null}

      <LeaveDetailsModal day={activeDay} absence={activeAbsence} onClose={() => { setActiveDay(undefined); setActiveAbsence(undefined); }} />
    </div>
  );
}

export function RecentLeaveRequests({ requests }: { requests: Array<Record<string, unknown>> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Recent Leave Requests</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="border-b border-slate-100 px-3 py-2">Dates</th>
              <th className="border-b border-slate-100 px-3 py-2">Reason</th>
              <th className="border-b border-slate-100 px-3 py-2">Days</th>
              <th className="border-b border-slate-100 px-3 py-2">Status</th>
              <th className="border-b border-slate-100 px-3 py-2">Submitted On</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={String(request.id)} className="border-b border-slate-100">
                <td className="px-3 py-3">{formatDate(String(request.start_date))} - {formatDate(String(request.end_date))}</td>
                <td className="px-3 py-3">{String(request.reason ?? "Not provided")}</td>
                <td className="px-3 py-3">{Number(request.total_leave_days ?? request.days ?? 0)}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                    {String(request.status)}
                    {Number(request.lop_days ?? 0) > 0 ? " + LOP" : ""}
                  </span>
                </td>
                <td className="px-3 py-3">{formatDate(String(request.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 ? <p className="py-5 text-sm text-slate-500">No leave requests yet.</p> : null}
      </div>
    </section>
  );
}

export function LeaveHistoryView({
  employee,
  summary,
  leaveDays,
  holidays,
  calendarPolicy,
  absences,
  year,
  month,
}: {
  employee: { id: string; full_name: string; job_title: string | null; department: string | null; employers?: { name: string } | null };
  summary: LeaveSummary;
  leaveDays: LeaveDay[];
  holidays: Holiday[];
  calendarPolicy?: CalendarPolicy;
  absences: Absence[];
  year: number;
  month: number;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">{employee.full_name}</p>
        <p className="mt-1 text-sm text-slate-500">{employee.job_title ?? "Employee"}</p>
        <p className="text-xs text-slate-500">{employee.department ?? "No team"}</p>
        <p className="mt-3 text-xs text-slate-500">{employee.employers?.name ?? "Employer"}</p>
        <Link
          href="/dashboard/worktree"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-blue-200 px-4 text-sm font-semibold text-blue-700"
        >
          Back to Worktree
        </Link>
      </section>
      <LeaveCalendar
        mode="history"
        year={year}
        month={month}
        leaveDays={leaveDays}
        holidays={holidays}
        calendarPolicy={calendarPolicy}
        absences={absences}
      />
      <LeaveSummaryCard summary={summary} />
    </div>
  );
}
