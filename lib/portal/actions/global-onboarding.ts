"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { booleanValue, numberValue, optionalString, requireString } from "@/lib/portal/form";
import { isPlatformAdmin, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";
import {
  customFieldSchema,
  employeeOnboardingSchema,
  employerOnboardingSchema,
  templateSchema,
} from "@/lib/portal/global-onboarding-schema";
import { onboardingCompletionPercentage } from "@/lib/portal/global-onboarding";

function nullable(value: string | null | undefined) {
  return value && value.length > 0 ? value : null;
}

function fileNameSafe(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveEmployerOnboardingAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const parsed = employerOnboardingSchema.parse({
    company_name: requireString(formData, "company_name"),
    trading_name: optionalString(formData, "trading_name"),
    country: requireString(formData, "country"),
    registration_number: requireString(formData, "registration_number"),
    registration_type: optionalString(formData, "registration_type"),
    website: requireString(formData, "website"),
    industry: requireString(formData, "industry"),
    employee_count: optionalString(formData, "employee_count"),
    primary_name: requireString(formData, "primary_name"),
    primary_designation: optionalString(formData, "primary_designation"),
    primary_email: requireString(formData, "primary_email"),
    primary_phone: optionalString(formData, "primary_phone"),
    primary_timezone: requireString(formData, "primary_timezone"),
    signatory_same_as_primary: booleanValue(formData, "signatory_same_as_primary"),
    signatory_name: optionalString(formData, "signatory_name"),
    signatory_designation: optionalString(formData, "signatory_designation"),
    signatory_email: optionalString(formData, "signatory_email"),
    signatory_phone: optionalString(formData, "signatory_phone"),
    billing_contact_name: requireString(formData, "billing_contact_name"),
    billing_contact_email: requireString(formData, "billing_contact_email"),
    billing_contact_phone: optionalString(formData, "billing_contact_phone"),
    accounts_email: optionalString(formData, "accounts_email"),
    currency: requireString(formData, "currency"),
    payment_terms: requireString(formData, "payment_terms"),
    working_hours: requireString(formData, "working_hours"),
    notice_period: requireString(formData, "notice_period"),
    probation_period: requireString(formData, "probation_period"),
    leave_policy: requireString(formData, "leave_policy"),
    work_mode: requireString(formData, "work_mode"),
    nda_required: booleanValue(formData, "nda_required"),
    background_check_required: booleanValue(formData, "background_check_required"),
    equipment_required: booleanValue(formData, "equipment_required"),
    handles_customer_data: booleanValue(formData, "handles_customer_data"),
  });

  const supabase = getSupabaseAdmin();
  const companyId = optionalString(formData, "company_id");
  const companyPayload = {
    employer_id: session.user.employer_id,
    company_name: parsed.company_name,
    trading_name: nullable(parsed.trading_name),
    country: parsed.country,
    registration_number: parsed.registration_number,
    registration_type: nullable(parsed.registration_type),
    website: parsed.website,
    industry: parsed.industry,
    employee_count: parsed.employee_count ?? null,
    onboarding_status: "submitted",
    created_by: session.user.id,
  };

  const { data: company, error } = companyId
    ? await supabase.from("client_companies").update(companyPayload).eq("id", companyId).select("id").single()
    : await supabase.from("client_companies").insert(companyPayload).select("id").single();

  if (error || !company) throw new Error(error?.message ?? "Could not save company onboarding.");

  const signatory = parsed.signatory_same_as_primary
    ? {
        name: parsed.primary_name,
        designation: parsed.primary_designation,
        email: parsed.primary_email,
        phone: parsed.primary_phone,
      }
    : {
        name: parsed.signatory_name ?? "",
        designation: parsed.signatory_designation,
        email: parsed.signatory_email ?? "",
        phone: parsed.signatory_phone,
      };

  await supabase.from("client_contacts").delete().eq("company_id", company.id);
  await supabase.from("client_contacts").insert([
    {
      company_id: company.id,
      contact_type: "primary_contact",
      name: parsed.primary_name,
      designation: parsed.primary_designation,
      email: parsed.primary_email,
      phone: parsed.primary_phone,
      timezone: parsed.primary_timezone,
    },
    {
      company_id: company.id,
      contact_type: "signatory",
      name: signatory.name,
      designation: signatory.designation,
      email: signatory.email,
      phone: signatory.phone,
    },
  ]);

  await supabase.from("client_billing_settings").upsert({
    company_id: company.id,
    billing_contact_name: parsed.billing_contact_name,
    billing_contact_email: parsed.billing_contact_email,
    billing_contact_phone: parsed.billing_contact_phone,
    accounts_email: parsed.accounts_email,
    currency: parsed.currency,
    payment_terms: parsed.payment_terms,
  }, { onConflict: "company_id" });

  await supabase.from("client_employment_defaults").upsert({
    company_id: company.id,
    working_hours: parsed.working_hours,
    notice_period: parsed.notice_period,
    probation_period: parsed.probation_period,
    leave_policy: parsed.leave_policy,
    work_mode: parsed.work_mode,
  }, { onConflict: "company_id" });

  await supabase.from("client_compliance_settings").upsert({
    company_id: company.id,
    nda_required: parsed.nda_required,
    background_check_required: parsed.background_check_required,
    equipment_required: parsed.equipment_required,
    handles_customer_data: parsed.handles_customer_data,
  }, { onConflict: "company_id" });

  await writeAudit(session.user, "save_client_company_onboarding", "client_company", company.id);
  revalidatePath("/dashboard/onboarding");
}

export async function reviewClientCompanyAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const companyId = requireString(formData, "company_id");
  const decision = requireString(formData, "decision");
  if (decision !== "approved" && decision !== "needs_correction" && decision !== "rejected") {
    throw new Error("Invalid company onboarding decision.");
  }

  const supabase = getSupabaseAdmin();
  await supabase
    .from("client_companies")
    .update({
      onboarding_status: decision,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      review_remarks: optionalString(formData, "review_remarks"),
    })
    .eq("id", companyId);

  await writeAudit(session.user, `review_client_company_${decision}`, "client_company", companyId);
  revalidatePath("/dashboard/onboarding");
}

export async function saveEmployeeSelfOnboardingAction(formData: FormData) {
  const session = await requirePortalRole(["employee"]);
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, email")
    .eq("portal_user_id", session.user.id)
    .single();

  if (!employee) throw new Error("Employee profile is not linked.");

  const parsed = employeeOnboardingSchema.parse({
    full_name: requireString(formData, "full_name"),
    father_name: requireString(formData, "father_name"),
    date_of_birth: requireString(formData, "date_of_birth"),
    gender: requireString(formData, "gender"),
    email: requireString(formData, "email"),
    phone: requireString(formData, "phone"),
    alternate_phone: optionalString(formData, "alternate_phone"),
    linkedin_url: optionalString(formData, "linkedin_url") ?? "",
    github_url: optionalString(formData, "github_url") ?? "",
    portfolio_url: optionalString(formData, "portfolio_url") ?? "",
    current_address: requireString(formData, "current_address"),
    permanent_address: requireString(formData, "permanent_address"),
    state: requireString(formData, "state"),
    city: requireString(formData, "city"),
    postal_code: requireString(formData, "postal_code"),
    emergency_contact_name: requireString(formData, "emergency_contact_name"),
    emergency_relationship: requireString(formData, "emergency_relationship"),
    emergency_phone: requireString(formData, "emergency_phone"),
    aadhaar_number: requireString(formData, "aadhaar_number"),
    pan_number: requireString(formData, "pan_number"),
    passport_number: optionalString(formData, "passport_number"),
    account_holder_name: requireString(formData, "account_holder_name"),
    account_number: requireString(formData, "account_number"),
    ifsc_code: requireString(formData, "ifsc_code"),
    bank_name: requireString(formData, "bank_name"),
    branch_name: optionalString(formData, "branch_name"),
    qualification: requireString(formData, "qualification"),
    institution: requireString(formData, "institution"),
    year_of_passing: requireString(formData, "year_of_passing"),
    is_fresher: booleanValue(formData, "is_fresher"),
    total_experience: optionalString(formData, "total_experience"),
    previous_company: optionalString(formData, "previous_company"),
    previous_designation: optionalString(formData, "previous_designation"),
  });

  await supabase.from("employee_profiles").upsert({
    employee_id: employee.id,
    user_id: session.user.id,
    full_name: parsed.full_name,
    father_name: parsed.father_name,
    date_of_birth: parsed.date_of_birth,
    gender: parsed.gender,
    email: parsed.email,
    phone: parsed.phone,
    alternate_phone: parsed.alternate_phone,
    linkedin_url: nullable(parsed.linkedin_url),
    github_url: nullable(parsed.github_url),
    portfolio_url: nullable(parsed.portfolio_url),
  }, { onConflict: "employee_id" });

  await supabase.from("employee_addresses").delete().eq("employee_id", employee.id);
  await supabase.from("employee_addresses").insert({
    employee_id: employee.id,
    current_address: parsed.current_address,
    permanent_address: parsed.permanent_address,
    state: parsed.state,
    city: parsed.city,
    postal_code: parsed.postal_code,
  });

  await supabase.from("employee_emergency_contacts").delete().eq("employee_id", employee.id);
  await supabase.from("employee_emergency_contacts").insert({
    employee_id: employee.id,
    contact_name: parsed.emergency_contact_name,
    relationship: parsed.emergency_relationship,
    phone: parsed.emergency_phone,
  });

  await supabase.from("employee_identity_details").upsert({
    employee_id: employee.id,
    aadhaar_number: parsed.aadhaar_number,
    pan_number: parsed.pan_number,
    passport_number: parsed.passport_number,
  }, { onConflict: "employee_id" });

  await supabase.from("employee_bank_details").upsert({
    employee_id: employee.id,
    account_holder_name: parsed.account_holder_name,
    account_number: parsed.account_number,
    ifsc_code: parsed.ifsc_code,
    bank_name: parsed.bank_name,
    branch_name: parsed.branch_name,
  }, { onConflict: "employee_id" });

  await supabase.from("employee_education").delete().eq("employee_id", employee.id);
  await supabase.from("employee_education").insert({
    employee_id: employee.id,
    qualification: parsed.qualification,
    institution: parsed.institution,
    year_of_passing: parsed.year_of_passing,
  });

  await supabase.from("employee_experience").upsert({
    employee_id: employee.id,
    is_fresher: parsed.is_fresher,
    total_experience: parsed.is_fresher ? null : parsed.total_experience,
    previous_company: parsed.is_fresher ? null : parsed.previous_company,
    previous_designation: parsed.is_fresher ? null : parsed.previous_designation,
  }, { onConflict: "employee_id" });

  const completion = onboardingCompletionPercentage({
    personal: true,
    address: true,
    emergency: true,
    identity: true,
    bank: true,
    education: true,
    experience: true,
  });

  await supabase.from("employee_onboarding_progress").upsert({
    employee_id: employee.id,
    completion_percentage: completion,
    current_step: "document_uploads",
    last_updated: new Date().toISOString(),
  }, { onConflict: "employee_id" });

  await supabase.from("employee_onboarding_status").upsert({
    employee_id: employee.id,
    status: "Submitted",
  }, { onConflict: "employee_id" });

  await writeAudit(session.user, "save_employee_self_onboarding", "employee", employee.id);
  revalidatePath("/dashboard/onboarding");
}

export async function reviewEmployeeOnboardingAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const employeeId = requireString(formData, "employee_id");
  const decision = requireString(formData, "decision");
  if (!["Approved", "Rejected", "Needs Correction"].includes(decision)) {
    throw new Error("Invalid employee onboarding decision.");
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("employee_onboarding_status").upsert({
    employee_id: employeeId,
    status: decision,
    reviewed_by: session.user.id,
    reviewed_at: new Date().toISOString(),
    remarks: optionalString(formData, "remarks"),
  }, { onConflict: "employee_id" });

  if (decision === "Approved") {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, full_name, employer_id")
      .eq("id", employeeId)
      .single();

    await supabase.from("employees").update({ status: "active", lifecycle_status: "active" }).eq("id", employeeId);

    if (employee) {
      const { data: employerUsers } = await supabase
        .from("portal_users")
        .select("id")
        .eq("role", "employer_admin")
        .eq("status", "active")
        .eq("employer_id", employee.employer_id);

      if ((employerUsers ?? []).length > 0) {
        const { data: notice } = await supabase
          .from("notices")
          .insert({
            sender_id: session.user.id,
            employer_id: employee.employer_id,
            title: "Employee onboarding verified",
            body: `${employee.full_name} has been verified. Please update their team, manager, leave policy, and notice period details from Employer Onboarding > Employee Setup.`,
            priority: "important",
            requires_acknowledgement: true,
          })
          .select("id")
          .single();

        if (notice) {
          await supabase.from("notice_recipients").insert(
            (employerUsers ?? []).map((recipient) => ({
              notice_id: notice.id,
              recipient_user_id: recipient.id,
            })),
          );
        }
      }
    }
  }

  await writeAudit(session.user, `review_employee_onboarding_${decision}`, "employee", employeeId);
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/worktree");
}

export async function saveEmployeeEmployerSetupAction(formData: FormData) {
  const session = await requirePortalRole(["employer_admin"]);
  const employeeId = requireString(formData, "employee_id");
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, employer_id")
    .eq("id", employeeId)
    .single();

  if (!employee || employee.employer_id !== session.user.employer_id) {
    throw new Error("Employee is outside your employer scope.");
  }

  await supabase
    .from("employees")
    .update({
      team_id: optionalString(formData, "team_id"),
      manager_employee_id: optionalString(formData, "manager_employee_id"),
      leave_policy_id: optionalString(formData, "leave_policy_id"),
      notice_period_days: numberValue(formData, "notice_period_days", 30),
      employer_setup_notes: optionalString(formData, "employer_setup_notes"),
      employer_setup_completed_at: new Date().toISOString(),
      employer_setup_completed_by: session.user.id,
    })
    .eq("id", employeeId);

  await writeAudit(session.user, "save_employee_employer_setup", "employee", employeeId);
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/worktree");
}

export async function createCustomFieldAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin"]);
  const parsed = customFieldSchema.parse({
    target_type: requireString(formData, "target_type"),
    field_label: requireString(formData, "field_label"),
    field_key: requireString(formData, "field_key"),
    field_type: requireString(formData, "field_type"),
    required: booleanValue(formData, "required"),
    active: true,
    placeholder: optionalString(formData, "placeholder"),
    help_text: optionalString(formData, "help_text"),
    default_value: optionalString(formData, "default_value"),
  });
  const companyId = optionalString(formData, "company_id");
  const supabase = getSupabaseAdmin();

  await supabase.from("custom_fields").insert({
    ...parsed,
    company_id: companyId,
    created_by: session.user.id,
  });

  await writeAudit(session.user, "create_custom_field", "custom_field", parsed.field_key);
  revalidatePath("/dashboard/onboarding");
}

export async function createTemplateRecordAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin"]);
  const parsed = templateSchema.parse({
    company_id: optionalString(formData, "company_id"),
    template_type: requireString(formData, "template_type"),
    template_name: requireString(formData, "template_name"),
    file_path: requireString(formData, "file_path"),
  });
  const supabase = getSupabaseAdmin();
  const uploadedByRole = isPlatformAdmin(session.user.role) ? "admin" : "employer";

  if (parsed.company_id) {
    const { data: latest } = await supabase
      .from("contract_templates")
      .select("version_number")
      .eq("company_id", parsed.company_id)
      .eq("template_type", parsed.template_type)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase
      .from("contract_templates")
      .update({ is_active: false })
      .eq("company_id", parsed.company_id)
      .eq("template_type", parsed.template_type);

    await supabase.from("contract_templates").insert({
      ...parsed,
      uploaded_by_user_id: session.user.id,
      uploaded_by_role: uploadedByRole,
      version_number: Number(latest?.version_number ?? 0) + 1,
      is_active: true,
    });
  }

  revalidatePath("/dashboard/onboarding");
}

export async function recordEmployeeDocumentAction(formData: FormData) {
  const session = await requirePortalRole(["employee"]);
  const documentType = requireString(formData, "document_type");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Document file is required.");

  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase.from("employees").select("id").eq("portal_user_id", session.user.id).single();
  if (!employee) throw new Error("Employee profile is not linked.");

  const path = `${employee.id}/${Date.now()}-${fileNameSafe(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("employee-documents").upload(path, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  await supabase.from("employee_documents").insert({
    employee_id: employee.id,
    document_type: documentType,
    file_path: path,
  });

  revalidatePath("/dashboard/onboarding");
}
