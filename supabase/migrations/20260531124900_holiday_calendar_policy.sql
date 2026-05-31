-- Holiday calendar and weekly-off approval workflow.
-- Employer proposals become active only after admin approval.

create table if not exists weekly_off_rules (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  is_weekly_off boolean not null default true,
  effective_from date not null,
  active boolean not null default true,
  source_request_id uuid,
  approved_by uuid references portal_users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists holiday_calendar_change_requests (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  request_type text not null check (request_type in ('holiday_add', 'holiday_edit', 'holiday_delete', 'weekly_off_change', 'date_override')),
  title text not null,
  proposed_payload jsonb not null default '{}'::jsonb,
  effective_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_by uuid references portal_users(id) on delete set null,
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists holiday_overrides (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  date date not null,
  override_type text not null check (override_type in ('working_day', 'holiday')),
  name text,
  reason text,
  source_request_id uuid references holiday_calendar_change_requests(id) on delete set null,
  approved_by uuid references portal_users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employer_id, date)
);

alter table weekly_off_rules
  add constraint weekly_off_rules_source_request_fk
  foreign key (source_request_id)
  references holiday_calendar_change_requests(id)
  on delete set null;

create index if not exists weekly_off_rules_employer_effective_idx on weekly_off_rules (employer_id, effective_from, active);
create index if not exists holiday_calendar_change_requests_employer_status_idx on holiday_calendar_change_requests (employer_id, status, created_at desc);
create index if not exists holiday_calendar_change_requests_status_idx on holiday_calendar_change_requests (status, created_at desc);
create index if not exists holiday_overrides_employer_date_idx on holiday_overrides (employer_id, date);

alter table weekly_off_rules enable row level security;
alter table holiday_calendar_change_requests enable row level security;
alter table holiday_overrides enable row level security;

drop trigger if exists set_weekly_off_rules_updated_at on weekly_off_rules;
create trigger set_weekly_off_rules_updated_at
before update on weekly_off_rules
for each row execute function set_updated_at();

drop trigger if exists set_holiday_calendar_change_requests_updated_at on holiday_calendar_change_requests;
create trigger set_holiday_calendar_change_requests_updated_at
before update on holiday_calendar_change_requests
for each row execute function set_updated_at();
