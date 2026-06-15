import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { buildEmployeeDocumentChecklist } from "@/lib/portal/document-status";
import { getUnreadMessageCount } from "@/lib/portal/messages";
import type { PortalSession } from "@/lib/portal/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Db = ReturnType<typeof getSupabaseAdmin>;
const from = (db: Db, table: string) => (db as any).from(table);

export type PortalNotificationCounts = {
  messages: number;
  notices: number;
  leaves: number;
  documents: number;
  onboarding: number;
  resignations: number;
  offboarding: number;
  finances: number;
  employers: number;
  employees: number;
};

export const EMPTY_PORTAL_NOTIFICATION_COUNTS: PortalNotificationCounts = {
  messages: 0,
  notices: 0,
  leaves: 0,
  documents: 0,
  onboarding: 0,
  resignations: 0,
  offboarding: 0,
  finances: 0,
  employers: 0,
  employees: 0,
};

type NoticeRecipientForCount = {
  read_at: string | null;
  acknowledged_at: string | null;
  notices?: { requires_acknowledgement?: boolean | null } | null;
};

type EmployeeDocumentForCount = {
  id: string;
  document_type?: string | null;
  verification_status?: string | null;
  uploaded_at?: string | null;
};

function isPlatformAdmin(role: PortalSession["user"]["role"]) {
  return role === "super_admin" || role === "admin";
}

async function countRows(
  table: string,
  filters: Record<string, string | null | undefined> = {},
  inFilters: Record<string, string[]> = {},
) {
  const supabase = getSupabaseAdmin();
  let query = from(supabase, table).select("id", { count: "exact", head: true });

  for (const [column, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(column, value);
    }
  }

  for (const [column, values] of Object.entries(inFilters)) {
    query = query.in(column, values);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export function countActionNeededNoticeRecipients(recipients: NoticeRecipientForCount[]) {
  return recipients.filter((recipient) => {
    const unread = !recipient.read_at;
    const acknowledgementNeeded = Boolean(recipient.notices?.requires_acknowledgement) && !recipient.acknowledged_at;
    return unread || acknowledgementNeeded;
  }).length;
}

export function countEmployeeRequiredDocumentActions(
  documents: EmployeeDocumentForCount[],
  isFresher: boolean | null | undefined,
) {
  const checklist = buildEmployeeDocumentChecklist(documents, isFresher);
  return checklist.filter((item) => !item.uploaded || item.status === "Rejected").length;
}

async function getActionNeededNoticeCount(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await from(supabase, "notice_recipients")
    .select("id, read_at, acknowledged_at, notices(requires_acknowledgement)")
    .eq("recipient_user_id", session.user.id);

  if (error) return 0;
  return countActionNeededNoticeRecipients(data ?? []);
}

async function getPendingLeaveCount(session: PortalSession) {
  if (session.user.role === "employee") return 0;
  if (session.user.role === "employer_admin" && !session.user.employer_id) return 0;

  const supabase = getSupabaseAdmin();
  let query = from(supabase, "leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (session.user.role === "employer_admin") {
    query = query.eq("employer_id", session.user.employer_id);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function getPendingDocumentReviewCount(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  let query = from(supabase, "employee_documents")
    .select(
      session.user.role === "employer_admin" ? "id, employees!inner(employer_id)" : "id",
      { count: "exact", head: true },
    )
    .eq("verification_status", "Pending");

  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) return 0;
    query = query.eq("employees.employer_id", session.user.employer_id);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function getEmployeeDocumentActionCount(session: PortalSession) {
  const supabase = getSupabaseAdmin();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();

  if (!employee?.id) return 0;

  const [{ data: documents, error: documentError }, { data: experience }] = await Promise.all([
    supabase
      .from("employee_documents")
      .select("id, document_type, verification_status, uploaded_at")
      .eq("employee_id", employee.id),
    supabase
      .from("employee_experience")
      .select("is_fresher")
      .eq("employee_id", employee.id)
      .maybeSingle(),
  ]);

  if (documentError) return 0;
  return countEmployeeRequiredDocumentActions(documents ?? [], experience?.is_fresher ?? true);
}

async function getDocumentCount(session: PortalSession) {
  if (isPlatformAdmin(session.user.role) || session.user.role === "employer_admin") {
    return getPendingDocumentReviewCount(session);
  }

  if (session.user.role === "employee") {
    return getEmployeeDocumentActionCount(session);
  }

  return 0;
}

async function getOnboardingCount(session: PortalSession) {
  if (isPlatformAdmin(session.user.role)) {
    return countRows(
      "employee_onboarding_status",
      {},
      { status: ["Submitted", "Pending Review", "Needs Correction"] },
    );
  }

  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) return 0;
    return countRows("employee_requests", {
      employer_id: session.user.employer_id,
      status: "pending",
    });
  }

  return 0;
}

async function getResignationCount(session: PortalSession) {
  if (isPlatformAdmin(session.user.role)) {
    return countRows("resignations", {}, { status: ["submitted_to_admin"] });
  }

  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) return 0;
    return countRows(
      "resignations",
      { employer_id: session.user.employer_id },
      { status: ["forwarded_to_employer"] },
    );
  }

  return 0;
}

async function getOffboardingCount(session: PortalSession) {
  if (isPlatformAdmin(session.user.role)) {
    return countRows(
      "offboarding_cases",
      {},
      { status: ["requested_by_employer", "admin_approved", "in_progress"] },
    );
  }

  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) return 0;
    return countRows(
      "offboarding_cases",
      { employer_id: session.user.employer_id },
      { status: ["admin_approved", "in_progress"] },
    );
  }

  return 0;
}

async function getEmployerCount(session: PortalSession) {
  if (!isPlatformAdmin(session.user.role)) return 0;
  return countRows("employer_leads", { status: "pending" });
}

async function getEmployeeCount(session: PortalSession) {
  if (isPlatformAdmin(session.user.role)) {
    return countRows("employee_requests", { status: "pending" });
  }

  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) return 0;
    return countRows("employee_requests", {
      employer_id: session.user.employer_id,
      status: "pending",
    });
  }

  return 0;
}

export async function getPortalNotificationCounts(
  session: PortalSession,
): Promise<PortalNotificationCounts> {
  const [
    messages,
    notices,
    leaves,
    documents,
    onboarding,
    resignations,
    offboarding,
    employers,
    employees,
  ] = await Promise.all([
    getUnreadMessageCount(session),
    getActionNeededNoticeCount(session),
    getPendingLeaveCount(session),
    getDocumentCount(session),
    getOnboardingCount(session),
    getResignationCount(session),
    getOffboardingCount(session),
    getEmployerCount(session),
    getEmployeeCount(session),
  ]);

  return {
    ...EMPTY_PORTAL_NOTIFICATION_COUNTS,
    messages,
    notices,
    leaves,
    documents,
    onboarding,
    resignations,
    offboarding,
    employers,
    employees,
  };
}
