export const employerInvoiceLineItemLabels = [
  "Other",
  "Reimbursements",
  "Onboarding Advance",
  "Offboarding Deduction",
  "Appraisal Advance",
  "Note",
] as const;

export const employeePayrollLineItemLabels = [
  "PF",
  "TDS",
  "Deductions",
  "Reimbursements",
  "Note",
] as const;

export const employerInvoiceStatuses = ["raised", "received", "paid"] as const;
export const employeePayrollStatuses = ["pending", "paid", "hold"] as const;

export type EmployerInvoiceLineItemLabel = (typeof employerInvoiceLineItemLabels)[number];
export type EmployeePayrollLineItemLabel = (typeof employeePayrollLineItemLabels)[number];
export type EmployerInvoiceStatus = (typeof employerInvoiceStatuses)[number];
export type EmployeePayrollStatus = (typeof employeePayrollStatuses)[number];

export type PortalFinanceFilters = {
  employerIds: string[];
  employeeIds: string[];
  months: string[];
  statuses: string[];
};

export type PortalEmployerInvoiceRecord = {
  id: string;
  employer_id: string;
  employee_id: string;
  invoice_month: string;
  invoice_no: string | null;
  days_worked: number | string | null;
  hourly_rate: number | string;
  hours_per_week: number | string;
  monthly_bill: number | string;
  status: EmployerInvoiceStatus | string;
  currency: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  employers?: { id: string; name: string | null } | null;
  employees?: { id: string; full_name: string | null; email: string | null } | null;
  portal_employer_invoice_line_items?: PortalEmployerInvoiceLineItem[];
};

export type PortalEmployerInvoiceLineItem = {
  id: string;
  invoice_record_id: string;
  label: EmployerInvoiceLineItemLabel | string;
  amount: number | string | null;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PortalEmployeePayrollRecord = {
  id: string;
  employer_id: string;
  employee_id: string;
  payroll_month: string;
  gross_salary_inr: number | string;
  actual_paid_inr: number | string;
  payment_date: string | null;
  payment_status: EmployeePayrollStatus | string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  employers?: { id: string; name: string | null } | null;
  employees?: { id: string; full_name: string | null; email: string | null } | null;
  portal_employee_payroll_line_items?: PortalEmployeePayrollLineItem[];
  portal_payslip_files?: PortalPayslipFile[];
};

export type PortalEmployeePayrollLineItem = {
  id: string;
  payroll_record_id: string;
  label: EmployeePayrollLineItemLabel | string;
  amount: number | string | null;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PortalPayslipFile = {
  id: string;
  payroll_record_id: string;
  employer_id: string;
  employee_id: string;
  payroll_month: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
  signed_url?: string | null;
};

export function calculateMonthlyBill(hourlyRate: number, hoursPerWeek: number): number {
  const bill = (Number(hourlyRate || 0) * Number(hoursPerWeek || 0) * 52) / 12;
  return Math.round((bill + Number.EPSILON) * 100) / 100;
}

export function normalizeFinanceMonth(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

export function isEmployerInvoiceLineItemLabel(value: string): value is EmployerInvoiceLineItemLabel {
  return employerInvoiceLineItemLabels.includes(value as EmployerInvoiceLineItemLabel);
}

export function isEmployeePayrollLineItemLabel(value: string): value is EmployeePayrollLineItemLabel {
  return employeePayrollLineItemLabels.includes(value as EmployeePayrollLineItemLabel);
}

export function isEmployerInvoiceStatus(value: string): value is EmployerInvoiceStatus {
  return employerInvoiceStatuses.includes(value as EmployerInvoiceStatus);
}

export function isEmployeePayrollStatus(value: string): value is EmployeePayrollStatus {
  return employeePayrollStatuses.includes(value as EmployeePayrollStatus);
}
