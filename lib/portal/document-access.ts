import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
export {
  allRequiredDocumentsApproved,
  baseRequiredEmployeeDocuments,
  buildEmployeeDocumentChecklist,
  getCompanyDocumentCompletionStatus,
  getEmployeeDocumentCompletionStatus,
  requiredCompanyDocuments,
  requiredEmployeeDocuments,
};
import type { DocumentRow } from "@/lib/portal/document-status";
import {
  allRequiredDocumentsApproved,
  baseRequiredEmployeeDocuments,
  buildEmployeeDocumentChecklist,
  getCompanyDocumentCompletionStatus,
  getEmployeeDocumentCompletionStatus,
  requiredCompanyDocuments,
  requiredEmployeeDocuments,
} from "@/lib/portal/document-status";
import type { PortalSession } from "@/lib/portal/types";

export async function signedStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}

async function allowedEmployeeIds(session: PortalSession, rows: DocumentRow[]) {
  if (isPlatformAdmin(session.user.role)) return new Set(rows.map((row) => row.employee_id).filter(Boolean));

  const supabase = getSupabaseAdmin();
  if (session.user.role === "employee") {
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("portal_user_id", session.user.id)
      .maybeSingle();
    return new Set(employee?.id ? [employee.id] : []);
  }

  if (session.user.role === "employer_admin" && session.user.employer_id) {
    const ids = rows.map((row) => row.employee_id).filter(Boolean) as string[];
    if (ids.length === 0) return new Set<string>();
    const { data: employees } = await supabase
      .from("employees")
      .select("id")
      .eq("employer_id", session.user.employer_id)
      .in("id", ids);
    return new Set((employees ?? []).map((employee) => employee.id));
  }

  return new Set<string>();
}

async function allowedCompanyIds(session: PortalSession, rows: DocumentRow[]) {
  if (isPlatformAdmin(session.user.role)) return new Set(rows.map((row) => row.company_id).filter(Boolean));

  if (session.user.role !== "employer_admin" || !session.user.employer_id) {
    return new Set<string>();
  }

  const ids = rows.map((row) => row.company_id).filter(Boolean) as string[];
  if (ids.length === 0) return new Set<string>();

  const supabase = getSupabaseAdmin();
  const { data: companies } = await supabase
    .from("client_companies")
    .select("id")
    .eq("employer_id", session.user.employer_id)
    .in("id", ids);
  return new Set((companies ?? []).map((company) => company.id));
}

export async function withScopedEmployeeDocumentUrls<T extends DocumentRow>(
  rows: T[],
  session: PortalSession,
) {
  const allowed = await allowedEmployeeIds(session, rows);
  return Promise.all(
    rows.map(async (row) => {
      if (!row.employee_id || !allowed.has(row.employee_id)) {
        return { ...row, signed_url: null };
      }
      return {
        ...row,
        signed_url: await signedStorageUrl("employee-documents", row.file_path),
      };
    }),
  );
}

export async function withScopedCompanyDocumentUrls<T extends DocumentRow>(
  rows: T[],
  session: PortalSession,
) {
  const allowed = await allowedCompanyIds(session, rows);
  return Promise.all(
    rows.map(async (row) => {
      if (!row.company_id && isPlatformAdmin(session.user.role)) {
        return {
          ...row,
          signed_url: await signedStorageUrl("company-documents", row.file_path),
        };
      }
      if (!row.company_id || !allowed.has(row.company_id)) {
        return { ...row, signed_url: null };
      }
      return {
        ...row,
        signed_url: await signedStorageUrl("company-documents", row.file_path),
      };
    }),
  );
}

export async function withSignedUrls<T extends { file_path: string }>(
  rows: T[],
  bucket: "employee-documents" | "company-documents",
) {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      signed_url: await signedStorageUrl(bucket, row.file_path),
    })),
  );
}
