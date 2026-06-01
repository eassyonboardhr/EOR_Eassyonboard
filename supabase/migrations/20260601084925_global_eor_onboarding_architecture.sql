create table if not exists client_companies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references employers(id) on delete set null,
  company_name text not null,
  trading_name text,
  country text not null,
  registration_number text not null,
  registration_type text,
  website text not null,
  industry text not null,
  employee_count integer,
  onboarding_status text not null default 'draft'
    check (onboarding_status in ('draft', 'submitted', 'pending_review', 'approved', 'rejected', 'needs_correction')),
  created_by uuid references portal_users(id) on delete set null,
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  review_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_number, country)
);

create table if not exists client_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references client_companies(id) on delete cascade,
  contact_type text not null check (contact_type in ('primary_contact', 'billing_contact', 'signatory')),
  name text not null,
  designation text,
  email text not null,
  phone text,
  timezone text,
  created_at timestamptz not null default now()
);

create table if not exists client_billing_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references client_companies(id) on delete cascade,
  billing_contact_name text not null,
  billing_contact_email text not null,
  billing_contact_phone text,
  accounts_email text,
  currency text not null check (currency in ('USD', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD', 'INR')),
  payment_terms text not null check (payment_terms in ('Net 15', 'Net 30', 'Net 45')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_employment_defaults (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references client_companies(id) on delete cascade,
  working_hours text not null,
  notice_period text not null,
  probation_period text not null,
  leave_policy text not null,
  work_mode text not null check (work_mode in ('Remote', 'Hybrid', 'Onsite')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_compliance_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references client_companies(id) on delete cascade,
  nda_required boolean not null default false,
  background_check_required boolean not null default false,
  equipment_required boolean not null default false,
  handles_customer_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references client_companies(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  uploaded_by uuid references portal_users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists contract_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references client_companies(id) on delete cascade,
  template_type text not null check (template_type in ('offer_letter', 'employment_agreement', 'nda', 'policy_document', 'custom_template')),
  template_name text not null,
  file_path text not null,
  uploaded_by_user_id uuid references portal_users(id) on delete set null,
  uploaded_by_role text not null check (uploaded_by_role in ('admin', 'employer')),
  version_number integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid unique references employees(id) on delete cascade,
  user_id uuid references portal_users(id) on delete set null,
  employee_code text unique,
  full_name text not null,
  father_name text,
  date_of_birth date,
  gender text,
  email text not null,
  phone text,
  alternate_phone text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_addresses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  current_address text not null,
  permanent_address text not null,
  state text not null,
  city text not null,
  postal_code text not null,
  updated_at timestamptz not null default now()
);

create table if not exists employee_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  contact_name text not null,
  relationship text not null,
  phone text not null,
  updated_at timestamptz not null default now()
);

create table if not exists employee_identity_details (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  aadhaar_number text not null,
  pan_number text not null,
  passport_number text,
  updated_at timestamptz not null default now()
);

create table if not exists employee_bank_details (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  account_holder_name text not null,
  account_number text not null,
  ifsc_code text not null,
  bank_name text not null,
  branch_name text,
  updated_at timestamptz not null default now()
);

create table if not exists employee_education (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  qualification text not null,
  institution text not null,
  year_of_passing integer not null,
  updated_at timestamptz not null default now()
);

create table if not exists employee_experience (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  is_fresher boolean not null default true,
  total_experience text,
  previous_company text,
  previous_designation text,
  updated_at timestamptz not null default now()
);

create table if not exists employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  verification_status text not null default 'Pending'
    check (verification_status in ('Pending', 'Approved', 'Rejected')),
  uploaded_at timestamptz not null default now(),
  verified_by uuid references portal_users(id) on delete set null,
  verified_at timestamptz,
  remarks text
);

create table if not exists custom_fields (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references client_companies(id) on delete cascade,
  target_type text not null check (target_type in ('employee', 'employer')),
  field_label text not null,
  field_key text not null,
  field_type text not null check (field_type in ('text', 'textarea', 'number', 'email', 'phone', 'url', 'date', 'dropdown', 'multi_select', 'checkbox', 'file_upload')),
  required boolean not null default false,
  active boolean not null default true,
  placeholder text,
  help_text text,
  default_value text,
  options jsonb not null default '[]'::jsonb,
  created_by uuid references portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, target_type, field_key)
);

create table if not exists custom_field_values (
  id uuid primary key default gen_random_uuid(),
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  entity_id uuid not null,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (custom_field_id, entity_id)
);

create table if not exists employee_onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  completion_percentage integer not null default 0 check (completion_percentage between 0 and 100),
  current_step text not null default 'personal_information',
  last_updated timestamptz not null default now()
);

create table if not exists employee_onboarding_status (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  status text not null default 'Draft'
    check (status in ('Draft', 'Submitted', 'Pending Review', 'Approved', 'Rejected', 'Needs Correction')),
  reviewed_by uuid references portal_users(id) on delete set null,
  reviewed_at timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_companies_employer_idx on client_companies (employer_id);
create index if not exists client_companies_status_idx on client_companies (onboarding_status, created_at desc);
create index if not exists client_contacts_company_type_idx on client_contacts (company_id, contact_type);
create index if not exists contract_templates_company_active_idx on contract_templates (company_id, template_type, is_active);
create index if not exists employee_documents_employee_status_idx on employee_documents (employee_id, verification_status);
create index if not exists custom_fields_company_target_idx on custom_fields (company_id, target_type, active);

insert into storage.buckets (id, name, public)
values ('company-documents', 'company-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'client_companies', 'client_contacts', 'client_billing_settings',
    'client_employment_defaults', 'client_compliance_settings', 'client_documents',
    'contract_templates', 'employee_profiles', 'employee_addresses',
    'employee_emergency_contacts', 'employee_identity_details', 'employee_bank_details',
    'employee_education', 'employee_experience', 'employee_documents',
    'custom_fields', 'custom_field_values', 'employee_onboarding_progress',
    'employee_onboarding_status'
  ] loop
    execute format('alter table %I enable row level security', table_name);
  end loop;
end $$;

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'client_companies', 'client_billing_settings', 'client_employment_defaults',
    'client_compliance_settings', 'contract_templates', 'employee_profiles',
    'custom_field_values', 'employee_onboarding_status'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on %I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
  end loop;
end $$;

create policy "company documents authenticated read"
on storage.objects for select
to authenticated
using (bucket_id = 'company-documents');

create policy "employee documents authenticated read"
on storage.objects for select
to authenticated
using (bucket_id = 'employee-documents');

create policy "company documents authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'company-documents');

create policy "employee documents authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'employee-documents');
