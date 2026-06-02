"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { ensureActivePortalSession, getPortalSession, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export async function updateProfileAction(formData: FormData) {
  const session = await getPortalSession();
  ensureActivePortalSession(session);
  const supabase = getSupabaseAdmin();

  if (session.user.role === "employee") {
    const { data: employee } = await supabase.from("employees").select("id, employer_id").eq("portal_user_id", session.user.id).single();
    if (!employee) throw new Error("Employee profile is not linked.");
    await supabase.from("employee_profiles").upsert({
      employee_id: employee.id,
      user_id: session.user.id,
      full_name: requireString(formData, "full_name"),
      email: session.email,
      phone: optionalString(formData, "phone"),
      alternate_phone: optionalString(formData, "alternate_phone"),
      linkedin_url: optionalString(formData, "linkedin_url"),
      github_url: optionalString(formData, "github_url"),
      portfolio_url: optionalString(formData, "portfolio_url"),
      updated_at: new Date().toISOString(),
    }, { onConflict: "employee_id" });
    await supabase.from("employee_addresses").upsert({
      employee_id: employee.id,
      current_address: optionalString(formData, "current_address") ?? "",
      permanent_address: optionalString(formData, "permanent_address") ?? "",
      city: optionalString(formData, "city") ?? "",
      state: optionalString(formData, "state") ?? "",
      postal_code: optionalString(formData, "postal_code") ?? "",
    }, { onConflict: "employee_id" });

    const sensitive = {
      aadhaar_number: optionalString(formData, "aadhaar_number"),
      pan_number: optionalString(formData, "pan_number"),
      account_number: optionalString(formData, "account_number"),
      ifsc_code: optionalString(formData, "ifsc_code"),
      bank_name: optionalString(formData, "bank_name"),
      account_holder_name: optionalString(formData, "account_holder_name"),
    };
    if (Object.values(sensitive).some(Boolean)) {
      await createProfileChangeRequest("employee", employee.id, session.user.id, sensitive, "Employee profile update needs review", "/dashboard/profile");
    }
    await notifyAdmins("Employee profile updated", `${session.email} updated profile details.`, "/dashboard/profile");
    await writeAudit(session.user, "update_employee_profile", "employee", employee.id);
  } else if (session.user.role === "employer_admin") {
    const employerId = session.user.employer_id;
    if (!employerId) throw new Error("Employer account is not linked.");
    const payload = {
      company_name: optionalString(formData, "company_name"),
      contact_name: optionalString(formData, "contact_name"),
      contact_email: optionalString(formData, "contact_email"),
      registration_number: optionalString(formData, "registration_number"),
      billing_currency: optionalString(formData, "billing_currency"),
      payment_terms: optionalString(formData, "payment_terms"),
    };
    await createProfileChangeRequest("employer", employerId, session.user.id, payload, "Employer profile update needs review", "/dashboard/profile");
    await writeAudit(session.user, "request_employer_profile_update", "employer", employerId);
  }

  revalidatePath("/dashboard/profile");
}

export async function reviewProfileChangeRequestAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const requestId = requireString(formData, "request_id");
  const decision = requireString(formData, "decision");
  if (!["approved", "rejected"].includes(decision)) throw new Error("Invalid decision.");
  const supabase = getSupabaseAdmin();
  const { data: request } = await from(supabase, "profile_change_requests").select("*").eq("id", requestId).eq("status", "pending").single();
  if (!request) throw new Error("Profile request not found.");

  if (decision === "approved") {
    if (request.target_type === "employee") {
      const payload = request.payload ?? {};
      const { data: existingIdentity } = await supabase.from("employee_identity_details").select("*").eq("employee_id", request.target_id).maybeSingle();
      const { data: existingBank } = await supabase.from("employee_bank_details").select("*").eq("employee_id", request.target_id).maybeSingle();
      if (payload.aadhaar_number || payload.pan_number) {
        await supabase.from("employee_identity_details").upsert({
          employee_id: request.target_id,
          aadhaar_number: payload.aadhaar_number ?? existingIdentity?.aadhaar_number ?? "",
          pan_number: payload.pan_number ?? existingIdentity?.pan_number ?? "",
          passport_number: existingIdentity?.passport_number ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "employee_id" });
      }
      if (payload.account_holder_name || payload.account_number || payload.ifsc_code || payload.bank_name) {
        await supabase.from("employee_bank_details").upsert({
          employee_id: request.target_id,
          account_holder_name: payload.account_holder_name ?? existingBank?.account_holder_name ?? "",
          account_number: payload.account_number ?? existingBank?.account_number ?? "",
          ifsc_code: payload.ifsc_code ?? existingBank?.ifsc_code ?? "",
          bank_name: payload.bank_name ?? existingBank?.bank_name ?? "",
          branch_name: existingBank?.branch_name ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "employee_id" });
      }
    } else if (request.target_type === "employer") {
      const payload = request.payload ?? {};
      const employerUpdate = pruneUndefined({
        name: payload.company_name,
        contact_name: payload.contact_name,
        contact_email: payload.contact_email,
        updated_at: new Date().toISOString(),
      });
      if (Object.keys(employerUpdate).length) {
        await from(supabase, "employers").update(employerUpdate).eq("id", request.target_id);
      }

      const { data: company } = await supabase
        .from("client_companies")
        .select("id")
        .eq("employer_id", request.target_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (company?.id) {
        const companyUpdate = pruneUndefined({
          company_name: payload.company_name,
          registration_number: payload.registration_number,
          updated_at: new Date().toISOString(),
        });
        if (Object.keys(companyUpdate).length) {
          await from(supabase, "client_companies").update(companyUpdate).eq("id", company.id);
        }
        const billingUpdate = pruneUndefined({
          currency: payload.billing_currency,
          payment_terms: payload.payment_terms,
        });
        if (Object.keys(billingUpdate).length) {
          await from(supabase, "client_billing_settings").update(billingUpdate).eq("company_id", company.id);
        }
      }
    }
  }

  await from(supabase, "profile_change_requests").update({
    status: decision,
    reviewed_by: session.user.id,
    reviewed_at: new Date().toISOString(),
    admin_notes: optionalString(formData, "admin_notes"),
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);
  await writeAudit(session.user, `review_profile_change_${decision}`, "profile_change_request", requestId);
  await notifyProfileRequester(request.requested_by, decision, optionalString(formData, "admin_notes"));
  revalidatePath("/dashboard/profile");
}

export async function saveSettingsAction(formData: FormData) {
  const session = await getPortalSession();
  const theme = requireString(formData, "theme_preference");
  if (!["system", "light", "dark"].includes(theme)) throw new Error("Invalid theme.");
  const supabase = getSupabaseAdmin();
  const { data: user } = await from(supabase, "portal_users").select("notification_preferences").eq("id", session.user.id).maybeSingle();
  const preferences = typeof user?.notification_preferences === "object" && user.notification_preferences ? user.notification_preferences : {};
  await from(supabase, "portal_users").update({
    theme_preference: theme,
    notification_preferences: {
      ...preferences,
      important_only: formData.get("important_only") === "on",
    },
  }).eq("id", session.user.id);
  revalidatePath("/dashboard/settings");
}

async function createProfileChangeRequest(targetType: string, targetId: string, requestedBy: string, payload: Record<string, unknown>, title: string, actionUrl: string) {
  const supabase = getSupabaseAdmin();
  await from(supabase, "profile_change_requests").insert({
    target_type: targetType,
    target_id: targetId,
    requested_by: requestedBy,
    payload,
  });
  await notifyAdmins(title, "A sensitive profile update is waiting for admin review.", actionUrl);
}

async function notifyAdmins(title: string, body: string, actionUrl: string) {
  const supabase = getSupabaseAdmin();
  const { data: admins } = await supabase.from("portal_users").select("id").in("role", ["super_admin", "admin"]).eq("status", "active");
  if (!admins?.length) return;
  const { data: notice } = await supabase.from("notices").insert({
    title,
    body,
    priority: "important",
    category: "profile",
    action_url: actionUrl,
    action_label: "Review profile",
  }).select("id").single();
  if (notice) {
    await supabase.from("notice_recipients").insert(admins.map((admin) => ({ notice_id: notice.id, recipient_user_id: admin.id })));
  }
}

async function notifyProfileRequester(requestedBy: string | null | undefined, decision: string, adminNotes: string | null) {
  if (!requestedBy) return;
  const supabase = getSupabaseAdmin();
  const { data: notice } = await supabase.from("notices").insert({
    title: `Profile update ${decision}`,
    body: adminNotes || `Your sensitive profile update was ${decision}.`,
    priority: decision === "approved" ? "normal" : "important",
    category: "profile",
    action_url: "/dashboard/profile",
    action_label: "Open profile",
  }).select("id").single();
  if (notice) {
    await supabase.from("notice_recipients").insert({ notice_id: notice.id, recipient_user_id: requestedBy });
  }
}

function pruneUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
