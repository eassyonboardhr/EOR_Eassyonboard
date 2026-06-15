"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString, stringValue } from "@/lib/portal/form";
import { getPayslipSignedUrl } from "@/lib/portal/payslip-access";
import {
  calculateMonthlyBill,
  isEmployeePayrollLineItemLabel,
  isEmployeePayrollStatus,
  isEmployerInvoiceLineItemLabel,
  isEmployerInvoiceStatus,
  normalizeFinanceMonth,
} from "@/lib/portal/portal-finance-types";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

function nullableId(formData: FormData, key: string) {
  return optionalString(formData, key);
}

function numberOrNull(formData: FormData, key: string) {
  const raw = stringValue(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${key} must be a valid number.`);
  return parsed;
}

function nonNegativeNumberOrNull(formData: FormData, key: string) {
  const parsed = numberOrNull(formData, key);
  if (parsed !== null && parsed < 0) throw new Error(`${key} must be zero or more.`);
  return parsed;
}

function nonNegativeNumberOrZero(formData: FormData, key: string) {
  const parsed = nonNegativeNumberOrNull(formData, key);
  return parsed ?? 0;
}

async function requireAdminSession() {
  const session = await requirePortalRole(["super_admin", "admin"]);
  if (!isPlatformAdmin(session.user.role)) {
    throw new Error("Admin access is required.");
  }
  return session;
}

async function assertEmployeeUnderEmployer(supabase: Db, employeeId: string, employerId: string) {
  const { data: employee } = await supabase
    .from("employees")
    .select("id, employer_id")
    .eq("id", employeeId)
    .eq("employer_id", employerId)
    .maybeSingle();
  if (!employee) throw new Error("Employee is not under the selected employer.");
}

function revalidatePortalFinance() {
  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/worktree");
}

export async function upsertEmployerInvoiceRecordAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = nullableId(formData, "id");
  const employerId = requireString(formData, "employer_id");
  const employeeId = requireString(formData, "employee_id");
  const invoiceMonth = normalizeFinanceMonth(requireString(formData, "invoice_month"));
  const status = optionalString(formData, "status") ?? "raised";
  if (!isEmployerInvoiceStatus(status)) throw new Error("Invalid employer invoice status.");

  const hourlyRate = nonNegativeNumberOrZero(formData, "hourly_rate");
  const hoursPerWeek = nonNegativeNumberOrZero(formData, "hours_per_week");
  const supabase = getSupabaseAdmin();
  await assertEmployeeUnderEmployer(supabase, employeeId, employerId);

  const payload = {
    employer_id: employerId,
    employee_id: employeeId,
    invoice_month: invoiceMonth,
    invoice_no: optionalString(formData, "invoice_no"),
    days_worked: nonNegativeNumberOrNull(formData, "days_worked"),
    hourly_rate: hourlyRate,
    hours_per_week: hoursPerWeek,
    monthly_bill: calculateMonthlyBill(hourlyRate, hoursPerWeek),
    status,
    currency: optionalString(formData, "currency") ?? "USD",
    updated_by: session.user.id,
    ...(id ? {} : { created_by: session.user.id }),
  };

  const query = id
    ? from(supabase, "portal_employer_invoice_records").update(payload).eq("id", id).select("id").single()
    : from(supabase, "portal_employer_invoice_records").insert(payload).select("id").single();
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

export async function deleteEmployerInvoiceRecordAction(formData: FormData) {
  await requireAdminSession();
  const id = requireString(formData, "id");
  const supabase = getSupabaseAdmin();
  const { error } = await from(supabase, "portal_employer_invoice_records").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

export async function upsertEmployerInvoiceLineItemAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = nullableId(formData, "id");
  const invoiceRecordId = requireString(formData, "invoice_record_id");
  const label = requireString(formData, "label");
  if (!isEmployerInvoiceLineItemLabel(label)) throw new Error("Invalid employer invoice line item label.");
  const amount = label === "Note" ? null : nonNegativeNumberOrNull(formData, "amount");
  if (label !== "Note" && amount === null) throw new Error("Amount is required for this employer invoice line item.");

  const supabase = getSupabaseAdmin();
  const payload = {
    invoice_record_id: invoiceRecordId,
    label,
    amount,
    note: optionalString(formData, "note"),
    updated_by: session.user.id,
    ...(id ? {} : { created_by: session.user.id }),
  };
  const query = id
    ? from(supabase, "portal_employer_invoice_line_items").update(payload).eq("id", id).select("id").single()
    : from(supabase, "portal_employer_invoice_line_items").insert(payload).select("id").single();
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

export async function deleteEmployerInvoiceLineItemAction(formData: FormData) {
  await requireAdminSession();
  const id = requireString(formData, "id");
  const supabase = getSupabaseAdmin();
  const { error } = await from(supabase, "portal_employer_invoice_line_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

export async function upsertEmployeePayrollRecordAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = nullableId(formData, "id");
  const employerId = requireString(formData, "employer_id");
  const employeeId = requireString(formData, "employee_id");
  const payrollMonth = normalizeFinanceMonth(requireString(formData, "payroll_month"));
  const paymentStatus = optionalString(formData, "payment_status") ?? "pending";
  if (!isEmployeePayrollStatus(paymentStatus)) throw new Error("Invalid payroll status.");
  const grossSalaryInr = nonNegativeNumberOrZero(formData, "gross_salary_inr");
  const actualPaidInr = nonNegativeNumberOrZero(formData, "actual_paid_inr");

  const supabase = getSupabaseAdmin();
  await assertEmployeeUnderEmployer(supabase, employeeId, employerId);
  const payload = {
    employer_id: employerId,
    employee_id: employeeId,
    payroll_month: payrollMonth,
    gross_salary_inr: grossSalaryInr,
    actual_paid_inr: actualPaidInr,
    payment_date: optionalString(formData, "payment_date"),
    payment_status: paymentStatus,
    updated_by: session.user.id,
    ...(id ? {} : { created_by: session.user.id }),
  };
  const query = id
    ? from(supabase, "portal_employee_payroll_records").update(payload).eq("id", id).select("id").single()
    : from(supabase, "portal_employee_payroll_records").insert(payload).select("id").single();
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

export async function deleteEmployeePayrollRecordAction(formData: FormData) {
  await requireAdminSession();
  const id = requireString(formData, "id");
  const supabase = getSupabaseAdmin();
  const { error } = await from(supabase, "portal_employee_payroll_records").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

export async function upsertEmployeePayrollLineItemAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = nullableId(formData, "id");
  const payrollRecordId = requireString(formData, "payroll_record_id");
  const label = requireString(formData, "label");
  if (!isEmployeePayrollLineItemLabel(label)) throw new Error("Invalid employee payroll line item label.");
  const amount = label === "Note" ? null : nonNegativeNumberOrNull(formData, "amount");
  if (label !== "Note" && amount === null) throw new Error("Amount is required for this employee payroll line item.");

  const supabase = getSupabaseAdmin();
  const payload = {
    payroll_record_id: payrollRecordId,
    label,
    amount,
    note: optionalString(formData, "note"),
    updated_by: session.user.id,
    ...(id ? {} : { created_by: session.user.id }),
  };
  const query = id
    ? from(supabase, "portal_employee_payroll_line_items").update(payload).eq("id", id).select("id").single()
    : from(supabase, "portal_employee_payroll_line_items").insert(payload).select("id").single();
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

export async function deleteEmployeePayrollLineItemAction(formData: FormData) {
  await requireAdminSession();
  const id = requireString(formData, "id");
  const supabase = getSupabaseAdmin();
  const { error } = await from(supabase, "portal_employee_payroll_line_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePortalFinance();
}

function fileNameSafe(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadPayslipAction(formData: FormData) {
  const session = await requireAdminSession();
  const payrollRecordId = requireString(formData, "payroll_record_id");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Payslip file is required.");

  const supabase = getSupabaseAdmin();
  const { data: payroll, error: payrollError } = await from(supabase, "portal_employee_payroll_records")
    .select("id, employer_id, employee_id, payroll_month")
    .eq("id", payrollRecordId)
    .single();
  if (payrollError || !payroll) throw new Error(payrollError?.message ?? "Payroll record was not found.");

  const { data: existingPayslip } = await from(supabase, "portal_payslip_files")
    .select("id, file_path")
    .eq("payroll_record_id", payrollRecordId)
    .maybeSingle();

  const path = `${payroll.employer_id}/${payroll.employee_id}/${payroll.payroll_month}/${Date.now()}-${fileNameSafe(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("payslips").upload(path, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await from(supabase, "portal_payslip_files").upsert({
    payroll_record_id: payroll.id,
    employer_id: payroll.employer_id,
    employee_id: payroll.employee_id,
    payroll_month: payroll.payroll_month,
    file_name: file.name,
    file_path: path,
    mime_type: file.type || null,
    file_size_bytes: file.size,
    uploaded_by: session.user.id,
    uploaded_at: new Date().toISOString(),
  }, { onConflict: "payroll_record_id" });
  if (error) throw new Error(error.message);

  if (existingPayslip?.file_path && existingPayslip.file_path !== path) {
    const { error: removeError } = await supabase.storage.from("payslips").remove([existingPayslip.file_path]);
    if (removeError) {
      console.warn("Failed to remove replaced payslip object.", {
        path: existingPayslip.file_path,
        error: removeError.message,
      });
    }
  }

  revalidatePortalFinance();
}

export async function getPayslipSignedUrlAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employee"]);
  const payslipId = requireString(formData, "payslip_id");
  return getPayslipSignedUrl(session, payslipId);
}
