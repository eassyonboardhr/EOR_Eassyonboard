import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/portal/session";
import type { PortalSession } from "@/lib/portal/types";
import type { Database } from "@/lib/supabase/database.types";

type EmployerRow = Database["public"]["Tables"]["employers"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
type TeamMemberRow = Database["public"]["Tables"]["team_members"]["Row"];
type ClientCompanyRow = Database["public"]["Tables"]["client_companies"]["Row"];
type ClientEmploymentDefaultsRow = Database["public"]["Tables"]["client_employment_defaults"]["Row"];
type ClientComplianceSettingsRow = Database["public"]["Tables"]["client_compliance_settings"]["Row"];
type EmployeeProfileRow = Database["public"]["Tables"]["employee_profiles"]["Row"];
type EmployeeOnboardingProgressRow = Database["public"]["Tables"]["employee_onboarding_progress"]["Row"];
type EmployeeOnboardingStatusRow = Database["public"]["Tables"]["employee_onboarding_status"]["Row"];
type ResignationRow = Database["public"]["Tables"]["resignations"]["Row"];
type OffboardingCaseRow = Database["public"]["Tables"]["offboarding_cases"]["Row"];

export type WorktreeEmployerNode = EmployerRow & {
  clientCompany: ClientCompanyRow | null;
  employmentDefaults: ClientEmploymentDefaultsRow | null;
  complianceSettings: ClientComplianceSettingsRow | null;
  companyDocumentCount: number;
  templateCount: number;
};

export type WorktreeEmployeeNode = EmployeeRow & {
  initials: string;
  teamRole: string | null;
  onboardingProfile: EmployeeProfileRow | null;
  onboardingProgress: EmployeeOnboardingProgressRow | null;
  onboardingStatus: EmployeeOnboardingStatusRow | null;
  latestResignation: Pick<
    ResignationRow,
    "status" | "notice_period_days" | "calculated_last_working_day" | "acknowledged_at"
  > | null;
  latestOffboarding: Pick<OffboardingCaseRow, "status" | "target_last_working_day"> | null;
  documentCounts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

export type WorktreeTeamNode = {
  id: string;
  name: string;
  manager: WorktreeEmployeeNode | null;
  employees: WorktreeEmployeeNode[];
  isFallback: boolean;
};

export type WorktreeModel = {
  employer: WorktreeEmployerNode;
  teams: WorktreeTeamNode[];
  assignableEmployees: WorktreeEmployeeNode[];
  ungroupedEmployees: WorktreeEmployeeNode[];
};

export type WorktreePageData = {
  mode: "admin" | "employer" | "employee";
  model: WorktreeModel | null;
  employers: EmployerRow[];
  employerIndex: number;
  employerCount: number;
  employeeSelf: WorktreeEmployeeNode | null;
  error: string | null;
};

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}

function toEmployeeNode(
  employee: EmployeeRow,
  teamRole: string | null = null,
  enrichment?: {
    profile?: EmployeeProfileRow | null;
    progress?: EmployeeOnboardingProgressRow | null;
    status?: EmployeeOnboardingStatusRow | null;
    resignation?: WorktreeEmployeeNode["latestResignation"];
    offboarding?: WorktreeEmployeeNode["latestOffboarding"];
    documentCounts?: WorktreeEmployeeNode["documentCounts"];
  },
): WorktreeEmployeeNode {
  return {
    ...employee,
    initials: initials(employee.full_name, employee.email),
    teamRole,
    onboardingProfile: enrichment?.profile ?? null,
    onboardingProgress: enrichment?.progress ?? null,
    onboardingStatus: enrichment?.status ?? null,
    latestResignation: enrichment?.resignation ?? null,
    latestOffboarding: enrichment?.offboarding ?? null,
    documentCounts: enrichment?.documentCounts ?? {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  };
}

export function buildWorktreeModel({
  employer,
  employees,
  teams,
  teamMembers,
  employeeEnrichment = new Map(),
}: {
  employer: WorktreeEmployerNode;
  employees: EmployeeRow[];
  teams: TeamRow[];
  teamMembers: TeamMemberRow[];
  employeeEnrichment?: Map<string, Parameters<typeof toEmployeeNode>[2]>;
}): WorktreeModel {
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const assignedEmployeeIds = new Set<string>();
  const membersByTeam = new Map<string, TeamMemberRow[]>();

  for (const member of teamMembers) {
    const current = membersByTeam.get(member.team_id) ?? [];
    current.push(member);
    membersByTeam.set(member.team_id, current);
    assignedEmployeeIds.add(member.employee_id);
  }

  const explicitTeams: WorktreeTeamNode[] = teams.map((team) => {
    if (team.manager_employee_id) {
      assignedEmployeeIds.add(team.manager_employee_id);
    }

    const manager = team.manager_employee_id
      ? employeesById.get(team.manager_employee_id)
      : null;
    const members = (membersByTeam.get(team.id) ?? [])
      .map((member) => {
        const employee = employeesById.get(member.employee_id);
        return employee ? toEmployeeNode(employee, member.role_in_team, employeeEnrichment.get(employee.id)) : null;
      })
      .filter((employee): employee is WorktreeEmployeeNode => Boolean(employee))
      .filter((employee) => employee.id !== team.manager_employee_id);

    return {
      id: team.id,
      name: team.name,
      manager: manager ? toEmployeeNode(manager, "Team lead", employeeEnrichment.get(manager.id)) : null,
      employees: members,
      isFallback: false,
    };
  });

  const fallbackGroups = new Map<string, EmployeeRow[]>();
  for (const employee of employees) {
    if (assignedEmployeeIds.has(employee.id)) continue;
    const groupName = employee.department?.trim() || "Unassigned";
    fallbackGroups.set(groupName, [...(fallbackGroups.get(groupName) ?? []), employee]);
  }

  const fallbackTeams: WorktreeTeamNode[] = [...fallbackGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, groupEmployees]) => ({
      id: `department:${name}`,
      name,
      manager: null,
      employees: groupEmployees.map((employee) => toEmployeeNode(employee, null, employeeEnrichment.get(employee.id))),
      isFallback: true,
    }));

  return {
    employer,
    teams: [...explicitTeams, ...fallbackTeams],
    assignableEmployees: employees.map((employee) => toEmployeeNode(employee, null, employeeEnrichment.get(employee.id))),
    ungroupedEmployees: [],
  };
}

async function fetchEmployerTree(employer: EmployerRow): Promise<WorktreeModel> {
  const supabase = getSupabaseAdmin();
  const [employees, teams, clientCompany] = await Promise.all([
    supabase
      .from("employees")
      .select("*")
      .eq("employer_id", employer.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("teams")
      .select("*")
      .eq("employer_id", employer.id)
      .order("name", { ascending: true }),
    supabase
      .from("client_companies")
      .select("*, client_employment_defaults(*), client_compliance_settings(*)")
      .eq("employer_id", employer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (employees.error) throw new Error(employees.error.message);
  if (teams.error) throw new Error(teams.error.message);

  const teamIds = (teams.data ?? []).map((team) => team.id);
  const teamMembers =
    teamIds.length === 0
      ? { data: [] as TeamMemberRow[], error: null }
      : await supabase
          .from("team_members")
          .select("*")
          .in("team_id", teamIds)
          .order("created_at", { ascending: true });

  if (teamMembers.error) throw new Error(teamMembers.error.message);

  const employeeIds = (employees.data ?? []).map((employee) => employee.id);
  const [profiles, progress, statuses, documents, resignations, offboardingCases] =
    employeeIds.length === 0
      ? [
          { data: [] as EmployeeProfileRow[] },
          { data: [] as EmployeeOnboardingProgressRow[] },
          { data: [] as EmployeeOnboardingStatusRow[] },
          { data: [] as Array<{ employee_id: string; verification_status: string }> },
          { data: [] as Array<WorktreeEmployeeNode["latestResignation"] & { employee_id: string }> },
          { data: [] as Array<WorktreeEmployeeNode["latestOffboarding"] & { employee_id: string }> },
        ]
      : await Promise.all([
          supabase.from("employee_profiles").select("*").in("employee_id", employeeIds),
          supabase.from("employee_onboarding_progress").select("*").in("employee_id", employeeIds),
          supabase.from("employee_onboarding_status").select("*").in("employee_id", employeeIds),
          supabase.from("employee_documents").select("employee_id, verification_status").in("employee_id", employeeIds),
          supabase
            .from("resignations")
            .select("employee_id, status, notice_period_days, calculated_last_working_day, acknowledged_at")
            .in("employee_id", employeeIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("offboarding_cases")
            .select("employee_id, status, target_last_working_day")
            .in("employee_id", employeeIds)
            .order("created_at", { ascending: false }),
        ]);

  const profileByEmployee = new Map((profiles.data ?? []).map((row) => [row.employee_id, row]));
  const progressByEmployee = new Map((progress.data ?? []).map((row) => [row.employee_id, row]));
  const statusByEmployee = new Map((statuses.data ?? []).map((row) => [row.employee_id, row]));
  const resignationByEmployee = new Map<string, WorktreeEmployeeNode["latestResignation"]>();
  for (const resignation of resignations.data ?? []) {
    if (!resignationByEmployee.has(resignation.employee_id)) {
      resignationByEmployee.set(resignation.employee_id, resignation);
    }
  }
  const offboardingByEmployee = new Map<string, WorktreeEmployeeNode["latestOffboarding"]>();
  for (const offboarding of offboardingCases.data ?? []) {
    if (!offboardingByEmployee.has(offboarding.employee_id)) {
      offboardingByEmployee.set(offboarding.employee_id, offboarding);
    }
  }
  const documentCountsByEmployee = new Map<string, WorktreeEmployeeNode["documentCounts"]>();
  for (const document of documents.data ?? []) {
    const current = documentCountsByEmployee.get(document.employee_id) ?? {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    current.total += 1;
    if (document.verification_status === "Pending") current.pending += 1;
    if (document.verification_status === "Approved") current.approved += 1;
    if (document.verification_status === "Rejected") current.rejected += 1;
    documentCountsByEmployee.set(document.employee_id, current);
  }

  const employeeEnrichment = new Map<string, Parameters<typeof toEmployeeNode>[2]>();
  for (const employeeId of employeeIds) {
    employeeEnrichment.set(employeeId, {
      profile: profileByEmployee.get(employeeId) ?? null,
      progress: progressByEmployee.get(employeeId) ?? null,
      status: statusByEmployee.get(employeeId) ?? null,
      resignation: resignationByEmployee.get(employeeId) ?? null,
      offboarding: offboardingByEmployee.get(employeeId) ?? null,
      documentCounts: documentCountsByEmployee.get(employeeId),
    });
  }

  const company = clientCompany.data;
  const companyId = company?.id;
  const [realCompanyDocuments, realTemplates] = companyId
    ? await Promise.all([
        supabase.from("client_documents").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("contract_templates").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ])
    : [{ count: 0 }, { count: 0 }];

  const enrichedEmployer: WorktreeEmployerNode = {
    ...employer,
    clientCompany: company ?? null,
    employmentDefaults: company?.client_employment_defaults ?? null,
    complianceSettings: company?.client_compliance_settings ?? null,
    companyDocumentCount: realCompanyDocuments.count ?? 0,
    templateCount: realTemplates.count ?? 0,
  };

  return buildWorktreeModel({
    employer: enrichedEmployer,
    employees: employees.data ?? [],
    teams: teams.data ?? [],
    teamMembers: teamMembers.data ?? [],
    employeeEnrichment,
  });
}

function parseEmployerIndex(value: string | string[] | undefined, count: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const index = Number.parseInt(raw ?? "0", 10);

  if (!Number.isFinite(index) || Number.isNaN(index)) return 0;
  return Math.max(0, Math.min(count - 1, index));
}

export async function getWorktreeData(
  session: PortalSession,
  searchParams: Record<string, string | string[] | undefined> = {},
): Promise<WorktreePageData> {
  const supabase = getSupabaseAdmin();

  if (isPlatformAdmin(session.user.role)) {
    const { data: employers, error } = await supabase
      .from("employers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    const employerList = employers ?? [];
    const employerIndex = parseEmployerIndex(searchParams.employer, employerList.length);
    const employer = employerList[employerIndex] ?? null;

    return {
      mode: "admin",
      model: employer ? await fetchEmployerTree(employer) : null,
      employers: employerList,
      employerIndex,
      employerCount: employerList.length,
      employeeSelf: null,
      error: employer ? null : "No employers are available for Worktree yet.",
    };
  }

  if (session.user.role === "employer_admin") {
    if (!session.user.employer_id) {
      return {
        mode: "employer",
        model: null,
        employers: [],
        employerIndex: 0,
        employerCount: 0,
        employeeSelf: null,
        error: "Your employer account is not linked yet.",
      };
    }

    const { data: employer, error } = await supabase
      .from("employers")
      .select("*")
      .eq("id", session.user.employer_id)
      .single();

    if (error || !employer) throw new Error(error?.message ?? "Employer not found.");

    return {
      mode: "employer",
      model: await fetchEmployerTree(employer),
      employers: [employer],
      employerIndex: 0,
      employerCount: 1,
      employeeSelf: null,
      error: null,
    };
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .select("*")
    .eq("portal_user_id", session.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!employee) {
    return {
      mode: "employee",
      model: null,
      employers: [],
      employerIndex: 0,
      employerCount: 0,
      employeeSelf: null,
      error: "Your employee profile is not linked yet.",
    };
  }

  const { data: employer } = await supabase
    .from("employers")
    .select("*")
    .eq("id", employee.employer_id)
    .single();

  const [profile, progress, status, documents, resignation, offboarding] = await Promise.all([
    supabase.from("employee_profiles").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_onboarding_progress").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_onboarding_status").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase.from("employee_documents").select("employee_id, verification_status").eq("employee_id", employee.id),
    supabase
      .from("resignations")
      .select("status, notice_period_days, calculated_last_working_day, acknowledged_at")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("offboarding_cases")
      .select("status, target_last_working_day")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const documentCounts = {
    total: documents.data?.length ?? 0,
    pending: documents.data?.filter((document) => document.verification_status === "Pending").length ?? 0,
    approved: documents.data?.filter((document) => document.verification_status === "Approved").length ?? 0,
    rejected: documents.data?.filter((document) => document.verification_status === "Rejected").length ?? 0,
  };
  const selfEnrichment = new Map<string, Parameters<typeof toEmployeeNode>[2]>([
    [
      employee.id,
      {
        profile: profile.data ?? null,
        progress: progress.data ?? null,
        status: status.data ?? null,
        resignation: resignation.data ?? null,
        offboarding: offboarding.data ?? null,
        documentCounts,
      },
    ],
  ]);

  return {
    mode: "employee",
    model: employer
      ? buildWorktreeModel({
          employer: {
            ...employer,
            clientCompany: null,
            employmentDefaults: null,
            complianceSettings: null,
            companyDocumentCount: 0,
            templateCount: 0,
          },
          employees: [employee],
          teams: [],
          teamMembers: [],
          employeeEnrichment: selfEnrichment,
        })
      : null,
    employers: employer ? [employer] : [],
    employerIndex: 0,
    employerCount: employer ? 1 : 0,
    employeeSelf: toEmployeeNode(employee, null, selfEnrichment.get(employee.id)),
    error: null,
  };
}
