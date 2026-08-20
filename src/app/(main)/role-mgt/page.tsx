"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getRoles,
  getAdminUsers,
  type Role,
  type User,
  updateRolePermissions,
  deleteRole,
} from "@/lib/api-client";
import { Plus, Users, Save, Loader, Trash2 } from "lucide-react";
import { CreateRoleDialog } from "../../../components/role-mgt/CreateRoleDialog";
import { useAuthStore } from "@/store/auth-store";
import { useConfirm } from "@/hooks/use-confirm";
import {
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  buildPermissionMap,
  parsePermissionJson,
} from "@/lib/permissions";

function memberBadge(count: number) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
      <Users className="h-3 w-3" />
      {count}
    </span>
  );
}

function getRoleName(role: User["role"] | string | null | undefined): string {
  if (!role) return "";
  if (typeof role === "string") return role;
  return role.name ?? "";
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
  const confirm = useConfirm();
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
      const [rolesData, usersData] = await Promise.all([getRoles(), getAdminUsers()]);
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

    const nextState: Record<string, boolean> = {};
    for (const key of PERMISSION_KEYS) {
      nextState[key] = permissionMap[key] === true;
    }

    const enabledCount = Object.values(nextState).filter(Boolean).length;
    setRoleDescription(`${enabledCount} permission${enabledCount === 1 ? "" : "s"} assigned`);

    setPermissionState(nextState);
  }, [selectedRole]);

  const membersByRole = useMemo(() => {
    const map = new Map<string, number>();

    for (const user of users) {
      const roleNameValue = getRoleName(user.role);
      if (!roleNameValue) continue;

      const normalized = roleNameValue.toUpperCase();
      map.set(normalized, (map.get(normalized) ?? 0) + 1);
    }

    return map;
  }, [users]);

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    setSaveMessage(null);
    setPermissionState((current) => ({
      ...current,
      [permissionKey]: checked,
    }));
  };

  const handleSaveChanges = async () => {
    if (!selectedRole) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const nextMap = buildPermissionMap((key) => permissionState[key] === true);

      const updated = await updateRolePermissions(
        selectedRole.roleId,
        JSON.stringify(nextMap),
        selectedRole.name
      );

      await loadData();
      setSelectedRoleId(updated.roleId);

      // Refresh the current user's session so sidebar & route guards
      // immediately reflect the updated permissions (no re-login needed)
      await useAuthStore.getState().refreshSession();

      setSaveMessage("Permissions saved successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save role";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    // Prevent deletion of SYSTEM_ADMIN role
    if (selectedRole.name === "SYSTEM_ADMIN") {
      setError("The SYSTEM_ADMIN role cannot be deleted.");
      return;
    }

    if (!(await confirm({
      title: `Delete the ${selectedRole.name} role?`,
      description: "Anyone still assigned to it will lose the access it granted. This cannot be undone.",
      confirmLabel: "Delete role",
      tone: "destructive",
    }))) {
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      await deleteRole(selectedRole.roleId);
      setSaveMessage("Role successfully deleted.");
      setSelectedRoleId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
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
                  {PERMISSION_CATALOG.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700">{group.title}</h4>

                      <div className="grid gap-x-10 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
                        {group.permissions.map((permission) => (
                          <PermissionCheckbox
                            key={permission.key}
                            label={permission.label}
                            checked={permissionState[permission.key] ?? false}
                            onChange={(checked) =>
                              handlePermissionChange(permission.key, checked)
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

                {selectedRole?.name !== "SYSTEM_ADMIN" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteRole}
                    disabled={saving}
                    className="h-9 rounded-md px-4 text-sm font-medium shadow-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}

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

              {loading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader className="w-8 h-8 text-[#953002] animate-spin mb-4" />
                  <p className="text-gray-600 text-sm">Loading roles...</p>
                </div>
              )}
              {saveMessage && <p className="text-sm text-emerald-600">{saveMessage}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
