"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  WorktreeEmployeeNode,
  WorktreeModel,
  WorktreePageData,
  WorktreeTeamNode,
} from "@/lib/portal/worktree";
import type { PortalRole } from "@/lib/portal/types";

type SelectedNode =
  | { type: "employer"; employer: WorktreeModel["employer"]; id: string; title: string; subtitle: string; meta: string }
  | { type: "employee"; employee: WorktreeEmployeeNode; teamName: string | null };

const employerActions = [
  "details",
  "finances",
  "leaves",
  "onboarding-requests",
  "offboarding-requests",
  "resignations",
];

const employeeActions = ["details", "docs", "leaves", "resignation", "finances"];
const actionTones = ["bg-sky-50 text-sky-700", "bg-violet-50 text-violet-700", "bg-emerald-50 text-emerald-700", "bg-amber-50 text-amber-700", "bg-rose-50 text-rose-700", "bg-orange-50 text-orange-700"];

function actionLabel(action: string) {
  return action
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function actionHref(type: "employer" | "employee", id: string, action: string) {
  if (type === "employee" && action === "leaves") {
    return `/dashboard/leaves/history/${id}`;
  }
  if (type === "employee" && action === "docs") {
    return `/dashboard/documents?employee=${id}`;
  }
  if (action === "finances") {
    return type === "employee" ? `/dashboard/finances?employee=${id}` : `/dashboard/finances?employer=${id}`;
  }
  if (type === "employee" && action === "resignation") {
    return "/dashboard/resignations";
  }
  if (type === "employer" && action === "onboarding-requests") {
    return "/dashboard/onboarding";
  }
  if (type === "employer" && action === "offboarding-requests") {
    return "/dashboard/offboarding";
  }
  if (type === "employer" && action === "resignations") {
    return "/dashboard/resignations";
  }

  return `/dashboard/worktree/actions/${type}/${id}/${action}`;
}

function canSendNotice(role: PortalRole, selected: SelectedNode) {
  if (role === "super_admin" || role === "admin") return true;
  return role === "employer_admin" && selected.type === "employee";
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function employeeStatusTags(employee: WorktreeEmployeeNode) {
  const tags: Array<{ label: string; className: string }> = [];
  const resignationStatus = employee.latestResignation?.status;
  const offboardingStatus = employee.latestOffboarding?.status;

  if (offboardingStatus === "completed" || employee.lifecycle_status === "offboarded") {
    tags.push({ label: "Offboarded", className: "border-slate-300 bg-slate-100 text-slate-700" });
  } else if (offboardingStatus === "in_progress" || employee.lifecycle_status === "under_offboarding") {
    tags.push({ label: "Offboarding", className: "border-orange-200 bg-orange-50 text-orange-700" });
  } else if (resignationStatus === "employer_acknowledged" || employee.lifecycle_status === "under_resignation") {
    tags.push({ label: "Serving Notice", className: "border-sky-200 bg-sky-50 text-sky-700" });
  } else if (resignationStatus === "completed") {
    tags.push({ label: "Resigned", className: "border-violet-200 bg-violet-50 text-violet-700" });
  } else if (resignationStatus === "submitted_to_admin" || resignationStatus === "forwarded_to_employer") {
    tags.push({ label: "Resignation Pending", className: "border-amber-200 bg-amber-50 text-amber-700" });
  } else if (employee.lifecycle_status === "onboarding" || employee.onboardingStatus?.status === "Submitted") {
    tags.push({ label: "Onboarding", className: "border-blue-200 bg-blue-50 text-blue-700" });
  } else if (employee.status === "active") {
    tags.push({ label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" });
  } else {
    tags.push({ label: employee.status.replaceAll("_", " "), className: "border-slate-200 bg-slate-50 text-slate-700" });
  }

  if (employee.employer_setup_completed_at) {
    tags.push({ label: "Setup Done", className: "border-emerald-200 bg-white text-emerald-700" });
  } else {
    tags.push({ label: "Setup Pending", className: "border-amber-200 bg-white text-amber-700" });
  }

  return tags;
}

function EmployeeTags({ employee, compact = false }: { employee: WorktreeEmployeeNode; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-2" : ""}`}>
      {employeeStatusTags(employee).map((tag) => (
        <span
          key={tag.label}
          className={`inline-flex rounded-full border px-2 py-0.5 font-semibold capitalize ${compact ? "text-[10px]" : "text-xs"} ${tag.className}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

function WorktreeNode({
  title,
  subtitle,
  meta,
  initials,
  employee,
  selected,
  onClick,
}: {
  title: string;
  subtitle: string;
  meta?: string | null;
  initials: string;
  employee?: WorktreeEmployeeNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-52 rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        selected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-950">{title}</span>
          <span className="block truncate text-xs font-medium text-slate-500">{subtitle}</span>
        </span>
      </div>
      {meta ? <p className="mt-3 truncate text-xs text-slate-500">{meta}</p> : null}
      {employee ? <EmployeeTags employee={employee} compact /> : null}
    </button>
  );
}

function TreeConnector({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pt-10 before:absolute before:left-1/2 before:top-0 before:h-10 before:border-l before:border-slate-300">
      {children}
    </div>
  );
}

function TeamBranch({
  team,
  selected,
  onSelect,
}: {
  team: WorktreeTeamNode;
  selected: SelectedNode | null;
  onSelect: (node: SelectedNode) => void;
}) {
  return (
    <div className="relative flex min-w-72 flex-col items-center">
      <TreeConnector>
        <div className="w-60 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
              {team.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-950">{team.name}</h3>
              <p className="text-xs text-slate-500">{team.isFallback ? "Department group" : "Team"}</p>
            </div>
          </div>

          {team.manager ? (
            <button
              type="button"
              onClick={() =>
                onSelect({ type: "employee", employee: team.manager!, teamName: team.name })
              }
              className={`mt-4 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 ${
                selected?.type === "employee" && selected.employee.id === team.manager.id
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-slate-200">
                {team.manager.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-900">
                  {team.manager.full_name}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {team.manager.job_title ?? "Team lead"}
                </span>
                <EmployeeTags employee={team.manager} compact />
              </span>
            </button>
          ) : null}
        </div>
      </TreeConnector>

      {team.employees.length > 0 ? (
        <div className="relative mt-10 flex gap-5 before:absolute before:-top-10 before:left-1/2 before:h-10 before:border-l before:border-slate-300">
          {team.employees.map((employee) => (
            <div
              key={employee.id}
              className="relative before:absolute before:-top-5 before:left-1/2 before:h-5 before:border-l before:border-slate-300"
            >
              <WorktreeNode
                title={employee.full_name}
                subtitle={employee.job_title ?? "Employee"}
                meta={employee.teamRole ?? team.name}
                initials={employee.initials}
                employee={employee}
                selected={selected?.type === "employee" && selected.employee.id === employee.id}
                onClick={() => onSelect({ type: "employee", employee, teamName: team.name })}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500">
          No employees assigned
        </p>
      )}
    </div>
  );
}

function WorktreePagination({ data }: { data: WorktreePageData }) {
  if (data.mode !== "admin" || data.employerCount <= 0) return null;

  const previous = Math.max(0, data.employerIndex - 1);
  const next = Math.min(data.employerCount - 1, data.employerIndex + 1);
  const currentEmployer = data.employers[data.employerIndex];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Viewing Employer
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950">
          Employer {data.employerIndex + 1} of {data.employerCount}
        </p>
      </div>
      <div className="min-w-64 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 sm:max-w-sm">
        {currentEmployer?.name ?? "No employer selected"}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/worktree?employer=${previous}`}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            data.employerIndex === 0
              ? "pointer-events-none border-slate-200 text-slate-300"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Previous Employer
        </Link>
        <Link
          href={`/dashboard/worktree?employer=${next}`}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            data.employerIndex >= data.employerCount - 1
              ? "pointer-events-none bg-slate-100 text-slate-400"
              : "bg-blue-700 text-white hover:bg-blue-800"
          }`}
        >
          Next Employer
        </Link>
      </div>
    </div>
  );
}

function NoticeComposer({
  selected,
}: {
  selected: Extract<SelectedNode, { type: "employer" }> | Extract<SelectedNode, { type: "employee" }>;
}) {
  const targetType = selected.type;
  const targetId = selected.type === "employer" ? selected.id : selected.employee.id;
  const recipient = `${targetType}:${targetId}`;

  return (
    <Link
      href={`/dashboard/messages?recipient=${recipient}`}
      className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
    >
      Open message composer
      <span>→</span>
    </Link>
  );
}

function DetailsPanel({
  selected,
  role,
  onClose,
}: {
  selected: SelectedNode | null;
  role: PortalRole;
  onClose: () => void;
}) {
  const actions = useMemo(() => {
    if (!selected) return [];
    if (selected.type === "employer") return employerActions;

    return employeeActions.filter((action) => {
      if (action !== "finances") return true;
      return role === "super_admin" || role === "admin";
    });
  }, [role, selected]);

  return (
    <aside
      className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
    >
      {selected ? (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {selected.type === "employer" ? "Employer Details" : "Employee Details"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Worktree actions</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close details panel"
            >
              X
            </button>
          </div>

            <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-base font-bold text-blue-700 ring-1 ring-blue-100">
                {selected.type === "employer"
                  ? selected.title.slice(0, 2).toUpperCase()
                  : selected.employee.initials}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-950">
                  {selected.type === "employer" ? selected.title : selected.employee.full_name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.type === "employer"
                    ? selected.subtitle
                    : selected.employee.job_title ?? "Employee"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selected.type === "employer" ? selected.meta : selected.teamName ?? selected.employee.department ?? "No team"}
                </p>
                {selected.type === "employee" ? <div className="mt-2"><EmployeeTags employee={selected.employee} /></div> : null}
              </div>
            </div>

            {selected.type === "employer" ? (
              <div className="mt-5 grid gap-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MiniStat label="Onboarding" value={selected.employer.clientCompany?.onboarding_status ?? "Not started"} />
                  <MiniStat label="Country" value={selected.employer.clientCompany?.country ?? "Not set"} />
                  <MiniStat label="Work mode" value={selected.employer.employmentDefaults?.work_mode ?? "Not set"} />
                  <MiniStat label="Templates" value={selected.employer.templateCount} />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-slate-900">Defaults:</span>{" "}
                  {selected.employer.employmentDefaults
                    ? `${selected.employer.employmentDefaults.working_hours}, ${selected.employer.employmentDefaults.notice_period} notice, ${selected.employer.employmentDefaults.probation_period} probation`
                    : "Employment defaults are not configured yet."}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-slate-900">Compliance:</span>{" "}
                  {selected.employer.complianceSettings
                    ? [
                        selected.employer.complianceSettings.nda_required ? "NDA" : null,
                        selected.employer.complianceSettings.background_check_required ? "BGV" : null,
                        selected.employer.complianceSettings.equipment_required ? "Equipment" : null,
                        selected.employer.complianceSettings.handles_customer_data ? "Customer data" : null,
                      ].filter(Boolean).join(", ") || "No special requirements"
                    : "Compliance preferences are not configured yet."}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MiniStat label="Onboarding" value={selected.employee.onboardingStatus?.status ?? "Draft"} />
                  <MiniStat label="Progress" value={`${selected.employee.onboardingProgress?.completion_percentage ?? 0}%`} />
                  <MiniStat label="Docs" value={selected.employee.documentCounts.total} />
                  <MiniStat label="Notice" value={selected.employee.notice_period_days ? `${selected.employee.notice_period_days} days` : "Not set"} />
                  <MiniStat label="LWD" value={selected.employee.latestResignation?.calculated_last_working_day ?? selected.employee.latestOffboarding?.target_last_working_day ?? "Not set"} />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-slate-900">Employer setup:</span>{" "}
                  {selected.employee.employer_setup_completed_at
                    ? `Completed. ${selected.employee.employer_setup_notes ?? ""}`
                    : "Team, manager, leave policy, and notice period still need employer confirmation."}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-slate-900">Profile:</span>{" "}
                  {selected.employee.onboardingProfile
                    ? `${selected.employee.onboardingProfile.phone ?? "No phone"} · ${selected.employee.onboardingProfile.gender ?? "No gender"}`
                    : "Employee self-onboarding profile is not submitted yet."}
                </div>
                {selected.employee.documentCounts.pending || selected.employee.documentCounts.rejected ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    {selected.employee.documentCounts.pending} pending document(s), {selected.employee.documentCounts.rejected} rejected document(s)
                  </div>
                ) : null}
              </div>
            )}

            {canSendNotice(role, selected) ? (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Send message / notice
                </p>
                <NoticeComposer selected={selected} />
              </div>
            ) : null}

            <div className="mt-6 grid gap-2">
              {actions.map((action, index) => {
                const type = selected.type;
                const id = selected.type === "employer" ? selected.id : selected.employee.id;
                return (
                  <Link
                    key={action}
                    href={actionHref(type, id, action)}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${actionTones[index % actionTones.length]}`}>
                        {actionLabel(action).slice(0, 2).toUpperCase()}
                      </span>
                      {actionLabel(action)}
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <p className="text-sm font-semibold text-slate-950">Details panel</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Select an employer, manager, or employee node to view actions here.
          </p>
        </div>
      )}
    </aside>
  );
}

function WorktreeCanvas({
  model,
  role,
  mode,
}: {
  model: WorktreeModel;
  role: PortalRole;
  mode: WorktreePageData["mode"];
}) {
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const employer = model.employer;
  const employeeCount = model.teams.reduce((count, team) => count + team.employees.length + (team.manager ? 1 : 0), 0);
  const modeTitle =
    mode === "admin"
      ? "Admin Worktree"
      : mode === "employer"
        ? "Employer View"
        : "Employee View";
  const modeSubtitle =
    mode === "admin"
      ? "One employer per page with clear previous and next controls."
      : mode === "employer"
        ? "All teams are shown horizontally in one organization page."
        : "Self-service view for the signed-in employee.";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{modeTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{modeSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              Fit to Screen
            </button>
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              100%
            </span>
          </div>
        </div>
        <div className="overflow-x-auto bg-slate-50 p-6">
          <div className="min-w-max pb-4">
            <div className="flex flex-col items-center">
              <WorktreeNode
                title={employer.name}
                subtitle="Employer"
                meta={`${employeeCount} employees`}
                initials={employer.name.slice(0, 2).toUpperCase()}
                selected={selected?.type === "employer"}
                onClick={() =>
                  setSelected({
                    type: "employer",
                    employer,
                    id: employer.id,
                    title: employer.name,
                    subtitle: employer.legal_name ?? "Employer",
                    meta: employer.contact_email,
                  })
                }
              />

              <div className="relative mt-10 flex gap-8 before:absolute before:-top-10 before:left-1/2 before:h-10 before:border-l before:border-slate-300">
                {model.teams.map((team) => (
                  <TeamBranch
                    key={team.id}
                    team={team}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <DetailsPanel selected={selected} role={role} onClose={() => setSelected(null)} />
    </div>
  );
}

function EmployeeSelfView({ employee, role }: { employee: WorktreeEmployeeNode; role: PortalRole }) {
  const [selected, setSelected] = useState<SelectedNode | null>({
    type: "employee",
    employee,
    teamName: employee.department,
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-blue-700">Employee View</h2>
        <p className="mt-1 text-sm text-slate-500">Self-service Worktree profile.</p>
        <div className="mt-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-base font-bold text-blue-700 ring-1 ring-blue-100">
              {employee.initials}
            </span>
            <div>
              <p className="font-semibold text-slate-950">{employee.full_name}</p>
              <p className="mt-1 text-sm text-slate-500">{employee.job_title ?? "Employee"}</p>
              <p className="text-xs text-slate-500">{employee.department ?? "No team"}</p>
              <div className="mt-2"><EmployeeTags employee={employee} /></div>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">My Actions</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {["details", "docs", "leaves", "resignation"].map((action) => (
              <Link
                key={action}
                href={actionHref("employee", employee.id, action)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                {actionLabel(action)}
              </Link>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="mt-5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          onClick={() => setSelected({ type: "employee", employee, teamName: employee.department })}
        >
          Open Details
        </button>
      </section>
      <DetailsPanel selected={selected} role={role} onClose={() => setSelected(null)} />
    </div>
  );
}
export function WorktreeClient({
  data,
  role,
}: {
  data: WorktreePageData;
  role: PortalRole;
}) {
  if (data.error) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
        {data.error}
      </div>
    );
  }

  if (data.mode === "employee" && data.employeeSelf) {
    return <EmployeeSelfView employee={data.employeeSelf} role={role} />;
  }

  if (!data.model) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
        No Worktree data is available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <WorktreePagination data={data} />
      <WorktreeCanvas model={data.model} role={role} mode={data.mode} />
    </div>
  );
}
