"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

async function requireEmployerReady(employerId: string) {
  const supabase = getSupabaseAdmin();
  const currentYear = new Date().getFullYear();
  const { data: policy } = await supabase
    .from("leave_policies")
    .select("id")
    .eq("employer_id", employerId)
    .eq("year", currentYear)
    .maybeSingle();

  if (!policy) {
    throw new Error("Create this year's leave policy before requesting employees.");
  }
}

export async function createEmployeeRequestAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employerId = session.user.employer_id;

  if (!employerId) {
    throw new Error("Employer account is not active.");
  }

  await requireEmployerReady(employerId);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employee_requests")
    .insert({
      employer_id: employerId,
      requested_by: session.user.id,
      email: requireString(formData, "email").toLowerCase(),
      full_name: requireString(formData, "full_name"),
      job_title: optionalString(formData, "job_title"),
      department: optionalString(formData, "department"),
      proposed_start_date: optionalString(formData, "proposed_start_date"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create employee request.");
  }

  await writeAudit(session.user, "create_employee_request", "employee_request", data.id);
  revalidatePath("/dashboard/employer");
}

export async function approveEmployeeRequestAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const requestId = requireString(formData, "request_id");
  const supabase = getSupabaseAdmin();

  const { data: request, error } = await supabase
    .from("employee_requests")
    .select("id, employer_id, email, full_name, job_title, department, proposed_start_date, status")
    .eq("id", requestId)
    .single();

  if (error || !request) {
    throw new Error(error?.message ?? "Employee request not found.");
  }

  if (request.status !== "pending") {
    throw new Error("Employee request already reviewed.");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .insert({
      employer_id: request.employer_id,
      email: request.email,
      full_name: request.full_name,
      job_title: request.job_title,
      department: request.department,
      start_date: request.proposed_start_date,
      status: "pending",
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "Could not create employee.");
  }

  const year = new Date().getFullYear();
  const { data: policy } = await supabase
    .from("leave_policies")
    .select("casual_leave, sick_leave, earned_leave")
    .eq("employer_id", request.employer_id)
    .eq("year", year)
    .maybeSingle();

  await supabase.from("leave_balances").insert({
    employee_id: employee.id,
    year,
    casual_available: policy?.casual_leave ?? 0,
    sick_available: policy?.sick_leave ?? 0,
    earned_available: policy?.earned_leave ?? 0,
    adjusted_by: session.user.id,
    adjustment_notes: "Initial balance from company leave policy.",
  });

  await supabase
    .from("employee_requests")
    .update({
      status: "approved",
      employee_id: employee.id,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  await writeAudit(session.user, "approve_employee_request", "employee_request", requestId, {
    employee_id: employee.id,
  });
  revalidatePath("/dashboard/admin");
}

export async function rejectEmployeeRequestAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const requestId = requireString(formData, "request_id");
  const supabase = getSupabaseAdmin();

  await supabase
    .from("employee_requests")
    .update({
      status: "rejected",
      admin_notes: optionalString(formData, "admin_notes"),
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  await writeAudit(session.user, "reject_employee_request", "employee_request", requestId);
  revalidatePath("/dashboard/admin");
}
