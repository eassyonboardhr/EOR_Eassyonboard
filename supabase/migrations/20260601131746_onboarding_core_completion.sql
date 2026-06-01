alter table employee_requests
  add column if not exists invite_id text;

alter table employee_documents
  add column if not exists replaced_by_document_id uuid references employee_documents(id);

create unique index if not exists custom_field_values_field_entity_uidx
  on custom_field_values (custom_field_id, entity_id);

create index if not exists employee_documents_replaced_by_idx
  on employee_documents (replaced_by_document_id);
