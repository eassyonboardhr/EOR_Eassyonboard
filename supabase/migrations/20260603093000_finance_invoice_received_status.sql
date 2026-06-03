alter table public.finance_invoices
  add column if not exists payment_received_at timestamptz,
  add column if not exists payment_received_by uuid references public.portal_users(id) on delete set null,
  add column if not exists payment_received_notes text,
  add column if not exists last_source_status text,
  add column if not exists last_status_synced_at timestamptz;

create index if not exists finance_invoices_status_received_idx
  on public.finance_invoices(status, payment_received_at);

alter table public.finance_employee_salary_payments
  add column if not exists pf_inr_cents bigint not null default 0,
  add column if not exists tds_inr_cents bigint not null default 0,
  add column if not exists actual_paid_inr_cents bigint not null default 0;
