import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const employeeSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  fullName: z.string().min(1),
  email: nullableString,
  designation: nullableString,
});

const invoiceSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  billingDate: nullableString,
  dueDate: nullableString,
  status: z.string().min(1),
  noteText: nullableString,
  subtotalUsdCents: z.number().int().default(0),
  adjustmentsUsdCents: z.number().int().default(0),
  grandTotalUsdCents: z.number().int().default(0),
  pdfPath: nullableString,
});

const lineItemSchema = z.object({
  id: z.string().min(1),
  invoiceId: z.string().min(1),
  employeeId: z.string().min(1),
  employeeNameSnapshot: z.string().min(1),
  designationSnapshot: nullableString,
  teamNameSnapshot: nullableString,
  billingRateUsdCents: z.number().int().default(0),
  payoutMonthlyUsdCentsSnapshot: z.number().int().default(0),
  hrsPerWeek: nullableNumber,
  daysWorked: z.number().int().nullable().optional(),
  billedTotalUsdCents: z.number().int().default(0),
  payoutTotalUsdCents: z.number().int().default(0),
  profitTotalUsdCents: z.number().int().default(0),
});

const invoicePaymentSchema = z.object({
  id: z.string().min(1),
  invoiceId: z.string().min(1),
  companyId: z.string().min(1),
  paymentDate: nullableString,
  paymentMonth: z.string().regex(/^\d{4}-\d{2}$/),
  usdInrRate: z.number().default(0),
  notes: nullableString,
});

const salaryPaymentSchema = z.object({
  id: z.string().min(1),
  employeeId: z.string().min(1),
  companyId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  salaryUsdCents: z.number().int().default(0),
  paidUsdInrRate: z.number().default(0),
  salaryPaidInrCents: z.number().int().default(0),
  pfInrCents: z.number().int().default(0),
  tdsInrCents: z.number().int().default(0),
  actualPaidInrCents: z.number().int().default(0),
  paidStatus: z.boolean().default(false),
  paidDate: nullableString,
  notes: nullableString,
});

const statementRowSchema = z.object({
  id: z.string().min(1),
  employeeId: z.string().min(1),
  invoiceId: z.string().min(1),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  employeeNameSnapshot: z.string().min(1),
  invoiceNumberSnapshot: z.string().min(1),
  dollarInwardUsdCents: z.number().int().default(0),
  onboardingAdvanceUsdCents: z.number().int().default(0),
  reimbursementUsdCents: z.number().int().default(0),
  reimbursementLabelsText: z.string().default(""),
  appraisalAdvanceUsdCents: z.number().int().default(0),
  offboardingDeductionUsdCents: z.number().int().default(0),
});

const statementSummarySchema = z.object({
  id: z.string().min(1),
  employeeId: z.string().min(1),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  monthLabelSnapshot: z.string().min(1),
  effectiveDollarInwardUsdCents: z.number().int().default(0),
  monthlyDollarPaidUsdCents: z.number().int().default(0),
});

export const financeSyncPayloadSchema = z.object({
  source: z.literal("invoice_generator").default("invoice_generator"),
  syncedAt: z.string().optional(),
  company: companySchema,
  employees: z.array(employeeSchema).default([]),
  invoice: invoiceSchema,
  lineItems: z.array(lineItemSchema).default([]),
  invoicePayments: z.array(invoicePaymentSchema).default([]),
  salaryPayments: z.array(salaryPaymentSchema).default([]),
  statementRows: z.array(statementRowSchema).default([]),
  statementSummaries: z.array(statementSummarySchema).default([]),
});

export type FinanceSyncPayload = z.infer<typeof financeSyncPayloadSchema>;

type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  unmappedCompanies: Array<{ externalCompanyId: string; name: string }>;
  unmappedEmployees: Array<{ externalEmployeeId: string; name: string; externalCompanyId: string }>;
  errors: string[];
};

function monthKey(invoice: FinanceSyncPayload["invoice"]) {
  return `${invoice.year}-${String(invoice.month).padStart(2, "0")}`;
}

async function upsertOne(supabase: any, table: string, payload: Record<string, unknown>, onConflict: string) {
  const { data: existing } = await supabase.from(table).select("id").match(
    Object.fromEntries(onConflict.split(",").map((key) => [key.trim(), payload[key.trim()]])),
  ).maybeSingle();

  const { error } = await supabase.from(table).upsert(payload, { onConflict });
  if (error) throw error;
  return existing ? "updated" : "created";
}

function count(result: SyncResult, status: "created" | "updated" | "skipped") {
  result[status] += 1;
}

export async function syncInvoiceGeneratorFinance(rawPayload: unknown): Promise<SyncResult> {
  const payload = financeSyncPayloadSchema.parse(rawPayload);
  const supabase = getSupabaseAdmin() as any;
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, unmappedCompanies: [], unmappedEmployees: [], errors: [] };

  await supabase.from("finance_sync_sources").upsert({
    source_key: payload.source,
    display_name: "Invoice Generator",
  }, { onConflict: "source_key" });

  const { data: existingCompanyMapping } = await supabase
    .from("finance_company_mappings")
    .select("id, employer_id")
    .eq("source_key", payload.source)
    .eq("external_company_id", payload.company.id)
    .maybeSingle();

  const companyMappingPayload = {
    source_key: payload.source,
    external_company_id: payload.company.id,
    external_company_name: payload.company.name,
    employer_id: existingCompanyMapping?.employer_id ?? null,
  };
  count(result, await upsertOne(supabase, "finance_company_mappings", companyMappingPayload, "source_key,external_company_id") as "created" | "updated");

  const employerId = existingCompanyMapping?.employer_id ?? null;
  if (!employerId) {
    result.unmappedCompanies.push({ externalCompanyId: payload.company.id, name: payload.company.name });
  }

  const employeeMappings = new Map<string, { employee_id: string | null; employer_id: string | null }>();
  for (const employee of payload.employees) {
    const { data: existingEmployeeMapping } = await supabase
      .from("finance_employee_mappings")
      .select("id, employee_id, employer_id")
      .eq("source_key", payload.source)
      .eq("external_employee_id", employee.id)
      .maybeSingle();

    const mappingPayload = {
      source_key: payload.source,
      external_employee_id: employee.id,
      external_company_id: employee.companyId,
      external_employee_name: employee.fullName,
      external_employee_email: employee.email ?? null,
      employer_id: existingEmployeeMapping?.employer_id ?? employerId,
      employee_id: existingEmployeeMapping?.employee_id ?? null,
    };
    count(result, await upsertOne(supabase, "finance_employee_mappings", mappingPayload, "source_key,external_employee_id") as "created" | "updated");
    employeeMappings.set(employee.id, { employee_id: mappingPayload.employee_id, employer_id: mappingPayload.employer_id });

    if (!mappingPayload.employee_id) {
      result.unmappedEmployees.push({ externalEmployeeId: employee.id, name: employee.fullName, externalCompanyId: employee.companyId });
    }
  }

  const invoiceSyncStatus = employerId ? "synced" : "needs_mapping";
  count(result, await upsertOne(supabase, "finance_invoices", {
    source_key: payload.source,
    external_invoice_id: payload.invoice.id,
    external_company_id: payload.invoice.companyId,
    employer_id: employerId,
    invoice_number: payload.invoice.invoiceNumber,
    month: payload.invoice.month,
    year: payload.invoice.year,
    month_key: monthKey(payload.invoice),
    billing_date: payload.invoice.billingDate ?? null,
    due_date: payload.invoice.dueDate ?? null,
    status: payload.invoice.status,
    last_source_status: payload.invoice.status,
    last_status_synced_at: new Date().toISOString(),
    ...(payload.invoice.status === "received" ? { payment_received_at: new Date().toISOString() } : {}),
    note_text: payload.invoice.noteText ?? null,
    subtotal_usd_cents: payload.invoice.subtotalUsdCents,
    adjustments_usd_cents: payload.invoice.adjustmentsUsdCents,
    grand_total_usd_cents: payload.invoice.grandTotalUsdCents,
    pdf_path: payload.invoice.pdfPath ?? null,
    sync_status: invoiceSyncStatus,
    synced_at: new Date().toISOString(),
  }, "source_key,external_invoice_id") as "created" | "updated");

  const { data: invoiceRow } = await supabase
    .from("finance_invoices")
    .select("id")
    .eq("source_key", payload.source)
    .eq("external_invoice_id", payload.invoice.id)
    .single();

  for (const lineItem of payload.lineItems) {
    const mapped = employeeMappings.get(lineItem.employeeId);
    count(result, await upsertOne(supabase, "finance_invoice_line_items", {
      source_key: payload.source,
      external_line_item_id: lineItem.id,
      invoice_id: invoiceRow.id,
      external_invoice_id: lineItem.invoiceId,
      external_employee_id: lineItem.employeeId,
      employer_id: mapped?.employer_id ?? employerId,
      employee_id: mapped?.employee_id ?? null,
      employee_name_snapshot: lineItem.employeeNameSnapshot,
      designation_snapshot: lineItem.designationSnapshot ?? null,
      team_name_snapshot: lineItem.teamNameSnapshot ?? null,
      billing_rate_usd_cents: lineItem.billingRateUsdCents,
      payout_monthly_usd_cents_snapshot: lineItem.payoutMonthlyUsdCentsSnapshot,
      hrs_per_week: lineItem.hrsPerWeek ?? null,
      days_worked: lineItem.daysWorked ?? null,
      billed_total_usd_cents: lineItem.billedTotalUsdCents,
      payout_total_usd_cents: lineItem.payoutTotalUsdCents,
      profit_total_usd_cents: lineItem.profitTotalUsdCents,
      sync_status: mapped?.employee_id ? "synced" : "needs_mapping",
    }, "source_key,external_line_item_id") as "created" | "updated");
  }

  for (const payment of payload.invoicePayments) {
    count(result, await upsertOne(supabase, "finance_invoice_payments", {
      source_key: payload.source,
      external_payment_id: payment.id,
      invoice_id: invoiceRow.id,
      external_invoice_id: payment.invoiceId,
      external_company_id: payment.companyId,
      employer_id: employerId,
      payment_date: payment.paymentDate ?? null,
      payment_month: payment.paymentMonth,
      usd_inr_rate: payment.usdInrRate,
      notes: payment.notes ?? null,
    }, "source_key,external_payment_id") as "created" | "updated");
  }

  for (const salary of payload.salaryPayments) {
    const mapped = employeeMappings.get(salary.employeeId);
    count(result, await upsertOne(supabase, "finance_employee_salary_payments", {
      source_key: payload.source,
      external_salary_payment_id: salary.id,
      external_employee_id: salary.employeeId,
      external_company_id: salary.companyId,
      employer_id: mapped?.employer_id ?? employerId,
      employee_id: mapped?.employee_id ?? null,
      month_key: salary.month,
      salary_usd_cents: salary.salaryUsdCents,
      paid_usd_inr_rate: salary.paidUsdInrRate,
      salary_paid_inr_cents: salary.salaryPaidInrCents,
      pf_inr_cents: salary.pfInrCents,
      tds_inr_cents: salary.tdsInrCents,
      actual_paid_inr_cents: salary.actualPaidInrCents || salary.salaryPaidInrCents,
      paid_status: salary.paidStatus,
      paid_date: salary.paidDate ?? null,
      notes: salary.notes ?? null,
      sync_status: mapped?.employee_id ? "synced" : "needs_mapping",
    }, "source_key,external_salary_payment_id") as "created" | "updated");
  }

  for (const row of payload.statementRows) {
    const mapped = employeeMappings.get(row.employeeId);
    count(result, await upsertOne(supabase, "finance_employee_statement_rows", {
      source_key: payload.source,
      external_statement_row_id: row.id,
      external_employee_id: row.employeeId,
      external_invoice_id: row.invoiceId,
      employee_id: mapped?.employee_id ?? null,
      invoice_id: invoiceRow.id,
      month_key: row.monthKey,
      employee_name_snapshot: row.employeeNameSnapshot,
      invoice_number_snapshot: row.invoiceNumberSnapshot,
      dollar_inward_usd_cents: row.dollarInwardUsdCents,
      onboarding_advance_usd_cents: row.onboardingAdvanceUsdCents,
      reimbursement_usd_cents: row.reimbursementUsdCents,
      reimbursement_labels_text: row.reimbursementLabelsText,
      appraisal_advance_usd_cents: row.appraisalAdvanceUsdCents,
      offboarding_deduction_usd_cents: row.offboardingDeductionUsdCents,
      sync_status: mapped?.employee_id ? "synced" : "needs_mapping",
    }, "source_key,external_statement_row_id") as "created" | "updated");
  }

  for (const summary of payload.statementSummaries) {
    const mapped = employeeMappings.get(summary.employeeId);
    count(result, await upsertOne(supabase, "finance_employee_statement_summaries", {
      source_key: payload.source,
      external_statement_summary_id: summary.id,
      external_employee_id: summary.employeeId,
      employee_id: mapped?.employee_id ?? null,
      month_key: summary.monthKey,
      month_label_snapshot: summary.monthLabelSnapshot,
      effective_dollar_inward_usd_cents: summary.effectiveDollarInwardUsdCents,
      monthly_dollar_paid_usd_cents: summary.monthlyDollarPaidUsdCents,
      sync_status: mapped?.employee_id ? "synced" : "needs_mapping",
    }, "source_key,external_statement_summary_id") as "created" | "updated");
  }

  const status = result.unmappedCompanies.length || result.unmappedEmployees.length ? "needs_mapping" : "synced";
  await supabase.from("finance_sync_runs").insert({
    source_key: payload.source,
    external_invoice_id: payload.invoice.id,
    status,
    result,
  });
  await supabase.from("audit_events").insert({
    action: "finance_sync",
    entity_type: "finance_invoice",
    metadata: { source: payload.source, externalInvoiceId: payload.invoice.id, status, result },
  });

  return result;
}
