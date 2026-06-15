import type { Database } from "@/lib/supabase/database.types";

type PortalRole = Database["public"]["Enums"]["portal_role"];
type DirectoryRoute = "employers" | "employees";

export function getDirectoryRouteRedirect(role: PortalRole, route: DirectoryRoute) {
  if (role === "employee" && (route === "employers" || route === "employees")) {
    return "/dashboard";
  }

  return null;
}
