"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import {
  inferPayrollAllocations,
  refreshAllocationCashout,
} from "@/lib/portal/finance-allocations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePortalRole, isPlatformAdmin } from "@/lib/portal/session";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function requireAdmin() {
  const session = await requirePortalRole(["super_admin", "admin"]);
  if (!isPlatformAdmin(session.user.role)) {
    throw new Error("Admin access is required.");
  }
  return session;
}

export async function mapFinanceCompanyAction(formData: FormData) {
  await requireAdmin();
  const mappingId = value(formData, "mappingId");
  const employerId = value(formData, "employerId");
  const externalCompanyId = value(formData, "externalCompanyId");
  const sourceKey = value(formData, "sourceKey") ?? "invoice_generator";

  if (!employerId || (!mappingId && !externalCompanyId)) {
    throw new Error("Employer and mapping are required.");
  }

  const supabase = getSupabaseAdmin() as any;
  const match = mappingId ? { id: mappingId } : { source_key: sourceKey, external_company_id: externalCompanyId };
  const { error } = await supabase.from("finance_company_mappings").update({ employer_id: employerId }).match(match);
  if (error) throw new Error(error.message);

  const { data: companyInvoices } = await supabase
    .from("finance_invoices")
    .select("external_invoice_id")
    .eq("source_key", sourceKey)
    .eq("external_company_id", externalCompanyId);
  const externalInvoiceIds = (companyInvoices ?? []).map((invoice: any) => invoice.external_invoice_id).filter(Boolean);

  await Promise.all([
    supabase.from("finance_invoices").update({ employer_id: employerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    supabase.from("finance_invoice_payments").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    externalInvoiceIds.length
      ? supabase.from("finance_invoice_line_items").update({ employer_id: employerId }).eq("source_key", sourceKey).in("external_invoice_id", externalInvoiceIds)
      : Promise.resolve(),
    supabase.from("finance_employee_mappings").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId).is("employer_id", null),
    supabase.from("finance_employee_salary_payments").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId).is("employer_id", null),
  ]);

  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/finances/mapping");
}

export async function mapFinanceEmployeeAction(formData: FormData) {
  await requireAdmin();
  const mappingId = value(formData, "mappingId");
  const employeeId = value(formData, "employeeId");
  const employerId = value(formData, "employerId");
  const externalEmployeeId = value(formData, "externalEmployeeId");
  const sourceKey = value(formData, "sourceKey") ?? "invoice_generator";

  if (!employeeId || (!mappingId && !externalEmployeeId)) {
    throw new Error("Employee and mapping are required.");
  }

  const supabase = getSupabaseAdmin() as any;
  const match = mappingId ? { id: mappingId } : { source_key: sourceKey, external_employee_id: externalEmployeeId };
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, employer_id")
    .eq("id", employeeId)
    .single();
  if (employeeError) throw new Error(employeeError.message);

  const resolvedEmployerId = employerId ?? employee.employer_id;
  const { error } = await supabase
    .from("finance_employee_mappings")
    .update({ employee_id: employeeId, employer_id: resolvedEmployerId })
    .match(match);
  if (error) throw new Error(error.message);

  await Promise.all([
    supabase.from("finance_invoice_line_items").update({ employee_id: employeeId, employer_id: resolvedEmployerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_salary_payments").update({ employee_id: employeeId, employer_id: resolvedEmployerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_statement_rows").update({ employee_id: employeeId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_statement_summaries").update({ employee_id: employeeId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
  ]);

  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/finances/mapping");
}

export async function markFinanceInvoicePaymentReceivedAction(formData: FormData) {
  const session = await requireAdmin();
  const invoiceId = value(formData, "invoiceId");
  const receivedAt = value(formData, "receivedAt") ?? new Date().toISOString().slice(0, 10);
  const notes = value(formData, "notes");
  const syncUrl = process.env.INVOICE_GENERATOR_STATUS_SYNC_URL;
  const syncSecret = process.env.INVOICE_GENERATOR_SYNC_SECRET;

  if (!invoiceId) {
    throw new Error("Invoice is required.");
  }
  if (!syncUrl || !syncSecret) {
    throw new Error("Invoice Generator status sync is not configured.");
  }

  const supabase = getSupabaseAdmin() as any;
  const { data: invoice, error: invoiceError } = await supabase
    .from("finance_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (invoiceError) throw new Error(invoiceError.message);
  if (!invoice.external_invoice_id) {
    throw new Error("Invoice Generator source id is missing.");
  }

  const response = await fetch(syncUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-invoice-generator-sync-secret": syncSecret,
    },
    body: JSON.stringify({
      source: invoice.source_key ?? "invoice_generator",
      externalInvoiceId: invoice.external_invoice_id,
      status: "received",
      paymentReceivedAt: receivedAt,
      notes,
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error ?? "Invoice Generator status sync failed.");
  }

  const receivedIso = new Date(`${receivedAt}T00:00:00.000Z`).toISOString();
  const { error: updateError } = await supabase
    .from("finance_invoices")
    .update({
      status: "received",
      payment_received_at: receivedIso,
      payment_received_by: session.user.id,
      payment_received_notes: notes,
      last_source_status: "received",
      last_status_synced_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);
  if (updateError) throw new Error(updateError.message);

  const { error: paymentError } = await supabase.from("finance_invoice_payments").upsert({
    source_key: invoice.source_key ?? "invoice_generator",
    external_payment_id: `eor_received_${invoice.external_invoice_id}`,
    invoice_id: invoice.id,
    external_invoice_id: invoice.external_invoice_id,
    external_company_id: invoice.external_company_id,
    employer_id: invoice.employer_id,
    payment_date: receivedAt,
    payment_month: invoice.month_key,
    usd_inr_rate: 0,
    notes: notes ?? "Marked payment received in EOR Portal",
  }, { onConflict: "source_key,external_payment_id" });
  if (paymentError) throw new Error(paymentError.message);

  await supabase.from("audit_events").insert({
    actor_user_id: session.user.id,
    employer_id: session.user.employer_id,
    action: "mark_finance_invoice_payment_received",
    entity_type: "finance_invoice",
    entity_id: invoice.id,
    metadata: { externalInvoiceId: invoice.external_invoice_id, result },
  });

  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/finances/mapping");
}

export async function inferFinancePayrollAllocationsAction(formData: FormData) {
  const session = await requireAdmin();
  const employerId = value(formData, "employerId");
  const employeeId = value(formData, "employeeId");
  const payrollMonth = value(formData, "payrollMonth");
  const supabase = getSupabaseAdmin() as any;

  let salaryQuery = supabase
    .from("finance_employee_salary_payments")
    .select("id, source_key, employer_id, employee_id, month_key, salary_usd_cents")
    .not("employee_id", "is", null)
    .not("employer_id", "is", null)
    .eq("sync_status", "synced");
  let lineItemQuery = supabase
    .from("finance_invoice_line_items")
    .select("id, invoice_id, employer_id, employee_id, billed_total_usd_cents, finance_invoices(id, month_key)")
    .not("employee_id", "is", null)
    .not("employer_id", "is", null)
    .eq("sync_status", "synced");
  let paymentQuery = supabase
    .from("finance_invoice_payments")
    .select("id, invoice_id, employer_id, payment_month, usd_inr_rate");
  let allocationQuery = supabase
    .from("finance_payroll_allocations")
    .select("id, salary_payment_id, allocation_source");

  if (employerId) {
    salaryQuery = salaryQuery.eq("employer_id", employerId);
    lineItemQuery = lineItemQuery.eq("employer_id", employerId);
    paymentQuery = paymentQuery.eq("employer_id", employerId);
    allocationQuery = allocationQuery.eq("employer_id", employerId);
  }
  if (employeeId) {
    salaryQuery = salaryQuery.eq("employee_id", employeeId);
    lineItemQuery = lineItemQuery.eq("employee_id", employeeId);
    allocationQuery = allocationQuery.eq("employee_id", employeeId);
  }
  if (payrollMonth) {
    salaryQuery = salaryQuery.eq("month_key", payrollMonth);
    allocationQuery = allocationQuery.eq("payroll_month", payrollMonth);
  }

  const [{ data: salaryPayments }, { data: lineItems }, { data: payments }, { data: existingAllocations }] = await Promise.all([
    salaryQuery,
    lineItemQuery,
    paymentQuery,
    allocationQuery,
  ]);

  const drafts = inferPayrollAllocations({
    salaryPayments: salaryPayments ?? [],
    lineItems: lineItems ?? [],
    payments: payments ?? [],
    existingAllocations: existingAllocations ?? [],
  });

  if (drafts.length) {
    const { error } = await supabase.from("finance_payroll_allocations").upsert(
      drafts.map((draft) => ({
        ...draft,
        created_by: session.user.id,
        updated_by: session.user.id,
      })),
      { onConflict: "source_key,salary_payment_id" },
    );
    if (error) throw new Error(error.message);
  }

  await supabase.from("audit_events").insert({
    actor_user_id: session.user.id,
    action: "infer_finance_payroll_allocations",
    entity_type: "finance_payroll_allocation",
    metadata: { count: drafts.length, employerId, employeeId, payrollMonth },
  });

  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/worktree");
}

export async function updateFinancePayrollAllocationAction(formData: FormData) {
  const session = await requireAdmin();
  const allocationId = value(formData, "allocationId");
  const invoicePaymentId = value(formData, "invoicePaymentId");
  const allocatedUsdCents = numberValue(formData, "allocatedUsdCents");
  const manualRate = value(formData, "cashoutRateOverride");
  const overrideReason = value(formData, "overrideReason");

  if (!allocationId) {
    throw new Error("Allocation is required.");
  }

  const supabase = getSupabaseAdmin() as any;
  const { data: allocation, error: allocationError } = await supabase
    .from("finance_payroll_allocations")
    .select("*")
    .eq("id", allocationId)
    .single();
  if (allocationError) throw new Error(allocationError.message);

  let payment = null;
  if (invoicePaymentId) {
    const { data, error } = await supabase
      .from("finance_invoice_payments")
      .select("*, finance_invoices(id, month_key)")
      .eq("id", invoicePaymentId)
      .single();
    if (error) throw new Error(error.message);
    payment = data;
  }

  const invoice = payment ? (Array.isArray(payment.finance_invoices) ? payment.finance_invoices[0] : payment.finance_invoices) : null;
  const cashout = refreshAllocationCashout({
    paymentRate: payment?.usd_inr_rate ?? allocation.cashout_rate,
    manualRate,
    overrideReason,
  });
  const payload = {
    invoice_payment_id: invoicePaymentId ?? allocation.invoice_payment_id,
    invoice_id: payment?.invoice_id ?? allocation.invoice_id,
    invoice_month: invoice?.month_key ?? allocation.invoice_month,
    paid_month: payment?.payment_month ?? allocation.paid_month,
    allocated_usd_cents: allocatedUsdCents ?? allocation.allocated_usd_cents,
    cashout_rate: cashout.cashout_rate,
    cashout_rate_source: cashout.cashout_rate_source,
    override_reason: cashout.override_reason,
    allocation_source: "manual",
    updated_by: session.user.id,
  };

  const { error } = await supabase
    .from("finance_payroll_allocations")
    .update(payload)
    .eq("id", allocationId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_events").insert({
    actor_user_id: session.user.id,
    action: "update_finance_payroll_allocation",
    entity_type: "finance_payroll_allocation",
    entity_id: allocationId,
    metadata: {
      invoicePaymentId: payload.invoice_payment_id,
      allocatedUsdCents: payload.allocated_usd_cents,
      cashoutRate: payload.cashout_rate,
      cashoutRateSource: payload.cashout_rate_source,
      overrideReason: payload.override_reason,
    },
  });

  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/worktree");
}
