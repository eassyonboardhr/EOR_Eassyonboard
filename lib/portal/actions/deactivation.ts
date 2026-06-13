"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

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

export type DeactivationStatus = {
  canDeactivate: boolean;
  blockers: string[];
  eligibleReason?: "post_resignation_notice" | "completed_offboarding" | "absconding_admin" | null;
  lastWorkingDay?: string | null;
  pendingBillCount?: number;
  activeEmployeeCount?: number;
};

const closedInvoiceStatuses = ["received", "cashed_out", "paid", "cancelled", "void"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function revalidateDeactivationSurfaces() {
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/employers");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/worktree");
  revalidatePath("/dashboard/offboarding");
  revalidatePath("/dashboard/reports");
}

async function getEmployerDeactivationStatus(employerId: string): Promise<DeactivationStatus> {
  const supabase = getSupabaseAdmin();
  const financeDb = supabase as any;
  const [{ count: activeEmployeeCount }, { count: pendingBillCount }] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", employerId)
      .eq("status", "active"),
    financeDb
      .from("finance_invoices")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", employerId)
      .not("status", "in", `(${closedInvoiceStatuses.join(",")})`),
  ]);
  const blockers: string[] = [];
  if ((activeEmployeeCount ?? 0) > 0) {
    blockers.push(`${activeEmployeeCount} active employees remain`);
  }
  if ((pendingBillCount ?? 0) > 0) {
    blockers.push(`${pendingBillCount} pending or unpaid bills remain`);
  }
  return {
    canDeactivate: blockers.length === 0,
    blockers,
    activeEmployeeCount: activeEmployeeCount ?? 0,
    pendingBillCount: pendingBillCount ?? 0,
  };
}

async function getEmployeeExitEligibility(employeeId: string, allowAbscondingAdmin: boolean): Promise<DeactivationStatus> {
  const supabase = getSupabaseAdmin();
  if (allowAbscondingAdmin) {
    return { canDeactivate: true, blockers: [], eligibleReason: "absconding_admin" };
  }

  const [{ data: completedOffboarding }, { data: acceptedResignation }] = await Promise.all([
    supabase
      .from("offboarding_cases")
      .select("id, status, target_last_working_day")
      .eq("employee_id", employeeId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("resignations")
      .select("id, status, calculated_last_working_day")
      .eq("employee_id", employeeId)
      .in("status", ["employer_acknowledged", "offboarding_requested", "admin_approved_offboarding", "offboarding_in_progress", "completed"])
      .order("acknowledged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (completedOffboarding) {
    return {
      canDeactivate: true,
      blockers: [],
      eligibleReason: "completed_offboarding",
      lastWorkingDay: completedOffboarding.target_last_working_day,
    };
  }

  const lastWorkingDay = acceptedResignation?.calculated_last_working_day ?? null;
  if (lastWorkingDay && lastWorkingDay <= todayIso()) {
    return {
      canDeactivate: true,
      blockers: [],
      eligibleReason: "post_resignation_notice",
      lastWorkingDay,
    };
  }

  return {
    canDeactivate: false,
    blockers: ["Employee is not eligible for deactivation until completed offboarding or notice completion."],
    eligibleReason: null,
    lastWorkingDay,
  };
}

export async function getEmployeeDeactivationStatus(employeeId: string, allowAbscondingAdmin = false) {
  return getEmployeeExitEligibility(employeeId, allowAbscondingAdmin);
}

export async function getEmployerDeactivationPreview(employerId: string) {
  return getEmployerDeactivationStatus(employerId);
}

async function readEmployeeForDeactivation(employeeId: string) {
  const supabase = getSupabaseAdmin();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, employer_id, status, lifecycle_status, full_name")
    .eq("id", employeeId)
    .single();
  if (error || !employee) {
    throw new Error(error?.message ?? "Employee not found.");
  }
  return employee;
}

export async function deactivateEmployerAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const employerId = requireString(formData, "employer_id");
  const reason = requireString(formData, "reason");
  const status = await getEmployerDeactivationStatus(employerId);
  if (!status.canDeactivate) {
    throw new Error(`Employer cannot be deactivated: ${status.blockers.join("; ")}.`);
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("employers")
    .update({ status: "deactivated", updated_at: new Date().toISOString() })
    .eq("id", employerId);
  if (error) throw new Error(error.message);

  await writeAudit(session.user, "deactivate_employer", "employer", employerId, {
    reason,
    activeEmployeeCount: status.activeEmployeeCount,
    pendingBillCount: status.pendingBillCount,
  });
  revalidateDeactivationSurfaces();
}

export async function deactivateEmployeeAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  if (!isPlatformAdmin(session.user.role) && session.user.role !== "employer_admin") {
    throw new Error("You cannot deactivate employees.");
  }

  const employeeId = requireString(formData, "employee_id");
  const reason = requireString(formData, "reason");
  const deactivationReason = optionalString(formData, "deactivation_reason");
  const employee = await readEmployeeForDeactivation(employeeId);

  if (session.user.role === "employer_admin" && employee.employer_id !== session.user.employer_id) {
    throw new Error("Employee is outside your employer scope.");
  }

  const allowAbscondingAdmin = isPlatformAdmin(session.user.role) && deactivationReason === "absconding";
  const status = await getEmployeeExitEligibility(employeeId, allowAbscondingAdmin);
  if (!status.canDeactivate) {
    throw new Error(`Employee cannot be deactivated: ${status.blockers.join("; ")}.`);
  }

  const supabase = getSupabaseAdmin();
  const updatePayload =
    status.eligibleReason === "absconding_admin"
      ? { status: "deactivated" as const, updated_at: new Date().toISOString() }
      : { status: "deactivated" as const, lifecycle_status: "offboarded", updated_at: new Date().toISOString() };
  const { error } = await supabase.from("employees").update(updatePayload).eq("id", employeeId);
  if (error) throw new Error(error.message);

  await writeAudit(session.user, "deactivate_employee", "employee", employeeId, {
    reason,
    eligibleReason: status.eligibleReason,
    lastWorkingDay: status.lastWorkingDay,
  });
  revalidateDeactivationSurfaces();
}

export async function keepEmployeeActiveAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  if (!isPlatformAdmin(session.user.role) && session.user.role !== "employer_admin") {
    throw new Error("You cannot review employee deactivation.");
  }

  const employeeId = requireString(formData, "employee_id");
  const reason = requireString(formData, "reason");
  const employee = await readEmployeeForDeactivation(employeeId);
  if (session.user.role === "employer_admin" && employee.employer_id !== session.user.employer_id) {
    throw new Error("Employee is outside your employer scope.");
  }
  const status = await getEmployeeExitEligibility(employeeId, false);
  if (!status.canDeactivate) {
    throw new Error(`Employee is not ready for keep/deactivate review: ${status.blockers.join("; ")}.`);
  }

  await writeAudit(session.user, "keep_employee_active_after_exit", "employee", employeeId, {
    reason,
    eligibleReason: status.eligibleReason,
    lastWorkingDay: status.lastWorkingDay,
  });
  revalidateDeactivationSurfaces();
}

export async function createAdminDeactivationReminder({
  actorId,
  employeeId,
  employerId,
  employeeName,
  reason,
}: {
  actorId: string;
  employeeId: string;
  employerId: string;
  employeeName: string;
  reason: "completed_offboarding" | "post_resignation_notice";
}) {
  const supabase = getSupabaseAdmin();
  const { data: admins } = await supabase
    .from("portal_users")
    .select("id")
    .in("role", ["super_admin", "admin"])
    .eq("status", "active");
  const recipientIds = (admins ?? []).map((admin) => admin.id);
  if (recipientIds.length === 0) return;

  const { data: notice, error } = await supabase
    .from("notices")
    .insert({
      sender_id: actorId,
      employer_id: employerId,
      title: "Employee deactivation review needed",
      body: `${employeeName} is ready for deactivation review because ${reason === "completed_offboarding" ? "offboarding is completed" : "the resignation notice period has ended"}.`,
      priority: "important",
      requires_acknowledgement: true,
      action_url: `/dashboard/employees?tab=deactivate&employee=${employeeId}`,
      action_label: "Review deactivation",
      category: "offboarding",
    })
    .select("id")
    .single();
  if (error || !notice) {
    throw new Error(error?.message ?? "Could not create deactivation reminder.");
  }

  await supabase.from("notice_recipients").insert(
    recipientIds.map((recipient_user_id) => ({
      notice_id: notice.id,
      recipient_user_id,
    })),
  );
}
