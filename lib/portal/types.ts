export type PortalRole = "super_admin" | "admin" | "employer_admin" | "employee";

export type AccountStatus = "pending" | "active" | "suspended" | "deactivated";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "invite_sent"
  | "joined"
  | "completed"
  | "cancelled";

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type PortalUser = {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  role: PortalRole;
  status: AccountStatus;
  employer_id: string | null;
};

export type PortalSession = {
  clerkUserId: string;
  email: string;
  user: PortalUser;
};

export type PortalCounts = {
  employerLeads: number;
  employers: number;
  employees: number;
  employeeRequests: number;
  leaveRequests: number;
  resignations: number;
  offboardingCases: number;
  notices: number;
};
