"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { booleanValue, numberValue, optionalString, requireString } from "@/lib/portal/form";
import {
  ensureActivePortalSession,
  getPortalSession,
  isPlatformAdmin,
  requirePortalRole,
} from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";
import {
  allocatePaidAndLopDays,
  calculateLeaveDays,
  payableLeaveDates,
} from "@/lib/portal/leave-utils";
import {
  getApprovedLeaveCalendarPolicy,
  toLeaveCalendarPolicy,
} from "@/lib/portal/leave-calendar-policy";
import type { Database } from "@/lib/supabase/database.types";
import type { PortalUser } from "@/lib/portal/types";

type LeaveRequestStatus = Database["public"]["Enums"]["leave_request_status"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type LeaveBalanceRow = Database["public"]["Tables"]["leave_balances"]["Row"];
type LeaveBalanceUpdate = Database["public"]["Tables"]["leave_balances"]["Update"];

const paidBalanceFieldByType = {
  casual: "casual_available",
  sick: "sick_available",
  earned: "earned_available",
  comp_off: "comp_off_available",
} as const;

type PaidLeaveType = keyof typeof paidBalanceFieldByType;

function isPaidLeaveType(value: string): value is PaidLeaveType {
  return value in paidBalanceFieldByType;
}

function revalidateLeavePaths() {
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/leaves");
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/employer/leaves");
  revalidatePath("/dashboard/employee");
  revalidatePath("/dashboard/employee/leaves");
  revalidatePath("/dashboard/worktree");
}

async function getEmployeeById(employeeId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Employee not found.");
  return data;
}

async function getCurrentEmployee() {
  const session = await requirePortalRole(["employee"]);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("portal_user_id", session.user.id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Employee profile is not linked.");
  }

  return { session, employee: data };
}

function assertCanManageEmployee(
  role: PortalUser["role"],
  sessionEmployerId: string | null,
  employee: EmployeeRow,
) {
  if (isPlatformAdmin(role)) return;
  if (role === "employer_admin" && sessionEmployerId === employee.employer_id) return;
  throw new Error("You cannot manage this employee's leave.");
}

async function ensureBalance(employeeId: string, year: number): Promise<LeaveBalanceRow> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("year", year)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("leave_balances")
    .insert({
      employee_id: employeeId,
      year,
      casual_available: 7,
      sick_available: 7,
      earned_available: 6,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Could not create leave balance.");
  }

  return created;
}

async function assertNoOverlap(employeeId: string, startDate: string, endDate: string) {
  const supabase = getSupabaseAdmin();
  const { data: leaveOverlap, error } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("employee_id", employeeId)
    .in("status", ["pending", "approved"])
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);

  if (error) throw new Error(error.message);
  if ((leaveOverlap ?? []).length > 0) {
    throw new Error("This date range overlaps an existing pending or approved leave.");
  }

  const { data: absenceOverlap, error: absenceError } = await supabase
    .from("employee_absences")
    .select("id")
    .eq("employee_id", employeeId)
    .neq("status", "cancelled")
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);

  if (absenceError) throw new Error(absenceError.message);
  if ((absenceOverlap ?? []).length > 0) {
    throw new Error("This date range overlaps an existing absence record.");
  }
}

async function createLeaveRequestForEmployee({
  employee,
  actor,
  createdForEmployeeBy,
  formData,
  initialStatus = "pending",
}: {
  employee: EmployeeRow;
  actor: PortalUser;
  createdForEmployeeBy: string | null;
  formData: FormData;
  initialStatus?: LeaveRequestStatus;
}) {
  const startDate = requireString(formData, "start_date");
  const endDate = requireString(formData, "end_date");
  const leaveType = optionalString(formData, "leave_type") ?? "casual";
  const mobileNumber = requireString(formData, "mobile_number");
  const reason = requireString(formData, "reason");
  const calendarPolicy = await getApprovedLeaveCalendarPolicy(employee.employer_id, startDate, endDate);
  const calculation = calculateLeaveDays(
    startDate,
    endDate,
    calendarPolicy.holidays.map((holiday) => holiday.date),
    toLeaveCalendarPolicy(calendarPolicy),
  );

  if (calculation.totalLeaveDays <= 0) {
    throw new Error("Leave request must include at least one payable leave day.");
  }

  await assertNoOverlap(employee.id, startDate, endDate);

  const supabase = getSupabaseAdmin();
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("employee_id", employee.id)
    .limit(1)
    .maybeSingle();

  const { data: request, error } = await supabase
    .from("leave_requests")
    .insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      team_id: teamMember?.team_id ?? null,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days: calculation.totalLeaveDays,
      total_selected_days: calculation.totalSelectedDays,
      excluded_holiday_days: calculation.excludedHolidayDays,
      total_leave_days: calculation.totalLeaveDays,
      mobile_number: mobileNumber,
      reason,
      status: initialStatus,
      created_by: actor.id,
      created_for_employee_by: createdForEmployeeBy,
    })
    .select("id")
    .single();

  if (error || !request) {
    throw new Error(error?.message ?? "Could not submit leave request.");
  }

  await supabase.from("leave_request_days").insert(
    calculation.days.map((day) => ({
      leave_request_id: request.id,
      employee_id: employee.id,
      date: day.date,
      is_holiday: day.isHoliday,
      status: initialStatus,
    })),
  );

  await writeAudit(actor, "submit_leave_request", "leave_request", request.id, {
    employee_id: employee.id,
    total_leave_days: calculation.totalLeaveDays,
  });

  revalidateLeavePaths();
  revalidatePath(`/dashboard/leaves/history/${employee.id}`);
}

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
  const { session, employee } = await getCurrentEmployee();
  await createLeaveRequestForEmployee({
    employee,
    actor: session.user,
    createdForEmployeeBy: null,
    formData,
  });
}

export async function applyLeaveOnBehalfAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);

  if (!isPlatformAdmin(session.user.role) && session.user.role !== "employer_admin") {
    throw new Error("You cannot apply leave on behalf of employees.");
  }

  const employee = await getEmployeeById(requireString(formData, "employee_id"));
  assertCanManageEmployee(session.user.role, session.user.employer_id, employee);

  await createLeaveRequestForEmployee({
    employee,
    actor: session.user,
    createdForEmployeeBy: session.user.id,
    formData,
    initialStatus: optionalString(formData, "approve_now") ? "approved" : "pending",
  });
}

export async function reviewLeaveRequestAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
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
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) {
    throw new Error("Leave request not found.");
  }

  if (request.status !== "pending") {
    throw new Error("Leave request already reviewed.");
  }

  if (
    session.user.role === "employer_admin" &&
    session.user.employer_id !== request.employer_id
  ) {
    throw new Error("You cannot review another employer's leave request.");
  }

  const now = new Date().toISOString();
  const totalLeaveDays = Number(request.total_leave_days ?? request.days);

  if (decision === "approved") {
    const year = new Date(`${request.start_date}T00:00:00.000Z`).getUTCFullYear();
    const balance = await ensureBalance(request.employee_id, year);
    const field = isPaidLeaveType(request.leave_type)
      ? paidBalanceFieldByType[request.leave_type]
      : null;
    const available = field ? Number(balance[field] ?? 0) : 0;
    const allocation = allocatePaidAndLopDays(totalLeaveDays, available);

    const updatePayload: LeaveBalanceUpdate = {
      adjusted_by: session.user.id,
      adjustment_notes: `Leave request ${requestId} approved.`,
      lop_days: Number(balance.lop_days ?? 0) + allocation.lopDays,
    };

    if (field) {
      updatePayload[field] = Math.max(0, available - allocation.paidLeaveDays);
    }

    await supabase.from("leave_balances").update(updatePayload).eq("id", balance.id);

    await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        reviewed_by: session.user.id,
        reviewed_at: now,
        reviewer_notes: optionalString(formData, "reviewer_notes"),
        approved_by: session.user.id,
        approved_at: now,
        paid_leave_days: allocation.paidLeaveDays,
        lop_days: allocation.lopDays,
      })
      .eq("id", requestId)
      .eq("status", "pending");

    const calendarPolicy = await getApprovedLeaveCalendarPolicy(
      request.employer_id,
      request.start_date,
      request.end_date,
    );
    const calculation = calculateLeaveDays(
      request.start_date,
      request.end_date,
      calendarPolicy.holidays.map((holiday) => holiday.date),
      toLeaveCalendarPolicy(calendarPolicy),
    );
    const payableDates = payableLeaveDates(calculation).slice(0, totalLeaveDays);
    const lopDateSet = new Set(payableDates.slice(allocation.paidLeaveDays));

    await supabase
      .from("leave_request_days")
      .update({ status: "approved" })
      .eq("leave_request_id", requestId);

    for (const date of lopDateSet) {
      await supabase
        .from("leave_request_days")
        .update({ is_lop: true })
        .eq("leave_request_id", requestId)
        .eq("date", date);
    }
  } else {
    await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        reviewed_by: session.user.id,
        reviewed_at: now,
        reviewer_notes: optionalString(formData, "reviewer_notes"),
        rejected_by: session.user.id,
        rejected_at: now,
        rejection_reason: optionalString(formData, "rejection_reason") ?? optionalString(formData, "reviewer_notes"),
      })
      .eq("id", requestId)
      .eq("status", "pending");

    await supabase
      .from("leave_request_days")
      .update({ status: "rejected" })
      .eq("leave_request_id", requestId);
  }

  await writeAudit(session.user, `${decision}_leave_request`, "leave_request", requestId);
  revalidateLeavePaths();
  revalidatePath(`/dashboard/leaves/history/${request.employee_id}`);
}

export async function markAbsentAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);

  if (!isPlatformAdmin(session.user.role) && session.user.role !== "employer_admin") {
    throw new Error("You cannot mark employee absence.");
  }

  const employee = await getEmployeeById(requireString(formData, "employee_id"));
  assertCanManageEmployee(session.user.role, session.user.employer_id, employee);

  const startDate = requireString(formData, "start_date");
  const endDate = requireString(formData, "end_date");
  const calendarPolicy = await getApprovedLeaveCalendarPolicy(employee.employer_id, startDate, endDate);
  const calculation = calculateLeaveDays(
    startDate,
    endDate,
    calendarPolicy.holidays.map((holiday) => holiday.date),
    toLeaveCalendarPolicy(calendarPolicy),
  );

  if (calculation.totalLeaveDays <= 0) {
    throw new Error("Absence must include at least one payable working day.");
  }

  await assertNoOverlap(employee.id, startDate, endDate);

  const supabase = getSupabaseAdmin();
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("employee_id", employee.id)
    .limit(1)
    .maybeSingle();

  const isLop = !formData.has("not_lop");
  const { data: absence, error } = await supabase
    .from("employee_absences")
    .insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      team_id: teamMember?.team_id ?? null,
      leave_request_id: optionalString(formData, "leave_request_id"),
      start_date: startDate,
      end_date: endDate,
      total_selected_days: calculation.totalSelectedDays,
      excluded_holiday_days: calculation.excludedHolidayDays,
      total_absent_days: calculation.totalLeaveDays,
      is_lop: isLop,
      status: isLop ? "converted_to_lop" : "recorded",
      reason: optionalString(formData, "reason"),
      mobile_number: optionalString(formData, "mobile_number"),
      marked_by: session.user.id,
    })
    .select("id")
    .single();

  if (error || !absence) {
    throw new Error(error?.message ?? "Could not mark absence.");
  }

  if (isLop) {
    const year = new Date(`${startDate}T00:00:00.000Z`).getUTCFullYear();
    const balance = await ensureBalance(employee.id, year);
    await supabase
      .from("leave_balances")
      .update({
        lop_days: Number(balance.lop_days ?? 0) + calculation.totalLeaveDays,
        adjusted_by: session.user.id,
        adjustment_notes: `Absence ${absence.id} marked as LOP.`,
      })
      .eq("id", balance.id);
  }

  await writeAudit(session.user, "mark_employee_absent", "employee_absence", absence.id, {
    employee_id: employee.id,
    is_lop: isLop,
  });
  revalidateLeavePaths();
  revalidatePath(`/dashboard/leaves/history/${employee.id}`);
}
