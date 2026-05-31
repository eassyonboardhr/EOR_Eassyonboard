"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { optionalString, requireString } from "@/lib/portal/form";
import { getPortalSession, requirePortalRole } from "@/lib/portal/session";
import { writeAudit } from "@/lib/portal/actions/audit";

async function appUrl(path: string) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configuredOrigin) {
    const origin = configuredOrigin.startsWith("http")
      ? configuredOrigin
      : `https://${configuredOrigin}`;
    return new URL(path, origin).toString();
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Could not determine application URL for invitation.");
  }

  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return new URL(path, `${proto}://${host}`).toString();
}

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

export async function createEmployerInviteAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const supabase = getSupabaseAdmin();
  const email = requireString(formData, "email").toLowerCase();
  const companyName = requireString(formData, "company_name");
  const contactName = optionalString(formData, "contact_name");

  const { data: employer, error: employerError } = await supabase
    .from("employers")
    .insert({
      name: companyName,
      contact_email: email,
      contact_name: contactName,
      status: "active",
      approved_by: session.user.id,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (employerError || !employer) {
    throw new Error(employerError?.message ?? "Could not create employer.");
  }

  const clerk = await clerkClient();
  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: await appUrl("/sign-up"),
    notify: true,
    ignoreExisting: true,
    publicMetadata: {
      portalRole: "employer_admin",
      employerId: employer.id,
      source: "admin_created_employer",
    },
  });

  await writeAudit(session.user, "create_employer_invite", "employer", employer.id, {
    email,
  });

  revalidatePath("/dashboard/admin");
}

export async function approveLeadAction(formData: FormData) {
  const session = await requirePortalRole(["super_admin", "admin"]);
  const leadId = requireString(formData, "lead_id");
  const supabase = getSupabaseAdmin();

  const { data: lead, error } = await supabase
    .from("employer_leads")
    .select("id, portal_user_id, email, contact_name, company_name, status")
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    throw new Error(error?.message ?? "Lead not found.");
  }

  if (lead.status !== "pending") {
    throw new Error("Employer lead already reviewed.");
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
    .eq("id", leadId)
    .eq("status", "pending");

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
    .eq("id", leadId)
    .eq("status", "pending");

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
