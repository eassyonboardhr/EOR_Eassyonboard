import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

describe("finance route safety", () => {
  test("legacy worktree finance actions redirect to native finance page", () => {
    const source = readFileSync("app/dashboard/worktree/actions/[targetType]/[targetId]/[action]/page.tsx", "utf8");

    expect(source).toContain("redirect(`/dashboard/finances?employer=${data.employer.id}`)");
    expect(source).toContain("redirect(`/dashboard/finances?employee=${data.employee.id}`)");
    expect(source).not.toContain("getEmployeeFinanceRolePreview");
    expect(source).not.toContain('from("finance_');
    expect(source).not.toContain("cashout");
    expect(source).not.toContain("adminAllocations");
  });

  test("import finance routes are admin gated and old mapping route redirects", () => {
    const reconciliationSource = readFileSync("app/dashboard/imports/finance-reconciliation/page.tsx", "utf8");
    const mappingSource = readFileSync("app/dashboard/imports/finance-reconciliation/mapping/page.tsx", "utf8");
    const oldMappingSource = readFileSync("app/dashboard/finances/mapping/page.tsx", "utf8");

    expect(reconciliationSource).toContain('requirePortalRole(["super_admin", "admin"])');
    expect(mappingSource).toContain('requirePortalRole(["super_admin", "admin"])');
    expect(oldMappingSource).toContain('redirect("/dashboard/imports/finance-reconciliation/mapping")');
  });

  test("role finance components keep sensitive labels out of the wrong views", () => {
    const employerSource = readFileSync("components/finances/employer-portal-finance.tsx", "utf8");
    const employeeSource = readFileSync("components/finances/employee-portal-finance.tsx", "utf8");

    for (const forbidden of ["Gross Salary", "Actual Paid", "PF", "TDS", "Payslip", "Cashout", "Margin", "Allocation", "Mapping"]) {
      expect(employerSource).not.toContain(forbidden);
    }

    for (const forbidden of ["Invoice No.", "Hourly Rate", "Hours Per Week", "Monthly Bill", "Employer Invoice", "Additional invoice items", "Cashout", "Margin", "Allocation", "Mapping", "file_path"]) {
      expect(employeeSource).not.toContain(forbidden);
    }
  });
});
