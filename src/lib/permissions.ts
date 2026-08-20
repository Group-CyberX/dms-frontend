export type SidebarFeatureKey =
  | "dashboard"
  | "documents"
  | "search"
  | "myTasks"
  | "workflows"
  | "recycleBin"
  | "auditLogs"
  | "erpIntegration"
  | "policies"
  | "userManagement"
  | "roleManagement"
  | "systemHealth"
  | "settings";

export type PermissionDefinition = {
  /** Stored verbatim in the role's permissions JSON. Never derive this from the label. */
  key: string;
  label: string;
};

export type PermissionGroupDefinition = {
  title: string;
  feature: SidebarFeatureKey;
  /** Keys that make the feature visible in the sidebar. */
  visibilityKeys: string[];
  permissions: PermissionDefinition[];
};

export const PERMISSION_CATALOG: PermissionGroupDefinition[] = [
  {
    title: "Dashboard",
    feature: "dashboard",
    visibilityKeys: ["canViewDashboard", "canViewAnalyticsDashboard"],
    permissions: [
      { key: "canViewDashboard", label: "View" },
      { key: "canViewAnalyticsDashboard", label: "View Analytics" },
    ],
  },
  {
    title: "Documents",
    feature: "documents",
    visibilityKeys: ["canViewDocument"],
    permissions: [
      { key: "canViewDocument", label: "View" },
      { key: "canViewAllDocuments", label: "View All Users' Documents" },
      { key: "canManageAllDocuments", label: "Edit/Delete All Users' Documents" },
      { key: "canCreateDocument", label: "Create" },
      { key: "canEditDocument", label: "Edit" },
      { key: "canDeleteDocument", label: "Delete" },
      { key: "canShareDocument", label: "Share" },
      { key: "canAssignDocument", label: "Assign New Uploads" },
      { key: "canDeleteFolder", label: "Delete Folder" },
    ],
  },
  {
    title: "Search",
    feature: "search",
    visibilityKeys: ["canViewSearch", "canAdvancedSearchSearch"],
    permissions: [
      { key: "canViewSearch", label: "View" },
      { key: "canAdvancedSearchSearch", label: "Advanced Search" },
      { key: "canSearchAllDocuments", label: "Search All Users' Documents" },
    ],
  },
  {
    title: "Tasks",
    feature: "myTasks",
    visibilityKeys: ["canViewTask"],
    permissions: [
      { key: "canViewTask", label: "View" },
      { key: "canCreateTask", label: "Create" },
      { key: "canEditTask", label: "Edit" },
      { key: "canDeleteTask", label: "Delete" },
    ],
  },
  {
    title: "Workflows",
    feature: "workflows",
    visibilityKeys: ["canViewWorkflow"],
    permissions: [
      { key: "canViewWorkflow", label: "View" },
      { key: "canCreateWorkflow", label: "Create" },
      { key: "canApproveWorkflow", label: "Approve" },
      { key: "canEditWorkflow", label: "Edit" },
      { key: "canDeleteWorkflow", label: "Delete" },
    ],
  },
  {
    title: "Recycle Bin",
    feature: "recycleBin",
    visibilityKeys: ["canViewRecycleBin"],
    permissions: [
      { key: "canViewRecycleBin", label: "View" },
      { key: "canViewAllDeletedDocuments", label: "View All Deleted Documents" },
      { key: "canRestoreRecycleBin", label: "Restore" },
      { key: "canPermanentlyDeleteRecycleBin", label: "Permanently Delete" },
    ],
  },
  {
    title: "Audit Logs",
    feature: "auditLogs",
    visibilityKeys: ["canViewAuditLog"],
    permissions: [
      { key: "canViewAuditLog", label: "View" },
      { key: "canExportAuditLog", label: "Export" },
    ],
  },
  {
    title: "ERP Integration",
    feature: "erpIntegration",
    visibilityKeys: ["canViewERPIntegration"],
    permissions: [
      { key: "canViewERPIntegration", label: "View" },
      { key: "canConfigureERPIntegration", label: "Configure" },
      { key: "canSyncERPIntegration", label: "Sync" },
      { key: "canDeleteERPIntegration", label: "Delete" },
    ],
  },
  {
    title: "Policies",
    feature: "policies",
    visibilityKeys: ["canViewPolicy"],
    permissions: [
      { key: "canViewPolicy", label: "View" },
      { key: "canCreatePolicy", label: "Create" },
      { key: "canEditPolicy", label: "Edit" },
      { key: "canDeletePolicy", label: "Delete" },
    ],
  },
  {
    title: "Users",
    feature: "userManagement",
    visibilityKeys: ["canViewUser"],
    permissions: [
      { key: "canViewUser", label: "View" },
      { key: "canCreateUser", label: "Create" },
      { key: "canEditUser", label: "Edit" },
      { key: "canDeleteUser", label: "Delete" },
    ],
  },
  {
    title: "Roles",
    feature: "roleManagement",
    visibilityKeys: ["canViewRole"],
    permissions: [
      { key: "canViewRole", label: "View" },
      { key: "canCreateRole", label: "Create" },
      { key: "canEditRole", label: "Edit" },
      { key: "canDeleteRole", label: "Delete" },
    ],
  },
  {
    title: "System",
    feature: "systemHealth",
    visibilityKeys: ["canViewHealthSystem"],
    permissions: [
      { key: "canViewHealthSystem", label: "View Health" },
      { key: "canConfigureSystem", label: "Configure" },
      { key: "canBackupSystem", label: "Backup" },
      { key: "canRestoreSystem", label: "Restore" },
    ],
  },
  {
    title: "Settings",
    feature: "settings",
    visibilityKeys: ["canViewSetting"],
    permissions: [
      { key: "canViewSetting", label: "View" },
      { key: "canEditSetting", label: "Edit" },
      { key: "canManageAPIKeysSetting", label: "Manage API Keys" },
      { key: "canManageDocumentPolicySetting", label: "Manage Document Policy" },
      { key: "canManageAccessControlSetting", label: "Manage Access Control" },
      { key: "canExecuteDangerZoneSetting", label: "Execute Danger Zone" },
    ],
  },
];

export const PERMISSION_KEYS: readonly string[] = PERMISSION_CATALOG.flatMap((group) =>
  group.permissions.map((permission) => permission.key)
);

const PERMISSION_KEY_SET = new Set(PERMISSION_KEYS);

export function isKnownPermissionKey(key: string): boolean {
  return PERMISSION_KEY_SET.has(key);
}

/**
 * Builds the permission map to persist for a role. Only catalogue keys are
 * included, so keys left over from older naming schemes are dropped instead of
 * silently keeping access.
 */
export function buildPermissionMap(
  isEnabled: (key: string) => boolean
): Record<string, boolean> {
  const map: Record<string, boolean> = {};

  for (const key of PERMISSION_KEYS) {
    map[key] = isEnabled(key);
  }

  return map;
}

export function parsePermissionJson(raw: string | null | undefined): Record<string, boolean> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(parsed)) {
      result[key] = Boolean(value);
    }

    return result;
  } catch {
    return {};
  }
}
