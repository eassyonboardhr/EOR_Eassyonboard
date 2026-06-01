alter table employee_requests
  add column if not exists invite_error text;
