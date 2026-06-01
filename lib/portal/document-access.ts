import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type DocumentRow = {
  id: string;
  document_type: string;
  file_path: string;
  verification_status?: string | null;
  replaced_by_document_id?: string | null;
};

export const baseRequiredEmployeeDocuments = [
  "passport_photo",
  "aadhaar_card",
  "pan_card",
  "bank_proof",
  "resume",
] as const;

export function requiredEmployeeDocuments(isFresher: boolean | null | undefined) {
  return [
    ...baseRequiredEmployeeDocuments,
    ...(isFresher ? ["degree_certificate"] : ["salary_slip", "experience_letter", "relieving_letter"]),
  ];
}

export function buildEmployeeDocumentChecklist(
  documents: DocumentRow[],
  isFresher: boolean | null | undefined,
) {
  return requiredEmployeeDocuments(isFresher).map((documentType) => {
    const latest = documents
      .filter((document) => document.document_type === documentType)
      .sort((a, b) => a.id.localeCompare(b.id))
      .at(-1);

    return {
      document_type: documentType,
      uploaded: Boolean(latest),
      approved: latest?.verification_status === "Approved",
      status: latest?.verification_status ?? "Missing",
      document_id: latest?.id ?? null,
    };
  });
}

export function allRequiredDocumentsApproved(
  documents: DocumentRow[],
  isFresher: boolean | null | undefined,
) {
  return buildEmployeeDocumentChecklist(documents, isFresher).every((item) => item.approved);
}

export async function signedStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
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
