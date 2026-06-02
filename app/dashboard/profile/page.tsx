/* eslint-disable @typescript-eslint/no-explicit-any */
import { reviewProfileChangeRequestAction, updateProfileAction } from "@/lib/portal/actions/profile";
import { getProfileData } from "@/lib/portal/profile";
import { requirePortalRole } from "@/lib/portal/session";
import { EmptyState, Panel, PortalShell, StatusBadge, SubmitButton, TextArea, TextInput, formatDate } from "@/components/portal/ui";

export default async function ProfilePage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getProfileData(session);

  return (
    <PortalShell session={session} title="Profile" subtitle="Update account details. Sensitive changes are routed to admin review.">
      <div className="grid gap-5">
        {data.mode === "employee" ? (
          <Panel title="Employee details" description="Contact and profile fields update immediately; identity and bank changes go to admin review.">
            <form action={updateProfileAction} className="grid gap-4 md:grid-cols-2">
              <TextInput name="full_name" label="Full name" defaultValue={data.profile?.full_name ?? data.employee?.full_name} required />
              <TextInput name="phone" label="Phone" defaultValue={data.profile?.phone} />
              <TextInput name="alternate_phone" label="Alternate phone" defaultValue={data.profile?.alternate_phone} />
              <TextInput name="linkedin_url" label="LinkedIn" defaultValue={data.profile?.linkedin_url} />
              <TextInput name="github_url" label="GitHub" defaultValue={data.profile?.github_url} />
              <TextInput name="portfolio_url" label="Portfolio" defaultValue={data.profile?.portfolio_url} />
              <TextInput name="current_address" label="Current address" defaultValue={data.address?.current_address} />
              <TextInput name="permanent_address" label="Permanent address" defaultValue={data.address?.permanent_address} />
              <TextInput name="city" label="City" defaultValue={data.address?.city} />
              <TextInput name="state" label="State" defaultValue={data.address?.state} />
              <TextInput name="postal_code" label="PIN code" defaultValue={data.address?.postal_code} />
              <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Sensitive update request</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <TextInput name="aadhaar_number" label="Aadhaar number" />
                  <TextInput name="pan_number" label="PAN number" />
                  <TextInput name="account_holder_name" label="Account holder name" />
                  <TextInput name="account_number" label="Bank account number" />
                  <TextInput name="ifsc_code" label="IFSC code" />
                  <TextInput name="bank_name" label="Bank name" />
                </div>
              </div>
              <div className="md:col-span-2"><SubmitButton>Save Profile</SubmitButton></div>
            </form>
          </Panel>
        ) : data.mode === "employer" ? (
          <Panel title="Employer details" description="Company and billing edits are submitted to admin for approval.">
            <form action={updateProfileAction} className="grid gap-4 md:grid-cols-2">
              <TextInput name="company_name" label="Company name" defaultValue={data.employer?.name ?? data.company?.company_name} />
              <TextInput name="contact_name" label="Contact name" defaultValue={data.employer?.contact_name} />
              <TextInput name="contact_email" label="Contact email" defaultValue={data.employer?.contact_email} />
              <TextInput name="registration_number" label="Registration number" defaultValue={data.company?.registration_number} />
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Billing currency
                <select name="billing_currency" defaultValue={data.company?.client_billing_settings?.currency ?? "USD"} className="h-10 rounded-xl border border-slate-300 bg-white px-3">
                  {["USD", "GBP", "EUR", "AUD", "CAD", "SGD", "INR"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Payment terms
                <select name="payment_terms" defaultValue={data.company?.client_billing_settings?.payment_terms ?? "Net 30"} className="h-10 rounded-xl border border-slate-300 bg-white px-3">
                  {["Net 15", "Net 30", "Net 45"].map((terms) => <option key={terms} value={terms}>{terms}</option>)}
                </select>
              </label>
              <div className="md:col-span-2"><SubmitButton>Submit Update For Review</SubmitButton></div>
            </form>
          </Panel>
        ) : (
          <Panel title="Admin profile">
            <p className="text-sm text-slate-600">{data.user.full_name ?? data.user.email}</p>
            <p className="mt-1 text-xs text-slate-500">{data.user.role}</p>
          </Panel>
        )}

        <Panel title={data.mode === "admin" ? "Profile change review" : "Recent profile change requests"}>
          <div className="grid gap-3">
            {(data.requests ?? []).map((request: any) => (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">{request.target_type} profile update</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(request.created_at)}</p>
                  </div>
                  <StatusBadge value={request.status} />
                </div>
                <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(request.payload, null, 2)}</pre>
                {data.mode === "admin" && request.status === "pending" ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                    <form action={reviewProfileChangeRequestAction} className="contents">
                      <input type="hidden" name="request_id" value={request.id} />
                      <TextArea name="admin_notes" label="Admin notes" />
                      <button name="decision" value="approved" className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Approve</button>
                      <button name="decision" value="rejected" className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700">Reject</button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
            {(data.requests ?? []).length === 0 ? <EmptyState>No profile change requests yet.</EmptyState> : null}
          </div>
        </Panel>
      </div>
    </PortalShell>
  );
}
