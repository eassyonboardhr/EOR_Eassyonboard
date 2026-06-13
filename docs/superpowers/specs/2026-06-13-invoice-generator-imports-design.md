# Invoice Generator Imports Design

## Summary

Add a dedicated admin import workflow for companies and employees synced from Invoice Generator. Finance sync continues to ingest source company, employee, invoice, salary, and statement data into staging/mapping tables. The new Imports page turns that staged data into portal employer and employee records only after an admin reviews a company and clicks Import company.

Imported employers and employees start as invited or pending onboarding. They do not become fully active-complete just because historical finance data exists. Admins can add missing emails, send invites, and let users complete onboarding later. Historical finance records become visible through the existing role-aware finance pages after mappings are linked.

Document upload steps in employer and employee onboarding become deferable for all portal onboarding paths. Users can skip document uploads for now, continue onboarding, and submit documents later. Missing documents remain visible as incomplete work for admin follow-up.

## Goals

- Give admins a dedicated Imports sidebar page separate from Finance Mapping.
- Let admins review Invoice Generator companies before creating portal records.
- Support creating or linking a portal employer from a synced external company.
- Support creating or linking portal employees from synced external employees.
- Let admins add employer and employee emails before sending invites.
- Preserve historical finance visibility after mapping while respecting current privacy boundaries.
- Keep imported accounts in invited or pending onboarding state until users accept and complete portal onboarding.
- Allow employer and employee onboarding users to skip all document uploads for now.

## Non-Goals

- Do not replace the existing Finance Mapping page. It remains a technical fallback.
- Do not auto-create active employers or employees directly from sync payloads.
- Do not merge Invoice Generator and EOR portal databases.
- Do not expose employee salary internals to employers or employer billing to employees.
- Do not require a full payroll rewrite before imports can work.

## Existing Foundation

The portal already has Invoice Generator ingestion and finance visibility pieces:

- Sync endpoint: `app/api/integrations/invoice-generator/sync/route.ts`
- Sync parser/upsert logic: `lib/portal/finance-sync.ts`
- Mapping actions: `lib/portal/actions/finance.ts`
- Finance views: `app/dashboard/finances/page.tsx`
- Finance mapping page: `app/dashboard/finances/mapping/page.tsx`
- Staging and mapped finance tables:
  - `finance_company_mappings`
  - `finance_employee_mappings`
  - `finance_invoices`
  - `finance_invoice_line_items`
  - `finance_employee_salary_payments`
  - `finance_employee_statement_rows`
  - `finance_employee_statement_summaries`

The new Imports page should build on this instead of duplicating the finance sync system.

## User Experience

Add a sidebar item named Imports for platform admins.

The Imports page contains an Invoice Generator Imports view with a company queue. Each row shows:

- Company name from Invoice Generator
- External company ID
- Import status
- Employee count
- Invoice count
- Last synced date
- Suggested existing employer, when a name match is found
- Review Import action

The review screen for a company shows:

- Source company details
- Suggested portal employer match
- Choice to create a new employer or link to an existing employer
- Employer admin email input
- Synced employees under the company
- Employee name, source designation, source email if present, and suggested portal employee match
- Email fields for missing employee emails
- Checkboxes for employees to import
- Historical finance summary, such as invoice count and pay months available
- Import company action

After import, the page shows a success summary:

- Employer created or linked
- Number of employees created or linked
- Number of invites sent
- Number of finance rows mapped
- Any employees skipped because email or selection was missing

## Import Rules

Company import supports two paths:

1. Create new portal employer
2. Link to existing portal employer

When creating a new employer:

- Create the employer record with `status = "pending"`.
- Create the related client company/onboarding records with onboarding status `draft`.
- Create or invite the employer admin using the entered email.
- Ensure invited employer admins can bootstrap into the pending employer from Clerk invitation metadata or an explicit import-invite lookup. Do not rely only on the current active-employer email lookup.
- Link `finance_company_mappings.employer_id` to the employer.
- Update related synced invoice and payment rows with the employer ID.

When linking an existing employer:

- Do not overwrite employer profile details from Invoice Generator automatically.
- Link the company mapping to the selected employer.
- Update related synced finance rows with the employer ID.
- Allow admin to send or resend an employer admin invite if needed.

Employee import supports two paths per employee:

1. Create new portal employee
2. Link to existing portal employee

When creating a new employee:

- Create the employee under the selected employer.
- Use source full name, source email, and designation when present.
- Set `employees.status = "pending"`.
- Set `employees.lifecycle_status = "onboarding"`.
- Create employee onboarding status/progress rows in their draft state.
- Create or invite the employee portal user using the chosen email.
- Link `finance_employee_mappings.employee_id` and `employer_id`.
- Update related invoice line items, salary payments, statement rows, and statement summaries with the employee ID.

When linking an existing employee:

- Do not overwrite sensitive profile, salary, bank, identity, or document fields from Invoice Generator.
- Link the employee mapping to the selected employee.
- Update related finance rows with the employee ID.

## Account And Onboarding State

Imported users should be able to log in after invite, but their onboarding remains incomplete until they finish required profile steps.

Use existing status and onboarding fields first:

- Imported employer rows start with `status = "pending"`.
- Imported employee rows start with `status = "pending"` and `lifecycle_status = "onboarding"`.
- Employer/company onboarding starts as `draft`.
- Employee onboarding status starts as `Draft`.

Because the current employer bootstrap path looks up active employers by contact email, implementation must add a safe invitation bootstrap path for imported pending employers. The preferred mechanism is to use Clerk invitation metadata containing `portalRole`, `employerId`, and `source = "invoice_generator_import"`, then create an active `portal_users` row linked to the pending employer when the invite is accepted. The employer business record remains pending until onboarding/review moves it forward.

Documents are not required to continue onboarding in this pass. They remain required work items, but users can defer them.

## Skip Documents For Now

Add Skip documents for now to employer and employee document upload steps.

This skip is available for:

- Employer self-onboarding through the portal
- Employee self-onboarding through the portal
- Admin-created employer onboarding
- Admin-created employee onboarding
- Imported employer onboarding
- Imported employee onboarding

Skip behavior:

- No fake document row is created.
- Missing documents remain missing.
- Document completion status stays incomplete, missing, or pending submission.
- Onboarding can continue to the next step.
- Admin review surfaces skipped/missing documents clearly.
- Users can return later and upload documents from onboarding, documents, or profile surfaces.

## Privacy Boundaries

Imports must preserve the existing finance privacy boundary:

- Employers can see employer billing and invoice line items for employees in their employer scope.
- Employees can see their own salary/payment/statement history after their source employee is mapped to their portal employee.
- Employers cannot see employee salary internals.
- Employees cannot see employer billing.
- Admins can audit both sides.

Historical finance data should become visible only after mappings exist and normal role checks allow it.

## Server-Side Interfaces

Add import-focused server actions in a new module such as `lib/portal/actions/imports.ts`:

- `importInvoiceGeneratorCompanyAction(formData)`
- `linkImportedCompanyAction(formData)`
- `sendImportedEmployerInviteAction(formData)`
- `sendImportedEmployeeInviteAction(formData)`
- `skipOnboardingDocumentsAction(formData)` if a server-side marker is needed for analytics or user progress

Add read helpers in a module such as `lib/portal/imports.ts`:

- `getInvoiceGeneratorImportQueue()`
- `getInvoiceGeneratorImportReview(externalCompanyId)`
- `getImportSuggestions(externalCompanyId)`

The import action should be idempotent. Re-running import for the same company should not duplicate employers, employees, mappings, invites, or finance rows.

## Error Handling

- Block import when no employer path is selected.
- Block creating an employer invite when employer admin email is missing.
- Block creating an employee invite for a selected employee when email is missing.
- Allow importing a company with only selected employees.
- Show partial import results when some employees are skipped.
- Keep sync rows staged if import fails.
- Write audit events for company import, employee import, invite sends, skipped employees, and document skip actions.

## Testing

Unit and action tests should cover:

- Import queue lists unmapped and partially mapped companies.
- Creating a new employer links company mapping and finance invoices.
- Linking an existing employer does not overwrite employer profile fields.
- Creating imported employees links employee mappings and finance rows.
- Linking existing employees does not overwrite sensitive profile fields.
- Import action is idempotent.
- Missing employer admin email blocks invite send.
- Missing employee email skips or blocks selected employee import with a clear result.
- Employer users cannot access Imports.
- Employee users cannot access Imports.
- Skipping documents leaves document completion incomplete.
- Employees can see mapped historical pay after import.
- Employers can see mapped billing without salary internals.

Manual QA should cover:

- Imports sidebar item is visible to admins only.
- Review Import page shows source company and employees.
- Admin can add missing emails and import selected employees.
- Imported users receive invites and land in onboarding.
- Employer and employee onboarding can skip all document uploads.
- Finance history appears after mapping with correct privacy boundaries.
