# EOR Clerk Auth Design

## Goal

Build the authentication foundation for an EOR portal using Clerk, with public employer/admin interest signup and controlled access for approved employers and invited employees.

## Auth Model

Clerk owns identity, sessions, email verification, password reset, Google sign-in, and invite links. The portal owns authorization: role, employer relationship, account status, and dashboard access.

Initial roles:

- `lead_admin`: signed up publicly and waiting for approval.
- `super_admin`: platform operator who reviews leads and creates or approves accounts.
- `employer_admin`: approved company admin.
- `employee`: invited employee under an employer.

## User Flow

Public users can sign up as interested employer admins. After email verification they see a request-received state instead of full portal access. A super admin can review the lead, contact them through their provided email, then approve them later.

Employees are invite-only. Employer admins can invite employees after their employer account is approved.

Forgot password sends a reset link. Passwords are never sent by email.

## Pages

- `/`: polished landing/auth entry with sign-in and sign-up actions.
- `/sign-in`: Clerk sign-in route.
- `/sign-up`: Clerk sign-up route for employer/admin interest.
- `/dashboard`: authenticated dashboard shell that branches by role/status.
- `/request-received`: post-signup waiting state for `lead_admin`.

## Data Boundary

The first implementation will use Clerk metadata and lightweight placeholders so the auth system can be verified before adding a database. The production portal should add persistent tables:

- `users`: Clerk user id, email, role, employer id, status.
- `employers`: company name, status, primary contact.

Every protected route must check authorization server-side, not only through proxy or client UI.

## Testing And Verification

The setup is complete when Clerk initializes successfully, `clerk doctor` passes or reports only actionable non-blockers, the app starts locally, signed-out users see sign-in/sign-up controls, and signed-in users see a user profile control plus a dashboard/request state.
