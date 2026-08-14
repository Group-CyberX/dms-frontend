import { PERMISSION_CATALOG, type SidebarFeatureKey } from "./permissions";

export type { SidebarFeatureKey };

export type RoleKey =
  | "SYSTEM_ADMIN"
  | "DOCUMENT_ADMIN"
  | "AUDITOR"
  | "PROCESS_OWNER"
  | "APPROVER"
  | "END_USER"
  | string;

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
    "policies",
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

/**
 * Maps each sidebar feature to the permission keys that make it visible.
 * Built from the catalogue so the keys can never drift from the ones stored
 * against a role.
 */
const FEATURE_VISIBILITY_KEYS = PERMISSION_CATALOG.reduce((acc, group) => {
  acc[group.feature] = group.visibilityKeys;
  return acc;
}, {} as Record<SidebarFeatureKey, string[]>);

/**
 * Checks if a specific sidebar feature should be visible based on the user's
 * permission map. Exact key lookup only.
 */
function hasFeaturePermission(
  permissions: Record<string, boolean>,
  feature: SidebarFeatureKey
): boolean {
  const requiredKeys = FEATURE_VISIBILITY_KEYS[feature];
  if (!requiredKeys || requiredKeys.length === 0) return false;

  return requiredKeys.some((key) => permissions[key] === true);
}

/**
 * Determines whether a user can access a sidebar feature.
 *
 * Priority order:
 * 1. SYSTEM_ADMIN always has access to everything
 * 2. If explicit permissions exist (from the role's JSON), check them precisely
 * 3. Fall back to hardcoded DEFAULT_ROLE_FEATURES
 */
export function canAccessFeature(
  feature: SidebarFeatureKey,
  role: string | null,
  permissions: Record<string, boolean>
): boolean {
  const normalizedRole = cleanRole(role);

  // SYSTEM_ADMIN always sees everything — prevents locking themselves out
  if (normalizedRole === "SYSTEM_ADMIN") {
    return true;
  }

  // If the backend sent explicit permissions, honor them precisely
  if (Object.keys(permissions).length > 0) {
    if (hasFeaturePermission(permissions, feature)) {
      return true;
    }

    // If permissions exist but this feature has no match, deny it
    // (don't fall through to defaults — the role has been explicitly configured)
    return false;
  }

  // No explicit permissions → fall back to role-based defaults
  const roleFeatures = DEFAULT_ROLE_FEATURES[normalizedRole] ?? DEFAULT_ROLE_FEATURES.END_USER;
  return roleFeatures.includes(feature);
}

/**
 * Check if the user has a specific granular permission (e.g., "canEditDocument").
 * Use this within individual pages to show/hide action buttons.
 */
export function hasPermission(
  permissions: Record<string, boolean>,
  role: string | null,
  permissionKey: string
): boolean {
  if (cleanRole(role) === "SYSTEM_ADMIN") return true;

  return permissions[permissionKey] === true;
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
  if (pathname.startsWith("/share")) return null;
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/my-tasks")) return "myTasks";
  if (pathname.startsWith("/workflows")) return "workflows";
  if (pathname.startsWith("/recycle-bin")) return "recycleBin";
  if (pathname.startsWith("/audit")) return "auditLogs";
  if (pathname.startsWith("/erp")) return "erpIntegration";
  if (pathname.startsWith("/policies")) return "policies";
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