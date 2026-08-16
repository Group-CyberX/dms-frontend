import React from "react";
import ApiKeysCard from "./ApiKeysCard";
import DocumentPolicyCard from "./DocumentPolicyCard";
import AccessControlCard from "./AccessControlCard";
import DangerZoneCard from "./DangerZoneCard";
import { SettingsComponentProps } from "./types";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/access-control";

export default function AdministratorSettings(props: SettingsComponentProps) {
  const { role, permissions } = useAuthStore();
  const isSystemAdmin = role === "SYSTEM_ADMIN";

  const canManageApiKeys = isSystemAdmin || hasPermission(permissions, role, "canManageAPIKeysSetting");
  const canManagePolicy = isSystemAdmin || hasPermission(permissions, role, "canManageDocumentPolicySetting");
  const canManageAccess = isSystemAdmin || hasPermission(permissions, role, "canManageAccessControlSetting");
  const canExecuteDanger = isSystemAdmin || hasPermission(permissions, role, "canExecuteDangerZoneSetting");

  if (!canManageApiKeys && !canManagePolicy && !canManageAccess && !canExecuteDanger) {
    return null; // Don't show the Administrator Settings header if they have absolutely no permissions under it
  }

  return (
    <div className="mt-12 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#8B2E00]">Administrator Settings</h2>
        <p className="text-gray-500 mt-1">System-wide configuration options (Admin only)</p>
      </div>
      
      {canManageApiKeys && <ApiKeysCard />}
      {canManagePolicy && <DocumentPolicyCard {...props} />}
      {canManageAccess && <AccessControlCard {...props} />}
      {canExecuteDanger && <DangerZoneCard />}
    </div>
  );
}
