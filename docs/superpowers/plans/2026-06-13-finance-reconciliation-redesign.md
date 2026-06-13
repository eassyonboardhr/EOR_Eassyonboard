# Finance Reconciliation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mixed Finance page with role-specific finance statements and an admin reconciliation workspace with editable invoice-to-payroll allocations.

**Architecture:** Keep synced Invoice Generator tables as source snapshots and add one portal-owned allocation table for reconciliation metadata. Split finance data loading into safe role-specific DTO helpers so admin, employer, and employee views cannot accidentally leak hidden fields.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, Supabase Postgres, Vitest, TypeScript, Tailwind CSS.

---

## File Structure

- Create `supabase/migrations/20260613143000_finance_payroll_allocations.sql`: adds `finance_payroll_allocations`, constraints, indexes, RLS, and updated-at trigger.
- Create `lib/portal/finance-allocations.ts`: pure helpers for month parsing, cashout selection, allocation inference, safe status labels, and summaries.
- Create `lib/portal/finance-allocations.test.ts`: unit tests for allocation inference, manual allocation preservation, cashout refresh, safe status labels, and filter parsing.
- Replace most of `lib/portal/finances.ts`: expose `getAdminFinanceReconciliation`, `getEmployerFinanceStatement`, `getEmployeeSalaryStatement`, `getEmployeeFinanceRolePreview`, plus compatibility `getFinancesData`.
- Modify `lib/portal/actions/finance.ts`: add `inferFinancePayrollAllocationsAction` and `updateFinancePayrollAllocationAction`; revalidate Finance and Worktree pages.
- Create `lib/portal/actions/finance.test.ts`: server-action level tests for admin access, manual override requirement, payment cashout refresh, and audit writes.
- Rewrite `app/dashboard/finances/page.tsx`: render role-specific admin/employer/employee finance pages.
- Modify `app/dashboard/worktree/actions/[targetType]/[targetId]/[action]/page.tsx`: use role preview helpers for employee finance action.

## Task 1: Allocation Schema

**Files:**
- Create: `supabase/migrations/20260613143000_finance_payroll_allocations.sql`

- [ ] **Step 1: Add allocation migration**

Create the migration with:

```sql
create table if not exists public.finance_payroll_allocations (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references public.finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  employer_id uuid not null references public.employers(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  invoice_id uuid references public.finance_invoices(id) on delete set null,
  invoice_payment_id uuid references public.finance_invoice_payments(id) on delete set null,
  salary_payment_id uuid references public.finance_employee_salary_payments(id) on delete set null,
  invoice_month text check (invoice_month is null or invoice_month ~ '^\d{4}-\d{2}$'),
  paid_month text check (paid_month is null or paid_month ~ '^\d{4}-\d{2}$'),
  payroll_month text check (payroll_month is null or payroll_month ~ '^\d{4}-\d{2}$'),
  allocated_usd_cents integer not null default 0,
  cashout_rate numeric(12,4),
  cashout_rate_source text not null default 'invoice_payment' check (cashout_rate_source in ('invoice_payment', 'manual_override')),
  allocation_source text not null default 'inferred' check (allocation_source in ('inferred', 'manual')),
  override_reason text,
  created_by uuid references public.portal_users(id) on delete set null,
  updated_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, salary_payment_id)
);

create index if not exists finance_allocations_employer_paid_month_idx
  on public.finance_payroll_allocations(employer_id, paid_month);
create index if not exists finance_allocations_employee_payroll_month_idx
  on public.finance_payroll_allocations(employee_id, payroll_month);
create index if not exists finance_allocations_invoice_idx
  on public.finance_payroll_allocations(invoice_id);
create index if not exists finance_allocations_invoice_payment_idx
  on public.finance_payroll_allocations(invoice_payment_id);
create index if not exists finance_allocations_source_idx
  on public.finance_payroll_allocations(allocation_source);

alter table public.finance_payroll_allocations enable row level security;

drop trigger if exists set_finance_payroll_allocations_updated_at on public.finance_payroll_allocations;
create trigger set_finance_payroll_allocations_updated_at
  before update on public.finance_payroll_allocations
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Commit migration**

Run:

```powershell
git add supabase/migrations/20260613143000_finance_payroll_allocations.sql
git commit -m "feat: add finance payroll allocations table"
```

Expected: commit succeeds with only the migration staged.

## Task 2: Allocation Helpers

**Files:**
- Create: `lib/portal/finance-allocations.ts`
- Create: `lib/portal/finance-allocations.test.ts`

- [ ] **Step 1: Write helper tests**

Add tests covering:

```ts
expect(toEmployerPaymentStatus("generated")).toBe("Invoice raised");
expect(toEmployerPaymentStatus("received")).toBe("Payment received");
expect(toEmployerPaymentStatus("cashed_out")).toBe("Settled");
```

Also test that `inferPayrollAllocations`:

- chooses an invoice line item for the same employee.
- prefers payment month equal to payroll month.
- preserves existing manual allocations.
- uses invoice payment `usd_inr_rate` as the cashout rate.

- [ ] **Step 2: Implement helper module**

Implement these exported functions:

```ts
export function toArrayFilter(value: string | string[] | undefined): string[];
export function toEmployerPaymentStatus(status: string | null | undefined): "Invoice raised" | "Payment received" | "Settled" | "Unknown";
export function centsNumber(value: number | string | null | undefined): number;
export function inferPayrollAllocations(input: InferPayrollAllocationsInput): FinancePayrollAllocationDraft[];
export function summarizeAdminFinance(input: AdminFinanceRows): AdminFinanceSummary;
```

The inference function must skip salary payments that already have a manual allocation and produce one draft per unmatched salary payment.

- [ ] **Step 3: Verify helper tests**

Run:

```powershell
npm test -- lib/portal/finance-allocations.test.ts
```

Expected: all helper tests pass.

- [ ] **Step 4: Commit helpers**

Run:

```powershell
git add lib/portal/finance-allocations.ts lib/portal/finance-allocations.test.ts
git commit -m "feat: add finance allocation helpers"
```

## Task 3: Role-Specific Finance Data Helpers

**Files:**
- Modify: `lib/portal/finances.ts`
- Test: `lib/portal/finance-allocations.test.ts`

- [ ] **Step 1: Replace broad data shape with safe DTOs**

Add exported types:

```ts
export type AdminFinanceReconciliation = {
  filters: FinanceFilters;
  employers: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; full_name: string; employer_id: string | null }>;
  summary: AdminFinanceSummary;
  employerReceivables: EmployerReceivableRow[];
  employeePayables: EmployeePayableRow[];
  allocations: AllocationRow[];
};

export type EmployerFinanceStatement = {
  filters: FinanceFilters;
  rows: EmployerStatementRow[];
  totals: { billedUsdCents: number };
};

export type EmployeeSalaryStatement = {
  rows: EmployeeSalaryStatementRow[];
  totals: { actualPaidInrCents: number; pfInrCents: number; tdsInrCents: number };
};
```

- [ ] **Step 2: Implement role-specific loaders**

Implement:

```ts
export async function getAdminFinanceReconciliation(session: PortalSession, filters: Record<string, string | string[] | undefined>): Promise<AdminFinanceReconciliation>;
export async function getEmployerFinanceStatement(session: PortalSession, filters: Record<string, string | string[] | undefined>): Promise<EmployerFinanceStatement>;
export async function getEmployeeSalaryStatement(session: PortalSession, filters: Record<string, string | string[] | undefined>): Promise<EmployeeSalaryStatement>;
export async function getEmployeeFinanceRolePreview(session: PortalSession, employeeId: string, filters?: Record<string, string | string[] | undefined>): Promise<{ employerView: EmployerFinanceStatement; employeeView: EmployeeSalaryStatement; adminAllocations: AllocationRow[] }>;
```

Rules:

- Admin helpers may query invoices, invoice payments, salary payments, line items, statement rows, statement summaries, and allocations.
- Employer helper must only return employer-safe fields.
- Employee helper must only return INR salary statement fields.
- Employee helper must resolve the employee from `portal_user_id` unless admin passes an employee id through role preview.
- Keep `getFinancesData` as a compatibility wrapper that calls the role-specific helpers.

- [ ] **Step 3: Run TypeScript**

Run:

```powershell
npx tsc --noEmit --pretty false
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit data helpers**

Run:

```powershell
git add lib/portal/finances.ts
git commit -m "feat: split finance data by role"
```

## Task 4: Finance Actions

**Files:**
- Modify: `lib/portal/actions/finance.ts`
- Create: `lib/portal/actions/finance.test.ts`

- [ ] **Step 1: Add action tests**

Add tests for:

- `updateFinancePayrollAllocationAction` rejects non-admin users.
- Changing `invoicePaymentId` sets `cashout_rate` from `finance_invoice_payments.usd_inr_rate`.
- Manual cashout override requires `overrideReason`.
- Successful update writes `audit_events` and revalidates `/dashboard/finances` and `/dashboard/worktree`.

- [ ] **Step 2: Implement actions**

Add:

```ts
export async function inferFinancePayrollAllocationsAction(formData: FormData) {
  const session = await requireAdmin();
  // Load rows, call inferPayrollAllocations, upsert inferred rows only.
}

export async function updateFinancePayrollAllocationAction(formData: FormData) {
  const session = await requireAdmin();
  // Validate allocationId, invoicePaymentId, allocatedUsdCents, cashoutRateOverride, overrideReason.
  // If invoicePaymentId changes, load payment and linked invoice.
  // Update allocation_source = "manual".
  // Use payment.usd_inr_rate unless cashoutRateOverride is provided.
  // Require overrideReason when cashoutRateOverride is provided.
}
```

- [ ] **Step 3: Verify action tests**

Run:

```powershell
npm test -- lib/portal/actions/finance.test.ts
```

Expected: all action tests pass.

- [ ] **Step 4: Commit actions**

Run:

```powershell
git add lib/portal/actions/finance.ts lib/portal/actions/finance.test.ts
git commit -m "feat: edit finance payroll allocations"
```

## Task 5: Finance Page UI

**Files:**
- Modify: `app/dashboard/finances/page.tsx`

- [ ] **Step 1: Rewrite role branches**

In `FinancesPage`, call:

- `getAdminFinanceReconciliation` for admin.
- `getEmployerFinanceStatement` for employer admin.
- `getEmployeeSalaryStatement` for employee.

- [ ] **Step 2: Add admin filters**

Render GET filters using repeated `month`, `invoiceMonth`, `paidMonth`, `payrollMonth`, `employer`, and `employee` query values. Use existing plain form controls; multi-select can use `select multiple`.

- [ ] **Step 3: Add admin sections**

Render:

- Summary cards.
- Employer receivables table.
- Employee payables table.
- Allocation table with edit forms using `updateFinancePayrollAllocationAction`.

- [ ] **Step 4: Add employer and employee views**

Employer page shows only employer statement rows and safe statuses. Employee page shows only INR salary rows and totals.

- [ ] **Step 5: Run lint and TypeScript**

Run:

```powershell
npm run lint
npx tsc --noEmit --pretty false
```

Expected: both pass.

- [ ] **Step 6: Commit UI**

Run:

```powershell
git add app/dashboard/finances/page.tsx
git commit -m "feat: redesign role-aware finance page"
```

## Task 6: Worktree Finance Preview

**Files:**
- Modify: `app/dashboard/worktree/actions/[targetType]/[targetId]/[action]/page.tsx`

- [ ] **Step 1: Use role preview helper for employee finance action**

For `targetType === "employee"` and `action === "finances"`:

- Admin sees Employer View Preview, Employee View Preview, and Admin Reconciliation.
- Employer admin sees only employer-safe statement.
- Employee sees only own salary statement.

- [ ] **Step 2: Keep non-finance Worktree behavior unchanged**

Do not change docs, leaves, resignation, or offboarding branches except for imports/types needed by finance preview.

- [ ] **Step 3: Verify build**

Run:

```powershell
npm run build
```

Expected: build completes and route list still includes `/dashboard/finances` and `/dashboard/worktree/actions/[targetType]/[targetId]/[action]`.

- [ ] **Step 4: Commit Worktree preview**

Run:

```powershell
git add app/dashboard/worktree/actions/[targetType]/[targetId]/[action]/page.tsx
git commit -m "feat: show finance previews from worktree"
```

## Task 7: Final Verification

**Files:**
- No code files unless verification finds a bug.

- [ ] **Step 1: Run full checks**

Run:

```powershell
npm test
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

Expected: all pass.

- [ ] **Step 2: Manual QA**

Start the dev server:

```powershell
npm run dev
```

Check:

- Admin `/dashboard/finances` shows multi-select filters and reconciliation sections.
- Employer `/dashboard/finances` hides salary internals and cashout.
- Employee `/dashboard/finances` hides invoices and cashout.
- Admin Worktree employee finance action shows both role previews plus admin reconciliation.

- [ ] **Step 3: Final commit if needed**

If verification fixes were required:

```powershell
git add <fixed-files>
git commit -m "fix: polish finance reconciliation"
```

## Self-Review

Spec coverage:

- Multi-select admin comparison is covered in Task 5.
- Invoice month, paid month, and payroll month are covered in Tasks 3 and 5.
- Editable inferred allocations are covered in Tasks 1, 2, and 4.
- Cashout refresh from changed invoice payment is covered in Tasks 2 and 4.
- Employee cashout privacy is covered in Tasks 3, 5, and 6.
- Employer-safe statuses are covered in Tasks 2, 3, 5, and 6.
- Worktree previews are covered in Task 6.

Placeholder scan:

- The plan intentionally defers full accounting and exports. No implementation step depends on undefined future work.

Type consistency:

- The same helper/action names are used across tasks: `getAdminFinanceReconciliation`, `getEmployerFinanceStatement`, `getEmployeeSalaryStatement`, `getEmployeeFinanceRolePreview`, `inferFinancePayrollAllocationsAction`, and `updateFinancePayrollAllocationAction`.
