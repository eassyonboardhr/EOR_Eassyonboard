create or replace function public.calculate_portal_employer_monthly_bill()
returns trigger
language plpgsql
as $$
begin
  new.monthly_bill := round(((coalesce(new.hourly_rate, 0) * coalesce(new.hours_per_week, 0) * 52) / 12)::numeric, 2);
  return new;
end;
$$;

create table if not exists public.portal_employer_invoice_records (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  invoice_month date not null,
  invoice_no text,
  days_worked numeric(12,2),
  hourly_rate numeric(12,2) not null default 0,
  hours_per_week numeric(12,2) not null default 0,
  monthly_bill numeric(12,2) not null default 0,
  status text not null default 'raised',
  currency text not null default 'USD',
  created_by uuid references public.portal_users(id) on delete set null,
  updated_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_employer_invoice_status_check check (status in ('raised', 'received', 'paid')),
  constraint portal_employer_invoice_amounts_check check (
    (days_worked is null or days_worked >= 0)
    and hourly_rate >= 0
    and hours_per_week >= 0
    and monthly_bill >= 0
  ),
  constraint portal_employer_invoice_unique_month unique (employer_id, employee_id, invoice_month)
);

drop trigger if exists calculate_portal_employer_monthly_bill on public.portal_employer_invoice_records;
create trigger calculate_portal_employer_monthly_bill
  before insert or update of hourly_rate, hours_per_week
  on public.portal_employer_invoice_records
  for each row execute function public.calculate_portal_employer_monthly_bill();

drop trigger if exists set_portal_employer_invoice_records_updated_at on public.portal_employer_invoice_records;
create trigger set_portal_employer_invoice_records_updated_at
  before update on public.portal_employer_invoice_records
  for each row execute function public.set_updated_at();

create table if not exists public.portal_employer_invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_record_id uuid not null references public.portal_employer_invoice_records(id) on delete cascade,
  label text not null,
  amount numeric(12,2),
  note text,
  created_by uuid references public.portal_users(id) on delete set null,
  updated_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_employer_invoice_line_items_label_check
    check (label in ('Other', 'Reimbursements', 'Onboarding Advance', 'Offboarding Deduction', 'Appraisal Advance', 'Note')),
  constraint portal_employer_invoice_line_items_amount_check
    check ((label = 'Note' and amount is null) or (label <> 'Note' and amount is not null and amount >= 0))
);

drop trigger if exists set_portal_employer_invoice_line_items_updated_at on public.portal_employer_invoice_line_items;
create trigger set_portal_employer_invoice_line_items_updated_at
  before update on public.portal_employer_invoice_line_items
  for each row execute function public.set_updated_at();

create table if not exists public.portal_employee_payroll_records (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_month date not null,
  gross_salary_inr numeric(12,2) not null default 0,
  actual_paid_inr numeric(12,2) not null default 0,
  payment_date date,
  payment_status text not null default 'pending',
  created_by uuid references public.portal_users(id) on delete set null,
  updated_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_employee_payroll_status_check check (payment_status in ('pending', 'paid', 'hold')),
  constraint portal_employee_payroll_amounts_check check (gross_salary_inr >= 0 and actual_paid_inr >= 0),
  constraint portal_employee_payroll_unique_month unique (employer_id, employee_id, payroll_month)
);

drop trigger if exists set_portal_employee_payroll_records_updated_at on public.portal_employee_payroll_records;
create trigger set_portal_employee_payroll_records_updated_at
  before update on public.portal_employee_payroll_records
  for each row execute function public.set_updated_at();

create table if not exists public.portal_employee_payroll_line_items (
  id uuid primary key default gen_random_uuid(),
  payroll_record_id uuid not null references public.portal_employee_payroll_records(id) on delete cascade,
  label text not null,
  amount numeric(12,2),
  note text,
  created_by uuid references public.portal_users(id) on delete set null,
  updated_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_employee_payroll_line_items_label_check
    check (label in ('PF', 'TDS', 'Deductions', 'Reimbursements', 'Note')),
  constraint portal_employee_payroll_line_items_amount_check
    check ((label = 'Note' and amount is null) or (label <> 'Note' and amount is not null and amount >= 0))
);

drop trigger if exists set_portal_employee_payroll_line_items_updated_at on public.portal_employee_payroll_line_items;
create trigger set_portal_employee_payroll_line_items_updated_at
  before update on public.portal_employee_payroll_line_items
  for each row execute function public.set_updated_at();

create table if not exists public.portal_payslip_files (
  id uuid primary key default gen_random_uuid(),
  payroll_record_id uuid not null references public.portal_employee_payroll_records(id) on delete cascade,
  employer_id uuid not null references public.employers(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_month date not null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid references public.portal_users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint portal_payslip_files_unique_payroll unique (payroll_record_id),
  constraint portal_payslip_files_size_check check (file_size_bytes is null or file_size_bytes >= 0)
);

create index if not exists portal_employer_invoice_employer_month_idx
  on public.portal_employer_invoice_records(employer_id, invoice_month);
create index if not exists portal_employer_invoice_employee_month_idx
  on public.portal_employer_invoice_records(employee_id, invoice_month);
create index if not exists portal_employer_invoice_status_month_idx
  on public.portal_employer_invoice_records(status, invoice_month);
create index if not exists portal_employer_invoice_no_idx
  on public.portal_employer_invoice_records(invoice_no);
create index if not exists portal_employer_invoice_line_items_record_idx
  on public.portal_employer_invoice_line_items(invoice_record_id);
create index if not exists portal_employer_invoice_line_items_label_idx
  on public.portal_employer_invoice_line_items(label);

create index if not exists portal_employee_payroll_employee_month_idx
  on public.portal_employee_payroll_records(employee_id, payroll_month);
create index if not exists portal_employee_payroll_employer_month_idx
  on public.portal_employee_payroll_records(employer_id, payroll_month);
create index if not exists portal_employee_payroll_status_month_idx
  on public.portal_employee_payroll_records(payment_status, payroll_month);
create index if not exists portal_employee_payroll_line_items_record_idx
  on public.portal_employee_payroll_line_items(payroll_record_id);
create index if not exists portal_employee_payroll_line_items_label_idx
  on public.portal_employee_payroll_line_items(label);

create index if not exists portal_payslip_files_payroll_idx
  on public.portal_payslip_files(payroll_record_id);
create index if not exists portal_payslip_files_employee_month_idx
  on public.portal_payslip_files(employee_id, payroll_month);
create index if not exists portal_payslip_files_employer_month_idx
  on public.portal_payslip_files(employer_id, payroll_month);

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'portal_employer_invoice_records',
    'portal_employer_invoice_line_items',
    'portal_employee_payroll_records',
    'portal_employee_payroll_line_items',
    'portal_payslip_files'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do update set public = false;
