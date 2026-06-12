"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString, stringValue } from "@/lib/portal/form";
import {
  ensureActivePortalSession,
  getPortalSession,
  isPlatformAdmin,
  requirePortalRole,
} from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";
import type { Json } from "@/lib/supabase/database.types";

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function revalidateCalendarPaths() {
  revalidatePath("/dashboard/employer/leaves");
  revalidatePath("/dashboard/employer/leaves/calendar");
  revalidatePath("/dashboard/admin/leaves");
  revalidatePath("/dashboard/admin/leaves/calendar-requests");
  revalidatePath("/dashboard/employee/leaves");
  revalidatePath("/dashboard/worktree");
}

function selectedWeekdays(formData: FormData) {
  return formData
    .getAll("weekday")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

function isFutureOrToday(value: string) {
  const today = new Date().toISOString().slice(0, 10);
  return value >= today;
}

function buildPayload(formData: FormData) {
  const requestType = requireString(formData, "request_type");

  if (requestType === "weekly_off_change") {
    const weekdays = selectedWeekdays(formData);
    if (weekdays.length === 0) throw new Error("Select at least one weekly-off day.");
    return {
      requestType,
      payload: {
        weekdays,
        label: weekdays.map((weekday) => weekdayNames[weekday]).join(", "),
      },
      fallbackTitle: `Weekly off change: ${weekdays.map((weekday) => weekdayNames[weekday]).join(", ")}`,
    };
  }

  if (requestType === "holiday_add") {
    const date = requireString(formData, "date");
    const name = requireString(formData, "name");
    return {
      requestType,
      payload: { date, name, type: "holiday" },
      fallbackTitle: `Add holiday: ${name}`,
    };
  }

  if (requestType === "holiday_delete") {
    const date = requireString(formData, "date");
    return {
      requestType,
      payload: { date, name: optionalString(formData, "name") },
      fallbackTitle: `Delete holiday on ${date}`,
    };
  }

  if (requestType === "holiday_edit") {
    const date = requireString(formData, "date");
    const name = requireString(formData, "name");
    return {
      requestType,
      payload: {
        date,
        name,
        previous_date: optionalString(formData, "previous_date"),
        previous_name: optionalString(formData, "previous_name"),
      },
      fallbackTitle: `Edit holiday: ${name}`,
    };
  }

  if (requestType === "date_override") {
    const date = requireString(formData, "date");
    const overrideType = requireString(formData, "override_type");
    if (overrideType !== "working_day" && overrideType !== "holiday") {
      throw new Error("Invalid date override type.");
    }
    return {
      requestType,
      payload: {
        date,
        override_type: overrideType,
        name: optionalString(formData, "name"),
        reason: optionalString(formData, "reason"),
      },
      fallbackTitle: `${overrideType === "working_day" ? "Working day" : "Holiday"} override on ${date}`,
    };
  }

  if (requestType === "date_override_delete") {
    const date = requireString(formData, "date");
    return {
      requestType,
      payload: {
        date,
        override_type: optionalString(formData, "override_type"),
        name: optionalString(formData, "name"),
      },
      fallbackTitle: `Delete date override on ${date}`,
    };
  }

  throw new Error("Invalid calendar request type.");
}

export async function submitHolidayCalendarChangeRequestAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not active.");

  const effectiveDate = requireString(formData, "effective_date");
  if (!isFutureOrToday(effectiveDate)) {
    throw new Error("Calendar policy changes must use today or a future effective date.");
  }

  const { requestType, payload, fallbackTitle } = buildPayload(formData);
  const title = stringValue(formData, "title") || fallbackTitle;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("holiday_calendar_change_requests")
    .insert({
      employer_id: employerId,
      request_type: requestType,
      title,
      proposed_payload: payload as Json,
      effective_date: effectiveDate,
      submitted_by: session.user.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not submit calendar request.");

  await writeAudit(session.user, "submit_holiday_calendar_request", "holiday_calendar_change_request", data.id, {
    request_type: requestType,
  });
  revalidateCalendarPaths();
}

export async function cancelHolidayCalendarChangeRequestAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;
  if (!employerId) throw new Error("Employer account is not active.");

  const requestId = requireString(formData, "request_id");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("holiday_calendar_change_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("employer_id", employerId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not cancel request.");

  await writeAudit(session.user, "cancel_holiday_calendar_request", "holiday_calendar_change_request", requestId);
  revalidateCalendarPaths();
}

async function notifyActiveEmployees(employerId: string, actorId: string, title: string) {
  const supabase = getSupabaseAdmin();
  const { data: notice, error } = await supabase
    .from("notices")
    .insert({
      employer_id: employerId,
      sender_id: actorId,
      title: "Company leave calendar updated",
      body: `${title} has been approved. Future leave calculations will use the updated company calendar.`,
      priority: "normal",
      requires_acknowledgement: false,
      action_url: "/dashboard/employee/leaves",
      action_label: "Open Leave Calendar",
      category: "holiday_calendar",
    })
    .select("id")
    .single();

  if (error || !notice) throw new Error(error?.message ?? "Could not create employee notice.");

  const { data: employees, error: employeeError } = await supabase
    .from("employees")
    .select("portal_user_id")
    .eq("employer_id", employerId)
    .eq("status", "active")
    .not("portal_user_id", "is", null);

  if (employeeError) throw new Error(employeeError.message);

  const recipients = (employees ?? [])
    .map((employee) => employee.portal_user_id)
    .filter(Boolean)
    .map((recipient_user_id) => ({ notice_id: notice.id, recipient_user_id: recipient_user_id as string }));

  if (recipients.length > 0) {
    const { error: recipientError } = await supabase.from("notice_recipients").insert(recipients);
    if (recipientError) throw new Error(recipientError.message);
  }
}

async function applyApprovedCalendarRequest(
  request: {
    id: string;
    employer_id: string;
    request_type: string;
    title: string;
    effective_date: string;
    proposed_payload: Json;
  },
  reviewerId: string,
) {
  const supabase = getSupabaseAdmin();
  const payload = request.proposed_payload as Record<string, unknown>;
  const now = new Date().toISOString();

  if (request.request_type === "weekly_off_change") {
    const weekdays = Array.isArray(payload.weekdays)
      ? payload.weekdays.map(Number).filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
      : [];
    if (weekdays.length === 0) throw new Error("Weekly-off request has no weekdays.");

    await supabase
      .from("weekly_off_rules")
      .update({ active: false })
      .eq("employer_id", request.employer_id)
      .eq("active", true);

    await supabase
      .from("weekly_off_rules")
      .delete()
      .eq("employer_id", request.employer_id)
      .eq("source_request_id", request.id);

    const { error } = await supabase.from("weekly_off_rules").insert(
      weekdays.map((weekday) => ({
        employer_id: request.employer_id,
        weekday,
        is_weekly_off: true,
        effective_from: request.effective_date,
        source_request_id: request.id,
        approved_by: reviewerId,
        approved_at: now,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (request.request_type === "holiday_add" || request.request_type === "holiday_edit") {
    if (request.request_type === "holiday_edit" && payload.previous_date) {
      let deleteQuery = supabase
        .from("holidays")
        .delete()
        .eq("employer_id", request.employer_id)
        .eq("date", String(payload.previous_date));
      if (payload.previous_name) deleteQuery = deleteQuery.eq("name", String(payload.previous_name));
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw new Error(deleteError.message);
    }

    const { error } = await supabase.from("holidays").insert({
      employer_id: request.employer_id,
      date: String(payload.date),
      name: String(payload.name),
      type: "holiday",
      is_weekly_off: false,
    });
    if (error && error.code !== "23505") throw new Error(error.message);
  }

  if (request.request_type === "holiday_delete") {
    let deleteQuery = supabase
      .from("holidays")
      .delete()
      .eq("employer_id", request.employer_id)
      .eq("date", String(payload.date));
    if (payload.name) deleteQuery = deleteQuery.eq("name", String(payload.name));
    const { error } = await deleteQuery;
    if (error) throw new Error(error.message);
  }

  if (request.request_type === "date_override") {
    const { error } = await supabase.from("holiday_overrides").upsert(
      {
        employer_id: request.employer_id,
        date: String(payload.date),
        override_type: String(payload.override_type),
        name: typeof payload.name === "string" ? payload.name : null,
        reason: typeof payload.reason === "string" ? payload.reason : null,
        source_request_id: request.id,
        approved_by: reviewerId,
        approved_at: now,
      },
      { onConflict: "employer_id,date" },
    );
    if (error) throw new Error(error.message);
  }

  if (request.request_type === "date_override_delete") {
    const { error } = await supabase
      .from("holiday_overrides")
      .delete()
      .eq("employer_id", request.employer_id)
      .eq("date", String(payload.date));
    if (error) throw new Error(error.message);
  }
}

export async function reviewHolidayCalendarChangeRequestAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  if (!isPlatformAdmin(session.user.role)) {
    throw new Error("Only admins can review calendar policy requests.");
  }

  const requestId = requireString(formData, "request_id");
  const decision = requireString(formData, "decision");
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid calendar request decision.");
  }

  const supabase = getSupabaseAdmin();
  const { data: request, error } = await supabase
    .from("holiday_calendar_change_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !request) throw new Error(error?.message ?? "Calendar request not found.");
  if (request.status !== "pending") throw new Error("Calendar request already reviewed.");

  if (decision === "approved") {
    await applyApprovedCalendarRequest(request, session.user.id);
  }

  const { data: reviewedRequest, error: updateError } = await supabase
    .from("holiday_calendar_change_requests")
    .update({
      status: decision,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: optionalString(formData, "admin_notes"),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (updateError || !reviewedRequest) {
    throw new Error(updateError?.message ?? "Calendar request was already reviewed.");
  }

  if (decision === "approved") {
    await notifyActiveEmployees(request.employer_id, session.user.id, request.title);
  }

  await writeAudit(session.user, `${decision}_holiday_calendar_request`, "holiday_calendar_change_request", requestId, {
    employer_id: request.employer_id,
  });
  revalidateCalendarPaths();
}
