export type DocumentRow = {
  id: string;
  document_type?: string | null;
  file_path?: string | null;
  verification_status?: string | null;
  replaced_by_document_id?: string | null;
  uploaded_at?: string | null;
  employee_id?: string | null;
  company_id?: string | null;
};

export type DocumentCompletionStatus = {
  status: "docs_complete" | "docs_rejected" | "docs_pending" | "docs_missing";
  label: "Docs Complete" | "Docs Rejected" | "Docs Pending" | "Docs Missing";
  missing: number;
  pending: number;
  rejected: number;
  approved: number;
  required: number;
};

export const baseRequiredEmployeeDocuments = [
  "passport_photo",
  "aadhaar_card",
  "pan_card",
  "bank_proof",
  "resume",
] as const;

export const requiredCompanyDocuments = ["incorporation_certificate"] as const;

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
    const latest = latestDocumentForType(documents, documentType);

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

export function getEmployeeDocumentCompletionStatus(
  documents: DocumentRow[],
  isFresher: boolean | null | undefined,
): DocumentCompletionStatus {
  const checklist = buildEmployeeDocumentChecklist(documents, isFresher);
  const missing = checklist.filter((item) => !item.uploaded).length;
  const rejected = checklist.filter((item) => item.status === "Rejected").length;
  const pending = checklist.filter((item) => item.uploaded && item.status !== "Approved" && item.status !== "Rejected").length;
  const approved = checklist.filter((item) => item.approved).length;

  return completionStatus({ missing, pending, rejected, approved, required: checklist.length });
}

export function getCompanyDocumentCompletionStatus(documents: DocumentRow[]): DocumentCompletionStatus {
  const checklist = requiredCompanyDocuments.map((documentType) => {
    const latest = latestDocumentForType(documents, documentType);
    return {
      uploaded: Boolean(latest),
      approved: Boolean(latest),
      status: latest ? "Approved" : "Missing",
    };
  });
  const missing = checklist.filter((item) => !item.uploaded).length;
  const approved = checklist.filter((item) => item.approved).length;

  return completionStatus({ missing, pending: 0, rejected: 0, approved, required: checklist.length });
}

function latestDocumentForType(documents: DocumentRow[], documentType: string) {
  return documents
    .filter((document) => document.document_type === documentType)
    .sort((a, b) => {
      const left = a.uploaded_at ?? "";
      const right = b.uploaded_at ?? "";
      return left.localeCompare(right) || a.id.localeCompare(b.id);
    })
    .at(-1);
}

function completionStatus(counts: Omit<DocumentCompletionStatus, "status" | "label">): DocumentCompletionStatus {
  if (counts.rejected > 0) return { ...counts, status: "docs_rejected", label: "Docs Rejected" };
  if (counts.missing > 0) return { ...counts, status: "docs_missing", label: "Docs Missing" };
  if (counts.pending > 0) return { ...counts, status: "docs_pending", label: "Docs Pending" };
  return { ...counts, status: "docs_complete", label: "Docs Complete" };
}
