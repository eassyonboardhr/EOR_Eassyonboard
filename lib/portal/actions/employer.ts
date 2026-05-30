"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { getPortalSession, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

export async function updateEmployerLeadAction(formData: FormData) {
  const session = await getPortalSession();
  const supabase = getSupabaseAdmin();

  await supabase
    .from("employer_leads")
    .update({
      contact_name: optionalString(formData, "contact_name"),
      company_name: requireString(formData, "company_name"),
      phone: optionalString(formData, "phone"),
      message: optionalString(formData, "message"),
    })
    .eq("portal_user_id", session.user.id);

  revalidatePath("/request-received");
  revalidatePath("/dashboard");
}

export async function approveLeadAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const leadId = requireString(formData, "lead_id");
  const supabase = getSupabaseAdmin();

  const { data: lead, error } = await supabase
    .from("employer_leads")
    .select("id, portal_user_id, email, contact_name, company_name")
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    throw new Error(error?.message ?? "Lead not found.");
  }

  const { data: employer, error: employerError } = await supabase
    .from("employers")
    .insert({
      name: lead.company_name ?? lead.email,
      contact_email: lead.email,
      contact_name: lead.contact_name,
      status: "active",
      approved_by: session.user.id,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (employerError || !employer) {
    throw new Error(employerError?.message ?? "Could not create employer.");
  }

  if (lead.portal_user_id) {
    await supabase
      .from("portal_users")
      .update({
        role: "employer_admin",
        status: "active",
        employer_id: employer.id,
      })
      .eq("id", lead.portal_user_id);
  }

  await supabase
    .from("employer_leads")
    .update({
      status: "approved",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  await writeAudit(session.user, "approve_lead", "employer_lead", leadId, {
    employer_id: employer.id,
  });

  revalidatePath("/dashboard/admin");
}

export async function rejectLeadAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const leadId = requireString(formData, "lead_id");
  const supabase = getSupabaseAdmin();

  await supabase
    .from("employer_leads")
    .update({
      status: "rejected",
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  await writeAudit(session.user, "reject_lead", "employer_lead", leadId);
  revalidatePath("/dashboard/admin");
}

export async function goToDashboardAction() {
  const session = await getPortalSession();

  if (session.user.role === "super_admin" || session.user.role === "admin") {
    redirect("/dashboard/admin");
  }

  if (session.user.role === "employer_admin" && session.user.status === "active") {
    redirect("/dashboard/employer");
  }

  if (session.user.role === "employee" && session.user.status === "active") {
    redirect("/dashboard/employee");
  }

  redirect("/request-received");
}
