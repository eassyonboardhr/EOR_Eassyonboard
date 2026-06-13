"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import {
  ensureActivePortalSession,
  getPortalSession,
  isPlatformAdmin,
  requirePortalRole,
} from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";
import { createAdminDeactivationReminder } from "@/lib/portal/actions/deactivation";
import {
  calculateLastWorkingDay,
  canCompleteOffboarding,
  validateNoticePeriodDays,
  validateResignationReason,
} from "@/lib/portal/lifecycle-utils";

export async function submitResignationAction(formData: FormData) {
  const session = await requirePortalRole(["employee"]);
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, employer_id")
    .eq("portal_user_id", session.user.id)
    .single();

  if (!employee) {
    throw new Error("Employee profile is not linked.");
  }

  const { data: activeResignation } = await supabase
    .from("resignations")
    .select("id")
    .eq("employee_id", employee.id)
    .in("status", [
      "submitted_to_admin",
      "forwarded_to_employer",
      "employer_acknowledged",
      "offboarding_requested",
    ])
    .limit(1)
    .maybeSingle();

  if (activeResignation) {
    throw new Error("An active resignation already exists.");
  }

  const { data, error } = await supabase
    .from("resignations")
    .insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      reason: validateResignationReason(optionalString(formData, "reason")),
      preferred_last_working_day: optionalString(formData, "preferred_last_working_day"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not submit resignation.");
  }

  await supabase
    .from("employees")
    .update({ lifecycle_status: "under_resignation" })
    .eq("id", employee.id);

  await writeAudit(session.user, "submit_resignation", "resignation", data.id);
  revalidatePath("/dashboard/employee");
  revalidatePath("/dashboard/resignations");
}

export async function forwardResignationAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const resignationId = requireString(formData, "resignation_id");
  const supabase = getSupabaseAdmin();

  await supabase
    .from("resignations")
    .update({
      status: "forwarded_to_employer",
      admin_notes: optionalString(formData, "admin_notes"),
      forwarded_at: new Date().toISOString(),
    })
    .eq("id", resignationId)
    .eq("status", "submitted_to_admin");

  await writeAudit(session.user, "forward_resignation", "resignation", resignationId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/resignations");
}

export async function acknowledgeResignationAction(formData: FormData) {
  await employerAcceptResignationAction(formData);
}

export async function employerAcceptResignationAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const resignationId = requireString(formData, "resignation_id");
  const noticePeriodDays = validateNoticePeriodDays(requireString(formData, "notice_period_days"));
  const acceptedDate = new Date().toISOString().slice(0, 10);
  const lastWorkingDay = calculateLastWorkingDay(acceptedDate, noticePeriodDays);
  const supabase = getSupabaseAdmin();
  const { data: resignation } = await supabase
    .from("resignations")
    .select("id, employee_id, employer_id, status, employees(portal_user_id, full_name)")
    .eq("id", resignationId)
    .single();

  if (!resignation || resignation.employer_id !== session.user.employer_id) {
    throw new Error("Resignation is outside your employer scope.");
  }

  if (resignation.status !== "forwarded_to_employer") {
    throw new Error("Only forwarded resignations can be accepted by employer.");
  }

  await supabase
    .from("resignations")
    .update({
      status: "employer_acknowledged",
      employer_notes: optionalString(formData, "employer_notes"),
      notice_period_days: noticePeriodDays,
      calculated_last_working_day: lastWorkingDay,
      acknowledged_at: new Date().toISOString(),
      accepted_notice_sent_at: new Date().toISOString(),
    })
    .eq("id", resignationId);

  await supabase
    .from("employees")
    .update({ lifecycle_status: "under_resignation" })
    .eq("id", resignation.employee_id);

  const portalUserId = Array.isArray(resignation.employees)
    ? resignation.employees[0]?.portal_user_id
    : resignation.employees?.portal_user_id;

  if (portalUserId) {
    const { data: notice } = await supabase
      .from("notices")
      .insert({
        employer_id: resignation.employer_id,
        sender_id: session.user.id,
        title: "Resignation accepted",
        body: `Your resignation has been accepted. Your notice period is ${noticePeriodDays} day(s), and your last working day is ${lastWorkingDay}.`,
        priority: "important",
        requires_acknowledgement: true,
        action_url: "/dashboard/employee/leaves",
        action_label: "Open Leave Calendar",
        category: "resignation_accepted",
      })
      .select("id")
      .single();

    if (notice) {
      await supabase.from("notice_recipients").insert({
        notice_id: notice.id,
        recipient_user_id: portalUserId,
      });
    }
  }

  if (lastWorkingDay <= new Date().toISOString().slice(0, 10)) {
    const employeeName = Array.isArray(resignation.employees)
      ? resignation.employees[0]?.full_name
      : resignation.employees?.full_name;
    await createAdminDeactivationReminder({
      actorId: session.user.id,
      employeeId: resignation.employee_id,
      employerId: resignation.employer_id,
      employeeName: employeeName ?? "Employee",
      reason: "post_resignation_notice",
    });
  }

  await writeAudit(session.user, "accept_resignation_with_notice_period", "resignation", resignationId, {
    notice_period_days: noticePeriodDays,
    last_working_day: lastWorkingDay,
  });
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/resignations");
  revalidatePath("/dashboard/employee/leaves");
}

export async function employerRejectResignationAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const resignationId = requireString(formData, "resignation_id");
  const supabase = getSupabaseAdmin();
  const { data: resignation } = await supabase
    .from("resignations")
    .select("id, employee_id, employer_id, status")
    .eq("id", resignationId)
    .single();

  if (!resignation || resignation.employer_id !== session.user.employer_id) {
    throw new Error("Resignation is outside your employer scope.");
  }

  if (resignation.status !== "forwarded_to_employer") {
    throw new Error("Only forwarded resignations can be rejected by employer.");
  }

  await supabase
    .from("resignations")
    .update({
      status: "cancelled",
      rejection_reason: optionalString(formData, "rejection_reason"),
      employer_notes: optionalString(formData, "employer_notes"),
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", resignationId);

  await supabase
    .from("employees")
    .update({ lifecycle_status: "active" })
    .eq("id", resignation.employee_id);

  await writeAudit(session.user, "reject_resignation_by_employer", "resignation", resignationId);
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/resignations");
}

export async function decideResignationAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const resignationId = requireString(formData, "resignation_id");
  const decision = requireString(formData, "decision");
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid resignation decision.");
  }

  const supabase = getSupabaseAdmin();
  const { data: resignation } = await supabase
    .from("resignations")
    .select("id, employee_id, status")
    .eq("id", resignationId)
    .single();

  if (!resignation || resignation.status !== "submitted_to_admin") {
    throw new Error("Only submitted resignations can be decided by admin.");
  }

  await supabase
    .from("resignations")
    .update({
      status: decision === "approved" ? "forwarded_to_employer" : "cancelled",
      rejection_reason: decision === "rejected" ? optionalString(formData, "rejection_reason") : null,
      decided_by: session.user.id,
      decided_at: new Date().toISOString(),
      admin_notes: optionalString(formData, "admin_notes"),
      forwarded_at: decision === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", resignationId);

  if (decision === "rejected") {
    await supabase
      .from("employees")
      .update({ lifecycle_status: "active" })
      .eq("id", resignation.employee_id);
  }

  await writeAudit(session.user, `${decision}_resignation`, "resignation", resignationId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/resignations");
  revalidatePath("/dashboard/employee/leaves");
}

export async function requestOffboardingAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  const supabase = getSupabaseAdmin();
  const employeeId = requireString(formData, "employee_id");
  const targetLastWorkingDay = requireString(formData, "target_last_working_day");

  if (!isPlatformAdmin(session.user.role) && session.user.role !== "employer_admin") {
    throw new Error("You cannot request offboarding.");
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id, employer_id")
    .eq("id", employeeId)
    .single();

  if (!employee) {
    throw new Error("Employee not found.");
  }

  if (
    session.user.role === "employer_admin" &&
    session.user.employer_id !== employee.employer_id
  ) {
    throw new Error("Employee is outside your employer scope.");
  }

  const { data, error } = await supabase
    .from("offboarding_cases")
    .insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      resignation_id: optionalString(formData, "resignation_id"),
      requested_by: session.user.id,
      status: session.user.role === "employer_admin" ? "requested_by_employer" : "admin_approved",
      target_last_working_day: targetLastWorkingDay,
      employer_notes: optionalString(formData, "employer_notes"),
      admin_notes: isPlatformAdmin(session.user.role) ? optionalString(formData, "admin_notes") : null,
      approved_by: isPlatformAdmin(session.user.role) ? session.user.id : null,
      approved_at: isPlatformAdmin(session.user.role) ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not request offboarding.");
  }

  await writeAudit(session.user, "request_offboarding", "offboarding_case", data.id);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/offboarding");
}

export async function approveOffboardingAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const offboardingId = requireString(formData, "offboarding_id");
  const supabase = getSupabaseAdmin();

  await supabase
    .from("offboarding_cases")
    .update({
      status: "admin_approved",
      admin_notes: optionalString(formData, "admin_notes"),
      approved_by: session.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", offboardingId);

  await writeAudit(session.user, "approve_offboarding", "offboarding_case", offboardingId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/offboarding");
}

export async function initiateOffboardingAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const offboardingId = requireString(formData, "offboarding_id");
  const supabase = getSupabaseAdmin();

  const { data: offboarding } = await supabase
    .from("offboarding_cases")
    .select("id, employee_id, status")
    .eq("id", offboardingId)
    .single();

  if (!offboarding || offboarding.status !== "admin_approved") {
    throw new Error("Only approved offboarding can be initiated.");
  }

  await supabase
    .from("offboarding_cases")
    .update({ status: "in_progress", initiated_at: new Date().toISOString() })
    .eq("id", offboardingId);

  await supabase
    .from("employees")
    .update({ lifecycle_status: "under_offboarding" })
    .eq("id", offboarding.employee_id);

  await writeAudit(session.user, "initiate_offboarding", "offboarding_case", offboardingId);
  revalidatePath("/dashboard/offboarding");
}

export async function completeOffboardingAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const offboardingId = requireString(formData, "offboarding_id");
  const supabase = getSupabaseAdmin();

  const { data: offboarding } = await supabase
    .from("offboarding_cases")
    .select("id, employee_id, employer_id, status, target_last_working_day, employees(full_name)")
    .eq("id", offboardingId)
    .single();

  if (!offboarding || offboarding.status !== "in_progress") {
    throw new Error("Only in-progress offboarding can be completed.");
  }

  if (!offboarding.target_last_working_day || !canCompleteOffboarding(offboarding.target_last_working_day)) {
    throw new Error("Last working day has not been reached yet.");
  }

  await supabase
    .from("offboarding_cases")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: session.user.id,
    })
    .eq("id", offboardingId);

  await supabase
    .from("employees")
    .update({ lifecycle_status: "offboarded" })
    .eq("id", offboarding.employee_id);

  const employeeName = Array.isArray(offboarding.employees)
    ? offboarding.employees[0]?.full_name
    : offboarding.employees?.full_name;
  await createAdminDeactivationReminder({
    actorId: session.user.id,
    employeeId: offboarding.employee_id,
    employerId: offboarding.employer_id,
    employeeName: employeeName ?? "Employee",
    reason: "completed_offboarding",
  });

  await writeAudit(session.user, "complete_offboarding", "offboarding_case", offboardingId);
  revalidatePath("/dashboard/offboarding");
}

export async function confirmOffboardingAccessDeactivationAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const offboardingId = requireString(formData, "offboarding_id");
  const supabase = getSupabaseAdmin();

  const { data: offboarding } = await supabase
    .from("offboarding_cases")
    .select("id, employee_id, status")
    .eq("id", offboardingId)
    .single();

  if (!offboarding || offboarding.status !== "completed") {
    throw new Error("Only completed offboarding can have access deactivated.");
  }

  await supabase
    .from("employees")
    .update({ status: "deactivated", lifecycle_status: "offboarded" })
    .eq("id", offboarding.employee_id);

  await supabase
    .from("offboarding_cases")
    .update({
      access_deactivation_confirmed_at: new Date().toISOString(),
      access_deactivation_confirmed_by: session.user.id,
    })
    .eq("id", offboardingId);

  await writeAudit(session.user, "confirm_offboarding_access_deactivation", "offboarding_case", offboardingId);
  revalidatePath("/dashboard/offboarding");
}
