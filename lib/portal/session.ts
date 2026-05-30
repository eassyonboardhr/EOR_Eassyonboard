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

    return { clerkUserId: userId, email, user: updatedUser as PortalUser };
  }

  const { data: invitedEmployee } = await supabase
    .from("employees")
    .select("id, employer_id")
    .eq("email", email.toLowerCase())
    .is("portal_user_id", null)
    .maybeSingle();

  const bootstrapRole: PortalRole = isAdminEmail(email)
    ? "super_admin"
    : invitedEmployee
      ? "employee"
      : "employer_admin";
  const bootstrapStatus =
    bootstrapRole === "super_admin" || bootstrapRole === "employee" ? "active" : "pending";

  const { data: insertedUser, error: insertError } = await supabase
    .from("portal_users")
    .insert({
      clerk_user_id: userId,
      email,
      full_name: name,
      role: bootstrapRole,
      status: bootstrapStatus,
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

export function isPlatformAdmin(role: PortalRole) {
  return role === "super_admin" || role === "admin";
}
