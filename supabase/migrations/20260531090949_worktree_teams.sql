-- Worktree v1 team structure.
-- TODO: Add team management screens and business-specific role labels once the workflow is confirmed.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  name text not null,
  manager_employee_id uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_id, name)
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  role_in_team text,
  created_at timestamptz not null default now(),
  unique (team_id, employee_id)
);

create index if not exists teams_employer_idx on teams (employer_id, name);
create index if not exists teams_manager_employee_idx on teams (manager_employee_id);
create index if not exists team_members_team_idx on team_members (team_id);
create index if not exists team_members_employee_idx on team_members (employee_id);

alter table teams enable row level security;
alter table team_members enable row level security;

drop trigger if exists set_teams_updated_at on teams;
create trigger set_teams_updated_at
before update on teams
for each row execute function set_updated_at();
