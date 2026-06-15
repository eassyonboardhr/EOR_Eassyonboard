import { readFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const now = new Date();
const nowIso = now.toISOString();
const currentYear = now.getUTCFullYear();
const demoMonth = `${currentYear}-06-01`;

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Local env files are optional for CI; real failures are validated below.
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "CLERK_SECRET_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!supabaseKey) {
  throw new Error("Missing required Supabase service key.");
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const demoUsers = {
  admin: {
    email: "eassyonboard.admin+clerk_test@gmail.com",
    username: "eassy_demo_admin",
    firstName: "Eassy",
    lastName: "Demo Admin",
    role: "admin",
  },
  employer: {
    email: "eassyonboard.employer+clerk_test@gmail.com",
    username: "eassy_demo_employer",
    firstName: "Eassy",
    lastName: "Demo Employer",
    role: "employer_admin",
  },
  employee: {
    email: "eassyonboard.employee+clerk_test@gmail.com",
    username: "eassy_demo_employee",
    firstName: "Eassy",
    lastName: "Demo Employee",
    role: "employee",
  },
  employeeAlt: {
    email: "eassyonboard.employee2+clerk_test@gmail.com",
    username: "eassy_demo_employee_two",
    firstName: "Eassy",
    lastName: "Demo Employee Two",
    role: "employee",
  },
};

const summary = {
  clerkUsers: [],
  portalUsers: [],
  tablesTouched: new Set(),
  storageUploads: [],
};

function cleanError(error) {
  if (!error) return "Unknown error";
  return error.message ?? JSON.stringify(error);
}

async function requireNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${cleanError(result.error)}`);
  }
  return result.data;
}

async function findOne(table, match, columns = "*") {
  const result = await supabase.from(table).select(columns).match(match).limit(1);
  await requireNoError(result, `select ${table}`);
  return result.data?.[0] ?? null;
}

async function ensureRecord(table, match, values, columns = "*") {
  summary.tablesTouched.add(table);
  const existing = await findOne(table, match, "id");
  if (existing?.id) {
    const result = await supabase
      .from(table)
      .update(values)
      .eq("id", existing.id)
      .select(columns)
      .single();
    return requireNoError(result, `update ${table}`);
  }

  const result = await supabase
    .from(table)
    .insert({ ...match, ...values })
    .select(columns)
    .single();
  return requireNoError(result, `insert ${table}`);
}

async function ensureClerkUser(user) {
  const existingList = await clerk.users.getUserList({
    emailAddress: [user.email],
    limit: 10,
  });
  const existing = existingList.data?.[0];
  const metadata = {
    demo: true,
    role: user.role,
    project: "EassyOnboard",
  };

  if (existing) {
    await clerk.users.updateUserMetadata(existing.id, {
      publicMetadata: metadata,
      privateMetadata: metadata,
    });
    summary.clerkUsers.push({ email: user.email, clerkUserId: existing.id, status: "existing" });
    return existing;
  }

  const created = await clerk.users.createUser({
    emailAddress: [user.email],
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    skipPasswordRequirement: true,
    skipLegalChecks: true,
    publicMetadata: metadata,
    privateMetadata: metadata,
  });
  summary.clerkUsers.push({ email: user.email, clerkUserId: created.id, status: "created" });
  return created;
}

async function ensurePortalUser(user, clerkUser, employerId = null) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const portalUser = await ensureRecord(
    "portal_users",
    { email: user.email },
    {
      clerk_user_id: clerkUser.id,
      full_name: fullName,
      role: user.role,
      status: "active",
      employer_id: employerId,
      updated_at: nowIso,
    },
  );
  summary.portalUsers.push({ email: user.email, role: user.role, portalUserId: portalUser.id });
  return portalUser;
}

async function uploadDemoFile(bucket, path, body) {
  const result = await supabase.storage.from(bucket).upload(path, body, {
    contentType: "text/plain",
    upsert: true,
  });
  if (result.error) {
    throw new Error(`upload ${bucket}/${path}: ${cleanError(result.error)}`);
  }
  summary.storageUploads.push(`${bucket}/${path}`);
  return result.data.path;
}

async function main() {
  const clerkUsers = {};
  for (const [key, user] of Object.entries(demoUsers)) {
    clerkUsers[key] = await ensureClerkUser(user);
  }

  const adminUser = await ensurePortalUser(demoUsers.admin, clerkUsers.admin);

  const employer = await ensureRecord(
    "employers",
    { contact_email: demoUsers.employer.email },
    {
      name: "Eassy Demo Global Pvt Ltd",
      legal_name: "Eassy Demo Global Private Limited",
      contact_name: "Eassy Demo Employer",
      status: "active",
      approved_at: nowIso,
      approved_by: adminUser.id,
      updated_at: nowIso,
    },
  );

  const employerUser = await ensurePortalUser(demoUsers.employer, clerkUsers.employer, employer.id);
  const employeeUser = await ensurePortalUser(demoUsers.employee, clerkUsers.employee, employer.id);
  const employeeAltUser = await ensurePortalUser(demoUsers.employeeAlt, clerkUsers.employeeAlt, employer.id);

  const opsTeam = await ensureRecord(
    "teams",
    { employer_id: employer.id, name: "Eassy Demo Operations" },
    { updated_at: nowIso },
  );
  const productTeam = await ensureRecord(
    "teams",
    { employer_id: employer.id, name: "Eassy Demo Product" },
    { updated_at: nowIso },
  );

  const employee = await ensureRecord(
    "employees",
    { employer_id: employer.id, email: demoUsers.employee.email },
    {
      portal_user_id: employeeUser.id,
      full_name: "Eassy Demo Employee",
      job_title: "Operations Specialist",
      department: "Operations",
      start_date: `${currentYear}-01-08`,
      status: "active",
      lifecycle_status: "active",
      team_id: opsTeam.id,
      notice_period_days: 30,
      updated_at: nowIso,
    },
  );
  const employeeAlt = await ensureRecord(
    "employees",
    { employer_id: employer.id, email: demoUsers.employeeAlt.email },
    {
      portal_user_id: employeeAltUser.id,
      full_name: "Eassy Demo Employee Two",
      job_title: "Product Analyst",
      department: "Product",
      start_date: `${currentYear}-02-12`,
      status: "active",
      lifecycle_status: "under_resignation",
      team_id: productTeam.id,
      notice_period_days: 45,
      updated_at: nowIso,
    },
  );

  await ensureRecord("team_members", { team_id: opsTeam.id, employee_id: employee.id }, { role_in_team: "Primary demo employee" });
  await ensureRecord("team_members", { team_id: productTeam.id, employee_id: employeeAlt.id }, { role_in_team: "Lifecycle demo employee" });

  await ensureRecord(
    "employer_leads",
    { email: "eassyonboard.lead+clerk_test@gmail.com" },
    {
      contact_name: "Eassy Demo Prospect",
      company_name: "Eassy Demo Prospect LLC",
      phone: "+12015550123",
      message: "Demo lead for employer approval workflow.",
      status: "pending",
      updated_at: nowIso,
    },
  );

  await ensureRecord(
    "employee_requests",
    { employer_id: employer.id, email: "eassyonboard.candidate+clerk_test@gmail.com" },
    {
      requested_by: employerUser.id,
      full_name: "Eassy Demo Candidate",
      job_title: "Implementation Coordinator",
      department: "Client Success",
      proposed_start_date: `${currentYear}-07-01`,
      status: "pending",
      hourly_billing_rate: 45,
      hours_per_week: 40,
      weeks_per_year: 52,
      billing_currency: "USD",
      calculated_annual_salary: 93600,
      calculated_monthly_salary: 7800,
      onboarding_notes: "Demo candidate awaiting admin approval.",
      updated_at: nowIso,
    },
  );

  const company = await ensureRecord(
    "client_companies",
    { registration_number: "EASSY-DEMO-2026", country: "India" },
    {
      employer_id: employer.id,
      company_name: "Eassy Demo Global Pvt Ltd",
      trading_name: "Eassy Demo",
      registration_type: "CIN",
      website: "https://example.com/eassy-demo",
      industry: "Professional Services",
      employee_count: 2,
      onboarding_status: "approved",
      created_by: employerUser.id,
      reviewed_by: adminUser.id,
      reviewed_at: nowIso,
      review_remarks: "Approved demo client onboarding.",
      updated_at: nowIso,
    },
  );

  for (const contact of [
    ["primary_contact", "Eassy Demo Employer", "Director", demoUsers.employer.email],
    ["billing_contact", "Eassy Demo Billing", "Finance", "eassyonboard.billing+clerk_test@gmail.com"],
    ["signatory", "Eassy Demo Signatory", "Authorized Signatory", "eassyonboard.signatory+clerk_test@gmail.com"],
  ]) {
    await ensureRecord(
      "client_contacts",
      { company_id: company.id, contact_type: contact[0], email: contact[3] },
      { name: contact[1], designation: contact[2], phone: "+12015550124", timezone: "Asia/Kolkata" },
    );
  }

  await ensureRecord("client_billing_settings", { company_id: company.id }, {
    billing_contact_name: "Eassy Demo Billing",
    billing_contact_email: "eassyonboard.billing+clerk_test@gmail.com",
    billing_contact_phone: "+12015550124",
    accounts_email: "eassyonboard.accounts+clerk_test@gmail.com",
    currency: "USD",
    payment_terms: "Net 30",
    updated_at: nowIso,
  });
  await ensureRecord("client_employment_defaults", { company_id: company.id }, {
    working_hours: "40 hours per week",
    notice_period: "30 days",
    probation_period: "3 months",
    leave_policy: "Eassy Demo standard leave policy",
    work_mode: "Hybrid",
    updated_at: nowIso,
  });
  await ensureRecord("client_compliance_settings", { company_id: company.id }, {
    nda_required: true,
    background_check_required: true,
    equipment_required: false,
    handles_customer_data: true,
    updated_at: nowIso,
  });

  const companyDocPath = await uploadDemoFile("company-documents", "demo/eassy-demo-company-document.txt", "Eassy Demo company registration placeholder.\n");
  await ensureRecord("client_documents", { company_id: company.id, document_type: "company_registration" }, {
    file_path: companyDocPath,
    uploaded_by: employerUser.id,
  });

  await ensureRecord("employee_profiles", { employee_id: employee.id }, {
    user_id: employeeUser.id,
    employee_code: "EASSY-DEMO-EMP-001",
    full_name: "Eassy Demo Employee",
    father_name: "Eassy Demo Parent",
    date_of_birth: "1994-04-12",
    gender: "Prefer not to say",
    email: demoUsers.employee.email,
    phone: "+12015550125",
    updated_at: nowIso,
  });
  await ensureRecord("employee_addresses", { employee_id: employee.id }, {
    current_address: "Demo current address, Bengaluru",
    permanent_address: "Demo permanent address, Bengaluru",
    state: "Karnataka",
    city: "Bengaluru",
    postal_code: "560001",
    updated_at: nowIso,
  });
  await ensureRecord("employee_emergency_contacts", { employee_id: employee.id, phone: "+12015550126" }, {
    contact_name: "Eassy Demo Emergency Contact",
    relationship: "Sibling",
    updated_at: nowIso,
  });
  await ensureRecord("employee_identity_details", { employee_id: employee.id }, {
    aadhaar_number: "0000-0000-0000",
    pan_number: "DEMOA0000A",
    passport_number: "D0000000",
    updated_at: nowIso,
  });
  await ensureRecord("employee_bank_details", { employee_id: employee.id }, {
    account_holder_name: "Eassy Demo Employee",
    account_number: "000000000000",
    ifsc_code: "DEMO0000001",
    bank_name: "Demo Bank",
    branch_name: "Demo Branch",
    updated_at: nowIso,
  });
  await ensureRecord("employee_education", { employee_id: employee.id, qualification: "B.Com Demo" }, {
    institution: "Eassy Demo University",
    year_of_passing: 2015,
    updated_at: nowIso,
  });
  await ensureRecord("employee_experience", { employee_id: employee.id }, {
    is_fresher: false,
    total_experience: "5 years",
    previous_company: "Eassy Demo Previous Employer",
    previous_designation: "Operations Associate",
    updated_at: nowIso,
  });

  await ensureRecord("employee_onboarding_progress", { employee_id: employee.id }, {
    completion_percentage: 100,
    current_step: "completed",
    completed_steps: ["personal_information", "identity", "bank", "documents"],
    last_updated: nowIso,
  });
  await ensureRecord("employee_onboarding_status", { employee_id: employee.id }, {
    status: "Approved",
    reviewed_by: adminUser.id,
    reviewed_at: nowIso,
    remarks: "Approved demo onboarding record.",
    updated_at: nowIso,
  });
  await ensureRecord("employee_onboarding_status", { employee_id: employeeAlt.id }, {
    status: "Pending Review",
    reviewed_by: null,
    reviewed_at: null,
    remarks: "Pending demo onboarding review.",
    updated_at: nowIso,
  });

  const employeeDocPath = await uploadDemoFile("employee-documents", "demo/eassy-demo-employee-document.txt", "Eassy Demo employee document placeholder.\n");
  for (const [documentType, verificationStatus, remarks] of [
    ["identity_proof", "Approved", "Verified demo identity document."],
    ["address_proof", "Pending", "Pending demo address review."],
    ["bank_proof", "Rejected", "Rejected demo bank proof for QA state coverage."],
  ]) {
    await ensureRecord("employee_documents", { employee_id: employee.id, document_type: documentType }, {
      file_path: employeeDocPath,
      verification_status: verificationStatus,
      verified_by: verificationStatus === "Pending" ? null : adminUser.id,
      verified_at: verificationStatus === "Pending" ? null : nowIso,
      remarks,
    });
  }

  const serviceAgreementPath = await uploadDemoFile("company-documents", "demo/eassy-demo-service-agreement.txt", "Eassy Demo service agreement placeholder.\n");
  await ensureRecord("service_agreements", { employer_id: employer.id, title: "Eassy Demo Master Service Agreement" }, {
    employee_id: employee.id,
    file_path: serviceAgreementPath,
    currency: "USD",
    status: "reviewed",
    uploaded_by: employerUser.id,
    reviewed_by: adminUser.id,
    reviewed_at: nowIso,
    admin_notes: "Reviewed demo service agreement.",
    employer_notes: "Ready for demo walkthrough.",
    shared_with_employee: true,
    updated_at: nowIso,
  });

  await ensureRecord("leave_policies", { employer_id: employer.id, year: currentYear }, {
    casual_leave: 12,
    sick_leave: 8,
    earned_leave: 15,
    public_holidays: 10,
    weekly_off: "Saturday, Sunday",
    carry_forward_allowed: true,
    max_carry_forward: 5,
    encashment_allowed: false,
    probation_leave_allowed: true,
    accrual_notes: "Eassy Demo accrual policy.",
    half_day_allowed: true,
    notice_period_days: 30,
    lop_policy: "LOP after exhausted balance.",
    comp_off_allowed: true,
    maternity_leave_days: 182,
    paternity_leave_days: 15,
    bereavement_leave_days: 5,
    created_by: adminUser.id,
    updated_at: nowIso,
  });
  await ensureRecord("leave_balances", { employee_id: employee.id, year: currentYear }, {
    casual_available: 8,
    sick_available: 6,
    earned_available: 10,
    comp_off_available: 1,
    lop_days: 0,
    adjusted_by: adminUser.id,
    adjustment_notes: "Eassy Demo opening balance.",
    updated_at: nowIso,
  });
  const leaveRequest = await ensureRecord("leave_requests", { employee_id: employee.id, start_date: `${currentYear}-06-20` }, {
    employer_id: employer.id,
    leave_type: "casual",
    end_date: `${currentYear}-06-21`,
    days: 2,
    reason: "Eassy Demo personal leave.",
    status: "approved",
    reviewed_by: employerUser.id,
    reviewed_at: nowIso,
    reviewer_notes: "Approved for demo.",
    total_selected_days: 2,
    excluded_holiday_days: 0,
    total_leave_days: 2,
    paid_leave_days: 2,
    lop_days: 0,
    mobile_number: "+12015550125",
    approved_by: employerUser.id,
    approved_at: nowIso,
    created_by: employeeUser.id,
    team_id: opsTeam.id,
    updated_at: nowIso,
  });
  for (const date of [`${currentYear}-06-20`, `${currentYear}-06-21`]) {
    await ensureRecord("leave_request_days", { leave_request_id: leaveRequest.id, date }, {
      employee_id: employee.id,
      is_holiday: false,
      status: "approved",
      is_lop: false,
    });
  }
  await ensureRecord("weekly_off_rules", { employer_id: employer.id, weekday: 0, effective_from: `${currentYear}-01-01` }, {
    is_weekly_off: true,
    active: true,
    approved_by: adminUser.id,
    approved_at: nowIso,
    updated_at: nowIso,
  });
  await ensureRecord("holiday_overrides", { employer_id: employer.id, date: `${currentYear}-08-15` }, {
    override_type: "holiday",
    name: "Eassy Demo Independence Day",
    reason: "Demo holiday override.",
    approved_by: adminUser.id,
    approved_at: nowIso,
  });

  const invoice = await ensureRecord("portal_employer_invoice_records", { employer_id: employer.id, employee_id: employee.id, invoice_month: demoMonth }, {
    invoice_no: `EASSY-DEMO-${currentYear}-06-001`,
    days_worked: 20,
    hourly_rate: 55,
    hours_per_week: 40,
    status: "raised",
    currency: "USD",
    created_by: adminUser.id,
    updated_by: adminUser.id,
    updated_at: nowIso,
  });
  for (const [label, amount, note] of [
    ["Onboarding Advance", 150, "Demo onboarding advance."],
    ["Reimbursements", 80, "Demo reimbursement."],
    ["Note", null, "Demo invoice note for QA."],
  ]) {
    await ensureRecord("portal_employer_invoice_line_items", { invoice_record_id: invoice.id, label }, {
      amount,
      note,
      created_by: adminUser.id,
      updated_by: adminUser.id,
      updated_at: nowIso,
    });
  }
  const payroll = await ensureRecord("portal_employee_payroll_records", { employer_id: employer.id, employee_id: employee.id, payroll_month: demoMonth }, {
    gross_salary_inr: 180000,
    actual_paid_inr: 158000,
    payment_date: `${currentYear}-06-30`,
    payment_status: "paid",
    created_by: adminUser.id,
    updated_by: adminUser.id,
    updated_at: nowIso,
  });
  for (const [label, amount, note] of [
    ["PF", 21600, "Demo PF deduction."],
    ["TDS", 12000, "Demo tax deduction."],
    ["Reimbursements", 1000, "Demo reimbursement."],
  ]) {
    await ensureRecord("portal_employee_payroll_line_items", { payroll_record_id: payroll.id, label }, {
      amount,
      note,
      created_by: adminUser.id,
      updated_by: adminUser.id,
      updated_at: nowIso,
    });
  }
  const payslipPath = await uploadDemoFile("payslips", "demo/eassy-demo-payslip-june.txt", "Eassy Demo payslip placeholder.\n");
  await ensureRecord("portal_payslip_files", { payroll_record_id: payroll.id }, {
    employer_id: employer.id,
    employee_id: employee.id,
    payroll_month: demoMonth,
    file_name: "eassy-demo-payslip-june.txt",
    file_path: payslipPath,
    mime_type: "text/plain",
    file_size_bytes: 32,
    uploaded_by: adminUser.id,
  });

  const thread = await ensureRecord("message_threads", { subject: "Eassy Demo Onboarding Coordination" }, {
    created_by: adminUser.id,
    employer_id: employer.id,
    related_employee_id: employee.id,
    updated_at: nowIso,
  });
  for (const participant of [
    [adminUser.id, "admin"],
    [employerUser.id, "employer_admin"],
    [employeeUser.id, "employee"],
  ]) {
    await ensureRecord("message_participants", { thread_id: thread.id, portal_user_id: participant[0] }, {
      role_snapshot: participant[1],
      last_read_at: null,
    });
  }
  await ensureRecord("message_entries", { thread_id: thread.id, body: "Eassy Demo thread opened for role QA." }, {
    sender_id: adminUser.id,
  });
  await ensureRecord("message_entries", { thread_id: thread.id, body: "Eassy Demo employer reply for message QA." }, {
    sender_id: employerUser.id,
  });

  const notice = await ensureRecord("notices", { title: "Eassy Demo Policy Reminder" }, {
    sender_id: adminUser.id,
    employer_id: employer.id,
    body: "Please acknowledge the Eassy Demo policy reminder.",
    priority: "important",
    requires_acknowledgement: true,
    action_url: "/dashboard/notices",
    action_label: "Review notice",
    category: "demo",
    updated_at: nowIso,
  });
  for (const recipient of [employerUser.id, employeeUser.id]) {
    await ensureRecord("notice_recipients", { notice_id: notice.id, recipient_user_id: recipient }, {
      read_at: null,
      acknowledged_at: null,
    });
  }

  const resignation = await ensureRecord("resignations", { employee_id: employeeAlt.id, reason: "Eassy Demo resignation flow." }, {
    employer_id: employer.id,
    preferred_last_working_day: `${currentYear}-07-31`,
    status: "offboarding_requested",
    admin_notes: "Demo resignation moved to offboarding.",
    employer_notes: "Employer acknowledged demo resignation.",
    forwarded_at: nowIso,
    acknowledged_at: nowIso,
    notice_period_days: 45,
    calculated_last_working_day: `${currentYear}-07-31`,
    accepted_notice_sent_at: nowIso,
    decided_by: adminUser.id,
    decided_at: nowIso,
    updated_at: nowIso,
  });
  await ensureRecord("offboarding_cases", { employee_id: employeeAlt.id, resignation_id: resignation.id }, {
    employer_id: employer.id,
    requested_by: employerUser.id,
    status: "in_progress",
    target_last_working_day: `${currentYear}-07-31`,
    employer_notes: "Eassy Demo employer offboarding notes.",
    admin_notes: "Eassy Demo admin offboarding notes.",
    approved_by: adminUser.id,
    approved_at: nowIso,
    initiated_at: nowIso,
    updated_at: nowIso,
  });

  const tableCounts = {};
  for (const table of [...summary.tablesTouched].sort()) {
    const result = await supabase.from(table).select("id", { count: "exact", head: true });
    await requireNoError(result, `count ${table}`);
    tableCounts[table] = result.count;
  }

  console.log(JSON.stringify({
    ok: true,
    demoEmails: Object.values(demoUsers).map((user) => user.email),
    clerkUsers: summary.clerkUsers,
    portalUsers: summary.portalUsers,
    demoEmployer: { id: employer.id, name: employer.name },
    demoEmployees: [
      { id: employee.id, email: employee.email, lifecycle_status: employee.lifecycle_status },
      { id: employeeAlt.id, email: employeeAlt.email, lifecycle_status: employeeAlt.lifecycle_status },
    ],
    storageUploads: summary.storageUploads,
    tablesTouched: [...summary.tablesTouched].sort(),
    tableCounts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
