# EassyonBoard EOR Portal

Next.js portal foundation for employer-of-record operations. Clerk owns identity and sessions; Supabase stores portal users, employer leads, employee requests, leave workflows, notices, offboarding, compensation, billing, and audit events.

## Stack

- Next.js App Router 16
- React 19
- TypeScript
- Tailwind CSS 4
- Clerk for authentication
- Supabase Postgres through `@supabase/supabase-js`

## Local Setup

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

Required Clerk values:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/request-received
```

Required Supabase values:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SECRET_KEY` is accepted as a fallback for `SUPABASE_SERVICE_ROLE_KEY`, but server code should prefer the service role key name. Do not expose service-role or secret keys with a `NEXT_PUBLIC_` prefix.

Portal bootstrap:

```text
PORTAL_SUPER_ADMIN_EMAILS=admin@example.com,owner@example.com
```

Any Clerk user whose primary email is listed here becomes an active `super_admin` when their portal record is first created.

## Data Model

The initial schema lives in `supabase/migrations/202605300001_eor_portal_v1.sql`.

Main tables:

- `portal_users`
- `employer_leads`
- `employers`
- `employees`
- `employee_requests`
- `leave_policies`
- `leave_balances`
- `leave_requests`
- `resignations`
- `offboarding_cases`
- `notices`
- `notice_recipients`
- `employee_compensation`
- `employer_billing`
- `audit_events`

The migration enables RLS on portal tables. The current application accesses Supabase only from server-only code with a service-role client in `lib/supabase/admin.ts`; all authorization therefore must be enforced in server actions and server data loaders. If browser Supabase access or Data API access is added later, add explicit RLS policies and grants first.

## Role Flow

- Unknown signed-in users become pending `employer_admin` users and get an `employer_leads` record.
- Emails in `PORTAL_SUPER_ADMIN_EMAILS` become active `super_admin` users.
- Admins can create an active employer directly from the admin dashboard and send the employer admin a Clerk invitation email.
- When that invited employer admin accepts the email link and signs in for the first time, their portal user is linked to the active employer by matching the employer contact email.
- Users whose email matches an unclaimed employee record become active `employee` users.
- Admins approve employer leads and employee requests before those accounts can access active dashboards.

Protected dashboard routes use `getPortalSession()` and `requirePortalRole()` from `lib/portal/session.ts`.

## Server Actions

Server actions must verify authorization inside the action, even if the form is only rendered on a protected page. Prefer:

- `requirePortalRole([...])` for role and active-status checks.
- `ensureActivePortalSession(session)` when an action needs `getPortalSession()` directly.
- Status guards such as `status = pending` before approval/review side effects.

Approval actions should remain idempotent. Avoid creating downstream records unless the source row is still pending.

## Verification

```powershell
npm test
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

Focused action tests live in `lib/portal/actions/action-guards.test.ts`.
