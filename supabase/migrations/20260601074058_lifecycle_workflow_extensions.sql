alter table employee_requests
  add column if not exists hourly_billing_rate numeric(12, 2),
  add column if not exists hours_per_week numeric(8, 2) not null default 40,
  add column if not exists weeks_per_year numeric(8, 2) not null default 52,
  add column if not exists billing_currency text not null default 'USD',
  add column if not exists calculated_annual_salary numeric(14, 2),
  add column if not exists calculated_monthly_salary numeric(14, 2),
  add column if not exists onboarding_notes text,
  add column if not exists invite_sent_at timestamptz;

alter table employees
  add column if not exists lifecycle_status text not null default 'active'
    check (lifecycle_status in ('onboarding', 'active', 'under_resignation', 'under_offboarding', 'offboarded'));

alter table resignations
  add column if not exists notice_period_days integer check (notice_period_days is null or notice_period_days >= 0),
  add column if not exists calculated_last_working_day date,
  add column if not exists accepted_notice_sent_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists decided_by uuid references portal_users(id) on delete set null,
  add column if not exists decided_at timestamptz;

alter table offboarding_cases
  add column if not exists initiated_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references portal_users(id) on delete set null,
  add column if not exists access_deactivation_confirmed_at timestamptz,
  add column if not exists access_deactivation_confirmed_by uuid references portal_users(id) on delete set null,
  add column if not exists rejection_reason text;

create index if not exists employees_employer_lifecycle_status_idx
  on employees (employer_id, lifecycle_status);

create index if not exists employee_requests_employer_created_idx
  on employee_requests (employer_id, created_at desc);

create index if not exists resignations_employee_status_idx
  on resignations (employee_id, status, created_at desc);

create index if not exists resignations_employer_status_created_idx
  on resignations (employer_id, status, created_at desc);

create index if not exists offboarding_cases_status_lwd_idx
  on offboarding_cases (status, target_last_working_day);
