import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export async function getProfileData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  if (session.user.role === "employee") {
    const { data: employee } = await supabase.from("employees").select("*, employers(id, name)").eq("portal_user_id", session.user.id).maybeSingle();
    if (!employee) return { mode: "employee" as const, employee: null };
    const [{ data: profile }, { data: address }, { data: identity }, { data: bank }, { data: requests }] = await Promise.all([
      supabase.from("employee_profiles").select("*").eq("employee_id", employee.id).maybeSingle(),
      supabase.from("employee_addresses").select("*").eq("employee_id", employee.id).maybeSingle(),
      supabase.from("employee_identity_details").select("*").eq("employee_id", employee.id).maybeSingle(),
      supabase.from("employee_bank_details").select("*").eq("employee_id", employee.id).maybeSingle(),
      from(supabase, "profile_change_requests").select("*").eq("target_type", "employee").eq("target_id", employee.id).order("created_at", { ascending: false }).limit(10),
    ]);
    return { mode: "employee" as const, employee, profile, address, identity, bank, requests: requests ?? [] };
  }

  if (session.user.role === "employer_admin") {
    const employerId = session.user.employer_id;
    const [{ data: employer }, { data: company }, { data: requests }] = await Promise.all([
      employerId ? supabase.from("employers").select("*").eq("id", employerId).maybeSingle() : Promise.resolve({ data: null }),
      employerId ? supabase.from("client_companies").select("*, client_billing_settings(*), client_employment_defaults(*)").eq("employer_id", employerId).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      employerId ? from(supabase, "profile_change_requests").select("*").eq("target_type", "employer").eq("target_id", employerId).order("created_at", { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
    ]);
    return { mode: "employer" as const, employer, company, requests: requests ?? [] };
  }

  const { data: requests } = isPlatformAdmin(session.user.role)
    ? await from(supabase, "profile_change_requests").select("*, portal_users(full_name, email)").order("created_at", { ascending: false }).limit(50)
    : { data: [] };
  return { mode: "admin" as const, user: session.user, requests: requests ?? [] };
}

export async function getSettingsData(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase.from("portal_users").select("*").eq("id", session.user.id).single();
  return { user: user as any };
}

export async function getCommandPaletteItems(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const items: Array<{ label: string; description: string; href: string; type: string }> = [
    { label: "Dashboard", description: "Portal home", href: session.user.role === "employee" ? "/dashboard/employee" : session.user.role === "employer_admin" ? "/dashboard/employer" : "/dashboard/admin", type: "Page" },
    { label: "Messages", description: "Two-way conversations", href: "/dashboard/messages", type: "Page" },
    { label: "Documents", description: "Documents and agreements", href: "/dashboard/documents", type: "Page" },
    { label: "Finances", description: "Role-aware finance view", href: "/dashboard/finances", type: "Page" },
    { label: "Profile", description: "Account and profile details", href: "/dashboard/profile", type: "Page" },
  ];

  if (isPlatformAdmin(session.user.role)) {
    const [{ data: employers }, { data: employees }, { data: agreements }] = await Promise.all([
      supabase.from("employers").select("id, name").limit(30),
      supabase.from("employees").select("id, full_name, email").limit(40),
      from(supabase, "service_agreements").select("id, title").limit(20),
    ]);
    items.push(...(employers ?? []).map((row: any) => ({ label: row.name, description: "Employer", href: `/dashboard/worktree/actions/employer/${row.id}/details`, type: "Employer" })));
    items.push(...(employees ?? []).map((row: any) => ({ label: row.full_name ?? row.email, description: "Employee", href: `/dashboard/worktree/actions/employee/${row.id}/details`, type: "Employee" })));
    items.push(...(agreements ?? []).map((row: any) => ({ label: row.title, description: "Service agreement", href: "/dashboard/documents", type: "Document" })));
  } else if (session.user.role === "employer_admin" && session.user.employer_id) {
    const [{ data: employees }, { data: teams }] = await Promise.all([
      supabase.from("employees").select("id, full_name, email").eq("employer_id", session.user.employer_id).limit(40),
      supabase.from("teams").select("id, name").eq("employer_id", session.user.employer_id).limit(20),
    ]);
    items.push(...(employees ?? []).map((row: any) => ({ label: row.full_name ?? row.email, description: "Employee", href: `/dashboard/worktree/actions/employee/${row.id}/details`, type: "Employee" })));
    items.push(...(teams ?? []).map((row: any) => ({ label: row.name, description: "Team", href: "/dashboard/employer/teams", type: "Team" })));
  }

  return items;
}
