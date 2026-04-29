"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createRole } from "@/lib/api-client";
import { Plus } from "lucide-react";

type PermissionGroup = {
  title: string;
  permissions: string[];
};

type CreateRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleCreated?: () => Promise<void> | void;
};

const CREATE_ROLE_PERMISSIONS: PermissionGroup[] = [
  { title: "Documents", permissions: ["View", "Create", "Edit", "Delete", "Share"] },
  { title: "Workflows", permissions: ["View", "Create", "Approve", "Edit", "Delete"] },
  { title: "ERP Integration", permissions: ["View", "Configure", "Sync", "Delete"] },
  { title: "Users", permissions: ["View", "Create", "Edit", "Delete"] },
  { title: "Roles", permissions: ["View", "Create", "Edit", "Delete"] },
  { title: "Audit Logs", permissions: ["View", "Export"] },
  { title: "System", permissions: ["View Health", "Configure", "Backup", "Restore"] },
];

export function CreateRoleDialog({
  open,
  onOpenChange,
  onRoleCreated,
}: CreateRoleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPermission = (group: string, permission: string, checked: boolean) => {
    setPermissionState((current) => ({
      ...current,
      [`${group}::${permission}`]: checked,
    }));
  };

  const buildPermissionPayload = () => {
    const payload: Record<string, boolean> = {};

    for (const group of CREATE_ROLE_PERMISSIONS) {
      const singularGroup = group.title.endsWith("s")
        ? group.title.slice(0, -1)
        : group.title;

      for (const permission of group.permissions) {
        const key = `${group}::${permission}`;
        const apiKey = `can${permission.replace(/\s+/g, "")}${singularGroup.replace(/\s+/g, "")}`;
        payload[apiKey] = permissionState[key] ?? false;
      }
    }

    return payload;
  };

  const resetState = () => {
    setName("");
    setDescription("");
    setPermissionState({});
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Role name is required");
      return;
    }

    setSubmitting(true);
    try {
      await createRole({
        name: name.trim(),
        permissions: JSON.stringify(buildPermissionPayload()),
      });

      await onRoleCreated?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create role";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[calc(100%-2rem)] max-w-[760px] overflow-y-auto rounded-[10px] border-0 bg-white p-0 shadow-[0_24px_60px_rgba(15,23,42,0.3)]"
        showCloseButton={false}
      >
        <div className="relative px-5 pb-4 pt-5 sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>

          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-[30px] font-semibold text-slate-900 sm:text-[32px]">
              Create New Role
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define a new role with custom permissions
            </DialogDescription>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="create-role-name">
                Role Name
              </label>
              <Input
                id="create-role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Content Manager"
                className="h-10 rounded-md border-slate-200 text-sm shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="create-role-description">
                Description
              </label>
              <Input
                id="create-role-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Brief description of the role"
                className="h-10 rounded-md border-slate-200 text-sm shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">Permissions</h3>

              <div className="space-y-4">
                {CREATE_ROLE_PERMISSIONS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">{group.title}</h4>

                    <div className="grid gap-x-10 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {group.permissions.map((permission) => (
                        <label key={`${group.title}-${permission}`} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={permissionState[`${group.title}::${permission}`] ?? false}
                            onChange={(event) =>
                              setPermission(group.title, permission, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 accent-[#953002] focus:ring-[#953002]/20"
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-2 pt-3">
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 rounded-md bg-[#953002] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#7f2600]"
              >
                <Plus className="h-4 w-4" />
                {submitting ? "Creating..." : "Create Role"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="h-9 rounded-md border-slate-200 px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}