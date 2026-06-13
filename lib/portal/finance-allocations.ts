export type FinanceMonth = string | null;

export type AllocationSource = "inferred" | "manual";
export type CashoutRateSource = "invoice_payment" | "manual_override";

export type SalaryPaymentForAllocation = {
  id: string;
  source_key?: string | null;
  employer_id: string | null;
  employee_id: string | null;
  month_key: string | null;
  salary_usd_cents?: number | string | null;
};

export type LineItemForAllocation = {
  id: string;
  invoice_id: string | null;
  employer_id: string | null;
  employee_id: string | null;
  billed_total_usd_cents?: number | string | null;
  finance_invoices?: {
    id?: string | null;
    month_key?: string | null;
  } | null;
};

export type InvoicePaymentForAllocation = {
  id: string;
  invoice_id: string | null;
  employer_id: string | null;
  payment_month: string | null;
  usd_inr_rate: number | string | null;
};

export type ExistingAllocationForInference = {
  id: string;
  salary_payment_id: string | null;
  allocation_source: AllocationSource | string | null;
};

export type FinancePayrollAllocationDraft = {
  source_key: string;
  employer_id: string;
  employee_id: string;
  invoice_id: string | null;
  invoice_payment_id: string | null;
  salary_payment_id: string;
  invoice_month: FinanceMonth;
  paid_month: FinanceMonth;
  payroll_month: FinanceMonth;
  allocated_usd_cents: number;
  cashout_rate: number | null;
  cashout_rate_source: CashoutRateSource;
  allocation_source: "inferred";
};

export type InferPayrollAllocationsInput = {
  salaryPayments: SalaryPaymentForAllocation[];
  lineItems: LineItemForAllocation[];
  payments: InvoicePaymentForAllocation[];
  existingAllocations: ExistingAllocationForInference[];
};

export type AdminFinanceSummaryInput = {
  employerReceivables: Array<{
    amountUsdCents: number;
    receivedUsdCents: number;
    status: string | null;
    cashoutRate: number | null;
  }>;
  employeePayables: Array<{
    actualPaidInrCents: number;
    pfInrCents: number;
    tdsInrCents: number;
    paid: boolean;
  }>;
};

export type AdminFinanceSummary = {
  totalInvoicedUsdCents: number;
  totalReceivedUsdCents: number;
  totalEmployeePayoutInrCents: number;
  pendingReceivableUsdCents: number;
  pendingSalaryInrCents: number;
  averageCashoutRate: number | null;
  estimatedMarginInrCents: number | null;
};

export function toArrayFilter(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => (item ?? "").split(","))
    .map((item) => item.trim())
    .filter((item) => item && item !== "all");
}

export function toEmployerPaymentStatus(status: string | null | undefined) {
  if (status === "generated" || status === "sent" || status === "draft") return "Invoice raised";
  if (status === "received") return "Payment received";
  if (status === "cashed_out" || status === "paid") return "Settled";
  return "Unknown";
}

export function centsNumber(value: number | string | null | undefined): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function monthDistance(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return Number.MAX_SAFE_INTEGER;
  const [aYear, aMonth] = a.split("-").map(Number);
  const [bYear, bMonth] = b.split("-").map(Number);
  if (!aYear || !aMonth || !bYear || !bMonth) return Number.MAX_SAFE_INTEGER;
  return Math.abs((aYear * 12 + aMonth) - (bYear * 12 + bMonth));
}

function rateNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function bestPaymentForInvoice({
  invoiceId,
  employerId,
  payrollMonth,
  payments,
}: {
  invoiceId: string | null;
  employerId: string;
  payrollMonth: string | null;
  payments: InvoicePaymentForAllocation[];
}) {
  return payments
    .filter((payment) => payment.invoice_id === invoiceId && payment.employer_id === employerId)
    .sort((a, b) => monthDistance(a.payment_month, payrollMonth) - monthDistance(b.payment_month, payrollMonth))[0] ?? null;
}

export function inferPayrollAllocations(input: InferPayrollAllocationsInput): FinancePayrollAllocationDraft[] {
  const allocatedSalaryIds = new Set(input.existingAllocations.map((allocation) => allocation.salary_payment_id).filter(Boolean));
  const drafts: FinancePayrollAllocationDraft[] = [];

  for (const salary of input.salaryPayments) {
    if (!salary.id || !salary.employee_id || !salary.employer_id || allocatedSalaryIds.has(salary.id)) continue;

    const matchingLineItems = input.lineItems
      .filter((lineItem) => lineItem.employee_id === salary.employee_id && lineItem.employer_id === salary.employer_id)
      .sort((a, b) => monthDistance(a.finance_invoices?.month_key, salary.month_key) - monthDistance(b.finance_invoices?.month_key, salary.month_key));
    const lineItem = matchingLineItems[0] ?? null;
    const payment = bestPaymentForInvoice({
      invoiceId: lineItem?.invoice_id ?? null,
      employerId: salary.employer_id,
      payrollMonth: salary.month_key,
      payments: input.payments,
    });

    drafts.push({
      source_key: salary.source_key ?? "invoice_generator",
      employer_id: salary.employer_id,
      employee_id: salary.employee_id,
      invoice_id: lineItem?.invoice_id ?? null,
      invoice_payment_id: payment?.id ?? null,
      salary_payment_id: salary.id,
      invoice_month: lineItem?.finance_invoices?.month_key ?? null,
      paid_month: payment?.payment_month ?? null,
      payroll_month: salary.month_key,
      allocated_usd_cents: centsNumber(salary.salary_usd_cents),
      cashout_rate: rateNumber(payment?.usd_inr_rate),
      cashout_rate_source: "invoice_payment",
      allocation_source: "inferred",
    });
  }

  return drafts;
}

export function refreshAllocationCashout({
  paymentRate,
  manualRate,
  overrideReason,
}: {
  paymentRate: number | string | null | undefined;
  manualRate?: number | string | null;
  overrideReason?: string | null;
}): {
  cashout_rate: number | null;
  cashout_rate_source: CashoutRateSource;
  override_reason: string | null;
} {
  if (manualRate !== undefined && manualRate !== null && `${manualRate}`.trim() !== "") {
    if (!overrideReason?.trim()) {
      throw new Error("Override reason is required.");
    }
    return {
      cashout_rate: rateNumber(manualRate),
      cashout_rate_source: "manual_override",
      override_reason: overrideReason.trim(),
    };
  }

  return {
    cashout_rate: rateNumber(paymentRate),
    cashout_rate_source: "invoice_payment",
    override_reason: null,
  };
}

export function summarizeAdminFinance(input: AdminFinanceSummaryInput): AdminFinanceSummary {
  const totalInvoicedUsdCents = input.employerReceivables.reduce((sum, row) => sum + row.amountUsdCents, 0);
  const totalReceivedUsdCents = input.employerReceivables.reduce((sum, row) => sum + row.receivedUsdCents, 0);
  const totalEmployeePayoutInrCents = input.employeePayables.reduce((sum, row) => sum + row.actualPaidInrCents, 0);
  const pendingReceivableUsdCents = input.employerReceivables.reduce((sum, row) => {
    return row.status === "received" || row.status === "cashed_out" || row.status === "paid"
      ? sum
      : sum + row.amountUsdCents;
  }, 0);
  const pendingSalaryInrCents = input.employeePayables.reduce((sum, row) => row.paid ? sum : sum + row.actualPaidInrCents, 0);
  const rates = input.employerReceivables.map((row) => row.cashoutRate).filter((rate): rate is number => typeof rate === "number" && rate > 0);
  const averageCashoutRate = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null;
  const estimatedReceivedInrCents = averageCashoutRate === null ? null : Math.round(totalReceivedUsdCents * averageCashoutRate);

  return {
    totalInvoicedUsdCents,
    totalReceivedUsdCents,
    totalEmployeePayoutInrCents,
    pendingReceivableUsdCents,
    pendingSalaryInrCents,
    averageCashoutRate,
    estimatedMarginInrCents: estimatedReceivedInrCents === null ? null : estimatedReceivedInrCents - totalEmployeePayoutInrCents,
  };
}
