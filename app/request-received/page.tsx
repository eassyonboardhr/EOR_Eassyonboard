import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { getPortalSession } from "@/lib/portal/session";
import { getRequestReceivedData } from "@/lib/portal/data";
import { updateEmployerLeadAction } from "@/lib/portal/actions/employer";
import { SubmitButton, TextArea, TextInput } from "@/components/portal/ui";

export default async function RequestReceivedPage() {
  let session = null;
  let lead = null;

  try {
    session = await getPortalSession();
    const data = await getRequestReceivedData(session);
    lead = data.lead;
  } catch {
    session = null;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.18em]">
          EassyonBoard
        </Link>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Request received
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Your employer access is pending admin review.
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            We have your verified sign-up. Add company details here so the admin
            can evaluate and contact you before activating portal access.
          </p>
          <div className="mt-6">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="h-10 bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
                  Sign in to continue
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Check portal status
              </Link>
            </Show>
          </div>
        </div>

        {session ? (
          <form action={updateEmployerLeadAction} className="grid gap-4 border border-slate-200 bg-white p-5">
            <TextInput
              name="company_name"
              label="Company name"
              required
              defaultValue={lead?.company_name}
            />
            <TextInput
              name="contact_name"
              label="Contact person"
              defaultValue={lead?.contact_name ?? session.user.full_name}
            />
            <TextInput name="phone" label="Phone" defaultValue={lead?.phone} />
            <TextArea
              name="message"
              label="What should the admin know?"
              defaultValue={lead?.message}
            />
            <SubmitButton>Save request details</SubmitButton>
          </form>
        ) : (
          <div className="border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
            Sign in after completing signup to add company details and check the
            approval status.
          </div>
        )}
      </section>
    </main>
  );
}
