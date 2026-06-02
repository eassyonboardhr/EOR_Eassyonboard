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
      if (payload.aadhaar_number || payload.pan_number) {
        await supabase.from("employee_identity_details").upsert({
          employee_id: request.target_id,
          aadhaar_number: payload.aadhaar_number,
          pan_number: payload.pan_number,
        }, { onConflict: "employee_id" });
      }
      if (payload.account_number || payload.ifsc_code || payload.bank_name) {
        await supabase.from("employee_bank_details").upsert({
          employee_id: request.target_id,
          account_holder_name: payload.account_holder_name ?? null,
          account_number: payload.account_number,
          ifsc_code: payload.ifsc_code,
          bank_name: payload.bank_name,
        }, { onConflict: "employee_id" });
      }
    } else if (request.target_type === "employer") {
      const payload = request.payload ?? {};
      await supabase.from("employers").update({
        name: payload.company_name ?? undefined,
        contact_name: payload.contact_name ?? undefined,
        contact_email: payload.contact_email ?? undefined,
      }).eq("id", request.target_id);
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
  revalidatePath("/dashboard/profile");
}

export async function saveSettingsAction(formData: FormData) {
  const session = await getPortalSession();
  const theme = requireString(formData, "theme_preference");
  if (!["system", "light", "dark"].includes(theme)) throw new Error("Invalid theme.");
  const supabase = getSupabaseAdmin();
  await from(supabase, "portal_users").update({
    theme_preference: theme,
    notification_preferences: {
      email_summary: formData.get("email_summary") === "on",
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
