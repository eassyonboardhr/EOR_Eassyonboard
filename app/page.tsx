import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const workflow = [
  ["Employer signup", "Public interest capture with email verification."],
  ["Admin approval", "Company access opens only after review."],
  ["Employee invite", "Employer requests, admin approves, employee joins by email."],
  ["Private records", "Salary and billing stay separated by role."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.18em]">
            EassyonBoard
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="h-10 border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="h-10 bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Request access
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="h-10 bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Dashboard
              </Link>
              <UserButton />
            </Show>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Employer of record operations
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            A controlled portal for employers, admins, and employees.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
            Use verified sign-in, admin approval, employer leave policies,
            employee request approvals, leave workflows, resignation handling,
            notices, and private salary/billing boundaries in one testable flow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="h-11 bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Start employer signup
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="h-11 border border-slate-300 bg-white px-5 font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Continue to dashboard
              </Link>
            </Show>
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-sm font-semibold text-slate-950">Workflow map</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Built for real approval paths, not open self-service access.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {workflow.map(([label, value], index) => (
              <div key={label} className="grid grid-cols-[40px_1fr] gap-3 border border-slate-200 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-sm font-semibold text-orange-700">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
