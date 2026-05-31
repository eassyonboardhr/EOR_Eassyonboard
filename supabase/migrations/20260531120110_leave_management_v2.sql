-- Leave Management v2: calendar days, LOP, absence tracking, and role queues.
-- Safe additive migration only. Existing leave_requests/leave_balances rows are preserved.

alter table leave_requests
  add column if not exists total_selected_days integer,
  add column if not exists excluded_holiday_days integer not null default 0,
  add column if not exists total_leave_days numeric(6,2),
  add column if not exists paid_leave_days numeric(6,2) not null default 0,
  add column if not exists lop_days numeric(6,2) not null default 0,
  add column if not exists mobile_number text,
  add column if not exists rejection_reason text,
  add column if not exists approved_by uuid references portal_users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references portal_users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists created_by uuid references portal_users(id) on delete set null,
  add column if not exists created_for_employee_by uuid references portal_users(id) on delete set null,
  add column if not exists team_id uuid references teams(id) on delete set null;

update leave_requests
set
  total_selected_days = coalesce(total_selected_days, greatest(1, (end_date - start_date + 1))),
  total_leave_days = coalesce(total_leave_days, days),
  paid_leave_days = case when status = 'approved' then coalesce(nullif(paid_leave_days, 0), days) else paid_leave_days end
where total_selected_days is null or total_leave_days is null;

create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references employers(id) on delete cascade,
  date date not null,
  name text not null,
  type text not null default 'holiday',
  is_weekly_off boolean not null default false,
  created_at timestamptz not null default now(),
  unique (employer_id, date, name)
);

create table if not exists leave_request_days (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references leave_requests(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  is_holiday boolean not null default false,
  status leave_request_status not null default 'pending',
  is_lop boolean not null default false,
  absence_id uuid,
  created_at timestamptz not null default now(),
  unique (leave_request_id, date)
);

create table if not exists employee_absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employer_id uuid not null references employers(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  leave_request_id uuid references leave_requests(id) on delete set null,
  start_date date not null,
  end_date date not null,
  total_selected_days integer not null,
  excluded_holiday_days integer not null default 0,
  total_absent_days numeric(6,2) not null,
  is_lop boolean not null default true,
  reason text,
  mobile_number text,
  status text not null default 'recorded' check (status in ('recorded', 'converted_to_lop', 'cancelled')),
  marked_by uuid references portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists holidays_employer_date_idx on holidays (employer_id, date);
create index if not exists leave_request_days_request_idx on leave_request_days (leave_request_id);
create index if not exists leave_request_days_employee_date_idx on leave_request_days (employee_id, date);
create index if not exists leave_request_days_status_idx on leave_request_days (status);
create index if not exists employee_absences_employee_date_idx on employee_absences (employee_id, start_date, end_date);
create index if not exists employee_absences_employer_idx on employee_absences (employer_id, created_at desc);
create index if not exists leave_requests_team_idx on leave_requests (team_id);
create index if not exists leave_requests_created_by_idx on leave_requests (created_by);

alter table holidays enable row level security;
alter table leave_request_days enable row level security;
alter table employee_absences enable row level security;

drop trigger if exists set_employee_absences_updated_at on employee_absences;
create trigger set_employee_absences_updated_at
before update on employee_absences
for each row execute function set_updated_at();
