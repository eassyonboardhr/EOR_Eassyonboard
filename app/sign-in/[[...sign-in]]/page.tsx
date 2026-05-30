import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen bg-slate-50 text-slate-950 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex flex-col justify-between px-8 py-8 lg:px-12">
        <Link href="/" className="font-semibold tracking-[0.18em] text-xs uppercase">
          EassyonBoard
        </Link>
        <div className="max-w-xl py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Secure access
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
            Sign in to manage your EOR workspace.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Approved admins and invited employees can continue to their assigned
            portal area.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      </section>
    </main>
  );
}
