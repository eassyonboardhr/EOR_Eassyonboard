create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  created_by uuid references portal_users(id) on delete set null,
  employer_id uuid references employers(id) on delete cascade,
  related_employee_id uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists message_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  portal_user_id uuid not null references portal_users(id) on delete cascade,
  role_snapshot text not null,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (thread_id, portal_user_id)
);

create table if not exists message_entries (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_id uuid references portal_users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists service_agreements (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  title text not null,
  file_path text not null,
  currency text,
  status text not null default 'uploaded',
  uploaded_by uuid references portal_users(id) on delete set null,
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  employer_notes text,
  shared_with_employee boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_agreements_status_check
    check (status in ('uploaded', 'reviewed', 'signed_offline', 'needs_change'))
);

create table if not exists profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  requested_by uuid references portal_users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_change_requests_target_type_check
    check (target_type in ('employee', 'employer', 'admin')),
  constraint profile_change_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

alter table portal_users
  add column if not exists theme_preference text,
  add column if not exists notification_preferences jsonb;

create index if not exists message_threads_employer_idx on message_threads (employer_id, updated_at desc);
create index if not exists message_participants_user_idx on message_participants (portal_user_id, last_read_at);
create index if not exists message_entries_thread_idx on message_entries (thread_id, created_at);
create index if not exists service_agreements_employer_idx on service_agreements (employer_id, status, created_at desc);
create index if not exists service_agreements_employee_idx on service_agreements (employee_id, created_at desc);
create index if not exists profile_change_requests_status_idx on profile_change_requests (status, created_at desc);
