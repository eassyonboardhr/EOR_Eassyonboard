"use client";

import { useTransition } from "react";
import { getPayslipSignedUrlAction } from "@/lib/portal/actions/portal-finance";

export function PayslipDownloadButton({ payslipId }: { payslipId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("payslip_id", payslipId);
          const url = await getPayslipSignedUrlAction(formData);
          window.open(url, "_blank", "noopener,noreferrer");
        });
      }}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
    >
      {pending ? "Preparing..." : "Download Payslip"}
    </button>
  );
}
