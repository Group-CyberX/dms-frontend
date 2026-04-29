export type RoleKey =
  | "SYSTEM_ADMIN"
  | "DOCUMENT_ADMIN"
  | "AUDITOR"
  | "PROCESS_OWNER"
  | "APPROVER"
  | "END_USER"
  | string;

export type SidebarFeatureKey =
  | "dashboard"
  | "documents"
  | "search"
  | "myTasks"
  | "workflows"
  | "recycleBin"
  | "auditLogs"
  | "erpIntegration"
  | "userManagement"
  | "roleManagement"
  | "systemHealth"
  | "settings";

const DEFAULT_ROLE_FEATURES: Record<string, SidebarFeatureKey[]> = {
  SYSTEM_ADMIN: [
    "dashboard",
    "documents",
    "search",
    "myTasks",
    "workflows",
    "recycleBin",
    "auditLogs",
    "erpIntegration",
    "userManagement",
    "roleManagement",
    "systemHealth",
    "settings",
  ],
  DOCUMENT_ADMIN: [
    "dashboard",
    "documents",
    "search",
    "recycleBin",
    "auditLogs",
    "settings",
  ],
  AUDITOR: ["dashboard", "search", "auditLogs", "settings"],
  PROCESS_OWNER: ["dashboard", "documents", "search", "workflows", "myTasks", "settings"],
  APPROVER: ["dashboard", "documents", "search", "workflows", "myTasks", "settings"],
  END_USER: ["dashboard", "documents", "search", "myTasks", "settings"],
};

function cleanRole(role: string | null | undefined): RoleKey {
  if (!role) return "END_USER";
  return role.toUpperCase().replace(/\s+/g, "_");
}

function permissionLooksGranted(
  permissions: Record<string, boolean>,
  token: string
): boolean {
  const normalizedToken = token.toLowerCase().replace(/[^a-z]/g, "");

  return Object.entries(permissions).some(([key, value]) => {
    if (!value) return false;
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "");
    return normalizedKey.includes(normalizedToken);
  });
}

export function canAccessFeature(
  feature: SidebarFeatureKey,
  role: string | null,
  permissions: Record<string, boolean>
): boolean {
  const normalizedRole = cleanRole(role);

  if (normalizedRole === "SYSTEM_ADMIN") {
    return true;
  }

  // If backend sent explicit permissions, honor them first.
  if (Object.keys(permissions).length > 0) {
    const featureTokens: Record<SidebarFeatureKey, string[]> = {
      dashboard: ["dashboard"],
      documents: ["document"],
      search: ["search"],
      myTasks: ["task"],
      workflows: ["workflow"],
      recycleBin: ["recycle", "delete"],
      auditLogs: ["audit", "log"],
      erpIntegration: ["erp", "integration"],
      userManagement: ["user"],
      roleManagement: ["role"],
      systemHealth: ["system", "health"],
      settings: ["setting"],
    };

    const tokens = featureTokens[feature];
    if (tokens.some((token) => permissionLooksGranted(permissions, token))) {
      return true;
    }
  }

  const roleFeatures = DEFAULT_ROLE_FEATURES[normalizedRole] ?? DEFAULT_ROLE_FEATURES.END_USER;
  return roleFeatures.includes(feature);
}

export type DashboardVariant =
  | "system-admin"
  | "document-admin"
  | "auditor"
  | "process-owner"
  | "approver"
  | "end-user";

export function getDashboardVariant(role: string | null): DashboardVariant {
  const normalizedRole = cleanRole(role);

  switch (normalizedRole) {
    case "SYSTEM_ADMIN":
      return "system-admin";
    case "DOCUMENT_ADMIN":
      return "document-admin";
    case "AUDITOR":
      return "auditor";
    case "PROCESS_OWNER":
      return "process-owner";
    case "APPROVER":
      return "approver";
    default:
      return "end-user";
  }
}

export function formatRoleLabel(role: string | null): string {
  if (!role) return "End User";

  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function getFeatureByPath(pathname: string): SidebarFeatureKey | null {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/share")) return "documents";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/my-tasks")) return "myTasks";
  if (pathname.startsWith("/workflows")) return "workflows";
  if (pathname.startsWith("/recycle-bin")) return "recycleBin";
  if (pathname.startsWith("/audit")) return "auditLogs";
  if (pathname.startsWith("/erp")) return "erpIntegration";
  if (pathname.startsWith("/user-mgt")) return "userManagement";
  if (pathname.startsWith("/role-mgt")) return "roleManagement";
  if (pathname.startsWith("/system-health")) return "systemHealth";
  if (pathname.startsWith("/settings")) return "settings";

  return null;
}

export function canAccessPath(
  pathname: string,
  role: string | null,
  permissions: Record<string, boolean>
): boolean {
  if (pathname === "/unauthorized") {
    return true;
  }

  const feature = getFeatureByPath(pathname);
  if (!feature) {
    return true;
  }

  return canAccessFeature(feature, role, permissions);
}