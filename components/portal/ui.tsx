import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { PortalCounts, PortalSession } from "@/lib/portal/types";

const navByRole = {
  super_admin: [{ href: "/dashboard/admin", label: "Admin console" }],
  admin: [{ href: "/dashboard/admin", label: "Admin console" }],
  employer_admin: [{ href: "/dashboard/employer", label: "Employer workspace" }],
  employee: [{ href: "/dashboard/employee", label: "Employee workspace" }],
};

export function PortalShell({
  session,
  title,
  subtitle,
  children,
}: {
  session: PortalSession;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const nav = navByRole[session.user.role] ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div>
            <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
              EassyonBoard
            </Link>
            <p className="mt-1 text-xs text-slate-500">{session.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
              {session.user.role.replace("_", " ")}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit border border-slate-200 bg-white p-3">
          <nav className="grid gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="rounded px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Public entry
            </Link>
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-blue-700">
              Portal dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const text = value ?? "unknown";
  const tone = text.includes("approved") || text === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : text.includes("pending") || text.includes("submitted") || text.includes("requested") ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>
      {text.replaceAll("_", " ")}
    </span>
  );
}

export function StatGrid({ counts }: { counts: PortalCounts }) {
  const items = [
    ["Employer leads", counts.employerLeads],
    ["Employers", counts.employers],
    ["Employees", counts.employees],
    ["Employee requests", counts.employeeRequests],
    ["Leave requests", counts.leaveRequests],
    ["Resignations", counts.resignations],
    ["Offboarding", counts.offboardingCases],
    ["Notices", counts.notices],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
      {children}
    </div>
  );
}

export function TextInput({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        className="h-10 border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function TextArea({
  name,
  label,
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        rows={3}
        className="border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function SubmitButton({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "secondary" | "danger" }) {
  const className =
    tone === "primary"
      ? "bg-blue-700 text-white hover:bg-blue-800"
      : tone === "danger"
        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="submit"
      className={`inline-flex h-10 items-center justify-center px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {children}
    </button>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
