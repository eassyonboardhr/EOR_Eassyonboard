alter table employees
  add column if not exists team_id uuid references teams(id) on delete set null,
  add column if not exists manager_employee_id uuid references employees(id) on delete set null,
  add column if not exists notice_period_days integer check (notice_period_days is null or notice_period_days >= 0),
  add column if not exists leave_policy_id uuid references leave_policies(id) on delete set null,
  add column if not exists employer_setup_completed_at timestamptz,
  add column if not exists employer_setup_completed_by uuid references portal_users(id) on delete set null,
  add column if not exists employer_setup_notes text;

create index if not exists employees_team_idx on employees (team_id);
create index if not exists employees_manager_idx on employees (manager_employee_id);
create index if not exists employees_employer_setup_idx on employees (employer_id, employer_setup_completed_at);
