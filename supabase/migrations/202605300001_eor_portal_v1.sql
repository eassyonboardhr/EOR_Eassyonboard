create extension if not exists "pgcrypto";

do $$ begin
  create type portal_role as enum ('super_admin', 'admin', 'employer_admin', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('pending', 'active', 'suspended', 'deactivated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status as enum ('pending', 'approved', 'rejected', 'invite_sent', 'joined', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leave_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type resignation_status as enum ('submitted_to_admin', 'forwarded_to_employer', 'employer_acknowledged', 'offboarding_requested', 'admin_approved_offboarding', 'offboarding_in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offboarding_status as enum ('requested_by_employer', 'requested_after_resignation', 'admin_approved', 'admin_rejected', 'employee_notified', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notice_priority as enum ('normal', 'important', 'urgent');
exception when duplicate_object then null; end $$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists employers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  contact_email text not null,
  contact_name text,
  status account_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists portal_users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text not null,
  full_name text,
  role portal_role not null,
  status account_status not null default 'pending',
  employer_id uuid references employers(id) on delete set null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table employers
  add constraint employers_approved_by_fkey
  foreign key (approved_by) references portal_users(id) on delete set null;

create table if not exists employer_leads (
  id uuid primary key default gen_random_uuid(),
  portal_user_id uuid references portal_users(id) on delete set null,
  email text not null,
  contact_name text,
  company_name text,
  phone text,
  message text,
  status review_status not null default 'pending',
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  portal_user_id uuid unique references portal_users(id) on delete set null,
  email text not null,
  full_name text not null,
  job_title text,
  department text,
  start_date date,
  status account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_id, email)
);

create table if not exists employee_requests (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  requested_by uuid references portal_users(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  email text not null,
  full_name text not null,
  job_title text,
  department text,
  proposed_start_date date,
  status review_status not null default 'pending',
  admin_notes text,
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leave_policies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  year integer not null,
  casual_leave numeric(6,2) not null default 0,
  sick_leave numeric(6,2) not null default 0,
  earned_leave numeric(6,2) not null default 0,
  public_holidays integer not null default 0,
  weekly_off text,
  carry_forward_allowed boolean not null default false,
  max_carry_forward numeric(6,2) not null default 0,
  encashment_allowed boolean not null default false,
  probation_leave_allowed boolean not null default false,
  accrual_notes text,
  half_day_allowed boolean not null default true,
  notice_period_days integer not null default 30,
  lop_policy text,
  comp_off_allowed boolean not null default false,
  maternity_leave_days integer not null default 0,
  paternity_leave_days integer not null default 0,
  bereavement_leave_days integer not null default 0,
  created_by uuid references portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_id, year)
);

create table if not exists leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  year integer not null,
  casual_available numeric(6,2) not null default 0,
  sick_available numeric(6,2) not null default 0,
  earned_available numeric(6,2) not null default 0,
  comp_off_available numeric(6,2) not null default 0,
  lop_days numeric(6,2) not null default 0,
  adjusted_by uuid references portal_users(id) on delete set null,
  adjustment_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, year)
);

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employer_id uuid not null references employers(id) on delete cascade,
  leave_type text not null check (leave_type in ('casual', 'sick', 'earned', 'comp_off', 'lop', 'other')),
  start_date date not null,
  end_date date not null,
  days numeric(6,2) not null check (days > 0),
  reason text,
  status leave_request_status not null default 'pending',
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists resignations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employer_id uuid not null references employers(id) on delete cascade,
  reason text,
  preferred_last_working_day date,
  status resignation_status not null default 'submitted_to_admin',
  admin_notes text,
  employer_notes text,
  forwarded_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists offboarding_cases (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employer_id uuid not null references employers(id) on delete cascade,
  resignation_id uuid references resignations(id) on delete set null,
  requested_by uuid references portal_users(id) on delete set null,
  status offboarding_status not null default 'requested_by_employer',
  target_last_working_day date,
  employer_notes text,
  admin_notes text,
  approved_by uuid references portal_users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references portal_users(id) on delete set null,
  employer_id uuid references employers(id) on delete cascade,
  title text not null,
  body text not null,
  priority notice_priority not null default 'normal',
  requires_acknowledgement boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notice_recipients (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references notices(id) on delete cascade,
  recipient_user_id uuid not null references portal_users(id) on delete cascade,
  read_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notice_id, recipient_user_id)
);

create table if not exists employee_compensation (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  effective_from date not null,
  currency text not null default 'INR',
  monthly_salary numeric(14,2) not null check (monthly_salary >= 0),
  notes text,
  created_by uuid references portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employer_billing (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employer_id uuid not null references employers(id) on delete cascade,
  effective_from date not null,
  currency text not null default 'INR',
  monthly_bill_amount numeric(14,2) not null check (monthly_bill_amount >= 0),
  notes text,
  created_by uuid references portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references portal_users(id) on delete set null,
  employer_id uuid references employers(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portal_users_email_idx on portal_users (lower(email));
create index if not exists portal_users_role_status_idx on portal_users (role, status);
create index if not exists portal_users_employer_idx on portal_users (employer_id);
create index if not exists employer_leads_status_idx on employer_leads (status, created_at desc);
create index if not exists employers_status_idx on employers (status, created_at desc);
create index if not exists employees_employer_status_idx on employees (employer_id, status);
create index if not exists employee_requests_employer_status_idx on employee_requests (employer_id, status, created_at desc);
create index if not exists leave_requests_employee_idx on leave_requests (employee_id, created_at desc);
create index if not exists leave_requests_employer_status_idx on leave_requests (employer_id, status, created_at desc);
create index if not exists resignations_employer_status_idx on resignations (employer_id, status, created_at desc);
create index if not exists offboarding_employer_status_idx on offboarding_cases (employer_id, status, created_at desc);
create index if not exists notice_recipients_user_idx on notice_recipients (recipient_user_id, created_at desc);
create index if not exists audit_events_actor_idx on audit_events (actor_user_id, created_at desc);

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'portal_users', 'employer_leads', 'employers', 'employees', 'employee_requests',
    'leave_policies', 'leave_balances', 'leave_requests', 'resignations',
    'offboarding_cases', 'notices', 'notice_recipients', 'employee_compensation',
    'employer_billing', 'audit_events'
  ] loop
    execute format('alter table %I enable row level security', table_name);
  end loop;
end $$;

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'portal_users', 'employer_leads', 'employers', 'employees', 'employee_requests',
    'leave_policies', 'leave_balances', 'leave_requests', 'resignations',
    'offboarding_cases', 'notices', 'employee_compensation', 'employer_billing'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on %I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
  end loop;
end $$;
