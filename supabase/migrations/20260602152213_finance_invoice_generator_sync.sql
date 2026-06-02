create table if not exists finance_sync_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into finance_sync_sources (source_key, display_name)
values ('invoice_generator', 'Invoice Generator')
on conflict (source_key) do update set display_name = excluded.display_name;

create table if not exists finance_company_mappings (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_company_id text not null,
  external_company_name text not null,
  employer_id uuid references employers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_company_id)
);

create table if not exists finance_employee_mappings (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_employee_id text not null,
  external_company_id text not null,
  external_employee_name text not null,
  external_employee_email text,
  employer_id uuid references employers(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_employee_id)
);

create table if not exists finance_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_invoice_id text,
  status text not null check (status in ('synced', 'needs_mapping', 'failed')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists finance_invoices (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_invoice_id text not null,
  external_company_id text not null,
  employer_id uuid references employers(id) on delete set null,
  invoice_number text not null,
  month integer not null check (month between 1 and 12),
  year integer not null,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  billing_date date,
  due_date date,
  status text not null,
  note_text text,
  subtotal_usd_cents integer not null default 0,
  adjustments_usd_cents integer not null default 0,
  grand_total_usd_cents integer not null default 0,
  pdf_path text,
  sync_status text not null default 'needs_mapping' check (sync_status in ('synced', 'needs_mapping')),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_invoice_id)
);

create table if not exists finance_invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_line_item_id text not null,
  invoice_id uuid not null references finance_invoices(id) on delete cascade,
  external_invoice_id text not null,
  external_employee_id text not null,
  employer_id uuid references employers(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  employee_name_snapshot text not null,
  designation_snapshot text,
  team_name_snapshot text,
  billing_rate_usd_cents integer not null default 0,
  payout_monthly_usd_cents_snapshot integer not null default 0,
  hrs_per_week numeric(8,2),
  days_worked integer,
  billed_total_usd_cents integer not null default 0,
  payout_total_usd_cents integer not null default 0,
  profit_total_usd_cents integer not null default 0,
  sync_status text not null default 'needs_mapping' check (sync_status in ('synced', 'needs_mapping')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_line_item_id)
);

create table if not exists finance_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_payment_id text not null,
  invoice_id uuid not null references finance_invoices(id) on delete cascade,
  external_invoice_id text not null,
  external_company_id text not null,
  employer_id uuid references employers(id) on delete set null,
  payment_date date,
  payment_month text not null check (payment_month ~ '^\d{4}-\d{2}$'),
  usd_inr_rate numeric(12,4) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_payment_id)
);

create table if not exists finance_employee_salary_payments (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_salary_payment_id text not null,
  external_employee_id text not null,
  external_company_id text not null,
  employer_id uuid references employers(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  salary_usd_cents integer not null default 0,
  paid_usd_inr_rate numeric(12,4) not null default 0,
  salary_paid_inr_cents bigint not null default 0,
  paid_status boolean not null default false,
  paid_date date,
  notes text,
  sync_status text not null default 'needs_mapping' check (sync_status in ('synced', 'needs_mapping')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_salary_payment_id)
);

create table if not exists finance_employee_statement_rows (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_statement_row_id text not null,
  external_employee_id text not null,
  external_invoice_id text not null,
  employee_id uuid references employees(id) on delete set null,
  invoice_id uuid references finance_invoices(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  employee_name_snapshot text not null,
  invoice_number_snapshot text not null,
  dollar_inward_usd_cents integer not null default 0,
  onboarding_advance_usd_cents integer not null default 0,
  reimbursement_usd_cents integer not null default 0,
  reimbursement_labels_text text not null default '',
  appraisal_advance_usd_cents integer not null default 0,
  offboarding_deduction_usd_cents integer not null default 0,
  sync_status text not null default 'needs_mapping' check (sync_status in ('synced', 'needs_mapping')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_statement_row_id)
);

create table if not exists finance_employee_statement_summaries (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references finance_sync_sources(source_key) on delete cascade default 'invoice_generator',
  external_statement_summary_id text not null,
  external_employee_id text not null,
  employee_id uuid references employees(id) on delete set null,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  month_label_snapshot text not null,
  effective_dollar_inward_usd_cents integer not null default 0,
  monthly_dollar_paid_usd_cents integer not null default 0,
  sync_status text not null default 'needs_mapping' check (sync_status in ('synced', 'needs_mapping')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_statement_summary_id)
);

create index if not exists finance_company_mappings_employer_idx on finance_company_mappings(employer_id);
create index if not exists finance_employee_mappings_employee_idx on finance_employee_mappings(employee_id);
create index if not exists finance_invoices_employer_month_idx on finance_invoices(employer_id, month_key);
create index if not exists finance_line_items_employer_employee_idx on finance_invoice_line_items(employer_id, employee_id, external_employee_id);
create index if not exists finance_payments_employer_month_idx on finance_invoice_payments(employer_id, payment_month);
create index if not exists finance_salary_employee_month_idx on finance_employee_salary_payments(employee_id, month_key);
create index if not exists finance_statement_rows_employee_month_idx on finance_employee_statement_rows(employee_id, month_key);
create index if not exists finance_statement_summaries_employee_month_idx on finance_employee_statement_summaries(employee_id, month_key);

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'finance_sync_sources',
    'finance_company_mappings',
    'finance_employee_mappings',
    'finance_sync_runs',
    'finance_invoices',
    'finance_invoice_line_items',
    'finance_invoice_payments',
    'finance_employee_salary_payments',
    'finance_employee_statement_rows',
    'finance_employee_statement_summaries'
  ] loop
    execute format('alter table %I enable row level security', table_name);
  end loop;
end $$;

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'finance_sync_sources',
    'finance_company_mappings',
    'finance_employee_mappings',
    'finance_invoices',
    'finance_invoice_line_items',
    'finance_invoice_payments',
    'finance_employee_salary_payments',
    'finance_employee_statement_rows',
    'finance_employee_statement_summaries'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on %I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
  end loop;
end $$;
