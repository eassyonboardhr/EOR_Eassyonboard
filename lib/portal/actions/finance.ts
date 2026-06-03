"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePortalRole, isPlatformAdmin } from "@/lib/portal/session";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
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
