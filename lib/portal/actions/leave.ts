"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { booleanValue, numberValue, optionalString, requireString } from "@/lib/portal/form";
import { getPortalSession, isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

export async function saveLeavePolicyAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;

  if (!employerId) {
    throw new Error("Employer account is not active.");
  }

  const supabase = getSupabaseAdmin();
  const year = numberValue(formData, "year", new Date().getFullYear());
  const payload = {
    employer_id: employerId,
    year,
    casual_leave: numberValue(formData, "casual_leave"),
    sick_leave: numberValue(formData, "sick_leave"),
    earned_leave: numberValue(formData, "earned_leave"),
    public_holidays: numberValue(formData, "public_holidays"),
    weekly_off: optionalString(formData, "weekly_off"),
    carry_forward_allowed: booleanValue(formData, "carry_forward_allowed"),
    max_carry_forward: numberValue(formData, "max_carry_forward"),
    encashment_allowed: booleanValue(formData, "encashment_allowed"),
    probation_leave_allowed: booleanValue(formData, "probation_leave_allowed"),
    accrual_notes: optionalString(formData, "accrual_notes"),
    half_day_allowed: booleanValue(formData, "half_day_allowed"),
    notice_period_days: numberValue(formData, "notice_period_days", 30),
    lop_policy: optionalString(formData, "lop_policy"),
    comp_off_allowed: booleanValue(formData, "comp_off_allowed"),
    maternity_leave_days: numberValue(formData, "maternity_leave_days"),
    paternity_leave_days: numberValue(formData, "paternity_leave_days"),
    bereavement_leave_days: numberValue(formData, "bereavement_leave_days"),
    created_by: session.user.id,
  };

  const { data, error } = await supabase
    .from("leave_policies")
    .upsert(payload, { onConflict: "employer_id,year" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save leave policy.");
  }

  await writeAudit(session.user, "save_leave_policy", "leave_policy", data.id);
  revalidatePath("/dashboard/employer");
}

export async function submitLeaveRequestAction(formData: FormData) {
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
    .from("leave_requests")
    .insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      leave_type: requireString(formData, "leave_type"),
      start_date: requireString(formData, "start_date"),
      end_date: requireString(formData, "end_date"),
      days: numberValue(formData, "days", 1),
      reason: optionalString(formData, "reason"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not submit leave request.");
  }

  await writeAudit(session.user, "submit_leave_request", "leave_request", data.id);
  revalidatePath("/dashboard/employee");
}

export async function reviewLeaveRequestAction(formData: FormData) {
  const session = await getPortalSession();
  const decision = requireString(formData, "decision");

  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid leave decision.");
  }

  if (!isPlatformAdmin(session.user.role) && session.user.role !== "employer_admin") {
    throw new Error("You cannot review leave requests.");
  }

  const requestId = requireString(formData, "leave_request_id");
  const supabase = getSupabaseAdmin();
  const { data: request } = await supabase
    .from("leave_requests")
    .select("id, employer_id, employee_id, leave_type, days")
    .eq("id", requestId)
    .single();

  if (!request) {
    throw new Error("Leave request not found.");
  }

  if (
    session.user.role === "employer_admin" &&
    session.user.employer_id !== request.employer_id
  ) {
    throw new Error("You cannot review another employer's leave request.");
  }

  await supabase
    .from("leave_requests")
    .update({
      status: decision,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: optionalString(formData, "reviewer_notes"),
    })
    .eq("id", requestId);

  if (decision === "approved") {
    const year = new Date().getFullYear();
    const fieldByType: Record<string, string> = {
      casual: "casual_available",
      sick: "sick_available",
      earned: "earned_available",
      comp_off: "comp_off_available",
    };
    const field = fieldByType[request.leave_type];

    if (field) {
      const { data: balance } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", request.employee_id)
        .eq("year", year)
        .maybeSingle();

      if (balance) {
        const balanceRecord = balance as Record<string, unknown>;
        await supabase
          .from("leave_balances")
          .update({
            [field]: Math.max(0, Number(balanceRecord[field] ?? 0) - Number(request.days)),
            adjusted_by: session.user.id,
            adjustment_notes: `Leave request ${requestId} approved.`,
          })
          .eq("id", String(balanceRecord.id));
      }
    }
  }

  await writeAudit(session.user, `${decision}_leave_request`, "leave_request", requestId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/employer");
}
