import { describe, expect, test } from "vitest";

import { getDirectoryRouteRedirect } from "@/lib/portal/directory-route-policy";

describe("getDirectoryRouteRedirect", () => {
  test("redirects employee users away from top-level employer and employee directories", () => {
    expect(getDirectoryRouteRedirect("employee", "employers")).toBe("/dashboard");
    expect(getDirectoryRouteRedirect("employee", "employees")).toBe("/dashboard");
  });

  test("preserves existing platform admin and employer admin directory behavior", () => {
    expect(getDirectoryRouteRedirect("super_admin", "employers")).toBeNull();
    expect(getDirectoryRouteRedirect("admin", "employees")).toBeNull();
    expect(getDirectoryRouteRedirect("employer_admin", "employers")).toBeNull();
    expect(getDirectoryRouteRedirect("employer_admin", "employees")).toBeNull();
  });
});
