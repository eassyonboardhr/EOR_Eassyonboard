"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

export type ImportResult = {
  employerId: string;
  createdEmployer: boolean;
  linkedEmployer: boolean;
  createdEmployees: number;
  linkedEmployees: number;
  invitedEmployees: number;
  skippedEmployees: Array<{ externalEmployeeId: string; name: string; reason: string }>;
};

async function appUrl(path: string) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configuredOrigin) {
    return new URL(path, configuredOrigin.startsWith("http") ? configuredOrigin : `https://${configuredOrigin}`).toString();
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    throw new Error("Could not determine application URL for invitation.");
  }
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return new URL(path, `${proto}://${host}`).toString();
}

function selectedEmployeeIds(formData: FormData) {
  return new Set(formData.getAll("selected_external_employee_id").map(String).filter(Boolean));
}

function employeeEmail(formData: FormData, externalEmployeeId: string) {
  const raw = formData.get(`employee_email_${externalEmployeeId}`);
  return typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : null;
}

function existingEmployeeId(formData: FormData, externalEmployeeId: string) {
  const raw = formData.get(`existing_employee_id_${externalEmployeeId}`);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function requireAdminSession() {
  const session = await requirePortalRole(["super_admin", "admin"]);
  if (!isPlatformAdmin(session.user.role)) {
    throw new Error("Admin access is required.");
  }
  return session;
}

async function propagateCompanyMapping(supabase: any, sourceKey: string, externalCompanyId: string, employerId: string) {
  const { data: invoices } = await supabase
    .from("finance_invoices")
    .select("external_invoice_id")
    .eq("source_key", sourceKey)
    .eq("external_company_id", externalCompanyId);
  const invoiceIds = (invoices ?? []).map((invoice: any) => invoice.external_invoice_id).filter(Boolean);

  await Promise.all([
    supabase.from("finance_company_mappings").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    supabase.from("finance_employee_mappings").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId).is("employer_id", null),
    supabase.from("finance_invoices").update({ employer_id: employerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    supabase.from("finance_invoice_payments").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
    invoiceIds.length
      ? supabase.from("finance_invoice_line_items").update({ employer_id: employerId }).eq("source_key", sourceKey).in("external_invoice_id", invoiceIds)
      : Promise.resolve(),
    supabase.from("finance_employee_salary_payments").update({ employer_id: employerId }).eq("source_key", sourceKey).eq("external_company_id", externalCompanyId),
  ]);
}

async function propagateEmployeeMapping(supabase: any, sourceKey: string, externalEmployeeId: string, employeeId: string, employerId: string) {
  await Promise.all([
    supabase.from("finance_employee_mappings").update({ employee_id: employeeId, employer_id: employerId }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_invoice_line_items").update({ employee_id: employeeId, employer_id: employerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_salary_payments").update({ employee_id: employeeId, employer_id: employerId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_statement_rows").update({ employee_id: employeeId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
    supabase.from("finance_employee_statement_summaries").update({ employee_id: employeeId, sync_status: "synced" }).eq("source_key", sourceKey).eq("external_employee_id", externalEmployeeId),
  ]);
}

async function sendEmployerInvite(email: string, employerId: string) {
  const clerk = await clerkClient();
  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: await appUrl("/sign-up"),
    notify: true,
    ignoreExisting: true,
    publicMetadata: {
      portalRole: "employer_admin",
      employerId,
      source: "invoice_generator_import",
    },
  });
}

async function sendEmployeeInvite(email: string, employerId: string, employeeId: string) {
  const clerk = await clerkClient();
  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: await appUrl("/sign-up"),
    notify: true,
    ignoreExisting: true,
    publicMetadata: {
      portalRole: "employee",
      employerId,
      employeeId,
      source: "invoice_generator_import",
    },
  });
}

export async function importInvoiceGeneratorCompanyAction(formData: FormData): Promise<ImportResult> {
  const session = await requireAdminSession();
  const sourceKey = optionalString(formData, "source_key") ?? "invoice_generator";
  const externalCompanyId = requireString(formData, "external_company_id");
  const employerMode = requireString(formData, "employer_mode");
  const existingEmployerId = optionalString(formData, "existing_employer_id");
  const employerAdminEmail = optionalString(formData, "employer_admin_email")?.toLowerCase() ?? null;
  const selectedEmployees = selectedEmployeeIds(formData);
  const supabase = getSupabaseAdmin() as any;

  const { data: companyMapping, error: mappingError } = await supabase
    .from("finance_company_mappings")
    .select("*")
    .eq("source_key", sourceKey)
    .eq("external_company_id", externalCompanyId)
    .single();
  if (mappingError || !companyMapping) {
    throw new Error(mappingError?.message ?? "Company import row not found.");
  }

  let employerId = existingEmployerId ?? companyMapping.employer_id;
  let createdEmployer = false;
  let linkedEmployer = false;

  if (employerMode === "create") {
    if (!employerAdminEmail) {
      throw new Error("Employer admin email is required.");
    }
    if (!employerId) {
      const { data: employer, error } = await supabase.from("employers").insert({
        name: companyMapping.external_company_name,
        contact_email: employerAdminEmail,
        status: "pending",
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
      }).select("id").single();
      if (error || !employer) {
        throw new Error(error?.message ?? "Could not create employer.");
      }
      employerId = employer.id;
      createdEmployer = true;
    }
  } else if (employerMode === "link") {
    if (!employerId) {
      throw new Error("Select an employer to link.");
    }
    linkedEmployer = true;
  } else {
    throw new Error("Choose whether to create or link an employer.");
  }

  await propagateCompanyMapping(supabase, sourceKey, externalCompanyId, employerId);

  if (employerAdminEmail) {
    await sendEmployerInvite(employerAdminEmail, employerId);
  }

  const { data: mappings } = await supabase
    .from("finance_employee_mappings")
    .select("*")
    .eq("source_key", sourceKey)
    .eq("external_company_id", externalCompanyId);

  const result: ImportResult = {
    employerId,
    createdEmployer,
    linkedEmployer,
    createdEmployees: 0,
    linkedEmployees: 0,
    invitedEmployees: 0,
    skippedEmployees: [],
  };

  for (const mapping of mappings ?? []) {
    if (!selectedEmployees.has(mapping.external_employee_id)) continue;
    const email = employeeEmail(formData, mapping.external_employee_id) ?? mapping.external_employee_email?.toLowerCase() ?? null;
    const existingId = existingEmployeeId(formData, mapping.external_employee_id);
    if (!email && !existingId) {
      result.skippedEmployees.push({
        externalEmployeeId: mapping.external_employee_id,
        name: mapping.external_employee_name,
        reason: "Missing employee email.",
      });
      continue;
    }

    let employeeId = existingId ?? mapping.employee_id;
    if (employeeId) {
      result.linkedEmployees += 1;
    } else {
      const { data: employee, error } = await supabase.from("employees").insert({
        employer_id: employerId,
        email,
        full_name: mapping.external_employee_name,
        job_title: null,
        department: null,
        status: "pending",
        lifecycle_status: "onboarding",
      }).select("id").single();
      if (error || !employee) {
        throw new Error(error?.message ?? `Could not create employee ${mapping.external_employee_name}.`);
      }
      employeeId = employee.id;
      result.createdEmployees += 1;
      await Promise.all([
        supabase.from("employee_onboarding_status").upsert({ employee_id: employeeId, status: "Draft" }, { onConflict: "employee_id" }),
        supabase.from("employee_onboarding_progress").upsert({ employee_id: employeeId, current_step: "Personal", completed_steps: [], completion_percentage: 0 }, { onConflict: "employee_id" }),
      ]);
    }

    await propagateEmployeeMapping(supabase, sourceKey, mapping.external_employee_id, employeeId, employerId);

    if (email) {
      await sendEmployeeInvite(email, employerId, employeeId);
      result.invitedEmployees += 1;
    }
  }

  await writeAudit(session.user, "import_invoice_generator_company", "finance_company_mapping", companyMapping.id, {
    sourceKey,
    externalCompanyId,
    result,
  });

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard/finances");
  revalidatePath("/dashboard/imports/finance-reconciliation");
  revalidatePath("/dashboard/imports/finance-reconciliation/mapping");
  revalidatePath("/dashboard/employers");
  revalidatePath("/dashboard/employees");

  return result;
}

export async function skipOnboardingDocumentsAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const targetType = requireString(formData, "target_type");
  const targetId = requireString(formData, "target_id");

  await writeAudit(session.user, "skip_onboarding_documents", targetType, targetId, {
    source: "onboarding_document_step",
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/documents");
}
