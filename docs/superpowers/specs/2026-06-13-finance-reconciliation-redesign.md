# Finance Reconciliation Redesign

## Summary

Redesign the portal Finance area around role-specific financial statements and an admin reconciliation workflow. The current Finance page mixes employer billing, employee salary data, invoice status, and synced Invoice Generator records into one broad view. The new design separates those concerns:

- Admins get a full reconciliation workspace across employer receivables, employee payables, invoice payments, payroll months, and cashout rates.
- Employers get an employer-safe employee statement that mirrors the Invoice Generator statement without exposing salary internals.
- Employees get only their INR salary breakdown.
- Admins opening an employee from Worktree can preview exactly what the employer and employee each see, plus admin-only reconciliation controls.

## Definitions

- **Invoice month**: The month the invoice was raised for or belongs to.
- **Paid month**: The month the employer payment was received or cashed out.
- **Payroll month**: The month salary was paid to employees.
- **Cashout rate**: The USD-INR rate attached to the invoice payment/cashout used for reconciliation.
- **Allocation**: The portal-owned link between an invoice payment and an employee salary payment.
- **Inferred allocation**: A system-suggested allocation based on employer, employee, invoice line item, and closest month relationship.
- **Manual allocation**: An admin-edited allocation that must not be overwritten by future inference.

## Current Context

The portal already syncs finance data from Invoice Generator into these tables:

- `finance_invoices`
- `finance_invoice_line_items`
- `finance_invoice_payments`
- `finance_employee_salary_payments`
- `finance_employee_statement_rows`
- `finance_employee_statement_summaries`
- `finance_company_mappings`
- `finance_employee_mappings`

The current Finance UI in `app/dashboard/finances/page.tsx` reads from `lib/portal/finances.ts` and presents a mixed role-aware page. Worktree finance action pages already read a subset of invoice line items, statement rows, statement summaries, and salary payments, but they do not yet expose the desired role previews or editable allocation workflow.

## Recommended Approach

Use a Finance Ledger + Editable Allocations approach.

The synced Invoice Generator tables remain source snapshots. The portal adds a small reconciliation layer that records how invoice payments are used against payroll. This avoids creating a full accounting system while still solving the real operational problem: admins need to see what was invoiced, when money came in, what payroll it funded, and which cashout rate applies.

## Admin Finance Page

The admin Finance page becomes a reconciliation workspace with multi-select comparison from day one.

### Filters

The filter bar supports:

- Invoice month: multi-select and range.
- Paid month: multi-select and range.
- Payroll month: multi-select and range.
- Employer: multi-select.
- Employee: multi-select, narrowed by selected employers.
- Status: invoice raised, payment received, settled, salary pending, salary paid.
- Allocation source: inferred, manual.
- Cashout rate source: invoice payment, manual override.

The default grouping should be paid month because it answers the cash reconciliation question: what money came in this month, what salary went out, and what rate was used. Rows must still show invoice month and payroll month side by side.

### Sections

1. **Summary Cards**
   - Total invoiced.
   - Total received.
   - Total employee payouts.
   - Pending employer receivables.
   - Pending salary payouts.
   - Average cashout rate.
   - Estimated margin where data exists.

2. **Employer Receivables**
   - Employer.
   - Invoice number.
   - Invoice month.
   - Paid month.
   - Invoice amount.
   - Internal payment status.
   - Admin-only cashout rate.
   - Employees covered by invoice.

3. **Employee Payables**
   - Employee.
   - Employer.
   - Payroll month.
   - Gross/base INR.
   - PF.
   - TDS.
   - Allowances and reimbursements.
   - Leave deductions.
   - Advances and offboarding deductions.
   - Actual paid.
   - Paid date and status.

4. **Invoice-To-Payroll Allocation**
   - Invoice/payment used.
   - Invoice month.
   - Paid month.
   - Payroll month.
   - Employee.
   - Allocated amount.
   - Cashout rate.
   - Allocation source: inferred or manual.
   - Cashout rate source: invoice payment or manual override.
   - Edit action.

5. **Role Preview**
   - Employer View Preview: exactly what the employer sees for selected employee/employer records.
   - Employee View Preview: exactly what the employee sees for selected salary records.

## Employer Finance View

Employers see only an employer-safe statement.

Employers can see:

- Invoice number.
- Invoice month.
- Employee name.
- Designation or team when available.
- Days worked or hours when synced.
- Amount billed for that employee.
- Employer-safe payment status:
  - `Invoice raised`
  - `Payment received`
  - `Settled`
- Invoice PDF link if available and allowed.

Employers cannot see:

- Employee salary paid.
- PF or TDS.
- Employee deductions.
- Cashout or FX rate.
- Profit or margin.
- Allocation internals.

## Employee Finance View

Employees see only their own INR salary statement.

Employees can see:

- Payroll month.
- Gross/base salary.
- Allowances.
- Reimbursements.
- PF.
- TDS.
- Leave deductions and LOP.
- Advances.
- Offboarding deductions.
- Actual paid.
- Paid status and date.
- Employee-safe notes.

Employees cannot see:

- Employer invoices.
- Employer payment status.
- Cashout or FX rate.
- Profit or margin.
- Other employees.

## Worktree Finance Behavior

When an admin opens an employee from Worktree and selects Finances, show:

- Employer View Preview.
- Employee View Preview.
- Admin Reconciliation panel with allocation and cashout rate controls.

When an employer admin opens an employee from Worktree and selects Finances, show only the employer-safe statement for that employee.

When an employee opens finance-related views, show only that employee's salary breakdown.

## New Allocation Table

Add a portal-owned table named `finance_payroll_allocations`.

Suggested columns:

- `id uuid primary key`
- `source_key text not null default 'invoice_generator'`
- `employer_id uuid not null references employers(id)`
- `employee_id uuid not null references employees(id)`
- `invoice_id uuid references finance_invoices(id)`
- `invoice_payment_id uuid references finance_invoice_payments(id)`
- `salary_payment_id uuid references finance_employee_salary_payments(id)`
- `invoice_month text`
- `paid_month text`
- `payroll_month text`
- `allocated_usd_cents integer not null default 0`
- `cashout_rate numeric`
- `cashout_rate_source text not null default 'invoice_payment'`
- `allocation_source text not null default 'inferred'`
- `override_reason text`
- `created_by uuid references portal_users(id)`
- `updated_by uuid references portal_users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Allowed values:

- `cashout_rate_source`: `invoice_payment`, `manual_override`
- `allocation_source`: `inferred`, `manual`

Indexes:

- `(employer_id, paid_month)`
- `(employee_id, payroll_month)`
- `(invoice_id)`
- `(invoice_payment_id)`
- `(salary_payment_id)`
- `(allocation_source)`

## Allocation Rules

### Inference

The portal may infer allocations when finance data syncs or when admin opens the Finance page.

Inference should:

- Match by employer and employee.
- Prefer invoice line items linked to the same employee.
- Prefer `paid_month = payroll_month`.
- Fall back to closest invoice/payment month when an exact match is unavailable.
- Create rows marked `allocation_source = 'inferred'`.
- Never overwrite rows marked `allocation_source = 'manual'`.

### Editing

Admins can edit:

- Invoice/payment used.
- Allocated amount.
- Cashout rate override.
- Override reason.

When invoice/payment changes:

- Refresh `cashout_rate` from the selected invoice payment.
- Set `cashout_rate_source = 'invoice_payment'` unless the admin explicitly overrides it.
- Recompute derived summaries from the updated allocation.
- Write an audit event.

When cashout rate is manually changed:

- Set `cashout_rate_source = 'manual_override'`.
- Require an override reason.
- Write an audit event.

## Public Interfaces

Replace the broad finance data helper with role-specific helpers:

- `getAdminFinanceReconciliation(session, filters)`
- `getEmployerFinanceStatement(session, filters)`
- `getEmployeeSalaryStatement(session, filters)`
- `getEmployeeFinanceRolePreview(session, employeeId, filters)`

Add server actions:

- `inferFinancePayrollAllocationsAction(formData)`
- `updateFinancePayrollAllocationAction(formData)`
- `markFinanceInvoicePaymentReceivedAction(formData)` remains available and should continue to update invoice payment records.

## Privacy Boundary

The allocation table and cashout rate are admin-only.

Employer and employee views must be built from safe DTOs instead of passing full admin reconciliation rows into UI components. This prevents accidental rendering of hidden fields such as salary internals, cashout rates, margin, or allocation metadata.

## Testing

Unit/action tests:

- Admin can read employer receivables, employee payables, and allocations.
- Employer cannot receive salary, PF, TDS, cashout, margin, or allocation fields.
- Employee cannot receive invoice, employer payment, cashout, margin, or other-employee fields.
- Inference creates allocation rows for matching employee invoice line items and salary payments.
- Inference does not overwrite manual allocations.
- Changing invoice payment refreshes cashout rate from the payment row.
- Manual cashout override requires a reason and writes audit.
- Multi-select month/employer/employee filters return expected rows.

UI/regression checks:

- Admin Finance shows summary, receivables, payables, allocations, and role previews.
- Employer Finance shows only employer-safe invoice/employee statement rows.
- Employee Finance shows only INR salary components.
- Admin Worktree employee finance action shows employer preview, employee preview, and admin reconciliation.
- Employer Worktree employee finance action hides salary internals and cashout.
- Employee salary view hides invoice and employer payment data.

Verification commands:

- `npm test`
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`

## Deferred Scope

Do not build these in the first pass:

- Full journal-entry accounting.
- Excel/PDF exports.
- Advanced partial allocation across many invoices unless current data requires it.
- Portal-generated employer statement PDFs.
- Portal-generated employee payslip PDFs.

## Approval State

This design reflects the approved brainstorming decisions:

- Admin Finance supports multi-select comparison from day one.
- Default reconciliation grouping is paid month.
- Invoice month, paid month, and payroll month are all visible.
- Allocation starts as inferred but remains editable by admin.
- Changing the invoice/payment changes the cashout rate used for reconciliation.
- Employees do not see cashout rates.
- Employers see safe statuses: invoice raised, payment received, settled.
