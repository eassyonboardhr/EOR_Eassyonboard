alter table employee_onboarding_progress
  add column if not exists completed_steps jsonb;

alter table employee_requests
  add column if not exists invite_accepted_at timestamptz,
  add column if not exists onboarding_started_at timestamptz;

alter table notices
  add column if not exists action_url text,
  add column if not exists action_label text,
  add column if not exists category text;

alter table holiday_calendar_change_requests
  drop constraint if exists holiday_calendar_change_requests_request_type_check;

alter table holiday_calendar_change_requests
  add constraint holiday_calendar_change_requests_request_type_check
  check (request_type in ('holiday_add', 'holiday_edit', 'holiday_delete', 'weekly_off_change', 'date_override', 'date_override_delete'));
