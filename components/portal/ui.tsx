import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getUnreadNoticeCount } from "@/lib/portal/notices";
import { getUnreadMessageCount } from "@/lib/portal/messages";
import { getCommandPaletteItems, getSettingsData } from "@/lib/portal/profile";
import { PendingSubmitButton } from "@/components/portal/pending-submit-button";
import { RouteProgress } from "@/components/portal/route-progress";
import { ShellControls } from "@/components/portal/shell-controls";
import type { PortalCounts, PortalSession } from "@/lib/portal/types";

type NavItem = {
  label: string;
  icon: string;
  href: string;
  badge?: string;
};

const navByRole = {
  super_admin: "/dashboard/admin",
  admin: "/dashboard/admin",
  employer_admin: "/dashboard/employer",
  employee: "/dashboard/employee",
};

function navSections(session: PortalSession, unreadNotices = 0, unreadMessages = 0): NavItem[] {
  const noticeBadge = unreadNotices > 0 ? String(Math.min(unreadNotices, 99)) : undefined;
  const messageBadge = unreadMessages > 0 ? String(Math.min(unreadMessages, 99)) : undefined;

  if (session.user.role === "employee") {
    return [
      { label: "Dashboard", icon: "D", href: dashboardHref(session) },
      { label: "Attendance", icon: "A", href: "/dashboard/attendance" },
      { label: "Leaves", icon: "L", href: "/dashboard/employee/leaves" },
      { label: "Documents", icon: "DOC", href: "/dashboard/documents" },
      { label: "Finances", icon: "F", href: "/dashboard/finances" },
      { label: "Messages", icon: "M", href: "/dashboard/messages", badge: messageBadge },
      { label: "Notices", icon: "N", href: "/dashboard/notices", badge: noticeBadge },
      { label: "Resignations", icon: "R", href: "/dashboard/resignations" },
      { label: "Offboarding", icon: "O", href: "/dashboard/offboarding" },
      { label: "Profile", icon: "P", href: "/dashboard/profile" },
      { label: "Settings", icon: "S", href: "/dashboard/settings" },
    ];
  }

  if (session.user.role === "employer_admin") {
    return [
      { label: "Dashboard", icon: "D", href: dashboardHref(session) },
      { label: "Employees", icon: "EE", href: "/dashboard/employees" },
      { label: "Teams", icon: "TM", href: "/dashboard/employer/teams" },
      { label: "Worktree", icon: "WT", href: "/dashboard/worktree" },
      { label: "Leaves", icon: "L", href: "/dashboard/employer/leaves" },
      { label: "Documents", icon: "DOC", href: "/dashboard/documents" },
      { label: "Finances", icon: "F", href: "/dashboard/finances" },
      { label: "Messages", icon: "M", href: "/dashboard/messages", badge: messageBadge },
      { label: "Notices", icon: "N", href: "/dashboard/notices", badge: noticeBadge },
      { label: "Onboarding", icon: "ON", href: "/dashboard/onboarding" },
      { label: "Resignations", icon: "R", href: "/dashboard/resignations" },
      { label: "Offboarding", icon: "O", href: "/dashboard/offboarding" },
      { label: "Reports", icon: "R", href: "/dashboard/reports" },
      { label: "Profile", icon: "P", href: "/dashboard/profile" },
      { label: "Settings", icon: "S", href: "/dashboard/settings" },
    ];
  }

  return [
    { label: "Dashboard", icon: "D", href: dashboardHref(session) },
    { label: "Employers", icon: "ER", href: "/dashboard/employers" },
    { label: "Employees", icon: "EE", href: "/dashboard/employees" },
    { label: "Worktree", icon: "WT", href: "/dashboard/worktree" },
    { label: "Leaves", icon: "L", href: "/dashboard/admin/leaves" },
    { label: "Documents", icon: "DOC", href: "/dashboard/documents" },
    { label: "Finances", icon: "F", href: "/dashboard/finances" },
    { label: "Messages", icon: "M", href: "/dashboard/messages", badge: messageBadge },
    { label: "Notices", icon: "N", href: "/dashboard/notices", badge: noticeBadge },
    { label: "Onboarding", icon: "ON", href: "/dashboard/onboarding" },
    { label: "Resignations", icon: "R", href: "/dashboard/resignations" },
    { label: "Offboarding", icon: "O", href: "/dashboard/offboarding" },
    { label: "Reports", icon: "R", href: "/dashboard/reports" },
    { label: "Profile", icon: "P", href: "/dashboard/profile" },
    { label: "Settings", icon: "S", href: "/dashboard/settings" },
  ];
}

function dashboardHref(session: PortalSession) {
  return navByRole[session.user.role] ?? "/dashboard";
}

export async function PortalShell({
  session,
  title,
  subtitle,
  children,
  wide = false,
}: {
  session: PortalSession;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const homeHref = dashboardHref(session);
  const activeTitle = title.toLowerCase();
  const userName = session.user.full_name ?? session.email;
  const [unreadNotices, unreadMessages, searchItems, settings] = await Promise.all([
    getUnreadNoticeCount(session),
    getUnreadMessageCount(session),
    getCommandPaletteItems(session),
    getSettingsData(session),
  ]);
  const navigation = navSections(session, unreadNotices, unreadMessages);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100 lg:grid lg:grid-cols-[236px_1fr]">
      <RouteProgress />
      <aside id="portal-sidebar" className="hidden min-h-screen border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
            EO
          </Link>
          <Link href={homeHref} className="text-base font-semibold text-slate-950 dark:text-slate-100">
            EOR Portal
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {navigation.map((item) => {
            const isDashboard = item.label === "Dashboard";
            const activeSectionTitles = ["worktree", "leaves", "notices", "messages", "onboarding", "resignations", "offboarding", "team", "employers", "employees"];
            const isActive =
              (isDashboard && !activeSectionTitles.some((section) => activeTitle.includes(section))) ||
              activeTitle.includes(item.label.toLowerCase());
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{userName}</p>
              <p className="truncate text-xs text-slate-500">{session.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href={homeHref} className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
                EO
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ShellControls items={searchItems} initialTheme={settings.user?.theme_preference} />
              <Link href="/dashboard/notices" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Notices">
                N
                {unreadNotices > 0 ? (
                  <span className="absolute right-1 top-1 rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                    {Math.min(unreadNotices, 99)}
                  </span>
                ) : null}
              </Link>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{userName}</p>
                <p className="text-xs capitalize text-slate-500">{session.user.role.replace("_", " ")}</p>
              </div>
              <UserButton />
            </div>
          </div>
        </header>

        <div className={`w-full px-4 py-5 sm:px-6 ${wide ? "max-w-none" : "mx-auto max-w-7xl"}`}>
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-500">
              Dashboard <span className="mx-2 text-slate-300">/</span>{" "}
              <span className="font-semibold text-slate-700">{title}</span>
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const text = value ?? "unknown";
  const normalized = text.toLowerCase().replaceAll(" ", "_");
  const tone = normalized.includes("complete") || normalized.includes("approved") || normalized === "active"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : normalized.includes("rejected") || normalized.includes("missing")
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : normalized.includes("pending") || normalized.includes("submitted") || normalized.includes("requested")
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

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
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
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
    <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
    <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        rows={3}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

export function SubmitButton({
  children,
  tone = "primary",
  pendingText,
  name,
  value,
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "danger";
  pendingText?: React.ReactNode;
  name?: string;
  value?: string;
}) {
  const className =
    tone === "primary"
      ? "bg-blue-700 text-white hover:bg-blue-800"
      : tone === "danger"
        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <PendingSubmitButton
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      pendingText={pendingText}
      name={name}
      value={value}
    >
      {children}
    </PendingSubmitButton>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
