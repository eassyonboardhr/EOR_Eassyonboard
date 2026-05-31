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

  const { data, error } = await supabase
    .from("resignations")
    .insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      reason: optionalString(formData, "reason"),
      preferred_last_working_day: optionalString(formData, "preferred_last_working_day"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not submit resignation.");
  }

  await writeAudit(session.user, "submit_resignation", "resignation", data.id);
  revalidatePath("/dashboard/employee");
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
    .eq("id", resignationId);

  await writeAudit(session.user, "forward_resignation", "resignation", resignationId);
  revalidatePath("/dashboard/admin");
}

export async function acknowledgeResignationAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const resignationId = requireString(formData, "resignation_id");
  const supabase = getSupabaseAdmin();
  const { data: resignation } = await supabase
    .from("resignations")
    .select("id, employer_id")
    .eq("id", resignationId)
    .single();

  if (!resignation || resignation.employer_id !== session.user.employer_id) {
    throw new Error("Resignation is outside your employer scope.");
  }

  await supabase
    .from("resignations")
    .update({
      status: "employer_acknowledged",
      employer_notes: optionalString(formData, "employer_notes"),
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", resignationId);

  await writeAudit(session.user, "acknowledge_resignation", "resignation", resignationId);
  revalidatePath("/dashboard/employer");
}

export async function requestOffboardingAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  const supabase = getSupabaseAdmin();
  const employeeId = requireString(formData, "employee_id");

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
      target_last_working_day: optionalString(formData, "target_last_working_day"),
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
}
