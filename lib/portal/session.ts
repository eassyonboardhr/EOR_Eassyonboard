import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalRole, PortalSession, PortalUser } from "@/lib/portal/types";

function splitEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAdminEmail(email: string) {
  return splitEmails(process.env.PORTAL_SUPER_ADMIN_EMAILS).has(email.toLowerCase());
}

function displayName(user: Awaited<ReturnType<typeof currentUser>>) {
  return (
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    null
  );
}

async function ensureLeadRecord(portalUser: PortalUser, email: string, name: string | null) {
  const supabase = getSupabaseAdmin();
  const { data: existingLead } = await supabase
    .from("employer_leads")
    .select("id")
    .eq("portal_user_id", portalUser.id)
    .maybeSingle();

  if (existingLead) {
    return;
  }

  await supabase.from("employer_leads").insert({
    portal_user_id: portalUser.id,
    email,
    contact_name: name,
    status: "pending",
  });
}

async function findActiveEmployerByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  const { data: employer } = await supabase
    .from("employers")
    .select("id")
    .eq("contact_email", email.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  return employer;
}

export async function getPortalSession(): Promise<PortalSession> {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;

  if (!email) {
    redirect("/sign-in");
  }

  const name = displayName(clerkUser);
  const supabase = getSupabaseAdmin();
  const { data: existingUser, error: readError } = await supabase
    .from("portal_users")
    .select("id, clerk_user_id, email, full_name, role, status, employer_id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabase
      .from("portal_users")
      .update({
        email,
        full_name: name,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id)
      .select("id, clerk_user_id, email, full_name, role, status, employer_id")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const portalUser = updatedUser as PortalUser;
    if (portalUser.role === "employee") {
      await supabase
        .from("employee_requests")
        .update({ onboarding_started_at: new Date().toISOString() })
        .eq("email", email.toLowerCase())
        .not("employee_id", "is", null)
        .is("onboarding_started_at", null);
    }

    return { clerkUserId: userId, email, user: portalUser };
  }

  const { data: invitedEmployee } = await supabase
    .from("employees")
    .select("id, employer_id")
    .eq("email", email.toLowerCase())
    .is("portal_user_id", null)
    .maybeSingle();
  const invitedEmployer = invitedEmployee ? null : await findActiveEmployerByEmail(email);

  const bootstrapRole: PortalRole = isAdminEmail(email)
    ? "super_admin"
    : invitedEmployee
      ? "employee"
      : "employer_admin";
  const bootstrapStatus =
    bootstrapRole === "super_admin" || bootstrapRole === "employee" || invitedEmployer
      ? "active"
      : "pending";

  const { data: insertedUser, error: insertError } = await supabase
    .from("portal_users")
    .insert({
      clerk_user_id: userId,
      email,
      full_name: name,
      role: bootstrapRole,
      status: bootstrapStatus,
      employer_id: invitedEmployer?.id,
      last_seen_at: new Date().toISOString(),
    })
    .select("id, clerk_user_id, email, full_name, role, status, employer_id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const portalUser = insertedUser as PortalUser;

  if (invitedEmployee && portalUser.role === "employee") {
    await supabase
      .from("employees")
      .update({
        portal_user_id: portalUser.id,
        status: "active",
      })
      .eq("id", invitedEmployee.id);
    await supabase
      .from("employee_requests")
      .update({
        invite_accepted_at: new Date().toISOString(),
        onboarding_started_at: new Date().toISOString(),
      })
      .eq("employee_id", invitedEmployee.id)
      .is("invite_accepted_at", null);
  }

  if (portalUser.role === "employer_admin") {
    await ensureLeadRecord(portalUser, email, name);
  }

  return { clerkUserId: userId, email, user: portalUser };
}

export async function requirePortalRole(roles: PortalRole[]) {
  const session = await getPortalSession();

  if (!roles.includes(session.user.role) || session.user.status !== "active") {
    redirect("/dashboard");
  }

  return session;
}

export function ensureActivePortalSession(session: PortalSession) {
  if (session.user.status !== "active") {
    throw new Error("An active portal account is required for this action.");
  }
}

export function isPlatformAdmin(role: PortalRole) {
  return role === "super_admin" || role === "admin";
}
