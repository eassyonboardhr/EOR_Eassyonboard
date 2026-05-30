# EOR Clerk Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Next.js portal foundation linked to Clerk with visible sign-in, sign-up, and signed-in controls for the EOR auth workflow.

**Architecture:** Clerk handles identity and session primitives while the app exposes a restrained EOR landing/auth surface and protected dashboard routes. Portal roles are represented as a small internal model first, then can move to a database when employer management is built.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, npm, Clerk CLI, `@clerk/nextjs`.

---

### Task 1: Clerk CLI And Project Scaffold

**Files:**
- Create or modify project scaffold through Clerk CLI in `E:\Eor portal renwed`

- [ ] **Step 1: Check Clerk CLI**

Run:

```powershell
Get-Command clerk -ErrorAction SilentlyContinue
if (Get-Command clerk -ErrorAction SilentlyContinue) { clerk --version }
```

Expected: either a Clerk CLI version or no command found.

- [ ] **Step 2: Install or update Clerk CLI**

Run one of:

```powershell
clerk update --yes
```

or:

```powershell
npm install -g clerk
```

Expected: Clerk CLI is available.

- [ ] **Step 3: Authenticate Clerk CLI**

Run:

```powershell
clerk auth login
```

Expected: user completes browser login and CLI reports an authenticated session.

- [ ] **Step 4: Initialize empty project**

Run:

```powershell
clerk init --framework nextjs --pm npm --app app_3EQeRhAbvutlTmgthcYHNa9JV5H
```

Expected: a Next.js app is scaffolded and linked to the Clerk app.

### Task 2: Baseline Verification

**Files:**
- Inspect: `package.json`
- Inspect: `src/app/layout.tsx`
- Inspect: `src/proxy.ts` or `src/middleware.ts`

- [ ] **Step 1: Run Clerk diagnostics**

Run:

```powershell
clerk doctor
```

Expected: no blocking setup errors.

- [ ] **Step 2: Verify proxy matcher**

Check that the matcher includes:

```ts
'/(api|trpc)(.*)',
'/__clerk/(.*)',
```

Expected: Clerk internal proxy route is included once.

### Task 3: Portal Auth UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create or modify: `src/app/dashboard/page.tsx`
- Create or modify: `src/app/request-received/page.tsx`

- [ ] **Step 1: Add visible auth controls**

Use Clerk components:

```tsx
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
```

Expected: signed-out users see sign-in and sign-up actions; signed-in users see `UserButton`.

- [ ] **Step 2: Add role/status placeholders**

Use server-side auth checks in dashboard routes:

```tsx
import { auth } from '@clerk/nextjs/server'

const { userId } = await auth()
```

Expected: unauthenticated users redirect or show a sign-in action; authenticated users see a role-aware dashboard placeholder.

### Task 4: Local App Verification

**Files:**
- Verify through local browser against the running app

- [ ] **Step 1: Start the app**

Run:

```powershell
npm run dev
```

Expected: the app starts on a local URL.

- [ ] **Step 2: Browser check**

Open the local app and verify:

- signed-out homepage shows sign-in/sign-up
- sign-up opens Clerk flow
- sign-in opens Clerk flow
- signed-in view shows user profile button
- dashboard route does not expose data without authentication

Expected: auth controls are visible and usable.
