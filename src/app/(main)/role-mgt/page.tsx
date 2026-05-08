"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getRoles,
  getUsers,
  type Role,
  type User,
  updateRolePermissions,
} from "@/lib/api-client";
import { Plus, Users, Save } from "lucide-react";
import { CreateRoleDialog } from "../../../components/role-mgt/CreateRoleDialog";

type PermissionGroup = {
  title: string;
  permissions: string[];
};

const PERMISSIONS: PermissionGroup[] = [
  { title: "Documents", permissions: ["View", "Create", "Edit", "Delete", "Share"] },
  { title: "Workflows", permissions: ["View", "Create", "Approve", "Edit", "Delete"] },
  { title: "ERP Integration", permissions: ["View", "Configure", "Sync", "Delete"] },
  { title: "Users", permissions: ["View", "Create", "Edit", "Delete"] },
  { title: "Roles", permissions: ["View", "Create", "Edit", "Delete"] },
  { title: "Audit Logs", permissions: ["View", "Export"] },
  { title: "System", permissions: ["View Health", "Configure", "Backup", "Restore"] },
];

const cellKey = (group: string, permission: string) => `${group}::${permission}`;

function toSingular(name: string): string {
  if (name.endsWith("s")) return name.slice(0, -1);
  return name;
}

function toFallbackPermissionKey(group: string, permission: string): string {
  const cleanGroup = toSingular(group.replace(/\s+/g, ""));
  const cleanPermission = permission.replace(/\s+/g, "");
  return `can${cleanPermission}${cleanGroup}`;
}

function parsePermissionJson(raw: string): Record<string, boolean> {
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

function permissionEnabled(
  permissionMap: Record<string, boolean>,
  group: string,
  permission: string
): boolean {
  const groupToken = toSingular(group).toLowerCase().replace(/\s+/g, "");
  const permissionToken = permission.toLowerCase().replace(/\s+/g, "");

  for (const [key, value] of Object.entries(permissionMap)) {
    if (!value) continue;

    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (normalized.includes(groupToken) && normalized.includes(permissionToken)) {
      return true;
    }
  }

  return false;
}

function memberBadge(count: number) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
      <Users className="h-3 w-3" />
      {count}
    </span>
  );
}

function PermissionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-[#953002] focus:ring-[#953002]/20"
      />
      <span>{label}</span>
    </label>
  );
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesData, usersData] = await Promise.all([getRoles(), getUsers()]);
      setRoles(rolesData);
      setUsers(usersData);

      setSelectedRoleId((current) => {
        if (!current) {
          return null;
        }

        const stillExists = rolesData.some((role) => role.roleId === current);
        return stillExists ? current : null;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load roles";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.roleId === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    if (!selectedRole) {
      setRoleName("");
      setRoleDescription("");
      setPermissionState({});
      return;
    }

    setRoleName(selectedRole.name);

    const permissionMap = parsePermissionJson(selectedRole.permissions);
    const enabledCount = Object.values(permissionMap).filter(Boolean).length;
    setRoleDescription(`${enabledCount} permission${enabledCount === 1 ? "" : "s"} assigned`);

    const nextState: Record<string, boolean> = {};
    for (const group of PERMISSIONS) {
      for (const permission of group.permissions) {
        nextState[cellKey(group.title, permission)] = permissionEnabled(
          permissionMap,
          group.title,
          permission
        );
      }
    }

    setPermissionState(nextState);
  }, [selectedRole]);

  const membersByRole = useMemo(() => {
    const map = new Map<string, number>();

    for (const user of users) {
      const roleNameValue = user.role?.name ?? "";
      if (!roleNameValue) continue;

      const normalized = roleNameValue.toUpperCase();
      map.set(normalized, (map.get(normalized) ?? 0) + 1);
    }

    return map;
  }, [users]);

  const handlePermissionChange = (group: string, permission: string, checked: boolean) => {
    setSaveMessage(null);
    setPermissionState((current) => ({
      ...current,
      [cellKey(group, permission)]: checked,
    }));
  };

  const handleSaveChanges = async () => {
    if (!selectedRole) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const currentMap = parsePermissionJson(selectedRole.permissions);
      const nextMap: Record<string, boolean> = { ...currentMap };

      for (const group of PERMISSIONS) {
        for (const permission of group.permissions) {
          const key = cellKey(group.title, permission);
          const value = permissionState[key] ?? false;

          const existingKey = Object.keys(nextMap).find((k) => {
            const normalized = k.toLowerCase().replace(/[^a-z]/g, "");
            const g = toSingular(group.title).toLowerCase().replace(/\s+/g, "");
            const p = permission.toLowerCase().replace(/\s+/g, "");
            return normalized.includes(g) && normalized.includes(p);
          });

          const targetKey = existingKey ?? toFallbackPermissionKey(group.title, permission);
          nextMap[targetKey] = value;
        }
      }

      const updated = await updateRolePermissions(
        selectedRole.roleId,
        JSON.stringify(nextMap),
        selectedRole.name
      );

      await loadData();
      setSelectedRoleId(updated.roleId);
      setSaveMessage("Permissions saved successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save role";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#e1e1e1] px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#953002]">
              Role Management
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Configure roles and permissions for access control
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsCreateRoleOpen(true)}
            className="h-10 rounded-md bg-[#953002] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#7f2600]"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </section>

        <CreateRoleDialog
          open={isCreateRoleOpen}
          onOpenChange={setIsCreateRoleOpen}
          onRoleCreated={loadData}
        />

        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-2xl border-0 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <h2 className="px-1 pb-3 text-[15px] font-medium text-slate-800">Roles</h2>

            <div className="space-y-2">
              {roles.map((role) => {
                const active = selectedRoleId === role.roleId;
                const members = membersByRole.get(role.name.toUpperCase()) ?? 0;

                return (
                  <button
                    key={role.roleId}
                    type="button"
                    onClick={() => setSelectedRoleId(role.roleId)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-[#d48b62] bg-[#faf4f0]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                      <p className="text-xs text-slate-500">Permissions from live policy</p>
                    </div>

                    <div className="mt-2">{memberBadge(members)}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-2xl border-0 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] md:p-5">
            <div className="mb-5">
              <h2 className="text-sm font-medium text-slate-800">
                Edit Role: {selectedRole?.name ?? "-"}
              </h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="role-name" className="text-sm text-slate-700">
                  Role Name
                </label>
                <Input
                  id="role-name"
                  value={roleName}
                  readOnly
                  className="h-9 rounded-md border-slate-200 bg-white text-sm shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="role-description" className="text-sm text-slate-700">
                  Description
                </label>
                <Input
                  id="role-description"
                  value={roleDescription}
                  readOnly
                  className="h-9 rounded-md border-slate-200 bg-white text-sm shadow-sm"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700">Permissions</h3>

                <div className="space-y-4">
                  {PERMISSIONS.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700">{group.title}</h4>

                      <div className="grid gap-x-10 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
                        {group.permissions.map((permission) => (
                          <PermissionCheckbox
                            key={`${group.title}-${permission}`}
                            label={permission}
                            checked={permissionState[cellKey(group.title, permission)] ?? false}
                            onChange={(checked) =>
                              handlePermissionChange(group.title, permission, checked)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={!selectedRole || saving}
                  className="h-9 rounded-md bg-[#953002] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#7f2600]"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={loadData}
                  disabled={loading}
                  className="h-9 rounded-md border-slate-200 px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>

              {loading && <p className="text-sm text-slate-500">Loading roles...</p>}
              {saveMessage && <p className="text-sm text-emerald-600">{saveMessage}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
