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
create index if not exists finance_allocations_salary_payment_idx
  on public.finance_payroll_allocations(salary_payment_id);
create index if not exists finance_allocations_source_idx
  on public.finance_payroll_allocations(allocation_source);

alter table public.finance_payroll_allocations enable row level security;

drop trigger if exists set_finance_payroll_allocations_updated_at on public.finance_payroll_allocations;
create trigger set_finance_payroll_allocations_updated_at
  before update on public.finance_payroll_allocations
  for each row execute function public.set_updated_at();
