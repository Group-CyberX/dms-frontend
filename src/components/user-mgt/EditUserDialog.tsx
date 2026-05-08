"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoles, updateUser, updateUserStatus, type Role, type User } from "@/lib/api-client";

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated?: () => Promise<void> | void;
};

function toDisplayStatus(status: string | undefined): boolean {
  return status?.toUpperCase() !== "INACTIVE";
}

function getUserFullName(user: User | null): string {
  if (!user?.username) return "";
  return user.username;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onUserUpdated,
}: EditUserDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadRoles = async () => {
      try {
        const data = await getRoles();
        setRoles(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load roles";
        setError(message);
      }
    };

    loadRoles();
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;

    setFullName(getUserFullName(user));
    setEmail(user.email ?? "");
    setRole(user.role?.name ?? "");
    setIsActive(toDisplayStatus(user.status));
    setError(null);
  }, [open, user]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setRole("");
    setIsActive(true);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) return;

    setError(null);

    if (!fullName || !role) {
      setError("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const nextStatus = isActive ? "ACTIVE" : "INACTIVE";
      const nextRole = role;

      const updatePromises: Array<Promise<unknown>> = [];

      if (fullName !== user.username || nextRole !== (user.role?.name ?? "")) {
        updatePromises.push(
          updateUser(user.userId, {
            username: fullName,
            role: nextRole,
          })
        );
      }

      if (nextStatus !== user.status?.toUpperCase()) {
        updatePromises.push(updateUserStatus(user.userId, nextStatus));
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      await onUserUpdated?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[520px] rounded-[16px] border-0 bg-white p-0 shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
        showCloseButton={false}
      >
        <div className="relative px-6 pb-6 pt-6 sm:px-7">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>

          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-[20px] font-semibold text-slate-900">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Update account details, role, and status
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
                Full Name
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter full name"
                className="h-11 rounded-md border-slate-200 text-sm shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                value={email}
                readOnly
                disabled
                className="h-11 rounded-md border-slate-200 bg-slate-50 text-sm text-slate-600 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="role">
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger
                  id="role"
                  className="h-11 w-full rounded-md border-slate-200 text-sm shadow-sm"
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((roleItem) => (
                    <SelectItem key={roleItem.roleId} value={roleItem.name}>
                      {roleItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Account Active</p>
                  <p className="text-sm text-slate-500">User can sign in and access the system</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsActive((current) => !current)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                    isActive ? "border-[#953002] bg-[#953002]" : "border-slate-300 bg-slate-200"
                  }`}
                  aria-label="Toggle account status"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="h-10 rounded-md border-slate-200 px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-md bg-[#953002] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#7f2600]"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
