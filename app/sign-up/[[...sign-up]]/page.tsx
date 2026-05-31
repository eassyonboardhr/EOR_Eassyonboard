import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen bg-slate-50 text-slate-950 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex flex-col justify-between px-8 py-8 lg:px-12">
        <Link href="/" className="font-semibold tracking-[0.18em] text-xs uppercase">
          EassyonBoard
        </Link>
        <div className="max-w-xl py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Employer interest
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
            Create an account to request portal access.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Your email is verified first. A platform admin can then review the
            company request and activate access when approved.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      </section>
    </main>
  );
}
